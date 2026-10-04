import React, { useRef, useEffect, useMemo } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, ColorTokens, radius, getThemedShadows } from '../../theme';

interface Props {
  onPress: () => void;
}

export function FAB({ onPress }: Props) {
  const { colors, isDark } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const entrance = useRef(new Animated.Value(0)).current;

  const s = useMemo(() => getFabStyles(colors, isDark), [colors, isDark]);

  useEffect(() => {
    Animated.spring(entrance, {
      toValue: 1,
      tension: 160,
      friction: 9,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={s.container} pointerEvents="box-none">
      <Animated.View
        style={[
          {
            opacity: entrance,
            transform: [
              { scale: Animated.multiply(scale, entrance) },
            ],
          },
        ]}
      >
        <Pressable
          onPress={onPress}
          onPressIn={() =>
            Animated.spring(scale, { toValue: 0.91, useNativeDriver: true, tension: 400, friction: 10 }).start()
          }
          onPressOut={() =>
            Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 350, friction: 10 }).start()
          }
          style={s.fab}
          accessibilityRole="button"
          accessibilityLabel="Novo registro"
        >
          <Feather name="plus" size={24} color={colors.text.onAmber} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const FAB_SIZE = 58;

function getFabStyles(colors: ColorTokens, isDark: boolean) {
  const themedShadows = getThemedShadows(isDark);
  return StyleSheet.create({
    container: {
      position: 'absolute',
      bottom:   24,
      right:    20,
      zIndex:   100,
    },

    fab: {
      width:           FAB_SIZE,
      height:          FAB_SIZE,
      borderRadius:    radius.full,
      backgroundColor: colors.amber.DEFAULT,
      alignItems:      'center',
      justifyContent:  'center',
      ...themedShadows.amber,
    },
  });
}
