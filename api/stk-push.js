/**
 * api/stk-push.js
 * * Handles the M-Pesa Lipa Na M-Pesa Online (LNMO) STK Push initiation.
 * This file replaces the PayHero integration with direct M-Pesa Daraja calls.
 * * Requires the following environment variables:
 * - MPESA_CONSUMER_KEY
 * - MPESA_CONSUMER_SECRET
 * - MPESA_BUSINESS_SHORTCODE (Your Paybill or Till Number)
 * - MPESA_PASS_KEY (The LNM Online Passkey)
 * - MPESA_CALLBACK_URL (Must be a publicly accessible HTTPS URL, e.g., https://your-app.vercel.app/api/mpesa-callback)
 * - MPESA_ENV ('sandbox' or 'live')
 */

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const axios = require('axios');

// --- CONSTANTS ---
const SANDBOX_BASE_URL = 'https://sandbox.safaricom.co.ke';
const LIVE_BASE_URL = 'https://api.safaricom.co.ke';

// Function to get the current timestamp in the required M-Pesa format (YYYYMMDDHHmmss)
const getTimestamp = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
};

// Function to generate the M-Pesa authentication token
const getAccessToken = async (baseUrl, consumerKey, consumerSecret) => {
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    const url = `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`;

    const response = await axios.get(url, {
        headers: {
            'Authorization': `Basic ${auth}`,
        }
    });
    return response.data.access_token;
};

module.exports = async (req, res) => {
    const {
        MPESA_CONSUMER_KEY,
        MPESA_CONSUMER_SECRET,
        MPESA_BUSINESS_SHORTCODE,
        MPESA_PASS_KEY,
        MPESA_CALLBACK_URL,
        MPESA_ENV = 'sandbox',
    } = process.env;

    const BASE_URL = MPESA_ENV === 'live' ? LIVE_BASE_URL : SANDBOX_BASE_URL;

    // --- CORS Handling (Keep as in original request) ---
    const allowedOrigin = 'https://earn-to-mpesa-online.vercel.app';
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    // --- Environment Variable Validation ---
    if (!MPESA_CONSUMER_KEY || !MPESA_CONSUMER_SECRET || !MPESA_BUSINESS_SHORTCODE || !MPESA_PASS_KEY || !MPESA_CALLBACK_URL) {
        console.error('Missing M-Pesa environment variables.');
        return res.status(500).json({ success: false, error: 'Server configuration error: Missing M-Pesa credentials.' });
    }

    // --- Request Body Validation and Extraction ---
    const { phoneNumber, amount, reference } = req.body;
    console.log(`STK Push requested - Phone: ${phoneNumber}, Amount: ${amount}, Client Reference: ${reference}`);

    if (!phoneNumber || !amount || !reference) {
        return res.status(400).json({ success: false, error: 'Missing phoneNumber, amount, or reference' });
    }

    // 1. Format phone number (e.g., 07XXXXXXXX -> 2547XXXXXXXX)
    let formattedPhone = phoneNumber.startsWith('0') ? `254${phoneNumber.slice(1)}` : phoneNumber;
    formattedPhone = formattedPhone.startsWith('+') ? formattedPhone.slice(1) : formattedPhone;

    if (!/^(254[17]\d{8})$/.test(formattedPhone)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid phone number format. Must be a Kenyan mobile number (e.g., 2547XXXXXXXX)',
        });
    }

    // 2. Validate amount
    const validatedAmount = Math.ceil(Number(amount)); // M-Pesa amounts are typically integers/whole shillings
    if (isNaN(validatedAmount) || validatedAmount <= 0) {
        return res.status(400).json({ success: false, error: 'Amount must be a positive number' });
    }

    try {
        // --- M-Pesa Daraja Authentication ---
        const accessToken = await getAccessToken(BASE_URL, MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET);
        console.log('Access token retrieved successfully.');

        // --- M-Pesa Daraja Password Generation ---
        const timestamp = getTimestamp();
        const password = Buffer.from(
            `${MPESA_BUSINESS_SHORTCODE}${MPESA_PASS_KEY}${timestamp}`
        ).toString('base64');
        
        const transactionType = validatedAmount > 100000 ? 'CustomerPayBillOnline' : 'CustomerBuyGoodsOnline'; // Example logic, typically based on shortcode type

        // --- M-Pesa STK Push Payload ---
        const payload = {
            BusinessShortCode: MPESA_BUSINESS_SHORTCODE,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline', // Change to 'CustomerBuyGoodsOnline' if using a Till Number
            Amount: validatedAmount,
            PartyA: formattedPhone, // Customer phone number
            PartyB: MPESA_BUSINESS_SHORTCODE, // Shortcode receiving the money
            PhoneNumber: formattedPhone, // Customer phone number
            CallBackURL: MPESA_CALLBACK_URL, // The endpoint defined in api/mpesa-callback.js
            AccountReference: reference, // Your unique identifier for the transaction (e.g., order ID)
            TransactionDesc: `Payment for ${reference}`, // Transaction description
        };

        // --- Send STK Push Request ---
        const response = await axios.post(
            `${BASE_URL}/mpesa/stkpush/v1/processrequest`,
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                timeout: 20000,
            }
        );

        // --- Handle Response ---
        const darajaResponse = response.data;

        if (darajaResponse.ResponseCode === '0') {
            // Success in requesting the STK Push prompt
            console.log(`STK Push successful: ${darajaResponse.CheckoutRequestID}`);
            return res.json({
                success: true,
                message: 'STK Push initiated successfully. Please check your phone.',
                reference: reference, 
                checkoutRequestID: darajaResponse.CheckoutRequestID, // Used for transaction status query
            });
        }
        
        // Handle explicit Daraja failure
        console.error(`Daraja Response Error: Code ${darajaResponse.ResponseCode}, Desc: ${darajaResponse.ResponseDescription}`);
        return res.status(400).json({
            success: false,
            error: darajaResponse.ResponseDescription || 'STK Push initiation failed by Daraja API.',
            data: darajaResponse,
        });

    } catch (error) {
        const errorData = error.response?.data || { error_message: error.message };
        const status = error.response?.status || 500;
        
        if (error.code === 'ECONNABORTED') {
             console.error('STK Push Request Timeout (could be successful on M-Pesa side).');
             return res.status(504).json({
                success: false,
                error: 'Request timeout. Transaction might still be processing. Check status later.',
            });
        }

        console.error(`STK Push unexpected error (Status: ${status}): ${JSON.stringify(errorData)}`);
        return res.status(status).json({
            success: false,
            error: errorData.errorMessage || errorData.error_message || 'An unexpected error occurred during STK Push.',
            data: errorData,
        });
    }
};
