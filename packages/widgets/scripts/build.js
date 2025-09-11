#!/usr/bin/env node

/**
 * Build script for BizBox Widgets
 * 
 * This script builds the widget library for production use.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building BizBox Widgets...\n');

// Clean dist directory
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true });
  console.log('🧹 Cleaned dist directory');
}

try {
  // Run rollup build
  console.log('📦 Building with Rollup...');
  execSync('rollup -c', { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  console.log('✅ Build completed successfully!\n');
  
  // Show build output
  const files = fs.readdirSync(distDir);
  console.log('📁 Build output:');
  files.forEach(file => {
    const filePath = path.join(distDir, file);
    const stats = fs.statSync(filePath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    console.log(`  ${file} - ${sizeKB}KB`);
  });
  
  console.log('\n🎉 BizBox Widgets build complete!');
  console.log('📍 Files are ready in the dist/ directory');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}