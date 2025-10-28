import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { doc, updateDoc, arrayUnion, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { ArrowUpIcon, ArrowDownIcon, WalletIcon, CurrencyDollarIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale, Title, Tooltip, Legend } from 'chart.js';
import ActivateSurveyAccount from '../components/ActivateSurveyAccount';
import { getUserData } from '../services/auth';

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Title, Tooltip, Legend);

const Earnings = () => {
  const { user, userData, loading: authLoading } = useContext(AuthContext);
  const [localUserData, setLocalUserData] = useState(userData);
  const [localHistory, setLocalHistory] = useState([]);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawErrorModal, setShowWithdrawErrorModal] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [requestedWithdrawAmount, setRequestedWithdrawAmount] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [phone, setPhone] = useState(userData?.phone || '');
  const [error, setError] = useState('');
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [isActivateModalOpen, setIsActivateModalOpen] = useState(false);

  const totalBalance = (localUserData?.taskEarnings || 0) + (localUserData?.gamingEarnings || 0);

  // Sync localUserData with userData when it changes
  useEffect(() => {
    setLocalUserData(userData);
    setPhone(userData?.phone || '');
    if (!authLoading && userData) {
      setBalanceLoading(false);
      setChartLoading(false);
    }
  }, [userData, authLoading]);

  // Fetch user data and set up real-time listener
  useEffect(() => {
    if (!user || authLoading) {
      setBalanceLoading(false);
      setChartLoading(false);
      setLocalUserData(null);
      setLocalHistory([]);
      setPhone('');
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    // Initial fetch
    const fetchUserData = async () => {
      try {
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setLocalUserData(data);
          setLocalHistory(data.history || []);
          setPhone(data.phone || '');
          console.log('Earnings fetched user data:', { 
            gamingEarnings: data.gamingEarnings, 
            taskEarnings: data.taskEarnings, 
            history: data.history 
          });
          setBalanceLoading(false);
          setChartLoading(false);
        }
      } catch (err) {
        console.error('Earnings fetch user data error:', err);
        setBalanceLoading(false);
        setChartLoading(false);
      }
    };

    // Real-time listener
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setLocalUserData(data);
        setLocalHistory(data.history || []);
        setPhone(data.phone || '');
        console.log('Earnings onSnapshot user data:', { 
          gamingEarnings: data.gamingEarnings, 
          taskEarnings: data.taskEarnings, 
          history: data.history 
        });
        setBalanceLoading(false);
        setChartLoading(false);
      }
    }, (err) => {
      console.error('Earnings onSnapshot error:', err);
      setBalanceLoading(false);
      setChartLoading(false);
    });

    fetchUserData(); // Initial fetch
    return () => unsubscribe(); // Cleanup listener
  }, [user, authLoading]);

  // Process history for chart (last 7 days)
  const getChartData = () => {
    const days = 7;
    const today = new Date();
    const dates = Array.from({ length: days }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      return date.toISOString().split('T')[0]; // YYYY-MM-DD
    }).reverse();

    const earningsByDay = dates.reduce((acc, date) => ({ ...acc, [date]: 0 }), {});
    localHistory.forEach(({ reward, date }) => {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate)) {
        console.warn(`Invalid date in history: ${date}`);
        return;
      }
      const day = parsedDate.toISOString().split('T')[0];
      if (dates.includes(day)) {
        earningsByDay[day] = (earningsByDay[day] || 0) + reward;
      }
    });

    return {
      labels: dates.map(date => {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }),
      datasets: [{
        label: 'Daily Earnings (KSh)',
        data: dates.map(date => earningsByDay[date] || 0),
        borderColor: '#03A6A1',
        backgroundColor: 'rgba(3, 166, 161, 0.2)',
        pointBackgroundColor: '#FF4F0F',
        pointBorderColor: '#FF4F0F',
        fill: true,
        tension: 0.4,
      }],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: 'white',
          font: { family: 'Roboto', size: 14 },
        },
      },
      title: {
        display: true,
        text: 'Earnings Over Last 7 Days',
        color: 'white',
        font: { family: 'Roboto', size: 16, weight: 'bold' },
      },
      tooltip: {
        callbacks: {
          label: (context) => `KSh ${context.parsed.y.toFixed(2)}`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: 'white', font: { family: 'Roboto' } },
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
      },
      y: {
        ticks: {
          color: 'white',
          font: { family: 'Roboto' },
          callback: (value) => `KSh ${value.toFixed(2)}`,
        },
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
      },
    },
  };

  const validatePhone = (phone) => {
    // Remove spaces and non-digit characters except +
    const cleaned = phone.replace(/[^0-9+]/g, '');
    // Check formats: +254XXXXXXXXX, 07XXXXXXXX, 01XXXXXXXX
    return (
      /^\+254\d{9}$/.test(cleaned) || // +254712345678
      /^0[7|1]\d{8}$/.test(cleaned)  // 0712345678 or 0112345678
    );
  };

  const normalizePhone = (phone) => {
    const cleaned = phone.replace(/[^0-9+]/g, '');
    if (/^0[7|1]\d{8}$/.test(cleaned)) {
      return `+254${cleaned.slice(1)}`; // Convert 0712345678 or 0112345678 to +254712345678
    }
    return cleaned; // Already in +254 format
  };

  const handleWithdraw = async () => {
    if (!user) {
      setError('Please sign in to withdraw.');
      return;
    }
    try {
      const { data } = await getUserData(user.uid);
      if (!data.isSurveyAccountActivated) {
        setIsActivateModalOpen(true);
        console.log('Earnings opening activate survey modal');
        return;
      }
    } catch (err) {
      console.error('Earnings fetch user data error:', err);
      setError('Failed to verify survey account status. Please try again.');
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (amount > totalBalance) {
      setError('Amount exceeds total balance.');
      return;
    }
    if (!validatePhone(phone)) {
      setError('Please enter a valid phone number (+254, 07, or 01 format).');
      return;
    }

    const normalizedPhone = normalizePhone(phone);
    setWithdrawLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      // Update phone number in Firestore
      await updateDoc(userRef, { phone: normalizedPhone });
      // Simulate 5-second processing
      await new Promise(resolve => setTimeout(resolve, 5000));
      // Store the requested amount for the modal
      setRequestedWithdrawAmount(amount.toFixed(2));
      // Update history
      await updateDoc(userRef, {
        history: arrayUnion({
          task: 'Withdrawal Attempt',
          reward: 0,
          date: new Date().toLocaleString(),
        }),
      });
      setShowWithdrawModal(false);
      setShowWithdrawErrorModal(true);
    } catch (err) {
      console.error('Withdraw error:', err);
      setError('Failed to process withdrawal.');
    } finally {
      setWithdrawLoading(false);
      setWithdrawAmount('');
      setPhone(normalizedPhone); // Update UI with normalized phone
      setError('');
    }
  };

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (!user) {
      setError('Please sign in to deposit.');
      return;
    }
    if (!amount || amount <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (!validatePhone(phone)) {
      setError('Please enter a valid phone number (+254, 07, or 01 format).');
      return;
    }

    const normalizedPhone = normalizePhone(phone);
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      const currentData = userSnap.exists() ? userSnap.data() : {};
      await updateDoc(userRef, {
        taskEarnings: (currentData.taskEarnings || 0) + amount,
        phone: normalizedPhone, // Update phone number in Firestore
        history: arrayUnion({
          task: `Deposit from M-Pesa (${normalizedPhone})`,
          reward: amount,
          date: new Date().toLocaleString(),
        }),
      });
      setShowDepositModal(false);
      setDepositAmount('');
      setPhone(normalizedPhone); // Update UI with normalized phone
      setError('');
      alert(`Deposit of KSh ${amount.toFixed(2)} from ${normalizedPhone} initiated successfully!`);
    } catch (err) {
      console.error('Deposit error:', err);
      setError('Failed to process deposit.');
    }
  };

  return (
    <div className="min-h-screen bg-secondary font-roboto flex items-start justify-center px-4 pt-4 pb-20">
      <div className="w-full max-w-md">
        <h2 className="text-left font-bold text-primary font-roboto mb-4">Earnings</h2>
        <div className="space-y-4">
          {/* Total Balance Card */}
          <div className="bg-primary text-white p-6 rounded-lg shadow-inner">
            <div className="flex items-center space-x-2 mb-4">
              <WalletIcon className="w-6 h-6 text-white" />
              <h3 className="text-lg font-bold font-roboto">Your Wallet</h3>
            </div>
            {balanceLoading || authLoading ? (
              <p className="text-lg font-roboto text-center">Loading balance...</p>
            ) : (
              <>
                <p className="text-lg font-bold font-roboto">
                  Total Balance: KSh {totalBalance.toFixed(2)}
                </p>
                <p className="text-sm font-roboto">
                  Available Balance: KSh {totalBalance.toFixed(2)}
                </p>
              </>
            )}
          </div>
          {/* Withdraw and Deposit Buttons */}
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => setShowWithdrawModal(true)}
              className="flex-1 bg-white text-primary px-4 py-4 rounded-lg font-roboto transition duration-300 hover:bg-accent hover:text-white flex items-center justify-center shadow-md hover:shadow-lg"
              disabled={totalBalance <= 0 || balanceLoading || authLoading}
            >
              <CurrencyDollarIcon className="w-5 h-5 mr-2" />
              Withdraw to M-Pesa
            </button>
          </div>
          {/* Earnings Chart */}
          <div className="bg-primary text-white p-6 rounded-lg shadow-inner">
            {chartLoading ? (
              <p className="text-sm font-roboto text-center">Loading chart...</p>
            ) : (
              <div style={{ height: '200px' }}>
                <Line data={getChartData()} options={chartOptions} />
              </div>
            )}
          </div>
          {/* Earnings History Card */}
          <div className="bg-primary text-white p-6 rounded-lg shadow-inner">
            <h3 className="text-lg font-bold font-roboto mb-4">Earnings History</h3>
            {chartLoading ? (
              <p className="text-sm font-roboto text-center">Loading history...</p>
            ) : localHistory.length === 0 ? (
              <p className="text-sm font-roboto">No earnings yet.</p>
            ) : (
              <div className="max-h-60 overflow-y-auto">
                <ul className="space-y-2 flex flex-col-reverse">
                  {localHistory.map((entry, index) => (
                    <li
                      key={index}
                      className="bg-gray-100 text-primary p-2 rounded font-roboto text-sm"
                    >
                      {entry.task}: KSh {entry.reward.toFixed(2)} ({entry.date})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        {/* Withdraw Confirmation Modal */}
        {showWithdrawModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => {
              setShowWithdrawModal(false);
              setWithdrawAmount('');
              setPhone(localUserData?.phone || '');
              setError('');
            }}
          >
            <div
              className="bg-white rounded-lg p-6 w-full max-w-md mx-4 text-center shadow-lg animate-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-primary font-roboto mb-4">Confirm Withdrawal</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-roboto text-primary mb-1">Amount (KSh)</label>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full p-2 rounded-lg border border-gray-300 font-roboto text-primary focus:outline-none focus:ring-2 focus:ring-highlight"
                  />
                </div>
                <div>
                  <label className="block text-sm font-roboto text-primary mb-1">M-Pesa Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+254XXXXXXXXX or 0XXXXXXXXX"
                    className="w-full p-2 rounded-lg border border-gray-300 font-roboto text-primary focus:outline-none focus:ring-2 focus:ring-highlight"
                  />
                </div>
                {error && <p className="text-red-500 text-sm font-roboto">{error}</p>}
                {withdrawLoading ? (
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-highlight"></div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={handleWithdraw}
                      className="flex-1 bg-highlight text-white px-4 py-2 rounded-lg font-roboto transition duration-300 hover:bg-accent"
                      disabled={balanceLoading || authLoading || withdrawLoading}
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => {
                        setShowWithdrawModal(false);
                        setWithdrawAmount('');
                        setPhone(localUserData?.phone || '');
                        setError('');
                      }}
                      className="flex-1 bg-gray-200 text-primary px-4 py-2 rounded-lg font-roboto transition duration-300 hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {/* Withdraw Pending Modal */}
        {showWithdrawErrorModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => {
              setShowWithdrawErrorModal(false);
              setRequestedWithdrawAmount('');
            }}
          >
            <div
              className="bg-white rounded-lg p-6 w-full max-w-md mx-4 text-center shadow-lg animate-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <CheckCircleIcon className="h-12 w-12 text-highlight mx-auto mb-4" />
              <h3 className="text-lg font-bold text-primary font-roboto mb-4">Pending Withdrawal</h3>
              <p className="text-primary font-roboto mb-4">
                We have received your withdrawal request of KES {requestedWithdrawAmount}. Your request is being processed.
              </p>
              <button
                onClick={() => {
                  setShowWithdrawErrorModal(false);
                  setRequestedWithdrawAmount('');
                }}
                className="bg-highlight text-white px-4 py-2 rounded-lg font-roboto transition duration-300 hover:bg-accent"
              >
                Close
              </button>
            </div>
          </div>
        )}
        {/* Deposit Modal */}
        {showDepositModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => {
              setShowDepositModal(false);
              setDepositAmount('');
              setPhone(localUserData?.phone || '');
              setError('');
            }}
          >
            <div
              className="bg-white rounded-lg p-6 w-full max-w-md mx-4 text-center shadow-lg animate-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-primary font-roboto mb-4">Deposit Funds</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-roboto text-primary mb-1">Amount (KSh)</label>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full p-2 rounded-lg border border-gray-300 font-roboto text-primary focus:outline-none focus:ring-2 focus:ring-highlight"
                  />
                </div>
                <div>
                  <label className="block text-sm font-roboto text-primary mb-1">M-Pesa Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+254XXXXXXXXX or 0XXXXXXXXX"
                    className="w-full p-2 rounded-lg border border-gray-300 font-roboto text-primary focus:outline-none focus:ring-2 focus:ring-highlight"
                  />
                </div>
                {error && <p className="text-red-500 text-sm font-roboto">{error}</p>}
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={handleDeposit}
                    className="flex-1 bg-highlight text-white px-4 py-2 rounded-lg font-roboto transition duration-300 hover:bg-accent"
                    disabled={balanceLoading || authLoading}
                  >
                    Confirm Deposit
                  </button>
                  <button
                    onClick={() => {
                      setShowDepositModal(false);
                      setDepositAmount('');
                      setPhone(localUserData?.phone || '');
                      setError('');
                    }}
                    className="flex-1 bg-gray-200 text-primary px-4 py-2 rounded-lg font-roboto transition duration-300 hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Activate Survey Account Modal */}
        <ActivateSurveyAccount
          isOpen={isActivateModalOpen}
          onClose={() => {
            setIsActivateModalOpen(false);
            console.log('Earnings activate survey modal closed');
          }}
        />
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

export default Earnings;