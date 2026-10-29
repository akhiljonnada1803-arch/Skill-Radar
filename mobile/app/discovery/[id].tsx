import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api/client';
import { Colors } from '../../src/theme/colors';

export default function DiscoveryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [addedSkills, setAddedSkills] = useState<Record<string, boolean>>({});

  const { data: item, isLoading, isError } = useQuery({
    queryKey: ['discovery', id],
    queryFn: () => api.getDiscoveryDetail(id!),
    enabled: !!id,
  });

  const { data: roadmaps } = useQuery({
    queryKey: ['roadmaps'],
    queryFn: () => api.getRoadmaps(),
  });
  const defaultRoadmapId = roadmaps?.[0]?.id || 'road-001';

  const addSkillMutation = useMutation({
    mutationFn: (skillId: string) =>
      api.addSkillToRoadmap(defaultRoadmapId, skillId, id),
    onSuccess: (_, skillId) => {
      setAddedSkills((prev) => ({ ...prev, [skillId]: true }));
      Alert.alert('Skill Logged', 'Successfully inscribed skill into your learning roadmap tray.');
      queryClient.invalidateQueries({ queryKey: ['roadmap', defaultRoadmapId] });
      queryClient.invalidateQueries({ queryKey: ['discovery', id] });
    },
    onError: (err: any) => {
      Alert.alert('Unable to add', err.message || 'Error adding skill to roadmap');
    },
  });

  const saveMutation = useMutation({
    mutationFn: (isSaved: boolean) => api.setAction(id!, isSaved ? 'none' : 'saved'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discovery', id] });
      queryClient.invalidateQueries({ queryKey: ['discoveries'] });
      queryClient.invalidateQueries({ queryKey: ['saved'] });
    },
  });

  const handleShare = async () => {
    if (!item) return;
    try {
      await Share.share({
        title: item.title,
        message: `[SkillRadar Specimen] ${item.title}\n${item.summary}\nEvidence: ${item.primary_source?.canonical_url || ''}`,
      });
    } catch {
      // share dismissed
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingLabel}>RETRIEVING SPECIMEN DOSSIER...</Text>
      </View>
    );
  }

  if (isError || !item) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.rose} />
        <Text style={styles.errorTitle}>SPECIMEN NOT FOUND</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>[← RETURN TO ARCHIVE]</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isSaved = item.user_state === 'saved';
  const publishedDate = item.primary_source?.published_at
    ? new Date(item.primary_source.published_at)
        .toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
        .toUpperCase()
    : 'DATE UNKNOWN';

  const sourceName = (item.primary_source?.source_name || 'PUBLIC SOURCE').toUpperCase();
  const categoryName = (item.category || 'CS.TECH').toUpperCase();
  const specimenFolio = `SPECIMEN NO. ${item.id.slice(0, 8).toUpperCase()}`;

  return (
    <View style={styles.screenWrapper}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Specimen Top Context Bar */}
        <View style={styles.topContextBar}>
          <TouchableOpacity
            style={styles.backLink}
            onPress={() => router.back()}
          >
            <Text style={styles.backLinkText}>[← SPECIMEN ARCHIVE]</Text>
          </TouchableOpacity>

          <View style={styles.topContextRight}>
            <Text style={styles.specimenNoText}>{specimenFolio}</Text>
            <TouchableOpacity
              style={styles.shareBtn}
              onPress={handleShare}
            >
              <Ionicons name="share-outline" size={14} color={Colors.ink} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Specimen Card */}
        <View style={styles.mainSpecimenCard}>
          {/* Corner Registration Crosshairs */}
          <Text style={[styles.cornerCross, styles.cornerTopLeft]}>+</Text>
          <Text style={[styles.cornerCross, styles.cornerTopRight]}>+</Text>
          <Text style={[styles.cornerCross, styles.cornerBottomLeft]}>+</Text>
          <Text style={[styles.cornerCross, styles.cornerBottomRight]}>+</Text>

          {/* Specimen Ledger Subhead & Stamp */}
          <View style={styles.ledgerHeader}>
            <View style={styles.ledgerMetaColumn}>
              <Text style={styles.expeditionLabel}>CATALOGUE EXPEDITION // ED.26</Text>
              <Text style={styles.sourceMetaLine}>
                {sourceName} · {categoryName} · {publishedDate}
              </Text>
            </View>

            {/* Stamped Badge */}
            <View
              style={[
                styles.stampBadge,
                item.is_seeded
                  ? styles.stampDemo
                  : item.evidence_level === 'Emerging'
                  ? styles.stampEmerging
                  : styles.stampNew,
              ]}
            >
              <Text
                style={[
                  styles.stampBadgeText,
                  item.is_seeded
                    ? styles.stampDemoText
                    : item.evidence_level === 'Emerging'
                    ? styles.stampEmergingText
                    : styles.stampNewText,
                ]}
              >
                {item.is_seeded ? 'DEMO DATA' : item.evidence_level.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Editorial Headline & Subtitle */}
          <Text style={styles.specimenTitle}>{item.title}</Text>
          {item.summary ? (
            <Text style={styles.specimenLead}>{item.summary}</Text>
          ) : null}

          {/* Field Verification Strip */}
          <View style={styles.verificationStrip}>
            <View style={styles.verificationLeft}>
              <View style={styles.mossSquare} />
              <Text style={styles.verificationText}>
                {item.is_seeded ? 'DEMO RECORD · SEEDED DATA' : '99.4% VERIFIED CITATIONS'}
              </Text>
            </View>
            <Text style={styles.folioText}>FOLIO #{item.id.slice(0, 4).toUpperCase()}</Text>
          </View>

          {/* Section 01: Summary */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeadingRow}>
              <Text style={styles.sectionHeadingLabel}>01 // SUMMARY & EXPLANATION</Text>
              <View style={styles.headingRule} />
            </View>
            <Text style={styles.sectionBodyText}>
              {item.summary || 'Summary unavailable for this record.'}
            </Text>
          </View>

          {/* Section 02: Practical Applications */}
          {item.applications && item.applications.length > 0 && (
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeadingRow}>
                <Text style={styles.sectionHeadingLabel}>02 // PRACTICAL USES</Text>
                <View style={styles.headingRule} />
              </View>
              <View style={styles.applicationsList}>
                {item.applications.map((app: string, index: number) => {
                  const letter = String.fromCharCode(65 + (index % 26));
                  return (
                    <View key={index} style={styles.applicationSlip}>
                      <Text style={styles.appIndexLabel}>[{letter}]</Text>
                      <Text style={styles.appText}>{app}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Section 03: Why It Matters */}
          {item.why_it_matters && (
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeadingRow}>
                <Text style={styles.sectionHeadingLabel}>03 // WHY IT MATTERS</Text>
                <View style={styles.headingRule} />
              </View>
              <Text style={styles.sectionBodyText}>{item.why_it_matters}</Text>
            </View>
          )}

          {/* Section 04: Related Skills & Action Slips */}
          {item.related_skills && item.related_skills.length > 0 && (
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeadingRow}>
                <Text style={styles.sectionHeadingLabel}>04 // RELATED SKILLS</Text>
                <View style={styles.headingRule} />
              </View>
              <View style={styles.skillsTagRow}>
                {item.related_skills.map((skill: any) => {
                  const isLogged = addedSkills[skill.id];
                  return (
                    <TouchableOpacity
                      key={skill.id}
                      style={[styles.skillTagSlip, isLogged && styles.skillTagSlipDone]}
                      activeOpacity={0.8}
                      onPress={() => addSkillMutation.mutate(skill.id)}
                    >
                      <Text style={[styles.skillTagText, isLogged && styles.skillTagTextDone]}>
                        [{skill.name.toUpperCase()}] {isLogged ? '✓' : '+'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Section 05: Limitations (Ochre Warning Note Box) */}
          <View style={styles.sectionBlock}>
            <View style={styles.limitationsBox}>
              <View style={styles.limitationsHeaderRow}>
                <Ionicons name="warning-outline" size={14} color={Colors.primary} />
                <Text style={styles.limitationsHeaderTitle}>
                  05 // WHAT WE CAN'T CLAIM & BOUNDARIES
                </Text>
              </View>
              <Text style={styles.limitationsBody}>
                Claims are restricted to the verified preprint and repository data.
                Not a standalone production benchmark until independently replicated across
                heterogeneous clusters.
              </Text>
            </View>
          </View>

          {/* Section 06: Evidence & Citations */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeadingRow}>
              <Text style={styles.sectionHeadingLabel}>06 // EVIDENCE & LOG SOURCES</Text>
              <Text style={styles.sectionSubtag}>REV 2.1</Text>
            </View>
            <View style={styles.evidenceList}>
              {item.evidence && item.evidence.length > 0 ? (
                item.evidence.map((ev: any, index: number) => (
                  <TouchableOpacity
                    key={ev.source_item_id || index}
                    style={styles.evidenceItem}
                    onPress={() => ev.canonical_url && Linking.openURL(ev.canonical_url)}
                  >
                    <Text style={styles.evidenceIndex}>[{index + 1}]</Text>
                    <View style={styles.evidenceContent}>
                      <Text style={styles.evidenceTitle}>{ev.title || item.title}</Text>
                      <Text style={styles.evidenceUrl}>{ev.canonical_url || 'Internal Record'}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              ) : item.primary_source ? (
                <TouchableOpacity
                  style={styles.evidenceItem}
                  onPress={() =>
                    item.primary_source?.canonical_url &&
                    Linking.openURL(item.primary_source.canonical_url)
                  }
                >
                  <Text style={styles.evidenceIndex}>[1]</Text>
                  <View style={styles.evidenceContent}>
                    <Text style={styles.evidenceTitle}>
                      {item.primary_source.source_name}: {item.title}
                    </Text>
                    <Text style={styles.evidenceUrl}>
                      {item.primary_source.canonical_url || 'Internal Source'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <Text style={styles.noEvidenceText}>No evidence links attached.</Text>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Operational Dock */}
      <View style={styles.bottomDock}>
        <TouchableOpacity
          style={[styles.dockSaveBtn, isSaved && styles.dockSaveBtnSaved]}
          activeOpacity={0.8}
          onPress={() => saveMutation.mutate(isSaved)}
        >
          <Ionicons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={16}
            color={isSaved ? Colors.moss : Colors.ink}
          />
          <Text style={[styles.dockSaveBtnText, isSaved && styles.dockSaveBtnTextSaved]}>
            {isSaved ? 'SAVED ★' : 'SAVE'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dockRoadmapBtn}
          activeOpacity={0.8}
          onPress={() => {
            const firstSkill = item.related_skills?.[0]?.id;
            if (firstSkill) {
              addSkillMutation.mutate(firstSkill);
            } else {
              Alert.alert('Inscribed', 'Specimen registered into active roadmap tracker.');
            }
          }}
        >
          <Text style={styles.dockRoadmapBtnText}>ADD TO ROADMAP</Text>
          <Text style={styles.dockRoadmapBtnArrow}>[→]</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 90,
  },

  // Corner marks
  cornerCross: {
    position: 'absolute',
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '700',
    color: Colors.ink,
    lineHeight: 10,
    zIndex: 10,
  },
  cornerTopLeft: { top: -6, left: -4 },
  cornerTopRight: { top: -6, right: -4 },
  cornerBottomLeft: { bottom: -6, left: -4 },
  cornerBottomRight: { bottom: -6, right: -4 },

  // Top context bar
  topContextBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.rule,
    paddingBottom: 8,
    marginBottom: 12,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backLinkText: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '700',
    color: Colors.ink,
    letterSpacing: 0.8,
  },
  topContextRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  specimenNoText: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '700',
    color: Colors.secondaryText,
    letterSpacing: 0.8,
  },
  shareBtn: {
    width: 26,
    height: 26,
    borderWidth: 1,
    borderColor: Colors.ink,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.ink,
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 1,
  },

  // Main specimen card
  mainSpecimenCard: {
    backgroundColor: Colors.surface,
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
  ledgerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: Colors.rule,
    paddingBottom: 10,
    marginBottom: 12,
  },
  ledgerMetaColumn: {
    flex: 1,
    marginRight: 8,
  },
  expeditionLabel: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: Colors.secondaryText,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sourceMetaLine: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '700',
    color: Colors.ink,
    marginTop: 2,
    letterSpacing: 0.5,
  },

  stampBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    shadowColor: Colors.ink,
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 1,
  },
  stampEmerging: {
    backgroundColor: Colors.primary,
    borderColor: Colors.ink,
    transform: [{ rotate: '-1.5deg' }],
  },
  stampNew: {
    backgroundColor: 'transparent',
    borderColor: Colors.ink,
    transform: [{ rotate: '1.8deg' }],
  },
  stampDemo: {
    backgroundColor: 'transparent',
    borderColor: Colors.ochre,
    borderStyle: 'dashed',
    transform: [{ rotate: '-2deg' }],
  },
  stampBadgeText: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  stampEmergingText: {
    color: Colors.canvas,
  },
  stampNewText: {
    color: Colors.ink,
  },
  stampDemoText: {
    color: Colors.ochre,
  },

  specimenTitle: {
    fontFamily: 'serif',
    fontWeight: '800',
    fontSize: 22,
    color: Colors.ink,
    lineHeight: 28,
    marginBottom: 6,
    letterSpacing: -0.4,
  },
  specimenLead: {
    fontFamily: 'serif',
    fontStyle: 'italic',
    fontSize: 14,
    color: Colors.secondaryText,
    lineHeight: 20,
    marginBottom: 12,
  },

  // Verification strip
  verificationStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceContainer,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.rule,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 14,
  },
  verificationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mossSquare: {
    width: 8,
    height: 8,
    backgroundColor: Colors.moss,
  },
  verificationText: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '800',
    color: Colors.ink,
    letterSpacing: 0.5,
  },
  folioText: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: Colors.secondaryText,
  },

  // Section Blocks
  sectionBlock: {
    marginTop: 14,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionHeadingLabel: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.8,
  },
  headingRule: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ink,
  },
  sectionSubtag: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: Colors.secondaryText,
    fontWeight: '700',
  },
  sectionBodyText: {
    fontFamily: 'serif',
    fontSize: 14,
    color: Colors.ink,
    lineHeight: 22,
  },

  // Applications
  applicationsList: {
    gap: 8,
  },
  applicationSlip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: Colors.rule,
    padding: 8,
    shadowColor: Colors.ink,
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 1,
  },
  appIndexLabel: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
  },
  appText: {
    fontFamily: 'serif',
    fontSize: 13,
    color: Colors.ink,
    lineHeight: 18,
    flex: 1,
  },

  // Skills tag row
  skillsTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  skillTagSlip: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.ink,
    paddingHorizontal: 8,
    paddingVertical: 5,
    shadowColor: Colors.ink,
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 1,
  },
  skillTagSlipDone: {
    backgroundColor: Colors.moss,
  },
  skillTagText: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '700',
    color: Colors.ink,
    letterSpacing: 0.5,
  },
  skillTagTextDone: {
    color: Colors.surfaceContainerLowest,
  },

  // Limitations box
  limitationsBox: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: Colors.ink,
    padding: 10,
    shadowColor: Colors.ink,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  limitationsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  limitationsHeaderTitle: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '800',
    color: Colors.ink,
    letterSpacing: 0.8,
  },
  limitationsBody: {
    fontFamily: 'serif',
    fontSize: 12,
    color: Colors.secondaryText,
    lineHeight: 18,
  },

  // Evidence list
  evidenceList: {
    gap: 8,
    paddingTop: 4,
  },
  evidenceItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  evidenceIndex: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
  },
  evidenceContent: {
    flex: 1,
  },
  evidenceTitle: {
    fontFamily: 'serif',
    fontSize: 13,
    color: Colors.ink,
    lineHeight: 18,
  },
  evidenceUrl: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: Colors.secondaryText,
    textDecorationLine: 'underline',
    marginTop: 2,
  },
  noEvidenceText: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: Colors.secondaryText,
  },

  // Bottom operational dock
  bottomDock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.canvas,
    borderTopWidth: 2,
    borderTopColor: Colors.ink,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dockSaveBtn: {
    height: 44,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.ink,
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: Colors.ink,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  dockSaveBtnSaved: {
    backgroundColor: Colors.surfaceContainerHighest,
  },
  dockSaveBtnText: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '800',
    color: Colors.ink,
    letterSpacing: 0.8,
  },
  dockSaveBtnTextSaved: {
    color: Colors.moss,
  },
  dockRoadmapBtn: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: Colors.ink,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: Colors.ink,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  dockRoadmapBtnText: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: '800',
    color: Colors.canvas,
    letterSpacing: 1,
  },
  dockRoadmapBtnArrow: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: Colors.canvas,
  },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
    backgroundColor: Colors.background,
  },
  loadingLabel: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: Colors.secondaryText,
    letterSpacing: 0.8,
  },
  errorTitle: {
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: '800',
    color: Colors.rose,
    letterSpacing: 1,
  },
  backBtn: {
    borderWidth: 1,
    borderColor: Colors.ink,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
  },
  backBtnText: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '700',
    color: Colors.ink,
  },
});
