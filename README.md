# PopCam - AI-Powered Photo Analysis App

A React Native app built with Expo that uses OpenAI's GPT-4 Vision API to provide intelligent, witty, and engaging analysis of your photos.

## 🚀 Features

- **AI Photo Analysis**: Uses OpenAI's GPT-4 Vision to analyze photos with pop culture awareness and meme-worthy insights
- **Camera Integration**: Take photos directly in the app or import from your gallery
- **Local Storage**: All analyses are saved locally on your device
- **Tag Generation**: AI generates relevant hashtags for each analysis
- **Gallery View**: Browse all your analyzed photos in a beautiful grid layout
- **Share Functionality**: Share your AI analyses with friends
- **Settings Management**: Easy setup and management of your OpenAI API key

## 📱 Screenshots

The app features a modern, clean interface with:
- Home screen with recent analyses
- Camera screen with photo capture
- Analysis screen with AI insights
- Gallery view of all photos
- Settings screen for configuration

## 🛠️ Setup Instructions

### Prerequisites

- Node.js (version 16 or later)
- npm or yarn
- Expo CLI
- An OpenAI API key (get one at [platform.openai.com](https://platform.openai.com/api-keys))

### Installation

1. **Clone and navigate to the project**:
   ```bash
   cd popcam-app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm start
   ```

4. **Run on your device**:
   - Install the Expo Go app on your phone
   - Scan the QR code displayed in the terminal
   - Or run on iOS simulator: `npm run ios`
   - Or run on Android emulator: `npm run android`

### OpenAI API Key Setup

You have two options to configure your OpenAI API key:

#### Option 1: In-App Setup (Recommended)
1. Launch the app
2. Tap the settings gear icon (⚙️) on the home screen
3. Enter your OpenAI API key in the settings
4. Tap "Save Key"

#### Option 2: Environment Variable
1. Create a `.env` file in the project root:
   ```
   EXPO_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here
   ```
2. Replace `your_openai_api_key_here` with your actual API key

## 🎯 How to Use

1. **Home Screen**: View recent analyses and access main features
2. **Take Photo**: Tap "📸 Take Photo" to open the camera
3. **Capture/Select**: Take a new photo or select from gallery
4. **AI Analysis**: The app automatically analyzes your photo with AI
5. **View Results**: See the witty analysis, generated tags, and metadata
6. **Gallery**: Browse all your analyzed photos
7. **Share**: Share your favorite AI analyses with friends

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
├── screens/            # App screens
│   ├── HomeScreen.tsx
│   ├── CameraScreen.tsx
│   ├── AnalysisScreen.tsx
│   ├── GalleryScreen.tsx
│   └── SettingsScreen.tsx
├── services/           # API and data services
│   ├── openaiService.ts
│   └── storageService.ts
├── types/             # TypeScript type definitions
├── constants/         # App configuration
└── utils/            # Utility functions
```

## 🔧 Configuration

### OpenAI Settings
- **Model**: GPT-4 Vision Preview
- **Max Tokens**: 1000
- **Temperature**: 0.7 (for creative responses)

### App Settings
- **Auto-save**: Automatically save analyses locally
- **High Quality**: Send higher resolution images (uses more data)
- **Show Tags**: Display AI-generated tags with analyses

## 📦 Dependencies

### Core Dependencies
- **React Native**: Mobile app framework
- **Expo**: Development platform and runtime
- **React Navigation**: Navigation library
- **AsyncStorage**: Local data persistence

### AI & Camera
- **OpenAI API**: For image analysis
- **Expo Camera**: Camera functionality
- **Expo Image Picker**: Gallery access

## 🔒 Privacy & Data

- **Local Storage**: All analyses are stored locally on your device
- **No Cloud Sync**: Data is not uploaded to any servers (except OpenAI for analysis)
- **API Key Security**: Your OpenAI API key is stored securely on your device
- **Data Control**: You can clear all data at any time from the settings

## 🐛 Troubleshooting

### Common Issues

**Camera Permission Denied**
- Go to Settings > PopCam > Camera and enable permission

**API Key Not Working**
- Ensure your API key starts with "sk-"
- Check that you have credit available in your OpenAI account
- Verify the key is correctly entered without extra spaces

**Analysis Failed**
- Check your internet connection
- Ensure your OpenAI API key is valid and has credits
- Try with a smaller image size

### Error Messages

- **"OpenAI API key not configured"**: Set up your API key in settings
- **"Failed to analyze image"**: Check internet connection and API key
- **"Camera permission required"**: Enable camera permission in device settings

## 🔮 Future Enhancements

Potential features for future versions:
- Batch photo analysis
- Custom analysis prompts
- Export analyses to social media
- Cloud sync and backup
- Voice narration of analyses
- Different AI analysis styles/moods

## 📄 License

This project is created for educational and demonstration purposes. Please ensure you comply with OpenAI's usage policies when using their API.

## 🤝 Contributing

This is a demonstration project, but feel free to:
- Report bugs
- Suggest features
- Submit improvements

## 🆘 Support

If you encounter issues:
1. Check this README for troubleshooting steps
2. Ensure all dependencies are properly installed
3. Verify your OpenAI API key is valid and has credits
4. Check the Expo documentation for platform-specific issues

---

**Enjoy analyzing your photos with AI! 📸✨** 