import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { Buffer } from 'buffer';
import { fetch as expoFetch } from 'expo/fetch';
import * as SystemUI from 'expo-system-ui';
import { Platform } from 'react-native';

global.Buffer = Buffer;
global.fetch = expoFetch as any;

function RootLayoutContent() {
  const { colors, isDark } = useTheme();

  useEffect(() => {
    if (Platform.OS === 'android') {
      SystemUI.setBackgroundColorAsync(colors.background);
    }
  }, [colors.background]);

  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        <Stack.Screen name="sign-up" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="details" options={{
          title: 'Tool Details',
          presentation: 'card',
        }} />
        <Stack.Screen name="about" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{
          title: 'Data Management',
          presentation: 'card',
        }} />
        <Stack.Screen name="pricing" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SubscriptionProvider>
          <ThemeProvider>
            <RootLayoutContent />
          </ThemeProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
