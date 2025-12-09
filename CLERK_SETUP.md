# Clerk Authentication Setup Guide

This guide will help you set up Clerk authentication with Google OAuth and Sign in with Apple for your PopCam app.

## Prerequisites

- Expo CLI installed
- React Native development environment set up
- Clerk account (free tier available)
- Google Cloud Console account (for OAuth setup)
- Apple Developer account (for Sign in with Apple)

## Step 1: Create a Clerk Application

1. Go to [clerk.com](https://clerk.com) and sign up for a free account
2. Create a new application
3. Choose "React Native" as your platform
4. Copy your publishable key from the dashboard

## Step 2: Set up Sign in with Apple (Required for App Store)

### In Apple Developer Portal:
1. Go to [Apple Developer Portal](https://developer.apple.com/account/)
2. Navigate to "Certificates, Identifiers & Profiles" → "Identifiers"
3. Select your app's identifier (or create one)
4. Enable the "Sign in with Apple" capability
5. If your app supports web authentication, create a Services ID:
   - Go to "Identifiers" → Click "+" → Select "Services IDs"
   - Register a Services ID
   - Enable "Sign in with Apple"
   - Configure domains and return URLs (Clerk will provide these)

### In Xcode (for iOS builds):
1. Open your iOS project in Xcode
2. Select your app target
3. Go to "Signing & Capabilities" tab
4. Click "+ Capability" and add "Sign in with Apple"

### In Clerk Dashboard:
1. Go to "User & Authentication" → "Social Connections"
2. Enable Apple
3. Add your Apple Services ID and configuration
4. Configure redirect URLs (Clerk will provide these)

**Note:** Sign in with Apple is required to comply with App Store Guideline 4.8, which requires apps using third-party login services to offer an equivalent login option.

## Step 3: Set up Google OAuth

### In Google Cloud Console:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Configure OAuth consent screen if needed
6. Create credentials for:
   - **Web application** (for Clerk)
   - **iOS** (if building for iOS)
   - **Android** (if building for Android)
7. Copy the Client ID and Client Secret

### In Clerk Dashboard:
1. Go to "User & Authentication" → "Social Connections"
2. Enable Google
3. Add your Google OAuth credentials:
   - Client ID
   - Client Secret
4. Configure redirect URLs (Clerk will provide these)

## Step 4: Environment Configuration

Create a `.env` file in your project root with:

```env
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key_here
EXPO_PUBLIC_OPENAI_API_KEY=sk-proj-your_openai_api_key_here
```

Replace `pk_test_your_clerk_publishable_key_here` with your actual Clerk publishable key.

## Step 5: Configure Clerk Dashboard

In your Clerk dashboard:

1. **Email Settings**: Enable email/password authentication
2. **Social Connections**: 
   - Enable Sign in with Apple (completed in Step 2)
   - Enable Google OAuth (completed in Step 3)
3. **Session Settings**: Set session timeout as needed
4. **User Profile**: Configure required fields (email is default)
5. **Webhooks** (optional): Set up webhooks for user events

## Step 6: Test the Authentication

1. Start your Expo development server:
   ```bash
   npm start
   ```

2. Test the authentication flow:
   - Sign up with email/password
   - Sign up with Sign in with Apple
   - Sign up with Google OAuth
   - Sign in with email/password
   - Sign in with Sign in with Apple
   - Sign in with Google OAuth
   - Verify email address (for email/password)
   - Sign in/out
   - Take photos (analyses will be associated with your account)

**Important:** Sign in with Apple must be tested on a physical iOS device, as it's not available in the iOS Simulator.

## Features Enabled

✅ **User Registration & Login** - Email/password authentication
✅ **Sign in with Apple** - Privacy-focused sign-in/sign-up (required for App Store compliance)
✅ **Google OAuth** - One-click sign-in/sign-up with Google
✅ **Email Verification** - Secure account verification
✅ **User-Specific Data** - Analyses are saved per user account
✅ **Session Management** - Automatic session handling
✅ **Guest Mode** - Users can still use camera without account (limited features)
✅ **Profile Display** - User info shown on home screen
✅ **Sign Out** - Clean sign-out functionality

## User Experience

### Authentication Options
Users can choose from:
- **Sign in with Apple** - Privacy-focused sign-in that meets App Store requirements
- **Google OAuth** - Quick sign-in with existing Google account
- **Email/Password** - Traditional registration with email verification
- **Guest Mode** - Try the app without creating an account

### Signed Out Users
- See sign-in/sign-up options with Sign in with Apple and Google OAuth buttons
- Can access camera and take photos
- Cannot save analysis history
- Limited to demo/trial experience

### Signed In Users  
- Full feature access
- Analysis history saved to their account
- Cross-device sync capability
- Profile customization with Google profile info
- Share analyses with attribution

## Security Features

- Secure JWT token management
- Automatic session refresh
- Google OAuth security (no password storage needed)
- Secure password requirements (for email/password)
- Email verification required (for email/password)
- User data isolation

## Troubleshooting

### Common Issues

1. **"Missing Publishable Key" Error**
   - Check your `.env` file exists and has the correct key
   - Restart Expo development server after adding `.env`

2. **Sign in with Apple Not Working**
   - Verify Apple OAuth is enabled in Clerk dashboard
   - Check Apple Developer Portal configuration
   - Ensure "Sign in with Apple" capability is added in Xcode
   - Test on physical iOS device (not available in Simulator)
   - Verify Services ID is properly configured in Apple Developer Portal

3. **Google OAuth Not Working**
   - Verify Google OAuth is enabled in Clerk dashboard
   - Check Google Cloud Console credentials are correct
   - Ensure OAuth consent screen is configured
   - Test with different Google account

4. **Authentication Not Working**
   - Verify your Clerk app configuration
   - Check email/password is enabled in Clerk dashboard
   - Test with different email address

5. **User Data Not Showing**
   - Clear app data/storage
   - Check user is properly authenticated
   - Verify analyses are being saved with user ID

### OAuth-Specific Issues

1. **Google OAuth Fails**
   - Check OAuth redirect URLs in Google Console
   - Verify Client ID/Secret in Clerk dashboard
   - Ensure OAuth consent screen is published

2. **OAuth Button Not Appearing**
   - Verify Google provider is enabled in Clerk
   - Check for JavaScript errors in development console

### Getting Help

- [Clerk Documentation](https://clerk.com/docs)
- [Expo + Clerk Guide](https://clerk.com/docs/quickstarts/expo)
- [Sign in with Apple Setup](https://clerk.com/docs/authentication/social-connections/apple)
- [Google OAuth Setup](https://clerk.com/docs/authentication/social-connections/google)
- [Apple Sign in with Apple Documentation](https://developer.apple.com/sign-in-with-apple/)
- Check the Clerk dashboard for authentication logs

## Next Steps

Consider adding these advanced features:

- **Additional OAuth Providers**: GitHub, Facebook login
- **Multi-Factor Authentication**: SMS or app-based 2FA  
- **User Roles**: Admin, premium users, etc.
- **Organization Support**: Team accounts for businesses
- **Progressive Web App**: PWA support for web access
- **Social Features**: Share analyses with contacts 