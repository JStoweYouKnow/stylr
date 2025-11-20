#!/usr/bin/env node

/**
 * Build script that handles the Next.js client-reference-manifest error
 * by creating the missing file if the build fails with that specific error
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function createManifestFile() {
  const nextDir = path.join(process.cwd(), '.next');
  const dashboardDir = path.join(nextDir, 'server', 'app', '(dashboard)');
  const manifestPath = path.join(dashboardDir, 'page_client-reference-manifest.js');
  
  try {
    if (!fs.existsSync(dashboardDir)) {
      fs.mkdirSync(dashboardDir, { recursive: true });
    }
    if (!fs.existsSync(manifestPath)) {
      fs.writeFileSync(manifestPath, 'module.exports={};', 'utf8');
      console.log('Created missing manifest file');
    }
  } catch (e) {
    console.error('Error creating manifest file:', e);
  }
}

try {
  // Try to create the manifest file before build (in case .next already exists)
  if (fs.existsSync(path.join(process.cwd(), '.next'))) {
    createManifestFile();
  }
  
  // Run the build
  execSync('prisma generate && next build', { stdio: 'inherit' });
} catch (error) {
  // If build fails, try to create the manifest file and see if that helps
  console.error('Build failed, attempting to fix manifest file...');
  createManifestFile();
  
  // Re-throw the error so the build still fails if it's a different issue
  throw error;
}

