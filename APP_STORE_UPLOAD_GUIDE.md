# App Store Upload Guide

This guide will walk you through uploading your Stylr iOS app to the App Store.

## 📋 Prerequisites

Before you begin, ensure you have:

1. ✅ **Apple Developer Account** ($99/year)
   - Active Apple Developer Program membership
   - Access to App Store Connect (https://appstoreconnect.apple.com)

2. ✅ **Xcode** (latest version)
   - Installed from Mac App Store
   - Command Line Tools installed

3. ✅ **App Store Connect Setup**
   - App record created in App Store Connect
   - Bundle ID matches: `com.stylr-1.app` (note: your Xcode project uses this, not `com.stylr.app`)
   - App metadata prepared (name, description, screenshots, etc.)

## 🚀 Step-by-Step Upload Process

### Step 1: Prepare Your Build

1. **Build the iOS app:**
   ```bash
   npm run build:ios
   ```

   This will:
   - Generate Prisma Client
   - Build the Next.js app
   - Sync with Capacitor iOS

2. **Verify your environment:**
   - Ensure `NEXT_PUBLIC_CAPACITOR_SERVER_URL` in `.env` points to your production server
   - Ensure `CAPACITOR_USE_LOCAL=false` (or not set) in `.env`

### Step 2: Open in Xcode

```bash
npm run ios:dev
```

Or manually:
```bash
open ios/App/App.xcworkspace
```

⚠️ **Important**: Always open the `.xcworkspace` file, NOT the `.xcodeproj` file!

### Step 3: Configure Version & Build Numbers

1. In Xcode, select the **App** project in the navigator (left sidebar)
2. Select the **App** target
3. Go to the **General** tab
4. Update:
   - **Version**: Your app version (e.g., `1.0.0`)
   - **Build**: Increment this for each upload (e.g., `1`, `2`, `3`, etc.)
     - App Store requires each build number to be unique and incrementing

**Current Settings:**
- Version: `1.0`
- Build: `1`

### Step 4: Configure Signing & Capabilities

1. Still in the **General** tab, scroll to **Signing & Capabilities**
2. Ensure:
   - ✅ **Automatically manage signing** is checked
   - ✅ **Team** is selected (your Apple Developer team)
   - ✅ **Bundle Identifier** matches App Store Connect: `com.stylr-1.app`

**Current Team:** `4GG5889HS8`

### Step 5: Select Build Destination

1. In the top toolbar, click the device selector (next to the Run button)
2. Select **"Any iOS Device"** or **"Generic iOS Device"**
   - ⚠️ You cannot archive when a simulator is selected

### Step 6: Clean Build Folder (Recommended)

1. In Xcode menu: **Product** → **Clean Build Folder** (or press `Shift + Cmd + K`)
2. This ensures a fresh build

### Step 7: Archive the App

1. In Xcode menu: **Product** → **Archive**
2. Wait for the archive process to complete (this may take several minutes)
3. The **Organizer** window will automatically open when complete

### Step 8: Upload to App Store Connect

1. In the **Organizer** window, select your archive
2. Click **"Distribute App"**
3. Select **"App Store Connect"** → Click **Next**
4. Select **"Upload"** → Click **Next**
5. Review the app information → Click **Next**
6. Select distribution options:
   - ✅ **Include bitcode** (if available)
   - ✅ **Upload your app's symbols** (recommended for crash reporting)
   - Click **Next**
7. Review signing options:
   - Usually **"Automatically manage signing"** is best
   - Click **Next**
8. Review the summary → Click **Upload**
9. Wait for the upload to complete (this may take 10-30 minutes depending on app size)

### Step 9: Wait for Processing

1. Go to **App Store Connect** → **My Apps** → Select your app
2. Go to **TestFlight** tab (or **App Store** tab for production)
3. Wait for processing (usually 30-60 minutes)
   - You'll receive an email when processing is complete
   - Status will show "Processing" → "Ready to Submit"

### Step 10: Submit for Review (Production)

Once processing is complete:

1. Go to **App Store Connect** → **My Apps** → Your app
2. Click **"+"** next to **iOS App** to create a new version (if first time)
3. Fill in all required information:
   - **What's New in This Version**
   - **Screenshots** (required for all device sizes)
   - **Description**
   - **Keywords**
   - **Support URL**
   - **Privacy Policy URL** (required)
   - **Category**
   - **Age Rating** (complete questionnaire)
4. Select the build you just uploaded
5. Answer **Export Compliance** questions
6. Click **"Submit for Review"**

## 🔍 Troubleshooting

### Archive Button is Grayed Out

**Solution:**
- Make sure you've selected **"Any iOS Device"** or **"Generic iOS Device"**
- Clean build folder: **Product** → **Clean Build Folder**
- Close and reopen Xcode

### Code Signing Errors

**Solution:**
- Ensure your Apple Developer account is signed in: **Xcode** → **Preferences** → **Accounts**
- Check that your team is selected in **Signing & Capabilities**
- Ensure bundle ID matches App Store Connect

### Invalid App Icon (Alpha Channel Error)

**Error:** "Invalid large app icon. The large app icon in the asset catalog can't be transparent or contain an alpha channel."

**Solution:**

1. **Regenerate the icon (removes alpha channel):**
   ```bash
   python3 << 'EOF'
   from PIL import Image
   source_path = 'public/icon-512.png'
   output_path = 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png'
   img = Image.open(source_path)
   if img.mode in ('RGBA', 'LA', 'P'):
       rgb_img = Image.new('RGB', img.size, (0, 0, 0))
       if img.mode == 'P':
           img = img.convert('RGBA')
       if img.mode == 'RGBA':
           rgb_img.paste(img, mask=img.split()[-1])
       else:
           rgb_img.paste(img)
       img = rgb_img
   elif img.mode != 'RGB':
       img = img.convert('RGB')
   img = img.resize((1024, 1024), Image.Resampling.LANCZOS)
   img.save(output_path, 'PNG', optimize=False)
   print('✅ Icon regenerated as RGB')
   EOF
   ```

2. **Clean Xcode caches:**
   ```bash
   ./scripts/clean-xcode-cache.sh
   ```
   
   Or manually:
   - Close Xcode completely
   - Delete `~/Library/Developer/Xcode/DerivedData/*`
   - Reopen Xcode

3. **In Xcode:**
   - **Product** → **Clean Build Folder** (Shift+Cmd+K)
   - Close and reopen Xcode
   - **Product** → **Archive** again

4. **Verify the icon is RGB:**
   ```bash
   file ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png
   ```
   Should show "RGB" not "RGBA"

5. **If still getting the error:**
   - Check that the icon file was actually updated (check modification time)
   - Try deleting the archive and creating a new one
   - Make sure you're archiving from a clean build

### Upload Fails

**Common Issues:**
- **Invalid Bundle**: Check bundle ID matches App Store Connect
- **Missing Icons**: Ensure all required icon sizes are present
- **Missing Info.plist Keys**: Check that all required keys are present

**Solution:**
- Check the error message in Organizer
- Review App Store Connect for specific requirements
- Ensure Info.plist has all required keys (NSCameraUsageDescription, etc.)

### Build Errors

**"No such module 'Capacitor'"**
```bash
cd ios/App
pod install
```

**"Missing out directory"**
```bash
npm run build
npm run ios:sync
```

## 📝 Pre-Upload Checklist

Before uploading, verify:

- [ ] App builds successfully in Xcode
- [ ] Version and build numbers are set correctly
- [ ] Bundle ID matches App Store Connect (`com.stylr-1.app`)
- [ ] Code signing is configured correctly
- [ ] App icons are present (1024x1024 required)
- [ ] Info.plist has all required keys:
  - [ ] NSCameraUsageDescription
  - [ ] NSPhotoLibraryUsageDescription
  - [ ] NSPhotoLibraryAddUsageDescription
- [ ] App has been tested on a physical device
- [ ] Server URL is set to production (not localhost)
- [ ] No console errors or crashes
- [ ] Privacy policy URL is ready
- [ ] Screenshots are prepared (if submitting to production)

## 🎯 Quick Reference Commands

```bash
# Build for iOS
npm run build:ios

# Open in Xcode
npm run ios:dev

# Sync Capacitor (if needed)
npm run ios:sync
```

## 📚 Additional Resources

- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Xcode Documentation](https://developer.apple.com/documentation/xcode)
- [Capacitor iOS Guide](https://capacitorjs.com/docs/ios)

## ⚠️ Important Notes

1. **Bundle ID Mismatch**: Your Xcode project uses `com.stylr-1.app`, but your `capacitor.config.ts` uses `com.stylr.app`. Make sure App Store Connect uses `com.stylr-1.app`.

2. **First Upload**: The first upload may take longer to process. Be patient.

3. **TestFlight**: You can test your app via TestFlight before submitting to production. This is highly recommended!

4. **Review Time**: App Store review typically takes 24-48 hours, but can take longer.

5. **Rejections**: If your app is rejected, Apple will provide specific feedback. Address the issues and resubmit.

## 🎉 Success!

Once your app is approved, it will be available on the App Store! You'll receive an email notification when it goes live.

---

**Need Help?** Check the troubleshooting section or refer to Apple's documentation.

