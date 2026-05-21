# SKU Finder

Warehouse scanning app for finding SKU numbers printed on product labels at Lowe's and Home Depot.

## How it works

1. Type a target SKU number into the input field
2. Tap **START SCANNING** — the camera begins scanning continuously
3. When the SKU is found on a label, the screen flashes **green** and the phone vibrates twice
4. Tap **STOP SCANNING** to pause

The app captures camera frames ~2.5x per second and runs them through Apple's Vision text recognition framework (via `react-native-text-recognition`). Matching is substring-based and case-insensitive, so partial SKU entries work fine.

## Setup — Test on a real iPhone (free, no Apple Developer account)

You need a Mac with Xcode installed. Run the setup script, plug in the phone, and you're done.

```bash
git clone https://github.com/ImChuckFinley/sku-finder
cd sku-finder
chmod +x setup-mac.sh && ./setup-mac.sh
```

When the script finishes:

```bash
# Plug iPhone into Mac via USB, then:
npx expo run:ios --device
```

The app builds and installs in ~5 minutes. Tap **Trust** on the phone if prompted.

> **Note:** Without a paid Apple Developer account ($99/yr) the app expires after 7 days and you'll need to reinstall. For a proof-of-concept that's fine.

### Production build (when ready to ship)

```bash
npm install -g eas-cli
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
