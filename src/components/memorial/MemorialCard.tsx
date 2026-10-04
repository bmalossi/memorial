import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, ColorTokens, typography, spacing } from '../../theme';
import { MemorialEntry } from '../../lib/types';
import { CATEGORY_CONFIG, relativeDate, truncate } from '../../lib/utils';

interface Props {
  entry:     MemorialEntry;
  onPress:   () => void;
  onAnswer?: () => void;
}

export function MemorialCard({ entry, onPress, onAnswer }: Props) {
  const { colors, isDark } = useTheme();
  const cfg = CATEGORY_CONFIG[entry.category];
  const scale = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  const answerScale = useRef(new Animated.Value(1)).current;
  const [isMarking, setIsMarking] = useState(false);

  const s = useMemo(() => getCardStyles(colors, isDark), [colors, isDark]);

  useEffect(() => {
    if (entry.ai_status === 'processing') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.35,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [entry.ai_status]);

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.985, useNativeDriver: true, tension: 350, friction: 12 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 350, friction: 12 }).start();
  };

  const handleAnswerPress = () => {
    if (!onAnswer || isMarking) return;
    setIsMarking(true);
    Animated.sequence([
      Animated.timing(answerScale, { toValue: 0.93, duration: 70, useNativeDriver: true }),
      Animated.spring(answerScale, { toValue: 1.03, tension: 280, friction: 8, useNativeDriver: true }),
      Animated.timing(answerScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start(() => {
      onAnswer();
      setIsMarking(false);
    });
  };

  const isAnsweredPrayer = entry.category === 'oracao' && entry.is_answered;

  return (
    <Animated.View style={[s.wrapper, { transform: [{ scale }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={`${cfg.label}: ${entry.title ?? entry.content.slice(0, 40)}`}
        style={s.card}
      >
        {/* Topo: Categoria e Data */}
        <View style={s.header}>
          <Text style={s.categoryLabel}>{cfg.tag}</Text>
          <Text style={s.dateText}>{relativeDate(entry.created_at)}</Text>
        </View>

        {/* Referência bíblica */}
        {entry.bible_ref && (
          <Text style={s.bibleRef}>{entry.bible_ref.display}</Text>
        )}

        {/* Título */}
        {entry.title ? (
          <Text style={s.title} numberOfLines={2}>{entry.title}</Text>
        ) : null}

        {/* Preview */}
        <Text style={s.body} numberOfLines={3}>
          {truncate(entry.content, 140)}
        </Text>

        {/* Rodapé */}
        <View style={s.footer}>
          <View style={s.tagsRow}>
            {(entry.tags ?? []).slice(0, 2).map((tag) => (
              <View key={tag} style={s.tagChip}>
                <Text style={s.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>

          {entry.ai_status === 'processing' && (
            <View style={s.aiStatusWrap}>
              <Animated.View
                style={[
                  s.pulseDot,
                  {
                    opacity: pulseAnim,
                    transform: [
                      {
                        scale: pulseAnim.interpolate({
                          inputRange: [0.35, 1],
                          outputRange: [0.85, 1.25],
                        }),
                      },
                    ],
                  },
                ]}
              />
              <Text style={s.aiStatusText}>Identificando conexões…</Text>
            </View>
          )}

          {entry.ai_status === 'done' && (entry.ai_connections?.length ?? 0) > 0 && (
            <View style={s.aiConnectionBadge}>
              <Feather name="bookmark" size={11} color={colors.amber.DEFAULT} />
              <Text style={s.aiConnectionText}>
                {entry.ai_connections!.length}{' '}
                {entry.ai_connections!.length === 1 ? 'passagem conectada' : 'passagens conectadas'}
              </Text>
            </View>
          )}

          {isAnsweredPrayer && (
            <View style={s.answeredBadge}>
              <Feather name="check" size={11} color={colors.text.secondary} />
              <Text style={s.answeredText}>Respondida</Text>
            </View>
          )}
        </View>

        {/* Ação: marcar oração como respondida */}
        {entry.category === 'oracao' && !entry.is_answered && onAnswer && (
          <Animated.View style={{ transform: [{ scale: answerScale }] }}>
            <TouchableOpacity
              style={s.answerBtn}
              onPress={handleAnswerPress}
              activeOpacity={0.82}
              accessibilityRole="button"
            >
              <Feather name="check" size={13} color={colors.amber.DEFAULT} />
              <Text style={s.answerBtnText}>Registrar oração como respondida</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </Pressable>
    </Animated.View>
  );
}

function getCardStyles(colors: ColorTokens, isDark: boolean) {
  return StyleSheet.create({
    wrapper: { width: '100%' },

    card: {
      backgroundColor: colors.bg.surface,
      borderRadius:    16,
      borderWidth:     1,
      borderColor:     colors.border.DEFAULT,
      padding:         spacing['5'],
      gap:             spacing['2'],
      shadowColor:     isDark ? '#000' : '#3A3228',
      shadowOffset:    { width: 0, height: 2 },
      shadowOpacity:   isDark ? 0.25 : 0.06,
      shadowRadius:    6,
      elevation:       2,
    },

    header: {
      flexDirection:  'row',
      alignItems:     'center',
      justifyContent: 'space-between',
      marginBottom:   2,
    },

    categoryLabel: {
      color:         colors.text.secondary,
      fontSize:      11,
      fontWeight:    typography.weight.semibold,
      letterSpacing: 1.2,
    },

    dateText: {
      color:    colors.text.muted,
      fontSize: 12,
    },

    bibleRef: {
      color:         colors.amber.DEFAULT,
      fontSize:      typography.size.sm,
      fontWeight:    typography.weight.semibold,
      letterSpacing: 0.2,
    },

    title: {
      color:      colors.text.primary,
      fontSize:   typography.size.base,
      fontWeight: typography.weight.semibold,
      lineHeight: 22,
    },

    body: {
      color:      isDark ? '#C9C4CD' : '#4A453F',
      fontSize:   14,
      lineHeight: 22,
    },

    footer: {
      flexDirection:  'row',
      alignItems:     'center',
      justifyContent: 'space-between',
      flexWrap:       'wrap',
      gap:            spacing['2'],
      marginTop:      spacing['2'],
      paddingTop:     spacing['2'],
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border.subtle,
    },

    tagsRow: {
      flexDirection: 'row',
      gap:           spacing['2'],
    },

    tagChip: {
      backgroundColor:   colors.bg.raised,
      borderRadius:      6,
      paddingHorizontal: 8,
      paddingVertical:   3,
      borderWidth:       1,
      borderColor:       colors.border.subtle,
    },

    tagText: {
      color:    colors.text.muted,
      fontSize: 11,
    },

    aiStatusWrap: {
      flexDirection: 'row',
      alignItems:    'center',
      gap:           6,
    },

    pulseDot: {
      width:           6,
      height:          6,
      borderRadius:    3,
      backgroundColor: colors.amber.DEFAULT,
      opacity:         0.8,
    },

    aiStatusText: {
      color:     colors.text.muted,
      fontSize:  11,
      fontStyle: 'italic',
    },

    aiConnectionBadge: {
      flexDirection:     'row',
      alignItems:        'center',
      backgroundColor:   colors.amber.muted,
      paddingHorizontal: 8,
      paddingVertical:   3,
      borderRadius:      6,
      gap:               5,
    },

    aiConnectionText: {
      color:      isDark ? colors.amber.light : colors.amber.DEFAULT,
      fontSize:   11,
      fontWeight: typography.weight.medium,
    },

    answeredBadge: {
      flexDirection:     'row',
      alignItems:        'center',
      backgroundColor:   colors.bg.raised,
      paddingHorizontal: 8,
      paddingVertical:   3,
      borderRadius:      6,
      gap:               5,
      borderWidth:       1,
      borderColor:       colors.border.subtle,
    },

    answeredText: {
      color:      colors.text.secondary,
      fontSize:   11,
      fontWeight: typography.weight.medium,
    },

    answerBtn: {
      flexDirection:   'row',
      alignItems:      'center',
      justifyContent:  'center',
      backgroundColor: colors.bg.raised,
      borderRadius:    10,
      paddingVertical: 10,
      gap:             6,
      marginTop:       spacing['1'],
      borderWidth:     1,
      borderColor:     colors.border.subtle,
    },

    answerBtnText: {
      color:      isDark ? colors.amber.light : colors.amber.DEFAULT,
      fontSize:   12,
      fontWeight: typography.weight.medium,
    },
  });
}
