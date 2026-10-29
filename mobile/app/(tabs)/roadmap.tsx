import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api/client';
import { useAuth } from '../../src/context/AuthContext';
import { Colors } from '../../src/theme/colors';
import { RoadmapItemDetail, RoadmapStatus } from '../../src/types';

export default function RoadmapScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  const { data: roadmap, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['roadmap'],
    queryFn: () => api.getCurrentRoadmap(),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ itemId, status }: { itemId: string; status: RoadmapStatus }) =>
      api.updateRoadmapItem(itemId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap'] });
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

  const completedCount = roadmap?.completed_skills || 0;
  const totalCount = roadmap?.total_skills || 0;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const renderRoadmapItem = ({ item, index }: { item: RoadmapItemDetail; index: number }) => {
    const isDone = item.status === 'done';
    const isInProgress = item.status === 'in_progress';
    const isSuggested = item.source === 'suggested';

    return (
      <TouchableOpacity
        style={[
          styles.itemCard,
          isDone && styles.itemCardDone,
          isInProgress && styles.itemCardInProgress,
        ]}
        onPress={() => router.push(`/skill/${item.slug || item.skill_id}`)}
        activeOpacity={0.8}
      >
        {/* Top accession line */}
        <View style={styles.cardHeader}>
          <View style={styles.accessionGroup}>
            <Text style={styles.accessionText}>
              SPECIMEN #{String(index + 1).padStart(2, '0')} // {item.difficulty.toUpperCase()}
            </Text>
            {isSuggested && (
              <View style={styles.suggestedBadge}>
                <Text style={styles.suggestedBadgeText}>SUGGESTED DISCOVERY</Text>
              </View>
            )}
          </View>

          {/* Status Badge Button */}
          <TouchableOpacity
            style={[
              styles.statusPill,
              isDone ? styles.statusDone : isInProgress ? styles.statusInProgress : styles.statusTodo,
            ]}
            onPress={() => handleStatusToggle(item)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.statusPillText,
                isDone ? styles.textDone : isInProgress ? styles.textInProgress : styles.textTodo,
              ]}
            >
              {isDone ? 'COMPLETED' : isInProgress ? 'IN PROGRESS' : 'TO DO'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Skill Title */}
        <Text style={[styles.itemTitle, isDone && styles.itemTitleDone]}>{item.name}</Text>

        {/* Prerequisites */}
        {item.prerequisites && item.prerequisites.length > 0 ? (
          <View style={styles.prereqRow}>
            <Text style={styles.prereqLabel}>REQUIRES:</Text>
            <Text style={styles.prereqText} numberOfLines={1}>
              {item.prerequisites.join(', ')}
            </Text>
          </View>
        ) : (
          <View style={styles.prereqRow}>
            <Text style={styles.prereqRoot}>[FOUNDATIONAL MILESTONE — NO PREREQUISITES]</Text>
          </View>
        )}

        {/* Action Link Footer */}
        <View style={styles.cardFooter}>
          <Text style={styles.cardFooterText}>OPEN STUDY DOSSIER & VIDEOS</Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top App Header */}
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.brandTitle}>SKILLRADAR EXPEDITION</Text>
          <Text style={styles.domainCode}>
            DISCIPLINE: {roadmap?.domain_name?.toUpperCase() || 'AI ENGINEERING'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.domainSwitchBtn}
          onPress={() => router.push('/domain-select')}
        >
          <Text style={styles.domainSwitchText}>SWITCH DOMAIN</Text>
        </TouchableOpacity>
      </View>

      {/* Progress & Add Skills Bar */}
      <View style={styles.surveyStrip}>
        <View style={styles.progressSection}>
          <View style={styles.progressLabelRow}>
            <Text style={styles.progressLabel}>EXPEDITION MASTERY PROGRESS:</Text>
            <Text style={styles.progressValues}>
              {completedCount} / {totalCount} ({progressPercent}%)
            </Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>

        {/* "Add latest skills" Field Stamp Button */}
        <TouchableOpacity
          style={styles.addSkillsBtn}
          onPress={() => router.push({ pathname: '/suggestions', params: { roadmapId: roadmap?.id } })}
          activeOpacity={0.8}
        >
          <View style={styles.radarBlip} />
          <Ionicons name="sparkles" size={14} color={Colors.surfaceElevated} style={{ marginRight: 6 }} />
          <Text style={styles.addSkillsBtnText}>ADD LATEST SKILLS</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>RESOLVING PREREQUISITE GRAPH...</Text>
        </View>
      ) : isError ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorTitle}>GRAPH RESOLUTION FAULT</Text>
          <Text style={styles.errorBody}>Could not load roadmap from backend.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryBtnText}>RETRY SYNC</Text>
          </TouchableOpacity>
        </View>
      ) : (roadmap?.items || []).length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={styles.emptyTitle}>NO ROADMAP COMPETENCIES</Text>
          <Text style={styles.emptyBody}>
            Tap below to initialize your curriculum for this domain.
          </Text>
          <TouchableOpacity
            style={styles.initializeBtn}
            onPress={() => router.push('/domain-select')}
          >
            <Text style={styles.initializeBtnText}>SELECT LAUNCH DOMAIN</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={roadmap?.items || []}
          keyExtractor={(item) => item.id}
          renderItem={renderRoadmapItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={Colors.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: Colors.ink,
    backgroundColor: Colors.canvas,
  },
  brandTitle: {
    fontFamily: 'serif',
    fontSize: 18,
    fontWeight: '800',
    color: Colors.ink,
  },
  domainCode: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.8,
    marginTop: 2,
  },
  domainSwitchBtn: {
    borderWidth: 1,
    borderColor: Colors.ink,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: Colors.surface,
  },
  domainSwitchText: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '700',
    color: Colors.ink,
  },
  surveyStrip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.surface,
  },
  progressSection: {
    marginBottom: 10,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.6,
  },
  progressValues: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '800',
    color: Colors.ink,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: Colors.canvas,
    borderWidth: 1,
    borderColor: Colors.ink,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.moss,
  },
  addSkillsBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.ink,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.ink,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  radarBlip: {
    width: 6,
    height: 6,
    backgroundColor: Colors.surfaceElevated,
    marginRight: 6,
  },
  addSkillsBtnText: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: '800',
    color: Colors.surfaceElevated,
    letterSpacing: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  itemCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.ink,
    padding: 14,
    shadowColor: Colors.ink,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  itemCardDone: {
    backgroundColor: 'rgba(79, 107, 74, 0.08)',
    borderLeftWidth: 4,
    borderLeftColor: Colors.moss,
  },
  itemCardInProgress: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  accessionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accessionText: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.6,
  },
  suggestedBadge: {
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: 4,
    paddingVertical: 1,
    backgroundColor: 'rgba(217, 65, 30, 0.1)',
  },
  suggestedBadgeText: {
    fontFamily: 'monospace',
    fontSize: 8,
    fontWeight: '800',
    color: Colors.primary,
  },
  statusPill: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusTodo: {
    borderColor: Colors.ink,
    backgroundColor: 'transparent',
  },
  textTodo: {
    color: Colors.ink,
  },
  statusInProgress: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(217, 65, 30, 0.12)',
  },
  textInProgress: {
    color: Colors.primary,
  },
  statusDone: {
    borderColor: Colors.moss,
    backgroundColor: Colors.moss,
  },
  textDone: {
    color: Colors.surfaceElevated,
  },
  statusPillText: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  itemTitle: {
    fontFamily: 'serif',
    fontSize: 16,
    fontWeight: '800',
    color: Colors.ink,
    lineHeight: 20,
    marginBottom: 6,
  },
  itemTitleDone: {
    color: Colors.textSecondary,
  },
  prereqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  prereqLabel: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  prereqText: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: Colors.ink,
    flex: 1,
  },
  prereqRoot: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: Colors.moss,
    fontStyle: 'italic',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 8,
  },
  cardFooterText: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.6,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingText: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginTop: 12,
  },
  errorTitle: {
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: '800',
    color: Colors.rose,
    marginBottom: 6,
  },
  errorBody: {
    fontFamily: 'serif',
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.ink,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryBtnText: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '700',
    color: Colors.surfaceElevated,
  },
  emptyTitle: {
    fontFamily: 'serif',
    fontSize: 18,
    fontWeight: '700',
    color: Colors.ink,
    marginBottom: 6,
  },
  emptyBody: {
    fontFamily: 'serif',
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  initializeBtn: {
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.ink,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  initializeBtnText: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '800',
    color: Colors.surfaceElevated,
  },
});
