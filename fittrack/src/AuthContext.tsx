import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, onAuthStateChanged, User, db, doc, getDoc, setDoc, onSnapshot, handleFirestoreError, OperationType } from './firebase';
import { UserProfile } from './types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signInGuest: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Listen to profile changes
        unsubProfile = onSnapshot(doc(db, 'users', user.uid), async (snapshot) => {
          if (snapshot.exists()) {
            setProfile(snapshot.data() as UserProfile);
          } else {
            // Create profile if it doesn't exist
            const newProfile: UserProfile = {
              uid: user.uid,
              displayName: user.isAnonymous ? 'Guest User' : (user.displayName || 'User'),
              email: user.email || (user.isAnonymous ? 'guest@fittrack.local' : ''),
              photoURL: user.photoURL || null,
              points: 0,
              dailyGoalProgress: 0,
              weeklyGoalProgress: 0,
              monthlyGoalProgress: 0,
              isGuest: user.isAnonymous
            };
            try {
              await setDoc(doc(db, 'users', user.uid), newProfile);
              // setProfile will be called by the next snapshot
            } catch (error) {
              handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
            }
          }
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
          setLoading(false);
        });
      } else {
        setProfile(null);
        if (unsubProfile) unsubProfile();
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const signIn = async () => {
    try {
      const { signInWithPopup, googleProvider } = await import('./firebase');
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Sign-in error:", error);
      if (error.code === 'auth/admin-restricted-operation') {
        alert("Sign-in failed: This operation is restricted. Please ensure the sign-in provider (Google or Anonymous) is enabled in your Firebase Console.");
      } else {
        alert("Sign-in failed: " + error.message);
      }
    }
  };

  const signInGuest = async () => {
    try {
      const { signInAnonymously } = await import('./firebase');
      await signInAnonymously(auth);
    } catch (error: any) {
      console.error("Guest sign-in error:", error);
      if (error.code === 'auth/admin-restricted-operation') {
        alert("Guest access failed: Anonymous authentication is disabled in your Firebase project. Please enable it in the Firebase Console (Authentication > Sign-in method).");
      } else {
        alert("Guest sign-in failed: " + error.message);
      }
    }
  };

  const signOut = async () => {
    await auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signInGuest, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
