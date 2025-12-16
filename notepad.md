git add .
git commit -m"fixing buttons"
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
git commit -m"credit not working, overlay not working"
git push