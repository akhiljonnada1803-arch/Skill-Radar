import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api/client';
import { useAuth } from '../../src/context/AuthContext';
import { Colors } from '../../src/theme/colors';
import { DomainItem, RoadmapItemDetail, RoadmapStatus } from '../../src/types';

export default function RoadmapScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const params = useLocalSearchParams<{ subject?: string }>();

  // State: selectedSubjectId null => show all Subjects; string => show Chapters for that subject
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(params.subject || null);

  useEffect(() => {
    if (params.subject !== undefined) {
      setSelectedSubjectId(params.subject || null);
    }
  }, [params.subject]);

  // 1. Fetch available subjects / domains
  const {
    data: domains,
    isLoading: domainsLoading,
    refetch: refetchDomains,
    isRefetching: domainsRefetching,
  } = useQuery({
    queryKey: ['domains'],
    queryFn: () => api.getDomains(),
  });

  // 2. Fetch specific roadmap when a subject is active
  const {
    data: roadmap,
    isLoading: roadmapLoading,
    isError: roadmapError,
    refetch: refetchRoadmap,
    isRefetching: roadmapRefetching,
  } = useQuery({
    queryKey: ['roadmap', selectedSubjectId],
    queryFn: () => api.getCurrentRoadmap(selectedSubjectId || undefined),
    enabled: !!selectedSubjectId,
  });

  // Toggle chapter status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ itemId, status }: { itemId: string; status: RoadmapStatus }) =>
      api.updateRoadmapItem(itemId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap'] });
      queryClient.invalidateQueries({ queryKey: ['domains'] });
    },
    onError: (err: any) => {
      Alert.alert('Status Update Error', err?.message || 'Could not update status.');
    },
  });

  const handleStatusToggle = (item: RoadmapItemDetail) => {
    const nextStatus: Record<RoadmapStatus, RoadmapStatus> = {
      todo: 'in_progress',
      in_progress: 'done',
      done: 'todo',
    };
    const target = nextStatus[item.status];
    updateStatusMutation.mutate({ itemId: item.id, status: target });
  };

  const getDomainIcon = (slug?: string): keyof typeof Ionicons.glyphMap => {
    if (!slug) return 'book-outline';
    if (slug.includes('ai')) return 'hardware-chip-outline';
    if (slug.includes('fullstack') || slug.includes('mobile')) return 'code-slash-outline';
    if (slug.includes('cloud') || slug.includes('devops')) return 'cloud-outline';
    return 'book-outline';
  };

  // ==========================================
  // RENDER: SUBJECT CARD (LEVEL 1)
  // ==========================================
  const renderSubjectCard = ({ item, index }: { item: DomainItem; index: number }) => {
    const completed = item.completed_count || 0;
    const total = item.skill_count || 1;
    const percent = Math.round((completed / total) * 100);
    const isCurrentActive = profile?.selected_domain_slug === item.slug;

    return (
      <TouchableOpacity
        style={[styles.subjectCard, isCurrentActive && styles.subjectCardActive]}
        onPress={() => setSelectedSubjectId(item.slug)}
        activeOpacity={0.7}
      >
        <View style={styles.subjectCardLeft}>
          <View style={[styles.subjectIconBox, isCurrentActive && styles.subjectIconBoxActive]}>
            <Ionicons
              name={getDomainIcon(item.slug)}
              size={22}
              color={isCurrentActive ? Colors.primary : Colors.ink}
            />
          </View>
        </View>

        <View style={styles.subjectCardMiddle}>
          <View style={styles.subjectTitleRow}>
            <Text style={styles.subjectTitle} numberOfLines={1}>
              {item.name}
            </Text>
            {isCurrentActive && (
              <View style={styles.currentBadge}>
                <Text style={styles.currentBadgeText}>Current</Text>
              </View>
            )}
          </View>

          <Text style={styles.subjectMetaText}>
            {item.skill_count} chapters • {completed} mastered ({percent}%)
          </Text>

          {/* Progress bar */}
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${percent}%` }]} />
          </View>
        </View>

        <View style={styles.subjectCardRight}>
          <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
        </View>
      </TouchableOpacity>
    );
  };

  // ==========================================
  // RENDER: CHAPTER ITEM (LEVEL 2)
  // ==========================================
  const renderChapterItem = ({ item, index }: { item: RoadmapItemDetail; index: number }) => {
    const isDone = item.status === 'done';
    const isInProgress = item.status === 'in_progress';

    return (
      <TouchableOpacity
        style={[styles.chapterCard, isDone && styles.chapterCardDone]}
        onPress={() => router.push(`/skill/${item.slug || item.skill_id}`)}
        activeOpacity={0.7}
      >
        {/* Left: Chapter Index or Checkmark */}
        <View style={[styles.chapterNumberCircle, isDone && styles.chapterNumberCircleDone]}>
          {isDone ? (
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
          ) : (
            <Text style={styles.chapterNumberText}>{index + 1}</Text>
          )}
        </View>

        {/* Middle: Title & Difficulty */}
        <View style={styles.chapterCardContent}>
          <Text style={[styles.chapterTitle, isDone && styles.chapterTitleDone]} numberOfLines={2}>
            {item.name}
          </Text>
          <View style={styles.chapterSubRow}>
            <Text style={styles.chapterDifficulty}>{item.difficulty}</Text>
            <Text style={styles.dotSeparator}>•</Text>
            <Text style={styles.chapterDetails}>Video, Notes & Task</Text>
          </View>
        </View>

        {/* Right: Quick Status Button */}
        <TouchableOpacity
          style={[
            styles.statusPill,
            isDone ? styles.statusDone : isInProgress ? styles.statusInProgress : styles.statusTodo,
          ]}
          onPress={() => handleStatusToggle(item)}
          activeOpacity={0.6}
        >
          <Text
            style={[
              styles.statusPillText,
              isDone ? styles.textDone : isInProgress ? styles.textInProgress : styles.textTodo,
            ]}
          >
            {isDone ? 'Done' : isInProgress ? 'In Progress' : 'Start'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const completedCount = roadmap?.completed_skills || 0;
  const totalCount = roadmap?.total_skills || 0;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const activeDomain = (domains || []).find(d => d.slug === selectedSubjectId || d.id === selectedSubjectId);

  return (
    <SafeAreaView style={styles.container}>
      {!selectedSubjectId ? (
        /* ======================================================== */
        /* VIEW 1: CLEAN SUBJECTS DIRECTORY                         */
        /* ======================================================== */
        <View style={{ flex: 1 }}>
          <View style={styles.header}>
            <Text style={styles.screenHeading}>Subjects</Text>
            <Text style={styles.screenSubheading}>Select a learning path to view chapters</Text>
          </View>

          {domainsLoading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : (
            <FlatList
              data={domains || []}
              keyExtractor={(item) => item.id}
              renderItem={renderSubjectCard}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={domainsRefetching}
                  onRefresh={refetchDomains}
                  tintColor={Colors.primary}
                />
              }
            />
          )}
        </View>
      ) : (
        /* ======================================================== */
        /* VIEW 2: CLEAN CHAPTER SYLLABUS                           */
        /* ======================================================== */
        <View style={{ flex: 1 }}>
          {/* Header Navigation */}
          <View style={styles.chapterNavHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setSelectedSubjectId(null)}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={18} color={Colors.ink} />
              <Text style={styles.backButtonText}>Subjects</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addSkillsButton}
              onPress={() => router.push({ pathname: '/suggestions', params: { roadmapId: roadmap?.id } })}
              activeOpacity={0.7}
            >
              <Ionicons name="sparkles-outline" size={14} color={Colors.primary} />
              <Text style={styles.addSkillsButtonText}>Add Skills</Text>
            </TouchableOpacity>
          </View>

          {/* Subject Title & Summary */}
          <View style={styles.subjectSummaryHeader}>
            <Text style={styles.selectedSubjectTitle}>
              {roadmap?.domain_name || activeDomain?.name || 'Subject Chapters'}
            </Text>
            <Text style={styles.selectedSubjectProgress}>
              {completedCount} of {totalCount} chapters completed ({progressPercent}%)
            </Text>
            <View style={styles.progressBarTrackLarge}>
              <View style={[styles.progressBarFillLarge, { width: `${progressPercent}%` }]} />
            </View>
          </View>

          {/* Chapter List */}
          {roadmapLoading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : roadmapError ? (
            <View style={styles.centerBox}>
              <Text style={styles.errorText}>Could not load chapters.</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => refetchRoadmap()}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={roadmap?.items || []}
              keyExtractor={(item) => item.id}
              renderItem={renderChapterItem}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={roadmapRefetching}
                  onRefresh={refetchRoadmap}
                  tintColor={Colors.primary}
                />
              }
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0ECEB',
  },
  screenHeading: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A0808',
    letterSpacing: -0.5,
  },
  screenSubheading: {
    fontSize: 13,
    color: '#7A6664',
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  // Subject Card Styles
  subjectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ECE5E4',
  },
  subjectCardActive: {
    borderColor: '#DFBFBB',
    backgroundColor: '#FFFAFA',
  },
  subjectCardLeft: {
    marginRight: 12,
  },
  subjectIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F5ECEB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectIconBoxActive: {
    backgroundColor: '#FFE9E8',
  },
  subjectCardMiddle: {
    flex: 1,
  },
  subjectTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  subjectTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A0808',
  },
  currentBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2D6A4F',
  },
  subjectMetaText: {
    fontSize: 12,
    color: '#7A6664',
    marginBottom: 6,
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: '#F0ECEB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  subjectCardRight: {
    marginLeft: 8,
  },

  // Chapter Header & Navigation Styles
  chapterNavHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0ECEB',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A0808',
  },
  addSkillsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#FFF0EF',
  },
  addSkillsButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  subjectSummaryHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0ECEB',
  },
  selectedSubjectTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A0808',
    letterSpacing: -0.3,
  },
  selectedSubjectProgress: {
    fontSize: 12,
    color: '#7A6664',
    marginTop: 3,
    marginBottom: 8,
  },
  progressBarTrackLarge: {
    height: 6,
    backgroundColor: '#F0ECEB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFillLarge: {
    height: '100%',
    backgroundColor: Colors.primary,
  },

  // Chapter Card Styles
  chapterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ECE5E4',
  },
  chapterCardDone: {
    backgroundColor: '#FCFCFC',
    borderColor: '#E8E8E8',
  },
  chapterNumberCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5ECEB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  chapterNumberCircleDone: {
    backgroundColor: '#2D6A4F',
  },
  chapterNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5C4342',
  },
  chapterCardContent: {
    flex: 1,
    marginRight: 8,
  },
  chapterTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A0808',
    lineHeight: 18,
  },
  chapterTitleDone: {
    color: '#5C4342',
  },
  chapterSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 4,
  },
  chapterDifficulty: {
    fontSize: 11,
    fontWeight: '600',
    color: '#944747',
    textTransform: 'capitalize',
  },
  dotSeparator: {
    fontSize: 10,
    color: '#B0A09F',
  },
  chapterDetails: {
    fontSize: 11,
    color: '#7A6664',
  },

  // Status Pill Styles
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    minWidth: 54,
    alignItems: 'center',
  },
  statusPillText: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
  statusTodo: {
    backgroundColor: '#F5ECEB',
  },
  textTodo: {
    fontSize: 11,
    fontWeight: '600',
    color: '#5C4342',
  },
  statusInProgress: {
    backgroundColor: '#FFE9E8',
  },
  textInProgress: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  statusDone: {
    backgroundColor: '#E8F5E9',
  },
  textDone: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2D6A4F',
  },

  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  errorText: {
    fontSize: 13,
    color: '#7A6664',
    marginBottom: 10,
  },
  retryBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
