#!/bin/bash

# Fix app icon by removing alpha channel
# App Store requires icons to be opaque (no transparency)

ICON_PATH="ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png"

if [ ! -f "$ICON_PATH" ]; then
    echo "❌ Icon file not found: $ICON_PATH"
    exit 1
fi

echo "🔧 Fixing app icon (removing alpha channel)..."

# Check if Python is available
if command -v python3 &> /dev/null; then
    python3 -c "
from PIL import Image
import sys

try:
    img = Image.open('$ICON_PATH')
    if img.mode == 'RGBA':
        # Create RGB image with black background
        rgb_img = Image.new('RGB', img.size, (0, 0, 0))
        rgb_img.paste(img, mask=img.split()[-1])
        rgb_img.save('$ICON_PATH', 'PNG')
        print('✅ Alpha channel removed successfully')
    else:
        print('✅ Icon already has no alpha channel')
except Exception as e:
    print(f'❌ Error: {e}')
    sys.exit(1)
"
else
    echo "❌ Python 3 is required but not found"
    echo "   Install Python 3 or use another image editor to remove transparency"
    exit 1
fi

# Verify the fix
echo ""
echo "📋 Verifying icon format..."
file "$ICON_PATH"


