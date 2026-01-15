# Google Maps API Setup

## Location Autocomplete Feature

The location autocomplete feature uses Google Maps Places API to provide address suggestions as you type.

## How It Works

The API key is stored securely in **Supabase Secrets** (not in your .env file) and accessed through a Supabase Edge Function. This means:

- Your API key never gets exposed to the frontend
- No referrer restrictions needed on the Google Maps API key
- Works seamlessly across all environments

## Setup Instructions

### 1. Get a Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project or select an existing one
3. Enable the **Places API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Places API"
   - Click "Enable"
4. Create an API key:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy your new API key

### 2. Configure API Key Restrictions (Recommended)

Since the API key is used server-side through Supabase Edge Functions, you can:

**Option A: No Restrictions (Simplest)**
- Under "Application restrictions", select "None"
- This is safe because the key is never exposed to the frontend

**Option B: IP Restrictions (Most Secure)**
- Under "Application restrictions", select "IP addresses"
- Add Supabase's IP ranges (if available)
- This provides the most security

**Option C: API Restrictions (Recommended)**
- Under "API restrictions", select "Restrict key"
- Only allow "Places API"
- This limits what the key can be used for

### 3. Add API Key to Supabase Secrets

The API key is already configured in your Supabase project's secrets as `GOOGLE_MAPS_API_KEY`.

If you need to update it, contact your project administrator or update it through the Supabase dashboard.

## Testing

To test if the location autocomplete is working:

1. Go to the Calendar page
2. Click on any extracted event from a scanned image
3. Click the "Edit" button
4. Start typing in the "Location" field
5. You should see location suggestions appear as you type

If suggestions don't appear, check the browser console for any error messages.

## Troubleshooting

### No suggestions appearing

1. Check that the Places API is enabled in Google Cloud Console
2. Verify the API key is valid and has proper quota
3. Check browser console for errors
4. Verify the `google-places-autocomplete` edge function is deployed

### "API key not configured" error

The `GOOGLE_MAPS_API_KEY` secret needs to be set in your Supabase project. Contact your administrator.

### Rate limiting

Google Places API has usage limits. If you're hitting limits:
- Consider implementing request caching
- Increase the debounce delay (currently 300ms)
- Review your Google Cloud billing and quotas
