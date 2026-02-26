# Installation Guide for Security Enhancements

This guide walks you through setting up the optional security features added to the CPDC Inventory System.

## Quick Start (No Optional Features)

The system works out of the box without any optional features:

```bash
# Backend
cd backend
npm install
cp .env.example .env
# Edit .env and set required variables
npm run dev

# Frontend
cd frontend
npm install
cp .env.example .env
# Edit .env and set VITE_API_BASE_URL
npm run dev
```

## Optional Feature Setup

### 1. Sentry Error Monitoring

#### Why Use Sentry?
- Real-time error tracking
- Performance monitoring
- User session replay
- Stack traces and debugging info
- Alert notifications

#### Setup Steps

**Backend:**
```bash
cd backend
npm install @sentry/node @sentry/profiling-node
```

**Frontend:**
```bash
cd frontend
npm install @sentry/react
```

**Configuration:**
1. Sign up at https://sentry.io (free tier available)
2. Create two projects: one for Node.js (backend), one for React (frontend)
3. Copy the DSN for each project
4. Add to backend `.env`:
   ```
   SENTRY_DSN=https://...@sentry.io/...
   SENTRY_ENVIRONMENT=production
   SENTRY_TRACES_SAMPLE_RATE=0.1
   ```
5. Add to frontend `.env`:
   ```
   VITE_SENTRY_DSN=https://...@sentry.io/...
   VITE_SENTRY_ENVIRONMENT=production
   VITE_SENTRY_TRACES_SAMPLE_RATE=0.1
   ```

**Cost:** Free tier includes:
- 5,000 errors/month
- 10,000 performance units
- 50 replays/month

---

### 2. Email Notifications (Brevo)

#### Why Use Email?
- Email verification for new users
- Password reset functionality
- Account notifications

#### Setup Steps

1. Sign up at https://www.brevo.com (free tier: 300 emails/day)
2. Verify your sender email address
3. Get API key from: Dashboard → SMTP & API → API Keys
4. Add to backend `.env`:
   ```
   BREVO_API_KEY=your-api-key-here
   EMAIL_FROM_EMAIL=noreply@yourdomain.com
   EMAIL_FROM_NAME=CPDC Inventory
   ```

**No additional npm packages needed** - uses built-in `fetch`

**Cost:** Free tier includes:
- 300 emails/day
- Unlimited contacts
- Email templates

---

### 3. CAPTCHA Protection (Cloudflare Turnstile)

#### Why Use CAPTCHA?
- Prevent automated bot attacks
- Reduce spam registrations
- Protect login endpoints

#### Setup Steps

1. Sign up at https://dash.cloudflare.com
2. Go to Turnstile → Add Site
3. Add your domain (or use localhost for testing)
4. Copy the Site Key and Secret Key
5. Add to backend `.env`:
   ```
   TURNSTILE_SECRET_KEY=your-secret-key
   ```
6. Add to frontend `.env`:
   ```
   VITE_TURNSTILE_SITE_KEY=your-site-key
   ```

**No additional npm packages needed** - uses built-in `fetch`

**Cost:** Free unlimited use

---

## Feature Testing

### Test Without Optional Features
The system should work normally without any optional features:
- ✅ Login/logout works
- ✅ User management works
- ✅ CSRF protection active
- ✅ Account lockout active
- ✅ Database indexes created
- ⚠️ No email notifications
- ⚠️ No CAPTCHA on login
- ⚠️ No error tracking

### Test With Sentry
1. Configure SENTRY_DSN
2. Restart backend and frontend
3. Trigger an error
4. Check Sentry dashboard for error report

### Test With Brevo Email
1. Configure BREVO_API_KEY
2. Create a new user via admin panel
3. Check email inbox for verification email
4. Test "Forgot Password" flow

### Test With Turnstile
1. Configure TURNSTILE keys
2. Go to login page
3. See Turnstile widget appear
4. Login should require widget completion

---

## Environment Variables Summary

### Required (Backend)
```bash
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/cpdc-inventory
JWT_ACCESS_SECRET=<generate-random-32-char-string>
JWT_REFRESH_SECRET=<generate-random-32-char-string>
CLIENT_URL=http://localhost:5173
```

### Optional (Backend)
```bash
# Email
BREVO_API_KEY=
EMAIL_FROM_EMAIL=noreply@yourdomain.com
EMAIL_FROM_NAME=CPDC Inventory

# CAPTCHA
TURNSTILE_SECRET_KEY=

# Error Monitoring
SENTRY_DSN=
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
```

### Required (Frontend)
```bash
VITE_API_BASE_URL=http://localhost:5000/api
```

### Optional (Frontend)
```bash
# CAPTCHA
VITE_TURNSTILE_SITE_KEY=

# Error Monitoring
VITE_SENTRY_DSN=
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1
```

---

## Production Deployment Checklist

### Security
- [ ] Generate strong random JWT secrets (32+ characters)
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS
- [ ] Configure CORS with specific domain (CLIENT_URL)
- [ ] Set up Sentry error monitoring
- [ ] Enable Turnstile CAPTCHA
- [ ] Configure email service (Brevo)

### Performance
- [ ] Database indexes are created automatically
- [ ] MongoDB connection string uses production database
- [ ] Frontend built with `npm run build`
- [ ] Assets served through CDN (optional)

### Monitoring
- [ ] Sentry configured and receiving errors
- [ ] Email notifications working
- [ ] Audit logs being created
- [ ] Regular database backups scheduled

---

## Troubleshooting

### "CSRF token missing" errors
- Ensure frontend fetches token on initialization
- Check browser cookies are enabled
- Verify CORS credentials are set

### Sentry not tracking errors
- Check SENTRY_DSN is correct
- Verify npm packages installed
- Ensure errors occur after initialization
- Check Sentry rate limits not exceeded

### Email not sending
- Verify BREVO_API_KEY is valid
- Check sender email is verified in Brevo
- Review Brevo logs in dashboard
- Check daily limit (300 on free tier)

### Account lockout not working
- Check server time is accurate
- Verify User model has new fields
- Check MongoDB connection successful
- Review audit logs for LOGIN actions

---

## Cost Summary

**Free Tier Usage:**
- Sentry: 5,000 errors/month FREE
- Brevo: 300 emails/day FREE
- Turnstile: Unlimited FREE
- MongoDB Atlas: 512MB storage FREE
- Total: $0/month for small apps

**Paid Tiers (if needed):**
- Sentry Team: $26/month (50K errors)
- Brevo Starter: $25/month (20K emails)
- MongoDB Atlas: Starts at $9/month
- Turnstile: Always free

---

## Support Resources

- **Sentry Docs**: https://docs.sentry.io/
- **Brevo API Docs**: https://developers.brevo.com/
- **Turnstile Docs**: https://developers.cloudflare.com/turnstile/
- **MongoDB Atlas**: https://www.mongodb.com/docs/atlas/

---

## Next Steps

1. Set up required environment variables
2. Test the system locally
3. Choose which optional features to enable
4. Configure chosen services
5. Deploy to production
6. Monitor and maintain

For detailed technical documentation, see [SECURITY_ENHANCEMENTS.md](SECURITY_ENHANCEMENTS.md)
