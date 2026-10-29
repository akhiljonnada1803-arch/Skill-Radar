import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Linking,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../src/api/client';
import { Colors } from '../src/theme/colors';
import { SuggestionItem } from '../src/types';

export default function SuggestionsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams();
  const roadmapId = (params.roadmapId as string) || 'roadmap-00000000-0000-0000-0000-000000000001';

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['suggestions', roadmapId],
    queryFn: () => api.getSuggestions(roadmapId),
  });

  const acceptMutation = useMutation({
    mutationFn: (discoveryId: string) => api.acceptSuggestion(roadmapId, discoveryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap'] });
      queryClient.invalidateQueries({ queryKey: ['suggestions'] });
      Alert.alert('Competency Enrolled', 'The latest skill has been inserted into your roadmap at a prerequisite-correct position.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message || 'Failed to accept suggestion.');
    },
  });

  const dismissMutation = useMutation({
    mutationFn: (discoveryId: string) => api.dismissSuggestion(roadmapId, discoveryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suggestions'] });
    },
  });

  const handleOpenLink = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Link Error', `Unable to open: ${url}`);
    });
  };

  const renderSuggestionCard = ({ item }: { item: SuggestionItem }) => {
    const isEmerging = item.evidence_level?.toUpperCase() === 'EMERGING';
    const isPaper = item.source_type?.toUpperCase() === 'PAPER';
    const dateDisplay = item.published_at
      ? new Date(item.published_at).toISOString().split('T')[0]
      : 'DATE UNKNOWN';

    return (
      <View style={styles.card}>
        {/* Registration cross corner mark */}
        <Text style={styles.cropMarkTopLeft}>+</Text>
        <Text style={styles.cropMarkBottomRight}>+</Text>

        {/* Header Stamps */}
        <View style={styles.badgeRow}>
          <View style={styles.badgesGroup}>
            {/* Paper vs Release Stamp */}
            <View style={[styles.stampBadge, isPaper ? styles.stampPaper : styles.stampRelease]}>
              <Text style={[styles.stampText, isPaper ? styles.stampTextPaper : styles.stampTextRelease]}>
                {isPaper ? 'PAPER' : 'RELEASE'}
              </Text>
            </View>

            {/* Evidence Level Stamp: NEW vs EMERGING */}
            <View style={[styles.stampBadge, isEmerging ? styles.stampEmerging : styles.stampNew]}>
              <Text style={[styles.stampText, isEmerging ? styles.stampTextEmerging : styles.stampTextNew]}>
                {item.evidence_level?.toUpperCase() || 'NEW'}
              </Text>
            </View>

            {/* Live vs Demo Badge */}
            <View style={[styles.stampBadge, item.is_seeded ? styles.stampDemo : styles.stampLive]}>
              <Text style={[styles.stampText, item.is_seeded ? styles.stampTextDemo : styles.stampTextLive]}>
                {item.is_seeded ? 'DEMO DATA' : 'LIVE SOURCE'}
              </Text>
            </View>
          </View>

          <Text style={styles.dateStamp}>{dateDisplay}</Text>
        </View>

        {/* Title & Suggested Skill */}
        <Text style={styles.skillSlugBadge}>SUGGESTED COMPETENCY // {item.skill_name.toUpperCase()}</Text>
        <Text style={styles.cardTitle}>{item.title}</Text>

        {/* Summary */}
        {item.summary ? (
          <Text style={styles.summaryText}>{item.summary}</Text>
        ) : null}

        {/* Telemetry Reason Box */}
        <View style={styles.reasonBox}>
          <Text style={styles.reasonLabel}>RADAR REASONING DISPOSITION:</Text>
          <Text style={styles.reasonText}>{item.score_reason}</Text>
        </View>

        {/* Evidence Links */}
        {item.source_links && item.source_links.length > 0 && (
          <View style={styles.evidenceSection}>
            <Text style={styles.evidenceTitle}>DOCUMENTED EVIDENCE SOURCES:</Text>
            {item.source_links.map((link, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.evidenceLinkRow}
                onPress={() => handleOpenLink(link.url)}
              >
                <Ionicons name="link-outline" size={14} color={Colors.primary} />
                <Text style={styles.evidenceLinkText} numberOfLines={1}>
                  {link.title || link.url}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.dismissBtn}
            onPress={() => dismissMutation.mutate(item.discovery_id)}
            disabled={dismissMutation.isPending}
            activeOpacity={0.8}
          >
            <Text style={styles.dismissBtnText}>DISMISS</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={() => acceptMutation.mutate(item.discovery_id)}
            disabled={acceptMutation.isPending}
            activeOpacity={0.8}
          >
            {acceptMutation.isPending ? (
              <ActivityIndicator size="small" color={Colors.surfaceElevated} />
            ) : (
              <Text style={styles.acceptBtnText}>ACCEPT INTO ROADMAP</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top App Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.ink} />
          <Text style={styles.backBtnText}>ROADMAP</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>LATEST SKILL SUGGESTIONS</Text>
      </View>

      {/* Masthead */}
      <View style={styles.masthead}>
        <Text style={styles.accessionTag}>TELEMETRY ARCHIVE // PAPER & MODEL HARVEST</Text>
        <Text style={styles.headline}>Frontier Competency Radar</Text>
        <Text style={styles.subheadline}>
          Discoveries harvested from real scientific papers (arXiv) and official model releases.
          Ranked deterministically for your selected domain.
        </Text>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>SCANNING PRE-ENRICHED TELEMETRY STORE...</Text>
        </View>
      ) : isError ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorTitle}>TELEMETRY SIGNAL FAULT</Text>
          <Text style={styles.errorBody}>Could not read stored suggestions. Offline fallback active.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryBtnText}>RE-ENGAGE SCAN</Text>
          </TouchableOpacity>
        </View>
      ) : (data?.suggestions || []).length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={styles.emptyTitle}>NO PENDING SUGGESTIONS</Text>
          <Text style={styles.emptyBody}>
            All recent discoveries have been evaluated or enrolled into your active roadmap.
          </Text>
        </View>
      ) : (
        <FlatList
          data={data?.suggestions || []}
          keyExtractor={(item) => item.discovery_id}
          renderItem={renderSuggestionCard}
          contentContainerStyle={styles.listContent}
          refreshing={isRefetching}
          onRefresh={refetch}
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ink,
    backgroundColor: Colors.canvas,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  backBtnText: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: '700',
    color: Colors.ink,
    marginLeft: 4,
  },
  topBarTitle: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: '800',
    color: Colors.ink,
    letterSpacing: 0.5,
  },
  masthead: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.canvas,
  },
  accessionTag: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 1,
  },
  headline: {
    fontFamily: 'serif',
    fontSize: 22,
    fontWeight: '800',
    color: Colors.ink,
    marginTop: 2,
  },
  subheadline: {
    fontFamily: 'serif',
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginTop: 4,
  },
  listContent: {
    padding: 16,
    gap: 16,
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
    elevation: 3,
    position: 'relative',
  },
  cropMarkTopLeft: {
    position: 'absolute',
    top: -8,
    left: 4,
    fontFamily: 'monospace',
    fontSize: 10,
    color: Colors.ink,
  },
  cropMarkBottomRight: {
    position: 'absolute',
    bottom: -8,
    right: 4,
    fontFamily: 'monospace',
    fontSize: 10,
    color: Colors.ink,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 6,
  },
  badgesGroup: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  stampBadge: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    transform: [{ rotate: '-0.8deg' }],
  },
  stampText: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  stampPaper: {
    borderColor: Colors.ink,
    backgroundColor: 'transparent',
  },
  stampTextPaper: {
    color: Colors.ink,
  },
  stampRelease: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  stampTextRelease: {
    color: Colors.surfaceElevated,
  },
  stampNew: {
    borderColor: Colors.ink,
    backgroundColor: 'transparent',
  },
  stampTextNew: {
    color: Colors.ink,
  },
  stampEmerging: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(217, 65, 30, 0.12)',
  },
  stampTextEmerging: {
    color: Colors.primary,
  },
  stampLive: {
    borderColor: Colors.moss,
    backgroundColor: 'rgba(79, 107, 74, 0.15)',
  },
  stampTextLive: {
    color: Colors.moss,
  },
  stampDemo: {
    borderColor: Colors.ochre,
    backgroundColor: 'rgba(201, 154, 46, 0.15)',
  },
  stampTextDemo: {
    color: Colors.ochre,
  },
  dateStamp: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  skillSlugBadge: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.8,
    marginTop: 4,
    marginBottom: 4,
  },
  cardTitle: {
    fontFamily: 'serif',
    fontSize: 17,
    fontWeight: '800',
    color: Colors.ink,
    lineHeight: 22,
    marginBottom: 6,
  },
  summaryText: {
    fontFamily: 'serif',
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  reasonBox: {
    backgroundColor: Colors.surfaceContainer,
    borderLeftWidth: 3,
    borderLeftColor: Colors.ink,
    padding: 8,
    marginBottom: 10,
  },
  reasonLabel: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  reasonText: {
    fontFamily: 'serif',
    fontSize: 12,
    color: Colors.ink,
    fontStyle: 'italic',
  },
  evidenceSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 8,
    marginBottom: 12,
  },
  evidenceTitle: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  evidenceLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  evidenceLinkText: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: Colors.primary,
    textDecorationLine: 'underline',
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 12,
  },
  dismissBtn: {
    flex: 1,
    backgroundColor: Colors.canvas,
    borderWidth: 1,
    borderColor: Colors.ink,
    paddingVertical: 10,
    alignItems: 'center',
    shadowColor: Colors.ink,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  dismissBtnText: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '700',
    color: Colors.ink,
    letterSpacing: 0.8,
  },
  acceptBtn: {
    flex: 2,
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.ink,
    paddingVertical: 10,
    alignItems: 'center',
    shadowColor: Colors.ink,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  acceptBtnText: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '800',
    color: Colors.surfaceElevated,
    letterSpacing: 0.8,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    lineHeight: 18,
  },
});
