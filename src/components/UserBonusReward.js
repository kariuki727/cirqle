import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getUserData } from '../services/auth';
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import rewardVideo from '../assets/reward/reward.webm';

const UserBonusReward = () => {
  const { user, userData } = useContext(AuthContext);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Get current time in EAT (UTC+3)
  const getCurrentTimeEAT = () => {
    const date = new Date();
    const options = {
      timeZone: 'Africa/Nairobi',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    };
    return date.toLocaleString('en-US', options) + ' EAT';
  };

  // Check eligibility and show reward modal on first load
  useEffect(() => {
    const checkRewardEligibility = async () => {
      if (user) {
        try {
          const { data } = await getUserData(user.uid);
          console.log('UserBonusReward eligibility check:', {
            hasUserClaimedReward: data.hasUserClaimedReward,
          }); // Debug
          if (!data.hasUserClaimedReward) {
            setIsClaimModalOpen(true);
          } else {
            setErrorMessage('You have already received your bonus reward.');
            setIsErrorModalOpen(true);
          }
        } catch (err) {
          console.error('UserBonusReward eligibility check error:', err);
          setErrorMessage('Failed to check bonus eligibility. Please try again.');
          setIsErrorModalOpen(true);
        }
      } else {
        setErrorMessage('Please sign in to receive your bonus.');
        setIsErrorModalOpen(true);
      }
    };
    checkRewardEligibility();
  }, [user]);

  // Handle reward claim on Collect Reward button click
  const handleCollectReward = async () => {
    if (!user) {
      setErrorMessage('Please sign in to receive your bonus.');
      setIsErrorModalOpen(true);
      setIsClaimModalOpen(false);
      return;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        gamingEarnings: (userData?.gamingEarnings || 0) + 499,
        hasUserClaimedReward: true,
        history: arrayUnion({
          task: 'Received Welcome Bonus from Remote_tec Opinions',
          reward: 499,
          date: new Date().toLocaleString(),
        }),
      });
      console.log('UserBonusReward bonus received successfully');
    } catch (err) {
      console.error('UserBonusReward claim error:', err);
      setErrorMessage('Failed to receive bonus. Please try again.');
      setIsErrorModalOpen(true);
    }
    setIsClaimModalOpen(false);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Reward Modal */}
      {isClaimModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            className="bg-white rounded-lg p-6 w-full max-w-md mx-4 text-center shadow-lg animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <video
              src={rewardVideo}
              autoPlay
              loop
              muted
              className="h-12 w-12 mx-auto mb-4 object-contain"
            ></video>
            <h3 className="text-lg font-bold text-primary font-roboto mb-4">Congratulations {userData.username},You have Received Ksh 499 sign up Bonus. Collect reward and do tasks to earn more.</h3>
            <table className="table-auto w-full bg-gray-100 rounded border border-gray-300 mb-4 text-primary font-roboto text-sm">
              <tbody>
                <tr className="border-b border-gray-300">
                  <td className="px-4 py-2 font-bold text-left">Amount</td>
                  <td className="px-4 py-2 text-left">KSh 499</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="px-4 py-2 font-bold text-left">From</td>
                  <td className="px-4 py-2 text-left">Remote_tec Opinions</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-bold text-left">Time</td>
                  <td className="px-4 py-2 text-left">{getCurrentTimeEAT()}</td>
                </tr>
              </tbody>
            </table>
            <button
              onClick={handleCollectReward}
              className="bg-primary w-full text-white px-4 py-2 rounded-lg font-roboto transition duration-300 hover:bg-accent"
              aria-label="Collect reward"
            >
              Collect Reward
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

export default UserBonusReward;