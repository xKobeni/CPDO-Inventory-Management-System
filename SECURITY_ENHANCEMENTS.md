# Security Enhancements Documentation

This document describes the security and stability features added to the CPDC Inventory System.

## 1. Account Lockout Protection

Protects against brute force login attacks by temporarily locking accounts after multiple failed login attempts.

### How It Works
- Users have **5 login attempts** before their account is locked
- Locked accounts are automatically unlocked after **15 minutes**
- Users receive clear feedback about remaining attempts
- Last login timestamp is tracked for audit purposes

### Database Changes
New fields added to User model:
- `loginAttempts` (Number) - Tracks failed login count
- `lockUntil` (Date) - Timestamp when lockout expires
- `lastLoginAt` (Date) - Last successful login timestamp

### User Experience
- After 3 failed attempts: "Invalid credentials. 2 attempt(s) remaining before account lockout."
- On lockout: "Account is temporarily locked due to multiple failed login attempts. Please try again in X minute(s)."
- On successful login: Attempts are reset automatically

### Admin Actions
Admins can manually unlock accounts by:
- Resetting the user's password
- Deactivating and reactivating the account

---

## 2. CSRF Protection

Protects against Cross-Site Request Forgery attacks using the double-submit cookie pattern.

### How It Works
1. Client requests CSRF token from `/api/csrf-token`
2. Server generates token and sends it:
   - As an httpOnly cookie (can't be read by JavaScript)
   - In the response body (client stores this)
3. Client includes token in `X-CSRF-Token` header for all state-changing requests
4. Server validates that header token matches cookie token

### Implementation Details
- **Backend**: Custom middleware in `middleware/csrf.js`
- **Frontend**: Automatic token handling in `lib/http.js`
- **Safe Methods**: GET, HEAD, OPTIONS requests don't require CSRF token
- **Protected Routes**: POST, PUT, DELETE requests require valid token

### Protected Endpoints
- `/api/auth/*` - Authentication endpoints
- `/api/users/*` - User management
- `/api/items/*` - Inventory management
- `/api/transactions/*` - Transaction management
- `/api/people/*` - People management
- `/api/import/*` - Data import

### Error Responses
- `403 CSRF_TOKEN_MISSING` - Token not provided
- `403 CSRF_TOKEN_INVALID` - Token mismatch (frontend auto-retries)

---

## 3. Database Indexes

Optimized database performance by adding strategic indexes on frequently queried fields.

### User Model Indexes
```javascript
email: 1              // Login, user lookup
role: 1               // Role-based queries
isActive: 1           // Filter active users
isVerified: 1         // Verification status
createdAt: -1         // Sort by creation date
```

### Item Model Indexes
```javascript
itemType: 1           // Filter supplies vs assets
category: 1           // Category filtering
isArchived: 1         // Filter archived items
status: 1             // Status filtering
condition: 1          // Condition filtering
propertyNumber: 1     // Asset lookup (sparse)
serialNumber: 1       // Serial lookup (sparse)
name: "text"          // Text search
quantityOnHand: 1     // Low stock queries
```

### Transaction Model Indexes
```javascript
type: 1               // Transaction type filtering
createdBy: 1          // User's transactions
createdAt: -1         // Sort by date
"items.itemId": 1     // Item transaction history
```

### AuditLog Model Indexes
```javascript
actorId: 1, createdAt: -1     // User's audit trail
action: 1, createdAt: -1      // Action-based queries
targetType: 1, targetId: 1    // Target lookups
createdAt: -1                 // Chronological queries
```

### Person Model Indexes
```javascript
name: 1               // Name lookup (unique)
office: 1, isActive: 1 // Office filtering
name: "text"          // Text search
```

### Performance Impact
- Faster query execution on large datasets
- Improved pagination performance
- Better search responsiveness
- Reduced database load

---

## 4. Environment Variable Validation

Validates all required configuration on startup to fail fast and provide clear error messages.

### Required Variables
Startup will fail if these are missing:
- `NODE_ENV` - Environment (development, production, test)
- `PORT` - Server port
- `MONGO_URI` - MongoDB connection string
- `JWT_ACCESS_SECRET` - Access token secret (min 32 chars recommended)
- `JWT_REFRESH_SECRET` - Refresh token secret (min 32 chars recommended)
- `CLIENT_URL` - Frontend URL for CORS

### Optional Variables (with warnings)
- `BREVO_API_KEY` - Email service (warns if missing)
- `TURNSTILE_SECRET_KEY` - CAPTCHA protection (warns if missing)
- `SENTRY_DSN` - Error monitoring (optional)
- `ACCESS_TOKEN_EXPIRES_IN` - Token expiry (default: 15m)
- `REFRESH_TOKEN_EXPIRES_IN` - Token expiry (default: 7d)

### Validation Features
- Startup validation before database connection
- JWT secret strength validation
- Clear error messages for missing variables
- Warning messages for optional features
- Configuration summary on startup

### Startup Output Example
```
🔍 Validating environment variables...
✅ Environment validation passed

🚀 API running on http://localhost:5000
   Environment: production
   Email: Enabled
   Turnstile: Disabled
```

---

## 5. Comprehensive Error Monitoring

Integrated Sentry for real-time error tracking and performance monitoring.

### Setup Instructions

#### Backend
1. Install Sentry SDK:
   ```bash
   cd backend
   npm install @sentry/node @sentry/profiling-node
   ```

2. Add to `.env`:
   ```
   SENTRY_DSN=your_backend_dsn_here
   SENTRY_ENVIRONMENT=production
   SENTRY_TRACES_SAMPLE_RATE=0.1
   ```

#### Frontend
1. Install Sentry SDK:
   ```bash
   cd frontend
   npm install @sentry/react
   ```

2. Add to `.env`:
   ```
   VITE_SENTRY_DSN=your_frontend_dsn_here
   VITE_SENTRY_ENVIRONMENT=production
   VITE_SENTRY_TRACES_SAMPLE_RATE=0.1
   ```

### Features
- **Error Tracking**: Automatic capture of unhandled exceptions
- **Performance Monitoring**: Track API response times and slow queries
- **Session Replay**: Reproduce user sessions that encountered errors (frontend)
- **User Context**: Errors tagged with user info for faster debugging
- **Sensitive Data Filtering**: Passwords, tokens, and OTPs are automatically removed

### What Gets Tracked
- Unhandled exceptions in backend and frontend
- API errors and failed requests
- Database connection issues
- Authentication failures
- Performance bottlenecks

### Privacy Features
Sensitive data is automatically filtered:
- Passwords and password hashes
- OTP codes
- JWT tokens
- Cookie values
- Authorization headers

### Manual Error Capture
```javascript
// Backend
import { captureException, captureMessage } from "./config/sentry.js"

try {
  // some operation
} catch (error) {
  captureException(error, { userId: user.id })
}

// Frontend
import { captureException } from "@/lib/sentry"

captureException(new Error("Something went wrong"), {
  context: "User action"
})
```

### Graceful Degradation
- System works normally if Sentry is not configured
- No errors if Sentry packages are not installed
- Clear console messages about Sentry status

---

## Environment Variables Reference

### Backend (.env)

```bash
# Required
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb://localhost:27017/cpdc_inventory
JWT_ACCESS_SECRET=your-super-secret-access-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
CLIENT_URL=http://localhost:5173

# Token Expiry (Optional)
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Email (Optional - Brevo/Sendinblue)
BREVO_API_KEY=your-brevo-api-key
EMAIL_FROM_EMAIL=noreply@example.com
EMAIL_FROM_NAME=CPDC Inventory

# CAPTCHA (Optional - Cloudflare Turnstile)
TURNSTILE_SECRET_KEY=your-turnstile-secret

# Error Monitoring (Optional - Sentry)
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1

# Admin Seed
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=SecurePassword123
SEED_ADMIN_NAME=System Admin
```

### Frontend (.env)

```bash
# Required
VITE_API_BASE_URL=http://localhost:5000/api

# Error Monitoring (Optional - Sentry)
VITE_SENTRY_DSN=https://...@sentry.io/...
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1
```

---

## Security Best Practices

### Production Checklist
- [ ] Generate strong JWT secrets (32+ characters, random)
- [ ] Enable HTTPS in production
- [ ] Set `NODE_ENV=production`
- [ ] Configure CORS with specific origin (not wildcard)
- [ ] Enable Turnstile CAPTCHA for login pages
- [ ] Set up Sentry error monitoring
- [ ] Configure email service for notifications
- [ ] Regularly backup database
- [ ] Monitor audit logs for suspicious activity
- [ ] Keep dependencies up to date
- [ ] Use environment-specific secrets

### Password Requirements
Current: Minimum 8 characters

Recommended additions:
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Rate Limiting
Current rate limits (via `authLimiter`):
- Check `middleware/rateLimit.js` for current configuration
- Consider per-IP and per-user rate limiting

### Monitoring Recommendations
1. **Set up alerts** for:
   - Multiple failed login attempts
   - Unusual authentication patterns
   - Database connection failures
   - High error rates

2. **Review regularly**:
   - Audit logs
   - Locked accounts
   - Sentry error reports
   - Performance metrics

---

## Testing the Enhancements

### Test Account Lockout
1. Attempt login with wrong password 5 times
2. Verify account is locked with appropriate message
3. Wait 15 minutes or reset password
4. Verify account is unlocked

### Test CSRF Protection
1. Try making POST request without CSRF token
2. Verify 403 CSRF_TOKEN_MISSING response
3. Make request with invalid token
4. Verify 403 CSRF_TOKEN_INVALID response

### Test Error Monitoring
1. Configure Sentry DSN
2. Trigger an error in the application
3. Check Sentry dashboard for error report
4. Verify sensitive data is filtered

### Test Environment Validation
1. Remove a required env variable
2. Start server
3. Verify it fails with clear error message
4. Restore variable and verify startup succeeds

---

## Troubleshooting

### Account Lockout Issues
**Problem**: Users locked out permanently
**Solution**: Check server clock synchronization. Lockout uses Date.now()

**Problem**: Too many false lockouts
**Solution**: Adjust MAX_LOGIN_ATTEMPTS in User model (currently 5)

### CSRF Token Issues
**Problem**: All requests failing with CSRF error
**Solution**: Clear browser cookies and refresh. Token should auto-refresh

**Problem**: CSRF token not being sent
**Solution**: Verify withCredentials: true in axios config

### Sentry Not Working
**Problem**: Errors not appearing in Sentry
**Solution**: 
- Verify SENTRY_DSN is correct
- Check Sentry rate limits
- Ensure error occurs after Sentry initialization

### Database Index Issues
**Problem**: Queries still slow after indexes
**Solution**: 
- Run `db.collection.getIndexes()` to verify indexes created
- Check query patterns match index structure
- Consider compound indexes for complex queries

---

## Migration Notes

### Existing Users
- All existing users will have `loginAttempts: 0` and `lockUntil: null`
- No action required - fields are automatically added with defaults

### Database Indexes
- Indexes are created automatically on server start
- For large collections, consider creating indexes manually during maintenance window
- Monitor index creation progress: `db.currentOp()`

### CSRF Token
- Frontend will fetch token on first load
- Existing sessions will receive token automatically
- No user action required

---

## Support

For issues or questions about these security enhancements:
1. Check error logs in console/Sentry
2. Review audit logs for security events
3. Verify environment variables are correctly set
4. Check that all dependencies are installed

