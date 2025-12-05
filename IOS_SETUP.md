# iOS Mobile App Setup Guide

This guide will help you build and deploy the Stylr iOS app using Capacitor.

## 📋 Prerequisites

1. **macOS** - iOS development requires a Mac
2. **Xcode** - Install from the Mac App Store (latest version recommended)
3. **Xcode Command Line Tools**:
   ```bash
   xcode-select --install
   ```
4. **CocoaPods** (for iOS dependencies):
   ```bash
   sudo gem install cocoapods
   ```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create or update your `.env` file:

```env
# Your existing environment variables
DATABASE_URL="..."
BLOB_READ_WRITE_TOKEN="..."
GOOGLE_AI_API_KEY="..."

# For iOS app - point to your deployed Vercel app
# Replace with your actual Vercel deployment URL
NEXT_PUBLIC_CAPACITOR_SERVER_URL="https://stylr.vercel.app"

# For local development (optional)
# Set CAPACITOR_USE_LOCAL=true to use localhost:3000
CAPACITOR_USE_LOCAL=false
```

### 3. Build for iOS

```bash
npm run build:ios
```

This will:
- Generate Prisma Client
- Build the Next.js app
- Sync with Capacitor iOS

### 4. Open in Xcode

```bash
npm run ios:dev
```

Or manually:
```bash
open ios/App/App.xcworkspace
```

## 🏗️ Build Modes

### Production Mode (Deployed Server)

By default, the iOS app loads from your deployed Vercel server. This provides an **exact copy** of the web experience:

1. Set `NEXT_PUBLIC_CAPACITOR_SERVER_URL` in `.env` to your Vercel URL
2. Build: `npm run build:ios`
3. The app will load from the server, all API routes work perfectly

### Development Mode (Local Server)

For local development:

1. Start your Next.js dev server:
   ```bash
   npm run dev
   ```

2. Set in `.env`:
   ```env
   CAPACITOR_USE_LOCAL=true
   ```

3. Build and sync:
   ```bash
   npm run build:ios
   npm run ios:sync
   ```

4. The app will load from `http://localhost:3000`

## 📱 Running on Device

### Simulator

1. Open Xcode: `npm run ios:dev`
2. Select a simulator from the device dropdown
3. Click the Run button (▶️) or press `Cmd+R`

### Physical Device

1. Connect your iPhone via USB
2. In Xcode, select your device from the device dropdown
3. You may need to:
   - Sign in with your Apple ID in Xcode
   - Trust your developer certificate on the device
   - Enable Developer Mode on iOS 16+ (Settings > Privacy & Security > Developer Mode)

4. Click Run (▶️)

## 🎨 App Icons

The app uses icons from `public/icon-512.png`. To update:

1. Replace `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png` with a 1024x1024 PNG
2. Or use Xcode's App Icon generator:
   - Open `ios/App/App/Assets.xcassets/AppIcon.appiconset/` in Xcode
   - Drag your icon image

## 🔧 Configuration

### Capacitor Config

Edit `capacitor.config.ts` to customize:

- **App ID**: Change `appId` (currently `com.stylr.app`)
- **App Name**: Change `appName` (currently `Stylr`)
- **Server URL**: Set via `NEXT_PUBLIC_CAPACITOR_SERVER_URL` env var
- **Splash Screen**: Customize in `plugins.SplashScreen`
- **Status Bar**: Customize in `plugins.StatusBar`

### iOS-Specific Settings

Edit `ios/App/App/Info.plist` for:
- App permissions (Camera, Photo Library)
- Supported orientations
- URL schemes
- Other iOS-specific configurations

## 📦 Building for App Store

### 1. Update Version

In Xcode:
- Select the project in the navigator
- Go to the "General" tab
- Update "Version" and "Build" numbers

### 2. Archive

1. In Xcode, select "Any iOS Device" or "Generic iOS Device"
2. Product > Archive
3. Wait for the archive to complete

### 3. Distribute

1. In the Organizer window, select your archive
2. Click "Distribute App"
3. Follow the prompts to:
   - Choose distribution method (App Store, Ad Hoc, Enterprise)
   - Select provisioning profiles
   - Upload to App Store Connect

## 🐛 Troubleshooting

### Build Errors

**Error: "No such module 'Capacitor'"**
```bash
cd ios/App
pod install
```

**Error: "Missing out directory"**
```bash
npm run build
npm run ios:sync
```

### Runtime Issues

**App shows blank screen:**
- Check that `NEXT_PUBLIC_CAPACITOR_SERVER_URL` is set correctly
- Verify the server is accessible
- Check Xcode console for errors

**API calls fail:**
- Ensure CORS is configured on your server
- Check network permissions in Info.plist
- Verify the API base URL in `lib/api-client.ts`

### Sync Issues

**Changes not appearing:**
```bash
npm run ios:sync
```

Or manually:
```bash
npx cap copy ios
npx cap sync ios
```

## 📚 Additional Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [iOS Development Guide](https://developer.apple.com/ios/)
- [Xcode User Guide](https://developer.apple.com/documentation/xcode)

## 🎯 Next Steps

1. **Test on Device**: Run the app on a physical iPhone
2. **Configure App Store**: Set up App Store Connect
3. **Add Native Features**: Consider adding:
   - Push notifications
   - Biometric authentication
   - Native sharing
   - Camera integration
4. **Optimize**: Test performance and optimize images/assets

## 📝 Notes

- The app uses your deployed Vercel server for API calls, ensuring an exact copy of the web experience
- All API routes work seamlessly
- The app is fully responsive and mobile-optimized
- Native iOS features (status bar, splash screen, etc.) are configured






