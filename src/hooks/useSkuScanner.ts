import { useCallback, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';

export interface BoundingBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface FoundImage {
  uri: string;
  matchBox: BoundingBox | null;
  imageWidth: number;
  imageHeight: number;
}

export interface ScanResult {
  text: string;
  uri: string;
  blocks: Array<{
    text: string;
    frame: BoundingBox;
  }>;
  imageWidth: number;
  imageHeight: number;
}

export interface ScanState {
  isScanning: boolean;
  scanCount: number;
  foundImage: FoundImage | null;
}

export function useSkuScanner(targetSku: string) {
  const [state, setState] = useState<ScanState>({
    isScanning: false,
    scanCount: 0,
    foundImage: null,
  });

  const lastMatchTime = useRef<number>(0);

  const triggerMatch = useCallback(async (image: FoundImage) => {
    const now = Date.now();
    if (now - lastMatchTime.current < 2000) return;
    lastMatchTime.current = now;

    // Triple heavy haptic burst
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 120);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 240);
    setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 400);

    // Stop scanning and freeze the frame
    setState(prev => ({
      ...prev,
      isScanning: false,
      foundImage: image,
    }));
  }, []);

  const processScanResult = useCallback(
    ({ text, uri, blocks, imageWidth, imageHeight }: ScanResult) => {
      if (!targetSku.trim()) return false;

      const target = targetSku.trim().toUpperCase().replace(/\s+/g, '');

      setState(prev => ({ ...prev, scanCount: prev.scanCount + 1 }));

      // Check if any block contains our SKU
      const normalizedText = text.toUpperCase().replace(/\s+/g, '');
      if (!normalizedText.includes(target)) return false;

      // Find the specific block that contains the match for highlighting
      const matchingBlock = blocks.find(b =>
        b.text.toUpperCase().replace(/\s+/g, '').includes(target)
      );

      triggerMatch({
        uri,
        matchBox: matchingBlock?.frame ?? null,
        imageWidth,
        imageHeight,
      });

      return true;
    },
    [targetSku, triggerMatch],
  );

  const startScanning = useCallback(() => {
    setState(prev => ({ ...prev, isScanning: true, foundImage: null }));
  }, []);

  const stopScanning = useCallback(() => {
    setState(prev => ({ ...prev, isScanning: false }));
  }, []);

  const scanAgain = useCallback(() => {
    setState(prev => ({ ...prev, isScanning: true, foundImage: null }));
  }, []);

  return { state, processScanResult, startScanning, stopScanning, scanAgain };
}
