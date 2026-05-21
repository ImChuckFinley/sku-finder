import { useCallback, useRef, useState } from 'react';
import { Animated } from 'react-native';
import * as Haptics from 'expo-haptics';

export interface ScanState {
  isScanning: boolean;
  lastScannedText: string;
  matchFound: boolean;
  scanCount: number;
}

export function useSkuScanner(targetSku: string, flashAnim: Animated.Value) {
  const [state, setState] = useState<ScanState>({
    isScanning: false,
    lastScannedText: '',
    matchFound: false,
    scanCount: 0,
  });

  // Debounce: don't re-alert within 2 seconds of a match
  const lastMatchTime = useRef<number>(0);

  const triggerMatch = useCallback(async () => {
    const now = Date.now();
    if (now - lastMatchTime.current < 2000) return;
    lastMatchTime.current = now;

    setState(prev => ({ ...prev, matchFound: true }));

    // Green flash animation
    Animated.sequence([
      Animated.timing(flashAnim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(flashAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setState(prev => ({ ...prev, matchFound: false }));
    });

    // Heavy haptic impact
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 200);
  }, [flashAnim]);

  const processOcrResult = useCallback(
    (recognizedText: string) => {
      if (!targetSku.trim()) return;

      const normalized = recognizedText.toUpperCase().replace(/\s+/g, '');
      const target = targetSku.trim().toUpperCase().replace(/\s+/g, '');

      setState(prev => ({
        ...prev,
        lastScannedText: recognizedText.slice(0, 80),
        scanCount: prev.scanCount + 1,
      }));

      if (normalized.includes(target)) {
        triggerMatch();
      }
    },
    [targetSku, triggerMatch],
  );

  const setScanning = useCallback((value: boolean) => {
    setState(prev => ({ ...prev, isScanning: value }));
  }, []);

  return { state, processOcrResult, setScanning };
}
