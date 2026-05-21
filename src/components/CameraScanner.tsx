import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useCallback, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import TextRecognition from 'react-native-text-recognition';

interface Props {
  isScanning: boolean;
  onTextRecognized: (text: string) => void;
}

// How often to grab a frame for OCR (ms). 400ms = ~2.5 fps of OCR.
const SCAN_INTERVAL_MS = 400;

export function CameraScanner({ isScanning, onTextRecognized }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const scanTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const isScanningRef = useRef(false);

  const runOcr = useCallback(async () => {
    if (!cameraRef.current || isScanningRef.current) return;
    isScanningRef.current = true;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.4,
        base64: false,
        skipProcessing: true,
      });

      if (photo?.uri) {
        const result = await TextRecognition.recognize(photo.uri);
        if (result.length > 0) {
          onTextRecognized(result.join(' '));
        }
      }
    } catch {
      // Silently ignore transient camera/OCR errors
    } finally {
      isScanningRef.current = false;
    }
  }, [onTextRecognized]);

  useEffect(() => {
    if (isScanning) {
      scanTimer.current = setInterval(runOcr, SCAN_INTERVAL_MS);
    } else {
      if (scanTimer.current) {
        clearInterval(scanTimer.current);
        scanTimer.current = null;
      }
    }

    return () => {
      if (scanTimer.current) {
        clearInterval(scanTimer.current);
      }
    };
  }, [isScanning, runOcr]);

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#4caf50" />
      </View>
    );
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
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        zoom={0}
      />
      {isScanning && (
        <View style={styles.scanFrame} pointerEvents="none">
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>
      )}
    </View>
  );
}

const CORNER_SIZE = 28;
const CORNER_WIDTH = 3;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0d0d1a',
    padding: 24,
  },
  permissionText: {
    color: '#aaa',
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: '#4caf50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  scanFrame: {
    position: 'absolute',
    top: '20%',
    left: '10%',
    right: '10%',
    bottom: '20%',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: '#4caf50',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
  },
});
