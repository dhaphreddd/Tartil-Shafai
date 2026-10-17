import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAT0rmPjJ6O_v0kKEL2yzHmyHwwzIgXQzc",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "tartil-shafai-4e59a.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "tartil-shafai-4e59a",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "tartil-shafai-4e59a.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "520947149209",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:520947149209:web:5537781d5ced67363e0b08",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
console.log("[Firebase] projectId:", app.options.projectId);

export const db = getFirestore(app);
export const auth = getAuth(app);
