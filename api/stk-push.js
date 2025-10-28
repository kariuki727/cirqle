if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const axios = require('axios');

module.exports = async (req, res) => {
  // Handle CORS preflight request (OPTIONS)
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', 'https://earn-to-mpesa-online.vercel.app');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  // Validate request method
  if (req.method !== 'POST') {
    res.setHeader('Access-Control-Allow-Origin', 'https://earn-to-mpesa-online.vercel.app');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Set CORS headers for POST
  res.setHeader('Access-Control-Allow-Origin', 'https://earn-to-mpesa-online.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Extract and validate request body
  const { phoneNumber, amount, reference } = req.body;
  console.log(`STK Push requested - Phone: ${phoneNumber}, Amount: ${amount}, Client Reference: ${reference}`);

  if (!phoneNumber || !amount || !reference) {
    return res.status(400).json({ success: false, error: 'Missing phoneNumber, amount, or reference' });
  }

  // Format phone number (e.g., 07XXXXXXXX -> 2547XXXXXXXX)
  const formattedPhone = phoneNumber.startsWith('0') ? `254${phoneNumber.slice(1)}` : phoneNumber;
  if (!/^(254[17]\d{8})$/.test(formattedPhone)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid phone number format. Use 07XXXXXXXX or 254XXXXXXXXX',
    });
  }

  // Validate amount
  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({ success: false, error: 'Amount must be a positive number' });
  }

  try {
    const apiUsername = process.env.PAYHERO_API_USERNAME;
    const apiPassword = process.env.PAYHERO_API_PASSWORD;
    if (!apiUsername || !apiPassword) {
      throw new Error('Missing PayHero API credentials');
    }
    const authToken = `Basic ${Buffer.from(`${apiUsername}:${apiPassword}`).toString('base64')}`;

    // Construct callback URL
    const callbackUrl = `https://${req.headers.host}/api/payhero-callback`;

    // PayHero API payload
    const payload = {
      amount: Number(amount),
      phone_number: formattedPhone,
      channel_id: 3661,
      provider: 'm-pesa',
      external_reference: reference,
      callback_url: callbackUrl,
    };

    // Send request to PayHero API
    const response = await axios.post(
      'https://backend.payhero.co.ke/api/v2/payments',
      payload,
      {
        headers: { Authorization: authToken, 'Content-Type': 'application/json' },
        timeout: 20000,
      }
    );

    // Handle response
    const payheroReference = response.data.reference || reference;
    console.log(`PayHero response - Status: ${response.data.status}, Reference: ${payheroReference}, Client Reference: ${reference}`);

    if (response.data.status === 'QUEUED' || response.data.success) {
      return res.json({
        success: true,
        reference: reference, // Always return client-provided reference
        message: 'STK Push initiated',
        payheroReference: payheroReference, // Include for debugging
      });
    }
    return res.status(400).json({
      success: false,
      error: 'STK Push initiation failed',
      data: response.data,
    });
  } catch (error) {
    const errorData = error.response?.data || { error_message: error.message };
    console.error(`STK Push error: ${JSON.stringify(errorData)}`);
    return res.status(500).json({
      success: false,
      error: errorData.error_message || 'An unexpected error occurred',
    });
  }
};