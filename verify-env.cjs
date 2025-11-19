#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('=== Environment Variable Verification ===\n');

const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

if (fs.existsSync(envPath)) {
  console.log('✓ .env file exists');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.trim().split('\n');

  const hasUrl = lines.some(line => line.startsWith('VITE_SUPABASE_URL=') && line.length > 20);
  const hasKey = lines.some(line => line.startsWith('VITE_SUPABASE_ANON_KEY=') && line.length > 30);

  if (hasUrl) {
    console.log('✓ VITE_SUPABASE_URL is set');
  } else {
    console.log('✗ VITE_SUPABASE_URL is missing or invalid');
  }

  if (hasKey) {
    console.log('✓ VITE_SUPABASE_ANON_KEY is set');
  } else {
    console.log('✗ VITE_SUPABASE_ANON_KEY is missing or invalid');
  }

  if (hasUrl && hasKey) {
    console.log('\n✓ Environment is properly configured!');
    console.log('\nNext steps:');
    console.log('1. Restart your dev server (Ctrl+C then npm run dev)');
    console.log('2. Refresh your browser');
  } else {
    console.log('\n✗ Environment configuration is incomplete');
    console.log('\nPlease copy values from .env.example and fill them in .env');
  }
} else {
  console.log('✗ .env file not found');
  console.log('\nPlease create a .env file:');
  console.log('1. Copy .env.example to .env');
  console.log('2. Fill in your Supabase credentials');
  console.log('3. Restart the dev server');
}

console.log('\n=====================================');
