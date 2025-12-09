<!-- 479a439d-64a2-4dcb-9652-cfcd059f96a0 a4297a50-2563-45f7-b0ee-2819dc17e411 -->
# Fix App Store Review Issues

This plan addresses three App Store review rejections:

1. **Guideline 4.8** - Add Sign in with Apple as equivalent login option
2. **Guideline 5.1.1(v)** - Implement account deletion functionality
3. **Guideline 3.1.1** - Add StoreKit in-app purchases for credits

## 1. Add Sign in with Apple (Guideline 4.8)

**Files to modify:**

- `src/screens/SignInScreen.tsx` - Add Apple sign-in button
- `src/screens/SignUpScreen.tsx` - Add Apple sign-up button
- `CLERK_SETUP.md` - Update documentation for Apple OAuth setup

**Implementation:**

- Configure Apple OAuth in Clerk dashboard (requires Apple Developer account)
- Use Clerk's `useOAuth` hook with `strategy: 'oauth_apple'`
- Add Apple sign-in button using Apple's design guidelines
- Ensure Apple sign-in appears alongside Google OAuth and email/password options
- Handle Apple sign-in flow (both sign-in and sign-up use same button)

**Notes:**

- Apple sign-in requires proper Apple Developer account setup
- Must use Apple's official button design/assets
- Clerk handles the OAuth flow automatically

## 2. Implement Account Deletion (Guideline 5.1.1(v))

**Files to modify:**

- `src/screens/SettingsScreen.tsx` - Add account deletion option
- `src/services/supabaseService.ts` - Add `deleteUserAccount` method
- Create new component or screen for account deletion confirmation

**Implementation:**

- Add "Delete Account" option in Settings screen (Data Management section)
- Create confirmation dialog/screen with clear warnings
- Delete user data from:
- Clerk account (using `user.delete()`)
- Supabase user record (delete from `users` table)
- Local storage (user-specific analyses and preferences via `storageService.clearUserData`)
- Handle sign-out after deletion
- Navigate to landing screen after successful deletion
- Show error handling if deletion fails

**Requirements:**

- Must be permanent deletion (not deactivation)
- Can include confirmation steps to prevent accidental deletion
- Must delete all user data from both Clerk and Supabase

## 3. Add StoreKit In-App Purchases (Guideline 3.1.1)

**Files to create/modify:**

- Create `src/services/storeKitService.ts` - StoreKit wrapper service
- Create `src/screens/PurchaseCreditsScreen.tsx` - Credits purchase screen
- Modify `src/hooks/useCredits.ts` - Add purchase credits functionality
- Modify `src/screens/SettingsScreen.tsx` or `HomeScreen.tsx` - Add "Buy Credits" button
- `package.json` - Add `expo-in-app-purchases` or `react-native-iap` dependency

**Implementation:**

- Install and configure StoreKit package (expo-in-app-purchases or react-native-iap)
- Configure in-app purchase products in App Store Connect:
- Create consumable products (e.g., "10 Credits", "50 Credits", "100 Credits")
- Set pricing tiers
- Create StoreKit service to:
- Fetch available products
- Initiate purchases
- Verify receipts
- Handle purchase completion
- Create purchase screen with:
- List of credit packages
- Price display
- Purchase buttons
- Loading states
- Integrate with Supabase:
- On successful purchase, call `supabaseService.addCredits()` to update user balance
- Store purchase receipts for verification (optional but recommended)
- Add "Buy Credits" button in Settings or Home screen (near credits display)
- Handle purchase errors and edge cases (network failures, cancelled purchases, etc.)

**Requirements:**

- Credits must be purchasable via in-app purchase
- Users can still access credits purchased outside app (multiplatform support)
- Must follow Apple's StoreKit guidelines

## Implementation Order

1. **Sign in with Apple** - Quickest to implement, requires Clerk dashboard configuration
2. **Account Deletion** - Straightforward, requires data cleanup logic
3. **StoreKit Integration** - Most complex, requires App Store Connect setup and testing

## Testing Requirements

- Test Sign in with Apple on physical iOS device (required for Apple OAuth)
- Test account deletion flow end-to-end
- Test in-app purchases in sandbox environment
- Verify credits are properly added after purchase
- Test error scenarios (network failures, cancelled purchases, etc.)

## Dependencies to Add

- `expo-in-app-purchases` (or `react-native-iap` if not using Expo)
- Apple Developer account configuration for Sign in with Apple
- App Store Connect setup for in-app purchase products

### To-dos

- [ ] Configure Sign in with Apple in Clerk dashboard and update documentation
- [ ] Add Sign in with Apple buttons to SignInScreen and SignUpScreen
- [ ] Add account deletion option to SettingsScreen with confirmation dialog
- [ ] Implement account deletion service methods (Clerk + Supabase + local storage cleanup)
- [ ] Wire up account deletion UI to service methods and handle navigation
- [ ] Install StoreKit package and configure App Store Connect products
- [ ] Create StoreKit service wrapper for fetching products and handling purchases
- [ ] Create PurchaseCreditsScreen with product listings and purchase flow
- [ ] Integrate StoreKit purchases with Supabase credits system
- [ ] Add 'Buy Credits' button/access point in Settings or Home screen