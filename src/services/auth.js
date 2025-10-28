import { doc, setDoc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import bcrypt from 'bcryptjs';

export const signup = async ({ username, email, password, phone }) => {
  try {
    // Check if username, email, or phone already exists
    const usernameQuery = query(collection(db, 'users'), where('username', '==', username));
    const emailQuery = query(collection(db, 'users'), where('email', '==', email));
    const phoneQuery = query(collection(db, 'users'), where('phone', '==', phone));
    
    const [usernameSnap, emailSnap, phoneSnap] = await Promise.all([
      getDocs(usernameQuery),
      getDocs(emailQuery),
      getDocs(phoneQuery),
    ]);

    if (!usernameSnap.empty) {
      return { user: null, error: 'Username already exists' };
    }
    if (!emailSnap.empty) {
      return { user: null, error: 'Email already exists' };
    }
    if (!phoneSnap.empty) {
      return { user: null, error: 'Phone number already exists' };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate unique user ID
    const userId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

    // Store user data in Firestore
    await setDoc(doc(db, 'users', userId), {
      username,
      email,
      phone,
      password: hashedPassword,
      gamingEarnings: 0,
      taskEarnings: 0,
      spinCount: 0,
      isBettingAccountActive: false,
      isSurveyAccountActivated: false,
      hasUserClaimedReward: false, // Initialize bonus reward status
      history: [],
      createdAt: new Date().toISOString(),
      userCollectedReward: false,
      plan: 'free',
    });

    return { user: { uid: userId, username, email, phone }, error: null };
  } catch (error) {
    console.error('Signup error:', error);
    return { user: null, error: error.message || 'Signup failed' };
  }
};

export const signin = async ({ identifier, password }) => {
  try {
    // Find user by username, email, or phone
    const userQuery = query(
      collection(db, 'users'),
      where('username', '==', identifier),
    );
    const emailQuery = query(
      collection(db, 'users'),
      where('email', '==', identifier),
    );
    const phoneQuery = query(
      collection(db, 'users'),
      where('phone', '==', identifier),
    );

    const [userSnap, emailSnap, phoneSnap] = await Promise.all([
      getDocs(userQuery),
      getDocs(emailQuery),
      getDocs(phoneQuery),
    ]);

    let userDoc;
    if (!userSnap.empty) {
      userDoc = userSnap.docs[0];
    } else if (!emailSnap.empty) {
      userDoc = emailSnap.docs[0];
    } else if (!phoneSnap.empty) {
      userDoc = phoneSnap.docs[0];
    } else {
      return { user: null, error: 'User not found' };
    }

    const userData = userDoc.data();
    const isPasswordValid = await bcrypt.compare(password, userData.password);
    if (!isPasswordValid) {
      return { user: null, error: 'Invalid password' };
    }

    return {
      user: {
        uid: userDoc.id,
        username: userData.username,
        email: userData.email,
        phone: userData.phone,
        plan: userData.plan,
      },
      error: null,
    };
  } catch (error) {
    console.error('Signin error:', error);
    return { user: null, error: error.message || 'Signin failed' };
  }
};

export const signout = async () => {
  return { error: null };
};

export const getUserData = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return { data: userDoc.data(), error: null };
    }
    return { data: null, error: 'User not found' };
  } catch (error) {
    console.error('Get user data error:', error);
    return { data: null, error: error.message };
  }
};