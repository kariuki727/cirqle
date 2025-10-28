import React from 'react';

const ReferAndEarn = ({ completeTask }) => {
  const referralLink = 'https://earntompesa.com/ref/12345';

  const copyLink = () => {
    navigator.clipboard.write(referralLink);
    alert('Referral link copied!');
  };

  return (
    <div className="bg-secondary p-4 rounded shadow">
      <h2 className="text-xl font-bold font-roboto text-primary">Refer and Earn</h2>
      <p className="font-roboto text-primary">Invite friends and earn KSh 50 per referral!</p>
      <input
        type="text"
        value={referralLink}
        readOnly
        className="w-full p-2 border border-primary rounded font-roboto text-primary"
      />
      <button
        className="bg-primary text-white px-4 py-2 mt-2 rounded hover:bg-accent font-roboto"
        onClick={copyLink}
      >
        Copy Link
      </button>
      <button
        className="bg-highlight text-white px-4 py-2 mt-2 ml-2 rounded hover:bg-accent font-roboto"
        onClick={() => completeTask(50, 'Referred a friend')}
      >
        Simulate Referral
      </button>
    </div>
  );
};

export default ReferAndEarn;