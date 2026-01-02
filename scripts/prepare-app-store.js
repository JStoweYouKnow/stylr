#!/usr/bin/env node

/**
 * Prepare iOS app for App Store upload
 * This script verifies configuration and prepares the build
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('📦 Preparing iOS app for App Store upload...\n');

// Check if .env exists
const envPath = path.join(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
  console.warn('⚠️  Warning: .env file not found');
} else {
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  // Check for local server usage
  if (envContent.includes('CAPACITOR_USE_LOCAL=true')) {
    console.warn('⚠️  Warning: CAPACITOR_USE_LOCAL=true is set');
    console.warn('   This will use localhost. Make sure to set it to false for App Store builds!\n');
  }
  
  // Check for server URL
  if (!envContent.includes('NEXT_PUBLIC_CAPACITOR_SERVER_URL')) {
    console.warn('⚠️  Warning: NEXT_PUBLIC_CAPACITOR_SERVER_URL not set');
    console.warn('   Make sure to set your production server URL!\n');
  }
}

// Check if out directory exists
const outDir = path.join(process.cwd(), 'out');
if (!fs.existsSync(outDir)) {
  console.log('📦 Building Next.js app...');
  try {
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ Build complete\n');
  } catch (error) {
    console.error('❌ Build failed');
    process.exit(1);
  }
} else {
  console.log('✅ Build directory exists\n');
}

// Check Xcode project
const xcodeProject = path.join(process.cwd(), 'ios/App/App.xcodeproj/project.pbxproj');
if (!fs.existsSync(xcodeProject)) {
  console.error('❌ Xcode project not found');
  process.exit(1);
}

console.log('✅ Xcode project found\n');

// Check Info.plist
const infoPlist = path.join(process.cwd(), 'ios/App/App/Info.plist');
if (fs.existsSync(infoPlist)) {
  const plistContent = fs.readFileSync(infoPlist, 'utf8');
  
  // Check for required keys
  const requiredKeys = [
    'NSCameraUsageDescription',
    'NSPhotoLibraryUsageDescription',
    'NSPhotoLibraryAddUsageDescription'
  ];
  
  const missingKeys = requiredKeys.filter(key => !plistContent.includes(key));
  
  if (missingKeys.length > 0) {
    console.warn(`⚠️  Missing Info.plist keys: ${missingKeys.join(', ')}\n`);
  } else {
    console.log('✅ All required Info.plist keys present\n');
  }
}

// Check for app icons
const iconDir = path.join(process.cwd(), 'ios/App/App/Assets.xcassets/AppIcon.appiconset');
if (!fs.existsSync(iconDir)) {
  console.warn('⚠️  App icons directory not found\n');
} else {
  console.log('✅ App icons directory found\n');
}

console.log('📋 Pre-upload Checklist:');
console.log('');
console.log('Before uploading to App Store:');
console.log('  [ ] Version and build numbers are set in Xcode');
console.log('  [ ] Bundle ID matches App Store Connect (com.stylr-1.app)');
console.log('  [ ] Code signing is configured');
console.log('  [ ] App has been tested on a physical device');
console.log('  [ ] Server URL points to production (not localhost)');
console.log('  [ ] Privacy policy URL is ready');
console.log('  [ ] Screenshots are prepared');
console.log('');
console.log('Next steps:');
console.log('  1. Open Xcode: npm run ios:dev');
console.log('  2. Select "Any iOS Device"');
console.log('  3. Product → Archive');
console.log('  4. Distribute App → App Store Connect');
console.log('');
console.log('📖 See APP_STORE_UPLOAD_GUIDE.md for detailed instructions');






