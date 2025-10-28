import React from 'react';

const Navbar = ({ setActiveTab }) => {
  const tabs = ['Home', 'Tasks', 'Earnings', 'Refer'];

  return (
    <nav className="fixed bottom-0 w-full bg-primary text-white flex justify-around py-2">
      {tabs.map(tab => (
        <button
          key={tab}
          className="px-4 py-2 hover:bg-accent rounded font-roboto"
          onClick={() => setActiveTab(tab)}
        >
          {tab}
        </button>
      ))}
    </nav>
  );
};

export default Navbar;