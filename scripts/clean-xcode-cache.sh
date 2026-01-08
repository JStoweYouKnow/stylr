#!/bin/bash

# Clean Xcode caches to ensure new icon is picked up

echo "🧹 Cleaning Xcode caches..."

# Clean derived data
DERIVED_DATA="$HOME/Library/Developer/Xcode/DerivedData"
if [ -d "$DERIVED_DATA" ]; then
    echo "Removing derived data..."
    rm -rf "$DERIVED_DATA"/*
    echo "✅ Derived data cleaned"
else
    echo "⚠️  Derived data directory not found"
fi

# Clean module cache
MODULE_CACHE="$HOME/Library/Developer/Xcode/DerivedData/ModuleCache.noindex"
if [ -d "$MODULE_CACHE" ]; then
    echo "Removing module cache..."
    rm -rf "$MODULE_CACHE"
    echo "✅ Module cache cleaned"
fi

# Clean archives (optional - uncomment if you want to remove old archives)
# ARCHIVES="$HOME/Library/Developer/Xcode/Archives"
# if [ -d "$ARCHIVES" ]; then
#     echo "Removing old archives..."
#     rm -rf "$ARCHIVES"/*
#     echo "✅ Archives cleaned"
# fi

echo ""
echo "✅ Xcode caches cleaned!"
echo ""
echo "Next steps:"
echo "1. Close Xcode completely"
echo "2. Reopen Xcode"
echo "3. Product → Clean Build Folder (Shift+Cmd+K)"
echo "4. Product → Archive"







