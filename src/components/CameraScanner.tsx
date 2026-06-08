import TextRecognition from '@react-native-ml-kit/text-recognition';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import { BoundingBox, MatchBox, MatchType, ScanResult, nearMatch } from '../hooks/useSkuScanner';

interface Props {
  isScanning: boolean;
  targetSku: string;
  onScanResult: (result: ScanResult) => boolean;
  onDeepScanComplete: (boxes: MatchBox[], uri: string, w: number, h: number) => void;
}

const SCAN_INTERVAL_MS = 150;
const ZOOM_LEVELS = [1, 2, 3, 5];

export function CameraScanner({ isScanning, targetSku, onScanResult, onDeepScanComplete }: Props) {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const cameraRef = useRef<Camera>(null);
  const scanTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const isBusy = useRef(false);
  const [zoom, setZoom] = useState(1);

  const runScan = useCallback(async () => {
    if (!cameraRef.current || isBusy.current) return;
    isBusy.current = true;

    try {
      const snapshot = await cameraRef.current.takeSnapshot({
        quality: 40,
        skipMetadata: true,
      });

      const uri = snapshot.path.startsWith('file://')
        ? snapshot.path
        : `file://${snapshot.path}`;

      const result = await TextRecognition.recognize(uri);
      const blocks = result.blocks.map(b => ({
        text: b.text,
        frame: b.frame,
        lines: b.lines?.map(l => ({ text: l.text, frame: l.frame })) ?? [],
      }));
      const fullText = result.blocks.map(b => b.text).join(' ');

      if (fullText.trim()) {
        const matched = onScanResult({
          text: fullText,
          uri,
          blocks,
          imageWidth:  snapshot.width  ?? 1080,
          imageHeight: snapshot.height ?? 1920,
        });

        // Primary match found — take 4 rapid exact-match snapshots to catch
        // every instance. Different frames capture different boxes as the
        // camera/lighting shifts slightly. Union of exact matches = no false positives.
        if (matched && cameraRef.current) {
          const target = targetSku.trim().toUpperCase().replace(/\s+/g, '');
          const DEEP_SHOTS = 4;
          const DEEP_INTERVAL = 120; // ms between each shot

          for (let i = 0; i < DEEP_SHOTS; i++) {
            setTimeout(async () => {
              if (!cameraRef.current) return;
              try {
                const snap = await cameraRef.current.takeSnapshot({ quality: 70, skipMetadata: true });
                const snapUri = snap.path.startsWith('file://') ? snap.path : `file://${snap.path}`;
                const result = await TextRecognition.recognize(snapUri);
                const boxes: MatchBox[] = result.blocks.flatMap(b => {
                  const t = b.text.toUpperCase().replace(/\s+/g, '');
                  if (t.includes(target))      return [{ frame: b.frame, type: 'exact' as MatchType }];
                  if (nearMatch(b.text, target)) return [{ frame: b.frame, type: 'near'  as MatchType }];
                  return [];
                });
                if (boxes.length) {
                  onDeepScanComplete(boxes, snapUri, snap.width ?? 1080, snap.height ?? 1920);
                }
              } catch { /* ignore */ }
            }, 300 + i * DEEP_INTERVAL); // start 300ms after freeze, then every 120ms
          }
        }
      }
    } catch {
      // silently ignore transient errors
    } finally {
      isBusy.current = false;
    }
  }, [onScanResult]);

  useEffect(() => {
    if (isScanning) {
      scanTimer.current = setInterval(runScan, SCAN_INTERVAL_MS);
    } else {
      if (scanTimer.current) {
        clearInterval(scanTimer.current);
        scanTimer.current = null;
      }
    }
    return () => {
      if (scanTimer.current) clearInterval(scanTimer.current);
    };
  }, [isScanning, runScan]);

  if (!hasPermission) {
    return (
      <View style={styles.centered}>
        <Text style={styles.permissionText}>Camera access is required to scan SKU labels.</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Camera Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#4caf50" />
        <Text style={styles.permissionText}>Looking for camera…</Text>
      </View>
    );
  }

  // Clamp zoom to device limits
  const clampedZoom = Math.min(
    Math.max(zoom, device.minZoom ?? 1),
    device.maxZoom ?? 10,
  );

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        device={device}
        isActive={true}
        photo={true}
        zoom={clampedZoom}
      />

      {/* Scan frame corners + label */}
      {isScanning && (
        <View style={styles.scanFrame} pointerEvents="none">
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
          <Text style={styles.scanningText}>SCANNING…</Text>
        </View>
      )}

      {/* Zoom controls */}
      <View style={styles.zoomBar} pointerEvents="box-none">
        {ZOOM_LEVELS.map(level => {
          const active = zoom === level;
          const available = level <= (device.maxZoom ?? 10);
          if (!available) return null;
          return (
            <TouchableOpacity
              key={level}
              style={[styles.zoomButton, active && styles.zoomButtonActive]}
              onPress={() => setZoom(level)}
              activeOpacity={0.7}
            >
              <Text style={[styles.zoomText, active && styles.zoomTextActive]}>
                {level}×
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const CORNER = 32;
const BORDER = 3;

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0d0d1a',
    padding: 24,
    gap: 16,
  },
  permissionText: { color: '#aaa', textAlign: 'center', fontSize: 16 },
  permissionButton: {
    backgroundColor: '#4caf50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Scan frame
  scanFrame: {
    position: 'absolute',
    top: '15%',
    left: '8%',
    right: '8%',
    bottom: '18%',      // leave room for zoom bar
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: '#4caf50' },
  topLeft:     { top: 0,    left: 0,  borderTopWidth: BORDER,    borderLeftWidth: BORDER  },
  topRight:    { top: 0,    right: 0, borderTopWidth: BORDER,    borderRightWidth: BORDER },
  bottomLeft:  { bottom: 0, left: 0,  borderBottomWidth: BORDER, borderLeftWidth: BORDER  },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: BORDER, borderRightWidth: BORDER },
  scanningText: {
    color: 'rgba(76,175,80,0.8)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    position: 'absolute',
    bottom: -24,
  },

  // Zoom bar
  zoomBar: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  zoomButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  zoomButtonActive: {
    backgroundColor: '#4caf50',
    borderColor: '#4caf50',
  },
  zoomText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '700',
  },
  zoomTextActive: {
    color: '#fff',
  },
});
