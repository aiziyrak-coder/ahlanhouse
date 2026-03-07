# Security Audit Report (Post-Compromise)

**Date:** 2026-02-28  
**Scope:** Full codebase scan after rootkit/crypto-miner compromise.

---

## 1. Malicious IPs and Port

**Checked:** Malicious IPs and ports (no references retained in codebase).  
**Result:** **No references found** in application source (frontend and backend). No suspicious binaries (e.g. x86_64, kok) found.

---

## 2. Package Versions (package.json)

**Issue:** Suspicious or fake version numbers (e.g. axios 1.8.4-style) can indicate supply-chain tampering.  
**Action taken:**
- **axios:** `^1.11.0` → **`^1.6.2`** (pinned to a well-known stable release).
- Replaced **`"latest"** tags with fixed versions: `@radix-ui/react-slot` ^1.1.0, `date-fns` ^3.6.0, `react-day-picker` ^8.10.0, `react-router-dom` ^6.28.0, `recharts` ^2.13.0.
- Other dependencies use standard semver ranges; no other obviously fake versions were found.

**Recommendation:** Run `npm audit` and `npm update` regularly; prefer exact or caret ranges from official npm.

---

## 3. Obfuscated / Suspicious Code

**Scanned for:** `eval()`, `Function()`, `atob`/`btoa` misuse, Base64 decode of executable strings.  
**Findings:**
- **app/payments/page.tsx:** `atob(token.split(".")[1])` — **legitimate** (JWT payload decode).
- **src/lib/utils.js:** `executedFunction` — **legitimate** (debounce helper, not eval).
- **Backend (ahlanApi):** No suspicious `eval`/`exec` in application code. Matches in `venv` are from third-party libraries (e.g. apscheduler, PIL, gunicorn) and are normal.

**Result:** No malicious obfuscation or code injection found in app code.

---

## 4. API Connection and “Loading…” Fix

**Issues:**
- API base URL was hardcoded as `http://api.ahlan.uz` in multiple files (insecure, and no env override).
- Frontend could get stuck on “Loading…” when there was no token or when the initial fetch failed (no `initialLoading`/`setDataLoading(false)` on error or missing token).

**Changes:**
- **Central config:** `app/lib/api.ts` exports `getApiBaseUrl()` (reads **`NEXT_PUBLIC_API_URL`**, default `https://api.ahlan.uz/api/v1`) and `getApiRoot()` (for media/file URLs at backend root).
- **All pages** use these helpers instead of hardcoded `http://api.ahlan.uz`: dashboard, login, clients, documents, properties, reports, settings, apartments, payments, qarzdorlar, expenses, suppliers; server.js and scripts use env.
- **Dashboard:** When no token, `setLoading(false)` before redirect; all fetch URLs use `getApiBaseUrl()` with HTTPS.
- **.env.example:** Added `NEXT_PUBLIC_API_URL=https://api.ahlan.uz/api/v1`. Copy to `.env` and use HTTPS in production.

---

## 5. Middleware and Layout (Request Interception)

**Checked:** Next.js middleware, root layout, and any code that intercepts or proxies network requests.  
**Result:** **No malicious middleware or layout logic.**  
- `app/layout.tsx` only renders `children` and metadata; no fetch interception or redirect to external IPs.  
- No custom middleware file found; no code found that rewrites or proxies requests to the specified IPs or port.

---

## Summary

| Check                         | Status   | Action |
|------------------------------|----------|--------|
| Malicious IPs/port           | Clean    | None   |
| Fake package versions        | Fixed    | axios → ^1.6.2 |
| Obfuscated/suspicious code   | Clean    | None   |
| API URL + Loading            | Fixed    | NEXT_PUBLIC_API_URL + getApiBaseUrl(); loading state fixes |
| Malicious middleware/layout  | Clean    | None   |

**Next steps:**  
1. Copy `.env.example` to `.env` and set `NEXT_PUBLIC_API_URL` for your environment (HTTPS).  
2. Regenerate secrets (Django `SECRET_KEY`, JWT signing key, DB passwords) after compromise.  
3. Reinstall dependencies: delete `node_modules` and `package-lock.json`, run `npm install`, then `npm audit`.  
4. Ensure backend is served over HTTPS and CORS only allows your frontend origin.
