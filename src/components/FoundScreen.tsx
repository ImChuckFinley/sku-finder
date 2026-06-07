import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Image,
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

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export function FoundScreen({ foundImage, targetSku, onScanAgain }: Props) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    // Pulse the highlight box
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }, [fadeAnim, pulseAnim]);

  // Calculate highlight box position scaled to display
  const highlightBox = (() => {
    if (!foundImage.matchBox) return null;

    const { matchBox: b, imageWidth, imageHeight } = foundImage;

    // The image is displayed with contain — calculate actual rendered size
    const imgAspect = imageWidth / imageHeight;
    const screenAspect = SCREEN_W / SCREEN_H;

    let renderedW: number, renderedH: number, offsetX: number, offsetY: number;

    if (imgAspect > screenAspect) {
      renderedW = SCREEN_W;
      renderedH = SCREEN_W / imgAspect;
      offsetX = 0;
      offsetY = (SCREEN_H - renderedH) / 2;
    } else {
      renderedH = SCREEN_H;
      renderedW = SCREEN_H * imgAspect;
      offsetY = 0;
      offsetX = (SCREEN_W - renderedW) / 2;
    }

    const scaleX = renderedW / imageWidth;
    const scaleY = renderedH / imageHeight;

    return {
      top:    offsetY + b.top    * scaleY - 8,
      left:   offsetX + b.left   * scaleX - 8,
      width:  b.width  * scaleX + 16,
      height: b.height * scaleY + 16,
    };
  })();

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Frozen frame */}
      <Image
        source={{ uri: foundImage.uri }}
        style={styles.image}
        resizeMode="contain"
      />

      {/* Green border overlay */}
      <View style={styles.greenBorder} pointerEvents="none" />

      {/* Highlight box around matched text */}
      {highlightBox && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.highlight,
            {
              top:    highlightBox.top,
              left:   highlightBox.left,
              width:  highlightBox.width,
              height: highlightBox.height,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />
      )}

      {/* FOUND badge */}
      <View style={styles.badge} pointerEvents="none">
        <Text style={styles.badgeCheck}>✓</Text>
        <Text style={styles.badgeFound}>FOUND</Text>
        <Text style={styles.badgeSku}>{targetSku}</Text>
      </View>

      {/* Scan Again button */}
      <TouchableOpacity style={styles.button} onPress={onScanAgain} activeOpacity={0.85}>
        <Text style={styles.buttonText}>SCAN AGAIN</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  image: {
    width: SCREEN_W,
    height: SCREEN_H,
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
    backgroundColor: 'rgba(255, 214, 0, 0.25)',
    borderRadius: 4,
    zIndex: 3,
  },
  badge: {
    position: 'absolute',
    bottom: 160,
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
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
  button: {
    position: 'absolute',
    bottom: 60,
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
