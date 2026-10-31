import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/api/client';
import { Colors } from '../src/theme/colors';
import { DomainItem } from '../src/types';

export default function DomainSelectScreen() {
  const router = useRouter();
  const { selectDomain, profile } = useAuth();
  const [handle, setHandle] = useState('A. Vance // CS-28');
  const [selectedSlug, setSelectedSlug] = useState<string>(
    profile?.selected_domain_slug || 'ai-engineering'
  );
  const [selectedTier, setSelectedTier] = useState<'cadet' | 'specialist' | 'architect'>('specialist');
  const [saving, setSaving] = useState(false);

  const { data: domains, isLoading } = useQuery({
    queryKey: ['domains'],
    queryFn: () => api.getDomains(),
  });

  const handleConfirm = async () => {
    if (!domains) return;
    const domain = domains.find((d: DomainItem) => d.slug === selectedSlug) || domains[0];
    setSaving(true);
    try {
      await selectDomain(domain);
      router.replace('/(tabs)/roadmap');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={16} color={Colors.ink} />
        </TouchableOpacity>
        <View style={styles.formPill}>
          <Text style={styles.formPillText}>FORM 01-SR // INTAKE</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Architectural Document Header */}
        <View style={styles.docHeader}>
          <View style={styles.docMetaRow}>
            <Text style={styles.docMetaText}>INDEX / INTAKE DOSSIER</Text>
            <Text style={styles.docDivider}>•</Text>
            <Text style={styles.docFormText}>FORM 01-SR</Text>
          </View>
          <Text style={styles.docTitle}>Cadet Survey & Profile</Text>
          <Text style={styles.docSubtitle}>
            Configure your profile matrix to align telemetry models and algorithmic tracking to your technical path.
          </Text>
        </View>

        {/* Section 01: Identifier */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeadingRow}>
            <Text style={styles.sectionLabel}>01 / IDENTITY & HANDLE</Text>
            <Text style={styles.sectionRequired}>REQUIRED</Text>
          </View>
          <TextInput
            style={styles.input}
            value={handle}
            onChangeText={setHandle}
            placeholder="e.g. A. Vance // CS-28"
            placeholderTextColor={Colors.textMuted}
          />
          <View style={styles.idFooter}>
            <Text style={styles.idFooterLabel}>Verified System Identifier</Text>
            <Text style={styles.idFooterValue}>ID: SR-9942</Text>
          </View>
        </View>

        {/* Section 02: Domain Specialization */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeadingRow}>
            <Text style={styles.sectionLabel}>02 / DOMAIN SPECIALIZATION</Text>
            <Text style={styles.sectionHighlight}>SELECT PRIMARY VECTOR</Text>
          </View>

          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.loadingText}>CATALOGING TECHNICAL DOMAINS...</Text>
            </View>
          ) : (
            <View style={styles.domainsGrid}>
              {(domains || []).map((domain: DomainItem) => {
                const isSelected = domain.slug === selectedSlug;
                return (
                  <TouchableOpacity
                    key={domain.id}
                    style={[
                      styles.domainTile,
                      isSelected ? styles.domainTileSelected : styles.domainTileUnselected,
                    ]}
                    onPress={() => setSelectedSlug(domain.slug)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.tileHeader}>
                      <View style={styles.tileTitleRow}>
                        <Ionicons
                          name={
                            domain.slug.includes('ai')
                              ? 'hardware-chip'
                              : domain.slug.includes('mobile')
                                ? 'phone-portrait'
                                : 'cloud'
                          }
                          size={18}
                          color={isSelected ? '#FFFFFF' : Colors.primary}
                          style={{ marginRight: 8 }}
                        />
                        <Text
                          style={[
                            styles.tileName,
                            isSelected ? styles.tileNameSelected : styles.tileNameUnselected,
                          ]}
                        >
                          {domain.name}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.radioCircle,
                          isSelected ? styles.radioCircleSelected : styles.radioCircleUnselected,
                        ]}
                      >
                        {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                      </View>
                    </View>

                    <Text
                      style={[
                        styles.tileDesc,
                        isSelected ? styles.tileDescSelected : styles.tileDescUnselected,
                      ]}
                      numberOfLines={2}
                    >
                      {domain.description}
                    </Text>

                    <View style={styles.tileFooter}>
                      <View
                        style={[
                          styles.milestonePill,
                          isSelected ? styles.milestonePillSelected : styles.milestonePillUnselected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.milestonePillText,
                            isSelected ? styles.milestonePillTextSelected : styles.milestonePillTextUnselected,
                          ]}
                        >
                          {domain.skill_count} CURATED COMPETENCIES
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Section 03: Experience Matrix */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeadingRow}>
            <Text style={styles.sectionLabel}>03 / EXPERIENCE MATRIX</Text>
            <Text style={styles.sectionSubTag}>TELEMETRY LEVEL</Text>
          </View>
          <View style={styles.tierRow}>
            {(['cadet', 'specialist', 'architect'] as const).map((tier) => {
              const active = selectedTier === tier;
              return (
                <TouchableOpacity
                  key={tier}
                  style={[styles.tierBtn, active && styles.tierBtnActive]}
                  onPress={() => setSelectedTier(tier)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tierBtnText, active && styles.tierBtnTextActive]}>
                    {tier.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={styles.initializeBtn}
          onPress={handleConfirm}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.initializeBtnText}>INITIALIZE RADAR MATRIX →</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background, // #FFF8F7
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
    backgroundColor: Colors.canvas,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formPill: {
    backgroundColor: '#FFF0EF',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  formPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
  },
  scroll: {
    padding: 20,
    paddingBottom: 48,
  },
  docHeader: {
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
    marginBottom: 20,
  },
  docMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  docMetaText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  docDivider: {
    color: Colors.outlineVariant,
    fontSize: 10,
  },
  docFormText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 1,
  },
  docTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.ink,
    letterSpacing: -0.5,
    textTransform: 'uppercase',
  },
  docSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: 6,
  },

  /* Sections */
  sectionBlock: {
    marginBottom: 24,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE9E8',
    paddingBottom: 6,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.ink,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  sectionRequired: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  sectionHighlight: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.8,
  },
  sectionSubTag: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
  },

  /* Input */
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.ink,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  idFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingHorizontal: 2,
  },
  idFooterLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  idFooterValue: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.ink,
  },

  /* Domains Grid */
  domainsGrid: {
    gap: 12,
  },
  domainTile: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  domainTileSelected: {
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  domainTileUnselected: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  tileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  tileTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tileName: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  tileNameSelected: {
    color: '#FFFFFF',
  },
  tileNameUnselected: {
    color: Colors.ink,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  radioCircleUnselected: {
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
  },
  tileDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  tileDescSelected: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  tileDescUnselected: {
    color: Colors.textSecondary,
  },
  tileFooter: {
    flexDirection: 'row',
  },
  milestonePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  milestonePillSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  milestonePillUnselected: {
    backgroundColor: '#FFF0EF',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  milestonePillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  milestonePillTextSelected: {
    color: '#FFFFFF',
  },
  milestonePillTextUnselected: {
    color: Colors.textSecondary,
  },

  /* Tier Row */
  tierRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tierBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  tierBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tierBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  tierBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  /* Submit */
  initializeBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginTop: 8,
  },
  initializeBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },

  loadingBox: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 6,
  },
});
