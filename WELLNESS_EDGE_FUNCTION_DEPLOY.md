# Wellness Edge Function - DEPLOYED ✓

The Wellness feature edge function has been successfully deployed and tested!

## Deployment Steps

### Option 1: Deploy via Supabase CLI (Recommended)

1. Install Supabase CLI if you haven't:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref rtvwcyrksplhsgycyfzo
   ```

4. Deploy the edge function:
   ```bash
   supabase functions deploy cycle-tracker
   ```

### Option 2: Deploy via Supabase Dashboard

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/rtvwcyrksplhsgycyfzo/functions

2. Click "Deploy new function" or find the `cycle-tracker` function if it exists

3. Copy the entire contents of `supabase/functions/cycle-tracker/index.ts`

4. Paste it into the function editor

5. Click "Deploy"

### Option 3: Manual Verification

If the function is already deployed but not working, verify:

1. Check function logs: https://supabase.com/dashboard/project/rtvwcyrksplhsgycyfzo/logs/edge-functions

2. Test the function endpoint:
   ```bash
   curl -X POST https://rtvwcyrksplhsgycyfzo.supabase.co/functions/v1/cycle-tracker \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{"action":"ping"}'
   ```

3. Expected response:
   ```json
   {"ok": true, "source": "cycle-insights-agent"}
   ```

## Environment Variables

The edge function requires the following environment variable to be set in Supabase:

- `OPENAI_API_KEY` - Your OpenAI API key for AI-powered insights

To set this:
1. Go to: https://supabase.com/dashboard/project/rtvwcyrksplhsgycyfzo/settings/functions
2. Add secret: `OPENAI_API_KEY` = `your-openai-api-key`

## Troubleshooting

### "Failed to fetch" Error
- The edge function is not deployed or not accessible
- Check if the function exists in the Supabase dashboard
- Verify CORS headers are set correctly

### "OPENAI_API_KEY missing" Error
- The OpenAI API key environment variable is not set
- Add it in the Supabase dashboard settings

### 401/403 Errors
- Check that the user is authenticated
- Verify the Supabase anon key is correct in your `.env` file
