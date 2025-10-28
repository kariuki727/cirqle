/**
 * api/mpesa-callback.js
 * Handles M-Pesa Lipa Na M-Pesa Online (LNMO) confirmation callbacks.
 */

const { MongoClient } = require('mongodb'); // Replace with your DB client if needed
const MONGO_URI = process.env.MONGO_URI;

let cachedClient = null;

async function getDb() {
  if (cachedClient) return cachedClient.db('mpesa');
  const client = await MongoClient.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  cachedClient = client;
  return client.db('mpesa');
}

// Idempotent save function
async function saveTransactionStatus(reference, status, transactionDetails) {
  try {
    const db = await getDb();
    const collection = db.collection('transactions');

    // Upsert: if reference exists, update; else insert
    await collection.updateOne(
      { clientReference: reference },
      {
        $set: {
          status,
          mpesaData: transactionDetails,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );

    console.log(`[DB] Saved transaction status: ${status} for reference: ${reference}`);
    return true;
  } catch (err) {
    console.error('[DB] Failed to save transaction status:', err);
    return false;
  }
}

module.exports = async (req, res) => {
  try {
    const callbackData = req.body;
    console.log(`[${new Date().toISOString()}] M-Pesa callback received:`, JSON.stringify(callbackData, null, 2));

    const resultBody = callbackData?.Body?.stkCallback;
    if (!resultBody || typeof resultBody.ResultCode === 'undefined') {
      console.error('[ERROR] Invalid M-Pesa callback format.');
      return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    const { ResultCode, ResultDesc, CheckoutRequestID, MerchantRequestID } = resultBody;

    // Default values
    let transactionStatus = 'PENDING';
    let clientReference = 'UNKNOWN';
    const transactionDetails = { ResultDesc, CheckoutRequestID, MerchantRequestID, ResultCode };

    // Parse CallbackMetadata safely
    if (ResultCode === 0 && resultBody.CallbackMetadata?.Item) {
      const metadataMap = {};
      resultBody.CallbackMetadata.Item.forEach(item => {
        metadataMap[item.Name] = item.Value;
      });

      clientReference = metadataMap.AccountReference || clientReference;
      Object.assign(transactionDetails, metadataMap);
      transactionStatus = 'SUCCESS';
    } else if ([1, 1032].includes(ResultCode)) {
      transactionStatus = 'CANCELLED';
      clientReference = resultBody.AccountReference || clientReference;
    } else {
      transactionStatus = 'FAILED';
      clientReference = resultBody.AccountReference || clientReference;
    }

    // Save transaction (idempotent)
    if (clientReference !== 'UNKNOWN') {
      const saved = await saveTransactionStatus(clientReference, transactionStatus, transactionDetails);
      if (!saved) console.error(`[ERROR] Could not save transaction for reference: ${clientReference}`);
    } else {
      console.warn(`[WARN] Client reference missing. CheckoutRequestID: ${CheckoutRequestID}`);
    }

    // Always respond 200 OK
    return res.status(200).json({ ResultCode: 0, ResultDesc: 'Callback processed successfully' });
  } catch (err) {
    console.error('[FATAL] Error processing M-Pesa callback:', err);
    return res.status(200).json({ ResultCode: 0, ResultDesc: 'Error handled safely' });
  }
};
