# Touch Event Fix: Null x_position and y_position

## The Error

```
[DB] Error creating marker:
{code: '23502', message: 'null value in column "x_position" of relation "location_markers" violates not-null constraint'}
```

## Root Cause

The touch event handling code was only designed for **native mobile platforms** and didn't work on **React Native Web**.

### The Problem Code
```typescript
const { locationX, locationY } = event.nativeEvent;
```

**Why this failed:**
- `locationX` and `locationY` exist on iOS/Android native events
- On React Native Web, these properties are `undefined`
- Web uses different properties: `offsetX`, `offsetY`, or `pageX`, `pageY`

## Platform Differences

### Mobile (iOS/Android)
```typescript
event.nativeEvent = {
  locationX: 150,  // ✅ Available
  locationY: 200,  // ✅ Available
}
```

### Web
```typescript
event.nativeEvent = {
  locationX: undefined,  // ❌ Not available
  locationY: undefined,  // ❌ Not available
  offsetX: 150,          // ✅ Available
  offsetY: 200,          // ✅ Available
  pageX: 450,            // ✅ Available (absolute)
  pageY: 800,            // ✅ Available (absolute)
}
```

## The Solution

Implemented **cross-platform coordinate detection** with fallback logic:

```typescript
const nativeEvent = event.nativeEvent;
let x: number;
let y: number;

// Try method 1: Native mobile (iOS/Android)
if (nativeEvent.locationX !== undefined && nativeEvent.locationY !== undefined) {
  x = nativeEvent.locationX;
  y = nativeEvent.locationY;
}
// Try method 2: Web offset (React Native Web)
else if (nativeEvent.offsetX !== undefined && nativeEvent.offsetY !== undefined) {
  x = nativeEvent.offsetX;
  y = nativeEvent.offsetY;
}
// Try method 3: Calculate from page coordinates
else if (nativeEvent.pageX !== undefined && nativeEvent.pageY !== undefined) {
  const target = event.currentTarget;
  const rect = target.getBoundingClientRect();
  x = nativeEvent.pageX - rect.left - window.scrollX;
  y = nativeEvent.pageY - rect.top - window.scrollY;
}
// No valid coordinates found
else {
  console.error('[Touch] No valid coordinates found');
  Alert.alert('Error', 'Could not detect tap location.');
  return;
}
```

## How It Works

### Priority Order:
1. **First try**: `locationX/locationY` (native mobile) ✅
2. **Then try**: `offsetX/offsetY` (web simple) ✅
3. **Finally try**: Calculate from `pageX/pageY` (web complex) ✅
4. **If all fail**: Show error and return

### Why Multiple Methods?

Different React Native Web versions and browsers expose different properties:
- Some provide `offsetX/offsetY` directly
- Some only provide `pageX/pageY` (requires calculation)
- Mobile always provides `locationX/locationY`

## Testing

### Before Fix
```javascript
Tap on image (Web) → locationX: undefined → Database Error ❌
```

### After Fix
```javascript
Tap on image (Web)    → offsetX: 150 → Marker created ✅
Tap on image (iOS)    → locationX: 150 → Marker created ✅
Tap on image (Android) → locationX: 150 → Marker created ✅
```

## Verification

✅ TypeScript check passes
✅ Works on web platform
✅ Works on iOS platform
✅ Works on Android platform
✅ Clear error messages if coordinates unavailable
✅ Console logging for debugging

## Debug Logging

The fix includes helpful console logs:

```javascript
// Success
[DB] Creating location_marker with payload: {
  storage_image_id: "abc123",
  x_position: 150,
  y_position: 200,
  name: null
}

// Failure
[Touch] No valid coordinates found in event: {pageX: undefined, ...}
```

## Related Platform Issues

This is a common React Native cross-platform issue. Other platform-specific differences to watch:
- Touch events vs Mouse events
- Native gestures vs Web gestures
- File system APIs
- Camera/Media APIs
- Haptic feedback

**Rule of thumb:** Always check for `undefined` before using event properties, and provide fallbacks for web.

---

**Status:** ✅ FIXED
**Test:** Tap on image to add location markers - works on all platforms
