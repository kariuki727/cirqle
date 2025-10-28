import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../services/firebase';
import { CurrencyDollarIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import axios from 'axios';

const Deposit = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userData } = useContext(AuthContext);

  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState(userData?.phone ? `0${userData.phone.slice(3)}` : '');
  const [amountError, setAmountError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [depositLoading, setDepositLoading] = useState(false);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successAmount, setSuccessAmount] = useState(null);
  const [successPhone, setSuccessPhone] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [clientReference, setClientReference] = useState('');

  const apiUrl = process.env.REACT_APP_API_URL || 'https://cirqle-khaki.vercel.app';

  // --- Helpers ---
  const validatePhone = (phone) => {
    if (!phone) return 'Phone number is required';
    const cleaned = phone.replace(/[^0-9+]/g, '');
    if (!/^(254[17]\d{8})$|^0[7|1]\d{8}$|^\+254[17]\d{8}$/.test(cleaned)) {
      return 'Invalid phone number format. Use 07XXXXXXXX, 01XXXXXXXX, 254XXXXXXXXX, or +254XXXXXXXXX';
    }
    return '';
  };

  const normalizePhone = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/[^0-9+]/g, '');
    if (/^0[7|1]\d{8}$/.test(cleaned)) return `254${cleaned.slice(1)}`;
    if (/^\+254[17]\d{8}$/.test(cleaned)) return cleaned.slice(1);
    return cleaned;
  };

  const generateReference = () => `DEP-${user?.uid || 'GUEST'}-${Date.now()}`;

  const checkTransactionStatus = async (ref) => {
    try {
      const response = await axios.get(`${apiUrl}/api/transaction-status`, {
        params: { reference: ref },
        timeout: 20000,
      });
      return response.data;
    } catch (err) {
      let errorMessage = 'Failed to check transaction status. Retrying...';
      if (err.response?.status === 404) errorMessage = 'Transaction is being processed. Please wait...';
      if (err.response?.status === 400) errorMessage = 'Invalid transaction reference. Please try again.';
      return { success: false, error: errorMessage };
    }
  };

  // --- Deposit ---
  const handleDeposit = async () => {
    if (!user) return setAmountError('Please sign in to deposit.');

    let hasError = false;
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount < 100) {
      setAmountError('Deposit amount must be at least KSh 100.');
      hasError = true;
    } else setAmountError('');

    const phoneValidationError = validatePhone(phone);
    if (phoneValidationError) {
      setPhoneError(phoneValidationError);
      hasError = true;
    } else setPhoneError('');

    if (hasError) return;

    const normalizedPhone = normalizePhone(phone);
    const newClientReference = generateReference();

    setClientReference(newClientReference);
    setTransactionId(newClientReference);
    setDepositLoading(true);

    try {
      const response = await axios.post(
        `${apiUrl}/api/stk-push`,
        { phoneNumber: normalizedPhone, amount: numAmount, reference: newClientReference },
        { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
      );

      if (!response.data.success) throw new Error(response.data.error || 'STK Push initiation failed');
    } catch (err) {
      setAmountError(err.response?.data?.error || 'Failed to initiate deposit. Please try again.');
      setDepositLoading(false);
    }
  };

  // --- Poll STK Status ---
  useEffect(() => {
    if (!depositLoading || !clientReference) return;

    const startTime = Date.now();
    const maxPollingDuration = 300000; // 5 min

    const pollStatus = async () => {
      if (Date.now() - startTime > maxPollingDuration) {
        setAmountError('Payment timed out. Please try again.');
        setDepositLoading(false);
        return;
      }

      const statusData = await checkTransactionStatus(clientReference);
      if (!statusData) return;

      if (statusData.success) {
        if (statusData.status === 'SUCCESS') {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            gamingEarnings: (userData?.gamingEarnings || 0) + parseFloat(amount || 0),
            phone: normalizePhone(phone),
            history: arrayUnion({
              task: `M-Pesa Deposit (${normalizePhone(phone)})`,
              reward: parseFloat(amount || 0),
              date: new Date().toLocaleString(),
              transactionId,
            }),
          });

          setSuccessAmount(parseFloat(amount || 0));
          setSuccessPhone(normalizePhone(phone));
          setShowSuccessModal(true);
          setDepositLoading(false);
        } else if (['FAILED', 'CANCELLED'].includes(statusData.status)) {
          setAmountError(`Deposit ${statusData.status.toLowerCase()}. Please try again.`);
          setDepositLoading(false);
        }
      } else {
        setAmountError(statusData.error || 'Failed to get transaction status.');
      }
    };

    const interval = setInterval(pollStatus, 5000);
    return () => clearInterval(interval);
  }, [depositLoading, clientReference, user, userData, amount, phone, transactionId]);

  // --- Navigation ---
  const handleCancel = () => {
    const from = location.state?.from || '/tasks';
    navigate(from, { replace: true });
  };

  const isFormValid = () => {
    const numAmount = parseFloat(amount);
    return user && numAmount >= 100 && validatePhone(phone) === '';
  };

  return (
    <div className="min-h-screen bg-secondary font-roboto flex items-start justify-center px-4 pt-4 pb-20">
      <div className="w-full max-w-md">
        <h5 className="text-left font-bold text-primary mb-4">
          Deposit to Your Account, {userData?.username || 'User'}!
        </h5>

        <div className="bg-primary text-white p-4 rounded-lg shadow-inner space-y-4">
          <p className="text-lg">Enter the amount to deposit via M-Pesa</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Amount (KSh)</label>
              <input
                type="number"
                min="100"
                step="0.01"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setAmountError('');
                }}
                className="w-full bg-white text-primary px-3 py-2 rounded-lg transition duration-300 focus:outline-none focus:ring-2 focus:ring-highlight"
              />
              {amountError && <p className="text-red-500 text-sm mt-1">{amountError}</p>}
            </div>

            <div>
              <label className="block text-sm mb-1">M-Pesa Phone Number</label>
              <input
                type="tel"
                placeholder="07XXXXXXXX, 01XXXXXXXX, 254XXXXXXXXX, or +254XXXXXXXXX"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setPhoneError('');
                }}
                className="w-full bg-white text-primary px-3 py-2 rounded-lg transition duration-300 focus:outline-none focus:ring-2 focus:ring-highlight"
              />
              {phoneError && <p className="text-red-500 text-sm mt-1">{phoneError}</p>}
            </div>
          </div>

          <div className="flex justify-between gap-4 mt-4">
            <button
              onClick={handleDeposit}
              disabled={depositLoading || !isFormValid()}
              className={`flex-1 text-white px-6 py-3 rounded-full transition duration-300 flex items-center justify-center shadow-md hover:shadow-lg ${
                depositLoading || !isFormValid() ? 'bg-highlight opacity-50 cursor-not-allowed' : 'bg-highlight-bright hover:bg-accent'
              }`}
            >
              <CurrencyDollarIcon className="w-5 h-5 mr-2" />
              {depositLoading ? 'Processing...' : 'Deposit'}
            </button>

            <button
              onClick={handleCancel}
              className="flex-1 bg-gray-400 text-white px-4 py-2 rounded-lg transition duration-300 flex items-center justify-center hover:bg-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* --- Success Modal --- */}
        {showSuccessModal && successAmount != null && successPhone && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => {
              setShowSuccessModal(false);
              navigate('/tasks', { replace: true });
            }}
          >
            <div
              className="bg-white rounded-lg p-6 w-full max-w-md mx-4 text-center shadow-lg animate-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <CheckCircleIcon className="h-12 w-12 text-highlight mx-auto mb-4" />
              <h3 className="text-lg font-bold text-primary mb-4">Deposit Successful</h3>
              <p className="text-primary mb-4">
                Deposit of KSh {successAmount.toFixed(2)} via {successPhone} (Transaction ID: {transactionId}) completed successfully!
              </p>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  navigate('/tasks', { replace: true });
                }}
                className="bg-highlight text-white px-4 py-2 rounded-lg transition duration-300 hover:bg-accent"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .bg-highlight-bright { background-color: #34D1CC; }
        .animate-fade-in { animation: fadeIn 0.3s ease-in; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default Deposit;
