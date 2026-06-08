# SKU Finder — Session Handoff

## What it is
React Native Expo app for finding SKU numbers on warehouse/retail shelf labels.
Target market: deal hunters / clearance finders (coupon communities, TikTok deal creators).
Plan: App Store first (iOS, bigger audience for this crowd), then Google Play.

## GitHub
https://github.com/ImChuckFinley/sku-finder
Account: ImChuckFinley (mike@fivevs.com)

## Code location
`C:\Users\overw\Dropbox\Claude\sku-finder`

## How to build
1. Kill Dropbox (taskkill /IM Dropbox.exe /F)
2. Double-click `run-build.bat` or run it from terminal
3. APK lands at `android/app/build/outputs/apk/release/app-release.apk`
4. ADB installs automatically if phone is connected via wireless debugging
5. Restart Dropbox manually from Start menu

## Phone connection (Samsung Galaxy S25 Ultra)
- Wireless ADB at 192.168.0.68 (port changes each session — check Settings → Developer Options → Wireless debugging)
- `adb connect 192.168.0.68:<port>`
- `adb -s 192.168.0.68:<port> exec-out screencap -p > phone-screen.png` for screenshots

## APK backups
Google Drive → My Drive → APKs → SKU Finder (mapped as G: drive)

## Current version: v0.5
- Camera scans continuously at 230ms intervals
- Match found → frame freezes, triple haptic burst
- Deep scan: 4 rapid shots (120ms apart) after freeze, exact matching only
- **Green highlight** = exact match (all digits confirmed)
- **Gold highlight** = near match (one digit obscured/cut off)
- Boxes merge and accumulate — once highlighted, never disappears
- Duplicate detection via center-point proximity (currently 100px, needs increasing)
- Zoom controls: 1×, 2×, 3×, 5× buttons on camera view
- 📷 Capture Mode: split-screen camera + chip grid to scan-to-fill SKU input
  - Barcode scanner (VisionCamera frame processor) + OCR number detection
  - Chips append-only, never shuffle

## Tech stack
- Expo SDK 56 / React Native 0.85.3
- react-native-vision-camera v4.7.3 (takeSnapshot for smooth video, no shutter)
- @react-native-ml-kit/text-recognition (ML Kit OCR)
- expo-haptics
- Gradle 8.13 (pinned — 9.x breaks native .so builds)
- GRADLE_USER_HOME = C:\gradle-cache (keeps Gradle cache out of Dropbox)

## Key files
- `App.tsx` — root, state orchestration
- `src/components/CameraScanner.tsx` — camera, scan loop, deep scan logic
- `src/components/FoundScreen.tsx` — frozen frame + highlight boxes
- `src/components/CaptureMode.tsx` — scan-to-fill modal
- `src/components/SKUInput.tsx` — SKU input + 📷 button
- `src/hooks/useSkuScanner.ts` — match logic, MatchBox types, merge/dedup

## Build queue (pending next build)
1. Scan interval: 230ms → 150ms
2. Duplicate threshold: 100px → 15% of image width (dynamic, resolution-agnostic)
3. Manual area screengrab button (future feature, not yet planned)

## iOS plan
Borrow Mac from IT colleague at work → `npx expo run:ios --device`
Then get Apple Developer account ($99/yr) → App Store submission
Then Google Play ($25 one-time) after iOS revenue comes in.
`setup-mac.sh` in the repo handles the Mac setup automatically.
