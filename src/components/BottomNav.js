import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { HomeIcon, PuzzlePieceIcon, UserPlusIcon, CurrencyDollarIcon } from '@heroicons/react/24/solid';
import { AuthContext } from '../context/AuthContext';

const BottomNav = () => {
  const { user } = useContext(AuthContext);

  if (!user) return null;

  const navItems = [
    { path: '/home', label: 'Home', icon: HomeIcon },
    { path: '/refer', label: 'Refer', icon: UserPlusIcon },
    { path: '/earnings', label: 'Wallet', icon: CurrencyDollarIcon },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-t-md flex justify-around items-center h-16 font-roboto border-t border-primary z-50">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-full py-2 text-sm transition-colors duration-300 ${
              isActive ? 'text-primary' : 'text-highlight'
            }`
          }
        >
          <item.icon className="h-6 w-6" />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

export default BottomNav;