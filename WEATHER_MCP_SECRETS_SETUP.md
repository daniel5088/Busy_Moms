# Weather MCP Secrets Configuration

## Quick Reference

This document provides step-by-step instructions for configuring the required secrets for the Weather MCP integration.

## Required Secrets

| Secret Name | Description | Example Value |
|------------|-------------|---------------|
| `WEATHER_MCP_URL` | Your MCP server URL | `https://your-mcp-server.com` |
| `WEATHER_MCP_KEY` | API key for authenticating with MCP server | `sk_live_abc123...` |

## Setup Instructions

### Step 1: Access Supabase Dashboard

1. Go to your Supabase project at [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project

### Step 2: Navigate to Edge Functions Secrets

1. Click on **Edge Functions** in the left sidebar
2. Click on the **Secrets** tab at the top
3. You should see an interface to add new secrets

### Step 3: Add WEATHER_MCP_URL

1. Click **New Secret** or **Add Secret**
2. Enter the secret name: `WEATHER_MCP_URL`
3. Enter your MCP server URL (e.g., `https://your-mcp-server.com`)
4. Click **Save** or **Add**

### Step 4: Add WEATHER_MCP_KEY

1. Click **New Secret** or **Add Secret** again
2. Enter the secret name: `WEATHER_MCP_KEY`
3. Enter your API key (e.g., `your-api-key-here`)
4. Click **Save** or **Add**

### Step 5: Verify Configuration

After adding both secrets, you should see them listed in the secrets section:

```
✓ WEATHER_MCP_URL
✓ WEATHER_MCP_KEY
```

**Note:** The actual values will be hidden for security.

## Testing the Configuration

### Method 1: Check Edge Function Logs

1. Go to **Edge Functions** > **weather-mcp**
2. Click on the **Logs** tab
3. Make a weather request from your app
4. Check the logs for any errors related to missing secrets

### Method 2: Test from Your Application

1. Open your application
2. Navigate to the weather widget or dashboard
3. If configured correctly, weather data should load
4. If there are errors, check the browser console for details

## Common Issues

### "WEATHER_MCP_URL environment variable is not configured"

**Solution:** Ensure you've added the `WEATHER_MCP_URL` secret with the correct name (case-sensitive)

### "WEATHER_MCP_KEY environment variable is not configured"

**Solution:** Ensure you've added the `WEATHER_MCP_KEY` secret with the correct name (case-sensitive)

### "MCP server error: 401 Unauthorized"

**Possible Causes:**
- API key is incorrect
- API key has expired
- MCP server is not configured to accept this API key

**Solution:**
1. Verify your API key is correct
2. Check with your MCP server provider
3. Regenerate the API key if needed

### Weather data not loading

**Troubleshooting Steps:**
1. Check browser console for errors
2. Verify both secrets are set in Supabase
3. Check edge function logs for detailed error messages
4. Ensure your MCP server is running and accessible

## Security Best Practices

1. **Never commit secrets to version control**
   - Secrets should only exist in Supabase Dashboard
   - Do not add them to `.env` files that are tracked by git

2. **Rotate API keys regularly**
   - Update the `WEATHER_MCP_KEY` secret periodically
   - Use strong, unique API keys

3. **Use HTTPS for MCP server**
   - Always use `https://` in `WEATHER_MCP_URL`
   - Never send API keys over unencrypted connections

4. **Monitor usage**
   - Check edge function logs regularly
   - Set up alerts for unusual activity

## For Local Development

If you need to test locally with Supabase CLI:

1. Create a `.env.local` file in your `supabase/functions/weather-mcp/` directory
2. Add the secrets:
   ```
   WEATHER_MCP_URL=https://your-mcp-server.com
   WEATHER_MCP_KEY=your-api-key-here
   ```
3. **Do not commit this file** - add it to `.gitignore`

## Additional Resources

- [Supabase Edge Functions Secrets Documentation](https://supabase.com/docs/guides/functions/secrets)
- [Weather MCP Setup Guide](./WEATHER_MCP_SETUP.md)
- [Supabase Dashboard](https://supabase.com/dashboard)

## Support

If you continue to experience issues:
1. Check the main [WEATHER_MCP_SETUP.md](./WEATHER_MCP_SETUP.md) guide
2. Review edge function logs in Supabase Dashboard
3. Verify your MCP server is running and accessible
