import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, isWeb } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOS_VERSION = '1.0';
const PRIVACY_VERSION = '1.0';
const AGE_VERIFICATION_VERSION = '1.0';

interface SignUpResult {
  error: Error | null;
  needsEmailConfirmation: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, dateOfBirth: Date) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  resendConfirmationEmail: (email: string) => Promise<{ error: Error | null }>;
  verifyOTP: (email: string, token: string) => Promise<{ error: Error | null }>;
  pendingDateOfBirth: Date | null;
  setPendingDateOfBirth: (date: Date | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const clearSessionStorage = async () => {
  if (isWeb) {
    if (typeof window !== 'undefined' && window.localStorage) {
      const keysToRemove = Object.keys(window.localStorage).filter(
        key => key.startsWith('sb-') || key.includes('supabase')
      );
      keysToRemove.forEach(key => window.localStorage.removeItem(key));
    }
  } else {
    const keys = await AsyncStorage.getAllKeys();
    const supabaseKeys = keys.filter(
      key => key.startsWith('sb-') || key.includes('supabase')
    );
    if (supabaseKeys.length > 0) {
      await AsyncStorage.multiRemove(supabaseKeys);
    }
  }
};

const recordConsent = async (userId: string, dateOfBirth?: Date | null) => {
  try {
    const now = new Date().toISOString();
    const data: Record<string, any> = {
      user_id: userId,
      tos_accepted_at: now,
      tos_version: TOS_VERSION,
      privacy_accepted_at: now,
      privacy_version: PRIVACY_VERSION,
    };
    if (dateOfBirth) {
      data.date_of_birth = dateOfBirth.toISOString().split('T')[0];
      data.age_verified_at = now;
      data.age_verification_version = AGE_VERIFICATION_VERSION;
    }
    const { error } = await supabase
      .from('user_preferences')
      .upsert(data, {
        onConflict: 'user_id',
        ignoreDuplicates: false,
      });
    if (error) {
      console.error('Error recording consent:', error);
    }
  } catch (err) {
    console.error('Error recording consent:', err);
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingDateOfBirth, setPendingDateOfBirth] = useState<Date | null>(null);
  const pendingDateOfBirthRef = useRef<Date | null>(null);

  useEffect(() => {
    pendingDateOfBirthRef.current = pendingDateOfBirth;
  }, [pendingDateOfBirth]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);

        if (event === 'SIGNED_OUT') {
          await clearSessionStorage();
        }

        if (event === 'SIGNED_IN' && session?.user) {
          const { data: prefs } = await supabase
            .from('user_preferences')
            .select('tos_accepted_at')
            .eq('user_id', session.user.id)
            .maybeSingle();

          if (!prefs?.tos_accepted_at) {
            await recordConsent(session.user.id, pendingDateOfBirthRef.current);
            pendingDateOfBirthRef.current = null;
            setPendingDateOfBirth(null);
          }
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, dateOfBirth: Date): Promise<SignUpResult> => {
    try {
      setPendingDateOfBirth(dateOfBirth);
      pendingDateOfBirthRef.current = dateOfBirth;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setPendingDateOfBirth(null);
        pendingDateOfBirthRef.current = null;
        return { error, needsEmailConfirmation: false };
      }

      const needsEmailConfirmation = !data.session && !!data.user;
      return { error: null, needsEmailConfirmation };
    } catch (error) {
      setPendingDateOfBirth(null);
      pendingDateOfBirthRef.current = null;
      return { error: error as Error, needsEmailConfirmation: false };
    }
  };

  const resendConfirmationEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const verifyOTP = async (email: string, token: string) => {
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup',
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      await clearSessionStorage();
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      setUser(null);
      setSession(null);
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    resendConfirmationEmail,
    verifyOTP,
    pendingDateOfBirth,
    setPendingDateOfBirth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
