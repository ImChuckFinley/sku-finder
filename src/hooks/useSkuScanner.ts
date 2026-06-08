import { useCallback, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';

export interface BoundingBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

export type MatchType = 'exact' | 'near';

export interface MatchBox {
  frame: BoundingBox;
  type: MatchType;
}

export interface FoundImage {
  uri: string;
  matchBoxes: MatchBox[];
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

/** Exact match — all digits present */
function exactMatch(blockText: string, target: string): boolean {
  return blockText.toUpperCase().replace(/\s+/g, '').includes(target);
}

/**
 * Near match — contains N-1 consecutive digits of the target.
 * Catches labels where one digit is obscured, cut off, or misread.
 */
export function nearMatch(blockText: string, target: string): boolean {
  if (exactMatch(blockText, target)) return false; // already exact
  const normalized = blockText.toUpperCase().replace(/\s+/g, '');
  const minLen = target.length - 1;
  if (minLen < 5) return false;
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
    newBoxes: MatchBox[],
    uri?: string,
    imageWidth?: number,
    imageHeight?: number,
  ) => {
    setState(prev => {
      if (!prev.foundImage) return prev;
      const existing = prev.foundImage.matchBoxes;
      const merged = [...existing];

      // 15% of image width — scales with snapshot resolution automatically
      const imgW = imageWidth ?? prev.foundImage.imageWidth;
      const dupeThreshold = imgW * 0.15;

      for (const nb of newBoxes) {
        const nbCX = nb.frame.left + nb.frame.width  / 2;
        const nbCY = nb.frame.top  + nb.frame.height / 2;
        const dupeIdx = merged.findIndex(eb => {
          const ebCX = eb.frame.left + eb.frame.width  / 2;
          const ebCY = eb.frame.top  + eb.frame.height / 2;
          return Math.sqrt(Math.pow(nbCX - ebCX, 2) + Math.pow(nbCY - ebCY, 2)) < dupeThreshold;
        });

        if (dupeIdx === -1) {
          merged.push(nb);
        } else if (nb.type === 'exact' && merged[dupeIdx].type === 'near') {
          // Upgrade a near match to exact if we now have confirmation
          merged[dupeIdx] = nb;
        }
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
      const matchBoxes: MatchBox[] = blocks
        .filter(b => exactMatch(b.text, target))
        .map(b => ({ frame: b.frame, type: 'exact' as MatchType }));

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
