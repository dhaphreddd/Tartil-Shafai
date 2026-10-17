import { GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';

import { auth, db } from '../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAdmin: boolean;
}

export async function signInWithGoogle(): Promise<AppUser | null> {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    // Check if user is admin based on UID
    let isAdmin = false;
    try {
      const adminRef = doc(db, 'admins', user.uid);
      const adminSnap = await getDoc(adminRef);
      if (adminSnap.exists() && adminSnap.data().active === true) {
        isAdmin = true;
      }
    } catch (err) {
      console.warn('Failed to check admin status or unauthorized', err);
    }
    
    // Store/Update user data in users collection (for basic profile info)
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        lastLogin: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.warn('Failed to update user profile', err);
    }

    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      isAdmin
    };
  } catch (error) {
    console.error('Error signing in with Google', error);
    return null;
  }
}

export async function signOut() {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Error signing out', error);
  }
}

export function subscribeToAuthChanges(callback: (user: AppUser | null) => void) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      let isAdmin = false;
      try {
        const adminRef = doc(db, 'admins', user.uid);
        const adminSnap = await getDoc(adminRef);
        if (adminSnap.exists() && adminSnap.data().active === true) {
          isAdmin = true;
        }
      } catch (err) {
        console.warn('Failed to check admin status on auth change', err);
      }

      callback({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        isAdmin
      });
    } else {
      callback(null);
    }
  });
}
