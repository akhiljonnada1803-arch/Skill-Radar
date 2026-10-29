import React, { useState } from 'react';
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
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api/client';
import { Colors } from '../../src/theme/colors';

export default function LearnTabScreen() {
  const [selectedSkillSlug, setSelectedSkillSlug] = useState<string>('rag-basics');
  const [personalNote, setPersonalNote] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');

  const { data: roadmap } = useQuery({
    queryKey: ['roadmap'],
    queryFn: () => api.getCurrentRoadmap(),
  });

  const { data: skill, isLoading } = useQuery({
    queryKey: ['skillLearn', selectedSkillSlug],
    queryFn: () => api.getSkillLearn(selectedSkillSlug),
  });

  const { data: userNote } = useQuery({
    queryKey: ['userNote', selectedSkillSlug],
    queryFn: () => api.getUserNote(selectedSkillSlug),
  });

  React.useEffect(() => {
    if (userNote) {
      setPersonalNote(userNote.content || '');
      setSaveStatus('saved');
    }
  }, [userNote]);

  const handleNoteChange = (text: string) => {
    setPersonalNote(text);
    setSaveStatus('dirty');
    setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await api.saveUserNote(selectedSkillSlug, text);
        setSaveStatus('saved');
      } catch {
        setSaveStatus('dirty');
      }
    }, 1200);
  };

  const handleOpenVideo = (youtubeId: string) => {
    const url = `https://www.youtube.com/watch?v=${youtubeId}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Video Link Error', `Could not open ${url}`);
    });
  };

  const items = roadmap?.items || [];

  return (
    <SafeAreaView style={styles.container}>
      {/* Horizontal Skill Picker Carousel */}
      <View style={styles.pickerStrip}>
        <Text style={styles.pickerLabel}>SELECT COMPETENCY DOSSIER:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerScroll}>
          {items.map((it) => {
            const isSelected = (it.slug || it.skill_id) === selectedSkillSlug;
            return (
              <TouchableOpacity
                key={it.id}
                style={[styles.skillChip, isSelected && styles.skillChipSelected]}
                onPress={() => setSelectedSkillSlug(it.slug || it.skill_id)}
              >
                <Text style={[styles.skillChipText, isSelected && styles.skillChipTextSelected]}>
                  {it.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Learn View */}
      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>OPENING CURRICULUM ARCHIVE...</Text>
        </View>
      ) : !skill ? (
        <View style={styles.centerBox}>
          <Text style={styles.emptyText}>NO SKILL SELECTED</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Header */}
          <View style={styles.masthead}>
            <View style={styles.badgeRow}>
              <View style={styles.tierBadge}>
                <Text style={styles.tierText}>{skill.difficulty.toUpperCase()} TIER</Text>
              </View>
              <View style={[styles.badge, skill.is_curated ? styles.badgeCurated : styles.badgeSuggested]}>
                <Text style={[styles.badgeText, skill.is_curated ? styles.textCurated : styles.textSuggested]}>
                  {skill.is_curated ? 'CURATED CURRICULUM' : 'SUGGESTED DISCOVERY'}
                </Text>
              </View>
            </View>
            <Text style={styles.title}>{skill.name}</Text>
            {skill.prerequisites && skill.prerequisites.length > 0 && (
              <Text style={styles.prereqNote}>
                PREREQUISITES: {skill.prerequisites.join(' // ').toUpperCase()}
              </Text>
            )}
          </View>

          {/* 1. Overview */}
          <View style={styles.card}>
            <Text style={styles.cardHeader}>1. SPECIMEN OVERVIEW</Text>
            <Text style={styles.bodyText}>{skill.overview}</Text>
          </View>

          {/* 2. Verified Videos */}
          <View style={styles.card}>
            <Text style={styles.cardHeader}>2. VERIFIED VIDEO LESSONS</Text>
            {skill.videos && skill.videos.length > 0 ? (
              skill.videos.map((vid) => (
                <TouchableOpacity
                  key={vid.id}
                  style={styles.videoRow}
                  onPress={() => handleOpenVideo(vid.youtube_id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.playIconBox}>
                    <Ionicons name="play" size={20} color={Colors.surfaceElevated} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.videoTitle} numberOfLines={2}>
                      {vid.title}
                    </Text>
                    <Text style={styles.videoChannel}>CHANNEL: {vid.channel.toUpperCase()}</Text>
                    <Text style={styles.verifiedStamp}>[VERIFIED BY CURATOR // OPEN YOUTUBE]</Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.noVideoBox}>
                <Text style={styles.noVideoTitle}>No verified video yet</Text>
                <Text style={styles.noVideoSub}>
                  Added from scientific literature. Video lessons pending curator verification.
                </Text>
              </View>
            )}
          </View>

          {/* 3. Study Notes */}
          <View style={styles.card}>
            <View style={styles.studyHeaderRow}>
              <Text style={styles.cardHeader}>3. STRUCTURED STUDY NOTES</Text>
              <View style={styles.reviewedBadge}>
                <Text style={styles.reviewedBadgeText}>AI-GENERATED STUDY NOTES, REVIEWED</Text>
              </View>
            </View>

            {skill.study_notes ? (
              <View style={styles.studyNotesContent}>
                <Text style={styles.markdownText}>{skill.study_notes.content_md}</Text>
              </View>
            ) : (
              <Text style={styles.noNotesText}>
                Curator review for these study notes is currently in progress.
              </Text>
            )}
          </View>

          {/* 4. Mini Project */}
          {skill.mini_project && (
            <View style={styles.card}>
              <Text style={styles.cardHeader}>4. FIELD MINI-PROJECT</Text>
              <View style={styles.projectBox}>
                <Text style={styles.projectText}>{skill.mini_project}</Text>
              </View>
            </View>
          )}

          {/* 5. Personal Field Notes */}
          <View style={styles.card}>
            <View style={styles.personalHeader}>
              <Text style={styles.cardHeader}>5. OPERATIVE FIELD SCRATCHPAD</Text>
              <Text style={styles.saveStatus}>
                {saveStatus === 'saved' ? '[SAVED]' : saveStatus === 'saving' ? '[SAVING...]' : '[DIRTY]'}
              </Text>
            </View>
            <Text style={styles.scratchpadDesc}>
              Personal notes and code snippets. Automatically autosaved per user session.
            </Text>
            <TextInput
              style={styles.textArea}
              multiline
              numberOfLines={6}
              placeholder="Record implementation findings..."
              placeholderTextColor={Colors.textMuted}
              value={personalNote}
              onChangeText={handleNoteChange}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  pickerStrip: {
    backgroundColor: Colors.canvas,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ink,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  pickerLabel: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  pickerScroll: {
    gap: 8,
  },
  skillChip: {
    borderWidth: 1,
    borderColor: Colors.ink,
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  skillChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.ink,
  },
  skillChipText: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '700',
    color: Colors.ink,
  },
  skillChipTextSelected: {
    color: Colors.surfaceElevated,
  },
  scroll: {
    padding: 16,
    gap: 16,
  },
  masthead: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.ink,
    paddingBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  tierBadge: {
    borderWidth: 1,
    borderColor: Colors.ink,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tierText: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '800',
    color: Colors.ink,
  },
  badge: {
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
  title: {
    fontFamily: 'serif',
    fontSize: 24,
    fontWeight: '800',
    color: Colors.ink,
    marginTop: 4,
  },
  prereqNote: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '700',
    marginTop: 6,
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
  bodyText: {
    fontFamily: 'serif',
    fontSize: 14,
    color: Colors.ink,
    lineHeight: 22,
  },
  videoRow: {
    flexDirection: 'row',
    backgroundColor: Colors.canvas,
    borderWidth: 1,
    borderColor: Colors.ink,
    padding: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  playIconBox: {
    width: 40,
    height: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.ink,
    marginRight: 10,
  },
  videoTitle: {
    fontFamily: 'serif',
    fontSize: 13,
    fontWeight: '700',
    color: Colors.ink,
  },
  videoChannel: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  verifiedStamp: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '700',
    color: Colors.moss,
    marginTop: 2,
  },
  noVideoBox: {
    backgroundColor: Colors.canvas,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginTop: 6,
  },
  noVideoTitle: {
    fontFamily: 'serif',
    fontSize: 14,
    fontWeight: '700',
    color: Colors.ink,
  },
  noVideoSub: {
    fontFamily: 'serif',
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  studyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  reviewedBadge: {
    borderWidth: 1,
    borderColor: Colors.moss,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(79, 107, 74, 0.1)',
  },
  reviewedBadgeText: {
    fontFamily: 'monospace',
    fontSize: 8,
    fontWeight: '800',
    color: Colors.moss,
    letterSpacing: 0.5,
  },
  studyNotesContent: {
    backgroundColor: Colors.canvas,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 12,
  },
  markdownText: {
    fontFamily: 'serif',
    fontSize: 13,
    color: Colors.ink,
    lineHeight: 20,
  },
  noNotesText: {
    fontFamily: 'serif',
    fontSize: 12,
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
    lineHeight: 18,
  },
  personalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  saveStatus: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '700',
    color: Colors.moss,
  },
  scratchpadDesc: {
    fontFamily: 'serif',
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: Colors.canvas,
    borderWidth: 1,
    borderColor: Colors.ink,
    padding: 10,
    fontFamily: 'monospace',
    fontSize: 12,
    color: Colors.ink,
    minHeight: 100,
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
  emptyText: {
    fontFamily: 'serif',
    fontSize: 16,
    fontWeight: '700',
    color: Colors.ink,
  },
});
