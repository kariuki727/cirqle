/**
 * api/stk-push.js
 * Initiates a Lipa Na M-Pesa STK Push using a Business Till.
 */

if (process.env.NODE_ENV !== 'production') require('dotenv').config();

const axios = require('axios');
const { doc, setDoc } = require('firebase/firestore');
const { db } = require('../services/firebase');

// --- Constants ---
const SANDBOX_BASE_URL = 'https://sandbox.safaricom.co.ke';
const LIVE_BASE_URL = 'https://api.safaricom.co.ke';

// Format timestamp YYYYMMDDHHMMSS
const getTimestamp = () => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}${String(d.getSeconds()).padStart(2,'0')}`;
};

// Get M-Pesa OAuth token
const getAccessToken = async (baseUrl, consumerKey, consumerSecret) => {
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
  const url = `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`;
  const response = await axios.get(url, { headers: { Authorization: `Basic ${auth}` } });
  return response.data.access_token;
};

// Normalize phone number
const normalizePhoneNumber = (phone) => {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9+]/g,'');
  if (/^0\d{9}$/.test(cleaned)) cleaned = `254${cleaned.slice(1)}`;
  if (/^\+254\d{9}$/.test(cleaned)) cleaned = cleaned.slice(1);
  if (/^254\d{9}$/.test(cleaned)) return cleaned;
  throw new Error('Invalid Kenyan phone number');
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

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success:false, error:'Method not allowed' });

  if (!MPESA_CONSUMER_KEY || !MPESA_CONSUMER_SECRET || !MPESA_BUSINESS_SHORTCODE || !MPESA_PASS_KEY || !MPESA_CALLBACK_URL) {
    return res.status(500).json({ success:false, error:'Server misconfiguration: Missing M-Pesa credentials' });
  }

  const { phoneNumber, amount, reference } = req.body;

  if (!phoneNumber || !amount || !reference) return res.status(400).json({ success:false, error:'Missing phoneNumber, amount, or reference' });

  let formattedPhone;
  try { formattedPhone = normalizePhoneNumber(phoneNumber); } 
  catch(e) { return res.status(400).json({ success:false, error:e.message }); }

  const validatedAmount = Math.ceil(Number(amount));
  if (isNaN(validatedAmount) || validatedAmount <= 0) return res.status(400).json({ success:false, error:'Amount must be a positive number' });

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

    const response = await axios.post(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, payload, {
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      timeout: 20000,
    });

    const darajaResponse = response.data;
    if (darajaResponse.ResponseCode === '0') {
      // Save initial transaction to DB
      await setDoc(doc(db,'transactions',reference), {
        status:'PENDING',
        checkoutRequestID: darajaResponse.CheckoutRequestID,
        amount: validatedAmount,
        phoneNumber: formattedPhone,
        createdAt: new Date().toISOString(),
      });

      return res.json({ success:true, message:'STK Push initiated', reference, checkoutRequestID: darajaResponse.CheckoutRequestID });
    }

    return res.status(400).json({ success:false, error: darajaResponse.ResponseDescription || 'STK Push failed', data:darajaResponse });

  } catch (error) {
    console.error('STK Push error:', error.message);
    return res.status(500).json({ success:false, error:'STK Push error', details:error.message });
  }
};
