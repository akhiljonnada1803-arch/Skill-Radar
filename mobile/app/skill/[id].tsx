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
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { api } from '../../src/api/client';
import { Colors } from '../../src/theme/colors';
import { TaskSubmission } from '../../src/types';

export default function SkillLearnScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const skillId = id || 'rag-basics';

  // Navigation tab: 'videos' | 'notes' | 'mission'
  const [activeTab, setActiveTab] = useState<'videos' | 'notes' | 'mission'>('videos');

  // Notes state
  const [personalNote, setPersonalNote] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Notes sub-pillar view: 'reports' | 'mindmap' | 'flashcards'
  const [notesView, setNotesView] = useState<'reports' | 'mindmap' | 'flashcards'>('reports');

  // Flashcards state
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [masteredCardIds, setMasteredCardIds] = useState<string[]>([]);

  // Mindmap inspector state
  const [selectedSubtopic, setSelectedSubtopic] = useState<{
    label: string;
    parentCategory: string;
    detail?: any;
  } | null>(null);

  // Mission file upload state
  const [codeSubmission, setCodeSubmission] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileSize, setUploadedFileSize] = useState<string | null>(null);
  const [showManualPaste, setShowManualPaste] = useState<boolean>(false);
  const [evalResult, setEvalResult] = useState<TaskSubmission | null>(null);

  // Queries
  const { data: skill, isLoading, isError } = useQuery({
    queryKey: ['skillLearn', skillId],
    queryFn: () => api.getSkillLearn(skillId),
  });

  const { data: userNote } = useQuery({
    queryKey: ['userNote', skillId],
    queryFn: () => api.getUserNote(skillId),
  });

  const { data: chapterTask, isLoading: taskLoading } = useQuery({
    queryKey: ['chapterTask', skillId],
    queryFn: () => api.getChapterTask(skillId),
  });

  useEffect(() => {
    if (userNote) {
      setPersonalNote(userNote.content || '');
      setSaveStatus('saved');
    }
  }, [userNote]);

  useEffect(() => {
    if (chapterTask) {
      if (!codeSubmission && chapterTask.starter_code) {
        setCodeSubmission(chapterTask.starter_code);
      }
      if (chapterTask.latest_submission) {
        setEvalResult(chapterTask.latest_submission);
      }
    }
  }, [chapterTask]);

  // Mutation for AI Task Submission
  const submitMutation = useMutation({
    mutationFn: (code: string) => api.submitChapterTask(skillId, code),
    onSuccess: (data) => {
      setEvalResult(data);
      queryClient.invalidateQueries({ queryKey: ['chapterTask', skillId] });
      queryClient.invalidateQueries({ queryKey: ['roadmap'] });
      if (data.status === 'passed') {
        Alert.alert(
          'Mastery Certified!',
          `Score: ${data.score}/100. You passed this chapter mission and unlocked the next competency!`,
          [{ text: 'Continue' }]
        );
      }
    },
    onError: (err: any) => {
      Alert.alert('Evaluation Error', err?.message || 'Failed to submit task for evaluation.');
    },
  });

  // NotebookLM Live AI Synthesis Mutation
  const synthesizeMutation = useMutation({
    mutationFn: () => api.synthesizeChapterMaterials(skillId),
    onSuccess: (data) => {
      queryClient.setQueryData(['skillLearn', skillId], data);
      Alert.alert(
        'NotebookLM Synthesis Complete',
        `Grounded Study Report, Knowledge Graph, and Flashcards successfully synthesized with ${data.report?.model_version || 'Gemini 2.0 Flash'}.`
      );
    },
    onError: (err: any) => {
      Alert.alert('Synthesis Notice', err?.message || 'Using local verified synthesis.');
    },
  });

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

  const handleOpenVideo = (youtubeId: string, timestampSeconds?: number) => {
    const q = timestampSeconds ? `&t=${timestampSeconds}` : '';
    const url = `https://www.youtube.com/watch?v=${youtubeId}${q}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Video Error', `Unable to open YouTube: ${url}`);
    });
  };

  const handlePickDocument = async () => {
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.py,.js,.jsx,.ts,.tsx,.html,.css,.json,.sql,.md,.txt';
        input.onchange = (e: any) => {
          const file = e.target?.files?.[0];
          if (file) {
            setUploadedFileName(file.name);
            setUploadedFileSize((file.size / 1024).toFixed(1) + ' KB');
            const reader = new FileReader();
            reader.onload = (event) => {
              const content = event.target?.result as string;
              setCodeSubmission(content);
            };
            reader.readAsText(file);
          }
        };
        input.click();
      } else {
        const result = await DocumentPicker.getDocumentAsync({
          type: '*/*',
          copyToCacheDirectory: true,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          setUploadedFileName(asset.name);
          setUploadedFileSize(((asset.size || 0) / 1024).toFixed(1) + ' KB');
          const response = await fetch(asset.uri);
          const text = await response.text();
          setCodeSubmission(text);
        }
      }
    } catch (err: any) {
      Alert.alert('File Error', err?.message || 'Could not load selected file.');
    }
  };

  const handleSubmitTask = () => {
    if (!codeSubmission.trim()) {
      Alert.alert('Incomplete Deliverable', 'Please upload your solution file or paste your code before submitting.');
      return;
    }
    submitMutation.mutate(codeSubmission);
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
      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={18} color={Colors.ink} />
          <Text style={styles.backBtnText}>ROADMAP</Text>
        </TouchableOpacity>
        <View style={styles.headerTag}>
          <Text style={styles.headerTagText}>CHAPTER DOSSIER</Text>
        </View>
      </View>

      {/* Chapter Masthead */}
      <View style={styles.masthead}>
        <View style={styles.badgeRow}>
          <View style={styles.tierBadge}>
            <Text style={styles.tierText}>{skill.difficulty.toUpperCase()} TIER</Text>
          </View>
          <View style={[styles.statusBadge, skill.is_curated ? styles.badgeCurated : styles.badgeSuggested]}>
            <Text style={[styles.badgeText, skill.is_curated ? styles.textCurated : styles.textSuggested]}>
              {skill.is_curated ? 'CURATED CHAPTER' : 'DYNAMIC RADAR CHAPTER'}
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

      {/* Byju's 3-Pillar Chapter Navigation Switcher */}
      <View style={styles.tabNavContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'videos' && styles.tabButtonActive]}
          onPress={() => setActiveTab('videos')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="play-circle-outline"
            size={16}
            color={activeTab === 'videos' ? '#FFFFFF' : Colors.textSecondary}
          />
          <Text style={[styles.tabButtonText, activeTab === 'videos' && styles.tabButtonTextActive]}>
            1. Videos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'notes' && styles.tabButtonActive]}
          onPress={() => setActiveTab('notes')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="document-text-outline"
            size={16}
            color={activeTab === 'notes' ? '#FFFFFF' : Colors.textSecondary}
          />
          <Text style={[styles.tabButtonText, activeTab === 'notes' && styles.tabButtonTextActive]}>
            2. Notes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'mission' && styles.tabButtonActive]}
          onPress={() => setActiveTab('mission')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="terminal-outline"
            size={16}
            color={activeTab === 'mission' ? '#FFFFFF' : Colors.textSecondary}
          />
          <Text style={[styles.tabButtonText, activeTab === 'mission' && styles.tabButtonTextActive]}>
            3. AI Mission
          </Text>
          {evalResult?.status === 'passed' && (
            <View style={styles.passedDot} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* TAB 1: VIDEOS & CURRICULUM OVERVIEW */}
        {activeTab === 'videos' && (
          <View style={styles.tabContent}>
            {/* Specimen Overview */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeader}>CHAPTER OVERVIEW</Text>
              <Text style={styles.overviewText}>{skill.overview}</Text>
            </View>

            {/* Verified Video Expeditions */}
            <View style={styles.sectionCard}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.sectionHeader}>VERIFIED VIDEO LECTURES</Text>
                <View style={styles.liveIndicator}>
                  <View style={styles.pulsingGreen} />
                  <Text style={styles.liveIndicatorText}>VERIFIED STREAM</Text>
                </View>
              </View>

              {skill.videos && skill.videos.length > 0 ? (
                skill.videos.map((vid) => (
                  <TouchableOpacity
                    key={vid.id}
                    style={styles.videoCard}
                    onPress={() => handleOpenVideo(vid.youtube_id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.videoIconBox}>
                      <Ionicons name="play" size={20} color="#FFFFFF" />
                    </View>
                    <View style={styles.videoInfo}>
                      <Text style={styles.videoTitle} numberOfLines={2}>
                        {vid.title}
                      </Text>
                      <Text style={styles.videoMeta}>CHANNEL: {vid.channel.toUpperCase()}</Text>
                      <View style={styles.verifiedStamp}>
                        <Text style={styles.verifiedStampText}>
                          [VERIFIED CURRICULUM // YOUTUBE EMBED]
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyBox}>
                  <Ionicons name="videocam-off-outline" size={24} color={Colors.textSecondary} />
                  <Text style={styles.emptyTitle}>No verified video attached</Text>
                  <Text style={styles.emptySubtitle}>
                    This competency was added from research literature. Verified video lessons are pending curator review.
                  </Text>
                </View>
              )}
            </View>

            {/* Action Card to Proceed to Notes */}
            <TouchableOpacity
              style={styles.nextTabBtn}
              onPress={() => setActiveTab('notes')}
              activeOpacity={0.85}
            >
              <Text style={styles.nextTabBtnText}>PROCEED TO STUDY NOTES →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* TAB 2: STUDY MATERIALS — REPORTS, MINDMAP & FLASHCARDS */}
        {activeTab === 'notes' && (
          <View style={styles.tabContent}>
            {/* NotebookLM Studio Header Banner */}
            <View style={styles.notebooklmBanner}>
              <View style={styles.notebooklmLeft}>
                <View style={styles.notebooklmBadge}>
                  <Ionicons name="sparkles" size={13} color="#FFFFFF" />
                  <Text style={styles.notebooklmBadgeText}>NOTEBOOKLM MODE</Text>
                </View>
                <Text style={styles.notebooklmMetaText}>
                  Grounded in {skill.report?.sources_count || 4} Chapter Sources • {skill.report?.model_version || 'Gemini 2.0 Flash Engine'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.reSynthesizeBtn}
                onPress={() => synthesizeMutation.mutate()}
                disabled={synthesizeMutation.isPending}
                activeOpacity={0.8}
              >
                {synthesizeMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="sync" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.reSynthesizeBtnText}>AI SYNTHESIS</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Notes Sub-Navigation Pills */}
            <View style={styles.notesSubNav}>
              <TouchableOpacity
                style={[styles.notesSubTab, notesView === 'reports' && styles.notesSubTabActive]}
                onPress={() => setNotesView('reports')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="document-text"
                  size={14}
                  color={notesView === 'reports' ? '#FFFFFF' : Colors.primary}
                />
                <Text style={[styles.notesSubTabText, notesView === 'reports' && styles.notesSubTabTextActive]}>
                  Reports & Notes
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.notesSubTab, notesView === 'mindmap' && styles.notesSubTabActive]}
                onPress={() => setNotesView('mindmap')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="git-network"
                  size={14}
                  color={notesView === 'mindmap' ? '#FFFFFF' : Colors.primary}
                />
                <Text style={[styles.notesSubTabText, notesView === 'mindmap' && styles.notesSubTabTextActive]}>
                  Mindmap ({skill.mindmap?.length || 0})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.notesSubTab, notesView === 'flashcards' && styles.notesSubTabActive]}
                onPress={() => setNotesView('flashcards')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="albums"
                  size={14}
                  color={notesView === 'flashcards' ? '#FFFFFF' : Colors.primary}
                />
                <Text style={[styles.notesSubTabText, notesView === 'flashcards' && styles.notesSubTabTextActive]}>
                  Flashcards ({skill.flashcards?.length || 0})
                </Text>
              </TouchableOpacity>
            </View>

            {/* SUB-VIEW 1: REPORTS & DOSSIER */}
            {notesView === 'reports' && (
              <>
                {/* Video Lecture Provenance & Click-to-Seek Key Moments */}
                {skill.report?.lecture_title && (
                  <View style={styles.sectionCard}>
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.lectureProvenanceBadge}>
                        <Ionicons name="videocam" size={13} color="#FFFFFF" />
                        <Text style={styles.lectureProvenanceText}>GROUNDED IN VIDEO LECTURE</Text>
                      </View>
                      {skill.report?.lecture_youtube_id && (
                        <TouchableOpacity
                          style={styles.playLectureBtn}
                          onPress={() => handleOpenVideo(skill.report!.lecture_youtube_id!)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="play" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                          <Text style={styles.playLectureBtnText}>WATCH LECTURE</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    <Text style={styles.lectureProvenanceSource}>
                      "{skill.report.lecture_title}" by {skill.report.lecture_channel || 'Curated Educator'}
                    </Text>

                    {skill.report.video_key_moments && skill.report.video_key_moments.length > 0 && (
                      <View style={styles.videoKeyMomentsContainer}>
                        <Text style={styles.subSectionHeader}>VIDEO TIMELINE & KEY LECTURE MOMENTS (TAP TO JUMP):</Text>
                        <View style={styles.momentsList}>
                          {skill.report.video_key_moments.map((km, idx) => (
                            <TouchableOpacity
                              key={idx}
                              style={styles.momentCard}
                              onPress={() => {
                                const yId = skill.report?.lecture_youtube_id || (skill.videos?.[0]?.youtube_id);
                                if (yId) {
                                  handleOpenVideo(yId, km.seconds);
                                }
                              }}
                              activeOpacity={0.75}
                            >
                              <View style={styles.momentTimestampPill}>
                                <Ionicons name="play" size={10} color="#FFFFFF" />
                                <Text style={styles.momentTimestampText}>{km.timestamp}</Text>
                              </View>
                              <View style={styles.momentContent}>
                                <Text style={styles.momentTitle}>{km.title}</Text>
                                <Text style={styles.momentSummary}>{km.summary}</Text>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {/* Executive Briefing & Key Takeaways */}
                {skill.report && (
                  <View style={styles.sectionCard}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.sectionHeader}>EXECUTIVE TECHNICAL BRIEFING</Text>
                      <View style={styles.noteReviewBadge}>
                        <Text style={styles.noteReviewBadgeText}>REVIEWED & VERIFIED</Text>
                      </View>
                    </View>
                    <Text style={styles.reportSummaryText}>{skill.report.summary}</Text>

                    {skill.report.key_takeaways && skill.report.key_takeaways.length > 0 && (
                      <View style={styles.takeawaysContainer}>
                        <Text style={styles.subSectionHeader}>CORE ARCHITECTURAL INVARIANTS:</Text>
                        {skill.report.key_takeaways.map((takeaway, idx) => (
                          <View key={idx} style={styles.takeawayRow}>
                            <Ionicons name="checkmark-done" size={14} color={Colors.emerald} style={{ marginTop: 2 }} />
                            <Text style={styles.takeawayText}>{takeaway}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {skill.report.common_pitfalls && skill.report.common_pitfalls.length > 0 && (
                      <View style={styles.pitfallsContainer}>
                        <View style={styles.pitfallHeaderRow}>
                          <Ionicons name="warning" size={14} color={Colors.rose} />
                          <Text style={styles.pitfallHeader}>COMMON ARCHITECTURAL PITFALLS:</Text>
                        </View>
                        {skill.report.common_pitfalls.map((pitfall, idx) => (
                          <View key={idx} style={styles.pitfallRow}>
                            <Text style={styles.pitfallBullet}>•</Text>
                            <Text style={styles.pitfallText}>{pitfall}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {/* Grounded FAQ Section */}
                {skill.report?.faq && skill.report.faq.length > 0 && (
                  <View style={styles.sectionCard}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.sectionHeader}>NOTEBOOKLM GROUNDED FAQ</Text>
                      <View style={styles.faqBadge}>
                        <Text style={styles.faqBadgeText}>{skill.report.faq.length} Q&As</Text>
                      </View>
                    </View>
                    <View style={styles.faqList}>
                      {skill.report.faq.map((item, idx) => (
                        <View key={idx} style={styles.faqCard}>
                          <View style={styles.faqQuestionRow}>
                            <Ionicons name="help-circle" size={15} color={Colors.primary} style={{ marginTop: 1 }} />
                            <Text style={styles.faqQuestionText}>{item.question}</Text>
                          </View>
                          <Text style={styles.faqAnswerText}>{item.answer}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Grounded Technical Glossary */}
                {skill.report?.glossary && skill.report.glossary.length > 0 && (
                  <View style={styles.sectionCard}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.sectionHeader}>GROUNDED TECHNICAL GLOSSARY</Text>
                      <Text style={styles.referenceTag}>[SOURCE CITATIONS]</Text>
                    </View>
                    <View style={styles.glossaryGrid}>
                      {skill.report.glossary.map((term, idx) => (
                        <View key={idx} style={styles.glossaryCard}>
                          <Text style={styles.glossaryTerm}>{term.term}</Text>
                          <Text style={styles.glossaryDef}>{term.definition}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Complete Curated Study Notes */}
                <View style={styles.sectionCard}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.sectionHeader}>DEEP DIVE CURATED NOTES</Text>
                    <Text style={styles.referenceTag}>[FIELD MANUAL]</Text>
                  </View>

                  {skill.study_notes ? (
                    <View style={styles.studyNotesBody}>
                      <Text style={styles.markdownText}>{skill.study_notes.content_md}</Text>
                    </View>
                  ) : (
                    <Text style={styles.emptyNotesText}>
                      Curated study notes are being finalized by field researchers.
                    </Text>
                  )}
                </View>

                {/* Personal Operative Scratchpad */}
                <View style={styles.sectionCard}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.sectionHeader}>OPERATIVE SCRATCHPAD</Text>
                    <Text style={styles.saveStatusText}>
                      {saveStatus === 'saved' ? '[SAVED]' : saveStatus === 'saving' ? '[SAVING...]' : '[DIRTY]'}
                    </Text>
                  </View>
                  <Text style={styles.scratchpadSub}>
                    Private reflections, mental models, and invariants. Automatically autosaved.
                  </Text>
                  <TextInput
                    style={styles.personalInput}
                    multiline
                    numberOfLines={6}
                    placeholder="Record observations, takeaways, and notes here..."
                    placeholderTextColor={Colors.textMuted}
                    value={personalNote}
                    onChangeText={handleNoteChange}
                    textAlignVertical="top"
                  />
                </View>
              </>
            )}

            {/* SUB-VIEW 2: MINDMAP */}
            {notesView === 'mindmap' && (
              <View style={styles.mindmapContainer}>
                {/* Central Chapter Root Node */}
                <View style={styles.mindmapRootNode}>
                  <Ionicons name="git-commit" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.mindmapRootText}>{skill.name}</Text>
                </View>
                <View style={styles.mindmapConnectorVertical} />

                {/* Mindmap Categories */}
                {skill.mindmap && skill.mindmap.length > 0 ? (
                  skill.mindmap.map((node, nIdx) => (
                    <View key={node.id || nIdx} style={styles.mindmapClusterCard}>
                      <View style={styles.mindmapClusterHeader}>
                        <View style={styles.mindmapCategoryBadge}>
                          <Text style={styles.mindmapCategoryBadgeText}>{node.category.toUpperCase()}</Text>
                        </View>
                        <Text style={styles.mindmapNodeTitle}>{node.label}</Text>
                        {node.description && (
                          <Text style={styles.mindmapNodeDesc}>{node.description}</Text>
                        )}
                      </View>

                      {/* Subtopics Flow */}
                      <View style={styles.subtopicsRow}>
                        {node.subtopics.map((sub, sIdx) => {
                          const isSelected =
                            selectedSubtopic?.label === sub && selectedSubtopic?.parentCategory === node.label;
                          const detail = node.detailed_subtopics?.find(d => d.name === sub);
                          return (
                            <TouchableOpacity
                              key={sIdx}
                              style={[styles.subtopicPill, isSelected && styles.subtopicPillActive]}
                              onPress={() =>
                                setSelectedSubtopic(
                                  isSelected ? null : { label: sub, parentCategory: node.label, detail }
                                )
                              }
                              activeOpacity={0.7}
                            >
                              <Text
                                style={[
                                  styles.subtopicPillText,
                                  isSelected && styles.subtopicPillTextActive,
                                ]}
                              >
                                {sub}
                              </Text>
                              <Ionicons
                                name={isSelected ? 'information-circle' : 'chevron-forward'}
                                size={12}
                                color={isSelected ? '#FFFFFF' : Colors.primary}
                              />
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptySubtitle}>No mindmap nodes mapped for this competency yet.</Text>
                  </View>
                )}

                {/* Subtopic Inspector Card */}
                {selectedSubtopic && (
                  <View style={styles.subtopicInspectCard}>
                    <View style={styles.inspectHeaderRow}>
                      <Ionicons name="sparkles" size={14} color={Colors.primary} />
                      <Text style={styles.inspectCategory}>
                        CONCEPT FOCUS // {selectedSubtopic.parentCategory.toUpperCase()}
                      </Text>
                      {selectedSubtopic.detail?.citation && (
                        <View style={styles.citationBadge}>
                          <Text style={styles.citationBadgeText}>{selectedSubtopic.detail.citation}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.inspectTitle}>{selectedSubtopic.label}</Text>
                    <Text style={styles.inspectBody}>
                      {selectedSubtopic.detail?.summary ||
                        `This concept forms a core building block of ${skill.name}. Review the corresponding study report and attempt the mission deliverable to demonstrate mastery.`}
                    </Text>
                    {selectedSubtopic.detail?.key_rule && (
                      <View style={styles.inspectRuleBox}>
                        <Text style={styles.inspectRuleHeader}>INVARIANT RULE:</Text>
                        <Text style={styles.inspectRuleText}>{selectedSubtopic.detail.key_rule}</Text>
                      </View>
                    )}
                    {selectedSubtopic.detail?.code_pattern && (
                      <View style={styles.codeSnippetBlock}>
                        <Text style={styles.codeSnippetHeader}>CODE PATTERN:</Text>
                        <Text style={styles.codeSnippetText}>{selectedSubtopic.detail.code_pattern}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* SUB-VIEW 3: FLASHCARDS */}
            {notesView === 'flashcards' && (
              <View style={styles.flashcardsContainer}>
                {skill.flashcards && skill.flashcards.length > 0 ? (
                  (() => {
                    const cards = skill.flashcards;
                    const card = cards[Math.min(currentCardIndex, cards.length - 1)];
                    const isMastered = masteredCardIds.includes(card.id);
                    const masteryPercent = Math.round((masteredCardIds.length / cards.length) * 100);

                    return (
                      <>
                        {/* Deck Stats & Progress Bar */}
                        <View style={styles.flashcardProgressBox}>
                          <View style={styles.flashcardProgressRow}>
                            <Text style={styles.flashcardCounterText}>
                              CARD {currentCardIndex + 1} OF {cards.length}
                            </Text>
                            <Text style={styles.flashcardMasteryText}>
                              {masteredCardIds.length} / {cards.length} MASTERED ({masteryPercent}%)
                            </Text>
                          </View>
                          <View style={styles.flashcardProgressTrack}>
                            <View
                              style={[
                                styles.flashcardProgressFill,
                                { width: `${Math.max(masteryPercent, 5)}%` },
                              ]}
                            />
                          </View>
                        </View>

                        {/* Interactive Card Canvas */}
                        <TouchableOpacity
                          style={[
                            styles.flashcardCanvas,
                            isCardFlipped ? styles.flashcardCanvasBack : styles.flashcardCanvasFront,
                          ]}
                          onPress={() => setIsCardFlipped(!isCardFlipped)}
                          activeOpacity={0.9}
                        >
                          {/* Card Header Strip */}
                          <View style={styles.cardCanvasHeader}>
                            <View style={styles.conceptTagBadge}>
                              <Text style={styles.conceptTagText}>
                                {card.concept.toUpperCase()}
                              </Text>
                            </View>
                            <View style={styles.flipPill}>
                              <Ionicons name="sync" size={12} color={Colors.primary} style={{ marginRight: 4 }} />
                              <Text style={styles.flipPillText}>
                                {isCardFlipped ? 'SHOW QUESTION' : 'TAP TO REVEAL'}
                              </Text>
                            </View>
                          </View>

                          {/* Card Body: Front vs Back */}
                          {!isCardFlipped ? (
                            <View style={styles.cardFrontContent}>
                              <Text style={styles.cardPromptLabel}>QUESTION / SCENARIO:</Text>
                              <Text style={styles.cardQuestionText}>{card.question}</Text>
                              <View style={styles.cardHintRow}>
                                <Ionicons name="help-circle-outline" size={14} color={Colors.textSecondary} />
                                <Text style={styles.cardHintText}>Tap anywhere on card to reveal answer & code</Text>
                              </View>
                            </View>
                          ) : (
                            <View style={styles.cardBackContent}>
                              <Text style={styles.cardAnswerLabel}>EXPLANATION & VERIFIED MECHANICS:</Text>
                              <Text style={styles.cardAnswerText}>{card.answer}</Text>
                              {card.code_example && (
                                <View style={styles.codeSnippetBlock}>
                                  <Text style={styles.codeSnippetHeader}>CODE PATTERN:</Text>
                                  <Text style={styles.codeSnippetText}>{card.code_example}</Text>
                                </View>
                              )}
                            </View>
                          )}
                        </TouchableOpacity>

                        {/* Deck Controls (Prev / Flip / Next) */}
                        <View style={styles.deckControlsRow}>
                          <TouchableOpacity
                            style={[styles.deckNavBtn, currentCardIndex === 0 && styles.deckBtnDisabled]}
                            onPress={() => {
                              if (currentCardIndex > 0) {
                                setCurrentCardIndex(currentCardIndex - 1);
                                setIsCardFlipped(false);
                              }
                            }}
                            disabled={currentCardIndex === 0}
                          >
                            <Ionicons name="chevron-back" size={16} color={Colors.ink} />
                            <Text style={styles.deckNavBtnText}>PREV</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.deckFlipBtn}
                            onPress={() => setIsCardFlipped(!isCardFlipped)}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="swap-horizontal" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                            <Text style={styles.deckFlipBtnText}>
                              {isCardFlipped ? 'SHOW QUESTION' : 'REVEAL ANSWER'}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.deckNavBtn,
                              currentCardIndex === cards.length - 1 && styles.deckBtnDisabled,
                            ]}
                            onPress={() => {
                              if (currentCardIndex < cards.length - 1) {
                                setCurrentCardIndex(currentCardIndex + 1);
                                setIsCardFlipped(false);
                              }
                            }}
                            disabled={currentCardIndex === cards.length - 1}
                          >
                            <Text style={styles.deckNavBtnText}>NEXT</Text>
                            <Ionicons name="chevron-forward" size={16} color={Colors.ink} />
                          </TouchableOpacity>
                        </View>

                        {/* Self-Rating Mastery Actions */}
                        <View style={styles.masteryActionsRow}>
                          <TouchableOpacity
                            style={[styles.masteryPillBtn, !isMastered && styles.masteryPillActiveRed]}
                            onPress={() => {
                              setMasteredCardIds(masteredCardIds.filter(id => id !== card.id));
                              if (currentCardIndex < cards.length - 1) {
                                setCurrentCardIndex(currentCardIndex + 1);
                                setIsCardFlipped(false);
                              }
                            }}
                          >
                            <Ionicons name="refresh" size={14} color={!isMastered ? '#FFFFFF' : Colors.rose} />
                            <Text style={[styles.masteryPillText, !isMastered && styles.masteryPillTextActive]}>
                              Needs Revision
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.masteryPillBtn, isMastered && styles.masteryPillActiveGreen]}
                            onPress={() => {
                              if (!masteredCardIds.includes(card.id)) {
                                setMasteredCardIds([...masteredCardIds, card.id]);
                              }
                              if (currentCardIndex < cards.length - 1) {
                                setCurrentCardIndex(currentCardIndex + 1);
                                setIsCardFlipped(false);
                              }
                            }}
                          >
                            <Ionicons name="checkmark-circle" size={14} color={isMastered ? '#FFFFFF' : '#2D6A4F'} />
                            <Text style={[styles.masteryPillText, isMastered && styles.masteryPillTextActive]}>
                              Mastered ✓
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    );
                  })()
                ) : (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptySubtitle}>No flashcards loaded for this chapter yet.</Text>
                  </View>
                )}
              </View>
            )}

            {/* Action Card to Proceed to Mission */}
            <TouchableOpacity
              style={styles.nextTabBtn}
              onPress={() => setActiveTab('mission')}
              activeOpacity={0.85}
            >
              <Text style={styles.nextTabBtnText}>PROCEED TO CHAPTER MISSION →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* TAB 3: TACTICAL MISSION & AI EXAMINER */}
        {activeTab === 'mission' && (
          <View style={styles.tabContent}>
            {taskLoading ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.loadingText}>PREPARING CHAPTER MISSION...</Text>
              </View>
            ) : chapterTask ? (
              <>
                {/* Mission Brief Card */}
                <View style={styles.sectionCard}>
                  <View style={styles.missionHeaderRow}>
                    <Text style={styles.missionPill}>TACTICAL ASSESSMENT</Text>
                    <Text style={styles.missionDiff}>{chapterTask.difficulty.toUpperCase()}</Text>
                  </View>
                  <Text style={styles.missionTitle}>{chapterTask.title}</Text>
                  <Text style={styles.missionDesc}>{chapterTask.description}</Text>

                  {/* Rubric Breakdown */}
                  <View style={styles.rubricContainer}>
                    <Text style={styles.rubricHeader}>EVALUATION RUBRIC</Text>
                    {chapterTask.rubric.map((r, idx) => (
                      <View key={idx} style={styles.rubricRow}>
                        <View style={styles.rubricBullet} />
                        <Text style={styles.rubricText}>
                          <Text style={styles.rubricCriterion}>{r.criterion}</Text> ({r.weight}%): {r.description}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Instructions Markdown */}
                  <View style={styles.instructionsBox}>
                    <Text style={styles.instructionsText}>{chapterTask.instructions_md}</Text>
                  </View>
                </View>

                {/* Live AI Diagnostic Scorecard (If previously or just submitted) */}
                {evalResult && (
                  <View style={[styles.evalScorecard, evalResult.status === 'passed' ? styles.cardPassed : styles.cardRemediation]}>
                    <View style={styles.scorecardHeader}>
                      <View style={[styles.scoreBadge, evalResult.status === 'passed' ? styles.badgePass : styles.badgeRem]}>
                        <Text style={styles.scoreBadgeText}>{evalResult.score} / 100</Text>
                      </View>
                      <Text style={[styles.scoreStatusText, evalResult.status === 'passed' ? styles.textPass : styles.textRem]}>
                        {evalResult.status === 'passed' ? 'MASTERY CERTIFIED' : 'REMEDIATION REQUIRED'}
                      </Text>
                    </View>

                    <Text style={styles.evalSummary}>{evalResult.summary}</Text>

                    {/* Strengths */}
                    {evalResult.strengths && evalResult.strengths.length > 0 && (
                      <View style={styles.diagBlock}>
                        <Text style={styles.diagTitleGreen}>VERIFIED STRENGTHS:</Text>
                        {evalResult.strengths.map((str, idx) => (
                          <View key={idx} style={styles.diagBulletRow}>
                            <Ionicons name="checkmark-circle" size={14} color={Colors.emerald} />
                            <Text style={styles.diagText}>{str}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Gaps */}
                    {evalResult.gaps && evalResult.gaps.length > 0 && (
                      <View style={styles.diagBlock}>
                        <Text style={styles.diagTitleRed}>IDENTIFIED GAPS & MISMATCHES:</Text>
                        {evalResult.gaps.map((gap, idx) => (
                          <View key={idx} style={styles.diagBulletRow}>
                            <Ionicons name="alert-circle" size={14} color={Colors.rose} />
                            <Text style={styles.diagText}>{gap}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Targeted Video/Note Remediation */}
                    {evalResult.remediation && evalResult.remediation.length > 0 && (
                      <View style={styles.remediationBox}>
                        <View style={styles.remediationHeaderRow}>
                          <Ionicons name="refresh-circle" size={18} color={Colors.primaryDeep} />
                          <Text style={styles.remediationHeader}>TARGETED ACTION PLAN</Text>
                        </View>
                        {evalResult.remediation.map((rem, idx) => (
                          <View key={idx} style={styles.remediationItem}>
                            <Text style={styles.remTopic}>• {rem.topic}</Text>
                            <Text style={styles.remAction}>{rem.action}</Text>
                            {rem.target_video_timestamp && (
                              <TouchableOpacity
                                style={styles.videoLinkRow}
                                onPress={() => {
                                  if (skill.videos && skill.videos.length > 0) {
                                    handleOpenVideo(skill.videos[0].youtube_id);
                                  } else {
                                    setActiveTab('videos');
                                  }
                                }}
                              >
                                <Ionicons name="play" size={12} color={Colors.primaryDeep} />
                                <Text style={styles.videoLinkText}>
                                  Jump to Lecture (approx. {rem.target_video_timestamp})
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {/* Student Deliverable & File Upload Section */}
                <View style={styles.sectionCard}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.sectionHeader}>STUDENT DELIVERABLE</Text>
                    {chapterTask.starter_code && (
                      <TouchableOpacity
                        onPress={() => {
                          setCodeSubmission(chapterTask.starter_code || '');
                          setUploadedFileName('starter_template.js');
                          setUploadedFileSize('1.2 KB');
                        }}
                      >
                        <Text style={styles.resetStarterText}>[USE STARTER CODE]</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Primary File Upload Dropzone */}
                  {!codeSubmission ? (
                    <TouchableOpacity
                      style={styles.uploadDropzone}
                      onPress={handlePickDocument}
                      activeOpacity={0.8}
                    >
                      <View style={styles.uploadIconCircle}>
                        <Ionicons name="cloud-upload-outline" size={32} color={Colors.primary} />
                      </View>
                      <Text style={styles.uploadMainText}>Upload Solution File</Text>
                      <Text style={styles.uploadSubText}>
                        Drop your code file (.js, .ts, .tsx, .py, .html, .sql) or stitch export
                      </Text>
                      <View style={styles.browseButton}>
                        <Ionicons name="folder-open-outline" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.browseButtonText}>Browse & Upload File</Text>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    /* Attached File Card & Live Preview */
                    <View style={styles.fileAttachedCard}>
                      <View style={styles.fileInfoRow}>
                        <View style={styles.fileIconBox}>
                          <Ionicons name="document-text" size={24} color={Colors.primary} />
                        </View>
                        <View style={styles.fileDetailsCol}>
                          <Text style={styles.fileNameText} numberOfLines={1}>
                            {uploadedFileName || 'deliverable_code.txt'}
                          </Text>
                          <Text style={styles.fileSizeText}>
                            {uploadedFileSize || `${(codeSubmission.length / 1024).toFixed(1)} KB`} • Ready for Evaluation
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.replaceFileBtn}
                          onPress={handlePickDocument}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.replaceFileText}>Change File</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Code Preview Box */}
                      <View style={styles.previewContainer}>
                        <View style={styles.previewHeader}>
                          <Text style={styles.previewHeaderText}>DELIVERABLE PREVIEW</Text>
                          <Text style={styles.previewLineCount}>
                            {codeSubmission.split('\n').length} lines
                          </Text>
                        </View>
                        <ScrollView style={styles.previewScroll} nestedScrollEnabled>
                          <Text style={styles.previewCodeText}>
                            {codeSubmission}
                          </Text>
                        </ScrollView>
                      </View>
                    </View>
                  )}

                  {/* Manual Paste Toggle */}
                  <TouchableOpacity
                    style={styles.manualPasteToggle}
                    onPress={() => setShowManualPaste(!showManualPaste)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={showManualPaste ? 'chevron-up' : 'code-slash-outline'}
                      size={14}
                      color="#7A6664"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.manualPasteToggleText}>
                      {showManualPaste ? 'Hide manual code editor' : 'Or paste code manually from clipboard'}
                    </Text>
                  </TouchableOpacity>

                  {showManualPaste && (
                    <TextInput
                      style={styles.codeEditor}
                      multiline
                      value={codeSubmission}
                      onChangeText={(txt) => {
                        setCodeSubmission(txt);
                        if (!uploadedFileName) {
                          setUploadedFileName('pasted_code.txt');
                          setUploadedFileSize(`${(txt.length / 1024).toFixed(1)} KB`);
                        }
                      }}
                      placeholder="// Or paste your code directly here..."
                      placeholderTextColor={Colors.textMuted}
                      autoCapitalize="none"
                      autoCorrect={false}
                      textAlignVertical="top"
                    />
                  )}

                  {/* Submission Trigger */}
                  <TouchableOpacity
                    style={[
                      styles.submitMissionBtn,
                      (!codeSubmission.trim() || submitMutation.isPending) && styles.submitMissionBtnDisabled,
                    ]}
                    onPress={handleSubmitTask}
                    disabled={!codeSubmission.trim() || submitMutation.isPending}
                    activeOpacity={0.85}
                  >
                    {submitMutation.isPending ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <ActivityIndicator color="#FFFFFF" size="small" />
                        <Text style={styles.submitMissionBtnText}>
                          EVALUATING CODE DELIVERABLE...
                        </Text>
                      </View>
                    ) : (
                      <>
                        <Text style={styles.submitMissionBtnText}>
                          SUBMIT TO GEMINI AI EXAMINER →
                        </Text>
                        <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>No mission active for this chapter.</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.ink,
    marginBottom: 16,
  },
  backBtnSolid: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.primaryDeep,
    borderRadius: 8,
  },
  backBtnSolidText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  topBar: {
    height: 48,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainer,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.ink,
    letterSpacing: 0.5,
  },
  headerTag: {
    backgroundColor: Colors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  headerTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
  },
  masthead: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  tierBadge: {
    backgroundColor: Colors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tierText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeCurated: {
    backgroundColor: '#E8F5E9',
  },
  badgeSuggested: {
    backgroundColor: '#FFF8E1',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  textCurated: {
    color: '#2D6A4F',
  },
  textSuggested: {
    color: '#B57614',
  },
  skillTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.ink,
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  prereqNote: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  /* Tab Navigation Switcher */
  tabNavContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  tabButtonActive: {
    backgroundColor: Colors.primaryDeep,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  passedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4EBA6F',
    marginLeft: 2,
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  tabContent: {
    gap: 16,
  },
  sectionCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: 16,
    gap: 12,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.ink,
    letterSpacing: 0.8,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pulsingGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2D6A4F',
  },
  liveIndicatorText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#2D6A4F',
  },
  overviewText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  /* Video Card */
  videoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  videoIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primaryDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoInfo: {
    flex: 1,
    gap: 2,
  },
  videoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.ink,
  },
  videoMeta: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  verifiedStamp: {
    marginTop: 2,
  },
  verifiedStampText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#2D6A4F',
  },
  emptyBox: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.ink,
  },
  emptySubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  nextTabBtn: {
    height: 44,
    borderRadius: 8,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  nextTabBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.ink,
    letterSpacing: 0.6,
  },
  /* Video Lecture Provenance & Key Moments */
  lectureProvenanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryDeep,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  lectureProvenanceText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  playLectureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#944747',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  playLectureBtnText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  lectureProvenanceSource: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.ink,
    fontStyle: 'italic',
  },
  videoKeyMomentsContainer: {
    marginTop: 4,
    gap: 8,
  },
  momentsList: {
    gap: 8,
  },
  momentCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF8F7',
    borderWidth: 1,
    borderColor: '#DFBFBB',
    borderRadius: 8,
    padding: 10,
    gap: 10,
  },
  momentTimestampPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.primaryDeep,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  momentTimestampText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    fontFamily: 'monospace',
  },
  momentContent: {
    flex: 1,
    gap: 2,
  },
  momentTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.ink,
  },
  momentSummary: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 15,
  },
  /* NotebookLM Studio Banner */
  notebooklmBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 10,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  notebooklmLeft: {
    flex: 1,
    marginRight: 8,
    gap: 3,
  },
  notebooklmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryDeep,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  notebooklmBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  notebooklmMetaText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
    lineHeight: 14,
  },
  reSynthesizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryDeep,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  reSynthesizeBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  /* Grounded FAQ */
  faqBadge: {
    backgroundColor: '#FFE9E8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  faqBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.primary,
  },
  faqList: {
    gap: 10,
  },
  faqCard: {
    backgroundColor: '#FFF8F7',
    borderWidth: 1,
    borderColor: '#DFBFBB',
    borderRadius: 8,
    padding: 12,
    gap: 6,
  },
  faqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  faqQuestionText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.ink,
    lineHeight: 18,
    flex: 1,
  },
  faqAnswerText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  /* Grounded Glossary */
  glossaryGrid: {
    gap: 8,
  },
  glossaryCard: {
    backgroundColor: '#FFF8F7',
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    borderRadius: 6,
    padding: 10,
    gap: 2,
  },
  glossaryTerm: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.4,
  },
  glossaryDef: {
    fontSize: 11,
    color: Colors.ink,
    lineHeight: 16,
  },
  citationBadge: {
    backgroundColor: '#E8F5E9',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 'auto',
  },
  citationBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#2D6A4F',
  },
  inspectRuleBox: {
    backgroundColor: '#F3FAF6',
    borderWidth: 1,
    borderColor: '#C8E6C9',
    borderRadius: 6,
    padding: 8,
    gap: 2,
  },
  inspectRuleHeader: {
    fontSize: 9,
    fontWeight: '800',
    color: '#2D6A4F',
    letterSpacing: 0.6,
  },
  inspectRuleText: {
    fontSize: 11,
    color: Colors.ink,
    lineHeight: 16,
  },
  /* Notes Sub-Navigation */
  notesSubNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: 3,
    gap: 4,
  },
  notesSubTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: 6,
  },
  notesSubTabActive: {
    backgroundColor: Colors.primaryDeep,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  notesSubTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.ink,
  },
  notesSubTabTextActive: {
    color: '#FFFFFF',
  },
  reportSummaryText: {
    fontSize: 13,
    color: Colors.ink,
    lineHeight: 20,
  },
  takeawaysContainer: {
    backgroundColor: '#F3FAF6',
    borderWidth: 1,
    borderColor: '#C8E6C9',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  subSectionHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2D6A4F',
    letterSpacing: 0.8,
  },
  takeawayRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  takeawayText: {
    fontSize: 12,
    color: Colors.ink,
    lineHeight: 18,
    flex: 1,
  },
  pitfallsContainer: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FFCDD2',
    borderRadius: 8,
    padding: 12,
    gap: 6,
  },
  pitfallHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  pitfallHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.rose,
    letterSpacing: 0.8,
  },
  pitfallRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  pitfallBullet: {
    fontSize: 12,
    color: Colors.rose,
    fontWeight: '800',
  },
  pitfallText: {
    fontSize: 12,
    color: Colors.ink,
    lineHeight: 17,
    flex: 1,
  },
  referenceTag: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.6,
  },
  /* Mindmap Styles */
  mindmapContainer: {
    gap: 12,
    alignItems: 'center',
  },
  mindmapRootNode: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryDeep,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#DFBFBB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  mindmapRootText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  mindmapConnectorVertical: {
    width: 2,
    height: 16,
    backgroundColor: Colors.outlineVariant,
  },
  mindmapClusterCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: 14,
    gap: 10,
  },
  mindmapClusterHeader: {
    gap: 4,
  },
  mindmapCategoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFE9E8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mindmapCategoryBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.6,
  },
  mindmapNodeTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.ink,
  },
  mindmapNodeDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  subtopicsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  subtopicPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF0EF',
    borderWidth: 1,
    borderColor: '#DFBFBB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  subtopicPillActive: {
    backgroundColor: Colors.primaryDeep,
    borderColor: Colors.primaryDeep,
  },
  subtopicPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.ink,
  },
  subtopicPillTextActive: {
    color: '#FFFFFF',
  },
  subtopicInspectCard: {
    width: '100%',
    backgroundColor: '#FFF8F7',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 10,
    padding: 14,
    gap: 6,
  },
  inspectHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inspectCategory: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.8,
  },
  inspectTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.ink,
  },
  inspectBody: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  /* Flashcards Styles */
  flashcardsContainer: {
    gap: 12,
  },
  flashcardProgressBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 8,
    padding: 10,
    gap: 6,
  },
  flashcardProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  flashcardCounterText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.6,
  },
  flashcardMasteryText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2D6A4F',
    letterSpacing: 0.5,
  },
  flashcardProgressTrack: {
    height: 6,
    backgroundColor: '#FFE9E8',
    borderRadius: 3,
    overflow: 'hidden',
  },
  flashcardProgressFill: {
    height: '100%',
    backgroundColor: '#2D6A4F',
  },
  flashcardCanvas: {
    borderRadius: 12,
    borderWidth: 2,
    padding: 18,
    minHeight: 220,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  flashcardCanvasFront: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DFBFBB',
  },
  flashcardCanvasBack: {
    backgroundColor: '#FFF8F7',
    borderColor: Colors.primaryDeep,
  },
  cardCanvasHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  conceptTagBadge: {
    backgroundColor: '#FFE9E8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  conceptTagText: {
    fontSize: 9,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: 0.6,
  },
  flipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0EF',
    borderWidth: 1,
    borderColor: '#DFBFBB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  flipPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.primary,
  },
  cardFrontContent: {
    gap: 12,
    flex: 1,
    justifyContent: 'center',
  },
  cardPromptLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
  },
  cardQuestionText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.ink,
    lineHeight: 24,
  },
  cardHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  cardHintText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  cardBackContent: {
    gap: 10,
    flex: 1,
  },
  cardAnswerLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2D6A4F',
    letterSpacing: 0.8,
  },
  cardAnswerText: {
    fontSize: 13,
    color: Colors.ink,
    lineHeight: 20,
  },
  codeSnippetBlock: {
    backgroundColor: '#1E1B1B',
    borderRadius: 6,
    padding: 10,
    marginTop: 6,
    gap: 4,
  },
  codeSnippetHeader: {
    fontSize: 9,
    fontWeight: '800',
    color: '#C8E6C9',
    letterSpacing: 0.8,
  },
  codeSnippetText: {
    fontSize: 11,
    color: '#F8F9FA',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  deckControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  deckNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  deckNavBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.ink,
    letterSpacing: 0.6,
  },
  deckBtnDisabled: {
    opacity: 0.35,
  },
  deckFlipBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryDeep,
    paddingVertical: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  deckFlipBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  masteryActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  masteryPillBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    backgroundColor: '#FFFFFF',
  },
  masteryPillActiveRed: {
    backgroundColor: '#FFF0EF',
    borderColor: Colors.rose,
  },
  masteryPillActiveGreen: {
    backgroundColor: '#E8F5E9',
    borderColor: '#2D6A4F',
  },
  masteryPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.ink,
  },
  masteryPillTextActive: {
    color: Colors.ink,
    fontWeight: '900',
  },
  noteReviewBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  noteReviewBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#2D6A4F',
  },
  studyNotesBody: {
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.surfaceContainer,
  },
  markdownText: {
    fontSize: 13,
    color: Colors.ink,
    lineHeight: 20,
    fontFamily: 'monospace',
  },
  emptyNotesText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  saveStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  scratchpadSub: {
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  personalInput: {
    backgroundColor: Colors.background,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: 10,
    fontSize: 13,
    color: Colors.ink,
    minHeight: 110,
  },
  /* Mission Card */
  missionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  missionPill: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.primaryDeep,
    letterSpacing: 0.8,
  },
  missionDiff: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textSecondary,
    backgroundColor: Colors.surfaceContainerHigh,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  missionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.ink,
    letterSpacing: -0.2,
  },
  missionDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  rubricContainer: {
    backgroundColor: Colors.surfaceContainerLow,
    padding: 10,
    borderRadius: 6,
    gap: 6,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primaryDeep,
  },
  rubricHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.ink,
    letterSpacing: 0.5,
  },
  rubricRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  rubricBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primaryDeep,
    marginTop: 6,
  },
  rubricText: {
    flex: 1,
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  rubricCriterion: {
    fontWeight: '700',
    color: Colors.ink,
  },
  instructionsBox: {
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.surfaceContainer,
  },
  instructionsText: {
    fontSize: 12,
    color: Colors.ink,
    lineHeight: 18,
  },
  /* AI Scorecard */
  evalScorecard: {
    borderRadius: 10,
    borderWidth: 1.5,
    padding: 16,
    gap: 12,
  },
  cardPassed: {
    backgroundColor: '#F2FAF4',
    borderColor: '#4EBA6F',
  },
  cardRemediation: {
    backgroundColor: '#FFF4F4',
    borderColor: Colors.rose,
  },
  scorecardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgePass: {
    backgroundColor: '#2D6A4F',
  },
  badgeRem: {
    backgroundColor: Colors.rose,
  },
  scoreBadgeText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  scoreStatusText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  textPass: {
    color: '#2D6A4F',
  },
  textRem: {
    color: Colors.rose,
  },
  evalSummary: {
    fontSize: 12,
    color: Colors.ink,
    lineHeight: 18,
    fontWeight: '500',
  },
  diagBlock: {
    gap: 5,
  },
  diagTitleGreen: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2D6A4F',
    letterSpacing: 0.5,
  },
  diagTitleRed: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.rose,
    letterSpacing: 0.5,
  },
  diagBulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  diagText: {
    flex: 1,
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  remediationBox: {
    backgroundColor: Colors.surfaceContainerHigh,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  remediationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  remediationHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primaryDeep,
    letterSpacing: 0.8,
  },
  remediationItem: {
    gap: 2,
    paddingLeft: 4,
  },
  remTopic: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.ink,
  },
  remAction: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  videoLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  videoLinkText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primaryDeep,
    textDecorationLine: 'underline',
  },
  /* Deliverable File Upload & Preview Styles */
  resetStarterText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primaryDeep,
  },
  uploadDropzone: {
    backgroundColor: '#FFF8F7',
    borderWidth: 2,
    borderColor: '#DFBFBB',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  uploadIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFE9E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  uploadMainText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A0808',
    marginBottom: 4,
  },
  uploadSubText: {
    fontSize: 12,
    color: '#7A6664',
    textAlign: 'center',
    lineHeight: 17,
    maxWidth: 280,
    marginBottom: 16,
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  browseButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  fileAttachedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DFBFBB',
    padding: 12,
    marginBottom: 12,
  },
  fileInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  fileIconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#FFF0EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  fileDetailsCol: {
    flex: 1,
  },
  fileNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A0808',
  },
  fileSizeText: {
    fontSize: 11,
    color: '#2D6A4F',
    fontWeight: '600',
    marginTop: 1,
  },
  replaceFileBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#F5ECEB',
  },
  replaceFileText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5C4342',
  },
  previewContainer: {
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    overflow: 'hidden',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2D2D2D',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  previewHeaderText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#A0A0A0',
    letterSpacing: 0.5,
  },
  previewLineCount: {
    fontSize: 10,
    color: '#808080',
    fontFamily: 'monospace',
  },
  previewScroll: {
    maxHeight: 180,
    padding: 12,
  },
  previewCodeText: {
    fontSize: 11,
    color: '#E0E0E0',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  manualPasteToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginBottom: 10,
  },
  manualPasteToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7A6664',
  },
  codeEditor: {
    backgroundColor: '#1E1E1E',
    color: '#E0E0E0',
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
    borderRadius: 8,
    padding: 12,
    minHeight: 140,
    marginBottom: 12,
  },
  submitMissionBtn: {
    height: 48,
    borderRadius: 8,
    backgroundColor: Colors.primaryDeep,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.primaryDeep,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  submitMissionBtnDisabled: {
    opacity: 0.5,
  },
  submitMissionBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
});
