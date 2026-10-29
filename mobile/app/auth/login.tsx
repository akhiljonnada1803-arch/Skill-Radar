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
import { useAuth } from '../../src/context/AuthContext';
import { Colors } from '../../src/theme/colors';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Masthead */}
        <View style={styles.masthead}>
          <Text style={styles.accessionTag}>EXPEDITION LOGBOOK // ACCESSION PORTAL</Text>
          <Text style={styles.title}>Technologist Login</Text>
          <Text style={styles.subtitle}>
            Enter your field credentials to resume competency mapping and roadmap tracking.
          </Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <View style={styles.stampHeader}>
            <Text style={styles.stampText}>STAMP // IDENTITY VERIFICATION</Text>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>[ALERT] {error}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>STUDENT EMAIL CADENCE</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. alex.chen@university.edu"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>CIPHER KEY (PASSWORD)</Text>
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
              <ActivityIndicator color={Colors.surfaceElevated} />
            ) : (
              <Text style={styles.submitBtnText}>AUTHENTICATE ENTRY</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => router.push('/auth/register')}
          >
            <Text style={styles.registerLinkText}>
              NEW FIELD OPERATIVE? <Text style={styles.underline}>REGISTER LEDGER ACCOUNT</Text>
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
    backgroundColor: Colors.background,
  },
  scroll: {
    padding: 20,
    justifyContent: 'center',
  },
  masthead: {
    marginBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: Colors.ink,
    paddingBottom: 16,
  },
  accessionTag: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  title: {
    fontFamily: 'serif',
    fontSize: 30,
    fontWeight: '800',
    color: Colors.ink,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: 'serif',
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 6,
    lineHeight: 20,
  },
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.ink,
    padding: 20,
    shadowColor: Colors.ink,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  stampHeader: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingBottom: 10,
    marginBottom: 16,
  },
  stampText: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  errorBox: {
    backgroundColor: 'rgba(186, 26, 26, 0.1)',
    borderWidth: 1,
    borderColor: Colors.rose,
    padding: 10,
    marginBottom: 16,
  },
  errorText: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: Colors.rose,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '700',
    color: Colors.ink,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.canvas,
    borderWidth: 1,
    borderColor: Colors.ink,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'monospace',
    fontSize: 14,
    color: Colors.ink,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.ink,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: Colors.ink,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
    marginTop: 8,
  },
  submitBtnText: {
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: '800',
    color: Colors.surfaceElevated,
    letterSpacing: 1,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 18,
  },
  registerLink: {
    alignItems: 'center',
  },
  registerLinkText: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: Colors.ink,
  },
  underline: {
    color: Colors.primary,
    textDecorationLine: 'underline',
    fontWeight: '700',
  },
});
