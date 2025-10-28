/**
 * api/transaction-status.js
 * Returns the current status of a transaction.
 */

const { doc, getDoc } = require('firebase/firestore');
const { db } = require('../services/firebase');

module.exports = async (req,res) => {
  const { reference } = req.query;
  if(!reference) return res.status(400).json({ success:false, error:'Missing reference' });

  try {
    const txRef = doc(db,'transactions',reference);
    const txSnap = await getDoc(txRef);
    if(!txSnap.exists()) return res.status(404).json({ success:false, status:'NOT_FOUND', error:'Transaction not found' });

    const data = txSnap.data();
    let normalizedStatus='QUEUED';
    switch((data.status||'PENDING').toUpperCase()){
      case 'SUCCESS': normalizedStatus='SUCCESS'; break;
      case 'CANCELLED': normalizedStatus='CANCELLED'; break;
      case 'FAILED': normalizedStatus='FAILED'; break;
      default: normalizedStatus='QUEUED';
    }

    return res.json({ success:true, status:normalizedStatus, data });
  } catch(err){
    console.error('Transaction status error:', err.stack);
    return res.status(500).json({ success:false, error:'DB error checking transaction', details:err.message });
  }
};
