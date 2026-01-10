# Expo Go Setup Guide

This guide will help you set up the Busy Moms mobile app to run in Expo Go without any errors.

## Prerequisites

1. **Install Expo Go** on your mobile device:
   - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
   - [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. **Ensure both devices are on the same WiFi network** (computer and phone)

## Step-by-Step Setup

### 1. Pull Latest Changes

```bash
cd ~/project/BusyMoms-mobile
git pull origin claude/build-expo-mobile-wrapper-LPaIs
```

### 2. Install Dependencies

```bash
npm install --legacy-peer-deps
```

**Important:** Always use `--legacy-peer-deps` when installing due to React version conflicts.

### 3. Create .env File

Create a file named `.env` in the `BusyMoms-mobile` directory with these contents:

```bash
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://rtvwcyrkksplhsgycyfzo.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0dndjeXJrc3BsaHNneWN5ZnpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMzQ1NzQsImV4cCI6MjA3MDcxMDU3NH0.WBdetqnD9ynb61wwzWhREGbpD5IrrF_azUsTP5PifY8
```

**Quick command:**
```bash
cat > .env << 'EOF'
EXPO_PUBLIC_SUPABASE_URL=https://rtvwcyrkksplhsgycyfzo.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0dndjeXJrc3BsaHNneWN5ZnpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMzQ1NzQsImV4cCI6MjA3MDcxMDU3NH0.WBdetqnD9ynb61wwzWhREGbpD5IrrF_azUsTP5PifY8
EOF
```

### 4. Verify Configuration Files

**Verify app.json does NOT contain:**
- `"newArchEnabled": true`
- `"edgeToEdgeEnabled": true`
- `"predictiveBackGestureEnabled": false`

**Verify app.config.js does NOT contain:**
- `newArchEnabled: true`
- `edgeToEdgeEnabled: true`
- `predictiveBackGestureEnabled: false`

If these flags exist in your files, remove them manually or run:
```bash
git checkout app.json app.config.js
```

### 5. Start Expo

```bash
npm start
```

This will start the Expo development server and show a QR code.

### 6. Scan QR Code

- **iOS**: Open Camera app → Point at QR code → Tap notification
- **Android**: Open Expo Go app → Tap "Scan QR Code"

## Troubleshooting

### Error: "java.lang.String cannot be cast to java.lang.Boolean"

**Cause:** Your local `app.json` or `app.config.js` files contain incompatible flags.

**Solution:**
```bash
# Reset config files to correct versions
git checkout app.json app.config.js

# Clear Expo cache and restart
npm start -- --clear
```

### Error: "Missing Supabase environment variables"

**Cause:** The `.env` file is missing or has incorrect credentials.

**Solution:**
1. Verify `.env` file exists in `BusyMoms-mobile/` directory
2. Check it contains the correct `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
3. Restart Expo server (Ctrl+C then `npm start`)

### Error: "Unable to resolve module react-native-svg"

**Cause:** Missing dependency.

**Solution:**
```bash
npm install --legacy-peer-deps react-native-svg
npm start
```

### Error: "expo: command not found"

**Cause:** The npm scripts should use `npx expo`, not just `expo`.

**Solution:**
```bash
# Verify package.json has correct scripts
git pull origin claude/build-expo-mobile-wrapper-LPaIs

# Or run directly with npx
npx expo start
```

### Can't Connect / QR Code Not Working

**Solutions:**
1. Ensure both devices are on the same WiFi network
2. Try pressing `s` in the terminal to switch connection types
3. Use tunnel mode: `npm start -- --tunnel` (slower but works across networks)

### Build Errors After npm install

**Solution:**
Always use the `--legacy-peer-deps` flag:
```bash
npm install --legacy-peer-deps
```

## Quick Reset

If you encounter multiple issues, do a complete reset:

```bash
# 1. Pull latest code
git pull origin claude/build-expo-mobile-wrapper-LPaIs

# 2. Remove node_modules and package-lock
rm -rf node_modules package-lock.json

# 3. Reinstall
npm install --legacy-peer-deps

# 4. Verify .env exists with correct credentials
cat .env

# 5. Start fresh
npm start -- --clear
```

## Warnings vs Errors

**These warnings are safe to ignore:**
- `Route "./xyz.tsx" is missing the required default export` - These files DO have default exports, it's a false warning
- `[Layout children]: No route named "index"` - This is expected, index redirects to tabs/auth

**These are real errors that need fixing:**
- `java.lang.String cannot be cast to java.lang.Boolean` - Config file issue
- `Missing Supabase environment variables` - Missing .env file
- `Unable to resolve module` - Missing dependency

## Success Checklist

✅ Dependencies installed with `npm install --legacy-peer-deps`
✅ `.env` file exists with correct Supabase credentials
✅ `app.json` has no `newArchEnabled` or experimental Android flags
✅ `app.config.js` has no `newArchEnabled` or experimental Android flags
✅ Expo server running without errors
✅ App loads in Expo Go

## Support

If you're still having issues after following this guide, check:
1. You're on the correct branch: `claude/build-expo-mobile-wrapper-LPaIs`
2. All files are up to date: `git status` should show "Your branch is up to date"
3. Node version is compatible (Node 18+ recommended)
