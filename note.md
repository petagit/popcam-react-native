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


-----


git add .
git commit -m"1.0.4"
git push

npx eas build --platform ios --profile production

npx eas submit --platform ios --profile production
   ```

### For Android Play Store:
1. Ensure `app-logo.png` is square (ideally 1024x1024px or larger)
2. Rebuild the app:
   ```bash
   eas build --platform android --profile production
   ```
3. Submit to Play Store:
   ```bash
   eas submit --platform android --profile production
   ```

### Important Notes:
- Icon requirements:
  - iOS: 1024x1024px PNG, no transparency
  - Android: Square image (foreground will be cropped to a circle)
- After rebuilding, Expo will generate all required icon sizes
- The new logo will appear after you submit the updated build to the stores

The configuration is ready. Rebuild and submit the app to update the logo on both stores.

build and submit
   npm run build-and-submit:ios


   cd "/Users/fengzhiping/popcam react native" && npm run submit:ios


npm run build:ios
npm run submit:ios

   npm run build-and-submit:ios





git add .
git commit -m"credit fixed, overlay fixed"
git push

