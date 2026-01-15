# Google Maps API Setup

## Issue: Location Autocomplete Not Working

If you see the error "RefererNotAllowedMapError" in the console, it means your Google Maps API key has HTTP referrer restrictions enabled.

## Solution

### Option 1: Remove HTTP Referrer Restrictions (Development Only)

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Select your API key
3. Under "Application restrictions", select "None"
4. Click "Save"

**⚠️ Warning:** This makes your API key unrestricted. Only use for development/testing.

### Option 2: Add Authorized Referrers (Recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Select your API key
3. Under "Application restrictions", select "HTTP referrers (web sites)"
4. Add these patterns to "Website restrictions":
   - `localhost:*/*`
   - `*.webcontainer.io/*`
   - `*.webcontainer-api.io/*`
   - Your production domain (e.g., `yourdomain.com/*`)
5. Click "Save"

### Option 3: Use IP Address Restrictions

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Select your API key
3. Under "Application restrictions", select "IP addresses"
4. Add your server's IP address
5. Click "Save"

## Environment Variable

Make sure your `.env` file has the Google Maps API key:

```
GOOGLE_MAPS_API_KEY=your_api_key_here
```

## Fallback Behavior

If the API key is restricted or unavailable, the location input will fall back to a plain text input where you can type the location manually.
