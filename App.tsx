import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useState } from 'react';
import {
  Keyboard,
  SafeAreaView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { CameraScanner } from './src/components/CameraScanner';
import { FoundScreen } from './src/components/FoundScreen';
import { SKUInput } from './src/components/SKUInput';
import { useSkuScanner } from './src/hooks/useSkuScanner';

export default function App() {
  const [targetSku, setTargetSku] = useState('');
  const { state, processScanResult, startScanning, stopScanning, scanAgain } = useSkuScanner(targetSku);

  const handleToggleScan = useCallback(() => {
    Keyboard.dismiss();
    if (state.isScanning) {
      stopScanning();
    } else {
      startScanning();
    }
  }, [state.isScanning, startScanning, stopScanning]);

  const handleSkuChange = useCallback((text: string) => {
    setTargetSku(text);
    stopScanning();
  }, [stopScanning]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />

        <SKUInput
          value={targetSku}
          onChange={handleSkuChange}
          isScanning={state.isScanning}
          onToggleScan={handleToggleScan}
          scanCount={state.scanCount}
        />

        <View style={styles.cameraContainer}>
          <CameraScanner
            isScanning={state.isScanning}
            onScanResult={processScanResult}
          />
        </View>

        {/* Freeze frame + highlight overlay when found */}
        {state.foundImage && (
          <FoundScreen
            foundImage={state.foundImage}
            targetSku={targetSku}
            onScanAgain={scanAgain}
          />
        )}
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d1a',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
});
