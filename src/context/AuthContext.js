import React, { createContext, useState, useEffect } from 'react';
import { signin, signout, getUserData } from '../services/auth';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../services/firebase';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user from localStorage and set up real-time listener
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    console.log('Full storedUser:', storedUser); // Debug
    console.log('storedUser.uid:', storedUser?.uid, 'Type:', typeof storedUser?.uid); // Debug
    console.log('db instance:', db, 'Type:', typeof db); // Debug

    if (storedUser && typeof storedUser.uid === 'string' && storedUser.uid.length > 0 && db) {
      setUser(storedUser);
      try {
        const userRef = doc(db, 'users', storedUser.uid);
        const unsubscribe = onSnapshot(userRef, (doc) => {
          if (doc.exists()) {
            setUserData(doc.data());
            console.log('AuthContext real-time userData:', doc.data()); // Debug
          } else {
            setUser(null);
            setUserData(null);
            localStorage.removeItem('user');
            console.log('AuthContext: User not found, clearing session');
          }
          setLoading(false);
        }, (err) => {
          console.error('AuthContext real-time error:', err);
          setUser(null);
          setUserData(null);
          localStorage.removeItem('user');
          setLoading(false);
        });
        return () => unsubscribe();
      } catch (err) {
        console.error('Firestore doc creation failed:', err);
        setUser(null);
        setUserData(null);
        localStorage.removeItem('user');
        setLoading(false);
      }
    } else {
      console.warn('Invalid stored user or db, clearing:', storedUser);
      localStorage.removeItem('user');
      setUser(null);
      setUserData(null);
      setLoading(false);
    }
  }, []);

  // Handle signin
  const handleSignin = async (identifier, password) => {
    const { user, error } = await signin({ identifier, password });
    if (user && user.uid) {
      const safeUser = { uid: user.uid, email: user.email || '' }; // Minimal safe object
      setUser(safeUser);
      localStorage.setItem('user', JSON.stringify(safeUser));
      try {
        const { data } = await getUserData(user.uid);
        if (data) {
          setUserData(data);
          console.log('AuthContext signin userData:', data); // Debug
        }
        return { user: safeUser, error: null };
      } catch (err) {
        console.error('getUserData failed:', err);
        return { user: safeUser, error: err.message };
      }
    }
    return { user: null, error };
  };

  // Handle signout
  const handleSignout = async () => {
    try {
      await signout();
      setUser(null);
      setUserData(null);
      localStorage.removeItem('user');
      console.log('AuthContext: User signed out'); // Debug
    } catch (err) {
      console.error('Signout failed:', err);
      // Still clear local state even if signout fails
      setUser(null);
      setUserData(null);
      localStorage.removeItem('user');
    }
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, signin: handleSignin, signout: handleSignout, setUserData }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};