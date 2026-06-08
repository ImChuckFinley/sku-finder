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

export function FoundScreen({ foundImage, targetSku, onScanAgain }: Props) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 200, useNativeDriver: true,
    }).start();

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

  // Scale all bounding boxes from photo coords → display coords
  const highlightBoxes = useMemo(() => {
    if (!containerSize || foundImage.matchBoxes.length === 0) return [];

    const { matchBoxes, imageWidth, imageHeight } = foundImage;
    const { width: cW, height: cH } = containerSize;

    const imgAspect = imageWidth / imageHeight;
    const cntAspect = cW / cH;

    let renderedW: number, renderedH: number, offsetX: number, offsetY: number;

    if (imgAspect > cntAspect) {
      renderedW = cW;
      renderedH = cW / imgAspect;
      offsetX = 0;
      offsetY = (cH - renderedH) / 2;
    } else {
      renderedH = cH;
      renderedW = cH * imgAspect;
      offsetX = (cW - renderedW) / 2;
      offsetY = 0;
    }

    const sX = renderedW / imageWidth;
    const sY = renderedH / imageHeight;

    return matchBoxes.map(b => ({
      top:    offsetY + b.top    * sY - 10,
      left:   offsetX + b.left   * sX - 10,
      width:  b.width  * sX + 20,
      height: b.height * sY + 20,
    }));
  }, [foundImage, containerSize]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Full-screen frozen frame */}
      <View style={styles.imageContainer} onLayout={onLayout}>
        <Image
          source={{ uri: foundImage.uri }}
          style={styles.image}
          resizeMode="contain"
        />

        {/* Yellow highlight around every instance of the SKU */}
        {highlightBoxes.map((box, i) => (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={[
              styles.highlight,
              {
                top:    box.top,
                left:   box.left,
                width:  box.width,
                height: box.height,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />
        ))}
      </View>

      {/* Green border over everything */}
      <View style={styles.greenBorder} pointerEvents="none" />

      {/* FOUND badge */}
      <View style={styles.badge}>
        <Text style={styles.badgeCheck}>✓</Text>
        <Text style={styles.badgeFound}>
          {foundImage.matchBoxes.length > 1
            ? `FOUND  ×${foundImage.matchBoxes.length}`
            : 'FOUND'}
        </Text>
        <Text style={styles.badgeSku}>{targetSku}</Text>
        {foundImage.matchBoxes.length > 1 && (
          <Text style={styles.badgeHint}>
            {foundImage.matchBoxes.length} boxes visible in frame
          </Text>
        )}
      </View>

      {/* Scan Again */}
      <TouchableOpacity style={styles.button} onPress={onScanAgain} activeOpacity={0.85}>
        <Text style={styles.buttonText}>SCAN AGAIN</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  imageContainer: {
    flex: 1,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  greenBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 8,
    borderColor: '#4caf50',
    zIndex: 2,
  },
  highlight: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: '#FFD600',
    backgroundColor: 'rgba(255, 214, 0, 0.3)',
    borderRadius: 4,
    zIndex: 3,
  },
  badge: {
    position: 'absolute',
    bottom: 140,
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 16,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: '#4caf50',
    zIndex: 4,
  },
  badgeCheck: {
    color: '#4caf50',
    fontSize: 48,
    fontWeight: '900',
    lineHeight: 52,
  },
  badgeFound: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 6,
  },
  badgeSku: {
    color: '#FFD600',
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'Courier',
    letterSpacing: 4,
    marginTop: 4,
  },
  badgeHint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 6,
    letterSpacing: 0.5,
  },
  button: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: '#4caf50',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 40,
    zIndex: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 3,
  },
});
