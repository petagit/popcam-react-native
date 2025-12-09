# Environment Setup Guide

## Required Environment Variables

To run PopCam properly, you need to create a `.env` file in your project root with the following variables:

### 1. Create `.env` file

Create a new file called `.env` in your project root directory and add:

```env
# Clerk Authentication (Required for sign-in/sign-up)
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key_here

# OpenAI API (Required for infographic generation)
EXPO_PUBLIC_OPENAI_API_KEY=sk-proj-your_openai_api_key_here

# Nano Banana / Google Gemini API (Required for Nano Banana Lab)
EXPO_PUBLIC_NANO_BANANA_API_KEY=your_google_gemini_api_key_here
# Optional: override the default model if your key requires a different release
# Defaults to gemini-2.5-flash-image-preview. Other supported values include imagen-3.0-fast, imagen-3.0, gemini-2.0-flash-exp.
# EXPO_PUBLIC_NANO_BANANA_MODEL=gemini-2.5-flash-image-preview

# Supabase (Optional - for additional backend features)
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 2. Get Your Clerk Publishable Key

1. Go to [clerk.com](https://clerk.com) and create a free account
2. Create a new application
3. Copy your publishable key from the dashboard
4. Replace `pk_test_your_clerk_publishable_key_here` with your actual key

### 3. Get Your OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create an account or sign in
3. Navigate to API Keys section
4. Create a new API key
5. Replace `sk-proj-your_openai_api_key_here` with your actual key

### 4. Optional: Configure Google OAuth

For Google sign-in to work:

1. **Set up Google OAuth in Clerk dashboard:**
   - Go to "User & Authentication" → "Social Connections"
   - Enable Google
   - Follow the setup instructions

2. **Configure Google Cloud Console:**
   - Create OAuth 2.0 credentials
   - Add them to your Clerk dashboard

### 5. Restart Development Server

After creating your `.env` file:

```bash
npm start
```

## Troubleshooting

- **"Clerk Authentication Not Configured"**: Make sure your `.env` file exists and has the correct `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
- **OAuth errors**: Google OAuth requires additional setup in Clerk dashboard
- **Development vs Production warning**: This is normal for development mode

## Test the App

Once configured, you should be able to:
- Sign up/sign in with email
- Use Google OAuth (if configured)
- Take photos
- Generate infographics (with OpenAI API key)
- View gallery of saved analyses 
