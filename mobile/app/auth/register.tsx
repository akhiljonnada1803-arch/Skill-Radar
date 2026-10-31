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
import { api } from '../../src/api/client';
import { Colors } from '../../src/theme/colors';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();

  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<'ai' | 'kernel' | 'compilers' | 'distributed'>('ai');
  const [policyAccepted, setPolicyAccepted] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Entropy evaluation matching design specification
  const computeEntropy = (val: string) => {
    const len = val.length;
    const hasNum = /[0-9]/.test(val);
    const hasSym = /[^A-Za-z0-9]/.test(val);

    let score = 0;
    if (len >= 4) score++;
    if (len >= 8) score++;
    if (hasNum) score++;
    if (hasSym) score++;

    let label = 'ENTROPY: NOMINAL';
    let labelColor = Colors.secondary;

    if (score === 0) {
      label = 'ENTROPY: NOMINAL';
      labelColor = Colors.secondary;
    } else if (score <= 2) {
      label = 'ENTROPY: WEAK';
      labelColor = Colors.rose;
    } else if (score === 3) {
      label = 'ENTROPY: STRONG';
      labelColor = Colors.secondary;
    } else {
      label = 'ENTROPY: CIPHER GRADE';
      labelColor = Colors.primaryDeep;
    }

    return {
      score,
      label,
      labelColor,
      has8Chars: len >= 8,
      hasNum,
      hasSym,
    };
  };

  const entropy = computeEntropy(password);

  const getMeterColor = (barIndex: number) => {
    if (entropy.score < barIndex) {
      return Colors.surfaceContainerHighest; // Inactive
    }
    if (entropy.score <= 2) {
      return Colors.secondaryContainer;
    }
    if (entropy.score === 3) {
      return Colors.secondary;
    }
    return Colors.primaryDeep;
  };

  const handleRegister = async () => {
    if (!email.trim() || !password) {
      setError('Institutional email and master passcode are required.');
      return;
    }
    if (password.length < 6) {
      setError('Master passcode must be at least 6 characters.');
      return;
    }
    if (!policyAccepted) {
      setError('Please agree to the Cadet Code of Conduct to proceed.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await register(email.trim(), password);
      if (handle.trim()) {
        try {
          await api.updateProfile({
            display_name: handle.trim(),
            interests: [selectedTrack],
          });
        } catch {
          // Non-critical profile enrichment
        }
      }
      router.replace('/domain-select');
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Email may already be enrolled.');
    } finally {
      setSubmitting(false);
    }
  };

  const tracks = [
    { id: 'ai', name: 'AI Systems', icon: 'hardware-chip-outline' },
    { id: 'kernel', name: 'Kernel & OS', icon: 'layers-outline' },
    { id: 'compilers', name: 'Compilers', icon: 'terminal-outline' },
    { id: 'distributed', name: 'Distributed', icon: 'git-network-outline' },
  ] as const;

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        <View style={styles.topHeaderLeft}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/auth/login'))}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={18} color={Colors.ink} />
          </TouchableOpacity>
          <View style={styles.brandGroup}>
            <Text style={styles.brandTitle}>SKILLRADAR</Text>
            <View style={styles.versionBadge}>
              <Text style={styles.versionBadgeText}>V2.4</Text>
            </View>
          </View>
        </View>
        <View style={styles.avatarCircle}>
          <Ionicons name="person" size={16} color="#FFFFFF" />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Index Tag */}
        <View style={styles.tagPillRow}>
          <View style={styles.pulsingDot} />
          <Text style={styles.tagPillText}>INDEX / REGISTRATION • CADET ENLISTMENT</Text>
        </View>

        {/* Title & Subtitle */}
        <Text style={styles.mainTitle}>CREATE RADAR DOSSIER</Text>
        <Text style={styles.subtitle}>
          Establish your verified researcher profile to track emerging specs and machine learning architectures.
        </Text>

        {/* Monolith Sector 07 Card */}
        <View style={styles.sectorCard}>
          <View style={styles.sectorTextCol}>
            <Text style={styles.sectorLabel}>MONOLITH SECTOR 07</Text>
            <Text style={styles.sectorTitle}>ENLISTMENT ACTIVE</Text>
          </View>
          <View style={styles.sectorBadge}>
            <Ionicons name="shield-checkmark" size={20} color={Colors.primaryDeep} />
          </View>
        </View>

        {/* Segmented Sign In / Create Account Toggle */}
        <View style={styles.toggleBar}>
          <TouchableOpacity
            style={styles.toggleBtnInactive}
            onPress={() => router.push('/auth/login')}
            activeOpacity={0.8}
          >
            <Ionicons name="log-in-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.toggleBtnTextInactive}>Sign In</Text>
          </TouchableOpacity>
          <View style={styles.toggleBtnActive}>
            <Ionicons name="person-add-outline" size={16} color="#FFFFFF" />
            <Text style={styles.toggleBtnTextActive}>Create Account</Text>
          </View>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={Colors.rose} style={{ marginRight: 6 }} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* REQ-01: Full Name & Callsign */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>FULL NAME & CALLSIGN</Text>
              <Text style={styles.reqTag}>REQ-01</Text>
            </View>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={18} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Alex Vance // CS-28"
                placeholderTextColor={Colors.textMuted}
                value={handle}
                onChangeText={setHandle}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* REQ-02: Institutional Email */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>INSTITUTIONAL / RESEARCH EMAIL</Text>
              <Text style={styles.reqTag}>REQ-02</Text>
            </View>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={18} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="alex@mit.edu or lab handle"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          {/* Master Passcode with Entropy Meter */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>CREATE MASTER PASSCODE</Text>
              <Text style={[styles.entropyLabel, { color: entropy.labelColor }]}>
                {entropy.label}
              </Text>
            </View>
            <View style={styles.inputContainer}>
              <Ionicons name="key-outline" size={18} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { paddingRight: 42 }]}
                placeholder="Min. 8 alphanumeric symbols"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(!showPassword)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={Colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {/* 4-bar Entropy Meter */}
            <View style={styles.meterRow}>
              <View style={[styles.meterBar, { backgroundColor: getMeterColor(1) }]} />
              <View style={[styles.meterBar, { backgroundColor: getMeterColor(2) }]} />
              <View style={[styles.meterBar, { backgroundColor: getMeterColor(3) }]} />
              <View style={[styles.meterBar, { backgroundColor: getMeterColor(4) }]} />
            </View>

            {/* Criteria Checklist Indicators */}
            <View style={styles.criteriaRow}>
              <View style={styles.criteriaItem}>
                <View style={[styles.criteriaDot, entropy.has8Chars && styles.criteriaDotActive]} />
                <Text style={styles.criteriaText}>8+ chars</Text>
              </View>
              <View style={styles.criteriaItem}>
                <View style={[styles.criteriaDot, entropy.hasNum && styles.criteriaDotActive]} />
                <Text style={styles.criteriaText}>1 numeric</Text>
              </View>
              <View style={styles.criteriaItem}>
                <View style={[styles.criteriaDot, entropy.hasSym && styles.criteriaDotActive]} />
                <Text style={styles.criteriaText}>1 symbol</Text>
              </View>
            </View>
          </View>

          {/* Primary Focus Track */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>PRIMARY FOCUS TRACK</Text>
              <Text style={styles.reqTag}>SPECIALIZATION</Text>
            </View>
            <View style={styles.trackGrid}>
              {tracks.map((t) => {
                const isSelected = selectedTrack === t.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.trackBtn, isSelected ? styles.trackBtnActive : styles.trackBtnInactive]}
                    onPress={() => setSelectedTrack(t.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.trackBtnLeft}>
                      <Ionicons
                        name={t.icon as any}
                        size={17}
                        color={isSelected ? '#FFFFFF' : Colors.textSecondary}
                      />
                      <Text style={[styles.trackBtnText, isSelected ? styles.trackBtnTextActive : styles.trackBtnTextInactive]}>
                        {t.name}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Policy Agreement Checkbox */}
          <TouchableOpacity
            style={styles.policyRow}
            onPress={() => setPolicyAccepted(!policyAccepted)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkbox, policyAccepted && styles.checkboxChecked]}>
              {policyAccepted && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
            </View>
            <Text style={styles.policyText}>
              I agree to the <Text style={styles.policyLink}>Cadet Code of Conduct</Text> &{' '}
              <Text style={styles.policyLink}>Telemetry Privacy Policy</Text>.
            </Text>
          </TouchableOpacity>

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleRegister}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.submitBtnText}>INITIALIZE NEW DOSSIER</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Federated Enrollment Divider */}
        <View style={styles.federatedDividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>FEDERATED ENROLLMENT</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Federated Buttons */}
        <View style={styles.federatedGrid}>
          <TouchableOpacity
            style={styles.federatedBtn}
            onPress={() => {
              setHandle('Alex Vance // CS-28');
              setEmail('github.cadet@skillradar.tech');
              setPassword('CadetPass2026!');
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-github" size={16} color={Colors.ink} />
            <Text style={styles.federatedBtnText}>GitHub</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.federatedBtn}
            onPress={() => {
              setHandle('Alex Vance // CS-28');
              setEmail('google.cadet@skillradar.tech');
              setPassword('CadetPass2026!');
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-google" size={16} color={Colors.ink} />
            <Text style={styles.federatedBtnText}>Google</Text>
          </TouchableOpacity>
        </View>

        {/* Footer Link */}
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Already have an active dossier?</Text>
          <TouchableOpacity onPress={() => router.push('/auth/login')}>
            <Text style={styles.footerLinkText}>Sign In here</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topHeader: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainer,
  },
  topHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.ink,
    letterSpacing: 0.5,
  },
  versionBadge: {
    backgroundColor: Colors.surfaceContainerHigh,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  versionBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  tagPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primaryContainer,
  },
  tagPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.ink,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: 16,
  },
  /* Sector Banner */
  sectorCard: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHighest,
  },
  sectorTextCol: {
    gap: 2,
  },
  sectorLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 1.2,
  },
  sectorTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.ink,
    letterSpacing: 0.2,
  },
  sectorBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primaryDeep,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
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
  /* Form Elements */
  formCard: {
    gap: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE5E5',
    borderWidth: 1,
    borderColor: Colors.rose,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.rose,
  },
  inputGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.ink,
    letterSpacing: 0.5,
  },
  reqTag: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  entropyLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  inputContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    zIndex: 1,
    padding: 4,
  },
  input: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    paddingLeft: 40,
    paddingRight: 14,
    height: 44,
    fontSize: 14,
    color: Colors.ink,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 1,
  },
  /* Entropy Meters */
  meterRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  meterBar: {
    flex: 1,
    height: 5,
    borderRadius: 3,
  },
  criteriaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  criteriaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  criteriaDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.outlineVariant,
  },
  criteriaDotActive: {
    backgroundColor: Colors.primaryDeep,
  },
  criteriaText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  /* Track Grid */
  trackGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  trackBtn: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  trackBtnActive: {
    backgroundColor: Colors.primaryDeep,
    borderColor: Colors.primaryDeep,
    shadowColor: Colors.primaryDeep,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  trackBtnInactive: {
    backgroundColor: Colors.surfaceContainerLow,
    borderColor: Colors.outlineVariant,
  },
  trackBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trackBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  trackBtnTextActive: {
    color: '#FFFFFF',
  },
  trackBtnTextInactive: {
    color: Colors.textSecondary,
  },
  /* Policy Checkbox */
  policyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: Colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primaryDeep,
    borderColor: Colors.primaryDeep,
  },
  policyText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  policyLink: {
    fontWeight: '700',
    color: Colors.ink,
    textDecorationLine: 'underline',
  },
  /* Submit Button */
  submitBtn: {
    backgroundColor: Colors.primaryDeep,
    borderRadius: 8,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
    shadowColor: Colors.primaryDeep,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  /* Federated Enrollment */
  federatedDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.surfaceContainerHighest,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
  },
  federatedGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  federatedBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 1,
  },
  federatedBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.ink,
  },
  /* Footer */
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 24,
  },
  footerText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  footerLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primaryDeep,
    textDecorationLine: 'underline',
  },
});
