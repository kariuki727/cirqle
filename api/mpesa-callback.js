/**
 * api/mpesa-callback.js
 * Receives M-Pesa confirmation for STK Push.
 */

const { doc, updateDoc, setDoc, getDoc } = require('firebase/firestore');
const { db } = require('../services/firebase');

module.exports = async (req,res) => {
  const callbackData = req.body;
  console.log(`[${new Date().toISOString()}] M-Pesa callback received:`, JSON.stringify(callbackData,null,2));

  const resultBody = callbackData.Body?.stkCallback;
  if (!resultBody || typeof resultBody.ResultCode === 'undefined') return res.status(200).json({ ResultCode:0, ResultDesc:'Accepted' });

  const resultCode = resultBody.ResultCode;
  const checkoutRequestID = resultBody.CheckoutRequestID;
  const merchantRequestID = resultBody.MerchantRequestID;
  const resultDesc = resultBody.ResultDesc;

  let reference = '';
  let status = 'PENDING';
  const transactionDetails = { checkoutRequestID, merchantRequestID, resultDesc, resultCode };

  if (resultCode === 0) {
    status = 'SUCCESS';
    const metadata = resultBody.CallbackMetadata?.Item || [];
    metadata.forEach(item => {
      if(item.Name==='AccountReference') reference=item.Value;
      transactionDetails[item.Name] = item.Value;
    });
  } else if ([1,1032].includes(resultCode)) {
    status='CANCELLED';
    reference=resultBody.AccountReference || 'UNKNOWN';
  } else {
    status='FAILED';
    reference=resultBody.AccountReference || 'UNKNOWN';
  }

  if(reference && reference!=='UNKNOWN'){
    const txRef = doc(db,'transactions',reference);
    const existing = await getDoc(txRef);
    if(existing.exists()){
      await updateDoc(txRef, { status, transactionDetails, updatedAt:new Date().toISOString() });
    } else {
      await setDoc(txRef,{ status, transactionDetails, updatedAt:new Date().toISOString() });
    }
  } else console.error('Could not determine client reference for:', checkoutRequestID);

  return res.status(200).json({ ResultCode:0, ResultDesc:'Callback processed successfully' });
};
