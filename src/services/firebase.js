import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA-PNNrBa2B8zmCRuwZi5_NnH5Bs95Ej7w",
  authDomain: "earn-to-mpesa-29b50.firebaseapp.com",
  projectId: "earn-to-mpesa-29b50",
  storageBucket: "earn-to-mpesa-29b50.firebasestorage.app",
  messagingSenderId: "776094457616",
  appId: "1:776094457616:web:8c4e79b3e0cf77562e8f95",
  measurementId: "G-MY15930S14"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);