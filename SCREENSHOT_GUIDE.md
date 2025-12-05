# App Store Screenshot Guide

This guide will help you create professional screenshots for your App Store submission.

## 📱 Required Screenshot Sizes

### iPhone Screenshots
You need screenshots for the following device sizes:

1. **iPhone 6.7" Display** (iPhone 14 Pro Max, 15 Pro Max, etc.)
   - Size: 1290 x 2796 pixels
   - Required: 6.5 screenshots minimum

2. **iPhone 6.5" Display** (iPhone 11 Pro Max, XS Max, etc.)
   - Size: 1242 x 2688 pixels
   - Required: 6.5 screenshots minimum

3. **iPhone 5.5" Display** (iPhone 8 Plus, 7 Plus, etc.)
   - Size: 1242 x 2208 pixels
   - Required: 5.5 screenshots minimum

### iPad Screenshots (Optional but Recommended)
1. **iPad Pro 12.9"**
   - Size: 2048 x 2732 pixels
   - Required: 12.9 screenshots minimum

2. **iPad Pro 11"**
   - Size: 1668 x 2388 pixels
   - Required: 11 screenshots minimum

## 🎨 What to Show in Screenshots

### Screenshot 1: Hero/Onboarding
- App name and tagline
- Main value proposition
- Clean, inviting design

### Screenshot 2: Closet View
- Grid of clothing items
- Show variety of items
- Clean, organized layout

### Screenshot 3: Upload Feature
- Upload interface
- Camera/photo library access
- Show the ease of adding items

### Screenshot 4: AI Recommendations
- Outfit recommendations
- AI-generated suggestions
- Show personalized results

### Screenshot 5: Capsule Wardrobe
- Capsule builder interface
- Selected items
- Versatility score

### Screenshot 6: Analytics/Insights
- Wardrobe analytics
- Charts and statistics
- Wear tracking data

### Screenshot 7: Style Chat (Optional)
- AI chat interface
- Example conversation
- Show helpful responses

## 🛠️ How to Take Screenshots

### Method 1: Using iOS Simulator (Recommended)

1. **Open your app in Xcode Simulator:**
   ```bash
   npm run ios:dev
   # Then run in Xcode
   ```

2. **Select the device:**
   - Device > Device Type > iPhone 14 Pro Max (for 6.7")
   - Or iPhone 8 Plus (for 5.5")

3. **Navigate to each screen** you want to screenshot

4. **Take screenshot:**
   - `Cmd + S` in Simulator
   - Or File > Save Screen Shot
   - Screenshots are saved to Desktop

5. **Crop if needed:**
   - Screenshots include status bar and home indicator
   - You may want to crop to just the app content

### Method 2: Using Physical Device

1. **Run app on physical iPhone**
2. **Navigate to each screen**
3. **Take screenshot:**
   - iPhone X and later: Volume Up + Side Button
   - iPhone 8 and earlier: Home + Side Button
4. **Transfer to Mac** via AirDrop or Photos app

### Method 3: Using Design Tools

Create mockups using:
- **Figma** - Free, web-based
- **Sketch** - Mac app
- **Photoshop** - Professional

Use device frames and your actual app screenshots.

## 📐 Screenshot Requirements

### Technical Requirements
- ✅ PNG or JPEG format
- ✅ RGB color space
- ✅ No transparency
- ✅ No borders or frames (Apple adds these)
- ✅ No device bezels (unless using Apple's templates)
- ✅ No text overlays (Apple adds app name)

### Content Requirements
- ✅ Show actual app functionality
- ✅ Use real data (not placeholder text)
- ✅ Show key features
- ✅ Highlight unique value propositions
- ✅ Keep text minimal (screenshots are small on App Store)

### What NOT to Include
- ❌ Placeholder text ("Lorem ipsum")
- ❌ Test data or debug info
- ❌ Watermarks
- ❌ Pricing information
- ❌ Apple device frames (they add these)
- ❌ Status bar time should be 9:41 AM (Apple standard)

## 🎯 Screenshot Optimization Tips

1. **Use Real Data**: Populate your app with sample clothing items before taking screenshots

2. **Highlight Key Features**: Each screenshot should showcase a different major feature

3. **Keep It Clean**: Remove any debug info, test data, or development UI

4. **Consistent Design**: All screenshots should have a cohesive look

5. **Show Value**: Make it clear what the app does and why users should download it

## 📝 Screenshot Checklist

Before submitting, ensure:

- [ ] All required device sizes have screenshots
- [ ] Screenshots show actual app functionality
- [ ] No placeholder or test data visible
- [ ] Status bar shows 9:41 AM (if visible)
- [ ] Screenshots are properly sized (no stretching)
- [ ] Key features are highlighted
- [ ] Screenshots are in correct order (most important first)
- [ ] All text is readable at small sizes
- [ ] Screenshots match your app description

## 🚀 Quick Screenshot Script

You can use this script to help organize your screenshots:

```bash
# Create screenshot directories
mkdir -p screenshots/iphone-6.7
mkdir -p screenshots/iphone-6.5
mkdir -p screenshots/iphone-5.5
mkdir -p screenshots/ipad-12.9
mkdir -p screenshots/ipad-11

# After taking screenshots, organize them:
# 1. Rename with descriptive names
# 2. Move to appropriate folders
# 3. Verify sizes match requirements
```

## 📱 Recommended Screenshot Order

1. **Hero/Onboarding** - First impression
2. **Closet View** - Core functionality
3. **Upload Feature** - Easy to use
4. **AI Recommendations** - Unique value
5. **Capsule Wardrobe** - Advanced feature
6. **Analytics** - Insights and value
7. **Style Chat** - Interactive feature

## 🔗 Resources

- [Apple App Store Screenshot Requirements](https://developer.apple.com/app-store/product-page/)
- [App Store Screenshot Generator](https://www.appstorescreenshot.com/)
- [Figma Device Frames](https://www.figma.com/community/file/894819444957421310)

## 💡 Pro Tips

1. **Test on Real Device**: Screenshots from physical devices often look better than simulator

2. **Use Dark Mode**: Consider taking some screenshots in dark mode for variety

3. **Show Diversity**: Include a variety of clothing items, colors, and styles

4. **Update Regularly**: Update screenshots when you add new features

5. **A/B Test**: Try different screenshot orders to see what converts better

---

**Note**: You'll upload these screenshots in App Store Connect when submitting your app for review.






