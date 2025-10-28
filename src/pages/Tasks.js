import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wheel } from 'react-custom-roulette';
import { AuthContext } from '../context/AuthContext';
import { doc, updateDoc, arrayUnion, getDoc, runTransaction, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { CurrencyDollarIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import surveyImage from '../assets/spin.png';
import { usePlayerData } from '../services/playerData';
import axios from 'axios';

const Tasks = () => {
  const navigate = useNavigate();
  const { user, userData, loading: authLoading } = useContext(AuthContext);
  const [localUserData, setLocalUserData] = useState(userData);
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);
  const [reward, setReward] = useState(null);
  const [withdrawalError, setWithdrawalError] = useState('');
  const [withdrawalLoading, setWithdrawalLoading] = useState(false);
  const [selectedStake, setSelectedStake] = useState(20);
  const [stakeError, setStakeError] = useState('');
  const [spinCount, setSpinCount] = useState(0);
  const [isBettingAccountActive, setIsBettingAccountActive] = useState(false);
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [activationError, setActivationError] = useState('');
  const [activationLoading, setActivationLoading] = useState(false);
  const [phone, setPhone] = useState(userData?.phone || '');
  const [phoneError, setPhoneError] = useState('');
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [clientReference, setClientReference] = useState('');
  const [transactionId, setTransactionId] = useState('');

  const stakes = [20, 50, 100, 150, 200, 300];
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

  // Sync localUserData with userData
  useEffect(() => {
    setLocalUserData(userData);
    if (!authLoading && userData) setBalanceLoading(false);
  }, [userData, authLoading]);

  // Fetch and subscribe to user data
  useEffect(() => {
    if (!user || authLoading) {
      setBalanceLoading(false);
      setLocalUserData(null);
      setSpinCount(0);
      setIsBettingAccountActive(false);
      setPhone('');
      return;
    }

    const userRef = doc(db, 'users', user.uid);

    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setLocalUserData(data);
        setSpinCount(data.spinCount || 0);
        setIsBettingAccountActive(data.isBettingAccountActive || false);
        setPhone(data.phone ? (data.phone.startsWith('254') ? `0${data.phone.slice(3)}` : data.phone) : '');
        if (data.spinCount >= 3 && !data.isBettingAccountActive) {
          setShowActivationModal(true);
        }
      }
      setBalanceLoading(false);
    }, (err) => {
      console.error('onSnapshot error:', err);
      setBalanceLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading]);

  // Auto-close success modal
  useEffect(() => {
    if (showSuccessModal) {
      const timer = setTimeout(() => setShowSuccessModal(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessModal]);

  // === Phone Utilities ===
  const validatePhoneNumber = (phone) => /^(\+254[71]\d{8}|0[71]\d{8})$/.test(phone);

  const normalizePhoneNumber = (phone) => {
    if (!phone) return phone;
    const cleaned = phone.replace(/[^0-9+]/g, '');
    if (/^0[71]\d{8}$/.test(cleaned)) return `254${cleaned.slice(1)}`;
    if (/^\+254[71]\d{8}$/.test(cleaned)) return cleaned.slice(1);
    return cleaned;
  };

  const generateReference = () => `ACT-${user.uid}-${Date.now()}`;

  const checkTransactionStatus = async (ref) => {
    try {
      console.log(`Checking transaction status - Client Reference: ${ref}`);
      const res = await axios.get(`${apiUrl}/api/transaction-status`, {
        params: { reference: ref },
        timeout: 20000,
      });
      return res.data;
    } catch (err) {
      console.error('Transaction status error:', err.message);
      let msg = 'Failed to check transaction status. Retrying...';
      if (err.response?.status === 404) msg = 'Transaction is being processed. Please wait...';
      else if (err.response?.status === 400) msg = 'Invalid transaction reference. Please try again.';
      return { success: false, error: msg };
    }
  };

  // === Stake & Spin ===
  const handleStakeSelect = (stake) => {
    setSelectedStake(stake);
    setStakeError('');
  };

  const handleStakeInput = (e) => {
    const num = parseFloat(e.target.value);
    if (isNaN(num) || num < 20) {
      setStakeError('Stake must be at least KSh 20.');
      setSelectedStake(20);
    } else {
      setSelectedStake(num);
      setStakeError('');
    }
  };

  const handleSpinClick = async () => {
    if (mustSpin) return;
    if (!user) {
      setStakeError('Please sign in to spin.');
      return;
    }

    const totalBalance = (localUserData?.gamingEarnings || 0) + (localUserData?.taskEarnings || 0);
    if (totalBalance < selectedStake) {
      setStakeError('Insufficient balance to spin with selected stake.');
      return;
    }
    if (spinCount >= 3 && !isBettingAccountActive) {
      setShowActivationModal(true);
      return;
    }

    setStakeError('');
    setReward(null);

    try {
      const userRef = doc(db, 'users', user.uid);
      await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) throw new Error('User not found');

        const data = userSnap.data();
        const newGaming = Math.max(0, (data.gamingEarnings || 0) - selectedStake);
        const newTasks =
          newGaming === 0 && selectedStake > (data.gamingEarnings || 0)
            ? Math.max(0, (data.taskEarnings || 0) - (selectedStake - (data.gamingEarnings || 0)))
            : data.taskEarnings || 0;

        transaction.update(userRef, {
          gamingEarnings: newGaming,
          taskEarnings: newTasks,
          history: arrayUnion({
            task: `Spin to Win (Stake KSh ${selectedStake}, ${data.username || 'User'})`,
            reward: -selectedStake,
            date: new Date().toLocaleString(),
          }),
        });
      });

      const newPrize = Math.floor(Math.random() * data.length);
      setPrizeNumber(newPrize);
      setMustSpin(true);
    } catch (err) {
      console.error('Stake deduction error:', err);
      setStakeError('Failed to deduct stake. Please try again.');
    }
  };

  const onStopSpinning = async () => {
    setMustSpin(false);
    const winner = data[prizeNumber].option;
    const rewardValue = parseFloat(winner.replace('KSh ', ''));
    setReward(rewardValue);

    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      const currentData = userSnap.exists() ? userSnap.data() : {};

      await updateDoc(userRef, {
        gamingEarnings: (currentData.gamingEarnings || 0) + rewardValue,
        spinCount: spinCount + 1,
        history: arrayUnion({
          task: `Spin to Win (${currentData.username || 'User'})`,
          reward: rewardValue,
          date: new Date().toLocaleString(),
        }),
      });

      setSpinCount(spinCount + 1);
      if (spinCount + 1 === 3 && !isBettingAccountActive) setShowActivationModal(true);
    } catch (err) {
      console.error('Spin reward error:', err);
      alert('Failed to save reward. Please try again.');
    }
  };

  // === Activation ===
  const handlePhoneInput = (e) => {
    const val = e.target.value.replace(/[^0-9+]/g, '');
    setPhone(val);

    if (!val) setPhoneError('Phone number is required.');
    else if (!validatePhoneNumber(val)) setPhoneError('Enter a valid Kenyan phone number (e.g., +2547XXXXXXXX or 07XXXXXXXX).');
    else setPhoneError('');
  };

  const handleActivation = async () => {
    if (!user) return setActivationError('Please sign in.');
    if (!phone) return setActivationError('Please enter phone number.');
    if (!validatePhoneNumber(phone)) return setActivationError('Invalid phone number.');

    setActivationLoading(true);
    const normalizedPhone = normalizePhoneNumber(phone);
    const ref = generateReference();
    setClientReference(ref);
    setTransactionId(ref);

    try {
      const res = await axios.post(
        `${apiUrl}/api/stk-push`,
        { phoneNumber: normalizedPhone, amount: 150, reference: ref },
        { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
      );

      if (!res.data.success) throw new Error(res.data.error || 'STK Push failed');
    } catch (err) {
      console.error('Activation payment error:', err.message);
      setActivationError(err.response?.data?.error || 'Failed to initiate payment.');
      setActivationLoading(false);
    }
  };

  // === Poll Activation Status ===
  useEffect(() => {
    if (!activationLoading || !clientReference) return;

    const startTime = Date.now();
    const maxDuration = 300000; // 5 mins

    const pollStatus = async () => {
      if (Date.now() - startTime > maxDuration) {
        setActivationError('Payment timed out.');
        setActivationLoading(false);
        return;
      }

      const status = await checkTransactionStatus(clientReference);

      if (status.success) {
        if (status.status === 'SUCCESS') {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            isBettingAccountActive: true,
            phone: normalizePhoneNumber(phone),
            history: arrayUnion({
              task: `Account Activation (${normalizePhoneNumber(phone)})`,
              reward: -150,
              date: new Date().toLocaleString(),
              transactionId,
            }),
          });

          setIsBettingAccountActive(true);
          setShowActivationModal(false);
          setShowSuccessModal(true);
          setActivationLoading(false);
          console.log('Activation successful');
        } else if (['FAILED', 'CANCELLED'].includes(status.status)) {
          setActivationError(`Payment ${status.status.toLowerCase()}. Please try again.`);
          setActivationLoading(false);
        } else if (status.status === 'QUEUED') {
          setActivationError('Transaction is being processed...');
        }
      } else setActivationError(status.error);
    };

    const interval = setInterval(pollStatus, 5000);
    return () => clearInterval(interval);
  }, [activationLoading, clientReference, user, phone, transactionId]);

  const handleWithdrawal = () => navigate('/earnings');
  const handleDeposit = () => navigate('/deposit', { replace: true, state: { from: '/tasks' } });

  const players = usePlayerData();

  // === JSX omitted for brevity; keep your current layout ===
  // Replace all `payheroReference` usage with `clientReference` consistently
  // Keep modal open/close logic, spin wheel, and player list as-is

  return (
    <div className="min-h-screen bg-secondary font-roboto flex items-start justify-center px-4 pt-4 pb-20">
      {/* Your existing JSX here */}
    </div>
  );
};

export default Tasks;
