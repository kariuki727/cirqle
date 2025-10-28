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
  const [payheroReference, setPayheroReference] = useState('');
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
    if (!authLoading && userData) {
      setBalanceLoading(false);
    }
  }, [userData, authLoading]);

  // Fetch user data and set up real-time listener
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
    const fetchUserData = async () => {
      try {
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setLocalUserData(data);
          setSpinCount(data.spinCount || 0);
          setIsBettingAccountActive(data.isBettingAccountActive || false);
          setPhone(data.phone ? (data.phone.startsWith('254') ? `0${data.phone.slice(3)}` : data.phone) : '');
          if (data.spinCount >= 3 && !data.isBettingAccountActive) {
            setShowActivationModal(true);
          }
          console.log('Tasks fetched user data:', {
            gamingEarnings: data.gamingEarnings,
            taskEarnings: data.taskEarnings,
            spinCount: data.spinCount,
            isBettingAccountActive: data.isBettingAccountActive,
          });
          setBalanceLoading(false);
        }
      } catch (err) {
        console.error('Tasks fetch user data error:', err);
        setBalanceLoading(false);
      }
    };

    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setLocalUserData(data);
        setSpinCount(data.spinCount || 0);
        setIsBettingAccountActive(data.isBettingAccountActive || false);
        setPhone(data.phone ? (data.phone.startsWith('254') ? `0${data.phone.slice(3)}` : data.phone) : '');
        if (data.spinCount >= 3 && !data.isBettingAccountActive) {
          setShowActivationModal(true);
        }
        console.log('Tasks onSnapshot user data:', {
          gamingEarnings: data.gamingEarnings,
          taskEarnings: data.taskEarnings,
          spinCount: data.spinCount,
          isBettingAccountActive: data.isBettingAccountActive,
        });
        setBalanceLoading(false);
      }
    }, (err) => {
      console.error('Tasks onSnapshot error:', err);
      setBalanceLoading(false);
    });

    fetchUserData();
    return () => unsubscribe();
  }, [user, authLoading]);

  // Auto-close success modal after 3 seconds
  useEffect(() => {
    if (showSuccessModal) {
      const timer = setTimeout(() => {
        setShowSuccessModal(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessModal]);

  // Validate phone number
  const validatePhoneNumber = (phone) => {
    const regex = /^(\+254[7|1]\d{8}|0[7|1]\d{8})$/;
    return regex.test(phone);
  };

  // Normalize phone number to 254 format
  const normalizePhoneNumber = (phone) => {
    if (!phone) return phone;
    const cleaned = phone.replace(/[^0-9+]/g, '');
    if (/^0[7|1]\d{8}$/.test(cleaned)) {
      return `254${cleaned.slice(1)}`;
    }
    if (/^\+254[7|1]\d{8}$/.test(cleaned)) {
      return cleaned.slice(1);
    }
    return cleaned;
  };

  // Generate client reference
  const generateReference = () => {
    return `ACT-${user.uid}-${Date.now()}`;
  };

  // Check transaction status
  const checkTransactionStatus = async (ref) => {
    try {
      console.log(`Checking transaction status - PayHero Reference: ${ref}`);
      const response = await axios.get(`${apiUrl}/api/transaction-status`, {
        params: { reference: ref },
        timeout: 20000,
      });
      return response.data;
    } catch (err) {
      console.error('Transaction status check error:', err.message);
      let errorMessage = 'Failed to check transaction status. Retrying...';
      if (err.response?.status === 404) {
        errorMessage = 'Transaction is being processed. Please wait...';
      } else if (err.response?.status === 400) {
        errorMessage = 'Invalid transaction reference. Please try again.';
      }
      return { success: false, error: errorMessage };
    }
  };

  const handleStakeSelect = (stake) => {
    setSelectedStake(stake);
    setStakeError('');
  };

  const handleStakeInput = (e) => {
    const value = e.target.value;
    if (value === '') {
      setSelectedStake(20);
      setStakeError('');
      return;
    }
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 20) {
      setStakeError('Stake must be at least KSh 20.');
      setSelectedStake(20);
    } else {
      setSelectedStake(numValue);
      setStakeError('');
    }
  };

  const handlePhoneInput = (e) => {
    const value = e.target.value.replace(/[^0-9+]/g, '');
    setPhone(value);
    if (!value) {
      setPhoneError('Phone number is required.');
    } else if (!validatePhoneNumber(value)) {
      setPhoneError('Please enter a valid Kenyan phone number (e.g., +2547XXXXXXXX or 07XXXXXXXX).');
    } else {
      setPhoneError('');
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
    if (selectedStake < 20) {
      setStakeError('Stake must be at least KSh 20.');
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
        if (!userSnap.exists()) {
          throw new Error('User not found');
        }
        const userData = userSnap.data();
        const newGamingEarnings = Math.max(0, (userData.gamingEarnings || 0) - selectedStake);
        const newTaskEarnings =
          newGamingEarnings === 0 && selectedStake > (userData.gamingEarnings || 0)
            ? Math.max(0, (userData.taskEarnings || 0) - (selectedStake - (userData.gamingEarnings || 0)))
            : userData.taskEarnings || 0;

        transaction.update(userRef, {
          gamingEarnings: newGamingEarnings,
          taskEarnings: newTaskEarnings,
          history: arrayUnion({
            task: `Spin to Win (Stake KSh ${selectedStake}, ${userData.username || 'User'})`,
            reward: -selectedStake,
            date: new Date().toLocaleString(),
          }),
        });
      });
      const newPrizeNumber = Math.floor(Math.random() * data.length);
      setPrizeNumber(newPrizeNumber);
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

    if (user) {
      const userRef = doc(db, 'users', user.uid);
      try {
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
        if (spinCount + 1 === 3 && !isBettingAccountActive) {
          setShowActivationModal(true);
        }
      } catch (err) {
        console.error('Spin to Win error:', err);
        alert('Failed to save reward. Please try again.');
      }
    }
  };

  const handleWithdrawal = async () => {
    navigate('/earnings');
  };

  const handleDeposit = () => {
    console.log('Navigating to /deposit from /tasks');
    navigate('/deposit', { replace: true, state: { from: '/tasks' } });
  };

  const handleActivation = async () => {
    if (!user) {
      setActivationError('Please sign in to activate.');
      return;
    }
    if (!phone) {
      setActivationError('Please enter a phone number.');
      return;
    }
    if (!validatePhoneNumber(phone)) {
      setActivationError('Please enter a valid Kenyan phone number (e.g., +2547XXXXXXXX or 07XXXXXXXX).');
      return;
    }

    setActivationLoading(true);
    const normalizedPhone = normalizePhoneNumber(phone);
    const newClientReference = generateReference();
    setClientReference(newClientReference);

    try {
      console.log(`Sending STK Push - Phone: ${normalizedPhone}, Amount: 150, Client Reference: ${newClientReference}`);
      const response = await axios.post(
        `${apiUrl}/api/stk-push`,
        {
          phoneNumber: normalizedPhone,
          amount: 150,
          reference: newClientReference,
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 15000,
        }
      );

      if (response.data.success) {
        setTransactionId(response.data.payheroReference || newClientReference);
        setPayheroReference(response.data.payheroReference || newClientReference);
        console.log(`STK Push response - PayHero Reference: ${response.data.payheroReference}`);
      } else {
        throw new Error(response.data.error || 'STK Push initiation failed');
      }
    } catch (err) {
      console.error('Activation payment error:', err.message);
      setActivationError(err.response?.data?.error || 'Failed to initiate payment. Please try again.');
      setActivationLoading(false);
    }
  };

  // Poll transaction status
  useEffect(() => {
    if (!activationLoading || !payheroReference) return;

    const startTime = Date.now();
    const maxPollingDuration = 300000; // 5 minutes

    const pollStatus = async () => {
      if (Date.now() - startTime > maxPollingDuration) {
        setActivationError('Payment timed out. Please try again.');
        setActivationLoading(false);
        return;
      }

      const statusData = await checkTransactionStatus(payheroReference);
      if (statusData.success) {
        if (statusData.status === 'SUCCESS') {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            isBettingAccountActive: true,
            phone: normalizePhoneNumber(phone),
            history: arrayUnion({
              task: `Account Activation (${normalizePhoneNumber(phone)})`,
              reward: -150,
              date: new Date().toLocaleString(),
              transactionId: transactionId,
            }),
          });
          setIsBettingAccountActive(true);
          setShowActivationModal(false);
          setShowSuccessModal(true);
          setActivationLoading(false);
          console.log('Activation payment successful, Firestore updated');
        } else if (statusData.status === 'FAILED' || statusData.status === 'CANCELLED') {
          setActivationError(`Payment ${statusData.status.toLowerCase()}. Please try again.`);
          setActivationLoading(false);
        } else if (statusData.status === 'QUEUED') {
          setActivationError('Transaction is being processed. Please wait...');
        }
      } else {
        setActivationError(statusData.error);
      }
    };

    const pollInterval = setInterval(pollStatus, 5000);
    return () => clearInterval(pollInterval);
  }, [activationLoading, payheroReference, user, phone, transactionId]);

  const players = usePlayerData();

  return (
    <div className="min-h-screen bg-secondary font-roboto flex items-start justify-center px-4 pt-4 pb-20">
      <div className="w-full max-w-md">
        <h5 className="text-left font-bold text-primary font-roboto mb-4">
          Welcome, {localUserData?.username || userData?.username || 'User'}! Spin to Win!
        </h5>
        <div className="bg-primary text-white p-4 rounded-lg shadow-inner space-y-2">
          {balanceLoading || authLoading ? (
            <p className="text-lg font-roboto text-center">Loading balance...</p>
          ) : (
            <>
              <div className="flex items-center">
                <img
                  src={surveyImage}
                  alt="Spin to Win"
                  className="w-20 h-20 object-cover rounded-md mr-4"
                />
                <div className="flex flex-col flex-grow">
                  <p className="text-lg font-roboto">
                    Spin to Win for a chance to earn up to KSh 500!
                  </p>
                </div>
              </div>
              <p className="text-lg font-roboto">
                Gaming & Rewards: KSh {localUserData?.gamingEarnings ? localUserData.gamingEarnings.toFixed(2) : '0.00'}
              </p>
              <p className="text-lg font-roboto">
                Tasks Earnings: KSh {localUserData?.taskEarnings ? localUserData.taskEarnings.toFixed(2) : '0.00'}
              </p>
              <p className="text-lg font-bold font-roboto">
                Total: KSh {((localUserData?.gamingEarnings || 0) + (localUserData?.taskEarnings || 0)).toFixed(2)}
              </p>
              {withdrawalError && (
                <p className="text-red-500 text-sm">{withdrawalError}</p>
              )}
              <div className="flex justify-between gap-4 mt-4">
                <button
                  onClick={handleWithdrawal}
                  disabled={withdrawalLoading || !user || ((localUserData?.gamingEarnings || 0) + (localUserData?.taskEarnings || 0)) < 10}
                  className={`flex-1 bg-white text-primary px-4 py-2 rounded-lg font-roboto transition duration-300 flex items-center justify-center ${
                    withdrawalLoading || !user || ((localUserData?.gamingEarnings || 0) + (localUserData?.taskEarnings || 0)) < 10
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-accent hover:text-white'
                  }`}
                >
                  <CurrencyDollarIcon className="w-5 h-5 mr-2" />
                  {withdrawalLoading ? 'Processing...' : 'Withdraw to M-Pesa'}
                </button>
                <button
                  onClick={handleDeposit}
                  className="flex-1 bg-white text-primary px-4 py-2 rounded-lg font-roboto transition duration-300 flex items-center justify-center hover:bg-accent hover:text-white"
                >
                  <CurrencyDollarIcon className="w-5 h-5 mr-2" />
                  Deposit
                </button>
              </div>
            </>
          )}
        </div>
        <div className="mt-6 relative z-0">
          <Wheel
            mustStartSpinning={mustSpin}
            prizeNumber={prizeNumber}
            data={data}
            onStopSpinning={onStopSpinning}
            backgroundColors={['#03A6A1', '#FFE3BB', '#FFA673', '#FF4F0F']}
            textColors={['white', '#FF4F0F']}
            outerBorderColor="#03A6A1"
            outerBorderWidth={5}
            radiusLineColor="#03A6A1"
            radiusLineWidth={2}
            fontFamily="Roboto"
            fontSize={16}
            perpendicularText={true}
            spinDuration={0.6}
          />
        </div>
        {reward !== null && (
          <p className="text-xl text-highlight font-roboto mt-4">
            {reward === 0 ? 'No win this time!' : `You won KSh ${reward.toFixed(2)}!`}
          </p>
        )}
        {stakeError && (
          <p className="text-red-500 text-sm mt-2">{stakeError}</p>
        )}
        <div className="bg-primary text-white p-4 rounded-lg shadow-inner space-y-2 mt-4">
          <p className="text-lg font-bold font-roboto">Choose Stake</p>
          <p className="text-sm font-roboto">Stake will be deducted from total balance</p>
          <div className="flex flex-wrap justify-center gap-2">
            {stakes.map((stake) => (
              <button
                key={stake}
                onClick={() => handleStakeSelect(stake)}
                className={`flex-1 px-3 py-2 rounded-lg font-roboto transition duration-300 min-w-[60px] ${
                  selectedStake === stake 
                    ? 'bg-highlight text-white font-bold shadow-md' 
                    : 'bg-white text-primary hover:bg-accent hover:text-white'
                }`}
              >
                KSh {stake}
              </button>
            ))}
            <input
              type="number"
              min="20"
              step="0.01"
              placeholder="Custom Stake"
              onChange={handleStakeInput}
              className="flex-1 bg-white text-primary px-3 py-2 rounded-lg font-roboto transition duration-300 min-w-[60px] focus:outline-none focus:ring-2 focus:ring-highlight"
            />
          </div>
          <button
            onClick={handleSpinClick}
            disabled={mustSpin || !user || ((localUserData?.gamingEarnings || 0) + (localUserData?.taskEarnings || 0)) < selectedStake || selectedStake < 20 || (spinCount >= 3 && !isBettingAccountActive)}
            className={`mt-4 bg-highlight text-white px-6 py-3 rounded-full font-roboto hover:bg-accent transition duration-300 w-full ${
              mustSpin || !user || ((localUserData?.gamingEarnings || 0) + (localUserData?.taskEarnings || 0)) < selectedStake || selectedStake < 20 || (spinCount >= 3 && !isBettingAccountActive)
                ? 'opacity-50 cursor-not-allowed'
                : ''
            }`}
          >
            {mustSpin ? 'Spinning...' : `Spin for KSh ${selectedStake.toFixed(2)}`}
          </button>
        </div>
        <div className="bg-primary text-white p-4 rounded-lg shadow-inner space-y-2 mt-4">
          <p className="text-lg font-bold font-roboto">Players</p>
          <div className="max-h-60 overflow-y-auto">
            <div className="grid grid-cols-4 gap-2 text-sm font-roboto font-bold text-primary bg-gray-100 p-2 rounded-t-lg">
              <span>User ID</span>
              <span>Result</span>
              <span>Stake</span>
              <span>Cashout</span>
            </div>
            {players.map((player, index) => (
              <div
                key={index}
                className="grid grid-cols-4 gap-2 text-sm font-roboto bg-white text-primary p-2 hover:bg-gray-100 transition duration-300"
              >
                <span>{player.userId}</span>
                <span className={player.result === 'Won' ? 'text-green-500' : 'text-red-500'}>
                  {player.result}
                </span>
                <span>KSh {player.stake.toFixed(2)}</span>
                <span>KSh {player.cashout.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Activation Modal */}
        {showActivationModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => {
              setShowActivationModal(false);
              setPhone(localUserData?.phone ? `0${localUserData.phone.slice(3)}` : '');
              setActivationError('');
              setPhoneError('');
              setClientReference('');
              setPayheroReference('');
            }}
          >
            <div
              className="bg-white rounded-lg p-6 w-full max-w-md mx-4 text-center shadow-lg animate-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <ExclamationTriangleIcon className="h-12 w-12 text-highlight mx-auto mb-4" />
              <h2 className="text-lg font-bold text-primary font-roboto mb-4">
                Activate Your Betting Account
              </h2>
              <p className="text-primary font-roboto mb-4">
                You've completed your 3 free spins! Activate your betting account for only KSh 150 to continue spinning and enable instant withdrawals.
              </p>
              {activationError && (
                <p className="text-red-500 text-sm mb-4">{activationError}</p>
              )}
              {phoneError && (
                <p className="text-red-500 text-sm mb-4">{phoneError}</p>
              )}
              <div className="mb-4">
                <label className="block text-sm font-roboto mb-1 text-primary">M-Pesa Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={handlePhoneInput}
                  placeholder="e.g., +2547XXXXXXXX or 07XXXXXXXX"
                  disabled={activationLoading}
                  className={`w-full bg-white text-primary px-3 py-2 rounded-lg font-roboto transition duration-300 focus:outline-none focus:ring-2 focus:ring-highlight ${
                    activationLoading ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                />
              </div>
              <div className="flex justify-center gap-4">
                <button
                  onClick={handleActivation}
                  disabled={activationLoading || !user || phoneError || !phone}
                  className={`bg-highlight text-white px-4 py-2 rounded-lg font-roboto transition duration-300 flex items-center justify-center ${
                    activationLoading || !user || phoneError || !phone
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-accent'
                  }`}
                >
                  {activationLoading ? 'Processing...' : 'Activate Now (KSh 150)'}
                </button>
                <button
                  onClick={() => {
                    setShowActivationModal(false);
                    setPhone(localUserData?.phone ? `0${localUserData.phone.slice(3)}` : '');
                    setActivationError('');
                    setPhoneError('');
                    setClientReference('');
                    setPayheroReference('');
                  }}
                  disabled={activationLoading}
                  className={`bg-gray-200 text-primary px-4 py-2 rounded-lg font-roboto transition duration-300 ${
                    activationLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-300'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Success Modal */}
        {showSuccessModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowSuccessModal(false)}
          >
            <div
              className="bg-white rounded-lg p-6 w-full max-w-md mx-4 text-center shadow-lg animate-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <CheckCircleIcon className="h-12 w-12 text-highlight mx-auto mb-4" />
              <h2 className="text-lg font-bold text-primary font-roboto mb-4">
                Betting Account Activated!
              </h2>
              <p className="text-primary font-roboto mb-4">
                Payment of KSh 150.00 via {normalizePhoneNumber(phone)} (Transaction ID: {transactionId}) completed successfully! You can now spin and withdraw instantly.
              </p>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="bg-highlight text-white px-4 py-2 rounded-lg font-roboto transition duration-300 hover:bg-accent"
              >
                Continue
              </button>
            </div>
          </div>
        )}
      </div>
      <style jsx>{`
        .animate-fade-in {
          animation: fadeIn 0.3s ease-in;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Tasks;