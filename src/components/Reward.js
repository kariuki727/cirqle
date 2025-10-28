import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wheel } from 'react-custom-roulette';
import { AuthContext } from '../context/AuthContext';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

const Reward = () => {
  const navigate = useNavigate();
  const { user, userData } = useContext(AuthContext);
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);
  const [reward, setReward] = useState(null);
  const [hasCollectedReward, setHasCollectedReward] = useState(null);

  const data = [
    { option: 'KSh 5.00', style: { backgroundColor: '#03A6A1', textColor: 'white' } },
    { option: 'KSh 105', style: { backgroundColor: '#FFE3BB', textColor: '#FF4F0F' } },
    { option: 'KSh 150', style: { backgroundColor: '#FFA673', textColor: 'white' } },
    { option: 'KSh 255', style: { backgroundColor: '#FF4F0F', textColor: 'white' } },
    { option: 'KSh 280', style: { backgroundColor: '#03A6A1', textColor: 'white' } },
    { option: 'KSh 320', style: { backgroundColor: '#FFE3BB', textColor: '#FF4F0F' } },
    { option: 'KSh 375', style: { backgroundColor: '#FFA673', textColor: 'white' } },
    { option: 'KSh 450', style: { backgroundColor: '#FF4F0F', textColor: 'white' } },
  ];

  // Check userCollectedReward on mount
  useEffect(() => {
    const checkUserCollectedReward = async () => {
      if (user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          const userData = userSnap.exists() ? userSnap.data() : {};
          console.log('Reward userCollectedReward:', userData.userCollectedReward); // Debug
          setHasCollectedReward(userData.userCollectedReward || false);
          if (userData.userCollectedReward) {
            navigate('/home', { replace: true });
          }
        } catch (err) {
          console.error('Reward fetch userCollectedReward error:', err);
          setHasCollectedReward(false); // Assume false if error
        }
      }
    };
    checkUserCollectedReward();
  }, [user, navigate]);

  const handleSpinClick = () => {
    if (!mustSpin && !hasCollectedReward) {
      // Restrict prizeNumber to indices 4, 5, 6, 7 (KSh 280, 320, 375, 450)
      const validIndices = [4, 5, 6, 7];
      const newPrizeNumber = validIndices[Math.floor(Math.random() * validIndices.length)];
      setPrizeNumber(newPrizeNumber);
      setMustSpin(true);
    }
  };

  const onStopSpinning = async () => {
    setMustSpin(false);
    const winner = data[prizeNumber].option;
    const rewardValue = parseFloat(winner.replace('KSh ', ''));
    setReward(rewardValue);

    if (user) {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        gamingEarnings: (userData?.gamingEarnings || 0) + rewardValue,
        history: arrayUnion({
          task: `Free Spin Reward (Welcome ${userData?.username || 'User'})`,
          reward: rewardValue,
          date: new Date().toLocaleString(),
        }),
        userCollectedReward: true,
      });
      setHasCollectedReward(true);
    }

    setTimeout(() => {
      navigate('/home', { replace: true });
    }, 3000);
  };

  // Show loading state while checking userCollectedReward
  if (hasCollectedReward === null) {
    return (
      <div className="min-h-screen bg-secondary font-roboto flex items-center justify-center py-12 px-4">
        <p className="text-primary font-roboto">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary font-roboto flex items-center justify-center py-12 px-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
        <h2 className="text-2xl font-bold text-primary font-roboto">
          Welcome, {userData?.username || 'User'}! Spin to Win!
        </h2>
        <p className="text-lg text-primary font-roboto mt-2">
          Get a free spin for a chance to earn up to KSh 450!
        </p>
        <div className="mt-6">
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
        {reward && (
          <p className="text-xl text-highlight font-roboto mt-4">
            You won KSh {reward}!
          </p>
        )}
        <button
          onClick={handleSpinClick}
          disabled={mustSpin || hasCollectedReward}
          className={`mt-6 bg-highlight text-white px-6 py-3 rounded-full font-roboto hover:bg-accent transition duration-300 ${
            mustSpin || hasCollectedReward ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {mustSpin ? 'Spinning...' : hasCollectedReward ? 'Reward Claimed' : 'Spin Now'}
        </button>
      </div>
    </div>
  );
};

export default Reward;