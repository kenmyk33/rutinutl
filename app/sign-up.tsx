import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Mail, Lock, UserPlus, CheckCircle, ShieldCheck, Calendar } from 'lucide-react-native';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MIN_AGE = 13;

const calculateAge = (birthDate: Date): number => {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const getDaysInMonth = (month: number, year: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [birthMonth, setBirthMonth] = useState<number | null>(null);
  const [birthDay, setBirthDay] = useState<number | null>(null);
  const [birthYear, setBirthYear] = useState<number | null>(null);
  const { signUp, signInWithGoogle, resendConfirmationEmail, verifyOTP, setPendingDateOfBirth } = useAuth();
  const { colors, isDark } = useTheme();

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 120 }, (_, i) => currentYear - i);
  const days = birthMonth !== null && birthYear !== null
    ? Array.from({ length: getDaysInMonth(birthMonth, birthYear) }, (_, i) => i + 1)
    : Array.from({ length: 31 }, (_, i) => i + 1);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): { valid: boolean; message: string } => {
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters' };
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }
    if (!/[a-z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one number' };
    }
    return { valid: true, message: '' };
  };

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setError(passwordValidation.message);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (birthMonth === null || birthDay === null || birthYear === null) {
      setError('Please enter your date of birth');
      return;
    }

    const dateOfBirth = new Date(birthYear, birthMonth, birthDay);
    const age = calculateAge(dateOfBirth);

    if (age < MIN_AGE) {
      setError(`You must be at least ${MIN_AGE} years old to create an account`);
      return;
    }

    setLoading(true);
    setError(null);

    const { error, needsEmailConfirmation } = await signUp(email, password, dateOfBirth);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else if (needsEmailConfirmation) {
      setShowConfirmation(true);
      setLoading(false);
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleResendEmail = async () => {
    setResendLoading(true);
    setResendSuccess(false);
    setError(null);

    const { error } = await resendConfirmationEmail(email);

    if (error) {
      setError(error.message);
    } else {
      setResendSuccess(true);
    }
    setResendLoading(false);
  };

  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    setVerifyLoading(true);
    setError(null);

    const { error } = await verifyOTP(email, otpCode);

    if (error) {
      setError(error.message);
      setVerifyLoading(false);
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    const { error } = await signInWithGoogle();

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const styles = createStyles(colors, isDark);

  if (showConfirmation) {
    return (
      <View style={styles.container}>
        <View style={styles.confirmationContainer}>
          <View style={styles.confirmationIconContainer}>
            <CheckCircle size={64} color={colors.success || '#22C55E'} />
          </View>
          <Text style={styles.confirmationTitle}>Check Your Email</Text>
          <Text style={styles.confirmationText}>
            We've sent a 6-digit verification code to:
          </Text>
          <Text style={styles.confirmationEmail}>{email}</Text>
          <Text style={styles.confirmationText}>
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
              <Text style={styles.resendButtonText}>Resend Code</Text>
            )}
          </TouchableOpacity>

          <Link href="/sign-in" asChild>
            <TouchableOpacity style={styles.backButton}>
              <Text style={styles.backButtonText}>Back to Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Image
            source={require('@/assets/images/icon.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Start organizing your garage</Text>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Mail size={20} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Lock size={20} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password (8+ chars, A-Z, a-z, 0-9)"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Lock size={20} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor={colors.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              editable={!loading}
            />
          </View>

          <View style={styles.dobSection}>
            <View style={styles.dobLabelRow}>
              <Calendar size={20} color={colors.textMuted} />
              <Text style={styles.dobLabel}>Date of Birth</Text>
            </View>
            <Text style={styles.dobHelperText}>You must be at least 13 years old</Text>
            <View style={styles.dobInputRow}>
              <View style={styles.dobSelectContainer}>
                <TouchableOpacity
                  style={[styles.dobSelect, birthMonth !== null && styles.dobSelectFilled]}
                  onPress={() => {}}
                  disabled={loading}
                >
                  <Text style={[styles.dobSelectText, birthMonth === null && styles.dobPlaceholder]}>
                    {birthMonth !== null ? MONTHS[birthMonth] : 'Month'}
                  </Text>
                </TouchableOpacity>
                <ScrollView style={styles.dobDropdown} nestedScrollEnabled>
                  {MONTHS.map((month, index) => (
                    <TouchableOpacity
                      key={month}
                      style={[styles.dobOption, birthMonth === index && styles.dobOptionSelected]}
                      onPress={() => setBirthMonth(index)}
                    >
                      <Text style={[styles.dobOptionText, birthMonth === index && styles.dobOptionTextSelected]}>
                        {month}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.dobSelectContainerSmall}>
                <TouchableOpacity
                  style={[styles.dobSelect, birthDay !== null && styles.dobSelectFilled]}
                  onPress={() => {}}
                  disabled={loading}
                >
                  <Text style={[styles.dobSelectText, birthDay === null && styles.dobPlaceholder]}>
                    {birthDay !== null ? birthDay : 'Day'}
                  </Text>
                </TouchableOpacity>
                <ScrollView style={styles.dobDropdown} nestedScrollEnabled>
                  {days.map((day) => (
                    <TouchableOpacity
                      key={day}
                      style={[styles.dobOption, birthDay === day && styles.dobOptionSelected]}
                      onPress={() => setBirthDay(day)}
                    >
                      <Text style={[styles.dobOptionText, birthDay === day && styles.dobOptionTextSelected]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.dobSelectContainerSmall}>
                <TouchableOpacity
                  style={[styles.dobSelect, birthYear !== null && styles.dobSelectFilled]}
                  onPress={() => {}}
                  disabled={loading}
                >
                  <Text style={[styles.dobSelectText, birthYear === null && styles.dobPlaceholder]}>
                    {birthYear !== null ? birthYear : 'Year'}
                  </Text>
                </TouchableOpacity>
                <ScrollView style={styles.dobDropdown} nestedScrollEnabled>
                  {years.map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={[styles.dobOption, birthYear === year && styles.dobOptionSelected]}
                      onPress={() => setBirthYear(year)}
                    >
                      <Text style={[styles.dobOptionText, birthYear === year && styles.dobOptionTextSelected]}>
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>

          <View style={styles.consentContainer}>
            <Text style={styles.consentText}>
              By creating an account, you agree to our{' '}
              <Text style={styles.consentLink} onPress={() => router.push('/terms')}>
                Terms of Service
              </Text>
              {' '}and{' '}
              <Text style={styles.consentLink} onPress={() => router.push('/privacy')}>
                Privacy Policy
              </Text>
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <UserPlus size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Create Account</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.googleButton, loading && styles.buttonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={loading}
          >
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/sign-in" asChild>
              <TouchableOpacity disabled={loading}>
                <Text style={styles.link}>Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoImage: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    backgroundColor: colors.inputBackground,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: 16,
    color: colors.text,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: colors.accent,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: 16,
    color: colors.textMuted,
    fontSize: 14,
  },
  googleButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  googleButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  link: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: colors.errorLight,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    textAlign: 'center',
  },
  confirmationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmationIconContainer: {
    marginBottom: 24,
  },
  confirmationTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  confirmationText: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  confirmationEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  successContainer: {
    backgroundColor: isDark ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 16,
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
    borderColor: colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    color: colors.text,
    backgroundColor: colors.inputBackground,
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
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accent,
    marginTop: 16,
    width: '100%',
    maxWidth: 320,
  },
  resendButtonText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 16,
    padding: 12,
  },
  backButtonText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  consentContainer: {
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  consentText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  consentLink: {
    color: colors.accent,
    fontWeight: '500',
  },
  dobSection: {
    marginBottom: 16,
  },
  dobLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  dobLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  dobHelperText: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 12,
  },
  dobInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dobSelectContainer: {
    flex: 2,
  },
  dobSelectContainerSmall: {
    flex: 1,
  },
  dobSelect: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: colors.inputBackground,
    marginBottom: 4,
  },
  dobSelectFilled: {
    borderColor: colors.accent,
  },
  dobSelectText: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
  },
  dobPlaceholder: {
    color: colors.textMuted,
  },
  dobDropdown: {
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    backgroundColor: colors.card,
  },
  dobOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dobOptionSelected: {
    backgroundColor: colors.accentLight,
  },
  dobOptionText: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
  },
  dobOptionTextSelected: {
    color: colors.accent,
    fontWeight: '600',
  },
});
