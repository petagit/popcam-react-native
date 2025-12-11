Install deps:
cd "/Users/fengzhiping/popcam react native/popcam-app" && npm install
Start the dev server (Metro + Expo):
npm run start
Open on simulators/devices (run from the same directory):
On a physical device: install “Expo Go” (App Store/Play Store), then scan the QR shown after npm run start.
Troubleshooting:

npx expo start -c
npm run ios -- --device

# 1. Clear Metro Bundler Cache (fixes most syntax/caching issues)
npx expo start -c

# 2. If the issue persists, perform a deep clean of iOS build artifacts:
rm -rf ios/build
rm -rf ~/Library/Developer/Xcode/DerivedData
cd ios && pod install && cd ..

# 3. Then try running your app again:
npm run ios -- --device