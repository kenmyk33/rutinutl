import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, FileText } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

export default function TermsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const styles = createStyles(colors, isDark);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.accent} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.iconSection}>
          <View style={styles.iconContainer}>
            <FileText size={32} color={colors.accent} />
          </View>
          <Text style={styles.lastUpdated}>Last updated: January 3, 2026</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <View style={styles.card}>
            <Text style={styles.text}>
              By accessing Mytools the organizer app ("the App"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the App.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Description of Service</Text>
          <View style={styles.card}>
            <Text style={styles.text}>
              Tool Organizer is a mobile application that allows users to visually organize and track their tools and equipment by uploading photos and marking locations. The service includes cloud storage for your data and images.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. User Accounts</Text>
          <View style={styles.card}>
            <Text style={styles.text}>
              You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate and complete information when creating an account.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Age Requirements</Text>
          <View style={styles.card}>
            <Text style={styles.text}>
              You must be at least 13 years old to create an account and use the App. By creating an account, you confirm that:{'\n'}
              {'\n'}- You are 13 years of age or older{'\n'}
              - The date of birth you provide is accurate{'\n'}
              - You have the legal capacity to enter into these Terms{'\n'}
              {'\n'}Providing false information about your age, including your date of birth, may result in immediate termination of your account. We reserve the right to verify age information and delete accounts of users found to be under 13.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Subscription and Payments</Text>
          <View style={styles.card}>
            <Text style={styles.text}>
              The App offers free and paid subscription tiers. Paid subscriptions are billed in advance on a monthly or annual basis. Prices may change with notice. Refunds are handled according to the applicable app store policies.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. User Content</Text>
          <View style={styles.card}>
            <Text style={styles.text}>
              You retain ownership of content you upload to the App. By uploading content, you grant us a license to store and display that content for the purpose of providing the service. You are responsible for ensuring you have the right to upload any content.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Acceptable Use</Text>
          <View style={styles.card}>
            <Text style={styles.text}>
              You agree not to use the App for any unlawful purpose, upload malicious content, attempt to gain unauthorized access to our systems, or interfere with other users&apos; use of the service.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Limitation of Liability</Text>
          <View style={styles.card}>
            <Text style={styles.text}>
              The App is provided &quot;as is&quot; without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the service. Our total liability shall not exceed the amount you paid for the service in the preceding 12 months.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Termination</Text>
          <View style={styles.card}>
            <Text style={styles.text}>
              We may suspend or terminate your access to the App at any time for violation of these terms. You may delete your account at any time through the App settings.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Changes to Terms</Text>
          <View style={styles.card}>
            <Text style={styles.text}>
              We may update these Terms of Service from time to time. We will notify you of significant changes. Continued use of the App after changes constitutes acceptance of the new terms.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Contact</Text>
          <View style={styles.card}>
            <Text style={styles.text}>
              If you have questions about these Terms of Service, please contact us through the App&apos;s support channels.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            2025 Mytools the organizer app. All rights reserved.
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
