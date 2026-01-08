import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { CheckCircle, XCircle } from 'lucide-react-native';

export default function AuthCallbackScreen() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { colors } = useTheme();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        if (typeof window !== 'undefined') {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          const error = hashParams.get('error');
          const errorDescription = hashParams.get('error_description');

          if (error) {
            setStatus('error');
            setErrorMessage(errorDescription || error);
            return;
          }

          if (accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              setStatus('error');
              setErrorMessage(sessionError.message);
              return;
            }
          }

          const { data: { session } } = await supabase.auth.getSession();

          if (session) {
            setStatus('success');
            setTimeout(() => {
              router.replace('/(tabs)');
            }, 1500);
          } else {
            setStatus('error');
            setErrorMessage('Could not verify your email. Please try again.');
          }
        }
      } catch (err) {
        setStatus('error');
        setErrorMessage('An unexpected error occurred.');
      }
    };

    handleCallback();
  }, []);

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      {status === 'loading' && (
        <>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.text}>Verifying your email...</Text>
        </>
      )}

      {status === 'success' && (
        <>
          <CheckCircle size={64} color="#22C55E" />
          <Text style={styles.title}>Email Verified!</Text>
          <Text style={styles.text}>Redirecting to the app...</Text>
        </>
      )}

      {status === 'error' && (
        <>
          <XCircle size={64} color={colors.error} />
          <Text style={styles.title}>Verification Failed</Text>
          <Text style={styles.text}>{errorMessage}</Text>
          <Text
            style={styles.link}
            onPress={() => router.replace('/sign-in')}
          >
            Back to Sign In
          </Text>
        </>
      )}
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: 24,
    marginBottom: 8,
  },
  text: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: 16,
    textAlign: 'center',
  },
  link: {
    fontSize: 16,
    color: colors.accent,
    marginTop: 24,
    fontWeight: '600',
  },
});
