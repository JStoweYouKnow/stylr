#!/usr/bin/env node

/**
 * Build script for iOS app
 * This script builds the Next.js app and syncs it with Capacitor
 */

const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Ensure we use rbenv-installed Ruby (so `pod` comes from Ruby 3.x, not system Ruby 2.6)
const homeDir = os.homedir();
const rbenvShims = path.join(homeDir, '.rbenv', 'shims');
const rbenvBin = path.join(homeDir, '.rbenv', 'bin');
const additionalPaths = [];
if (fs.existsSync(rbenvShims)) {
  additionalPaths.push(rbenvShims);
}
if (fs.existsSync(rbenvBin)) {
  additionalPaths.push(rbenvBin);
}
if (additionalPaths.length > 0) {
  process.env.PATH = `${additionalPaths.join(':')}:${process.env.PATH}`;
  if (!process.env.RBENV_VERSION) {
    const versionFile = path.join(homeDir, '.rbenv', 'version');
    if (fs.existsSync(versionFile)) {
      process.env.RBENV_VERSION = fs.readFileSync(versionFile, 'utf8').trim();
    }
  }
}

console.log('📱 Building iOS app...\n');

// Step 1: Generate Prisma Client
console.log('1️⃣ Generating Prisma Client...');
try {
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Prisma Client generated\n');
} catch (error) {
  console.error('❌ Failed to generate Prisma Client');
  process.exit(1);
}

// Step 2: Build Next.js app
console.log('2️⃣ Building Next.js app...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Next.js app built\n');
} catch (error) {
  console.error('❌ Failed to build Next.js app');
  process.exit(1);
}

// Step 3: Sync Capacitor
console.log('3️⃣ Syncing Capacitor iOS...');
try {
  execSync('npx cap sync ios', { stdio: 'inherit' });
  console.log('✅ Capacitor synced\n');
} catch (error) {
  console.error('❌ Failed to sync Capacitor');
  process.exit(1);
}

console.log('🎉 iOS build complete!');
console.log('\nNext steps:');
console.log('  - Open Xcode: npm run ios:dev');
console.log('  - Or manually: open ios/App/App.xcworkspace');

