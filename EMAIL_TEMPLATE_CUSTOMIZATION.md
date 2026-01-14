# Email Template Customization for Busy Moms Assistant AI

## Customizing the Password Reset OTP Email

Your app already uses OTP-based password reset. To customize the email template:

### Steps to Customize in Supabase Dashboard

1. **Go to Supabase Dashboard**
   - Navigate to your project at https://supabase.com/dashboard

2. **Access Email Templates**
   - Click on "Authentication" in the left sidebar
   - Click on "Email Templates"

3. **Edit the Magic Link Template**
   - Find the "Magic Link" template (this is what's used for OTP emails)
   - Click to edit it

4. **Customize the Email Content**

Replace the default template with this customized version for Busy Moms Assistant AI:

```html
<h2>Password Reset for Busy Moms Assistant AI</h2>

<p>Hello,</p>

<p>You requested to reset your password for Busy Moms Assistant AI.</p>

<p>Your 6-digit verification code is:</p>

<h1 style="font-size: 32px; letter-spacing: 8px; font-family: monospace; background: #f3f4f6; padding: 16px; text-align: center; border-radius: 8px;">
  {{ .Token }}
</h1>

<p>This code will expire in 60 minutes.</p>

<p><strong>Enter this code in the app to reset your password.</strong></p>

<p>If you didn't request this, please ignore this email. Your password will remain unchanged.</p>

<hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />

<p style="color: #6b7280; font-size: 14px;">
  Busy Moms Assistant AI - Making life easier for busy families
</p>
```

5. **Customize the Email Subject**

Change the subject line to:
```
Password Reset for Busy Moms Assistant AI
```

6. **Save the Template**
   - Click "Save" to apply your changes

### Email Variables Available

Supabase provides these variables you can use in your templates:
- `{{ .Token }}` - The OTP code
- `{{ .TokenHash }}` - Hashed token (not needed for OTP)
- `{{ .SiteURL }}` - Your site URL
- `{{ .Email }}` - User's email address

### Testing the Email

After saving:
1. Go to your app's sign-in page
2. Click "Forgot Password?"
3. Enter an email address
4. Check the inbox for the newly formatted email

### Additional Customization Options

You can also customize:
- **Confirmation Email** - For new user signups
- **Change Email Address** - When users update their email
- **Invite User** - For team invitations

## Current Implementation

Your app already:
- Sends a 6-digit OTP code to the user's email
- Allows users to enter the code and set a new password
- Validates the code before allowing password reset
- Provides clear error messages

The email template customization in Supabase will complete the branded experience!
