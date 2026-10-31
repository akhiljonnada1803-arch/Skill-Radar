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
  Platform,
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
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('intermediate');
  const [weeklyStudyMinutes, setWeeklyStudyMinutes] = useState(750); // 12.5h default
  const [careerGoal, setCareerGoal] = useState('Staff Systems Researcher in Distributed LLM Serving');
  const [targetSector, setTargetSector] = useState('Infrastructure & Machine Learning Systems Labs');
  const [selectedDomains, setSelectedDomains] = useState<string[]>(['ai', 'systems']);
  const [skillsList, setSkillsList] = useState<string[]>([
    'Python 3.12',
    'CUDA / C++',
    'Linux Kernel',
    'PyTorch',
    'Rust',
    'Go',
  ]);
  const [newSkillText, setNewSkillText] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || 'A. Vance // CS-28');
      setExperienceLevel(profile.experience_level || 'intermediate');
      setWeeklyStudyMinutes(profile.weekly_study_minutes || 750);
      if (profile.career_goal) setCareerGoal(profile.career_goal);
      if (profile.interests && profile.interests.length > 0) {
        setSelectedDomains(profile.interests);
      }
      if (profile.current_skills && profile.current_skills.length > 0) {
        setSkillsList(profile.current_skills);
      }
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
      career_goal: careerGoal,
      interests: selectedDomains,
      current_skills: skillsList,
    });
  };

  const handleToggleDomain = (tag: string) => {
    if (selectedDomains.includes(tag)) {
      if (selectedDomains.length <= 1) {
        Alert.alert('Required Constraint', 'Keep at least one domain specialization active.');
        return;
      }
      setSelectedDomains(selectedDomains.filter((t) => t !== tag));
    } else {
      setSelectedDomains([...selectedDomains, tag]);
    }
  };

  const handleAddSkill = () => {
    const val = newSkillText.trim();
    if (!val) return;
    if (skillsList.includes(val)) {
      setNewSkillText('');
      return;
    }
    setSkillsList([...skillsList, val]);
    setNewSkillText('');
  };

  const handleRemoveSkill = (skill: string) => {
    setSkillsList(skillsList.filter((s) => s !== skill));
  };

  const handleLogout = async () => {
    const doLogout = async () => {
      try {
        await logout();
        queryClient.clear();
        router.replace('/auth/login');
      } catch (err) {
        console.error('Logout error:', err);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' && window.confirm
        ? window.confirm('Are you sure you wish to log out from this field session?')
        : true;
      if (confirmed) {
        await doLogout();
      }
      return;
    }

    Alert.alert('Confirm Departure', 'Are you sure you wish to log out from this field session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: doLogout,
      },
    ]);
  };

  const domainOptions = [
    { tag: 'ai', title: 'AI & LLM Inference', code: '#SPEC-01' },
    { tag: 'systems', title: 'Systems & eBPF', code: '#SPEC-02' },
    { tag: 'wasm', title: 'Compiler & WASM', code: '#SPEC-03' },
    { tag: 'gpu', title: 'Edge Compute & GPU', code: '#SPEC-04' },
    { tag: 'distrib', title: 'Distributed Consensus', code: '#SPEC-05' },
    { tag: 'crypto', title: 'Applied Cryptography', code: '#SPEC-06' },
  ];

  const weeklyHours = (weeklyStudyMinutes / 60).toFixed(1);
  const dailySpecimens = (parseFloat(weeklyHours) / 5).toFixed(1);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Archival Page Frame */}
        <View style={styles.pageFrame}>
          {/* Corner Registration Marks */}
          <Text style={styles.cropMarkTL}>+</Text>
          <Text style={styles.cropMarkTR}>+</Text>
          <Text style={styles.cropMarkBL}>+</Text>
          <Text style={styles.cropMarkBR}>+</Text>

          {/* Top Document Meta Header */}
          <View style={styles.documentMetaHeader}>
            <View style={styles.metaHeaderRow}>
              <View style={styles.formRefBadge}>
                <Text style={styles.formRefBadgeText}>FORM REF: SR-2026/ONBOARDING</Text>
              </View>
              <Text style={styles.fieldIntakeTag}>FIELD INTAKE // 01-SR</Text>
            </View>

            <View style={styles.titleRow}>
              <Text style={styles.pageTitle}>Cadet Survey & Profile Ledger</Text>
              <Text style={styles.archiveStationText}>
                ARCHIVE STATION: NORTH QUAD // SPEC-2026
              </Text>
            </View>

            <Text style={styles.pageSubtitle}>
              Complete the field dossier below to calibrate radar sensitivity and specimen telemetry to your technical trajectory. All inputs are indelibly inscribed.
            </Text>
          </View>

          {/* SECTION 01: Candidate Name & Identifier */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderLine}>
              <Text style={styles.sectionHeaderLabel}>01 // CANDIDATE NAME & IDENTIFIER</Text>
              <Text style={styles.fieldReadyTag}>[FIELD READY]</Text>
            </View>

            <View style={styles.underlinedInputRow}>
              <Text style={styles.underlinedInputPrefix}>FULL NAME:</Text>
              <TextInput
                style={styles.underlinedTextInput}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="e.g. Elena Rostova // ML-04"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            <View style={styles.subtextMetaRow}>
              <Text style={styles.subtextMeta}>PRINT OR INSCRIBE LEGIBLY</Text>
              <Text style={styles.subtextMeta}>REGISTRY ID: #SR-9942</Text>
            </View>
          </View>

          {/* SECTION 02: Domain Specializations */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderLine}>
              <Text style={styles.sectionHeaderLabel}>02 // DOMAIN INTERESTS</Text>
              <Text style={styles.sectionHeaderActionTag}>[SELECT MINIMUM 2]</Text>
            </View>

            <View style={styles.domainsGrid}>
              {domainOptions.map((opt) => {
                const isSelected = selectedDomains.includes(opt.tag);
                return (
                  <TouchableOpacity
                    key={opt.tag}
                    style={[styles.domainChip, isSelected && styles.domainChipSelected]}
                    onPress={() => handleToggleDomain(opt.tag)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.domainChipLeft}>
                      <View style={[styles.statusBox, isSelected && styles.statusBoxChecked]}>
                        <Text style={[styles.statusBoxText, isSelected && styles.statusBoxTextChecked]}>
                          {isSelected ? '✕' : ''}
                        </Text>
                      </View>
                      <Text style={styles.domainChipTitle}>{opt.title}</Text>
                    </View>
                    <Text style={styles.domainChipCode}>{opt.code}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* SECTION 03: Current Practiced Skills */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderLine}>
              <Text style={styles.sectionHeaderLabel}>03 // CURRENT PRACTICED SKILLS</Text>
              <Text style={styles.skillsLoggedTag}>[{skillsList.length} LOGGED]</Text>
            </View>

            {/* Add Skill Underlined Blank */}
            <View style={styles.addSkillBlankRow}>
              <Text style={styles.addSkillPrefix}>ADD SKILL:</Text>
              <TextInput
                style={styles.addSkillInput}
                value={newSkillText}
                onChangeText={setNewSkillText}
                onSubmitEditing={handleAddSkill}
                placeholder="Type skill & press [+] (e.g. Zig, Docker, Triton)..."
                placeholderTextColor={Colors.textMuted}
              />
              <TouchableOpacity
                style={styles.addSkillBtn}
                onPress={handleAddSkill}
                activeOpacity={0.8}
              >
                <Text style={styles.addSkillBtnText}>[+]</Text>
              </TouchableOpacity>
            </View>

            {/* Skill Slips Container */}
            <View style={styles.skillsSlipContainer}>
              {skillsList.map((skill) => (
                <View key={skill} style={styles.skillSlip}>
                  <Text style={styles.skillSlipText}>[ {skill} ]</Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveSkill(skill)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.skillSlipRemove}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>

          {/* SECTION 04: Experience Level (Rubber-Stamp Style) */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderLine}>
              <Text style={styles.sectionHeaderLabel}>04 // STATION RANK / EXPEDITION LEVEL</Text>
              <Text style={styles.rankChooseTag}>[CHOOSE 1 RUBBER STAMP]</Text>
            </View>

            <View style={styles.stampsRow}>
              {/* Stamp 1: Novice */}
              <TouchableOpacity
                style={[
                  styles.stampCard,
                  styles.stampNovice,
                  experienceLevel === 'beginner' && styles.stampCardActive,
                ]}
                onPress={() => setExperienceLevel('beginner')}
                activeOpacity={0.8}
              >
                <Text style={styles.stampCardTag}>STAMP #01</Text>
                <Text style={styles.stampCardRank}>NOVICE EXPLORER</Text>
                <Text style={styles.stampCardLogged}>&lt; 1 YEAR LOGGED</Text>
              </TouchableOpacity>

              {/* Stamp 2: Surveyor */}
              <TouchableOpacity
                style={[
                  styles.stampCard,
                  styles.stampSurveyor,
                  experienceLevel === 'intermediate' && styles.stampSurveyorActive,
                ]}
                onPress={() => setExperienceLevel('intermediate')}
                activeOpacity={0.8}
              >
                <Text style={styles.stampSurveyorTag}>★ SEAL VERIFIED ★</Text>
                <Text style={styles.stampSurveyorRank}>PRACTICING SURVEYOR</Text>
                <Text style={styles.stampSurveyorLogged}>1 – 3 YEARS LOGGED</Text>
              </TouchableOpacity>

              {/* Stamp 3: Senior */}
              <TouchableOpacity
                style={[
                  styles.stampCard,
                  styles.stampSenior,
                  experienceLevel === 'advanced' && styles.stampSeniorActive,
                ]}
                onPress={() => setExperienceLevel('advanced')}
                activeOpacity={0.8}
              >
                <Text style={styles.stampSeniorTag}>STAMP #03</Text>
                <Text style={styles.stampSeniorRank}>SENIOR OPERATOR</Text>
                <Text style={styles.stampSeniorLogged}>4+ YEARS LOGGED</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* SECTION 05: Career Trajectory & Goal */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderLine}>
              <Text style={styles.sectionHeaderLabel}>05 // CAREER TRAJECTORY & GOAL</Text>
              <Text style={styles.ledgerInscriptionTag}>[LEDGER INSCRIPTION]</Text>
            </View>

            <View style={styles.ruledLedgerContainer}>
              <View style={styles.ruledLineRow}>
                <Text style={styles.ruledLineLabel}>I AM PREPARING FOR:</Text>
                <TextInput
                  style={styles.ruledLineInput}
                  value={careerGoal}
                  onChangeText={setCareerGoal}
                />
              </View>

              <View style={styles.ruledLineRow}>
                <Text style={styles.ruledLineLabel}>WITHIN SECTOR:</Text>
                <TextInput
                  style={styles.ruledLineInput}
                  value={targetSector}
                  onChangeText={setTargetSector}
                />
              </View>
            </View>
          </View>

          {/* SECTION 06: Weekly Field Study Allocation */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderLine}>
              <Text style={styles.sectionHeaderLabel}>06 // WEEKLY FIELD STUDY ALLOCATION</Text>
              <Text style={styles.hoursTag}>MEASURED IN HOURS</Text>
            </View>

            {/* Slider readout stamped badge */}
            <View style={styles.sliderReadoutCard}>
              <View style={styles.readoutLeft}>
                <Ionicons name="timer-outline" size={20} color={Colors.primary} />
                <View>
                  <Text style={styles.readoutLabel}>REGISTERED INTENSITY:</Text>
                  <Text style={styles.readoutValue}>[ {weeklyHours} HOURS / WEEK ]</Text>
                </View>
              </View>
              <Text style={styles.readoutRate}>~{dailySpecimens} specimens analyzed daily</Text>
            </View>

            {/* Quick Allocation Buttons with Ruled Ticks */}
            <View style={styles.hoursButtonRow}>
              {[120, 300, 600, 750, 1200, 1800].map((mins) => {
                const isSelected = weeklyStudyMinutes === mins;
                return (
                  <TouchableOpacity
                    key={mins}
                    style={[styles.hoursTickBtn, isSelected && styles.hoursTickBtnSelected]}
                    onPress={() => setWeeklyStudyMinutes(mins)}
                  >
                    <Text style={styles.hoursTickLine}>|</Text>
                    <Text style={[styles.hoursTickLabel, isSelected && styles.hoursTickLabelSelected]}>
                      {mins / 60}H{mins === 1800 ? '+' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Action Verification Divider & Submit Button */}
          <View style={styles.submitContainer}>
            <TouchableOpacity
              style={[styles.submitBtn, savedSuccess && styles.submitBtnSuccess]}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <Text style={styles.submitBtnText}>
                {savedSuccess
                  ? 'RECORDED IN SURVEY LEDGER ✓'
                  : 'INSCRIBE & INITIALIZE RADAR TELEMETRY'}
              </Text>
              <Ionicons
                name={savedSuccess ? 'checkmark-circle' : 'arrow-forward'}
                size={18}
                color={Colors.canvas}
              />
            </TouchableOpacity>

            <View style={styles.sealMetaRow}>
              <Text style={styles.sealText}>
                REGISTRATION SEAL APPLIED // ED.2026 // SKILLRADAR DEPLOYMENT
              </Text>
              <Text style={styles.provisionalStatus}>[STATUS: PROVISIONAL]</Text>
            </View>
          </View>

          {/* Session Departure / Logout */}
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Text style={styles.logoutBtnText}>[DEPART FIELD STATION / LOGOUT]</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background, // #FFF9EB
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  /* Archival Page Frame */
  pageFrame: {
    backgroundColor: Colors.canvas, // #F1EBDD
    borderWidth: 1,
    borderColor: Colors.ink,
    padding: 16,
    position: 'relative',
    shadowColor: Colors.ink,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  cropMarkTL: { position: 'absolute', top: 4, left: 6, fontFamily: 'monospace', fontSize: 10, color: Colors.ink },
  cropMarkTR: { position: 'absolute', top: 4, right: 6, fontFamily: 'monospace', fontSize: 10, color: Colors.ink },
  cropMarkBL: { position: 'absolute', bottom: 4, left: 6, fontFamily: 'monospace', fontSize: 10, color: Colors.ink },
  cropMarkBR: { position: 'absolute', bottom: 4, right: 6, fontFamily: 'monospace', fontSize: 10, color: Colors.ink },

  /* Top Document Meta Header */
  documentMetaHeader: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.ink,
    paddingBottom: 12,
    marginBottom: 16,
  },
  metaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  formRefBadge: {
    backgroundColor: Colors.ink,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  formRefBadgeText: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '700',
    color: Colors.canvas,
    letterSpacing: 0.8,
  },
  fieldIntakeTag: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.8,
  },
  titleRow: {
    marginTop: 4,
  },
  pageTitle: {
    fontFamily: 'serif',
    fontSize: 22,
    fontWeight: '700',
    color: Colors.ink,
    letterSpacing: -0.5,
    lineHeight: 26,
  },
  archiveStationText: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: Colors.textSecondary,
    letterSpacing: 0.6,
    marginTop: 3,
    textTransform: 'uppercase',
  },
  pageSubtitle: {
    fontFamily: 'serif',
    fontSize: 13,
    fontStyle: 'italic',
    color: Colors.textSecondary,
    marginTop: 8,
    lineHeight: 18,
  },

  /* Sections */
  sectionContainer: {
    marginTop: 14,
    paddingTop: 4,
  },
  sectionHeaderLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingBottom: 4,
    marginBottom: 8,
  },
  sectionHeaderLabel: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '700',
    color: Colors.ink,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  fieldReadyTag: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: Colors.moss,
    fontWeight: '700',
  },
  sectionHeaderActionTag: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.8,
  },

  /* Section 01 Inputs */
  underlinedInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: Colors.ink,
    paddingVertical: 4,
  },
  underlinedInputPrefix: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '700',
    color: Colors.ink,
  },
  underlinedTextInput: {
    flex: 1,
    fontFamily: 'serif',
    fontSize: 16,
    fontWeight: '600',
    color: Colors.ink,
    paddingVertical: 2,
  },
  subtextMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  subtextMeta: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },

  /* Section 02 Domains Grid */
  domainsGrid: {
    gap: 8,
    marginTop: 4,
  },
  domainChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.canvas,
    borderWidth: 1,
    borderColor: Colors.ink,
    padding: 10,
    shadowColor: Colors.ink,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  domainChipSelected: {
    backgroundColor: Colors.surface,
  },
  domainChipLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBox: {
    width: 16,
    height: 16,
    borderWidth: 1,
    borderColor: Colors.ink,
    backgroundColor: Colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBoxChecked: {
    backgroundColor: Colors.primary,
  },
  statusBoxText: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '700',
    color: Colors.ink,
  },
  statusBoxTextChecked: {
    color: Colors.canvas,
  },
  domainChipTitle: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '700',
    color: Colors.ink,
  },
  domainChipCode: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: Colors.textSecondary,
  },

  /* Section 03 Skills */
  skillsLoggedTag: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: Colors.textSecondary,
  },
  addSkillBlankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.ink,
    paddingBottom: 4,
    marginBottom: 8,
  },
  addSkillPrefix: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: Colors.ink,
    marginRight: 6,
  },
  addSkillInput: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: 11,
    color: Colors.ink,
    paddingVertical: 2,
  },
  addSkillBtn: {
    backgroundColor: Colors.ink,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  addSkillBtnText: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '700',
    color: Colors.canvas,
  },
  skillsSlipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  skillSlip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: Colors.ink,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  skillSlipText: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: Colors.ink,
  },
  skillSlipRemove: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
  },

  /* Section 04 Rubber-Stamps */
  rankChooseTag: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: Colors.textSecondary,
  },
  stampsRow: {
    gap: 10,
    marginTop: 4,
  },
  stampCard: {
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  stampNovice: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.ink,
    backgroundColor: Colors.canvas,
    transform: [{ rotate: '-1deg' }],
  },
  stampCardActive: {
    borderWidth: 3,
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  stampCardTag: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: Colors.textSecondary,
    letterSpacing: 0.8,
  },
  stampCardRank: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: '700',
    color: Colors.ink,
  },
  stampCardLogged: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: Colors.textMuted,
  },
  stampSurveyor: {
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: Colors.canvas,
    transform: [{ rotate: '1.5deg' }],
  },
  stampSurveyorActive: {
    borderWidth: 4,
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
    shadowColor: Colors.ink,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  stampSurveyorTag: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '700',
    color: Colors.canvas,
    letterSpacing: 0.8,
  },
  stampSurveyorRank: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: '700',
    color: Colors.canvas,
  },
  stampSurveyorLogged: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '700',
    color: Colors.canvas,
  },
  stampSenior: {
    borderWidth: 2,
    borderColor: Colors.moss,
    backgroundColor: Colors.canvas,
    transform: [{ rotate: '-1.5deg' }],
  },
  stampSeniorActive: {
    borderWidth: 3,
    backgroundColor: Colors.surface,
  },
  stampSeniorTag: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: Colors.moss,
    letterSpacing: 0.8,
  },
  stampSeniorRank: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: '700',
    color: Colors.moss,
  },
  stampSeniorLogged: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: Colors.textSecondary,
  },

  /* Section 05 Ruled Ledger Lines */
  ledgerInscriptionTag: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '700',
    color: Colors.ochre,
  },
  ruledLedgerContainer: {
    gap: 8,
  },
  ruledLineRow: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.ink,
    paddingBottom: 4,
  },
  ruledLineLabel: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: Colors.ink,
    letterSpacing: 0.6,
  },
  ruledLineInput: {
    fontFamily: 'serif',
    fontSize: 14,
    fontWeight: '600',
    color: Colors.ink,
    paddingVertical: 2,
  },

  /* Section 06 Weekly Study Slider Readout */
  hoursTag: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: Colors.ink,
  },
  sliderReadoutCard: {
    backgroundColor: Colors.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: Colors.ink,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: Colors.ink,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  readoutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  readoutLabel: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: Colors.textSecondary,
    letterSpacing: 0.8,
  },
  readoutValue: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: '700',
    color: Colors.ink,
  },
  readoutRate: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '700',
    color: Colors.moss,
    flexShrink: 1,
    textAlign: 'right',
  },
  hoursButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    marginTop: 8,
  },
  hoursTickBtn: {
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  hoursTickBtnSelected: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  hoursTickLine: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: Colors.ink,
  },
  hoursTickLabel: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: Colors.ink,
  },
  hoursTickLabelSelected: {
    fontWeight: '700',
    color: Colors.primary,
  },

  /* Submit Container */
  submitContainer: {
    borderTopWidth: 2,
    borderTopColor: Colors.ink,
    paddingTop: 16,
    marginTop: 20,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.ink,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.ink,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  submitBtnSuccess: {
    backgroundColor: Colors.moss,
  },
  submitBtnText: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: '800',
    color: Colors.canvas,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  sealMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sealText: {
    fontFamily: 'monospace',
    fontSize: 8,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    flex: 1,
  },
  provisionalStatus: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '700',
    color: Colors.primary,
  },

  /* Logout */
  logoutBtn: {
    marginTop: 18,
    alignItems: 'center',
    paddingVertical: 8,
  },
  logoutBtnText: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});
