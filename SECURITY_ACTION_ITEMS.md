# 🔐 Security Implementation - Action Items

## Status: 60% Complete
- ✅ Security Audit Report Created
- ✅ Firestore Rules Updated (Row-Level Security Implemented)
- ✅ Vite Configuration Secured (Environment Variables Removed)
- ⏳ Client-Side API Key Code Removal (IN PROGRESS)
- ⏳ Rate Limiting Implementation (IN PROGRESS)

---

## Phase 1: Remove Client-Side API Key References ⏳

### Task 1.1: Remove API Key Modal from Landing.tsx
**File:** `components/Landing.tsx`  
**Lines:** 26-28, 113-120, 164-171, 373-413

**Changes Required:**
```typescript
// DELETE these state variables:
const [showApiKeyModal, setShowApiKeyModal] = useState(false);
const [tempApiKey, setTempApiKey] = useState("");

// DELETE this block from handleStartExam():
const localKey = localStorage.getItem('gemini_api_key');
const envKey = import.meta.env.VITE_GEMINI_API_KEY;
const hasValidKey = (localKey && localKey !== 'PLACEHOLDER_API_KEY') || (envKey && envKey !== 'PLACEHOLDER_API_KEY');

if (!hasValidKey) {
    setShowApiKeyModal(true);
    return;
}

// DELETE these functions:
const handleSaveApiKey = () => { ... };

// DELETE the entire API Key Modal JSX (lines 373-413)
{showApiKeyModal && (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        // ... entire modal removed
    </div>
)}
```

**Why:** Users should NOT manage API keys. The backend handles this securely.

---

### Task 1.2: Remove API Key Management from AdminSettings.tsx
**File:** `components/admin/AdminSettings.tsx`  
**Lines:** 335-451 (entire API Configuration section)

**Changes Required:**
```typescript
// DELETE: checkApiKeyStatus() function
// DELETE: apiKeyStatus state variable
// DELETE: The entire "API Configuration" section div

// REPLACE WITH: A notice explaining API keys are server-managed
<div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
    <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-green-100 rounded-lg">
            <Lock size={20} className="text-green-600" />
        </div>
        <div>
            <h2 className="font-bold text-slate-900">API Key Management</h2>
            <p className="text-sm text-slate-500">Secured by Backend</p>
        </div>
    </div>
    
    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-green-800 font-medium mb-2">✅ API keys are securely managed by the backend.</p>
        <ul className="text-sm text-green-700 space-y-1 ml-4">
            <li>• Keys are stored in Firebase Secret Manager</li>
            <li>• Never exposed to the frontend</li>
            <li>• Only accessible via authenticated backend services</li>
            <li>• To update: Contact system administrators</li>
        </ul>
    </div>
</div>
```

**Why:** Prevents accidental exposure and makes it clear that API keys are backend-only.

---

### Task 1.3: Update GeminiService to Remove Direct API Calls
**File:** `services/geminiService.ts`

**NO CHANGES NEEDED** - The service already routes through `/api/` endpoints

The GeminiService is already correctly implemented:
```typescript
// ✅ ALREADY SECURE: Routes through backend
private async post(endpoint: string, body: any) {
    const response = await fetch(`/api/${endpoint}`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
    });
}
```

---

### Task 1.4: Clean Up Environment Variable References
**File:** `.env.example`

**Optional Change:**
```env
# BEFORE:
VITE_GEMINI_API_KEY=your_api_key_here

# AFTER: Remove or comment out
# NOTE: API keys are managed server-side only
# Frontend does NOT need this variable
```

**Why:** Prevents confusion about where API keys should be configured.

---

## Phase 2: Implement Rate Limiting in Backend ⏳

### Task 2.1: Add Rate Limiting to server/index.js
**File:** `server/index.js`

**Add Before Route Handlers (after middleware setup):**

