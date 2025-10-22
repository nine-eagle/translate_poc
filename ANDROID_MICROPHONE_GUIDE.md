# Android Microphone Troubleshooting Guide

## Why Microphone May Not Work on Android

Web-based speech recognition on Android phones can fail for several reasons:

### 1. **Browser Compatibility** ⚠️

Not all Android browsers support the Web Speech API:

✅ **Supported Browsers:**
- **Chrome** (recommended)
- **Edge**
- **Samsung Internet** (newer versions)

❌ **NOT Supported:**
- Firefox
- Opera
- Most other browsers

### 2. **HTTPS Requirement** 🔒

- Microphone access requires HTTPS on mobile devices
- Your site MUST be accessed via: `https://aitranspoc.com` or `https://www.aitranspoc.com`
- HTTP (`http://`) will NOT work on Android

### 3. **Microphone Permissions** 🎤

Android requires explicit microphone permissions:

#### Grant Permissions in Chrome:
1. Visit `https://aitranspoc.com`
2. Tap the lock icon (🔒) in the address bar
3. Tap "Permissions" or "Site settings"
4. Find "Microphone" and set to "Allow"
5. Refresh the page

#### Reset Permissions if Blocked:
1. Open Chrome Settings
2. Go to "Site settings"
3. Tap "Microphone"
4. Find "aitranspoc.com" in blocked sites
5. Remove it from blocked list
6. Revisit the site and allow when prompted

### 4. **System Microphone Settings** 📱

Ensure Chrome has system-level microphone access:

1. Open Android **Settings**
2. Go to **Apps** or **Applications**
3. Find **Chrome**
4. Tap **Permissions**
5. Enable **Microphone**

## Step-by-Step Testing Guide

### Test 1: Check Browser
```
1. Open Chrome on Android
2. Visit: https://aitranspoc.com
3. Open browser console (if possible) to see errors
```

### Test 2: Test Microphone Permission
```
1. Tap the "Record" button
2. Browser should show permission prompt
3. Tap "Allow" when prompted
4. Try speaking
```

### Test 3: Verify HTTPS
```
1. Check address bar shows: https://aitranspoc.com
2. Look for the lock icon (🔒)
3. If you see "Not secure" - do NOT proceed
```

## Common Error Messages

### "Speech Recognition is not supported in this browser"
**Solution:** Use Chrome, Edge, or Samsung Internet browser

### "Microphone permission denied"
**Solution:** Grant microphone permission in browser and system settings

### "Microphone not found or not accessible"
**Solution:** 
- Check if another app is using the microphone
- Restart Chrome
- Restart your phone

### "Network error occurred"
**Solution:**
- Check internet connection
- Verify HTTPS connection is stable
- Try refreshing the page

## Alternative: File Upload Method

If microphone doesn't work, you can still use the application:

1. Record audio separately using your phone's voice recorder
2. Save as WAV format
3. Use the "Upload Audio" button
4. Select your recorded file

## Testing Microphone

Before using the application, test if your setup works:

### Quick Test Website:
Visit: `https://www.google.com` and try voice search
- If Google voice search works, your microphone setup is correct
- If it doesn't work, the issue is with your device/browser, not the application

## Recommended Setup for Best Experience

1. **Browser:** Chrome (latest version)
2. **Connection:** HTTPS (https://aitranspoc.com)
3. **Permissions:** Microphone allowed in browser AND system settings
4. **Network:** Stable internet connection (WiFi recommended)
5. **Quiet Environment:** Reduce background noise for better recognition

## Developer Debug Info

The application now logs browser information to the console:
- Check browser console for debug information
- Look for browser compatibility warnings
- Error messages will show specific issues

## Still Having Issues?

If microphone still doesn't work after following this guide:

1. **Try a different device** (to isolate if it's device-specific)
2. **Update Chrome** to the latest version
3. **Clear browser cache and cookies**
4. **Try incognito/private mode**
5. **Check if phone's microphone works** in other apps (Camera, Voice Recorder, etc.)

## Technical Details

The application uses the Web Speech API:
- Requires secure context (HTTPS)
- Requires user permission
- May require Google services on Android
- Works differently on iOS (uses Siri)

### Browser Requirements:
```javascript
// The API checks for:
window.SpeechRecognition || window.webkitSpeechRecognition
```

If this returns `undefined`, your browser doesn't support speech recognition.

## Contact Support

If you've tried everything and microphone still doesn't work:
- Provide browser name and version
- Provide Android version
- Share any error messages from the console
- Describe what happens when you tap "Record"
