import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useRef, useState } from 'react';
import { Animated, Keyboard, SafeAreaView, StyleSheet, TouchableWithoutFeedback, View } from 'react-native';
import { CameraScanner } from './src/components/CameraScanner';
import { FlashOverlay } from './src/components/FlashOverlay';
import { SKUInput } from './src/components/SKUInput';
import { useSkuScanner } from './src/hooks/useSkuScanner';

export default function App() {
  const [targetSku, setTargetSku] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const flashAnim = useRef(new Animated.Value(0)).current;

  const { state, processOcrResult } = useSkuScanner(targetSku, flashAnim);

  const handleToggleScan = useCallback(() => {
    Keyboard.dismiss();
    setIsScanning(prev => !prev);
  }, []);

  const handleSkuChange = useCallback((text: string) => {
    setTargetSku(text);
    if (isScanning) setIsScanning(false);
  }, [isScanning]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />

        <SKUInput
          value={targetSku}
          onChange={handleSkuChange}
          isScanning={isScanning}
          onToggleScan={handleToggleScan}
          scanCount={state.scanCount}
        />

        <View style={styles.cameraContainer}>
          <CameraScanner
            isScanning={isScanning}
            onTextRecognized={processOcrResult}
          />
          <FlashOverlay flashAnim={flashAnim} targetSku={targetSku} />
        </View>
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
