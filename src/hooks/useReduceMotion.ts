import { useState, useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Hook para respeitar a preferência de acessibilidade "Reduzir Movimento"
 * (Reduce Motion) do sistema operacional (iOS / Android / Web).
 */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    // Consulta o estado inicial no sistema
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => setReduceMotion(enabled))
      .catch(() => setReduceMotion(false));

    // Escuta mudanças dinâmicas na preferência de acessibilidade
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled: boolean) => setReduceMotion(enabled)
    );

    return () => {
      subscription?.remove();
    };
  }, []);

  return reduceMotion;
}
