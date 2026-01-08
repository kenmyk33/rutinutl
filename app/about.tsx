import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Package, MapPin, Camera, Shield } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

export default function AboutScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const styles = createStyles(colors, isDark);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.accent} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.logoSection}>
          <View style={styles.logo}>
            <Package size={48} color={colors.accent} />
          </View>
          <Text style={styles.appName}>Tool Organizer</Text>
          <Text style={styles.version}>Version 1.0.0</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About This App</Text>
          <View style={styles.card}>
            <Text style={styles.description}>
              Tool Organizer helps you track and manage your tools and equipment visually.
              Take a photo of your garage or storage space, mark locations, and catalog your items
              with ease.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features</Text>

          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: colors.accentLight }]}>
              <Camera size={20} color={colors.accent} />
            </View>
            <View style={styles.featureInfo}>
              <Text style={styles.featureTitle}>Visual Organization</Text>
              <Text style={styles.featureDescription}>
                Upload photos of your storage spaces and mark tool locations
              </Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: isDark ? '#2A3A2A' : '#E8F5E9' }]}>
              <MapPin size={20} color={colors.success} />
            </View>
            <View style={styles.featureInfo}>
              <Text style={styles.featureTitle}>Location Markers</Text>
              <Text style={styles.featureDescription}>
                Tap anywhere on your image to add and manage tool locations
              </Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: isDark ? '#3A3A2A' : '#FFF3E0' }]}>
              <Package size={20} color={colors.warning} />
            </View>
            <View style={styles.featureInfo}>
              <Text style={styles.featureTitle}>Tool Catalog</Text>
              <Text style={styles.featureDescription}>
                Keep track of all your stuff with names and quantities
              </Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: colors.errorLight }]}>
              <Shield size={20} color={colors.error} />
            </View>
            <View style={styles.featureInfo}>
              <Text style={styles.featureTitle}>Secure Storage</Text>
              <Text style={styles.featureDescription}>
                Your data is securely stored and always accessible
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.card}>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.stepText}>Upload a photo of your storage space</Text>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.stepText}>Tap on the image to add location markers</Text>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.stepText}>Add tools or objects to each location with names and quantities</Text>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <Text style={styles.stepText}>View and manage all of your belongings from the locations list</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Made with care for organizing enthusiasts
          </Text>
          <Text style={styles.copyright}>
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
  logoSection: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 8,
  },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: colors.card,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0 : 0.1,
    shadowRadius: 4,
    elevation: isDark ? 0 : 3,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  version: {
    fontSize: 14,
    color: colors.textMuted,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0 : 0.05,
    shadowRadius: 3,
    elevation: isDark ? 0 : 2,
  },
  description: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  featureCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0 : 0.05,
    shadowRadius: 3,
    elevation: isDark ? 0 : 2,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureInfo: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    paddingTop: 4,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
  },
  footerText: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 8,
  },
  copyright: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
