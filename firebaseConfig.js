import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: 'AIzaSyCjrSzoWq2puWbpvV9IltgFVB-T0k_ur3M',
  authDomain: 'scanner-gondola.firebaseapp.com',
  projectId: 'scanner-gondola',
  storageBucket: 'scanner-gondola.firebasestorage.app',
  messagingSenderId: '784601596788',
  appId: '1:784601596788:web:6263489c923fcffa1d2221',
  measurementId: 'G-LH53YNL4W7',
};

export const firebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);
