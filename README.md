# SKU Finder

Warehouse scanning app for finding SKU numbers printed on product labels at Lowe's and Home Depot.

## How it works

1. Type a target SKU number into the input field
2. Tap **START SCANNING** — the camera begins scanning continuously
3. When the SKU is found on a label, the screen flashes **green** and the phone vibrates twice
4. Tap **STOP SCANNING** to pause

The app captures camera frames ~2.5x per second and runs them through Apple's Vision text recognition framework (via `react-native-text-recognition`). Matching is substring-based and case-insensitive, so partial SKU entries work fine.

## Setup

This app requires an **Expo Development Build** (not Expo Go) because it uses native OCR via Apple's Vision framework.

### Prerequisites
- Node.js 18+
- Expo CLI: `npm install -g expo-cli eas-cli`
- Expo account (free at expo.dev)
- Apple Developer account for device builds

### Install dependencies

```bash
npm install
```

### Run on a connected iPhone (development build)

```bash
# First time: create the dev build (takes ~5 min via EAS cloud)
eas build --platform ios --profile development

# Install the .ipa on your phone, then:
npx expo start --dev-client
```

### Build a shareable preview IPA

```bash
eas build --platform ios --profile preview
```

## Project structure

```
App.tsx                        # Root component, state orchestration
src/
  components/
    CameraScanner.tsx          # Camera view + periodic OCR capture
    FlashOverlay.tsx           # Animated green flash on match
    SKUInput.tsx               # Target SKU text input + scan toggle
  hooks/
    useSkuScanner.ts           # Match logic, haptics, flash animation
```

## Key dependencies

| Package | Purpose |
|---|---|
| `expo-camera` | Camera viewfinder and frame capture |
| `react-native-text-recognition` | Apple Vision OCR on iOS |
| `expo-haptics` | Double vibration on SKU match |

## Tuning scan speed

In `src/components/CameraScanner.tsx`, adjust `SCAN_INTERVAL_MS` (default `400`):
- **Lower = faster** but more battery/CPU usage
- `200` is the practical floor before frames start backing up
- `600–800` is fine for slower workflows