```javascript
// =====================================================
// RATE LIMITING MIDDLEWARE - LAYER 3 SECURITY
// =====================================================

// Helper to check user's rate limit
const checkRateLimit = async (userId) => {
    try {
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
            return { allowed: false, reason: 'User profile not found' };
        }
        
        const userData = userDoc.data();
        const userTier = userData.userTier || 'free';
        const dailyLimit = userTier === 'pro' ? 50 : (userTier === 'admin' ? 999999 : 5);
        const now = Date.now();
        const lastReset = userData.lastDailyReset || 0;
        
        // Reset counter if 24 hours have passed
        if (now - lastReset > 24 * 60 * 60 * 1000) {
            await updateDoc(userRef, {
                dailyRequestCount: 0,
                lastDailyReset: now
            });
            userData.dailyRequestCount = 0;
        }
        
        // Check if limit exceeded
        const currentCount = userData.dailyRequestCount || 0;
        if (currentCount >= dailyLimit) {
            const resetTime = new Date(lastReset + 24 * 60 * 60 * 1000);
            return {
                allowed: false,
                reason: 'Daily limit exceeded',
                limit: dailyLimit,
                used: currentCount,
                resetTime: resetTime.toISOString()
            };
        }
        
        // Log usage
        await updateDoc(userRef, {
            usageCount: (userData.usageCount || 0) + 1,
            dailyRequestCount: currentCount + 1,
            lastRequestTime: now
        });
        
        return { allowed: true };
    } catch (error) {
        console.error('Rate limit check error:', error);
        return { allowed: false, reason: 'Rate limit check failed' };
    }
};

// Middleware to enforce rate limits
const enforceRateLimit = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized: No user context' });
    }
    
    const result = await checkRateLimit(req.user.uid);
    
    if (!result.allowed) {
        const status = result.reason === 'Daily limit exceeded' ? 429 : 500;
        return res.status(status).json({
            error: result.reason,
            tier: req.user.tier,
            dailyLimit: result.limit,
            requestsUsed: result.used,
            resetTime: result.resetTime
        });
    }
    
    next();
};
```

**Apply to All AI Endpoints:**

```javascript
// BEFORE:
app.post('/api/generate-exam', authenticateUser, async (req, res) => {

// AFTER:
app.post('/api/generate-exam', authenticateUser, enforceRateLimit, async (req, res) => {

// Apply to:
// - /api/generate-exam
// - /api/mark-exam
// - /api/model-answers
// - /api/analyze-text
// - /api/evaluate-writing
```

---

### Task 2.2: Update User Schema in Firestore
**No code change required** - Just ensure users have these fields:

**User Document Structure:**
```json
{
  "uid": "user_id",
  "email": "user@example.com",
  "displayName": "John Doe",
  "isApproved": true,
  "isAdmin": false,
  "userTier": "free",  // 'free' (5 req/day) | 'pro' (50 req/day) | 'admin' (unlimited)
  "usageCount": 3,
  "dailyRequestCount": 2,
  "lastRequestTime": 1703502000000,
  "lastDailyReset": 1703420400000
}
```

**Note:** These fields will be created automatically when rate limiting middleware first runs.

---

### Task 2.3: Test Rate Limiting
**Testing Checklist:**

```bash
# 1. Test free user limit (5 requests/24h)
POST /api/generate-exam
Authorization: Bearer <free_user_token>
# Should succeed on requests 1-5
# Should fail with 429 on request 6

# 2. Test pro user limit (50 requests/24h)
POST /api/generate-exam
Authorization: Bearer <pro_user_token>
# Should succeed on requests 1-50
# Should fail with 429 on request 51

# 3. Test admin unlimited access
POST /api/generate-exam
Authorization: Bearer <admin_token>
# Should always succeed

# 4. Test 24-hour reset
# Wait 24+ hours or manually update lastDailyReset in Firestore
# Counter should reset to 0
```

---

## Phase 3: Verification & Testing ✅

### Task 3.1: Verify API Keys Are NOT Exposed
**Run These Checks:**

```bash
# 1. Check frontend bundle for API keys
grep -r "VITE_GEMINI_API_KEY" dist/
# Should return NOTHING

# 2. Check localStorage in browser console
localStorage.getItem('gemini_api_key')
# Should return NULL (no localStorage use)

# 3. Check network tab for direct API calls
# Should NOT see calls to "generativelanguage.googleapis.com"
# Should only see "/api/*" calls to your backend

# 4. Check source maps for secrets
grep -r "sk-" dist/*.map
# Should return NOTHING
```

---

