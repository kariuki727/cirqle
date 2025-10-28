import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wheel } from 'react-custom-roulette';
import { AuthContext } from '../context/AuthContext';
import { doc, updateDoc, arrayUnion, getDoc, runTransaction, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { usePlayerData } from '../services/playerData';
import axios from 'axios';

const Tasks = () => {
  const navigate = useNavigate();
  const { user, userData, loading: authLoading } = useContext(AuthContext);
  const [localUserData, setLocalUserData] = useState(userData);
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);
  const [reward, setReward] = useState(null);
  const [stakeError, setStakeError] = useState('');
  const [selectedStake, setSelectedStake] = useState(20);
  const [spinCount, setSpinCount] = useState(0);
  const [isBettingAccountActive, setIsBettingAccountActive] = useState(false);
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [activationError, setActivationError] = useState('');
  const [activationLoading, setActivationLoading] = useState(false);
  const [phone, setPhone] = useState(userData?.phone || '');
  const [clientReference, setClientReference] = useState('');
  const [transactionId, setTransactionId] = useState('');

  const apiUrl = process.env.REACT_APP_API_URL || 'https://earn-to-mpesa-online.vercel.app';

  const data = [
    { option: 'KSh 0.00', style: { backgroundColor: '#03A6A1', textColor: 'white' } },
    { option: 'KSh 100', style: { backgroundColor: '#FFE3BB', textColor: '#FF4F0F' } },
    { option: 'KSh 150', style: { backgroundColor: '#FFA673', textColor: 'white' } },
    { option: 'KSh 200', style: { backgroundColor: '#FF4F0F', textColor: 'white' } },
    { option: 'KSh 250', style: { backgroundColor: '#03A6A1', textColor: 'white' } },
    { option: 'KSh 300', style: { backgroundColor: '#FFE3BB', textColor: '#FF4F0F' } },
    { option: 'KSh 350', style: { backgroundColor: '#FFA673', textColor: 'white' } },
    { option: 'KSh 400', style: { backgroundColor: '#FF4F0F', textColor: 'white' } },
    { option: 'KSh 450', style: { backgroundColor: '#03A6A1', textColor: 'white' } },
    { option: 'KSh 500', style: { backgroundColor: '#FFE3BB', textColor: '#FF4F0F' } },
  ];

  // === Effects ===
  useEffect(() => setLocalUserData(userData), [userData]);

  useEffect(() => {
    if (!user || authLoading) return;
    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, docSnap => {
      if(docSnap.exists()){
        const data = docSnap.data();
        setLocalUserData(data);
        setSpinCount(data.spinCount || 0);
        setIsBettingAccountActive(data.isBettingAccountActive || false);
        setPhone(data.phone ? (data.phone.startsWith('254') ? `0${data.phone.slice(3)}` : data.phone) : '');
        if(data.spinCount >= 3 && !data.isBettingAccountActive) setShowActivationModal(true);
      }
    });
    return () => unsubscribe();
  }, [user, authLoading]);

  // === Utilities ===
  const validatePhoneNumber = phone => /^(\+254[71]\d{8}|0[71]\d{8}|2541\d{7}|01\d{8})$/.test(phone);

  const normalizePhoneNumber = phone => {
    const cleaned = phone.replace(/[^0-9+]/g,'');
    if(/^0[71]\d{8}$/.test(cleaned)) return `254${cleaned.slice(1)}`;
    if(/^\+254[71]\d{8}$/.test(cleaned)) return cleaned.slice(1);
    if(/^254[71]\d{8}$/.test(cleaned)) return cleaned;
    if(/^01\d{8}$/.test(cleaned)) return `254${cleaned.slice(1)}`;
    if(/^2541\d{7}$/.test(cleaned)) return cleaned;
    throw new Error('Invalid Kenyan phone number');
  };

  const generateReference = () => `ACT-${user.uid}-${Date.now()}`;

  const checkTransactionStatus = async ref => {
    try {
      const res = await axios.get(`${apiUrl}/api/transaction-status`, { params:{ reference:ref }, timeout:20000 });
      return res.data;
    } catch (err) {
      return { success:false, error:'Failed to check transaction status.' };
    }
  };

  // === Stake & Spin ===
  const handleStakeSelect = stake => { setSelectedStake(stake); setStakeError(''); };

  const handleSpinClick = async () => {
    if(mustSpin) return;
    if(!user) return setStakeError('Sign in to spin.');

    const totalBalance = (localUserData?.gamingEarnings||0) + (localUserData?.taskEarnings||0);
    if(totalBalance < selectedStake) return setStakeError('Insufficient balance.');
    if(spinCount>=3 && !isBettingAccountActive) return setShowActivationModal(true);

    try{
      const userRef = doc(db,'users',user.uid);
      await runTransaction(db, async transaction => {
        const snap = await transaction.get(userRef);
        if(!snap.exists()) throw new Error('User not found');
        const data = snap.data();
        const newGaming = Math.max(0,(data.gamingEarnings||0)-selectedStake);
        const newTasks = newGaming===0 && selectedStake>(data.gamingEarnings||0) ? Math.max(0,(data.taskEarnings||0)-(selectedStake-(data.gamingEarnings||0))) : data.taskEarnings||0;
        transaction.update(userRef,{ gamingEarnings:newGaming, taskEarnings:newTasks, history: arrayUnion({ task:`Spin to Win (Stake KSh ${selectedStake})`, reward:-selectedStake, date:new Date().toLocaleString() }) });
      });

      const newPrize = Math.floor(Math.random()*data.length);
      setPrizeNumber(newPrize);
      setMustSpin(true);
    }catch(err){ console.error(err); setStakeError('Failed to deduct stake.'); }
  };

  const onStopSpinning = async () => {
    setMustSpin(false);
    const winner = data[prizeNumber].option;
    const rewardValue = parseFloat(winner.replace('KSh ',''));
    setReward(rewardValue);

    if(!user) return;

    const userRef = doc(db,'users',user.uid);
    const snap = await getDoc(userRef);
    const currentData = snap.exists()? snap.data(): {};
    await updateDoc(userRef,{
      gamingEarnings: (currentData.gamingEarnings||0)+rewardValue,
      spinCount: spinCount+1,
      history: arrayUnion({ task:`Spin to Win`, reward:rewardValue, date:new Date().toLocaleString() })
    });
    setSpinCount(spinCount+1);
    if(spinCount+1===3 && !isBettingAccountActive) setShowActivationModal(true);
  };

  // === Activation ===
  const handlePhoneInput = e => setPhone(e.target.value.replace(/[^0-9+]/g,''));

  const handleActivation = async () => {
    if(!user) return setActivationError('Sign in first.');
    if(!phone) return setActivationError('Enter phone number.');
    if(!validatePhoneNumber(phone)) return setActivationError('Invalid phone number.');

    setActivationLoading(true);
    const normalizedPhone = normalizePhoneNumber(phone);
    const ref = generateReference();
    setClientReference(ref);
    setTransactionId(ref);

    try{
      const res = await axios.post(`${apiUrl}/api/stk-push`, { phoneNumber:normalizedPhone, amount:150, reference:ref }, { headers:{ 'Content-Type':'application/json' }, timeout:15000 });
      if(!res.data.success) throw new Error(res.data.error||'STK Push failed');
    }catch(err){ console.error(err); setActivationError(err.response?.data?.error||'Failed to initiate payment.'); setActivationLoading(false); }
  };

  useEffect(() => {
    if(!activationLoading || !clientReference) return;
    const startTime = Date.now(); const maxDuration=300000;
    const interval = setInterval(async ()=>{
      if(Date.now()-startTime>maxDuration){ setActivationError('Payment timed out'); setActivationLoading(false); clearInterval(interval); return; }
      const status = await checkTransactionStatus(clientReference);
      if(status.success){
        if(status.status==='SUCCESS'){
          const userRef=doc(db,'users',user.uid);
          await updateDoc(userRef,{ isBettingAccountActive:true, phone:normalizePhoneNumber(phone), history:arrayUnion({ task:'Account Activation', reward:-150, date:new Date().toLocaleString(), transactionId }) });
          setIsBettingAccountActive(true); setShowActivationModal(false); setActivationLoading(false);
        } else if(['FAILED','CANCELLED'].includes(status.status)){ setActivationError(`Payment ${status.status.toLowerCase()}.`); setActivationLoading(false); }
      } else setActivationError(status.error);
    },5000);
    return ()=>clearInterval(interval);
  }, [activationLoading, clientReference, user, phone, transactionId]);

  // === Navigation ===
  const handleWithdrawal = ()=>navigate('/earnings');
  const handleDeposit = ()=>navigate('/deposit', { replace:true, state:{ from:'/tasks' } });

  const players = usePlayerData();

  return (
    <div className="min-h-screen bg-secondary font-roboto flex items-start justify-center px-4 pt-4 pb-20">
      {/* Replace with your JSX layout, wheel, modals, buttons, etc. */}
    </div>
  );
};

export default Tasks;
