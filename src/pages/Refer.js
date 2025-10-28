import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { doc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { CurrencyDollarIcon, ClipboardIcon, QuestionMarkCircleIcon, InformationCircleIcon, ArrowRightIcon } from '@heroicons/react/24/solid';
import referImage from '../assets/refer.png';

const Refer = ({ completeTask }) => {
  const { user, userData, loading: authLoading } = useContext(AuthContext);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [referrals, setReferrals] = useState([]);
  const [copySuccess, setCopySuccess] = useState('');
  const [copyError, setCopyError] = useState('');
  const [fetchError, setFetchError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showFAQs, setShowFAQs] = useState(false);
  const shareLink = user && user.uid ? `https://earn-to-mpesa-online.vercel.app/signup?ref=${user.uid}` : '';

  useEffect(() => {
    let cancelled = false;

    const checkModal = async () => {
      if (cancelled || !user || !userData || !user.uid) return;
      setLoading(true);
      try {
        if (!userData.hasSeenReferralModal) {
          setShowReferralModal(true);
          await updateDoc(doc(db, 'users', user.uid), { hasSeenReferralModal: true });
        }
      } catch (err) {
        console.error('Update modal status error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const fetchReferrals = async () => {
      if (cancelled || !user || !user.uid) return;
      setLoading(true);
      try {
        const referralsRef = collection(db, `users/${user.uid}/referrals`);
        const snapshot = await getDocs(referralsRef);
        if (!cancelled) {
          setReferrals(snapshot.docs.map(doc => doc.data()));
          setFetchError('');
        }
      } catch (err) {
        console.error('Fetch referrals error:', err);
        if (!cancelled) setFetchError('Failed to load referrals. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (!authLoading) {
      checkModal();
      fetchReferrals();
    }

    return () => { cancelled = true; };
  }, [user, userData, authLoading]);

  const handleCopyLink = async () => {
    if (!shareLink || typeof shareLink !== 'string' || !user || !user.uid) {
      setCopyError('Referral link not available. Please sign in.');
      setTimeout(() => setCopyError(''), 2000);
      return;
    }
    
    try {
      // Modern clipboard API with fallback
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareLink);
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = shareLink;
        textarea.style.position = 'fixed';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      
      setCopySuccess('Link copied!');
      setCopyError('');
      setTimeout(() => setCopySuccess(''), 2000);
      if (completeTask) completeTask('copy_referral_link');
    } catch (err) {
      console.error('Clipboard write error:', err);
      setCopyError('Failed to copy link. Please try again or copy manually.');
      setTimeout(() => setCopyError(''), 2000);
    }
  };

  const handleWhatsAppShare = () => {
    if (!shareLink || !user || !user.uid) return;
    const message = `Join Earn to M-Pesa to earn money through fun tasks, quizzes, and surveys with instant M-Pesa payouts. Upgrade for exclusive rewards! ${shareLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    if (completeTask) completeTask('share_whatsapp');
  };

  const handleSMSShare = () => {
    if (!shareLink || !user || !user.uid) return;
    const message = `Join Earn to M-Pesa and start earning! ${shareLink}`;
    window.open(`sms:?body=${encodeURIComponent(message)}`, '_blank');
    if (completeTask) completeTask('share_sms');
  };

  return (
    <div className="min-h-screen bg-secondary font-roboto flex items-start justify-center px-4 pt-4 pb-20">
      <div className="w-full max-w-md">
        <h2 className="text-left font-bold text-primary font-roboto mb-4">Refer & Earn</h2>
        {authLoading || loading ? (
          <p className="text-primary font-roboto">Loading...</p>
        ) : !user || !user.uid ? (
          <p className="text-red-500 font-roboto">Please sign in to access referral features.</p>
        ) : (
          <>
            <div className="bg-primary text-white p-6 rounded-lg shadow-inner space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col space-y-1">
                  <p className="text-2xl font-bold font-roboto">
                    Refer and earn up to KSh 1000
                  </p>
                  <p className="text-base font-light font-roboto">
                    Refer friends to complete surveys and spin to win
                  </p>
                </div>
                <img
                  src={referImage}
                  alt="Refer & Earn"
                  className="w-28 h-28 object-cover rounded-md"
                />
              </div>
              <div className="space-y-2">
                <p className="text-lg font-bold font-roboto">
                  Invite Friends, Earn Up to KSh 200 Per Referral!
                </p>
                <p className="text-sm font-roboto">Share your referral link:</p>
                <div className="flex items-center bg-gray-100 text-primary p-2 rounded-lg">
                  <p className="text-sm font-roboto truncate flex-1">{shareLink}</p>
                  <button
                    onClick={handleCopyLink}
                    className="ml-2 bg-white text-primary px-2 py-1 rounded-md font-roboto transition duration-300 hover:bg-accent hover:text-white flex items-center"
                    disabled={!shareLink || !user || !user.uid}
                    aria-label="Copy referral link"
                  >
                    <ClipboardIcon className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleCopyLink}
                    className="flex-1 bg-white text-primary px-4 py-2 rounded-lg font-roboto transition duration-300 hover:bg-accent hover:text-white flex items-center justify-center"
                    disabled={!shareLink || !user || !user.uid}
                    aria-label="Copy referral link"
                  >
                    <ClipboardIcon className="w-5 h-5 mr-2" />
                    Copy Link
                  </button>
                  <button
                    onClick={handleWhatsAppShare}
                    className="flex-1 bg-white text-primary px-4 py-2 rounded-lg font-roboto transition duration-300 hover:bg-accent hover:text-white flex items-center justify-center"
                    disabled={!shareLink || !user || !user.uid}
                    aria-label="Share via WhatsApp"
                  >
                    WhatsApp
                  </button>
                  <button
                    onClick={handleSMSShare}
                    className="flex-1 bg-white text-primary px-4 py-2 rounded-lg font-roboto transition duration-300 hover:bg-accent hover:text-white flex items-center justify-center"
                    disabled={!shareLink || !user || !user.uid}
                    aria-label="Share via SMS"
                  >
                    SMS
                  </button>
                </div>
                {copySuccess && (
                  <p className="text-green-500 text-sm font-roboto">{copySuccess}</p>
                )}
                {copyError && (
                  <p className="text-red-500 text-sm font-roboto">{copyError}</p>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-lg font-bold font-roboto">
                  Referral Earnings: KSh {(userData?.taskEarnings || 0).toFixed(2)}
                </p>
                <p className="text-sm font-roboto">
                  Referrals: {userData?.referralsCount || 0}/5
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-highlight h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((userData?.referralsCount || 0) / 5 * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-lg font-bold font-roboto">Your Referrals</p>
                <div className="max-h-60 overflow-y-auto">
                  <div className="grid grid-cols-3 gap-2 text-sm font-roboto font-bold text-primary bg-gray-100 p-2 rounded-t-lg">
                    <span>Referee</span>
                    <span>Status</span>
                    <span>Reward</span>
                  </div>
                  {loading ? (
                    <p className="text-sm font-roboto text-primary p-2">Loading referrals...</p>
                  ) : fetchError ? (
                    <p className="text-sm font-roboto text-red-500 p-2">{fetchError}</p>
                  ) : referrals.length > 0 ? (
                    referrals.map((ref, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-3 gap-2 text-sm font-roboto bg-white text-primary p-2 hover:bg-gray-100 transition duration-300"
                      >
                        <span>{ref.refereeId}</span>
                        <span className={ref.status === 'spun' ? 'text-green-500' : 'text-primary'}>
                          {ref.status.replace('_', ' ').toUpperCase()}
                        </span>
                        <span>KSh {ref.status === 'signed_up' ? 50 : ref.status === 'deposited' ? 150 : 200}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm font-roboto text-primary p-2">No referrals yet. Start inviting!</p>
                  )}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 mt-6">
                <button
                  onClick={() => setShowHowItWorks(true)}
                  className="flex items-center justify-between bg-white text-primary px-4 py-2 rounded-lg font-roboto transition duration-300 hover:bg-accent hover:text-white"
                  aria-label="How it Works"
                >
                  <div className="flex items-center">
                    <QuestionMarkCircleIcon className="w-5 h-5 mr-2" />
                    How it Works
                  </div>
                  <ArrowRightIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowFAQs(true)}
                  className="flex items-center justify-between bg-white text-primary px-4 py-2 rounded-lg font-roboto transition duration-300 hover:bg-accent hover:text-white"
                  aria-label="FAQs"
                >
                  <div className="flex items-center">
                    <InformationCircleIcon className="w-5 h-5 mr-2" />
                    FAQs
                  </div>
                  <ArrowRightIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
            {showReferralModal && (
              <div
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                onClick={() => setShowReferralModal(false)}
              >
                <div
                  className="bg-white rounded-lg p-6 w-full max-w-md mx-4 text-center shadow-lg animate-fade-in"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="text-lg font-bold text-primary font-roboto mb-4">Invite Friends, Earn More!</h3>
                  <p className="text-primary font-roboto mb-4">
                    Share your referral link to earn up to KSh 1000! Get KSh 50 per signup, KSh 100 per deposit, and KSh 50 when friends spin 3 times.
                  </p>
                  <button
                    onClick={() => setShowReferralModal(false)}
                    className="bg-highlight text-white px-4 py-2 rounded-lg font-roboto transition duration-300 hover:bg-accent"
                    aria-label="Get Started"
                  >
                    Get Started
                  </button>
                </div>
              </div>
            )}
            {showHowItWorks && (
              <div
                className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50"
                onClick={() => setShowHowItWorks(false)}
              >
                <div
                  className="bg-white rounded-t-lg p-6 w-full max-w-md mx-4 shadow-lg transform transition-transform duration-300 ease-in-out"
                  style={{ transform: showHowItWorks ? 'translateY(0)' : 'translateY(100%)' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="text-lg font-bold text-primary font-roboto mb-4">How it Works</h3>
                  <ul className="text-primary font-roboto space-y-2">
                    <li>
                      <span className="font-bold">1. Share Your Link:</span> Invite friends with your unique referral link.
                    </li>
                    <li>
                      <span className="font-bold">2. Friend Signs Up:</span> Earn KSh 50 when your friend signs up using your link.
                    </li>
                    <li>
                      <span className="font-bold">3. Friend Deposits:</span> Earn KSh 100 when they deposit KSh 150 or more.
                    </li>
                    <li>
                      <span className="font-bold">4. Friend Spins:</span> Earn KSh 50 when they complete 3 spins.
                    </li>
                    <li>
                      <span className="font-bold">5. Cap at 5 Referrals:</span> Earn up to KSh 1000 total (KSh 200 per referral).
                    </li>
                  </ul>
                  <button
                    onClick={() => setShowHowItWorks(false)}
                    className="mt-4 bg-highlight text-white px-4 py-2 rounded-lg font-roboto transition duration-300 hover:bg-accent w-full"
                    aria-label="Close How it Works"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
            {showFAQs && (
              <div
                className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50"
                onClick={() => setShowFAQs(false)}
              >
                <div
                  className="bg-white rounded-t-lg p-6 w-full max-w-md mx-4 shadow-lg transform transition-transform duration-300 ease-in-out"
                  style={{ transform: showFAQs ? 'translateY(0)' : 'translateY(100%)' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="text-lg font-bold text-primary font-roboto mb-4">FAQs</h3>
                  <div className="text-primary font-roboto space-y-4">
                    <div>
                      <p className="font-bold">How do I share my referral link?</p>
                      <p>Use the Copy Link, WhatsApp, or SMS buttons to share your unique link with friends.</p>
                    </div>
                    <div>
                      <p className="font-bold">When do I get paid?</p>
                      <p>Earnings are credited to your taskEarnings after your friend signs up, deposits KSh 150+, or completes 3 spins.</p>
                    </div>
                    <div>
                      <p className="font-bold">What's the referral cap?</p>
                      <p>You can refer up to 5 friends, earning a maximum of KSh 1000 (KSh 200 per referral).</p>
                    </div>
                    <div>
                      <p className="font-bold">Can I withdraw referral earnings?</p>
                      <p>Yes, transfer your earnings to M-Pesa via the Deposit page once your account is active.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowFAQs(false)}
                    className="mt-4 bg-highlight text-white px-4 py-2 rounded-lg font-roboto transition duration-300 hover:bg-accent w-full"
                    aria-label="Close FAQs"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </>
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

export default Refer;