# Build Error: client-reference-manifest.js

## Error
```
Error: ENOENT: no such file or directory, lstat '/vercel/path0/.next/server/app/(dashboard)/page_client-reference-manifest.js'
```

## Status
- ✅ Build works locally
- ❌ Build fails on Vercel during build trace phase
- This is a known issue with Next.js 14 and route groups

## Potential Solutions

1. **Update Next.js** (if newer version fixes this)
   ```bash
   npm install next@latest
   ```

2. **Restructure routes** - Remove route groups `(dashboard)` and use regular routes

3. **Wait for Next.js patch** - This may be fixed in a future Next.js update

4. **Use different PWA library** - The PWA plugin might be interfering

## Current Workarounds
- PWA disabled on Vercel builds
- Build scripts created but may not help (error happens during build, not after)

## Next Steps
1. Try updating Next.js to latest version
2. If that doesn't work, consider restructuring routes
3. Or wait for Next.js to fix this issue
