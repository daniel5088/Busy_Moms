# Instacart Retailer Selection Limitation

## Overview

After investigating Instacart's Create Shopping List Page API, we discovered that **Instacart does not support pre-selecting a retailer** when creating a shopping list via their API.

## What This Means

1. **Retailer Selection UI**: The app allows you to select your preferred retailer (e.g., ALDI, Costco, etc.)
2. **API Limitation**: When items are sent to Instacart, the `retailerKey` parameter is not supported by the API
3. **User Experience**: When the Instacart cart opens, it will show a retailer dropdown - you must manually select your preferred retailer

## How It Works

### Current Flow:
1. You select items in the app
2. You choose your preferred retailer (e.g., ALDI)
3. Items are sent to Instacart
4. Instacart cart opens showing nearby retailers
5. **You must manually select your retailer from the dropdown** on the Instacart page

## Why This Happens

According to [Instacart's official documentation](https://docs.instacart.com/developer_platform_api/api/products/create_shopping_list_page/):

> When users click the generated link, "the page opens and the user can select a store."

The API provides these parameters:
- `title` (required)
- `line_items` (required) - products with names, quantities, units
- `image_url`, `link_type`, `expires_in`, `instructions` (optional)
- **NO `retailer_key` or `retailerKey` parameter exists**

## What We're Doing

1. **Keeping Retailer Preferences**: The app still saves your preferred retailers for your reference
2. **Clear Messaging**: The UI now displays a note explaining that you'll need to select the retailer on Instacart's website
3. **Console Logging**: Added debug logs to help track what's being sent
4. **Future Compatibility**: Code is structured to easily support retailer pre-selection if Instacart adds it in the future

## Regarding Missing Items

If you notice items missing from your Instacart cart:

1. **Check Console Logs**: Open browser DevTools (F12) and check the Console for debug messages showing:
   - What items are being sent
   - How many items are in the request
   - Any formatting or validation issues

2. **Common Causes**:
   - Items with invalid quantities or units may be filtered out
   - API might reject certain item formats
   - Network errors during transmission

3. **Debugging**: Look for these log messages:
   - `[SendToProviderModal] Sending to provider:` - Shows what items are being sent
   - `[InstacartShoppingService] sendToInstacart:` - Shows formatted items
   - Edge function logs in Supabase dashboard - Shows what MCP received

## Sources

- [Instacart MCP Tutorial](https://docs.instacart.com/developer_platform_api/guide/tutorials/mcp/)
- [Create Shopping List Page API](https://docs.instacart.com/developer_platform_api/api/products/create_shopping_list_page/)
- [Shopping List Concepts](https://docs.instacart.com/developer_platform_api/guide/concepts/shopping_list/)
