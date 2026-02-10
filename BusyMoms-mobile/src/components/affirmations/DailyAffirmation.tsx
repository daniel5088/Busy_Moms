import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
// @ts-ignore
import { Sparkles, X as XIcon, Star, RefreshCw, Calendar } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { affirmationService } from '../../services/affirmationService';
import { logger } from '../../utils/logger';
import type { Affirmation } from '../../types/database';

interface DailyAffirmationProps {
  visible: boolean;
  onClose: () => void;
  onOpenVoiceChat?: () => void;
}

export function DailyAffirmation({ visible, onClose, onOpenVoiceChat }: DailyAffirmationProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [affirmations, setAffirmations] = useState<Affirmation[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'today' | 'history'>('today');

  const loadAffirmations = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const history = await affirmationService.getAffirmationHistory(user.id, 30);
      setAffirmations(history);

      // Auto-generate if no affirmation for today
      const today = new Date().toISOString().split('T')[0];
      const hasTodayAffirmation = history.some((a) => a.generated_date === today);

      if (!hasTodayAffirmation) {
        setGenerating(true);
        try {
          const newAffirmation = await affirmationService.generateAffirmation(false);
          setAffirmations([newAffirmation, ...history]);
        } catch (error: unknown) {
          logger.error('[DailyAffirmation] Error auto-generating:', error);
        } finally {
          setGenerating(false);
        }
      }
    } catch (error: unknown) {
      logger.error('[DailyAffirmation] Error loading affirmations:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (visible) {
      loadAffirmations();
    }
  }, [visible, loadAffirmations]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const newAffirmation = await affirmationService.generateAffirmation(true);
      setAffirmations((prev) => {
        const filtered = prev.filter((a) => a.generated_date !== newAffirmation.generated_date);
        return [newAffirmation, ...filtered];
      });
    } catch (error: unknown) {
      logger.error('[DailyAffirmation] Error generating:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleFavorite = async (affirmation: Affirmation) => {
    try {
      await affirmationService.toggleFavorite(affirmation.id, !affirmation.favorited);
      setAffirmations((prev) =>
        prev.map((a) => (a.id === affirmation.id ? { ...a, favorited: !a.favorited } : a))
      );
    } catch (error: unknown) {
      logger.error('[DailyAffirmation] Error toggling favorite:', error);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAffirmation = affirmations.find((a) => a.generated_date === todayStr);

  const renderDataSources = (affirmation: Affirmation) => {
    if (!affirmation.data_sources) return null;
    const sources = affirmation.data_sources;
    return (
      <View style={styles.sourceTags}>
        {sources.calendar && <View style={[styles.sourceTag, { backgroundColor: '#EDE9FE' }]}><Text style={[styles.sourceTagText, { color: '#7C3AED' }]}>Calendar</Text></View>}
        {sources.tasks && <View style={[styles.sourceTag, { backgroundColor: '#DBEAFE' }]}><Text style={[styles.sourceTagText, { color: '#2563EB' }]}>Tasks</Text></View>}
        {sources.family && <View style={[styles.sourceTag, { backgroundColor: '#FCE7F3' }]}><Text style={[styles.sourceTagText, { color: '#DB2777' }]}>Family</Text></View>}
        {sources.shopping && <View style={[styles.sourceTag, { backgroundColor: '#D1FAE5' }]}><Text style={[styles.sourceTagText, { color: '#059669' }]}>Shopping</Text></View>}
      </View>
    );
  };

  const renderTodayContent = () => {
    if (loading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      );
    }

    if (todayAffirmation) {
      return (
        <View style={styles.todayContent}>
          <View style={[styles.todayCard, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.default }]}>
            <View style={styles.todayHeader}>
              <View style={styles.dateRow}>
                <Calendar color="#8B5CF6" size={16} />
                <Text style={[styles.dateText, { color: '#8B5CF6' }]}>
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              </View>
              <Pressable
                onPress={() => handleToggleFavorite(todayAffirmation)}
                hitSlop={8}
                accessibilityLabel={todayAffirmation.favorited ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Star
                  color={todayAffirmation.favorited ? '#EAB308' : theme.colors.gray[400]}
                  fill={todayAffirmation.favorited ? '#EAB308' : 'transparent'}
                  size={22}
                />
              </Pressable>
            </View>

            <Text style={[styles.affirmationText, { color: theme.colors.text.primary }]}>
              {todayAffirmation.affirmation_text}
            </Text>

            {renderDataSources(todayAffirmation)}
          </View>

          <Pressable
            onPress={handleGenerate}
            disabled={generating}
            style={({ pressed }) => [
              styles.regenerateButton,
              { opacity: generating ? 0.6 : pressed ? 0.8 : 1 },
            ]}
          >
            <LinearGradient
              colors={['#8B5CF6', '#EC4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.regenerateGradient}
            >
              {generating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <RefreshCw color="#FFFFFF" size={18} />
              )}
              <Text style={styles.regenerateText}>
                {generating ? 'Regenerating...' : 'Regenerate Affirmation'}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.centered}>
        <View style={styles.emptyIcon}>
          <Sparkles color="#8B5CF6" size={40} />
        </View>
        {generating ? (
          <>
            <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>
              Generating Your Affirmation
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.text.secondary }]}>
              Creating personalized encouragement based on your schedule...
            </Text>
            <ActivityIndicator size="large" color="#8B5CF6" style={{ marginTop: 16 }} />
          </>
        ) : (
          <>
            <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>
              No Affirmation Yet
            </Text>
            <Pressable onPress={handleGenerate} style={styles.generateFirstButton}>
              <Text style={styles.generateFirstText}>Generate Your First Affirmation</Text>
            </Pressable>
          </>
        )}
      </View>
    );
  };

  const renderHistoryItem = ({ item }: { item: Affirmation }) => (
    <View style={[styles.historyCard, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.default }]}>
      <View style={styles.historyHeader}>
        <View style={styles.dateRow}>
          <Calendar color={theme.colors.text.tertiary} size={14} />
          <Text style={[styles.historyDate, { color: theme.colors.text.secondary }]}>
            {new Date(item.generated_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
          {item.favorited && (
            <View style={styles.favoriteBadge}>
              <Text style={styles.favoriteBadgeText}>Favorite</Text>
            </View>
          )}
        </View>
        <Pressable onPress={() => handleToggleFavorite(item)} hitSlop={8}>
          <Star
            color={item.favorited ? '#EAB308' : theme.colors.gray[400]}
            fill={item.favorited ? '#EAB308' : 'transparent'}
            size={18}
          />
        </Pressable>
      </View>
      <Text style={[styles.historyText, { color: theme.colors.text.primary }]}>
        {item.affirmation_text}
      </Text>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        {/* Header */}
        <LinearGradient
          colors={['#8B5CF6', '#EC4899', '#F97316']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <Pressable
            onPress={onClose}
            style={styles.closeButton}
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <XIcon color="#FFFFFF" size={20} />
          </Pressable>

          <View style={styles.headerContent}>
            <View style={styles.headerIcon}>
              <Sparkles color="#FFFFFF" size={24} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Daily Affirmations</Text>
              <Text style={styles.headerSubtitle}>Your personalized encouragement</Text>
            </View>
          </View>

          <View style={styles.tabs}>
            <Pressable
              onPress={() => setActiveTab('today')}
              style={[styles.tab, activeTab === 'today' && styles.activeTab]}
            >
              <Text style={[styles.tabText, activeTab === 'today' && styles.activeTabText]}>
                Today
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab('history')}
              style={[styles.tab, activeTab === 'history' && styles.activeTab]}
            >
              <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
                History
              </Text>
            </Pressable>
          </View>
        </LinearGradient>

        {/* Content */}
        {activeTab === 'today' ? (
          renderTodayContent()
        ) : (
          <FlatList
            data={affirmations}
            renderItem={renderHistoryItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.historyList}
            ListEmptyComponent={
              <View style={styles.centered}>
                <Text style={[styles.emptySubtitle, { color: theme.colors.text.secondary }]}>
                  No affirmations yet. Generate your first one!
                </Text>
              </View>
            }
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 48,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  activeTabText: {
    color: '#8B5CF6',
  },
  todayContent: {
    flex: 1,
    padding: 20,
  },
  todayCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  todayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600',
  },
  affirmationText: {
    fontSize: 18,
    lineHeight: 26,
    marginBottom: 16,
  },
  sourceTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  sourceTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sourceTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  regenerateButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  regenerateGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  regenerateText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
  },
  generateFirstButton: {
    marginTop: 16,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  generateFirstText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  historyList: {
    padding: 16,
    gap: 12,
  },
  historyCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyDate: {
    fontSize: 13,
  },
  favoriteBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  favoriteBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#D97706',
  },
  historyText: {
    fontSize: 15,
    lineHeight: 22,
  },
});
