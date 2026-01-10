# Busy Moms Mobile App

React Native mobile app for Busy Moms, built with Expo and TypeScript.

## Features

- 📱 **Dashboard**: View today's schedule, tasks, and reminders
- 📅 **Calendar**: Manage events and appointments
- 🛒 **Shopping**: Create and manage shopping lists
- 👨‍👩‍👧‍👦 **Family**: Track family members and their details
- ⚙️ **Settings**: Manage account and preferences

## Tech Stack

- **Expo SDK 54** - React Native framework
- **expo-router** - File-based navigation
- **Supabase** - Backend and authentication
- **TypeScript** - Type safety
- **lucide-react-native** - Icons

## Setup

1. Install dependencies:
   ```bash
   cd BusyMoms-mobile
   npm install --legacy-peer-deps
   ```

2. Create a `.env` file with your Supabase credentials:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Run on your device:
   - **iOS**: Press `i` or scan QR code with Camera app
   - **Android**: Press `a` or scan QR code with Expo Go app
   - **Web**: Press `w`

## Running with Expo Go

Expo Go is the easiest way to test your mobile app without building native binaries.

### Prerequisites

1. Install Expo Go on your mobile device:
   - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
   - [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. Ensure your computer and mobile device are on the same WiFi network

### Steps

1. Navigate to the mobile app directory:
   ```bash
   cd BusyMoms-mobile
   ```

2. Start the Expo development server:
   ```bash
   npm start
   ```

3. You'll see a QR code in your terminal

4. Scan the QR code:
   - **iOS**: Open the Camera app and point it at the QR code. A notification will appear to open in Expo Go
   - **Android**: Open the Expo Go app and tap "Scan QR Code"

5. The app will load on your device!

### Troubleshooting

- **Can't connect?** Make sure both devices are on the same WiFi network
- **QR code not working?** Try pressing `s` in the terminal to switch connection types
- **Build errors?** Run `npm install --legacy-peer-deps` again
- **Supabase errors?** Check your `.env` file has correct credentials

### Tunnel Mode (for different networks)

If your computer and phone are on different networks, use tunnel mode:

```bash
npm start -- --tunnel
```

This creates a public URL but may be slower.

## Project Structure

```
BusyMoms-mobile/
├── app/                    # App screens (expo-router)
│   ├── (auth)/            # Authentication screens
│   ├── (tabs)/            # Main tab screens
│   ├── _layout.tsx        # Root layout
│   └── index.tsx          # Entry point
├── components/            # Reusable components
├── hooks/                 # Custom React hooks
├── lib/                   # Libraries (Supabase client)
├── utils/                 # Utility functions
└── constants/             # App constants
```

## Key Conversions from Web App

### HTML → React Native Components
- `div` → `View`
- `p`, `span`, `h1-h6` → `Text`
- `button` → `Pressable`
- `input` → `TextInput`
- `img` → `Image`

### Styling
- All styles converted to `StyleSheet.create()`
- Flexbox is default (no need for `display: flex`)
- Numbers without units (e.g., `padding: 16` not `16px`)
- Pressable for touch interactions with `pressed` state

### Navigation
- File-based routing with expo-router
- Tabs for main navigation
- Stack navigation for screens

## Testing

Test the app using Expo Go:

```bash
npm start
```

Then scan the QR code with:
- iOS: Camera app
- Android: Expo Go app

## Building

For production builds:

```bash
# iOS
npm run ios

# Android
npm run android
```

## Environment Variables

Configure in `app.config.js`:
- `EXPO_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key

## Authentication

The app uses Supabase authentication with email/password:
- Sign up flow with email verification
- Sign in with existing account
- Secure session management with AsyncStorage

## Database

All data is synced with Supabase:
- Events (calendar)
- Shopping lists
- Family members
- Reminders
- User profiles

## License

Private - All rights reserved
