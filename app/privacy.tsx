import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Shield } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

export default function PrivacyScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const styles = createStyles(colors, isDark);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.accent} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.iconSection}>
          <View style={styles.iconContainer}>
            <Shield size={32} color={colors.accent} />
          </View>
          <Text style={styles.lastUpdated}>Last updated: December 26, 2024</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Information We Collect</Text>
          <View style={styles.card}>
            <Text style={styles.subtitle}>Account Information</Text>
            <Text style={styles.text}>
              When you create an account, we collect your email address, password (securely hashed), and date of birth for age verification purposes. If you sign in with Google, we receive your email and profile information from Google.
            </Text>
            <Text style={styles.subtitle}>User Content</Text>
            <Text style={styles.text}>
              We store photos you upload, location markers you create, and tool information you enter to provide our service.
            </Text>
            <Text style={styles.subtitle}>Usage Data</Text>
            <Text style={styles.text}>
              We collect anonymous usage statistics to improve the App, including feature usage and error reports.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
          <View style={styles.card}>
            <Text style={styles.text}>
              We use your information to:{'\n'}
              {'\n'}- Provide and maintain the App{'\n'}
              - Process your subscription and payments{'\n'}
              - Send important service notifications{'\n'}
              - Improve and develop new features{'\n'}
              - Ensure security and prevent fraud
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Data Storage and Security</Text>
          <View style={styles.card}>
            <Text style={styles.text}>
              Your data is stored securely on cloud servers with encryption at rest and in transit. We implement industry-standard security measures to protect your information. Your photos and data are stored in secure cloud storage with access controls.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Data Sharing</Text>
          <View style={styles.card}>
            <Text style={styles.text}>
              We do not sell your personal information. We may share data with:{'\n'}
              {'\n'}- Service providers who help operate our service (payment processing, hosting){'\n'}
              - Legal authorities when required by law{'\n'}
              - Successors in a business transfer or acquisition
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Your Rights</Text>
          <View style={styles.card}>
            <Text style={styles.text}>
              You have the right to:{'\n'}
              {'\n'}- Access your personal data{'\n'}
              - Correct inaccurate data{'\n'}
              - Delete your account and data{'\n'}
              - Opt out of marketing communications
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Data Retention</Text>
          <View style={styles.card}>
            <Text style={styles.text}>
              We retain your data as long as your account is active. When you delete your account, we delete your personal data and uploaded content within 30 days, except where retention is required by law.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Children's Privacy (COPPA Compliance)</Text>
          <View style={styles.card}>
            <Text style={styles.text}>
              The App is not intended for children under 13 years of age. In compliance with the Children's Online Privacy Protection Act (COPPA), we:{'\n'}
              {'\n'}- Require users to provide their date of birth during registration{'\n'}
              - Do not permit account creation for users under 13 years old{'\n'}
              - Do not knowingly collect personal information from children under 13{'\n'}
              - Will promptly delete any account if we learn the user is under 13{'\n'}
              {'\n'}If you believe a child under 13 has provided us with personal information, please contact us immediately so we can take appropriate action.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. International Data Transfers</Text>
          <View style={styles.card}>
            <Text style={styles.text}>
              Your data may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Changes to This Policy</Text>
          <View style={styles.card}>
            <Text style={styles.text}>
              We may update this Privacy Policy periodically. We will notify you of significant changes through the App or via email. Continued use of the App after changes constitutes acceptance.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Contact Us</Text>
          <View style={styles.card}>
            <Text style={styles.text}>
              If you have questions about this Privacy Policy or want to exercise your data rights, please contact us through the App's support channels.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            2025 Mytools. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  iconSection: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 8,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  lastUpdated: {
    fontSize: 14,
    color: colors.textMuted,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0 : 0.05,
    shadowRadius: 3,
    elevation: isDark ? 0 : 2,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
    marginBottom: 4,
  },
  text: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 8,
  },
  footerText: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
