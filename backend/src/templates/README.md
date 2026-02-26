# Email Templates

Professional HTML email templates for CPDC Inventory System using Resend.

## Templates

### 1. **welcome-email.html**
Sent to new users when their account is created.

**Variables:**
- `{{NAME}}` - User's full name
- `{{TEMP_PASSWORD}}` - Temporary password (if provided)

**Use Case:** Admin creates a new user account
**Includes:** Welcome message, temporary password (optional), security notice, call-to-action

---

### 2. **verification-otp-email.html**
Sent to new users who need to verify their email before login.

**Variables:**
- `{{NAME}}` - User's full name
- `{{OTP}}` - 6-digit verification code
- `{{EXPIRY_HOURS}}` - Code validity duration in hours

**Use Case:** Admin-created account requires email verification
**Includes:** OTP display, expiry time, security warnings, next steps

---

### 3. **password-reset-otp-email.html**
Sent when users request a password reset via "Forgot Password".

**Variables:**
- `{{NAME}}` - User's full name
- `{{OTP}}` - 6-digit reset code
- `{{EXPIRY_MINUTES}}` - Code validity duration in minutes

**Use Case:** User forgot their password
**Includes:** Reset code, expiry time, step-by-step instructions, security alerts

---

### 4. **admin-password-reset-notification.html**
Sent to users when an administrator manually resets their password.

**Variables:**
- `{{NAME}}` - User's full name

**Use Case:** Admin force-resets a user's password
**Includes:** Admin action notification, instructions to set new password, security guidance

---

## Design Features

✨ **Professional & Responsive**
- Mobile-friendly design
- Readable on all devices
- Color-coded sections (blue, green, orange, purple)

🔒 **Security-Focused**
- Prominent security notices
- Clear warnings for sensitive operations
- Anti-phishing messaging

📧 **Branded**
- CPDC Inventory System branding
- Consistent styling across all emails
- Professional footer with copyright

---

## Customization

To customize templates:

1. Edit the HTML file in this directory
2. Keep the `{{VARIABLE}}` placeholders intact
3. Changes apply automatically on next email send
4. No code changes needed!

---

## Testing Templates

To test an email manually:

```bash
# In backend directory
node -e "
import { sendWelcomeEmail } from './src/services/email.service.js';
sendWelcomeEmail('your-email@example.com', 'John Doe', 'TempPass123!')
  .then(r => console.log('Sent:', r))
  .catch(e => console.error('Error:', e.message));
"
```

---

## Supported Email Clients

✅ Gmail
✅ Outlook  
✅ Apple Mail
✅ Thunderbird
✅ Mobile Clients (iOS Mail, Android)

---

## File Structure

```
backend/src/templates/
├── welcome-email.html
├── verification-otp-email.html
├── password-reset-otp-email.html
├── admin-password-reset-notification.html
└── README.md (this file)
```

---

## Notes

- All templates are pre-configured with Resend
- Variable replacement uses `{{VARIABLE}}` syntax
- Templates are loaded from the filesystem (no database needed)
- Each email is fully responsive and WCAG compliant