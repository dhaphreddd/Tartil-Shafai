import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs, query, where, orderBy } from 'firebase/firestore';

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

async function runTest() {
  console.log("Firebase projectId:", app.options.projectId);

  try {
    const ref = doc(db, "volumes", "j1");
    const snapshot = await getDoc(ref);
    console.log("[Firebase Test] exists:", snapshot.exists());
    if (snapshot.exists()) {
      console.log("[Firebase Test] data:", snapshot.data());
    } else {
      console.log("[Firebase Test] Document does not exist");
    }

    console.log("\nTesting public query:");
    const q = query(
      collection(db, "volumes"),
      where("isPublished", "==", true),
      orderBy("order", "asc")
    );
    const qSnapshot = await getDocs(q);
    console.log(`[Firebase Test] Public query returned ${qSnapshot.docs.length} documents.`);
    qSnapshot.docs.forEach(doc => {
      console.log(`- ${doc.id}:`, doc.data());
    });

    console.log("\nTesting public packages query:");
    const qPackages = query(
      collection(db, "packages"),
      where("volumeId", "==", "j1"),
      where("isPublished", "==", true),
      orderBy("order", "asc")
    );
    const qPkgSnapshot = await getDocs(qPackages);
    console.log(`[Firebase Test] Public packages query returned ${qPkgSnapshot.docs.length} documents.`);


  } catch (error) {
    console.error("[Firebase Test] Error:", error.code);
    console.error(error.message);
  }
  process.exit(0);
}

runTest();
