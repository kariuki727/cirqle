import React, { useState, useEffect } from 'react';
import { LockClosedIcon, PencilIcon, CheckIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../services/firebase';
import axios from 'axios';

const UpgradeAccount = ({ isOpen, onClose, tier, user }) => {
  const [showInput, setShowInput] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [error, setError] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successAmount, setSuccessAmount] = useState(0);
  const [successPhone, setSuccessPhone] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [clientReference, setClientReference] = useState('');
  // Removed legacy state: [payheroReference, setPayheroReference]

  const fee = tier === 'standard' ? 150 : 200;
  const message = `one-time fee KSh ${fee}. No additional charges.`;
  const apiUrl = process.env.REACT_APP_API_URL || 'https://earn-to-mpesa-online.vercel.app';

  // Validate Kenyan phone number: +254[0-9]{9}, 07[0-9]{8}, or 01[0-9]{8}
  const validatePhoneNumber = (phone) => {
    // Regex allows 254XXXXXXXXX, +254XXXXXXXXX, 07XXXXXXXX, or 01XXXXXXXX
    const regex = /^(?:\+?254[71]\d{8}|0[71]\d{8})$/;
    return regex.test(phone);
  };

  // Normalize phone number to 254 format
  const normalizePhoneNumber = (phone) => {
    if (!phone) return phone;
    const cleaned = phone.replace(/[^0-9+]/g, '');
    if (/^0[7|1][0-9]{8}$/.test(cleaned)) {
      return `254${cleaned.slice(1)}`;
    }
    if (/^\+254[71]\d{8}$/.test(cleaned)) {
      return cleaned.slice(1);
    }
    return cleaned;
  };

  // Generate client reference (used as M-Pesa AccountReference and polling ID)
  const generateReference = () => {
    return `UPG-${user.uid}-${Date.now()}`;
  };

  // Check transaction status
  const checkTransactionStatus = async (ref) => {
    try {
      // Now logging the correct reference name
      console.log(`Checking transaction status - Client Reference (AccountRef): ${ref}`);
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

  // Fetch user phone number from Firestore
  useEffect(() => {
    const fetchPhoneNumber = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const phone = userDoc.data().phone || '';
            const displayPhone = phone.startsWith('254') ? `0${phone.slice(3)}` : phone;
            setPhoneNumber(displayPhone);
            setIsPhoneValid(validatePhoneNumber(displayPhone));
          } else {
            setError('User data not found.');
            console.error('User doc not found for UID:', user.uid);
          }
        } catch (err) {
          setError('Failed to fetch phone number.');
          console.error('Fetch phone number error:', err);
        }
      }
    };
    if (isOpen) {
      fetchPhoneNumber();
    }
  }, [isOpen, user]);

  // Handle phone number change
  const handlePhoneChange = (e) => {
    const phone = e.target.value.replace(/[^0-9+]/g, '');
    setPhoneNumber(phone);
    setIsPhoneValid(validatePhoneNumber(phone));
    setError('');
    console.log('Phone number updated:', phone, 'Valid:', validatePhoneNumber(phone));
  };

  // Handle Save button click
  const handleSavePhone = async () => {
    if (isPhoneValid) {
      const normalizedPhone = normalizePhoneNumber(phoneNumber);
      try {
        await updateDoc(doc(db, 'users', user.uid), { phone: normalizedPhone });
        setPhoneNumber(phoneNumber); // Keep raw input in UI
        setIsEditing(false);
        setError('');
        console.log('Phone number saved to Firestore:', normalizedPhone);
      } catch (err) {
        setError('Failed to save phone number.');
        console.error('Save phone number error:', err);
      }
    } else {
      setError('Please enter a valid Kenyan phone number (+254123456789, 0712345678, or 0112345678).');
    }
  };

  // Handle Pay button click
  const handlePayment = async () => {
    if (!user) {
      setError('Please sign in to proceed.');
      return;
    }

    if (!showInput) {
      setShowInput(true);
      // Start editing if phone is not already valid
      setIsEditing(!isPhoneValid); 
      console.log('Showing payment input');
      return;
    }
    
    if (!isPhoneValid || isEditing) {
      setError('Please save a valid Kenyan phone number before paying.');
      return;
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const newClientReference = generateReference();
    setClientReference(newClientReference); // Set for polling
    setPaymentLoading(true);
    setError('');

    try {
      console.log(`Sending STK Push - Phone: ${normalizedPhone}, Amount: ${fee}, Client Reference (AccountRef): ${newClientReference}`);
      const response = await axios.post(
        `${apiUrl}/api/stk-push`,
        {
          phoneNumber: normalizedPhone,
          amount: fee,
          reference: newClientReference, // This is M-Pesa's AccountReference
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 15000,
        }
      );

      if (response.data.success) {
        // Use our generated client reference as the transaction ID for display and Firestore history
        setTransactionId(newClientReference); 
        console.log(`STK Push initiated. Client Reference (Polling ID): ${newClientReference}`);
      } else {
        throw new Error(response.data.error || 'STK Push initiation failed');
      }
    } catch (err) {
      console.error('Payment error:', err.message);
      setError(err.response?.data?.error || 'Failed to initiate payment. Please try again.');
      setPaymentLoading(false);
    }
  };

  // Poll transaction status
  useEffect(() => {
    // Polling now correctly depends on clientReference
    if (!paymentLoading || !clientReference) return;

    const startTime = Date.now();
    const maxPollingDuration = 300000; // 5 minutes

    const pollStatus = async () => {
      if (Date.now() - startTime > maxPollingDuration) {
        setError('Payment timed out. Please try again.');
        setPaymentLoading(false);
        return;
      }

      // Use clientReference for checking status
      const statusData = await checkTransactionStatus(clientReference); 

      if (statusData.success) {
        if (statusData.status === 'SUCCESS') {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            plan: tier,
            phone: normalizePhoneNumber(phoneNumber),
            history: arrayUnion({
              task: `Account Upgrade to ${tier.charAt(0).toUpperCase() + tier.slice(1)} (${normalizePhoneNumber(phoneNumber)})`,
              reward: -fee, // Negative as it's a payment
              date: new Date().toLocaleString(),
              transactionId: transactionId,
            }),
          });
          setSuccessAmount(fee);
          setSuccessPhone(normalizePhoneNumber(phoneNumber));
          setShowSuccessModal(true);
          setPaymentLoading(false);
          console.log('Payment successful, Firestore updated with plan:', tier);
        } else if (statusData.status === 'FAILED' || statusData.status === 'CANCELLED') {
          setError(`Payment ${statusData.status.toLowerCase()}. Please try again.`);
          setPaymentLoading(false);
        } else if (statusData.status === 'QUEUED') {
          setError('Transaction is being processed. Please wait...');
        }
      } else {
        setError(statusData.error);
      }
    };

    const pollInterval = setInterval(pollStatus, 5000);
    // Ensure clientReference is in the dependency array
    return () => clearInterval(pollInterval);
  }, [paymentLoading, clientReference, user, phoneNumber, fee, tier, transactionId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 text-center">
        <LockClosedIcon className="h-6 w-6 text-primary mx-auto mb-4" />
        <h2 className="text-lg font-bold text-primary font-roboto mb-4">
          Access denied
        </h2>
        <p className="text-primary font-roboto mb-4">
          Upgrade account to {tier.charAt(0).toUpperCase() + tier.slice(1)} for a {message}
        </p>
        {showInput && (
          <div className="mb-4">
            <label className="block text-primary font-roboto text-sm mb-2" htmlFor="phoneNumber">
              Payment Number
            </label>
            <div className="flex items-center justify-center gap-2">
              <input
                id="phoneNumber"
                type="text"
                value={phoneNumber}
                onChange={handlePhoneChange}
                disabled={!isEditing || paymentLoading}
                className={`w-3/4 px-3 py-2 border rounded font-roboto text-primary ${
                  isPhoneValid ? 'border-primary' : 'border-highlight'
                } ${isEditing && !paymentLoading ? 'bg-white' : 'bg-gray-100'}`}
                placeholder="+254123456789, 0712345678, or 0112345678"
              />
              {isEditing ? (
                <button
                  onClick={handleSavePhone}
                  disabled={paymentLoading}
                  className={`p-2 rounded transition duration-300 ${
                    paymentLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-highlight text-white hover:bg-accent'
                  }`}
                >
                  <CheckIcon className="h-5 w-5" />
                </button>
              ) : (
                <button
                  onClick={() => {
                    setIsEditing(true);
                    console.log('Editing phone number');
                  }}
                  disabled={paymentLoading}
                  className={`p-2 rounded transition duration-300 ${
                    paymentLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary text-white hover:bg-accent'
                  }`}
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
              )}
            </div>
            {error && (
              <p className="text-highlight font-roboto text-sm mt-2">{error}</p>
            )}
          </div>
        )}
        {showSuccessModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => {
              setShowSuccessModal(false);
              onClose();
            }}
          >
            <div
              className="bg-white rounded-lg p-6 w-full max-w-md mx-4 text-center shadow-lg animate-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <CheckCircleIcon className="h-12 w-12 text-highlight mx-auto mb-4" />
              <h3 className="text-lg font-bold text-primary font-roboto mb-4">Upgrade Successful</h3>
              <p className="text-primary font-roboto mb-4">
                Payment of KSh {successAmount.toFixed(2)} via {successPhone} (Transaction ID: {transactionId}) completed successfully!
              </p>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  onClose();
                }}
                className="bg-highlight text-white px-4 py-2 rounded-lg font-roboto transition duration-300 hover:bg-accent"
              >
                Close
              </button>
            </div>
          </div>
        )}
        <div className="flex justify-center gap-4">
          <button
            className={`bg-highlight text-white px-4 py-2 rounded hover:bg-accent font-roboto transition duration-300 ${
              paymentLoading || (showInput && !isPhoneValid) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            onClick={handlePayment}
            disabled={paymentLoading || (showInput && (!isPhoneValid || isEditing))}
          >
            {paymentLoading ? 'Processing...' : showInput && isPhoneValid ? `Pay KSh ${fee} Now` : 'Upgrade Now'}
          </button>
          <button
            className="bg-white border border-primary text-primary px-4 py-2 rounded hover:bg-secondary font-roboto transition duration-300"
            onClick={onClose}
            disabled={paymentLoading}
          >
            Cancel
          </button>
        </div>
      </div>
      <style jsx>{`
        .bg-highlight {
          background-color: #34D1CC;
        }
        .bg-accent {
          background-color: #FF4F0F;
        }
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

export default UpgradeAccount;
