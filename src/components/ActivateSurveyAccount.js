import React, { useState, useContext } from 'react';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { AuthContext } from '../context/AuthContext';
import { db } from '../services/firebase';
import { CurrencyDollarIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import axios from 'axios';

const ActivateSurveyAccount = ({ isOpen, onClose }) => {
  const { user, userData } = useContext(AuthContext);
  const [phone, setPhone] = useState(userData?.phone ? `0${userData.phone.slice(1)}` : '');
  const [phoneError, setPhoneError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [clientReference, setClientReference] = useState('');
  const [payheroReference, setPayheroReference] = useState('');

  const apiUrl = process.env.REACT_APP_API_URL || 'https://earn-to-mpesa-online.vercel.app';

  const validatePhone = (phone) => {
    if (!phone) return 'Phone number is required';
    const cleaned = phone.replace(/[^0-9+]/g, '');
    if (!/^(254[17]\d{8})$|^0[7|1]\d{8}$|^\+254[17]\d{8}$/.test(cleaned)) {
      return 'Invalid phone number format. Use 07XXXXXXXX, 01XXXXXXXX, 254XXXXXXXXX, or +254XXXXXXXXX';
    }
    return '';
  };

  const normalizePhone = (phone) => {
    const cleaned = phone.replace(/[^0-9+]/g, '');
    if (/^0[7|1]\d{8}$/.test(cleaned)) {
      return `254${cleaned.slice(1)}`;
    }
    if (/^\+254[17]\d{8}$/.test(cleaned)) {
      return cleaned.slice(1);
    }
    return cleaned;
  };

  const generateReference = () => {
    return `ACT-${user?.uid || 'GUEST'}-${Date.now()}`;
  };

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

  const handleActivate = async () => {
    if (!user) {
      setError('Please sign in to activate your survey account.');
      return;
    }

    if (userData?.isSurveyAccountActivated) {
      setError('Your survey account is already activated.');
      return;
    }

    const phoneValidationError = validatePhone(phone);
    if (phoneValidationError) {
      setPhoneError(phoneValidationError);
      return;
    }
    setPhoneError('');

    const normalizedPhone = normalizePhone(phone);
    const newClientReference = generateReference();
    setClientReference(newClientReference);
    setLoading(true);
    setError('');

    try {
      console.log(`Sending STK Push - Phone: ${normalizedPhone}, Amount: 100, Client Reference: ${newClientReference}`);
      const response = await axios.post(
        `${apiUrl}/api/stk-push`,
        {
          phoneNumber: normalizedPhone,
          amount: 100,
          reference: newClientReference,
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 15000,
        }
      );

      if (response.data.success) {
        const transactionRef = response.data.payheroReference || newClientReference;
        setTransactionId(transactionRef);
        setPayheroReference(transactionRef);
        console.log(`STK Push response - PayHero Reference: ${transactionRef}`);

        // Start polling for transaction status
        const startTime = Date.now();
        const maxPollingDuration = 300000; // 5 minutes

        const pollStatus = async (ref) => {
          if (Date.now() - startTime > maxPollingDuration) {
            setError('Payment timed out. Please try again.');
            setLoading(false);
            return;
          }

          const statusData = await checkTransactionStatus(ref);
          if (statusData.success && statusData.status === 'SUCCESS') {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
              isSurveyAccountActivated: true,
              phone: normalizedPhone,
              history: arrayUnion({
                task: `Survey Account Activation (M-Pesa ${normalizedPhone})`,
                reward: 100,
                date: new Date().toLocaleString(),
                transactionId: transactionRef,
              }),
              updatedAt: new Date().toISOString(),
            });
            setShowSuccessModal(true);
            setLoading(false);
            onClose(); // Close the activation modal
          } else if (statusData.success && (statusData.status === 'FAILED' || statusData.status === 'CANCELLED')) {
            setError(`Activation payment ${statusData.status.toLowerCase()}. Please try again.`);
            setLoading(false);
          } else {
            setError('Transaction is being processed. Please wait...');
            setTimeout(() => pollStatus(ref), 5000);
          }
        };

        pollStatus(transactionRef);
      } else {
        throw new Error(response.data.error || 'STK Push initiation failed');
      }
    } catch (err) {
      console.error('Activation error:', err.message);
      setError(err.response?.data?.error || 'Failed to initiate activation payment. Please try again.');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 font-roboto">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 text-center shadow-lg">
        <h2 className="text-2xl font-bold text-primary font-roboto mb-4">
          Activate Your Survey Account
        </h2>
        <p className="text-primary font-roboto mb-4">
          Pay a one-time fee of KSh 100 to activate your survey account and start earning up to KSh 3000 daily by completing quizzes and surveys!
        </p>
        <div className="mb-4">
          <label className="block text-sm font-roboto mb-1">M-Pesa Phone Number</label>
          <input
            type="tel"
            placeholder="07XXXXXXXX, 01XXXXXXXX, 254XXXXXXXXX, or +254XXXXXXXXX"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setPhoneError('');
            }}
            className="w-full bg-white text-primary px-3 py-2 rounded-lg font-roboto transition duration-300 focus:outline-none focus:ring-2 focus:ring-highlight"
          />
          {phoneError && (
            <p className="text-red-500 text-sm font-roboto mt-1">{phoneError}</p>
          )}
        </div>
        {error && (
          <p className="text-highlight font-roboto mb-4">{error}</p>
        )}
        <div className="flex justify-center gap-4">
          <button
            onClick={handleActivate}
            disabled={loading || validatePhone(phone) !== '' || !user || userData?.isSurveyAccountActivated}
            className={`bg-highlight text-white px-6 py-3 rounded-full font-roboto transition duration-300 flex items-center justify-center ${
              loading || validatePhone(phone) !== '' || !user || userData?.isSurveyAccountActivated
                ? 'bg-gray-400 cursor-not-allowed'
                : 'hover:bg-accent'
            }`}
            aria-label="Activate survey account with M-Pesa"
          >
            <CurrencyDollarIcon className="w-5 h-5 mr-2" />
            {loading ? 'Processing...' : 'Activate'}
          </button>
          <button
            onClick={onClose}
            className="bg-white border border-primary text-primary px-6 py-3 rounded-full font-roboto transition duration-300 hover:bg-secondary"
            aria-label="Cancel activation"
          >
            Cancel
          </button>
        </div>
      </div>
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
            <h3 className="text-lg font-bold text-primary font-roboto mb-4">Activation Successful</h3>
            <p className="text-primary font-roboto mb-4">
              Your survey account has been activated with a payment of KSh 100 via {normalizePhone(phone)} (Transaction ID: {transactionId}). Start earning now!
            </p>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="bg-highlight text-white px-4 py-2 rounded-lg font-roboto transition duration-300 hover:bg-accent"
              aria-label="Close success modal"
            >
              Close
            </button>
          </div>
        </div>
      )}
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

export default ActivateSurveyAccount;