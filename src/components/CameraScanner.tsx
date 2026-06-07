import TextRecognition from '@react-native-ml-kit/text-recognition';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useCallback, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ScanResult } from '../hooks/useSkuScanner';

interface Props {
  isScanning: boolean;
  onScanResult: (result: ScanResult) => boolean;
}

const SCAN_INTERVAL_MS = 500;

export function CameraScanner({ isScanning, onScanResult }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const scanTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const isBusy = useRef(false);

  const runScan = useCallback(async () => {
    if (!cameraRef.current || isBusy.current) return;
    isBusy.current = true;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        base64: false,
        skipProcessing: true,
        shutterSound: false,
      } as any);

      if (photo?.uri) {
        const result = await TextRecognition.recognize(photo.uri);
        const blocks = result.blocks.map(b => ({ text: b.text, frame: b.frame }));
        const fullText = result.blocks.map(b => b.text).join(' ');

        if (fullText.trim()) {
          onScanResult({
            text: fullText,
            uri: photo.uri,
            blocks,
            imageWidth: photo.width ?? 1080,
            imageHeight: photo.height ?? 1920,
          });
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

  if (!permission) {
    return <View style={styles.centered}><ActivityIndicator color="#4caf50" /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.permissionText}>Camera access is required to scan SKU labels.</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Camera Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" zoom={0} />
      {isScanning && (
        <View style={styles.scanFrame} pointerEvents="none">
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
          <Text style={styles.scanningText}>SCANNING…</Text>
        </View>
      )}
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
  },
  permissionText: { color: '#aaa', textAlign: 'center', fontSize: 16, marginBottom: 20 },
  permissionButton: {
    backgroundColor: '#4caf50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  scanFrame: {
    position: 'absolute',
    top: '15%',
    left: '8%',
    right: '8%',
    bottom: '15%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: '#4caf50' },
  topLeft:     { top: 0, left: 0, borderTopWidth: BORDER, borderLeftWidth: BORDER },
  topRight:    { top: 0, right: 0, borderTopWidth: BORDER, borderRightWidth: BORDER },
  bottomLeft:  { bottom: 0, left: 0, borderBottomWidth: BORDER, borderLeftWidth: BORDER },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: BORDER, borderRightWidth: BORDER },
  scanningText: {
    color: 'rgba(76,175,80,0.8)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    position: 'absolute',
    bottom: -24,
  },
});
