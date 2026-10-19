import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  loading: true,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    const isAdminPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');

    const initAuth = async () => {
      try {
        const [{ onAuthStateChanged }, { auth }] = await Promise.all([
          import('firebase/auth'),
          import('../config/firebase'),
        ]);

        unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          setLoading(true);
          setUser(firebaseUser);
          if (firebaseUser) {
            try {
              const [{ doc, getDoc }, { db }] = await Promise.all([
                import('firebase/firestore'),
                import('../config/firebase'),
              ]);
              const docRef = doc(db, 'admins', firebaseUser.uid);
              const snap = await getDoc(docRef);
              if (snap.exists() && snap.data().active === true) {
                setIsAdmin(true);
              } else if (firebaseUser.email === 'arset.saklawase@gmail.com') {
                setIsAdmin(true);
              } else {
                setIsAdmin(false);
              }
            } catch (error) {
              console.warn("Firestore admin check error:", error);
              if (firebaseUser.email === 'arset.saklawase@gmail.com') {
                setIsAdmin(true);
              } else {
                setIsAdmin(false);
              }
            }
          } else {
            setIsAdmin(false);
          }
          setLoading(false);
        });
      } catch (err) {
        console.warn("[AuthContext] Failed to load Firebase Auth dynamically:", err);
        setLoading(false);
      }
    };

    const hasStoredAuth = typeof window !== 'undefined' && (() => {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          if (localStorage.key(i)?.startsWith('firebase:authUser:')) return true;
        }
      } catch {}
      return false;
    })();

    if (isAdminPath || hasStoredAuth) {
      initAuth();
    } else {
      setLoading(false);
      // Untuk pengunjung umum tanpa sesi, tunda hingga ada interaksi pengguna atau setelah fase LCP
      let timer: any = null;
      const onUserInteraction = () => {
        cleanup();
        initAuth();
      };
      const cleanup = () => {
        if (timer) clearTimeout(timer);
        window.removeEventListener('pointerdown', onUserInteraction);
        window.removeEventListener('keydown', onUserInteraction);
      };
      window.addEventListener('pointerdown', onUserInteraction, { once: true, passive: true });
      window.addEventListener('keydown', onUserInteraction, { once: true, passive: true });
      timer = setTimeout(() => {
        cleanup();
        initAuth();
      }, 10000);

      return () => {
        cleanup();
        if (unsubscribe) unsubscribe();
      };
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const logout = async () => {
    const [{ signOut }, { auth }] = await Promise.all([
      import('firebase/auth'),
      import('../config/firebase'),
    ]);
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
