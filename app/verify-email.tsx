import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Mail, RefreshCw, LogOut, ShieldCheck } from 'lucide-react-native';

export default function VerifyEmailScreen() {
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const { user, signOut, resendConfirmationEmail, verifyOTP } = useAuth();
  const { colors } = useTheme();

  const handleResendEmail = async () => {
    if (!user?.email) return;

    setResendLoading(true);
    setResendSuccess(false);
    setError(null);

    const { error } = await resendConfirmationEmail(user.email);

    if (error) {
      setError(error.message);
    } else {
      setResendSuccess(true);
    }
    setResendLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/sign-in');
  };

  const handleVerifyOTP = async () => {
    if (!user?.email) return;

    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    setVerifyLoading(true);
    setError(null);

    const { error } = await verifyOTP(user.email, otpCode);

    if (error) {
      setError(error.message);
      setVerifyLoading(false);
    } else {
      router.replace('/(tabs)');
    }
  };

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Mail size={64} color={colors.accent} />
        </View>

        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit verification code to:
        </Text>
        <Text style={styles.email}>{user?.email}</Text>
        <Text style={styles.description}>
          Enter the code below to verify your account.
        </Text>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {resendSuccess && (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>Verification code sent!</Text>
          </View>
        )}

        <View style={styles.otpInputContainer}>
          <TextInput
            style={styles.otpInput}
            placeholder="Enter 6-digit code"
            placeholderTextColor={colors.textMuted}
            value={otpCode}
            onChangeText={(text) => setOtpCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            editable={!verifyLoading}
          />
        </View>

        <TouchableOpacity
          style={[styles.verifyButton, (verifyLoading || otpCode.length !== 6) && styles.buttonDisabled]}
          onPress={handleVerifyOTP}
          disabled={verifyLoading || otpCode.length !== 6}
        >
          {verifyLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <ShieldCheck size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.verifyButtonText}>Verify Email</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.resendButton, resendLoading && styles.buttonDisabled]}
          onPress={handleResendEmail}
          disabled={resendLoading}
        >
          {resendLoading ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <>
              <RefreshCw size={20} color={colors.accent} style={styles.buttonIcon} />
              <Text style={styles.resendButtonText}>Resend Code</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
        >
          <LogOut size={20} color={colors.textMuted} style={styles.buttonIcon} />
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 8,
  },
  email: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  errorContainer: {
    backgroundColor: colors.errorLight,
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    width: '100%',
    maxWidth: 320,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    textAlign: 'center',
  },
  successContainer: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    width: '100%',
    maxWidth: 320,
  },
  successText: {
    color: '#22C55E',
    fontSize: 14,
    textAlign: 'center',
  },
  otpInputContainer: {
    width: '100%',
    maxWidth: 320,
    marginTop: 24,
  },
  otpInput: {
    borderWidth: 1,
    borderColor: colors.inputBorder || colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    color: colors.text,
    backgroundColor: colors.inputBackground || colors.card,
    fontWeight: '600',
  },
  verifyButton: {
    flexDirection: 'row',
    backgroundColor: colors.accent,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    width: '100%',
    maxWidth: 320,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    flexDirection: 'row',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonIcon: {
    marginRight: 8,
  },
  resendButtonText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  signOutButton: {
    flexDirection: 'row',
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  signOutButtonText: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '500',
  },
});
