import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Linking,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api/client';
import { Colors } from '../../src/theme/colors';
import { DiscoveryCardItem } from '../../src/types';

export default function DiscoverRadarScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [selectedFilter, setSelectedFilter] = useState<string>('All');
  const [isIngestModalVisible, setIsIngestModalVisible] = useState<boolean>(false);
  const [ingestInput, setIngestInput] = useState<string>('');
  const [isIngesting, setIsIngesting] = useState<boolean>(false);

  // 1. Fetch live discoveries feed
  const { data: feedData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['discoveries', 'live'],
    queryFn: () => api.getDiscoveries('live'),
  });

  // 2. Fetch user's active roadmaps
  const { data: roadmaps } = useQuery({
    queryKey: ['roadmaps'],
    queryFn: () => api.getRoadmaps(),
  });
  const defaultRoadmapId = roadmaps?.[0]?.id || 'road-001';

  // Ingest on-demand live telemetry mutation
  const handleIngest = async (presetText?: string) => {
    const text = (presetText || ingestInput).trim();
    if (!text) {
      Alert.alert('Input Required', 'Please enter a URL or an AI release name.');
      return;
    }
    setIsIngesting(true);
    try {
      const res = await api.ingestLiveDiscovery(text);
      await queryClient.invalidateQueries({ queryKey: ['discoveries'] });
      setIngestInput('');
      setIsIngestModalVisible(false);
      Alert.alert(
        '⚡ Telemetry Ingested!',
        `"${res.title}"\n\nCategorized as: ${res.category}\nAdded directly to top of your Discover Radar.`,
        [
          { text: 'View Now' },
          {
            text: '+ Add to Roadmap',
            onPress: () => addSkillMutation.mutate(res.id),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Notice', err?.message || 'Processed offline telemetry.');
    } finally {
      setIsIngesting(false);
    }
  };

  // 3. Action mutation: bookmark / save
  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      api.setAction(id, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discoveries'] });
    },
  });

  // 4. Mutation to add discovery skill to roadmap
  const addSkillMutation = useMutation({
    mutationFn: (discoveryId: string) =>
      api.addSkillToRoadmap(defaultRoadmapId, discoveryId, discoveryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap'] });
      queryClient.invalidateQueries({ queryKey: ['discoveries'] });
      Alert.alert(
        'Skill Added to Roadmap!',
        'This technology has been slotted into your curriculum chapters with video lectures and an AI mission.',
        [{ text: 'View Roadmap', onPress: () => router.push('/(tabs)/roadmap') }, { text: 'Stay Here' }]
      );
    },
    onError: (err: any) => {
      // If direct skill mapping fails, navigate to the discovery detail dossier
      Alert.alert('Notice', err?.message || 'Opening technical dossier to configure roadmap integration.');
    },
  });

  const handleToggleSave = (item: DiscoveryCardItem, e?: any) => {
    e?.stopPropagation?.();
    const nextAction = item.user_state === 'saved' ? 'none' : 'saved';
    actionMutation.mutate({ id: item.id, action: nextAction });
  };

  const handleOpenSource = (url?: string | null) => {
    if (!url) {
      Alert.alert('Source Notice', 'Primary paper document available in full dossier.');
      return;
    }
    Linking.openURL(url).catch(() => {
      Alert.alert('Link Error', `Unable to open ${url}`);
    });
  };

  const allItems: DiscoveryCardItem[] = feedData?.items || [];

  // Notification-style chronological sort: newest news strictly on top
  const sortedAllItems = [...allItems].sort((a, b) => {
    const timeA = new Date(a.primary_source?.published_at || a.created_at).getTime();
    const timeB = new Date(b.primary_source?.published_at || b.created_at).getTime();
    return timeB - timeA;
  });

  // Filter items
  const filteredItems = sortedAllItems.filter((item) => {
    if (selectedFilter === 'All') return true;
    if (selectedFilter === '🔥 Frontier Models') {
      const txt = `${item.title} ${item.summary || ''} ${item.category || ''}`.toLowerCase();
      return (
        txt.includes('openai') ||
        txt.includes('deepseek') ||
        txt.includes('llama') ||
        txt.includes('mcp') ||
        txt.includes('o1') ||
        txt.includes('o3') ||
        txt.includes('gemini') ||
        txt.includes('claude') ||
        txt.includes('mistral') ||
        item.evidence_level?.toUpperCase() === 'EMERGING'
      );
    }
    if (selectedFilter === '🤖 AI Agents') {
      const txt = `${item.title} ${item.summary || ''} ${item.category || ''}`.toLowerCase();
      return (
        txt.includes('agent') ||
        txt.includes('copilot') ||
        txt.includes('operator') ||
        txt.includes('autonomous') ||
        txt.includes('mcp')
      );
    }
    if (selectedFilter === '⚡ 2-Hr Briefs') return item.evidence_level?.toUpperCase() === 'EMERGING';
    if (selectedFilter === '📄 arXiv') return (item.primary_source?.source_name || '').toLowerCase().includes('arxiv');
    if (selectedFilter === '🐙 GitHub') return (item.primary_source?.source_name || '').toLowerCase().includes('github');
    if (selectedFilter === '🔖 Saved') return item.user_state === 'saved';
    return true;
  });

  const featuredStory = filteredItems.length > 0 ? filteredItems[0] : null;
  const feedStories = filteredItems.length > 1 ? filteredItems.slice(1) : [];

  const filterTabs = [
    'All',
    '🔥 Frontier Models',
    '🤖 AI Agents',
    '⚡ 2-Hr Briefs',
    '📄 arXiv',
    '🐙 GitHub',
    '🔖 Saved',
  ];

  const formatNewsTime = (dateStr?: string | null): string => {
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
  };

  const getSourceIconName = (sourceName?: string) => {
    const s = (sourceName || '').toLowerCase();
    if (s.includes('arxiv')) return 'document-text-outline';
    if (s.includes('github')) return 'logo-github';
    if (s.includes('google')) return 'logo-google';
    if (s.includes('openai')) return 'flash-outline';
    if (s.includes('hugging')) return 'heart-outline';
    return 'newspaper-outline';
  };

  const formatSourcePrefix = (sourceName?: string, type?: string) => {
    const s = (sourceName || '').toLowerCase();
    if (s.includes('openai')) return '🧠 OpenAI';
    if (s.includes('anthropic')) return '⚡ Anthropic';
    if (s.includes('google')) return '🏛️ Google AI';
    if (s.includes('wsj')) return '📰 WSJ';
    if (s.includes('financial times') || s.includes('ft')) return '📰 Financial Times';
    if (s.includes('reuters')) return '📰 Reuters';
    if (s.includes('fortune')) return '📰 Fortune';
    if (s.includes('washington post')) return '📰 WaPo';
    if (s.includes('new york times') || s.includes('nyt')) return '📰 NYTimes';
    if (s.includes('hacker news')) return '🛡️ The Hacker News';
    if (s.includes('cso')) return '🛡️ CSO Online';
    if (s.includes('siliconangle')) return '⚡ SiliconANGLE';
    if (s.includes('hugging')) return '🤗 Hugging Face';
    if (s.includes('techcrunch')) return '📰 TechCrunch';
    if (s.includes('mit')) return '🏛️ MIT Tech Review';
    if (s.includes('arxiv')) return '📄 arXiv Paper';
    if (s.includes('github')) return '🐙 GitHub Spec';
    if (type === 'release') return '⚡ Production Release';
    return `📰 ${sourceName || 'Frontier Telemetry'}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 1. Header: Crimson Monolith Modernist */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.brandRow}>
            <Text style={styles.brandTitle}>
              SkillRadar <Text style={styles.brandAi}>AI</Text>
            </Text>
          </View>

          <View style={styles.headerRight}>
            <View style={styles.matchedBadge}>
              <Text style={styles.matchedBolt}>⚡</Text>
              <Text style={styles.matchedText}>Matched to You</Text>
            </View>

            <TouchableOpacity style={styles.notificationBtn} activeOpacity={0.7}>
              <Ionicons name="notifications-outline" size={20} color="#3C070B" />
              <View style={styles.notificationDot} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* 2. Main Title Section with Zero-Day Telemetry Ingestion */}
        <View style={styles.titleSection}>
          <View style={styles.titleRow}>
            <View style={styles.titleTextCol}>
              <Text style={styles.discoverTitle}>Discover Radar</Text>
              <Text style={styles.discoverSubtitle}>
                Autonomous engineering radar • Curated for your stack
              </Text>
            </View>
            <TouchableOpacity
              style={styles.ingestTriggerBtn}
              onPress={() => setIsIngestModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.ingestTriggerBolt}>⚡</Text>
              <Text style={styles.ingestTriggerText}>+ Ingest News</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. Filter Carousel */}
        <View style={styles.filterScrollWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {filterTabs.map((tab) => {
              const isSelected = selectedFilter === tab;
              const isBrief = tab === '🔥 2-Hr Briefs';
              return (
                <TouchableOpacity
                  key={tab}
                  style={[
                    styles.filterChip,
                    isSelected ? styles.filterChipActive : isBrief ? styles.filterChipBrief : styles.filterChipDefault,
                  ]}
                  onPress={() => setSelectedFilter(tab)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      isSelected ? styles.filterChipTextActive : isBrief ? styles.filterChipTextBrief : styles.filterChipTextDefault,
                    ]}
                  >
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {isLoading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.loadingText}>Calibrating telemetry feed dispatches...</Text>
          </View>
        ) : filteredItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="newspaper-outline" size={36} color="#8B716E" />
            <Text style={styles.emptyTitle}>No Dispatches in Current Vector</Text>
            <Text style={styles.emptySubtitle}>Reset your category filters to view all telemetry.</Text>
            <TouchableOpacity
              style={styles.emptyResetBtn}
              onPress={() => setSelectedFilter('All')}
            >
              <Text style={styles.emptyResetBtnText}>Reset to All</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* 4. Hero Live Brief Card */}
            {featuredStory && (
              <View style={styles.heroCard}>
                {/* Hero Card Top Header */}
                <View style={styles.heroCardHeader}>
                  <View style={styles.heroLiveGroup}>
                    <View style={styles.livePulseDot} />
                    <Text style={styles.heroLiveText}>LIVE BRIEF</Text>
                    <Text style={styles.heroDivider}>•</Text>
                    <Text style={styles.heroTimeText}>
                      {formatNewsTime(featuredStory.primary_source?.published_at || featuredStory.created_at)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.heroSaveBtn}
                    onPress={(e) => handleToggleSave(featuredStory, e)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={featuredStory.user_state === 'saved' ? 'bookmark' : 'bookmark-outline'}
                      size={14}
                      color="#58413F"
                    />
                    <Text style={styles.heroSaveBtnText}>
                      {featuredStory.user_state === 'saved' ? 'Saved' : 'Save'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Hero Visual Banner with Play Action */}
                <TouchableOpacity
                  style={styles.heroMediaBanner}
                  activeOpacity={0.9}
                  onPress={() => router.push(`/discovery/${featuredStory.id}`)}
                >
                  <View style={styles.heroGradientBg} />
                  <View style={styles.heroPlayCircle}>
                    <Ionicons name="play" size={24} color="#440001" style={{ marginLeft: 2 }} />
                  </View>
                  <View style={styles.heroMediaMeta}>
                    <Text style={styles.heroMediaTitle}>Executive Briefing + Architectural Slides</Text>
                    <View style={styles.heroDurationBadge}>
                      <Text style={styles.heroDurationText}>3:15</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Title & Metadata */}
                <View style={styles.heroMetaBlock}>
                  <Text style={styles.heroTitle}>{featuredStory.title}</Text>
                  <View style={styles.heroTagsRow}>
                    <View style={styles.heroTagBadge}>
                      <Text style={styles.heroTagBadgeText}>
                        🏷️ {featuredStory.discovery_type === 'release' ? 'Production Release' : 'Frontier Research'}
                      </Text>
                    </View>
                    <Text style={styles.heroDivider}>•</Text>
                    <TouchableOpacity
                      onPress={() => handleOpenSource(featuredStory.primary_source?.canonical_url)}
                      style={styles.heroSourceLink}
                    >
                      <Ionicons name="link-outline" size={13} color="#A8372E" />
                      <Text style={styles.heroSourceLinkText} numberOfLines={1}>
                        {featuredStory.primary_source?.source_name || 'Primary Source'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Why It Matters Box */}
                {featuredStory.why_it_matters ? (
                  <View style={styles.whyItMattersBox}>
                    <View style={styles.whyItMattersLabelRow}>
                      <Text style={styles.whyItMattersEmoji}>💡</Text>
                      <Text style={styles.whyItMattersLabel}>WHY IT MATTERS</Text>
                    </View>
                    <View style={styles.whyItMattersBulletRow}>
                      <Text style={styles.bulletDot}>•</Text>
                      <Text style={styles.whyItMattersText}>{featuredStory.why_it_matters}</Text>
                    </View>
                  </View>
                ) : null}

                {/* Slots After Progression Box */}
                <View style={styles.progressionBox}>
                  <View style={styles.progressionHeader}>
                    <Text style={styles.progressionEmoji}>🧩</Text>
                    <Text style={styles.progressionLabel}>SLOTS AFTER PROGRESSION</Text>
                  </View>
                  <View style={styles.progressionFlow}>
                    <View style={styles.progressionFrom}>
                      <Text style={styles.progressionFromText}>Active Curriculum</Text>
                    </View>
                    <Text style={styles.progressionArrow}>──▶</Text>
                    <View style={styles.progressionTo}>
                      <Text style={styles.progressionToText}>This Skill</Text>
                    </View>
                  </View>
                </View>

                {/* Timing Note */}
                <View style={styles.masterclassRow}>
                  <Text style={styles.masterclassEmoji}>⏳</Text>
                  <Text style={styles.masterclassText}>Deep-Dive Masterclass & Hands-on AI Mission Included</Text>
                </View>

                {/* 1-Tap Add to Roadmap Hero Button */}
                <TouchableOpacity
                  style={styles.heroAddBtn}
                  onPress={() => router.push(`/discovery/${featuredStory.id}`)}
                  activeOpacity={0.88}
                >
                  <Ionicons name="add-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.heroAddBtnText}>+ Add Skill to My Roadmap (1-Tap)</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 5. Section Header */}
            {feedStories.length > 0 && (
              <View style={styles.dispatchesHeaderRow}>
                <View style={styles.dispatchesLabelGroup}>
                  <View style={styles.crimsonDot} />
                  <Text style={styles.dispatchesHeaderText}>
                    RADAR FEED DISPATCHES // VERIFIED TELEMETRY
                  </Text>
                </View>
                <Text style={styles.dispatchesCountText}>{feedStories.length} NEW</Text>
              </View>
            )}

            {/* 6. Feed Dispatches Articles */}
            <View style={styles.feedList}>
              {feedStories.map((item) => {
                const isEmerging = item.evidence_level?.toUpperCase() === 'EMERGING';
                const isPaper = item.discovery_type === 'paper';
                const isFramework = item.discovery_type === 'release';

                // Format bullets
                const bullets =
                  item.applications && item.applications.length > 0
                    ? item.applications.slice(0, 2)
                    : [item.summary];

                return (
                  <View key={item.id} style={styles.articleCard}>
                    {/* Clickable Article Header & Body */}
                    <TouchableOpacity
                      activeOpacity={0.88}
                      onPress={() => router.push(`/discovery/${item.id}`)}
                    >
                      {/* Top Row */}
                      <View style={styles.articleTopRow}>
                        <Text style={styles.articleSourceText}>
                          {formatSourcePrefix(item.primary_source?.source_name, item.discovery_type)} • {formatNewsTime(item.primary_source?.published_at || item.created_at)}
                        </Text>

                        <View
                          style={[
                            styles.articleBadge,
                            isEmerging ? styles.badgeEmerging : isFramework ? styles.badgeFramework : styles.badgeBenchmark,
                          ]}
                        >
                          <Text
                            style={[
                              styles.articleBadgeText,
                              isEmerging ? styles.badgeTextEmerging : isFramework ? styles.badgeTextFramework : styles.badgeTextBenchmark,
                            ]}
                          >
                            {isEmerging ? '🧪 Emerging' : isFramework ? '⚡ Framework' : '📊 Benchmark'}
                          </Text>
                        </View>
                      </View>

                      {/* Article Title */}
                      <Text style={styles.articleTitle}>{item.title}</Text>

                      {/* Bullet Points */}
                      <View style={styles.articleBullets}>
                        {bullets.map((b, idx) => (
                          <View key={idx} style={styles.articleBulletRow}>
                            <Text style={styles.bulletDot}>•</Text>
                            <Text style={styles.articleBulletText} numberOfLines={2}>
                              {b}
                            </Text>
                          </View>
                        ))}
                      </View>

                      {/* Strategic Takeaway Highlight */}
                      {item.why_it_matters && (
                        <View style={styles.articleWhyBox}>
                          <Text style={styles.articleWhyLabel}>💡 KEY IMPACT: </Text>
                          <Text style={styles.articleWhyText} numberOfLines={2}>
                            {item.why_it_matters}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    {/* Bottom Action Buttons Row */}
                    <View style={styles.articleActionsRow}>
                      <TouchableOpacity
                        style={styles.articleReadBtn}
                        onPress={() => handleOpenSource(item.primary_source?.canonical_url)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={getSourceIconName(item.primary_source?.source_name)}
                          size={14}
                          color="#3C070B"
                        />
                        <Text style={styles.articleReadBtnText}>
                          {isPaper ? 'Read Primary PDF' : 'View Repository'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.articleAddBtn}
                        onPress={() => router.push(`/discovery/${item.id}`)}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="add" size={15} color="#FFFFFF" />
                        <Text style={styles.articleAddBtnText}>Add to Roadmap</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {/* 5. Ingest Live Telemetry Modal */}
      <Modal
        visible={isIngestModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsIngestModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <Text style={styles.modalBolt}>⚡</Text>
                <Text style={styles.modalTitle}>Zero-Day Telemetry Ingest</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsIngestModalVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={22} color="#3C070B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Paste any URL (OpenAI, HuggingFace, arXiv, GitHub, tech blog) or type a release name to analyze and map it into your curriculum in seconds.
            </Text>

            {/* Quick 1-Tap Trending Chips */}
            <Text style={styles.presetLabel}>TRENDING FRONTIER RELEASES (1-TAP):</Text>
            <View style={styles.presetRow}>
              {[
                'DeepSeek-R1',
                'Anthropic MCP',
                'OpenAI o3-mini',
                'Meta Llama 3.3',
                'Cursor AI Agents',
              ].map((preset) => (
                <TouchableOpacity
                  key={preset}
                  style={styles.presetChip}
                  onPress={() => handleIngest(preset)}
                  disabled={isIngesting}
                  activeOpacity={0.7}
                >
                  <Text style={styles.presetChipText}>⚡ {preset}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* URL or Topic Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="Paste news URL or type release topic..."
                placeholderTextColor="#8B716E"
                value={ingestInput}
                onChangeText={setIngestInput}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isIngesting}
              />
              {ingestInput.length > 0 && (
                <TouchableOpacity onPress={() => setIngestInput('')} style={{ padding: 4 }}>
                  <Ionicons name="close-circle" size={18} color="#8B716E" />
                </TouchableOpacity>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsIngestModalVisible(false)}
                disabled={isIngesting}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, isIngesting && styles.modalSubmitBtnDisabled]}
                onPress={() => handleIngest()}
                disabled={isIngesting}
                activeOpacity={0.85}
              >
                {isIngesting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>🚀 Ingest into Radar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F7',
  },
  /* 1. Header */
  header: {
    backgroundColor: '#FFF8F7',
    borderBottomWidth: 1,
    borderBottomColor: '#DFBFBB',
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#3C070B',
    textTransform: 'uppercase',
    letterSpacing: -0.5,
  },
  brandAi: {
    color: '#A8372E',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  matchedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFE9E8',
    borderWidth: 1,
    borderColor: '#DFBFBB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
  },
  matchedBolt: {
    fontSize: 11,
  },
  matchedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#440001',
  },
  notificationBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DFBFBB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#A8372E',
  },

  /* Scroll Content */
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },

  /* 2. Title Section */
  titleSection: {
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleTextCol: {
    flex: 1,
  },
  ingestTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFE9E8',
    borderWidth: 1.5,
    borderColor: '#A8372E',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    shadowColor: '#440001',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  ingestTriggerBolt: {
    fontSize: 12,
  },
  ingestTriggerText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#440001',
    letterSpacing: -0.2,
  },
  discoverTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#3C070B',
    letterSpacing: -0.5,
    marginBottom: 3,
  },
  discoverSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#58413F',
  },

  /* 3. Filter Carousel */
  filterScrollWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: '#DFBFBB',
    paddingBottom: 12,
    marginBottom: 20,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9999,
  },
  filterChipActive: {
    backgroundColor: '#440001',
    shadowColor: '#440001',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  filterChipBrief: {
    backgroundColor: '#FFE9E8',
    borderWidth: 1,
    borderColor: '#A8372E',
  },
  filterChipDefault: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DFBFBB',
  },
  filterChipText: {
    fontSize: 12,
  },
  filterChipTextActive: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  filterChipTextBrief: {
    fontWeight: '700',
    color: '#440001',
  },
  filterChipTextDefault: {
    fontWeight: '500',
    color: '#58413F',
  },

  /* 4. Hero Live Brief Card */
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DFBFBB',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#3C070B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  heroCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE9E8',
  },
  heroLiveGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#BA1A1A',
  },
  heroLiveText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#BA1A1A',
    letterSpacing: 0.8,
  },
  heroDivider: {
    color: '#DFBFBB',
    fontSize: 11,
  },
  heroTimeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#58413F',
  },
  heroSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#DFBFBB',
    backgroundColor: '#FFF8F7',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  heroSaveBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#58413F',
  },
  heroMediaBanner: {
    position: 'relative',
    height: 150,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#3C070B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DFBFBB',
    marginBottom: 14,
  },
  heroGradientBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#440001',
    opacity: 0.95,
  },
  heroPlayCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  heroMediaMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroMediaTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  heroDurationBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  heroDurationText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroMetaBlock: {
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#3C070B',
    letterSpacing: -0.3,
    lineHeight: 25,
    marginBottom: 6,
  },
  heroTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroTagBadge: {
    backgroundColor: '#FFF0EF',
    borderWidth: 1,
    borderColor: '#DFBFBB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  heroTagBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#440001',
  },
  heroSourceLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flex: 1,
  },
  heroSourceLinkText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#A8372E',
  },
  whyItMattersBox: {
    backgroundColor: '#FFF0EF',
    borderLeftWidth: 3,
    borderLeftColor: '#A8372E',
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
  },
  whyItMattersLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  whyItMattersEmoji: {
    fontSize: 12,
  },
  whyItMattersLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#A8372E',
    letterSpacing: 0.8,
  },
  whyItMattersBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  bulletDot: {
    color: '#A8372E',
    fontWeight: '800',
    fontSize: 13,
    lineHeight: 18,
  },
  whyItMattersText: {
    fontSize: 13,
    color: '#3C070B',
    lineHeight: 18,
    flex: 1,
  },
  progressionBox: {
    backgroundColor: '#FFE9E8',
    borderWidth: 1,
    borderColor: '#DFBFBB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  progressionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  progressionEmoji: {
    fontSize: 11,
  },
  progressionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#58413F',
    letterSpacing: 0.6,
  },
  progressionFlow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressionFrom: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DFBFBB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  progressionFromText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3C070B',
  },
  progressionArrow: {
    color: '#A8372E',
    fontWeight: '800',
    fontSize: 12,
  },
  progressionTo: {
    backgroundColor: '#440001',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  progressionToText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  masterclassRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  masterclassEmoji: {
    fontSize: 12,
  },
  masterclassText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#58413F',
  },
  heroAddBtn: {
    backgroundColor: '#440001',
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#440001',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  heroAddBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  /* 5. Section Header */
  dispatchesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  dispatchesLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  crimsonDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#A8372E',
  },
  dispatchesHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#3C070B',
    letterSpacing: 0.6,
  },
  dispatchesCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A8372E',
  },

  /* 6. Feed Dispatches Articles */
  feedList: {
    gap: 14,
  },
  articleCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DFBFBB',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#3C070B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  articleTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE9E8',
  },
  articleSourceText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#58413F',
  },
  articleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  badgeEmerging: {
    backgroundColor: '#FFE9E8',
    borderWidth: 1,
    borderColor: '#DFBFBB',
  },
  badgeFramework: {
    backgroundColor: '#690707',
  },
  badgeBenchmark: {
    backgroundColor: '#FFDAD8',
    borderWidth: 1,
    borderColor: '#DFBFBB',
  },
  articleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  badgeTextEmerging: {
    color: '#A8372E',
  },
  badgeTextFramework: {
    color: '#FFFFFF',
  },
  badgeTextBenchmark: {
    color: '#440001',
  },
  articleTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#3C070B',
    letterSpacing: -0.3,
    lineHeight: 22,
    marginBottom: 8,
  },
  articleBullets: {
    marginBottom: 12,
    gap: 4,
  },
  articleBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  articleBulletText: {
    fontSize: 13,
    color: '#58413F',
    lineHeight: 18,
    flex: 1,
  },
  articleWhyBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF0EF',
    borderWidth: 1,
    borderColor: '#FFDAD8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
    gap: 4,
  },
  articleWhyLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#A8372E',
    letterSpacing: 0.5,
  },
  articleWhyText: {
    fontSize: 12,
    color: '#3C070B',
    lineHeight: 16,
    flex: 1,
    fontWeight: '500',
  },
  articleActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#FFE9E8',
  },
  articleReadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#DFBFBB',
    backgroundColor: '#FFF8F7',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  articleReadBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3C070B',
  },
  articleAddBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#440001',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  articleAddBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  centerBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: '#58413F',
    marginTop: 10,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#3C070B',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#58413F',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  emptyResetBtn: {
    backgroundColor: '#440001',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  emptyResetBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  /* 5. Ingest Live Telemetry Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(60, 7, 11, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#DFBFBB',
    padding: 20,
    shadowColor: '#440001',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalBolt: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#3C070B',
    textTransform: 'uppercase',
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#58413F',
    lineHeight: 17,
    marginBottom: 16,
  },
  presetLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#A8372E',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  presetChip: {
    backgroundColor: '#FFE9E8',
    borderWidth: 1,
    borderColor: '#DFBFBB',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#440001',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8F7',
    borderWidth: 1.5,
    borderColor: '#DFBFBB',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 18,
  },
  textInput: {
    flex: 1,
    height: 42,
    fontSize: 13,
    color: '#3C070B',
  },
  modalActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 6,
  },
  modalCancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#58413F',
  },
  modalSubmitBtn: {
    backgroundColor: '#440001',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 6,
    shadowColor: '#440001',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  modalSubmitBtnDisabled: {
    opacity: 0.6,
  },
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
