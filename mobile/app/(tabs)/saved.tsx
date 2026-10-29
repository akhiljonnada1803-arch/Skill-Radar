import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api/client';
import { Colors } from '../../src/theme/colors';
import { DiscoveryCardItem } from '../../src/types';

export default function SavedScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const { data: savedItems, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['saved'],
    queryFn: () => api.getSaved(),
  });

  const removeSaveMutation = useMutation({
    mutationFn: (id: string) => api.setAction(id, 'none'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved'] });
      queryClient.invalidateQueries({ queryKey: ['discoveries'] });
    },
  });

  const allItems = savedItems || [];
  const filteredItems = allItems.filter((item) => {
    if (selectedCategory === 'ALL') return true;
    return item.category?.toUpperCase() === selectedCategory;
  });

  // Extract unique categories for drawer tabs
  const categories = Array.from(
    new Set(allItems.map((i) => i.category?.toUpperCase()).filter(Boolean))
  ) as string[];

  const renderCard = ({ item }: { item: DiscoveryCardItem }) => {
    const isEmerging = item.evidence_level === 'Emerging';
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
    const accessionNo = `#${item.id.slice(0, 4).toUpperCase()}`;

    return (
      <TouchableOpacity
        style={styles.specimenCard}
        activeOpacity={0.9}
        onPress={() => router.push(`/discovery/${item.id}`)}
      >
        {/* Left Color Spine Strip */}
        <View
          style={[
            styles.colorSpine,
            { backgroundColor: isEmerging ? Colors.primary : Colors.moss },
          ]}
        />

        <View style={styles.cardMain}>
          {/* Top Subhead Slip */}
          <View style={styles.subheadSlip}>
            <View style={styles.accessionGroup}>
              <View style={styles.accessionBox}>
                <Text style={styles.accessionText}>{accessionNo}</Text>
              </View>
              <Text style={styles.subheadSource} numberOfLines={1}>
                {sourceName} · {categoryName}
              </Text>
            </View>

            {/* Tactile Stamp */}
            <View
              style={[
                styles.stampBadge,
                isEmerging ? styles.stampEmerging : styles.stampNew,
              ]}
            >
              <Text
                style={[
                  styles.stampBadgeText,
                  isEmerging ? styles.stampEmergingText : styles.stampNewText,
                ]}
              >
                {item.is_seeded ? 'DEMO' : item.evidence_level.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Body Content */}
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardSummary} numberOfLines={2}>
              {item.summary || 'Tap to inspect archived specimen evidence.'}
            </Text>

            {/* Dashed divider line */}
            <View style={styles.dashedDivider} />

            {/* Bottom Meta & Actions */}
            <View style={styles.bottomMetaRow}>
              <Text style={styles.filedDateText}>FILED: {publishedDate}</Text>

              <View style={styles.actionIconsRow}>
                {/* Remove / Archive button */}
                <TouchableOpacity
                  style={styles.iconBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  onPress={(e) => {
                    e.stopPropagation();
                    removeSaveMutation.mutate(item.id);
                  }}
                >
                  <Ionicons name="archive-outline" size={14} color={Colors.ink} />
                </TouchableOpacity>

                {/* Stage to Roadmap button */}
                <TouchableOpacity
                  style={[styles.iconBtn, styles.iconBtnPrimary]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  onPress={(e) => {
                    e.stopPropagation();
                    router.push(`/discovery/${item.id}`);
                  }}
                >
                  <Ionicons name="add" size={16} color={Colors.canvas} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={Colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerPlate}>
            <Text style={[styles.cornerCross, styles.cornerTopLeft]}>+</Text>
            <Text style={[styles.cornerCross, styles.cornerTopRight]}>+</Text>
            <Text style={[styles.cornerCross, styles.cornerBottomLeft]}>+</Text>
            <Text style={[styles.cornerCross, styles.cornerBottomRight]}>+</Text>

            {/* Top Plate Subhead */}
            <View style={styles.plateTopRow}>
              <View style={styles.plateTitleGroup}>
                <View style={styles.vermilionSquare} />
                <Text style={styles.plateSubhead}>CABINET NO. 04 // LATERAL TRAY</Text>
              </View>
              <View style={styles.slotBadge}>
                <Text style={styles.slotBadgeText}>SLOT: B-02</Text>
              </View>
            </View>

            {/* Title & Filed Count */}
            <View style={styles.plateMainRow}>
              <Text style={styles.plateTitle}>Index Archive</Text>
              <Text style={styles.filedCountBadge}>
                FILED: {String(allItems.length).padStart(2, '0')}
              </Text>
            </View>

            {/* Telemetry Status Strip */}
            <View style={styles.plateTelemetryStrip}>
              <View style={styles.telemetryStatusLeft}>
                <Ionicons name="lock-closed" size={12} color={Colors.moss} />
                <Text style={styles.telemetryStatusText}>LATERAL MECH ENGAGED</Text>
              </View>
              <Text style={styles.telemetryRevText}>ARCHIVE REV: 2026.10</Text>
            </View>

            {/* Drawer Index Divider Tabs */}
            {categories.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.drawerTabRow}
                style={styles.drawerTabScroll}
              >
                <TouchableOpacity
                  style={[
                    styles.drawerTabBtn,
                    selectedCategory === 'ALL' && styles.drawerTabBtnActive,
                  ]}
                  onPress={() => setSelectedCategory('ALL')}
                >
                  <Text
                    style={[
                      styles.drawerTabText,
                      selectedCategory === 'ALL' && styles.drawerTabTextActive,
                    ]}
                  >
                    ALL ({allItems.length})
                  </Text>
                </TouchableOpacity>

                {categories.map((cat) => {
                  const count = allItems.filter(
                    (i) => i.category?.toUpperCase() === cat
                  ).length;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.drawerTabBtn,
                        selectedCategory === cat && styles.drawerTabBtnActive,
                      ]}
                      onPress={() => setSelectedCategory(cat)}
                    >
                      <Text
                        style={[
                          styles.drawerTabText,
                          selectedCategory === cat && styles.drawerTabTextActive,
                        ]}
                      >
                        {cat} ({count})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingLabel}>INSPECTING CABINET TRAY...</Text>
            </View>
          ) : (
            <View style={styles.centered}>
              <Ionicons name="file-tray-outline" size={48} color={Colors.secondaryText} />
              <Text style={styles.emptyTitle}>CABINET TRAY IS EMPTY</Text>
              <Text style={styles.emptySub}>
                Discoveries bookmarked on the Radar feed will be filed into this lateral tray.
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
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

  // Header plate
  headerPlate: {
    backgroundColor: Colors.surfaceContainer,
    borderWidth: 1,
    borderColor: Colors.ink,
    padding: 14,
    marginBottom: 16,
    position: 'relative',
    shadowColor: Colors.ink,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  plateTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.rule,
    paddingBottom: 6,
    marginBottom: 6,
  },
  plateTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vermilionSquare: {
    width: 6,
    height: 6,
    backgroundColor: Colors.primary,
  },
  plateSubhead: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '800',
    color: Colors.ink,
    letterSpacing: 0.8,
  },
  slotBadge: {
    borderWidth: 1,
    borderColor: Colors.ink,
    backgroundColor: Colors.surfaceContainerHighest,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  slotBadgeText: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '800',
    color: Colors.ink,
    letterSpacing: 0.5,
  },
  plateMainRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  plateTitle: {
    fontFamily: 'serif',
    fontWeight: '800',
    fontSize: 22,
    color: Colors.ink,
    letterSpacing: -0.3,
  },
  filedCountBadge: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 1,
  },
  plateTelemetryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: Colors.rule,
    borderStyle: 'dashed',
    paddingTop: 6,
    marginTop: 2,
  },
  telemetryStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  telemetryStatusText: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: Colors.ink,
    letterSpacing: 0.5,
  },
  telemetryRevText: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: Colors.secondaryText,
  },

  // Drawer index divider tabs
  drawerTabScroll: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.rule,
    paddingTop: 8,
  },
  drawerTabRow: {
    flexDirection: 'row',
    gap: 6,
  },
  drawerTabBtn: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: Colors.ink,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  drawerTabBtnActive: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  drawerTabText: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '700',
    color: Colors.secondaryText,
    letterSpacing: 0.5,
  },
  drawerTabTextActive: {
    color: Colors.ink,
  },

  // Specimen Cards
  specimenCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.ink,
    marginBottom: 12,
    flexDirection: 'row',
    shadowColor: Colors.ink,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  colorSpine: {
    width: 4,
  },
  cardMain: {
    flex: 1,
  },
  subheadSlip: {
    backgroundColor: Colors.surfaceContainerLow,
    borderBottomWidth: 1,
    borderBottomColor: Colors.rule,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accessionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  accessionBox: {
    borderWidth: 1,
    borderColor: Colors.ink,
    backgroundColor: Colors.surfaceContainer,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  accessionText: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '800',
    color: Colors.ink,
  },
  subheadSource: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: Colors.secondaryText,
    letterSpacing: 0.5,
  },

  stampBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    transform: [{ rotate: '-1.5deg' }],
  },
  stampEmerging: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  stampNew: {
    borderColor: Colors.ink,
    backgroundColor: 'transparent',
  },
  stampBadgeText: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  stampEmergingText: {
    color: Colors.canvas,
  },
  stampNewText: {
    color: Colors.ink,
  },

  cardBody: {
    padding: 12,
  },
  cardTitle: {
    fontFamily: 'serif',
    fontWeight: '700',
    fontSize: 16,
    color: Colors.ink,
    lineHeight: 22,
    marginBottom: 4,
  },
  cardSummary: {
    fontFamily: 'serif',
    fontSize: 13,
    color: Colors.secondaryText,
    lineHeight: 18,
    marginBottom: 8,
  },
  dashedDivider: {
    borderTopWidth: 1,
    borderColor: Colors.rule,
    borderStyle: 'dashed',
    marginVertical: 4,
  },
  bottomMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  filedDateText: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: Colors.secondaryText,
    letterSpacing: 0.5,
  },
  actionIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    width: 28,
    height: 28,
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
  iconBtnPrimary: {
    backgroundColor: Colors.primary,
  },

  centered: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 8,
  },
  loadingLabel: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: Colors.secondaryText,
    letterSpacing: 0.8,
  },
  emptyTitle: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: '800',
    color: Colors.ink,
    letterSpacing: 1,
  },
  emptySub: {
    fontFamily: 'serif',
    fontSize: 13,
    color: Colors.secondaryText,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
