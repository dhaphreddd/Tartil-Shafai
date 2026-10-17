import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAT0rmPjJ6O_v0kKEL2yzHmyHwwzIgXQzc",
  authDomain: "tartil-shafai-4e59a.firebaseapp.com",
  projectId: "tartil-shafai-4e59a",
  storageBucket: "tartil-shafai-4e59a.firebasestorage.app",
  messagingSenderId: "520947149209",
  appId: "1:520947149209:web:5537781d5ced67363e0b08"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seed() {
  try {
    console.log("Setting admin UID: UCfHEVR8BKZFhkE2WvPvsJqX2172");
    await setDoc(doc(db, 'admins', 'UCfHEVR8BKZFhkE2WvPvsJqX2172'), {
      active: true
    });
    console.log("Admin set.");

    console.log("Setting volumes/j1");
    await setDoc(doc(db, 'volumes', 'j1'), {
      number: 1,
      name: "Jilid 1",
      description: "Kumpulan paket maqra' Jilid 1",
      isPublished: true,
      order: 1
    });
    console.log("j1 set.");

    console.log("Setting volumes/j2");
    await setDoc(doc(db, 'volumes', 'j2'), {
      number: 2,
      name: "Jilid 2",
      description: "Kumpulan paket maqra' Jilid 2",
      isPublished: true,
      order: 2
    });
    console.log("j2 set.");
    console.log("Seed successful.");
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
}

seed();
