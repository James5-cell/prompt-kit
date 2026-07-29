import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { getIdTokenResult, onAuthStateChanged } from 'firebase/auth';
import { getFirebaseAuth, signInWithGoogle, signOutFirebase } from '../storage/firebase';

type AuthState = {
  isAuthReady: boolean;
  user: User | null;
  userEmail: string | null;
  isAdmin: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshClaims: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  async function computeAdmin(nextUser: User | null) {
    if (!nextUser) {
      setIsAdmin(false);
      return;
    }
    try {
      const tokenResult = await getIdTokenResult(nextUser, false);
      setIsAdmin(tokenResult?.claims?.admin === true);
    } catch {
      setIsAdmin(false);
    }
  }

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setIsAuthReady(true);
      setUser(null);
      setIsAdmin(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      await computeAdmin(nextUser);
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  const value = useMemo<AuthState>(() => {
    return {
      isAuthReady,
      user,
      userEmail: user?.email ?? null,
      isAdmin,
      loginWithGoogle: async () => {
        await signInWithGoogle();
        // onAuthStateChanged will update user/admin status
      },
      logout: async () => {
        await signOutFirebase();
        // onAuthStateChanged will update state
      },
      refreshClaims: async () => {
        if (!user) return;
        await user.getIdToken(true);
        await computeAdmin(user);
      },
    };
  }, [isAuthReady, user, isAdmin]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

