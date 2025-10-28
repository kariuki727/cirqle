/**
 * api/stk-push.js
 * Initiates M-Pesa Lipa Na M-Pesa Online (LNMO) STK Push.
 */

if (process.env.NODE_ENV !== 'production') require('dotenv').config();
const axios = require('axios');

const SANDBOX_BASE_URL = 'https://sandbox.safaricom.co.ke';
const LIVE_BASE_URL = 'https://api.safaricom.co.ke';

const getTimestamp = () => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}${String(d.getSeconds()).padStart(2,'0')}`;
};

const getAccessToken = async (baseUrl, consumerKey, consumerSecret) => {
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
  const { data } = await axios.get(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { 'Authorization': `Basic ${auth}` }
  });
  return data.access_token;
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

  // --- CORS ---
  const allowedOrigin = 'https://earn-to-mpesa-online.vercel.app';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  // --- Environment Validation ---
  if (!MPESA_CONSUMER_KEY || !MPESA_CONSUMER_SECRET || !MPESA_BUSINESS_SHORTCODE || !MPESA_PASS_KEY || !MPESA_CALLBACK_URL) {
    console.error('Missing M-Pesa credentials in environment variables.');
    return res.status(500).json({ success: false, error: 'Server misconfiguration' });
  }

  // --- Request Validation ---
  let { phoneNumber, amount, reference } = req.body;
  if (!phoneNumber || !amount || !reference) {
    return res.status(400).json({ success: false, error: 'phoneNumber, amount, and reference are required' });
  }

  // Normalize phone number
  phoneNumber = phoneNumber.replace(/\s|-/g, ''); // remove spaces/dashes
  let formattedPhone = phoneNumber.startsWith('0') ? `254${phoneNumber.slice(1)}` : phoneNumber;
  formattedPhone = formattedPhone.startsWith('+') ? formattedPhone.slice(1) : formattedPhone;
  if (!/^254[17]\d{8}$/.test(formattedPhone)) {
    return res.status(400).json({ success: false, error: 'Invalid Kenyan phone number format' });
  }

  // Validate amount
  const validatedAmount = Math.ceil(Number(amount));
  if (isNaN(validatedAmount) || validatedAmount <= 0) {
    return res.status(400).json({ success: false, error: 'Amount must be a positive number' });
  }

  try {
    const accessToken = await getAccessToken(BASE_URL, MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET);

    const timestamp = getTimestamp();
    const password = Buffer.from(`${MPESA_BUSINESS_SHORTCODE}${MPESA_PASS_KEY}${timestamp}`).toString('base64');

    const payload = {
      BusinessShortCode: MPESA_BUSINESS_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: validatedAmount,
      PartyA: formattedPhone,
      PartyB: MPESA_BUSINESS_SHORTCODE,
      PhoneNumber: formattedPhone,
      CallBackURL: MPESA_CALLBACK_URL,
      AccountReference: reference,
      TransactionDesc: `Payment for ${reference}`,
    };

    const { data: darajaResponse } = await axios.post(
      `${BASE_URL}/mpesa/stkpush/v1/processrequest`,
      payload,
      { headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, timeout: 20000 }
    );

    if (darajaResponse.ResponseCode === '0') {
      console.log(`[STK PUSH] Success: ${darajaResponse.CheckoutRequestID} for ${reference}`);
      return res.json({ success: true, message: 'STK Push initiated', reference, checkoutRequestID: darajaResponse.CheckoutRequestID });
    }

    console.error(`[STK PUSH ERROR] ${darajaResponse.ResponseDescription}`);
    return res.status(400).json({ success: false, error: darajaResponse.ResponseDescription, data: darajaResponse });

  } catch (err) {
    const status = err.response?.status || 500;
    const errorData = err.response?.data || { message: err.message };

    if (err.code === 'ECONNABORTED') {
      console.error('[STK PUSH TIMEOUT] Could be successful on M-Pesa side.');
      return res.status(504).json({ success: false, error: 'Request timeout. Transaction may still be processing.' });
    }

    console.error(`[STK PUSH UNEXPECTED] Status: ${status}`, errorData);
    return res.status(status).json({ success: false, error: errorData.errorMessage || errorData.message || 'Unexpected error', data: errorData });
  }
};
