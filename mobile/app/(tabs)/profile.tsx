import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api/client';
import { useAuth } from '../../src/context/AuthContext';
import { Colors } from '../../src/theme/colors';
import { ExperienceLevel, DomainItem } from '../../src/types';

export default function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { logout, userEmail, selectDomain } = useAuth();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.getProfile(),
  });

  const { data: domains } = useQuery({
    queryKey: ['domains'],
    queryFn: () => api.getDomains(),
  });

  const [displayName, setDisplayName] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('beginner');
  const [weeklyStudyMinutes, setWeeklyStudyMinutes] = useState(300);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || 'Operative');
      setExperienceLevel(profile.experience_level || 'beginner');
      setWeeklyStudyMinutes(profile.weekly_study_minutes || 300);
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['roadmap'] });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    },
    onError: (err: any) => {
      Alert.alert('Save Error', err?.message || 'Could not update profile.');
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      display_name: displayName,
      experience_level: experienceLevel,
      weekly_study_minutes: weeklyStudyMinutes,
    });
  };

  const handleDomainChange = async (domain: DomainItem) => {
    try {
      await selectDomain(domain);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['roadmap'] });
      Alert.alert('Domain Re-aligned', `Active roadmap switched to ${domain.name}.`);
    } catch (err: any) {
      Alert.alert('Domain Switch Error', err?.message || 'Failed to switch domain.');
    }
  };

  const handleLogout = () => {
    Alert.alert('Confirm Departure', 'Are you sure you wish to log out from this field session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/auth/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Masthead */}
        <View style={styles.masthead}>
          <Text style={styles.accessionTag}>SURVEYOR DOSSIER // FIELD RECORD #001</Text>
          <Text style={styles.title}>Operative Profile</Text>
          <Text style={styles.emailText}>AUTHENTICATED AS: {userEmail || 'alex.rivera@fieldsurvey.org'}</Text>
        </View>

        {savedSuccess && (
          <View style={styles.successBanner}>
            <Text style={styles.successBannerText}>[CONFIRMED] DOSSIER PARAMETERS COMMITTED TO DATABASE</Text>
          </View>
        )}

        {/* 1. Name & Identity */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>1. OPERATIVE IDENTITY</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>OPERATIVE CALLSIGN / NAME</Text>
            <TextInput
              style={styles.textInput}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="e.g. Alex Rivera"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        </View>

        {/* 2. Launch Domain Selection */}
        <View style={styles.card}>
          <View style={styles.domainHeaderRow}>
            <Text style={styles.cardHeader}>2. ACTIVE EXPEDITION DISCIPLINE</Text>
            <TouchableOpacity onPress={() => router.push('/domain-select')}>
              <Text style={styles.changeDomainLink}>VIEW DOMAIN CATALOG</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.fieldDesc}>
            Switching discipline switches your active prerequisite roadmap to that domain's curated milestones.
          </Text>

          <View style={styles.domainOptionList}>
            {(domains || []).map((d) => {
              const isActive = (profile?.selected_domain_slug || 'ai-engineering') === d.slug;
              return (
                <TouchableOpacity
                  key={d.id}
                  style={[styles.domainOption, isActive && styles.domainOptionActive]}
                  onPress={() => handleDomainChange(d)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.domainOptionName, isActive && styles.textPrimary]}>{d.name}</Text>
                    <Text style={styles.domainOptionCode}>CODE: {d.slug.toUpperCase()}</Text>
                  </View>
                  <View style={styles.radioBox}>
                    {isActive && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 3. Experience Level */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>3. TECHNICAL EXPERIENCE TIER</Text>
          <View style={styles.levelRow}>
            {(['beginner', 'intermediate', 'advanced'] as ExperienceLevel[]).map((lvl) => {
              const isSelected = experienceLevel === lvl;
              return (
                <TouchableOpacity
                  key={lvl}
                  style={[styles.levelBtn, isSelected && styles.levelBtnSelected]}
                  onPress={() => setExperienceLevel(lvl)}
                >
                  <Text style={[styles.levelBtnText, isSelected && styles.levelBtnTextSelected]}>
                    {lvl.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 4. Weekly Study Cadence */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>4. WEEKLY STUDY CADENCE</Text>
          <Text style={styles.studyTimeValue}>
            {Math.round(weeklyStudyMinutes / 60)} HOURS / WEEK ({weeklyStudyMinutes} MINUTES)
          </Text>
          <View style={styles.studyTimeButtons}>
            {[180, 300, 480, 600].map((mins) => {
              const isCurrent = weeklyStudyMinutes === mins;
              return (
                <TouchableOpacity
                  key={mins}
                  style={[styles.cadenceChip, isCurrent && styles.cadenceChipSelected]}
                  onPress={() => setWeeklyStudyMinutes(mins)}
                >
                  <Text style={[styles.cadenceChipText, isCurrent && styles.cadenceChipTextSelected]}>
                    {mins / 60}h
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Save Changes Button */}
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSave}
          disabled={updateMutation.isPending}
          activeOpacity={0.8}
        >
          {updateMutation.isPending ? (
            <ActivityIndicator color={Colors.surfaceElevated} />
          ) : (
            <Text style={styles.saveBtnText}>COMMIT DOSSIER UPDATES</Text>
          )}
        </TouchableOpacity>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={16} color={Colors.rose} style={{ marginRight: 6 }} />
          <Text style={styles.logoutBtnText}>TERMINATE SESSION (LOGOUT)</Text>
        </TouchableOpacity>
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
    padding: 16,
    gap: 16,
  },
  masthead: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.ink,
    paddingBottom: 14,
  },
  accessionTag: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 1,
  },
  title: {
    fontFamily: 'serif',
    fontSize: 26,
    fontWeight: '800',
    color: Colors.ink,
    marginTop: 2,
  },
  emailText: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  successBanner: {
    backgroundColor: 'rgba(79, 107, 74, 0.15)',
    borderWidth: 1,
    borderColor: Colors.moss,
    padding: 10,
  },
  successBannerText: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '700',
    color: Colors.moss,
  },
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.ink,
    padding: 16,
    shadowColor: Colors.ink,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  cardHeader: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '800',
    color: Colors.ink,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  domainHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  changeDomainLink: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: Colors.primary,
    textDecorationLine: 'underline',
    fontWeight: '700',
  },
  fieldDesc: {
    fontFamily: 'serif',
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 10,
    lineHeight: 16,
  },
  domainOptionList: {
    gap: 8,
  },
  domainOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.canvas,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 10,
  },
  domainOptionActive: {
    borderColor: Colors.primary,
    borderWidth: 1.5,
  },
  domainOptionName: {
    fontFamily: 'serif',
    fontSize: 14,
    fontWeight: '700',
    color: Colors.ink,
  },
  textPrimary: {
    color: Colors.primary,
  },
  domainOptionCode: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  radioBox: {
    width: 16,
    height: 16,
    borderWidth: 1.5,
    borderColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 8,
    height: 8,
    backgroundColor: Colors.primary,
  },
  inputGroup: {
    marginTop: 4,
  },
  inputLabel: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: Colors.canvas,
    borderWidth: 1,
    borderColor: Colors.ink,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: 'monospace',
    fontSize: 13,
    color: Colors.ink,
  },
  levelRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  levelBtn: {
    flex: 1,
    backgroundColor: Colors.canvas,
    borderWidth: 1,
    borderColor: Colors.ink,
    paddingVertical: 10,
    alignItems: 'center',
  },
  levelBtnSelected: {
    backgroundColor: Colors.primary,
  },
  levelBtnText: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '700',
    color: Colors.ink,
  },
  levelBtnTextSelected: {
    color: Colors.surfaceElevated,
  },
  studyTimeValue: {
    fontFamily: 'serif',
    fontSize: 14,
    fontWeight: '700',
    color: Colors.ink,
    marginBottom: 8,
  },
  studyTimeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  cadenceChip: {
    flex: 1,
    backgroundColor: Colors.canvas,
    borderWidth: 1,
    borderColor: Colors.ink,
    paddingVertical: 8,
    alignItems: 'center',
  },
  cadenceChipSelected: {
    backgroundColor: Colors.moss,
  },
  cadenceChipText: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '700',
    color: Colors.ink,
  },
  cadenceChipTextSelected: {
    color: Colors.surfaceElevated,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.ink,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: Colors.ink,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  saveBtnText: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: '800',
    color: Colors.surfaceElevated,
    letterSpacing: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.canvas,
    borderWidth: 1,
    borderColor: Colors.rose,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  logoutBtnText: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '700',
    color: Colors.rose,
    letterSpacing: 0.8,
  },
});
