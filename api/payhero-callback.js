module.exports = (req, res) => {
    // Log callback data
    console.log(`[${new Date().toISOString()}] Callback received - Data: ${JSON.stringify(req.body)}`);
    const callbackData = req.body;
    const reference = callbackData.reference || callbackData.external_reference;
  
    // Validate reference
    if (!reference) {
      console.log('Callback missing reference');
      return res.status(400).json({ success: false, error: 'Missing reference' });
    }
  
    // Validate secret (if defined)
    const secret = process.env.CALLBACK_SECRET;
    const providedSecret = req.headers['x-payhero-secret'];
    if (secret && providedSecret !== secret) {
      console.log('Unauthorized callback attempt');
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
  
    // Log successful processing
    console.log(`Callback processed for ${reference}: ${callbackData.status}`);
    // Note: No state storage; frontend polls /api/transaction-status
    return res.status(200).json({ success: true, message: 'Callback received' });
  };