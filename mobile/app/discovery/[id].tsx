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
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api/client';
import { Colors } from '../../src/theme/colors';

export function formatNewsTime(dateStr?: string | null): string {
  if (!dateStr) return 'Just now';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Recently';

  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

  if (isToday) {
    return `Today at ${timeStr}`;
  }

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();

  if (isYesterday) {
    return `Yesterday at ${timeStr}`;
  }

  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} • ${timeStr}`;
}

export function getResolvedKeyTerms(item: any): Array<{ term: string; simple_explanation: string; analogy?: string }> {
  if (item?.key_terms && Array.isArray(item.key_terms) && item.key_terms.length > 0) {
    return item.key_terms;
  }

  const combined = `${item?.title || ''} ${item?.summary || ''} ${item?.category || ''}`.toLowerCase();
  const terms: Array<{ term: string; simple_explanation: string; analogy?: string }> = [];

  if (combined.includes('agent') || combined.includes('autonomous') || combined.includes('worker') || combined.includes('mcp')) {
    terms.push({
      term: 'Autonomous Agent',
      simple_explanation: 'An AI program designed to act like a digital worker—it takes real multi-step actions (like updating spreadsheets, sending emails, or calling APIs) on its own.',
      analogy: 'Like an assistant you give a to-do list and company login to, rather than an encyclopedia you just look things up in.',
    });
    terms.push({
      term: 'Deterministic Safety',
      simple_explanation: 'Strict, unbreakable boundaries programmed into code so the AI can never do something unauthorized—guaranteeing 100% predictable behavior.',
      analogy: 'Like an elevator emergency brake—it physically stops a freefall regardless of computer errors.',
    });
    terms.push({
      term: 'Verifiable Provenance',
      simple_explanation: 'A tamper-proof digital paper trail that tracks every single decision the AI made, proving who authorized it and where the data came from.',
      analogy: 'Like an official notary stamp and video recording on an important financial agreement.',
    });
  } else if (combined.includes('exploit') || combined.includes('security') || combined.includes('bug') || combined.includes('kernel') || combined.includes('root') || combined.includes('rce')) {
    terms.push({
      term: 'Zero-Day Exploit',
      simple_explanation: 'A security bug in software that the creators do not know about yet, giving attackers a surprise backdoor.',
      analogy: 'Like discovering a secret master key before the bank even knows it exists.',
    });
    terms.push({
      term: 'Remote Code Execution (RCE)',
      simple_explanation: 'A severe security bug that lets an outsider run their own code on your computer over the internet.',
      analogy: 'Like someone controlling your home smart locks and cameras from across the world.',
    });
    terms.push({
      term: 'Linux Kernel',
      simple_explanation: 'The fundamental engine of the computer operating system that controls memory, CPU, and network hardware.',
      analogy: 'The engine room and captain of a massive ship—it has total authority over everything that runs.',
    });
  } else if (combined.includes('rag') || combined.includes('retrieval') || combined.includes('crawl') || combined.includes('robots')) {
    terms.push({
      term: 'RAG (Retrieval-Augmented Generation)',
      simple_explanation: 'A technique where an AI searches private documents or websites in real time to give accurate, up-to-date answers.',
      analogy: 'An open-book exam where the student gets to look up facts in an encyclopedia instead of relying only on memory.',
    });
    terms.push({
      term: 'Web Crawler (Bot)',
      simple_explanation: 'An automated program that scans websites across the internet to read and index their contents.',
      analogy: 'A digital librarian that visits every bookstore to catalog their shelves.',
    });
  } else {
    terms.push({
      term: 'Production Deployment',
      simple_explanation: 'Running software on real servers for actual paying customers, requiring high reliability and security.',
      analogy: 'Moving a plane from design blueprints to flying real passengers across the ocean.',
    });
    terms.push({
      term: 'Guardrails & Telemetry',
      simple_explanation: 'Continuous automated safety checks and live logging that monitor software performance and catch errors before users see them.',
      analogy: 'The instrument panel in an airplane cockpit that alerts the pilot if anything goes outside safe parameters.',
    });
  }

  return terms;
}

export default function DiscoveryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [addedSkills, setAddedSkills] = useState<Record<string, boolean>>({});
  const [isAllEnrolled, setIsAllEnrolled] = useState<boolean>(false);

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
      queryClient.invalidateQueries({ queryKey: ['roadmap', defaultRoadmapId] });
      queryClient.invalidateQueries({ queryKey: ['discovery', id] });
      queryClient.invalidateQueries({ queryKey: ['discoveries'] });
    },
    onError: (err: any) => {
      Alert.alert('Notice', err?.message || 'Error updating roadmap item.');
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
        message: `[SkillRadar Telemetry] ${item.title}\n\n${item.summary}\n\nWhy It Matters: ${item.why_it_matters || ''}`,
      });
    } catch {
      // share dismissed
    }
  };

  const handleAddAll = () => {
    if (!item?.related_skills || item.related_skills.length === 0) {
      addSkillMutation.mutate(id!);
      setIsAllEnrolled(true);
      return;
    }

    item.related_skills.forEach((s: any) => {
      addSkillMutation.mutate(s.id);
    });
    setIsAllEnrolled(true);
    Alert.alert(
      'Skills Enrolled in Roadmap!',
      'These competencies have been slotted into your curriculum chapters with study notes and practical AI missions.',
      [
        { text: 'View Roadmap', onPress: () => router.push('/(tabs)/roadmap') },
        { text: 'Stay Here' },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#440001" />
        <Text style={styles.loadingLabel}>RETRIEVING DISCOVERY DOSSIER...</Text>
      </View>
    );
  }

  if (isError || !item) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color="#A8372E" />
        <Text style={styles.errorTitle}>TELEMETRY RECORD NOT FOUND</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← RETURN TO RADAR</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isSaved = item.user_state === 'saved';
  const resolvedTerms = getResolvedKeyTerms(item);

  // Primary source resolution
  const primEv =
    item.evidence?.find((e: any) => e.evidence_role === 'primary') ||
    item.evidence?.[0] ||
    item.primary_source;

  const publishedDate = primEv?.published_at || item.created_at;
  const formattedTime = formatNewsTime(publishedDate);
  const sourceName = primEv?.source_name || item.primary_source?.source_name || 'Frontier Telemetry';
  const canonicalUrl = primEv?.canonical_url || item.primary_source?.canonical_url;
  const authorPublisher = primEv?.author_publisher || item.primary_source?.author_publisher;
  const isEmerging = item.evidence_level?.toUpperCase() === 'EMERGING';
  const isRelease = item.discovery_type === 'release';

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 1. Header Navigation Bar */}
      <View style={styles.navHeader}>
        <TouchableOpacity
          style={styles.backCircleBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={18} color="#3C070B" />
        </TouchableOpacity>

        <View style={styles.navTitleBlock}>
          <Text style={styles.navTitle}>SKILLRADAR DISPATCH</Text>
          <Text style={styles.navSubtitle}>VERIFIED TELEMETRY DOSSIER</Text>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity style={styles.actionIconBtn} onPress={handleShare} activeOpacity={0.7}>
            <Ionicons name="share-outline" size={18} color="#3C070B" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionIconBtn, isSaved && styles.actionIconBtnSaved]}
            onPress={() => saveMutation.mutate(isSaved)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={18}
              color={isSaved ? '#440001' : '#3C070B'}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* 2. Top Classification Badges */}
        <View style={styles.badgeRow}>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryPillText}>
              {item.category?.toUpperCase() || 'AI & MACHINE LEARNING'}
            </Text>
          </View>

          <View style={[styles.evidenceBadge, isEmerging ? styles.badgeEmerging : styles.badgeNew]}>
            <View style={[styles.liveDot, isEmerging ? styles.dotEmerging : styles.dotNew]} />
            <Text style={[styles.evidenceBadgeText, isEmerging ? styles.textEmerging : styles.textNew]}>
              {isEmerging ? '🔥 EMERGING BREAKTHROUGH' : '⚡ LIVE RADAR'}
            </Text>
          </View>
        </View>

        {/* 3. Editorial Article Title & Byline */}
        <Text style={styles.articleHeadline}>{item.title}</Text>

        <View style={styles.bylineCard}>
          <View style={styles.bylineLeft}>
            <Ionicons
              name={isRelease ? 'flash-outline' : 'newspaper-outline'}
              size={18}
              color="#A8372E"
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.bylineSource}>{sourceName}</Text>
              {authorPublisher && authorPublisher !== sourceName && (
                <Text style={styles.bylineAuthor}>By {authorPublisher}</Text>
              )}
            </View>
          </View>

          <View style={styles.bylineRight}>
            <View style={styles.bylineTimeRow}>
              <Ionicons name="time-outline" size={13} color="#8B716E" />
              <Text style={styles.bylineTime}>{formattedTime}</Text>
            </View>
            {canonicalUrl && (
              <TouchableOpacity
                style={styles.bylineSourceBtn}
                onPress={() => Linking.openURL(canonicalUrl)}
                activeOpacity={0.7}
              >
                <Text style={styles.bylineSourceBtnText}>Source ↗</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 4. KEY TERMS EXPLAINED FIRST (Jargon Buster) */}
        {resolvedTerms && resolvedTerms.length > 0 && (
          <View style={styles.jargonSectionCard}>
            <View style={styles.jargonHeaderRow}>
              <View style={styles.jargonTagBadge}>
                <Ionicons name="bulb" size={15} color="#A8372E" />
                <Text style={styles.jargonTagText}>TECHNICAL TERMS EXPLAINED FIRST</Text>
              </View>
              <Text style={styles.jargonCountText}>{resolvedTerms.length} CONCEPTS</Text>
            </View>
            <Text style={styles.jargonSubtitle}>
              Before reading this update, here is what these technical terms mean in simple, everyday language:
            </Text>

            <View style={styles.jargonList}>
              {resolvedTerms.map((term: any, idx: number) => (
                <View key={idx} style={styles.jargonCard}>
                  <View style={styles.jargonTermHeader}>
                    <View style={styles.jargonTermPill}>
                      <Text style={styles.jargonTermPillText}>{term.term}</Text>
                    </View>
                  </View>

                  <Text style={styles.jargonDefinitionText}>{term.simple_explanation}</Text>

                  {term.analogy && (
                    <View style={styles.analogyBox}>
                      <Text style={styles.analogyLabel}>💡 Real-World Analogy: </Text>
                      <Text style={styles.analogyText}>{term.analogy}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 5. Section 01: The Story in Plain English */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTag}>01 // THE STORY IN SIMPLE TERMS</Text>
            <View style={styles.sectionMiniBadge}>
              <Text style={styles.sectionMiniBadgeText}>PLAIN-ENGLISH BREAKDOWN</Text>
            </View>
          </View>

          <Text style={styles.bodyOverviewText}>
            {item.summary || 'Detailed architecture overview is being synthesized from verified dispatches.'}
          </Text>

          {/* Quick Metrics Bar */}
          <View style={styles.metricsBar}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>VERIFICATION</Text>
              <Text style={styles.metricVal}>PEER-CONFIRMED</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>EVIDENCE LEVEL</Text>
              <Text style={[styles.metricVal, { color: '#A8372E' }]}>
                {item.evidence_level?.toUpperCase() || 'NEW'}
              </Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>CURRICULUM</Text>
              <Text style={styles.metricVal}>
                +{item.related_skills?.length || 1} SKILLS
              </Text>
            </View>
          </View>
        </View>

        {/* 6. Section 02: Why It Matters & Strategic Value */}
        {item.why_it_matters && (
          <View style={styles.whyItMattersCard}>
            <View style={styles.whyHeaderRow}>
              <Text style={styles.whyIcon}>💡</Text>
              <Text style={styles.whyTitle}>02 // WHY IT MATTERS TO BUILDERS</Text>
            </View>
            <Text style={styles.whyBodyText}>{item.why_it_matters}</Text>
          </View>
        )}

        {/* 7. Section 03: Practical Applications & Real-World Use Cases */}
        {item.applications && item.applications.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTag}>03 // REAL-WORLD USE CASES</Text>
              <Text style={styles.useCaseCountText}>{item.applications.length} SCENARIOS</Text>
            </View>

            <View style={styles.useCasesStack}>
              {item.applications.map((app: string, idx: number) => {
                const letter = String.fromCharCode(65 + (idx % 26));
                return (
                  <View key={idx} style={styles.useCaseCard}>
                    <View style={styles.useCaseLetterCircle}>
                      <Text style={styles.useCaseLetterText}>{letter}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.useCaseLabel}>PRACTICAL SCENARIO {idx + 1}</Text>
                      <Text style={styles.useCaseText}>{app}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* 8. Section 04: Extracted Skills & Roadmap Enrollment */}
        {item.related_skills && item.related_skills.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTag}>04 // MASTER THIS SKILL (ROADMAP ENROLLMENT)</Text>
              <Text style={styles.useCaseCountText}>CURRICULUM</Text>
            </View>

            <Text style={styles.skillsHelpSubtitle}>
              These competencies connect directly to this discovery. Add them to your roadmap to unlock study notes and hands-on AI missions:
            </Text>

            <View style={styles.skillsList}>
              {item.related_skills.map((skill: any) => {
                const isLogged = addedSkills[skill.id];
                return (
                  <View key={skill.id} style={styles.skillItemCard}>
                    <View style={styles.skillItemHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.skillItemTitle}>{skill.name}</Text>
                        <View style={styles.skillMetaRow}>
                          <View style={styles.difficultyTag}>
                            <Text style={styles.difficultyTagText}>
                              {(skill.difficulty || 'Intermediate').toUpperCase()}
                            </Text>
                          </View>
                          <Text style={styles.skillMetaDot}>•</Text>
                          <Text style={styles.skillCategoryText}>Core Competency</Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={[styles.addSkillBtn, isLogged && styles.addSkillBtnDone]}
                        onPress={() => addSkillMutation.mutate(skill.id)}
                        disabled={isLogged}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={isLogged ? 'checkmark-circle' : 'add'}
                          size={15}
                          color="#FFFFFF"
                          style={{ marginRight: 4 }}
                        />
                        <Text style={styles.addSkillBtnText}>
                          {isLogged ? 'Enrolled' : 'Add to Roadmap'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* 9. Section 05: Citation & Evidence Audit (At bottom) */}
        <View style={[styles.sectionCard, { marginBottom: 100 }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTag}>05 // CITATIONS & ORIGINAL REPORTING</Text>
            <Text style={styles.sectionMiniBadgeText}>VERIFIED SOURCE</Text>
          </View>

          {item.evidence && item.evidence.length > 0 ? (
            item.evidence.map((ev: any, idx: number) => (
              <TouchableOpacity
                key={idx}
                style={styles.evidenceItem}
                onPress={() => ev.canonical_url && Linking.openURL(ev.canonical_url)}
                activeOpacity={0.8}
              >
                <View style={styles.evidenceItemLeft}>
                  <Ionicons name="newspaper-outline" size={18} color="#A8372E" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.evidenceItemTitle}>{ev.title || ev.source_name}</Text>
                    <Text style={styles.evidenceItemMeta}>
                      {ev.source_name} • {formatNewsTime(ev.published_at)}
                    </Text>
                    {ev.canonical_url && (
                      <Text style={styles.evidenceItemUrl} numberOfLines={1}>
                        {ev.canonical_url}
                      </Text>
                    )}
                  </View>
                </View>
                <Ionicons name="open-outline" size={15} color="#58413F" />
              </TouchableOpacity>
            ))
          ) : (
            <TouchableOpacity
              style={styles.evidenceItem}
              onPress={() => canonicalUrl && Linking.openURL(canonicalUrl)}
              activeOpacity={0.8}
            >
              <View style={styles.evidenceItemLeft}>
                <Ionicons name="newspaper-outline" size={18} color="#A8372E" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.evidenceItemTitle}>{sourceName}</Text>
                  <Text style={styles.evidenceItemMeta}>
                    Published by {authorPublisher || sourceName} • {formattedTime}
                  </Text>
                  {canonicalUrl && (
                    <Text style={styles.evidenceItemUrl} numberOfLines={1}>
                      {canonicalUrl}
                    </Text>
                  )}
                </View>
              </View>
              <Ionicons name="open-outline" size={15} color="#58413F" />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* 10. Floating Bottom Action Dock */}
      <View style={styles.bottomDock}>
        <TouchableOpacity
          style={[styles.bottomSaveBtn, isSaved && styles.bottomSaveBtnSaved]}
          onPress={() => saveMutation.mutate(isSaved)}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={18}
            color={isSaved ? '#440001' : '#3C070B'}
          />
          <Text style={[styles.bottomSaveBtnText, isSaved && styles.bottomSaveBtnTextSaved]}>
            {isSaved ? 'Saved' : 'Save'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bottomEnrollBtn, isAllEnrolled && styles.bottomEnrollBtnDone]}
          onPress={handleAddAll}
          activeOpacity={0.85}
        >
          <Ionicons
            name={isAllEnrolled ? 'checkmark-circle' : 'add-circle-outline'}
            size={18}
            color="#FFFFFF"
            style={{ marginRight: 6 }}
          />
          <Text style={styles.bottomEnrollBtnText}>
            {isAllEnrolled ? '✓ Enrolled in Curriculum' : '+ Add to My Roadmap'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF8F7',
  },
  centered: {
    flex: 1,
    backgroundColor: '#FFF8F7',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingLabel: {
    marginTop: 14,
    fontSize: 12,
    fontWeight: '800',
    color: '#440001',
    letterSpacing: 0.5,
  },
  errorTitle: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '800',
    color: '#3C070B',
    letterSpacing: 0.5,
  },
  backBtn: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#440001',
  },
  backBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  /* 1. Header Navigation */
  navHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: '#FFF8F7',
    borderBottomWidth: 1,
    borderBottomColor: '#DFBFBB',
  },
  backCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DFBFBB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitleBlock: {
    alignItems: 'center',
  },
  navTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#3C070B',
    letterSpacing: -0.2,
  },
  navSubtitle: {
    fontSize: 9,
    fontWeight: '700',
    color: '#A8372E',
    letterSpacing: 0.8,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DFBFBB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconBtnSaved: {
    backgroundColor: '#FFE9E8',
    borderColor: '#A8372E',
  },

  /* Content */
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 40,
  },

  /* Badges */
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  categoryPill: {
    backgroundColor: '#FFE9E8',
    borderWidth: 1,
    borderColor: '#DFBFBB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#440001',
    letterSpacing: 0.3,
  },
  evidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
  },
  badgeEmerging: {
    backgroundColor: '#FFF0EF',
    borderColor: '#A8372E',
  },
  badgeNew: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DFBFBB',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotEmerging: {
    backgroundColor: '#BA1A1A',
  },
  dotNew: {
    backgroundColor: '#58413F',
  },
  evidenceBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  textEmerging: {
    color: '#BA1A1A',
  },
  textNew: {
    color: '#58413F',
  },

  /* Article Headline */
  articleHeadline: {
    fontSize: 22,
    fontWeight: '900',
    color: '#3C070B',
    lineHeight: 28,
    letterSpacing: -0.5,
    marginBottom: 14,
  },

  /* Byline */
  bylineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DFBFBB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  bylineLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bylineSource: {
    fontSize: 12,
    fontWeight: '800',
    color: '#3C070B',
  },
  bylineAuthor: {
    fontSize: 11,
    color: '#58413F',
  },
  bylineRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 4,
  },
  bylineTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bylineTime: {
    fontSize: 11,
    fontWeight: '600',
    color: '#58413F',
  },
  bylineSourceBtn: {
    backgroundColor: '#FFE9E8',
    borderWidth: 1,
    borderColor: '#DFBFBB',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  bylineSourceBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#440001',
    letterSpacing: 0.3,
  },

  /* Jargon Buster / Key Terms Explained First */
  jargonSectionCard: {
    backgroundColor: '#FFF0EF',
    borderWidth: 1.5,
    borderColor: '#FFDAD8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#440001',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  jargonHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  jargonTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  jargonTagText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#A8372E',
    letterSpacing: 0.6,
  },
  jargonCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#773031',
    backgroundColor: '#FFE9E8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  jargonSubtitle: {
    fontSize: 12,
    color: '#58413F',
    lineHeight: 17,
    marginBottom: 12,
  },
  jargonList: {
    gap: 10,
  },
  jargonCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DFBFBB',
    borderRadius: 10,
    padding: 12,
  },
  jargonTermHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  jargonTermPill: {
    backgroundColor: '#440001',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  jargonTermPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  jargonDefinitionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3C070B',
    lineHeight: 18,
    marginBottom: 6,
  },
  analogyBox: {
    backgroundColor: '#FFF8F7',
    borderLeftWidth: 3,
    borderLeftColor: '#A8372E',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 4,
  },
  analogyLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#A8372E',
    marginBottom: 2,
  },
  analogyText: {
    fontSize: 12,
    color: '#58413F',
    lineHeight: 16,
    fontStyle: 'italic',
  },

  /* Section Card */
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DFBFBB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#3C070B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTag: {
    fontSize: 11,
    fontWeight: '900',
    color: '#A8372E',
    letterSpacing: 0.6,
  },
  sectionMiniBadge: {
    backgroundColor: '#FFF0EF',
    borderWidth: 1,
    borderColor: '#DFBFBB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sectionMiniBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#440001',
  },
  useCaseCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#58413F',
  },
  bodyOverviewText: {
    fontSize: 13,
    color: '#3C070B',
    lineHeight: 20,
    marginBottom: 14,
  },

  /* Metrics Bar */
  metricsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF8F7',
    borderWidth: 1,
    borderColor: '#DFBFBB',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8B716E',
    marginBottom: 2,
  },
  metricVal: {
    fontSize: 11,
    fontWeight: '800',
    color: '#3C070B',
  },
  metricDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#DFBFBB',
  },

  /* Why It Matters Card */
  whyItMattersCard: {
    backgroundColor: '#FFF0EF',
    borderLeftWidth: 3.5,
    borderLeftColor: '#A8372E',
    borderWidth: 1,
    borderColor: '#DFBFBB',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  whyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  whyIcon: {
    fontSize: 14,
  },
  whyTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#A8372E',
    letterSpacing: 0.5,
  },
  whyBodyText: {
    fontSize: 13,
    color: '#3C070B',
    lineHeight: 20,
    fontWeight: '500',
  },

  /* Use Cases */
  useCasesStack: {
    gap: 8,
  },
  useCaseCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFF8F7',
    borderWidth: 1,
    borderColor: '#DFBFBB',
    borderRadius: 8,
    padding: 10,
  },
  useCaseLetterCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFE9E8',
    borderWidth: 1,
    borderColor: '#DFBFBB',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  useCaseLetterText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#440001',
  },
  useCaseLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8B716E',
    letterSpacing: 0.5,
  },
  useCaseText: {
    fontSize: 12,
    color: '#3C070B',
    lineHeight: 18,
    marginTop: 2,
  },

  /* Skills List */
  skillsHelpSubtitle: {
    fontSize: 12,
    color: '#58413F',
    lineHeight: 17,
    marginBottom: 12,
  },
  skillsList: {
    gap: 8,
  },
  skillItemCard: {
    backgroundColor: '#FFF8F7',
    borderWidth: 1,
    borderColor: '#DFBFBB',
    borderRadius: 8,
    padding: 12,
  },
  skillItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  skillItemTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#3C070B',
    marginBottom: 4,
  },
  skillMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  difficultyTag: {
    backgroundColor: '#FFE9E8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  difficultyTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#440001',
  },
  skillMetaDot: {
    color: '#DFBFBB',
  },
  skillCategoryText: {
    fontSize: 10,
    color: '#58413F',
    fontWeight: '500',
  },
  addSkillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#440001',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  addSkillBtnDone: {
    backgroundColor: '#1E6F36',
  },
  addSkillBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Evidence Ledger */
  evidenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF8F7',
    borderWidth: 1,
    borderColor: '#DFBFBB',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
  },
  evidenceItemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 8,
  },
  evidenceItemTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3C070B',
  },
  evidenceItemMeta: {
    fontSize: 10,
    color: '#8B716E',
    marginTop: 2,
  },
  evidenceItemUrl: {
    fontSize: 11,
    color: '#8B716E',
    marginTop: 2,
  },

  /* 10. Bottom Dock */
  bottomDock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFF8F7',
    borderTopWidth: 1,
    borderTopColor: '#DFBFBB',
    shadowColor: '#3C070B',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 8,
  },
  bottomSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DFBFBB',
  },
  bottomSaveBtnSaved: {
    backgroundColor: '#FFE9E8',
    borderColor: '#A8372E',
  },
  bottomSaveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3C070B',
  },
  bottomSaveBtnTextSaved: {
    color: '#440001',
  },
  bottomEnrollBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 8,
    backgroundColor: '#440001',
    shadowColor: '#440001',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  bottomEnrollBtnDone: {
    backgroundColor: '#1E6F36',
  },
  bottomEnrollBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
});
