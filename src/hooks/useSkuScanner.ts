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
  matchBoxes: BoundingBox[];
  imageWidth: number;
  imageHeight: number;
}

export interface ScanResult {
  text: string;
  uri: string;
  blocks: Array<{
    text: string;
    frame: BoundingBox;
    lines: Array<{ text: string; frame: BoundingBox }>;
  }>;
  imageWidth: number;
  imageHeight: number;
}

export interface ScanState {
  isScanning: boolean;
  scanCount: number;
  foundImage: FoundImage | null;
}

/**
 * Primary match: exact — used during live scanning.
 */
function exactMatch(blockText: string, target: string): boolean {
  return blockText.toUpperCase().replace(/\s+/g, '').includes(target);
}

/**
 * Deep scan match: loose — used AFTER freeze to find every instance.
 * Accepts any block containing a substring of the target that is at
 * least 70% of its length (min 6 digits). Catches one-digit OCR errors
 * on boxes that were already confirmed to be in-frame.
 */
export function looseMatch(blockText: string, target: string): boolean {
  const normalized = blockText.toUpperCase().replace(/\s+/g, '');
  if (normalized.includes(target)) return true;
  const minLen = Math.max(6, Math.floor(target.length * 0.7));
  for (let i = 0; i <= target.length - minLen; i++) {
    if (normalized.includes(target.substring(i, i + minLen))) return true;
  }
  return false;
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

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 120);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 240);
    setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 400);

    setState(prev => ({ ...prev, isScanning: false, foundImage: image }));
  }, []);

  /**
   * Called by CameraScanner's deep scan pass after the freeze.
   * MERGES new boxes with existing ones — never removes a box already shown.
   * Skips any new box that significantly overlaps one we already have.
   */
  const updateFoundBoxes = useCallback((
    newBoxes: BoundingBox[],
    uri?: string,
    imageWidth?: number,
    imageHeight?: number,
  ) => {
    setState(prev => {
      if (!prev.foundImage) return prev;
      const existing = prev.foundImage.matchBoxes;
      const merged = [...existing];
      for (const nb of newBoxes) {
        const nbCX = nb.left + nb.width  / 2;
        const nbCY = nb.top  + nb.height / 2;
        const isDupe = merged.some(eb => {
          const ebCX = eb.left + eb.width  / 2;
          const ebCY = eb.top  + eb.height / 2;
          const dist = Math.sqrt(Math.pow(nbCX - ebCX, 2) + Math.pow(nbCY - ebCY, 2));
          return dist < 100; // within 100px = same sticker
        });
        if (!isDupe) merged.push(nb);
      }
      return {
        ...prev,
        foundImage: {
          uri:         uri         ?? prev.foundImage.uri,
          matchBoxes:  merged,
          imageWidth:  imageWidth  ?? prev.foundImage.imageWidth,
          imageHeight: imageHeight ?? prev.foundImage.imageHeight,
        },
      };
    });
  }, []);

  const processScanResult = useCallback(
    ({ text, uri, blocks, imageWidth, imageHeight }: ScanResult) => {
      if (!targetSku.trim()) return false;

      const target = targetSku.trim().toUpperCase().replace(/\s+/g, '');

      setState(prev => ({ ...prev, scanCount: prev.scanCount + 1 }));

      const normalizedText = text.toUpperCase().replace(/\s+/g, '');
      if (!normalizedText.includes(target)) return false;

      // Primary match: exact only
      const matchingBlocks = blocks.filter(b => exactMatch(b.text, target));
      const matchBoxes = matchingBlocks.map(b => b.frame);

      triggerMatch({ uri, matchBoxes, imageWidth, imageHeight });
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

  return { state, processScanResult, updateFoundBoxes, startScanning, stopScanning, scanAgain };
}
