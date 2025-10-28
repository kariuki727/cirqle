import React, { useState } from 'react';
import { spinRewards } from '../data/mockData';

const SpinToWin = ({ completeTask }) => {
  const [spinning, setSpinning] = useState(false);

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    const reward = spinRewards[Math.floor(Math.random() * spinRewards.length)];
    setTimeout(() => {
      completeTask(reward, `Spin-to-Win: Won KSh ${reward}`);
      setSpinning(false);
    }, 2000);
  };

  return (
    <div className="bg-secondary p-4 rounded shadow">
      <h2 className="text-xl font-bold font-roboto text-primary">Spin to Win</h2>
      <div className={`w-32 h-32 bg-primary rounded-full mx-auto flex items-center justify-center ${spinning ? 'animate-spin' : ''}`}>
        <span className="text-lg font-bold font-roboto text-white">{spinning ? 'Spinning...' : 'Spin!'}</span>
      </div>
      <button
        className="bg-highlight text-white px-4 py-2 mt-4 rounded hover:bg-accent font-roboto"
        onClick={spin}
        disabled={spinning}
      >
        Spin Now
      </button>
    </div>
  );
};

export default SpinToWin;