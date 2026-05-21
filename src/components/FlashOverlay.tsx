import React from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

interface Props {
  flashAnim: Animated.Value;
  targetSku: string;
}

export function FlashOverlay({ flashAnim, targetSku }: Props) {
  return (
    <Animated.View
      style={[
        styles.overlay,
        { opacity: flashAnim },
      ]}
      pointerEvents="none"
    >
      <Text style={styles.matchText}>FOUND</Text>
      <Text style={styles.skuText}>{targetSku}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(76, 175, 80, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  matchText: {
    color: '#fff',
    fontSize: 64,
    fontWeight: '900',
    letterSpacing: 8,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  skuText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'Courier',
    marginTop: 8,
    letterSpacing: 4,
    opacity: 0.9,
  },
});
