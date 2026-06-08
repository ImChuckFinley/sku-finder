import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { FoundImage } from '../hooks/useSkuScanner';

interface Props {
  foundImage: FoundImage;
  targetSku: string;
  onScanAgain: () => void;
}

type Corner = 'tl' | 'tr' | 'bl' | 'br';

/** Find the screen quadrant with the fewest highlight box centers */
function bestCorner(
  boxes: Array<{ left: number; top: number; width: number; height: number }>,
  cW: number,
  cH: number,
): Corner {
  const counts: Record<Corner, number> = { tl: 0, tr: 0, bl: 0, br: 0 };
  for (const b of boxes) {
    const cx = b.left + b.width  / 2;
    const cy = b.top  + b.height / 2;
    const col = cx < cW / 2 ? 'l' : 'r';
    const row = cy < cH / 2 ? 't' : 'b';
    counts[`${row}${col}` as Corner]++;
  }
  return (Object.entries(counts).sort((a, b) => a[1] - b[1])[0][0]) as Corner;
}

const CORNER_STYLE: Record<Corner, object> = {
  tl: { top: 52, left: 12 },
  tr: { top: 52, right: 12 },
  bl: { bottom: 28, left: 12 },
  br: { bottom: 28, right: 12 },
};

export function FoundScreen({ foundImage, targetSku, onScanAgain }: Props) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setContainerSize({ width, height });
  };

  const highlightBoxes = useMemo(() => {
    if (!containerSize || foundImage.matchBoxes.length === 0) return [];
    const { matchBoxes, imageWidth, imageHeight } = foundImage;
    const { width: cW, height: cH } = containerSize;
    const imgAspect = imageWidth / imageHeight;
    const cntAspect = cW / cH;
    let renderedW: number, renderedH: number, offsetX: number, offsetY: number;
    if (imgAspect > cntAspect) {
      renderedW = cW; renderedH = cW / imgAspect; offsetX = 0; offsetY = (cH - renderedH) / 2;
    } else {
      renderedH = cH; renderedW = cH * imgAspect; offsetX = (cW - renderedW) / 2; offsetY = 0;
    }
    const sX = renderedW / imageWidth;
    const sY = renderedH / imageHeight;
    return matchBoxes.map(b => ({
      top:    offsetY + b.frame.top    * sY - 10,
      left:   offsetX + b.frame.left   * sX - 10,
      width:  b.frame.width  * sX + 20,
      height: b.frame.height * sY + 20,
      type:   b.type,
    }));
  }, [foundImage, containerSize]);

  // Pick corner with fewest highlight boxes
  const corner: Corner = containerSize && highlightBoxes.length > 0
    ? bestCorner(highlightBoxes, containerSize.width, containerSize.height)
    : 'bl';

  const exact = foundImage.matchBoxes.filter(b => b.type === 'exact').length;
  const near  = foundImage.matchBoxes.filter(b => b.type === 'near').length;
  const total = foundImage.matchBoxes.length;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Frozen frame */}
      <View style={styles.imageContainer} onLayout={onLayout}>
        <Image source={{ uri: foundImage.uri }} style={styles.image} resizeMode="contain" />

        {highlightBoxes.map((box, i) => (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={[
              styles.highlight,
              box.type === 'exact' ? styles.highlightExact : styles.highlightNear,
              {
                top: box.top, left: box.left,
                width: box.width, height: box.height,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />
        ))}
      </View>

      {/* Green border */}
      <View style={styles.greenBorder} pointerEvents="none" />

      {/* Compact badge — positioned in emptiest corner */}
      <View style={[styles.badge, CORNER_STYLE[corner]]}>
        <View style={styles.badgeRow}>
          <Text style={styles.badgeCheck}>✓</Text>
          <View>
            <Text style={styles.badgeFound}>
              {total > 1 ? `FOUND ×${total}` : 'FOUND'}
            </Text>
            <Text style={styles.badgeSku}>{targetSku}</Text>
            {total > 1 && (
              <Text style={styles.badgeHint}>
                {exact > 0 ? `${exact} confirmed` : ''}
                {exact > 0 && near > 0 ? ' · ' : ''}
                {near  > 0 ? `${near} possible` : ''}
              </Text>
            )}
          </View>
        </View>
        <TouchableOpacity style={styles.scanAgainBtn} onPress={onScanAgain} activeOpacity={0.8}>
          <Text style={styles.scanAgainText}>SCAN AGAIN</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  imageContainer: { flex: 1 },
  image: { width: '100%', height: '100%' },
  greenBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 6,
    borderColor: '#4caf50',
    zIndex: 2,
  },
  highlight: {
    position: 'absolute',
    borderWidth: 3,
    borderRadius: 4,
    zIndex: 3,
  },
  highlightExact: {
    borderColor: '#4caf50',
    backgroundColor: 'rgba(76, 175, 80, 0.25)',
  },
  highlightNear: {
    borderColor: '#FFD600',
    backgroundColor: 'rgba(255, 214, 0, 0.25)',
  },

  // Compact badge
  badge: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.82)',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#4caf50',
    padding: 10,
    zIndex: 4,
    minWidth: 160,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgeCheck: {
    color: '#4caf50',
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 32,
  },
  badgeFound: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 2,
  },
  badgeSku: {
    color: '#FFD600',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Courier',
    letterSpacing: 2,
  },
  badgeHint: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 10,
    marginTop: 2,
  },
  scanAgainBtn: {
    marginTop: 8,
    backgroundColor: '#4caf50',
    borderRadius: 6,
    paddingVertical: 7,
    alignItems: 'center',
  },
  scanAgainText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
  },
});
