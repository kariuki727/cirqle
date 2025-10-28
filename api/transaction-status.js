/**
 * api/transaction-status.js
 * * Handles the status query for M-Pesa transactions.
 * * It fetches the status from a local database/state store,
 * * which must be updated by the api/mpesa-callback.js file.
 * * This replaces the direct PayHero API polling logic.
 */

const axios = require('axios'); // Keep axios in case you add a separate Daraja Query API later

// --- IMPORTANT: PLACEHOLDER FUNCTION ---
// ⚠️ YOU MUST REPLACE THIS WITH YOUR ACTUAL DATABASE LOGIC ⚠️
/**
 * @param {string} reference - The unique client reference (AccountReference)
 * @returns {Promise<object|null>} The transaction data object or null if not found.
 * The returned object should minimally have a 'status' field (e.g., 'SUCCESS', 'FAILED', 'PENDING').
 */
async function getTransactionStatusFromDB(reference) {
    // ⚠️ IMPLEMENT YOUR DATABASE QUERY HERE ⚠️
    // Example:
    // const transaction = await db.collection('transactions').findOne({ clientReference: reference });
    // return transaction || null;

    // Default simulation for an unknown/pending status:
    console.log(`[DB Placeholder] Searching status for reference: ${reference}`);
    return {
        status: 'PENDING', // Default status for a transaction not yet in DB or still processing
        message: 'Status pending or transaction not found in database.',
        isPlaceholder: true,
    };
}


module.exports = async (req, res) => {
    // Extract and validate reference (AccountReference)
    const { reference } = req.query;
    console.log(`[${new Date().toISOString()}] M-Pesa Transaction status requested - Reference: ${reference}`);

    if (!reference) {
        console.log('Missing reference parameter');
        return res.status(400).json({ success: false, error: 'Missing reference' });
    }

    try {
        // Fetch status from the database/state store
        const transactionData = await getTransactionStatusFromDB(reference);

        if (!transactionData) {
            // Transaction reference not found in the system
            console.log(`Reference ${reference} not found.`);
            return res.status(404).json({
                success: false,
                status: 'NOT_FOUND',
                error: 'Transaction reference not found in the system.',
            });
        }

        // --- Normalize Status for Frontend ---
        // Ensure the status returned is one the frontend expects (SUCCESS, FAILED, CANCELLED, PENDING/QUEUED)
        const dbStatus = transactionData.status ? transactionData.status.toUpperCase() : 'PENDING';
        let normalizedStatus;

        switch (dbStatus) {
            case 'SUCCESS':
            case 'COMPLETED':
                normalizedStatus = 'SUCCESS';
                break;
            case 'CANCELLED':
            case 'USER_CANCELLED':
                normalizedStatus = 'CANCELLED';
                break;
            case 'FAILED':
            case 'TIMEOUT':
            case 'EXPIRED':
                normalizedStatus = 'FAILED';
                break;
            default:
                normalizedStatus = 'QUEUED'; // Use QUEUED for PENDING, PROCESSING, or any other unknown state
        }

        // Respond with status
        console.log(`Status for ${reference} retrieved from DB: ${normalizedStatus}`);
        return res.json({
            success: true,
            status: normalizedStatus,
            data: transactionData, // Send all data back for debugging/details
        });

    } catch (error) {
        console.error('Transaction status DB lookup error:', error.message);
        return res.status(500).json({
            success: false,
            error: 'An unexpected database error occurred during status check.',
            details: error.message,
        });
    }
};
