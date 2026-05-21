#!/bin/bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✓ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
info() { echo -e "  $1"; }

echo ""
echo "=================================="
echo "  SKU Finder — Mac Setup Script"
echo "=================================="
echo ""

# ── 1. Xcode ──────────────────────────────────────────────────────────────────
if xcode-select -p &>/dev/null; then
  ok "Xcode Command Line Tools found"
else
  warn "Installing Xcode Command Line Tools..."
  xcode-select --install
  echo ""
  info "A dialog just appeared on screen. Click 'Install', wait for it to finish,"
  info "then run this script again."
  exit 0
fi

if ! open -Ra "Xcode" 2>/dev/null; then
  echo ""
  echo -e "${RED}✗ Xcode app not found.${NC}"
  info "Install Xcode from the Mac App Store (it's free, ~15 GB)."
  info "Open the Mac App Store and search for 'Xcode', then run this script again."
  exit 1
fi
ok "Xcode app found"

# ── 2. Homebrew ───────────────────────────────────────────────────────────────
if command -v brew &>/dev/null; then
  ok "Homebrew found"
else
  warn "Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  # Add brew to PATH for Apple Silicon Macs
  if [[ -f /opt/homebrew/bin/brew ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  fi
  ok "Homebrew installed"
fi

# ── 3. Node.js ────────────────────────────────────────────────────────────────
if command -v node &>/dev/null; then
  NODE_VER=$(node -v)
  ok "Node.js found ($NODE_VER)"
else
  warn "Installing Node.js..."
  brew install node
  ok "Node.js installed"
fi

# ── 4. CocoaPods ──────────────────────────────────────────────────────────────
if command -v pod &>/dev/null; then
  ok "CocoaPods found"
else
  warn "Installing CocoaPods..."
  brew install cocoapods
  ok "CocoaPods installed"
fi

# ── 5. npm dependencies ───────────────────────────────────────────────────────
echo ""
echo "Installing npm packages..."
npm install
ok "npm packages installed"

# ── 6. Expo prebuild (generates the ios/ native folder) ──────────────────────
echo ""
echo "Running Expo prebuild (generates iOS project)..."
npx expo prebuild --platform ios --clean
ok "iOS project generated"

# ── 7. CocoaPods install ──────────────────────────────────────────────────────
echo ""
echo "Installing CocoaPods dependencies..."
cd ios && pod install && cd ..
ok "CocoaPods dependencies installed"

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "=================================="
echo -e "${GREEN}  Setup complete!${NC}"
echo "=================================="
echo ""
echo "Plug your iPhone into this Mac via USB, then run:"
echo ""
echo -e "  ${GREEN}npx expo run:ios --device${NC}"
echo ""
echo "The app will build and install on the phone (~5 min first time)."
echo "Tap 'Trust' on the phone if it asks about the developer."
echo ""
echo "Note: Without a paid Apple Developer account, the app"
echo "expires after 7 days and you'll need to reinstall."
echo ""
