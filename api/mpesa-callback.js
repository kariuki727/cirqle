/**
 * api/mpesa-callback.js
 * * Handles the M-Pesa Lipa Na M-Pesa Online (LNMO) callback.
 * M-Pesa sends two types of callbacks:
 * 1. Validation URL (optional, not implemented here for simplicity, typically set to /api/mpesa-validation)
 * 2. Confirmation URL (this file)
 * * NOTE: Since this is a serverless function, you MUST integrate a database
 * to store the results using the AccountReference (which holds the client's reference).
 */

// Placeholder for database/state storage function
// >>> YOU MUST IMPLEMENT THIS FUNCTION FOR YOUR DATABASE <<<
async function saveTransactionStatus(reference, status, transactionDetails) {
    // ⚠️ IMPLEMENT YOUR DATABASE LOGIC HERE ⚠️
    // Example: await db.collection('transactions').updateOne(
    //     { clientReference: reference },
    //     { $set: { status: status, mpesaData: transactionDetails, updatedAt: new Date() } },
    //     { upsert: true }
    // );
    console.log(`[DB Placeholder] Saving Status: ${status} for Reference: ${reference}`);
    // Return true if save was successful, false otherwise
    return true; 
}


module.exports = async (req, res) => {
    // 1. Log the entire callback body for debugging
    const callbackData = req.body;
    console.log(`[${new Date().toISOString()}] M-Pesa Callback received - Data: ${JSON.stringify(callbackData, null, 2)}`);

    // M-Pesa callback sends an object with a 'Body' property, which contains 'stkCallback'
    const resultBody = callbackData.Body && callbackData.Body.stkCallback;

    // 2. Validate essential structure
    if (!resultBody || typeof resultBody.ResultCode === 'undefined') {
        console.error('Invalid M-Pesa Callback format.');
        // Always respond with 200 OK to M-Pesa to prevent retries
        return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    // Extract core M-Pesa data
    const resultCode = resultBody.ResultCode;
    const checkoutRequestID = resultBody.CheckoutRequestID;
    const merchantRequestID = resultBody.MerchantRequestID;
    const resultDescription = resultBody.ResultDesc;
    
    // Extract AccountReference (Client Reference) and Transaction Details
    let clientReference = '';
    let transactionStatus = 'PENDING';
    let transactionDetails = {
        resultDescription,
        merchantRequestID,
        checkoutRequestID,
        resultCode,
    };

    // 3. Process the Result Code
    if (resultCode === 0) {
        // SUCCESSFUL TRANSACTION
        transactionStatus = 'SUCCESS';

        // Extract transaction metadata from CallbackMetadata
        const metadata = resultBody.CallbackMetadata;
        if (metadata && metadata.Item) {
            metadata.Item.forEach(item => {
                switch (item.Name) {
                    case 'Amount':
                        transactionDetails.amount = item.Value;
                        break;
                    case 'MpesaReceiptNumber':
                        transactionDetails.mpesaReceiptNumber = item.Value;
                        break;
                    case 'Balance': // Not always present for STK Push
                        transactionDetails.balance = item.Value;
                        break;
                    case 'TransactionDate':
                        transactionDetails.transactionDate = item.Value;
                        break;
                    case 'PhoneNumber':
                        transactionDetails.phoneNumber = item.Value;
                        break;
                    case 'AccountReference':
                        clientReference = item.Value; // This is the crucial client reference
                        transactionDetails.clientReference = item.Value;
                        break;
                }
            });
        }
    } else if (resultCode === 1 || resultCode === 1032) {
        // CANCELLED (1 - cancelled by user, 1032 - transaction cancelled by customer)
        transactionStatus = 'CANCELLED';
        clientReference = resultBody.AccountReference || 'UNKNOWN'; // Attempt to get reference
    } else {
        // FAILED OR TIMEOUT (e.g., 2001 - B2C/B2B/C2B failed, 1 - Cancelled, 1031 - Expired/Timeout)
        // For simplicity, treat all other non-0 codes as FAILED
        transactionStatus = 'FAILED';
        clientReference = resultBody.AccountReference || 'UNKNOWN'; // Attempt to get reference
    }

    // 4. Save the status to your database using the clientReference
    if (clientReference && clientReference !== 'UNKNOWN') {
        const dbSaveSuccess = await saveTransactionStatus(clientReference, transactionStatus, transactionDetails);
        
        if (!dbSaveSuccess) {
            console.error(`Failed to save transaction status for reference: ${clientReference}`);
            // Still respond with 200 OK to M-Pesa, as our system failure shouldn't affect M-Pesa's retry logic
        }
    } else {
         console.error(`Could not determine client reference from callback data for CheckoutID: ${checkoutRequestID}`);
    }

    // 5. Always respond with a 200 OK and a simple JSON object to M-Pesa.
    // M-Pesa requires this specific format: { "ResultCode": 0, "ResultDesc": "..." }
    // A 200 response with any other body, or a non-200 response, might cause M-Pesa to retry.
    return res.status(200).json({ ResultCode: 0, ResultDesc: 'CIRQLE callback processed successfully' });
};
