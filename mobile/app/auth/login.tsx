import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { Colors } from '../../src/theme/colors';

export default function LoginScreen() {
  const router = useRouter();
  const { login, loginDemo } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Both email and password are required.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)/roadmap');
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await loginDemo();
      router.replace('/(tabs)/roadmap');
    } catch (err: any) {
      setError(err?.message || 'Demo session initialisation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Subtle Decorative Radar Telemetry Ping Graphic */}
        <View style={styles.syslinkBar}>
          <View style={styles.syslinkLeft}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/roadmap')}
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={16} color={Colors.ink} />
            </TouchableOpacity>
            <View style={styles.pulseContainer}>
              <View style={styles.pulseRing} />
              <View style={styles.pulseCore} />
            </View>
            <Text style={styles.syslinkText}>SYSLINK ONLINE // NODE 09</Text>
          </View>
          <View style={styles.syslinkRight}>
            <Text style={styles.latencyText}>LATENCY: 14ms</Text>
            <Ionicons name="wifi" size={13} color={Colors.surfaceTint} />
          </View>
        </View>

        {/* Header Sub-bar & Monumental Typography */}
        <View style={styles.headerBlock}>
          <View style={styles.tagPill}>
            <Text style={styles.tagPillText}>INDEX / AUTHENTICATION • FORM 00-AUTH</Text>
          </View>
          <Text style={styles.mainTitle}>Cadet Authentication</Text>
          <Text style={styles.subtitle}>
            Access verified technical telemetry, saved specs, and engineering career roadmaps.
          </Text>
        </View>

        {/* Visual Delight: Mini Radar Status Badge Card */}
        <View style={styles.radarCard}>
          <View style={styles.radarCardLeft}>
            <View style={styles.radarIconSquare}>
              <Ionicons name="radio" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.radarTextCol}>
              <Text style={styles.radarGridTitle}>ACTIVE RADAR GRID</Text>
              <Text style={styles.radarGridSub}>2,410 engineering skill nodes tracking</Text>
            </View>
          </View>
          <View style={styles.onlineBadge}>
            <Text style={styles.onlineBadgeText}>ONLINE</Text>
          </View>
        </View>

        {/* Segmented Sign In / Create Account Toggle */}
        <View style={styles.toggleBar}>
          <View style={styles.toggleBtnActive}>
            <Ionicons name="log-in-outline" size={16} color="#FFFFFF" />
            <Text style={styles.toggleBtnTextActive}>Sign In</Text>
          </View>
          <TouchableOpacity
            style={styles.toggleBtnInactive}
            onPress={() => router.push('/auth/register')}
            activeOpacity={0.8}
          >
            <Ionicons name="person-add-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.toggleBtnTextInactive}>Create Account</Text>
          </TouchableOpacity>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={Colors.rose} style={{ marginRight: 6 }} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>01 / CADET EMAIL OR HANDLE</Text>
            <TextInput
              style={styles.input}
              placeholder="cadet@skillradar.tech"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>02 / PASSKEY OR CIPHER KEY</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••••••"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleLogin}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>AUTHENTICATE CADET →</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.demoBtn}
            onPress={handleDemoLogin}
            disabled={submitting}
            activeOpacity={0.8}
          >
            <Text style={styles.demoBtnText}>ENTER AS DEMO CADET (SANDBOX)</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => router.push('/auth/register')}
          >
            <Text style={styles.registerLinkText}>
              NEW RESEARCH OPERATIVE?{' '}
              <Text style={styles.registerHighlight}>ENLIST NEW CADET</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background, // #FFF8F7
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  /* Syslink Bar */
  syslinkBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  syslinkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseContainer: {
    width: 8,
    height: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    opacity: 0.3,
  },
  pulseCore: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  syslinkText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
  },
  syslinkRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  latencyText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },

  /* Header Block */
  headerBlock: {
    marginBottom: 18,
  },
  tagPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFE1E0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 8,
  },
  tagPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.ink,
    letterSpacing: -0.5,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: 6,
  },

  /* Mini Radar Status Card */
  radarCard: {
    backgroundColor: '#FFF0EF',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  radarCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  radarIconSquare: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarTextCol: {
    flex: 1,
  },
  radarGridTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.ink,
    letterSpacing: 0.5,
  },
  radarGridSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  onlineBadge: {
    backgroundColor: '#FFDAD8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  onlineBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.5,
  },

  /* Segmented Toggle */
  toggleBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 24,
    padding: 3,
    marginBottom: 20,
  },
  toggleBtnActive: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.primaryDeep,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleBtnTextActive: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  toggleBtnInactive: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 20,
  },
  toggleBtnTextInactive: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },

  /* Form Card */
  formCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFDAD6',
    borderWidth: 1,
    borderColor: Colors.rose,
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12,
    color: Colors.rose,
    fontWeight: '700',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.ink,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFF8F7',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.ink,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginTop: 6,
  },
  submitBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  demoBtn: {
    backgroundColor: '#FFF0EF',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  demoBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.ink,
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: '#FFE9E8',
    marginVertical: 18,
  },
  registerLink: {
    alignItems: 'center',
  },
  registerLinkText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  registerHighlight: {
    color: Colors.primary,
    fontWeight: '800',
  },
});
