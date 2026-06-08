import TextRecognition from '@react-native-ml-kit/text-recognition';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Camera,
  useCodeScanner,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';

interface DetectedValue {
  value: string;
  type: 'barcode' | 'text';
}

interface Props {
  visible: boolean;
  onCapture: (sku: string) => void;
  onClose: () => void;
}

// Extract numeric strings that look like SKUs (4–14 digits)
function extractNumbers(text: string): string[] {
  const matches = text.match(/\b\d{4,14}\b/g) ?? [];
  return [...new Set(matches)];
}

export function CaptureMode({ visible, onCapture, onClose }: Props) {
  const { hasPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const cameraRef = useRef<Camera>(null);
  const [detected, setDetected] = useState<DetectedValue[]>([]);
  const scanTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const isBusy = useRef(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Merge new values into detected list without duplicates
  const addValues = useCallback((incoming: DetectedValue[]) => {
    setDetected(prev => {
      const existing = new Set(prev.map(d => d.value));
      const fresh = incoming.filter(d => !existing.has(d.value));
      if (!fresh.length) return prev;
      return [...fresh, ...prev].slice(0, 12); // cap at 12 chips
    });
  }, []);

  // ── Barcode scanner (frame-processor level — instant) ──────────────────────
  const codeScanner = useCodeScanner({
    codeTypes: [
      'ean-13', 'ean-8', 'upc-a', 'upc-e',
      'code-128', 'code-39', 'code-93',
      'itf', 'data-matrix', 'qr',
    ],
    onCodeScanned: (codes) => {
      const barcodes: DetectedValue[] = codes
        .filter(c => c.value)
        .map(c => ({ value: c.value!, type: 'barcode' }));
      if (barcodes.length) addValues(barcodes);
    },
  });

  // ── OCR scanner (periodic snapshots — catches printed text numbers) ─────────
  const runOcr = useCallback(async () => {
    if (!cameraRef.current || isBusy.current) return;
    isBusy.current = true;
    try {
      const snap = await cameraRef.current.takeSnapshot({
        quality: 35,
        skipMetadata: true,
      });
      const uri = snap.path.startsWith('file://') ? snap.path : `file://${snap.path}`;
      const result = await TextRecognition.recognize(uri);
      const fullText = result.blocks.map(b => b.text).join(' ');
      const numbers = extractNumbers(fullText);
      if (numbers.length) {
        addValues(numbers.map(v => ({ value: v, type: 'text' })));
      }
    } catch { /* ignore */ } finally {
      isBusy.current = false;
    }
  }, [addValues]);

  useEffect(() => {
    if (!visible) {
      setDetected([]);
      if (scanTimer.current) clearInterval(scanTimer.current);
      return;
    }
    Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    scanTimer.current = setInterval(runOcr, 600);
    return () => {
      if (scanTimer.current) clearInterval(scanTimer.current);
      fadeAnim.setValue(0);
    };
  }, [visible, runOcr, fadeAnim]);

  const handleCapture = (value: string) => {
    onCapture(value);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={styles.container}>
        {/* Camera */}
        {hasPermission && device ? (
          <Camera
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={visible}
            photo={true}
            codeScanner={codeScanner}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.noCamera]}>
            <Text style={styles.noCameraText}>Camera not available</Text>
          </View>
        )}

        {/* Aim guide */}
        <View style={styles.aimFrame} pointerEvents="none">
          <View style={[styles.corner, styles.tl]} />
          <View style={[styles.corner, styles.tr]} />
          <View style={[styles.corner, styles.bl]} />
          <View style={[styles.corner, styles.br]} />
          <Text style={styles.aimHint}>Point at a SKU number or barcode</Text>
        </View>

        {/* Detected chips */}
        <Animated.View style={[styles.chipsArea, { opacity: fadeAnim }]}>
          <Text style={styles.chipsLabel}>
            {detected.length ? 'Tap the SKU number:' : 'Scanning for numbers…'}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
            {detected.map((d, i) => (
              <TouchableOpacity
                key={`${d.value}-${i}`}
                style={[styles.chip, d.type === 'barcode' && styles.chipBarcode]}
                onPress={() => handleCapture(d.value)}
                activeOpacity={0.75}
              >
                {d.type === 'barcode' && <Text style={styles.chipIcon}>▌▌ </Text>}
                <Text style={styles.chipText}>{d.value}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Close */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeText}>✕  Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const C = 28, B = 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  noCamera: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' },
  noCameraText: { color: '#aaa', fontSize: 16 },

  aimFrame: {
    position: 'absolute',
    top: '25%',
    left: '10%',
    right: '10%',
    height: '35%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: { position: 'absolute', width: C, height: C, borderColor: '#FFD600' },
  tl: { top: 0, left: 0,  borderTopWidth: B,    borderLeftWidth: B  },
  tr: { top: 0, right: 0, borderTopWidth: B,    borderRightWidth: B },
  bl: { bottom: 0, left: 0,  borderBottomWidth: B, borderLeftWidth: B  },
  br: { bottom: 0, right: 0, borderBottomWidth: B, borderRightWidth: B },
  aimHint: {
    color: 'rgba(255,214,0,0.8)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    position: 'absolute',
    bottom: -28,
  },

  chipsArea: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    gap: 10,
  },
  chipsLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 6,
  },
  chipsScroll: { flexGrow: 0 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30,30,50,0.92)',
    borderWidth: 1.5,
    borderColor: '#4caf50',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginRight: 10,
  },
  chipBarcode: {
    borderColor: '#FFD600',
    backgroundColor: 'rgba(50,40,0,0.92)',
  },
  chipIcon: {
    color: '#FFD600',
    fontSize: 13,
    fontWeight: '900',
  },
  chipText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Courier',
    letterSpacing: 1.5,
  },

  closeButton: {
    position: 'absolute',
    bottom: 36,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#444',
  },
  closeText: {
    color: '#aaa',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 1,
  },
});
