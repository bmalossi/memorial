import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { useTheme, typography, spacing, radius } from '../../theme';
import {
  PASTORAL_ONBOARDING_DISMISS_KEY,
  isPastoralOnboardingWithinCooldown,
} from '../../lib/authOAuthUtils';
export { PASTORAL_ONBOARDING_DISMISS_KEY };

interface Props {
  visible: boolean;
  onLinkPastor: () => void;
}

export function PastoralOnboardingBanner({ visible, onLinkPastor }: Props) {
  const { colors, isDark } = useTheme();
  const [isDismissed, setIsDismissed] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let isMounted = true;

    async function checkDismissal() {
      try {
        const stored = await AsyncStorage.getItem(PASTORAL_ONBOARDING_DISMISS_KEY);
        if (stored) {
          const timestamp = parseInt(stored, 10);
          if (isPastoralOnboardingWithinCooldown(timestamp)) {
            if (isMounted) setIsDismissed(true);
            return;
          }
        }
        if (isMounted) setIsDismissed(false);
      } catch {
        if (isMounted) setIsDismissed(false);
      }
    }

    if (visible) {
      checkDismissal();
    } else {
      setIsDismissed(true);
    }

    return () => {
      isMounted = false;
    };
  }, [visible]);

  useEffect(() => {
    if (visible && !isDismissed) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible, isDismissed]);

  const handleDismiss = async () => {
    setIsDismissed(true);
    try {
      await AsyncStorage.setItem(
        PASTORAL_ONBOARDING_DISMISS_KEY,
        Date.now().toString()
      );
    } catch {
      // Silencioso
    }
  };

  if (!visible || isDismissed) {
    return null;
  }

  return (
    <Animated.View
      style={[
        s.container,
        {
          opacity: fadeAnim,
          backgroundColor: isDark ? '#1C1914' : '#FDFBF5',
          borderColor: isDark ? '#3D3422' : '#E8DDBF',
        },
      ]}
      accessibilityRole="alert"
    >
      <View style={s.topRow}>
        <View style={s.badgeWrap}>
          <View
            style={[
              s.iconCircle,
              { backgroundColor: isDark ? '#2B2416' : '#F5EACF' },
            ]}
          >
            <Feather name="shield" size={13} color={colors.amber.DEFAULT} />
          </View>
          <Text style={[s.badgeText, { color: colors.amber.DEFAULT }]}>
            COBERTURA PASTORAL
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={s.dismissBtn}
          accessibilityLabel="Dispensar aviso"
          accessibilityRole="button"
        >
          <Feather name="x" size={14} color={colors.text.muted} />
        </TouchableOpacity>
      </View>

      <Text style={[s.description, { color: colors.text.secondary }]}>
        Vincule seu pastor ou igreja para contar com cobertura e oração discreta nos momentos da sua jornada espiritual.
      </Text>

      <View style={s.actionsRow}>
        <TouchableOpacity
          onPress={onLinkPastor}
          activeOpacity={0.8}
          style={[s.actionBtn, { backgroundColor: colors.amber.DEFAULT }]}
          accessibilityRole="button"
          accessibilityLabel="Vincular pastor ou igreja agora"
        >
          <Feather name="user-plus" size={13} color={colors.text.onAmber} />
          <Text style={[s.actionBtnText, { color: colors.text.onAmber }]}>
            Vincular Pastor / Igreja
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    marginHorizontal: spacing['5'],
    marginTop: spacing['3'],
    marginBottom: spacing['2'],
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing['4'],
    paddingVertical: spacing['3'],
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  iconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.8,
  },
  dismissBtn: {
    padding: 2,
  },
  description: {
    fontSize: typography.size.xs,
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing['3'],
    paddingVertical: 7,
    borderRadius: radius.sm,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: typography.weight.semibold,
    letterSpacing: 0.2,
  },
});
