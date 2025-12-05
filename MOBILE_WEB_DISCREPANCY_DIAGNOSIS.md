# Mobile/Web Experience Discrepancy - Diagnosis & Fixes

**Date**: November 2025
**Issue**: App appears drastically different between mobile and web experiences

---

## Root Causes Identified

### 1. **Layout Container Issue** (Critical)
**Problem**: Main content layout doesn't properly handle mobile sidebar overlay

**Location**: `app/(dashboard)/layout.tsx:35`
```tsx
<main className="flex-1 p-4 lg:p-6 pt-16 lg:pt-6 w-full">{children}</main>
```

**Issues**:
- On mobile: Sidebar is `position: fixed` (overlays content)
- Main content uses `flex-1` which expects sidebar to take space in flex container
- This creates layout confusion where content width doesn't match expectations
- The `flex` container on parent div doesn't work correctly with fixed positioning

**Impact**: Mobile viewport width miscalculated, content may be cut off or weird spacing

---

### 2. **PWA vs Browser Mode** (Critical)
**Problem**: Installed PWA behaves completely differently from browser

**Location**: `public/manifest.json`
```json
{
  "display": "standalone",
  "orientation": "portrait-primary"
}
```

**Differences**:
- **Browser mode**: Shows address bar, browser controls, tabs
- **PWA/Installed mode**: Fullscreen, no browser chrome, feels like native app
- **Viewport calculation**: Different available heights (browser has ~60-100px less due to address bar)

**Impact**:
- Layout shifts between modes
- Users see "different app" if they install it vs use in browser
- Viewport height calculations off (especially on iOS)

---

### 3. **iOS Status Bar Overlap** (High Priority)
**Problem**: Transparent status bar causes content overlap on iOS PWA

**Location**: `app/layout.tsx:20`
```tsx
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
```

**Issue**:
- `black-translucent` makes status bar overlay content
- No safe-area padding to account for notch/status bar
- Hamburger button at `top-4` may be hidden behind status bar on notched devices

**Impact**: Top ~44px of content hidden or overlapped on iPhone X+

---

### 4. **Mobile Sidebar Width Assumption** (Medium Priority)
**Problem**: Sidebar overlay doesn't account for safe zones

**Location**: `components/layout/Sidebar.tsx:66`
```tsx
className="fixed lg:static inset-y-0 left-0 z-40 w-60"
```

**Issues**:
- Fixed width `w-60` (240px) may be too wide on small devices (<375px)
- No consideration for safe areas (iPhone notch, Android gesture bar)
- Overlay blocks entire screen even though content is only 240px

**Impact**: On small devices (iPhone SE, small Androids), sidebar takes >64% of screen

---

### 5. **Content Padding Inconsistency** (Medium Priority)
**Problem**: Main content padding different mobile vs desktop

**Location**: `app/(dashboard)/layout.tsx:35`
```tsx
<main className="flex-1 p-4 lg:p-6 pt-16 lg:pt-6 w-full">
```

**Issues**:
- Mobile: 16px padding (p-4) + 64px top padding (pt-16)
- Desktop: 24px padding (lg:p-6) + 24px top (lg:pt-6)
- Mobile needs extra top padding to clear hamburger button
- Creates visual inconsistency in content spacing

**Impact**: Content feels cramped on mobile, spacious on desktop

---

### 6. **Touch Target Size Inconsistency** (Low Priority)
**Problem**: Some components still don't use Button component

**Example**: `components/closet/UploadButton.tsx:7`
```tsx
className="inline-flex items-center px-4 py-2 bg-black text-white..."
```

**Issue**:
- Uses hardcoded `py-2` instead of Button component
- No minimum height guarantee
- No loading state support

**Impact**: Inconsistent button sizes, some may be below 44px

---

## Expected User Experience Differences

### Browser (Desktop)
- Persistent sidebar visible (240px width)
- Content area: viewport width - 240px
- Standard padding: 24px
- Mouse hover states work

### Browser (Mobile)
- Hamburger menu in top-left
- Sidebar hidden by default (overlays when open)
- Content area: full viewport width
- Extra top padding to clear hamburger (64px)
- Touch interactions

### PWA/Installed (Mobile)
- **Fullscreen** - no address bar or browser controls
- May have status bar overlay issues on iOS
- Viewport height is taller (no browser chrome)
- Feels like native app
- Back button behavior different

---

## Fixes Required

### Fix 1: Correct Layout Container (Critical)
Change from flex-based layout to proper mobile-first responsive layout.

### Fix 2: Adjust PWA Status Bar (Critical for iOS)
Change to `black` or add safe-area-inset support.

### Fix 3: Add Safe Area Padding (High Priority)
Support iPhone notches and Android gesture areas.

### Fix 4: Standardize Button Components (Medium Priority)
Replace all hardcoded buttons with Button component.

### Fix 5: Add Viewport Meta Tag (Medium Priority)
Ensure proper viewport configuration for all modes.

---

## Testing Checklist

After fixes, test on:
- [ ] Desktop Chrome (normal browser)
- [ ] Desktop Safari (normal browser)
- [ ] Mobile Safari (browser mode)
- [ ] Mobile Safari (installed PWA)
- [ ] Mobile Chrome (browser mode)
- [ ] Mobile Chrome (installed PWA)
- [ ] iPhone SE (small screen)
- [ ] iPhone 14 Pro (notch)
- [ ] Android phone (gesture nav)

---

## Implementation Plan

1. Fix layout container flex issue
2. Adjust status bar style for iOS
3. Add safe-area-inset padding
4. Migrate remaining buttons to Button component
5. Add viewport debugging info
6. Test across all modes

---

**Next**: Implement fixes
