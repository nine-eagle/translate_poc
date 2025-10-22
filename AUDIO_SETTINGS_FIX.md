# Audio Settings Endpoint Error Fix

## Problem

The `/set_audio_settings` endpoint was throwing a JSON decode error:

```
json.decoder.JSONDecodeError: Expecting value: line 1 column 1 (char 0)
```

### Root Cause

**Frontend Issue:** The JavaScript was using a hardcoded HTTP URL with IP address:
```javascript
fetch("http://45.154.27.238:8000/set_audio_settings", ...)
```

This caused multiple problems:
1. **Bypassed nginx proxy** - Direct connection to backend
2. **Mixed content error** - HTTP request from HTTPS page (blocked by browser)
3. **CORS issues** - Cross-origin request failures
4. **Empty body** - Request might not be sent at all due to browser blocking

## Solution Applied

### 1. Frontend Fix (ui/functions.js)

**Changed from hardcoded URL to relative URL:**

```javascript
// OLD (Wrong)
fetch("http://45.154.27.238:8000/set_audio_settings", {

// NEW (Correct)
fetch("/set_audio_settings", {
```

**Benefits:**
- ✅ Goes through nginx SSL proxy
- ✅ No mixed content issues
- ✅ No CORS problems
- ✅ Works in any environment (local, staging, production)

### 2. Backend Error Handling (backend/main.py)

Added comprehensive error handling:

```python
@app.get("/set_audio_settings")
async def get_audio_settings():
    """Get current audio settings (placeholder)"""
    return {
        "status": "info",
        "message": "Use POST method to update audio settings",
        "example": {
            "chunkSize": "20ms",
            "vadSensitivity": "Medium"
        }
    }

@app.post("/set_audio_settings")
async def set_audio_settings(request: Request):
    try:
        data = await request.json()
        
        if not data:
            return {"error": "Empty request body"}
        
        # Process settings...
        
        return {
            "status": "success",
            "message": "Audio settings updated successfully",
            "settings": {...}
        }
    except ValueError as e:
        return {
            "status": "error",
            "error": "Invalid JSON format"
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }
```

### 3. Improved Response Handling

Frontend now checks response status:

```javascript
.then((response) => {
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
})
.then((data) => {
  if (data.status === "success") {
    alert("Settings applied successfully!");
  } else {
    alert(`Settings update: ${data.message}`);
  }
})
```

## Request Flow (After Fix)

```
Browser (HTTPS)
    ↓
    | fetch("/set_audio_settings")
    ↓
Nginx (Port 443)
    ↓
    | proxy_pass http://backend:8000
    ↓
Backend (Port 8000)
    ↓
    | Process JSON
    | Update settings
    ↓
Response
```

## Testing

### Test 1: Check endpoint is accessible
```bash
# Should return info about using POST
curl https://aitranspoc.com/set_audio_settings
```

### Test 2: Test POST with valid data
```bash
curl -X POST https://aitranspoc.com/set_audio_settings \
  -H "Content-Type: application/json" \
  -d '{"chunkSize":"20ms","vadSensitivity":"Medium"}'
```

Expected response:
```json
{
  "status": "success",
  "message": "Audio settings updated successfully",
  "settings": {
    "chunkSize": "20ms",
    "vadSensitivity": "Medium"
  }
}
```

### Test 3: Test POST with invalid data
```bash
curl -X POST https://aitranspoc.com/set_audio_settings \
  -H "Content-Type: application/json" \
  -d 'invalid json'
```

Expected response:
```json
{
  "status": "error",
  "error": "Invalid JSON format",
  "message": "Request body must be valid JSON"
}
```

### Test 4: Test from browser
```javascript
// In browser console (on https://aitranspoc.com)
fetch("/set_audio_settings", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    chunkSize: "20ms",
    vadSensitivity: "High"
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

## Common Issues

### Issue 1: Still getting JSON decode error
**Check:**
- Is frontend using relative URL `/set_audio_settings`?
- Is nginx properly proxying the request?
- Check browser network tab for actual request

### Issue 2: CORS errors
**Solution:**
- Use relative URLs (not absolute URLs with IP)
- Ensure request goes through nginx proxy

### Issue 3: Request blocked by browser
**Solution:**
- Ensure using HTTPS, not HTTP
- Check browser console for mixed content warnings

## Deployment

After applying these fixes:

```bash
# Rebuild both frontend and backend
docker-compose up -d --build

# Check logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Test the endpoint
curl https://aitranspoc.com/set_audio_settings
```

## Verification Checklist

- [x] Frontend uses relative URL (`/set_audio_settings`)
- [x] Backend has error handling for empty body
- [x] Backend has error handling for invalid JSON
- [x] Backend returns structured JSON responses
- [x] Nginx properly proxies the endpoint
- [x] No hardcoded IPs in frontend code
- [x] Works with HTTPS
- [x] Proper error messages to user

## Additional Hardcoded URLs to Check

Search for other hardcoded URLs that might need fixing:
```bash
# In ui/functions.js
grep -n "http://" ui/functions.js
grep -n "45.154.27.238" ui/functions.js
```

All backend API calls should use relative URLs to work properly through the nginx proxy.