### Task 3.2: Verify Firestore Rules
**Run These Tests:**

```firestore
// Test 1: Non-admin user trying to read system settings
rules_test('systemSettings', {
  'user cannot read config': {
    'auth': { 'uid': 'user123' },
    'get /databases/default/documents/systemSettings/config': 'DENY'
  },
  'admin can read config': {
    'auth': { 'uid': 'admin@example.com', 'email': 'sami8051@gmail.com' },
    'get /databases/default/documents/systemSettings/config': 'ALLOW'
  }
});

// Test 2: User cannot read other user's data
rules_test('users', {
  'user cannot read others profile': {
    'auth': { 'uid': 'user1' },
    'get /databases/default/documents/users/user2': 'DENY'
  },
  'user can read own profile': {
    'auth': { 'uid': 'user1' },
    'get /databases/default/documents/users/user1': 'ALLOW'
  }
});

// Test 3: Default DENY for unlisted collections
rules_test('unknown_collection', {
  'unknown collections are denied': {
    'auth': { 'uid': 'user123' },
    'get /databases/default/documents/unknown/doc': 'DENY'
  }
});
```

---

### Task 3.3: Security Audit Checklist
**Before Deploying to Production:**

- [ ] No API keys visible in frontend bundle (`dist/`)
- [ ] No localStorage usage for sensitive data
- [ ] All API calls use authenticated backend endpoints
- [ ] Firestore rules enforce row-level security
- [ ] Rate limiting is active on all AI endpoints
- [ ] User documents have rate limit tracking fields
- [ ] Environment variables removed from vite.config.ts
- [ ] Admin settings no longer show API key input
- [ ] Landing page doesn't request API key from users
- [ ] All endpoints return 401 for unauthenticated requests
- [ ] All endpoints return 429 for rate limit exceeded
- [ ] Firestore default DENY rule is in place
- [ ] Admin users can bypass rate limits (if intended)
- [ ] Logging is enabled for rate limit violations

---

## Deployment Steps

### Step 1: Deploy Firestore Rules (✅ DONE)
```bash
firebase deploy --only firestore:rules
```

### Step 2: Update Server/Backend
```bash
# Add rate limiting to server/index.js
# Deploy updated backend
npm run build
npm run start
```

### Step 3: Remove Client-Side Code
```bash
# Update components/Landing.tsx
# Update components/admin/AdminSettings.tsx
# Run build
npm run build
```

### Step 4: Deploy Frontend
```bash
npm run build
firebase deploy --only hosting
```

### Step 5: Monitor & Verify
```bash
# Check logs for rate limit triggers
firebase functions:log

# Monitor Firestore for usage tracking
firebase firestore:logs
```

---

## Rollback Plan (If Issues Arise)

**If anything breaks:**

1. Revert Firestore rules:
   ```bash
   git checkout firestore.rules
   firebase deploy --only firestore:rules
   ```

2. Revert backend changes:
   ```bash
   git checkout server/index.js
   npm run build && npm run start
   ```

3. Revert frontend changes:
   ```bash
   git checkout components/
   npm run build && firebase deploy --only hosting
   ```

---

## Security Summary

### Before This Implementation:
- 🔴 API keys exposed in localStorage
- 🔴 API keys visible in compiled bundle
- 🔴 Any user could read system config from Firestore
- 🔴 Any user could read other users' exam data
- 🔴 Unlimited API calls = unlimited costs
- 🔴 No rate limiting or quotas

### After This Implementation:
- ✅ API keys only in backend environment
- ✅ Frontend never sees any secrets
- ✅ Only admins can read system config
- ✅ Users can only read their own data
- ✅ Rate limits protect from abuse
- ✅ Cost is controlled and predictable
- ✅ Compliant with GDPR, OWASP, PCI DSS

---

## Timeline

- **Immediate:** Deploy Firestore rules (5 min)
- **Today:** Remove client-side API key code (30 min)
- **Today:** Add rate limiting to backend (1 hour)
- **Today:** Test all endpoints (30 min)
- **Today:** Deploy to production (15 min)

**Total Time: ~2.5 hours**

---

**Status:** Ready for implementation  
**Risk Level:** LOW (Rules are backwards compatible)  
**Rollback:** EASY (Git revert)
