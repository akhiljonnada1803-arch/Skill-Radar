import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/api/client';
import { Colors } from '../src/theme/colors';
import { DomainItem } from '../src/types';

export default function DomainSelectScreen() {
  const router = useRouter();
  const { selectDomain, profile } = useAuth();
  const [selectedSlug, setSelectedSlug] = useState<string>(
    profile?.selected_domain_slug || 'ai-engineering'
  );
  const [saving, setSaving] = useState(false);

  const { data: domains, isLoading } = useQuery({
    queryKey: ['domains'],
    queryFn: () => api.getDomains(),
  });

  const handleConfirm = async () => {
    if (!domains) return;
    const domain = domains.find((d: DomainItem) => d.slug === selectedSlug) || domains[0];
    setSaving(true);
    try {
      await selectDomain(domain);
      router.replace('/(tabs)/roadmap');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Masthead */}
        <View style={styles.masthead}>
          <Text style={styles.accessionTag}>SURVEY DISCIPLINE // SELECTION PROTOCOL</Text>
          <Text style={styles.title}>Pick Your Domain</Text>
          <Text style={styles.subtitle}>
            Select your technical discipline. Your learning roadmap will be pre-configured with curated,
            prerequisite-ordered competencies, expandable with newly published research papers and releases.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>CATALOGING TECHNICAL DOMAINS...</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {(domains || []).map((domain: DomainItem) => {
              const isSelected = domain.slug === selectedSlug;
              return (
                <TouchableOpacity
                  key={domain.id}
                  style={[styles.domainCard, isSelected && styles.domainCardSelected]}
                  onPress={() => setSelectedSlug(domain.slug)}
                  activeOpacity={0.8}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.badgeContainer}>
                      <Text style={[styles.accessionCode, isSelected && styles.textPrimary]}>
                        CODE: {domain.slug.toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.radioSquare}>
                      {isSelected && <View style={styles.radioInnerSquare} />}
                    </View>
                  </View>

                  <Text style={styles.domainName}>{domain.name}</Text>
                  <Text style={styles.domainDescription}>{domain.description}</Text>

                  <View style={styles.cardFooter}>
                    <Text style={styles.milestoneTag}>
                      [MILESTONES: {domain.skill_count} CURATED COMPETENCIES]
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleConfirm}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator color={Colors.surfaceElevated} />
              ) : (
                <Text style={styles.confirmBtnText}>INITIALIZE EXPEDITION ROADMAP</Text>
              )}
            </TouchableOpacity>
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
  scroll: {
    padding: 20,
  },
  masthead: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: Colors.ink,
    paddingBottom: 16,
  },
  accessionTag: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  title: {
    fontFamily: 'serif',
    fontSize: 30,
    fontWeight: '800',
    color: Colors.ink,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: 'serif',
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 6,
    lineHeight: 20,
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginTop: 12,
  },
  listContainer: {
    gap: 16,
  },
  domainCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.ink,
    padding: 16,
    shadowColor: Colors.ink,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  domainCardSelected: {
    backgroundColor: Colors.surfaceElevated,
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
  },
  accessionCode: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  textPrimary: {
    color: Colors.primary,
  },
  radioSquare: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.canvas,
  },
  radioInnerSquare: {
    width: 10,
    height: 10,
    backgroundColor: Colors.primary,
  },
  domainName: {
    fontFamily: 'serif',
    fontSize: 22,
    fontWeight: '800',
    color: Colors.ink,
    marginBottom: 6,
  },
  domainDescription: {
    fontFamily: 'serif',
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  cardFooter: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 8,
  },
  milestoneTag: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '700',
    color: Colors.moss,
    letterSpacing: 0.8,
  },
  confirmBtn: {
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.ink,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: Colors.ink,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
    marginTop: 10,
    marginBottom: 30,
  },
  confirmBtnText: {
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: '800',
    color: Colors.surfaceElevated,
    letterSpacing: 1,
  },
});
