import React, { useContext } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import BottomNav from './components/BottomNav';
import Reward from './components/Reward';
import Tasking from './components/Tasking';
import Deposit from './components/Deposit';
import Landing from './welcome/Landing';
import Signup from './welcome/Signup';
import Signin from './welcome/Signin';
import Home from './pages/Home';
import Tasks from './pages/Tasks';
import Earnings from './pages/Earnings';
import Refer from './pages/Refer';

const App = () => {
  const { user, loading, userData } = useContext(AuthContext);
  const location = useLocation();

  if (loading) return null;

  // Show BottomNav on /home, /tasks, /refer, /earnings, /deposit routes
  const showBottomNav = ['/home', '/tasks', '/refer', '/earnings', '/deposit'].includes(location.pathname);

  return (
    <div className="min-h-screen bg-secondary font-roboto flex flex-col">
      <div className="flex-grow pb-16"> {/* Padding for BottomNav */}
        <Routes>
          <Route
            path="/"
            element={user ? <Navigate to="/home" /> : <Landing />}
          />
          <Route
            path="/signup"
            element={user ? <Navigate to="/reward" /> : <Signup />}
          />
          <Route
            path="/signin"
            element={user ? <Navigate to="/home" /> : <Signin />}
          />
          <Route
            path="/reward"
            element={user ? <Reward /> : <Navigate to="/signin" />}
          />
          <Route
            path="/home"
            element={user ? <Home /> : <Navigate to="/signin" />}
          />
          <Route
            path="/tasks"
            element={user ? <Tasks completeTask={() => {}} /> : <Navigate to="/signin" />}
          />
          <Route
            path="/home/:categoryId"
            element={user ? <Tasking /> : <Navigate to="/signin" />}
          />
          <Route
            path="/earnings"
            element={user ? <Earnings history={userData?.history || []} /> : <Navigate to="/signin" />}
          />
          <Route
            path="/refer"
            element={user ? <Refer completeTask={() => {}} /> : <Navigate to="/signin" />}
          />
          <Route
            path="/deposit"
            element={user ? <Deposit /> : <Navigate to="/signin" />}
          />
          <Route
            path="/upgrade"
            element={user ? <div className="p-4 text-primary font-roboto">Upgrade page coming soon!</div> : <Navigate to="/signin" />}
          />
        </Routes>
      </div>
      {showBottomNav && <BottomNav />}
    </div>
  );
};

export default App;