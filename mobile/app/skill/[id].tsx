import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Linking,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api/client';
import { Colors } from '../../src/theme/colors';
import { RoadmapStatus } from '../../src/types';

export default function SkillLearnScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const skillId = id || 'rag-basics';

  const [personalNote, setPersonalNote] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { data: skill, isLoading, isError, refetch } = useQuery({
    queryKey: ['skillLearn', skillId],
    queryFn: () => api.getSkillLearn(skillId),
  });

  const { data: userNote } = useQuery({
    queryKey: ['userNote', skillId],
    queryFn: () => api.getUserNote(skillId),
  });

  useEffect(() => {
    if (userNote) {
      setPersonalNote(userNote.content || '');
      setSaveStatus('saved');
    }
  }, [userNote]);

  const handleNoteChange = (text: string) => {
    setPersonalNote(text);
    setSaveStatus('dirty');

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await api.saveUserNote(skillId, text);
        setSaveStatus('saved');
      } catch {
        setSaveStatus('dirty');
      }
    }, 1000);
  };

  const handleOpenVideo = (youtubeId: string) => {
    const url = `https://www.youtube.com/watch?v=${youtubeId}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Video Error', `Unable to open YouTube: ${url}`);
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>ACCESSING CURRICULUM ARCHIVE...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !skill) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerBox}>
          <Text style={styles.errorTitle}>ARCHIVAL RECORD NOT FOUND</Text>
          <TouchableOpacity style={styles.backBtnSolid} onPress={() => router.back()}>
            <Text style={styles.backBtnSolidText}>RETURN TO ROADMAP</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.ink} />
          <Text style={styles.backBtnText}>ROADMAP</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>COMPETENCY DOSSIER</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Masthead */}
        <View style={styles.masthead}>
          <View style={styles.badgeRow}>
            <View style={styles.tierBadge}>
              <Text style={styles.tierText}>{skill.difficulty.toUpperCase()} TIER</Text>
            </View>
            <View style={[styles.statusBadge, skill.is_curated ? styles.badgeCurated : styles.badgeSuggested]}>
              <Text style={[styles.badgeText, skill.is_curated ? styles.textCurated : styles.textSuggested]}>
                {skill.is_curated ? 'CURATED CURRICULUM' : 'SUGGESTED DISCOVERY'}
              </Text>
            </View>
          </View>
          <Text style={styles.skillTitle}>{skill.name}</Text>
          {skill.prerequisites && skill.prerequisites.length > 0 && (
            <Text style={styles.prereqNote}>
              PREREQUISITES: {skill.prerequisites.join(' // ').toUpperCase()}
            </Text>
          )}
        </View>

        {/* 1. Overview */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>1. SPECIMEN OVERVIEW</Text>
          <Text style={styles.overviewText}>{skill.overview}</Text>
        </View>

        {/* 2. Verified Videos */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>2. VERIFIED VIDEO EXPEDITIONS</Text>
          {skill.videos && skill.videos.length > 0 ? (
            skill.videos.map((vid) => (
              <TouchableOpacity
                key={vid.id}
                style={styles.videoCard}
                onPress={() => handleOpenVideo(vid.youtube_id)}
                activeOpacity={0.8}
              >
                <View style={styles.videoIconBox}>
                  <Ionicons name="play" size={22} color={Colors.surfaceElevated} />
                </View>
                <View style={styles.videoInfo}>
                  <Text style={styles.videoTitle} numberOfLines={2}>
                    {vid.title}
                  </Text>
                  <Text style={styles.videoMeta}>
                    CHANNEL: {vid.channel.toUpperCase()}
                  </Text>
                  <View style={styles.verifiedStamp}>
                    <Text style={styles.verifiedStampText}>
                      [VERIFIED BY CURATOR // YOUTUBE EMBED READY]
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.noVideoBox}>
              <Ionicons name="videocam-off-outline" size={24} color={Colors.textSecondary} />
              <Text style={styles.noVideoTitle}>No verified video yet</Text>
              <Text style={styles.noVideoSubtitle}>
                This competency was added from research literature. Verified video lessons are pending curator review.
              </Text>
            </View>
          )}
        </View>

        {/* 3. Study Notes */}
        <View style={styles.sectionCard}>
          <View style={styles.studyNoteHeaderRow}>
            <Text style={styles.sectionHeader}>3. STRUCTURED STUDY NOTES</Text>
            <View style={styles.noteReviewBadge}>
              <Text style={styles.noteReviewBadgeText}>
                AI-GENERATED STUDY NOTES, REVIEWED
              </Text>
            </View>
          </View>

          {skill.study_notes ? (
            <View style={styles.studyNotesBody}>
              <Text style={styles.markdownText}>{skill.study_notes.content_md}</Text>
            </View>
          ) : (
            <Text style={styles.emptyNotesText}>
              Study notes for this recent discovery are currently undergoing curator verification.
            </Text>
          )}
        </View>

        {/* 4. Mini-Project */}
        {skill.mini_project && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeader}>4. FIELD MINI-PROJECT</Text>
            <View style={styles.projectBox}>
              <Text style={styles.projectText}>{skill.mini_project}</Text>
            </View>
          </View>
        )}

        {/* 5. Personal Field Notes */}
        <View style={styles.sectionCard}>
          <View style={styles.personalHeaderRow}>
            <Text style={styles.sectionHeader}>5. OPERATIVE FIELD SCRATCHPAD</Text>
            <Text style={styles.saveStatusText}>
              {saveStatus === 'saved' ? '[SAVED]' : saveStatus === 'saving' ? '[SAVING...]' : '[EDITED]'}
            </Text>
          </View>
          <Text style={styles.scratchpadSub}>
            Private personal notes, code snippets, and implementation reflections. Automatically synchronized.
          </Text>
          <TextInput
            style={styles.personalInput}
            multiline
            numberOfLines={6}
            placeholder="Record your observations, key invariants, and mini-project results here..."
            placeholderTextColor={Colors.textMuted}
            value={personalNote}
            onChangeText={handleNoteChange}
            textAlignVertical="top"
          />
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
  scroll: {
    padding: 16,
    gap: 16,
  },
  masthead: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.ink,
    paddingBottom: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  tierBadge: {
    borderWidth: 1,
    borderColor: Colors.ink,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'transparent',
  },
  tierText: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '800',
    color: Colors.ink,
  },
  statusBadge: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeCurated: {
    borderColor: Colors.moss,
    backgroundColor: 'rgba(79, 107, 74, 0.15)',
  },
  textCurated: {
    color: Colors.moss,
  },
  badgeSuggested: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(217, 65, 30, 0.12)',
  },
  textSuggested: {
    color: Colors.primary,
  },
  badgeText: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '800',
  },
  skillTitle: {
    fontFamily: 'serif',
    fontSize: 26,
    fontWeight: '800',
    color: Colors.ink,
    lineHeight: 30,
  },
  prereqNote: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '700',
    marginTop: 6,
  },
  sectionCard: {
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
  sectionHeader: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '800',
    color: Colors.ink,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  overviewText: {
    fontFamily: 'serif',
    fontSize: 14,
    color: Colors.ink,
    lineHeight: 22,
  },
  videoCard: {
    flexDirection: 'row',
    backgroundColor: Colors.canvas,
    borderWidth: 1,
    borderColor: Colors.ink,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  videoIconBox: {
    width: 44,
    height: 44,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.ink,
    marginRight: 12,
  },
  videoInfo: {
    flex: 1,
  },
  videoTitle: {
    fontFamily: 'serif',
    fontSize: 14,
    fontWeight: '700',
    color: Colors.ink,
    lineHeight: 18,
  },
  videoMeta: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  verifiedStamp: {
    marginTop: 4,
  },
  verifiedStampText: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '700',
    color: Colors.moss,
  },
  noVideoBox: {
    backgroundColor: Colors.canvas,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 20,
    alignItems: 'center',
    marginTop: 6,
  },
  noVideoTitle: {
    fontFamily: 'serif',
    fontSize: 15,
    fontWeight: '700',
    color: Colors.ink,
    marginTop: 6,
  },
  noVideoSubtitle: {
    fontFamily: 'serif',
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  studyNoteHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  noteReviewBadge: {
    borderWidth: 1,
    borderColor: Colors.moss,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(79, 107, 74, 0.1)',
  },
  noteReviewBadgeText: {
    fontFamily: 'monospace',
    fontSize: 8,
    fontWeight: '800',
    color: Colors.moss,
    letterSpacing: 0.5,
  },
  studyNotesBody: {
    backgroundColor: Colors.canvas,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 12,
    marginTop: 4,
  },
  markdownText: {
    fontFamily: 'serif',
    fontSize: 13,
    color: Colors.ink,
    lineHeight: 20,
  },
  emptyNotesText: {
    fontFamily: 'serif',
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  projectBox: {
    backgroundColor: Colors.surfaceContainer,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    padding: 12,
  },
  projectText: {
    fontFamily: 'serif',
    fontSize: 13,
    color: Colors.ink,
    lineHeight: 19,
  },
  personalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  saveStatusText: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '700',
    color: Colors.moss,
  },
  scratchpadSub: {
    fontFamily: 'serif',
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  personalInput: {
    backgroundColor: Colors.canvas,
    borderWidth: 1,
    borderColor: Colors.ink,
    padding: 12,
    fontFamily: 'monospace',
    fontSize: 12,
    color: Colors.ink,
    minHeight: 120,
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
    fontFamily: 'serif',
    fontSize: 18,
    fontWeight: '700',
    color: Colors.rose,
    marginBottom: 16,
  },
  backBtnSolid: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.ink,
  },
  backBtnSolidText: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '700',
    color: Colors.surfaceElevated,
  },
});
