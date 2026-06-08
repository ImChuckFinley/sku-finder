import TextRecognition from '@react-native-ml-kit/text-recognition';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
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

  // Only ever ADD new values — existing chips never move or disappear
  const addValues = useCallback((incoming: DetectedValue[]) => {
    setDetected(prev => {
      const existing = new Set(prev.map(d => d.value));
      const fresh = incoming.filter(d => !existing.has(d.value));
      if (!fresh.length) return prev;
      return [...prev, ...fresh].slice(0, 20); // append to end, cap at 20
    });
  }, []);

  const codeScanner = useCodeScanner({
    codeTypes: ['ean-13', 'ean-8', 'upc-a', 'upc-e', 'code-128', 'code-39', 'code-93', 'itf', 'data-matrix', 'qr'],
    onCodeScanned: (codes) => {
      const barcodes: DetectedValue[] = codes.filter(c => c.value).map(c => ({ value: c.value!, type: 'barcode' }));
      if (barcodes.length) addValues(barcodes);
    },
  });

  const runOcr = useCallback(async () => {
    if (!cameraRef.current || isBusy.current) return;
    isBusy.current = true;
    try {
      const snap = await cameraRef.current.takeSnapshot({ quality: 35, skipMetadata: true });
      const uri = snap.path.startsWith('file://') ? snap.path : `file://${snap.path}`;
      const result = await TextRecognition.recognize(uri);
      const numbers = extractNumbers(result.blocks.map(b => b.text).join(' '));
      if (numbers.length) addValues(numbers.map(v => ({ value: v, type: 'text' })));
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
    scanTimer.current = setInterval(runOcr, 600);
    return () => { if (scanTimer.current) clearInterval(scanTimer.current); };
  }, [visible, runOcr]);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={styles.container}>

        {/* Top half — live camera */}
        <View style={styles.cameraArea}>
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
          <View style={styles.aimFrame} pointerEvents="none">
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
          </View>
          <Text style={styles.aimHint}>Point at a label or barcode</Text>
        </View>

        {/* Bottom half — persistent chip grid */}
        <View style={styles.pickerArea}>
          <Text style={styles.pickerLabel}>
            {detected.length === 0
              ? 'Scanning for numbers…'
              : 'Tap the SKU to use it:'}
          </Text>

          <ScrollView contentContainerStyle={styles.chipGrid} showsVerticalScrollIndicator={false}>
            {detected.map((d, i) => (
              <TouchableOpacity
                key={`${d.value}-${i}`}
                style={[styles.chip, d.type === 'barcode' && styles.chipBarcode]}
                onPress={() => onCapture(d.value)}
                activeOpacity={0.7}
              >
                {d.type === 'barcode' && <Text style={styles.chipIcon}>▌▌ </Text>}
                <Text style={styles.chipText}>{d.value}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>✕  Cancel</Text>
          </TouchableOpacity>
        </View>

      </View>
    </Modal>
  );
}

const C = 28, B = 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d1a' },

  // Top half
  cameraArea: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  noCamera: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' },
  noCameraText: { color: '#aaa', fontSize: 16 },
  aimFrame: {
    position: 'absolute',
    top: '15%', left: '8%', right: '8%', bottom: '15%',
  },
  corner: { position: 'absolute', width: C, height: C, borderColor: '#FFD600' },
  tl: { top: 0, left: 0,  borderTopWidth: B,    borderLeftWidth: B  },
  tr: { top: 0, right: 0, borderTopWidth: B,    borderRightWidth: B },
  bl: { bottom: 0, left: 0,  borderBottomWidth: B, borderLeftWidth: B  },
  br: { bottom: 0, right: 0, borderBottomWidth: B, borderRightWidth: B },
  aimHint: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    color: 'rgba(255,214,0,0.75)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },

  // Bottom half
  pickerArea: {
    flex: 1,
    backgroundColor: '#0d0d1a',
    borderTopWidth: 1,
    borderTopColor: '#222',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  pickerLabel: {
    color: '#aaa',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e2e',
    borderWidth: 1.5,
    borderColor: '#4caf50',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  chipBarcode: {
    borderColor: '#FFD600',
    backgroundColor: 'rgba(50,40,0,0.9)',
  },
  chipIcon: {
    color: '#FFD600',
    fontSize: 13,
    fontWeight: '900',
  },
  chipText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Courier',
    letterSpacing: 1.5,
  },
  closeButton: {
    alignSelf: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#333',
  },
  closeText: { color: '#666', fontSize: 14, fontWeight: '600', letterSpacing: 1 },
});
