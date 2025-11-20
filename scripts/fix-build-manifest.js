#!/usr/bin/env node

/**
 * Workaround script to fix Next.js 14 build trace error
 * Creates missing client-reference-manifest.js files after build
 */

const fs = require('fs');
const path = require('path');

const nextDir = path.join(process.cwd(), '.next');
const serverDir = path.join(nextDir, 'server');
const dashboardDir = path.join(serverDir, 'app', '(dashboard)');

function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function createEmptyManifest(filePath) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, 'module.exports={};', 'utf8');
  }
}

// Run after build - create missing manifest files
if (fs.existsSync(serverDir)) {
  ensureDirectoryExists(dashboardDir);
  const manifestPath = path.join(dashboardDir, 'page_client-reference-manifest.js');
  createEmptyManifest(manifestPath);
}

