import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Image } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

const MIN_SPLASH_DURATION = 1500;

export default function InitialScreen() {
  const { user, loading } = useAuth();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, MIN_SPLASH_DURATION);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading && minTimeElapsed) {
      if (user) {
        if (!user.email_confirmed_at) {
          router.replace('/verify-email');
        } else {
          router.replace('/(tabs)');
        }
      } else {
        router.replace('/sign-in');
      }
    }
  }, [user, loading, minTimeElapsed]);

  return (
    <View style={styles.container}>
      <Image
        source={require('@/assets/images/Mytools_LOGO.png')}
        style={styles.logoImage}
        resizeMode="contain"
      />
      <ActivityIndicator size="large" color="#2E6DA4" style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 200,
    height: 200,
    marginBottom: 32,
  },
  spinner: {
    marginTop: 16,
  },
});
