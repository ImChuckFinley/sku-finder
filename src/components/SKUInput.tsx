import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface Props {
  value: string;
  onChange: (text: string) => void;
  isScanning: boolean;
  onToggleScan: () => void;
  onCaptureSku: () => void;
  scanCount: number;
}

export function SKUInput({ value, onChange, isScanning, onToggleScan, onCaptureSku, scanCount }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Target SKU</Text>

      {/* Input row with scan-to-fill button */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          placeholder="e.g. 123456"
          placeholderTextColor="#555"
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="done"
          clearButtonMode="while-editing"
        />
        <TouchableOpacity
          style={styles.captureButton}
          onPress={onCaptureSku}
          activeOpacity={0.75}
        >
          <Text style={styles.captureIcon}>📷</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.button, isScanning && styles.buttonActive]}
        onPress={onToggleScan}
        disabled={!value.trim()}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>
          {isScanning ? 'STOP SCANNING' : 'START SCANNING'}
        </Text>
      </TouchableOpacity>

      {isScanning && (
        <Text style={styles.scanCount}>Frames scanned: {scanCount}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#0d0d1a',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  label: {
    color: '#aaa',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#1e1e2e',
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'Courier',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    letterSpacing: 2,
  },
  captureButton: {
    width: 54,
    backgroundColor: '#1e1e2e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFD600',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureIcon: {
    fontSize: 24,
  },
  button: {
    backgroundColor: '#2a2a3e',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  buttonActive: {
    backgroundColor: '#1a3a1a',
    borderColor: '#4caf50',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 1.5,
  },
  scanCount: {
    color: '#555',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },
});
