# Outfit Visualization Setup Guide

How to show users what they'd look like wearing their created outfits.

---

## Overview

This guide covers 3 approaches to outfit visualization:

1. **AI Image Generation** (Cloud-based - Recommended)
2. **Virtual Try-On APIs** (Most realistic)
3. **Simple Image Compositing** (Fastest, on-device)

---

## Option 1: AI Image Generation (Gemini + Stable Diffusion)

### What You Get:
- Realistic fashion model wearing the outfit
- Professional photography quality
- Fully customizable to user preferences

### Implementation:

#### Step 1: Install Dependencies

```bash
npm install replicate
# Or for Stable Diffusion XL
npm install @stability-ai/sdk
```

#### Step 2: Get API Keys

**Option A: Replicate (Easiest)**
1. Sign up at [replicate.com](https://replicate.com)
2. Get API token from [account settings](https://replicate.com/account/api-tokens)
3. Add to `.env`:
```bash
REPLICATE_API_TOKEN="r8_..."
```

**Option B: Stability AI (Best Quality)**
1. Sign up at [stability.ai](https://platform.stability.ai/)
2. Get API key
3. Add to `.env`:
```bash
STABILITY_API_KEY="sk-..."
```

#### Step 3: Create Image Generation Route

```typescript
// app/api/outfits/generate-image/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import { generateOutfitVisualizationPrompt } from '@/lib/ai/outfit-visualization';

export async function POST(req: NextRequest) {
  const { itemIds, userPreferences } = await req.json();

  // 1. Generate prompt using Gemini
  const prompt = await generateOutfitVisualizationPrompt(items, userPreferences);

  // 2. Generate image using Stable Diffusion
  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
  });

  const output = await replicate.run(
    "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
    {
      input: {
        prompt: prompt,
        negative_prompt: "ugly, distorted, low quality, blurry, deformed",
        width: 768,
        height: 1024,
        num_inference_steps: 50,
        guidance_scale: 7.5,
      }
    }
  );

  return NextResponse.json({ imageUrl: output[0] });
}
```

#### Step 4: Add to Frontend

```tsx
// In your outfit creation page
const [visualizationUrl, setVisualizationUrl] = useState<string | null>(null);
const [generating, setGenerating] = useState(false);

const handleVisualize = async () => {
  setGenerating(true);

  const response = await fetch('/api/outfits/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      itemIds: selectedItems.map(i => i.id),
      userPreferences: {
        bodyType: 'average',
        skinTone: 'medium',
        style: 'modern casual'
      }
    })
  });

  const data = await response.json();
  setVisualizationUrl(data.imageUrl);
  setGenerating(false);
};

// Render:
<button onClick={handleVisualize} disabled={generating}>
  {generating ? 'Generating...' : 'See How It Looks'}
</button>

{visualizationUrl && (
  <img src={visualizationUrl} alt="Outfit visualization" />
)}
```

**Cost**: ~$0.002-0.01 per image

---

## Option 2: Virtual Try-On APIs (Most Realistic)

### Recommended Services:

#### **A. Fashable.ai**
- Most realistic virtual try-on
- API available
- Pricing: $0.10-0.50 per try-on

```bash
npm install axios
```

```typescript
// lib/ai/virtual-tryon.ts
import axios from 'axios';

export async function generateVirtualTryOn(
  modelImageUrl: string, // User's photo
  garmentImageUrl: string // Clothing item image
): Promise<string> {
  const response = await axios.post('https://api.fashable.ai/v1/tryon', {
    model_image: modelImageUrl,
    garment_image: garmentImageUrl,
  }, {
    headers: {
      'Authorization': `Bearer ${process.env.FASHABLE_API_KEY}`,
    }
  });

  return response.data.result_url;
}
```

#### **B. Virtuo (Open Source Alternative)**

Use the open-source model locally:

```bash
# Clone the repository
git clone https://github.com/levihsu/OOTDiffusion
cd OOTDiffusion

# Install dependencies
pip install -r requirements.txt

# Download model weights
python download_models.py
```

Then create a Python API wrapper:

```python
# python_api/tryon_server.py
from flask import Flask, request, jsonify
from ootd import VirtualTryOn

app = Flask(__name__)
model = VirtualTryOn()

@app.route('/tryon', methods=['POST'])
def try_on():
    person_img = request.files['person']
    garment_img = request.files['garment']

    result = model.generate(person_img, garment_img)

    return jsonify({'result_url': result})

if __name__ == '__main__':
    app.run(port=5000)
```

Call from Node.js:

```typescript
const formData = new FormData();
formData.append('person', userPhoto);
formData.append('garment', clothingImage);

const response = await fetch('http://localhost:5000/tryon', {
  method: 'POST',
  body: formData,
});

const { result_url } = await response.json();
```

---

## Option 3: Simple Image Compositing (Fastest)

For a quick MVP, combine clothing item images:

```typescript
// lib/ai/outfit-composite.ts
import sharp from 'sharp';

export async function createOutfitComposite(
  items: Array<{ imageUrl: string; type: string }>
): Promise<Buffer> {
  const canvas = sharp({
    create: {
      width: 800,
      height: 1200,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  });

  // Sort items by layering order
  const sortedItems = items.sort((a, b) => {
    const order = ['shoes', 'pants', 'shirt', 'jacket'];
    return order.indexOf(a.type) - order.indexOf(b.type);
  });

  // Composite images
  const composites = await Promise.all(
    sortedItems.map(async (item, idx) => {
      const image = await fetch(item.imageUrl);
      const buffer = await image.arrayBuffer();

      return {
        input: Buffer.from(buffer),
        top: 100 * idx,
        left: 200,
      };
    })
  );

  const result = await canvas
    .composite(composites)
    .png()
    .toBuffer();

  return result;
}
```

Use with Vercel Blob:

```typescript
// app/api/outfits/composite/route.ts
import { put } from '@vercel/blob';
import { createOutfitComposite } from '@/lib/ai/outfit-composite';

export async function POST(req: NextRequest) {
  const { items } = await req.json();

  const compositeBuffer = await createOutfitComposite(items);

  const blob = await put('outfit-composite.png', compositeBuffer, {
    access: 'public',
  });

  return NextResponse.json({ imageUrl: blob.url });
}
```

---

## Recommended Approach for Stylr

### **Hybrid Solution:**

1. **Phase 1 (MVP)**: Use Gemini to generate visualization prompts
   - Fast to implement
   - Low cost
   - Returns text description user can imagine

2. **Phase 2**: Add Stable Diffusion via Replicate
   - Generate AI images of outfits
   - $0.002 per image
   - Good quality

3. **Phase 3**: Add Virtual Try-On
   - Most realistic
   - Requires user photo upload
   - Higher cost but premium feature

---

## Complete Implementation Example

### Step 1: Test Current Implementation

You already have the visualization API created! Test it:

```bash
npm run dev
```

```bash
curl -X POST http://localhost:3002/api/outfits/visualize \
  -H "Content-Type: application/json" \
  -d '{
    "itemIds": [1, 2, 3],
    "userPreferences": {
      "bodyType": "athletic",
      "skinTone": "medium",
      "style": "streetwear"
    }
  }'
```

Response:
```json
{
  "compatibility": {
    "compatible": true,
    "score": 85,
    "suggestions": ["Consider adding a statement accessory"],
    "warnings": []
  },
  "visualizationPrompt": "A realistic fashion photograph of an athletic model wearing...",
  "items": [...]
}
```

### Step 2: Add Image Generation

Install Replicate:

```bash
npm install replicate
```

Update `.env`:
```bash
REPLICATE_API_TOKEN="r8_xxxxxxxxxxxxx"
```

Create new route:

```typescript
// app/api/outfits/render/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import { generateOutfitVisualizationPrompt } from '@/lib/ai/outfit-visualization';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { itemIds } = await req.json();

  // Get items
  const items = await prisma.clothingItem.findMany({
    where: { id: { in: itemIds } }
  });

  // Generate prompt using Gemini
  const prompt = await generateOutfitVisualizationPrompt(
    items.map(i => ({
      type: i.type || 'item',
      primaryColor: i.primaryColor || 'neutral',
      pattern: i.pattern,
      fit: i.fit,
      vibe: i.vibe,
    }))
  );

  // Generate image with Stable Diffusion
  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
  });

  const output = await replicate.run(
    "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
    {
      input: {
        prompt,
        negative_prompt: "ugly, distorted, deformed, unrealistic, low quality",
        width: 768,
        height: 1024,
      }
    }
  );

  return NextResponse.json({
    imageUrl: output[0],
    prompt,
  });
}
```

### Step 3: Add UI Component

```tsx
// components/OutfitVisualizer.tsx
'use client';

import { useState } from 'react';
import Button from '@/components/Button';
import toast from 'react-hot-toast';

interface Props {
  itemIds: number[];
}

export default function OutfitVisualizer({ itemIds }: Props) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleVisualize = async () => {
    setLoading(true);
    const loadingToast = toast.loading('Generating outfit visualization...');

    try {
      const response = await fetch('/api/outfits/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds }),
      });

      if (!response.ok) throw new Error('Failed to generate');

      const data = await response.json();
      setImageUrl(data.imageUrl);
      toast.success('Outfit rendered!', { id: loadingToast });
    } catch (error) {
      toast.error('Failed to generate outfit', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button
        variant="primary"
        size="md"
        onClick={handleVisualize}
        isLoading={loading}
        disabled={itemIds.length === 0}
      >
        See How It Looks
      </Button>

      {imageUrl && (
        <div className="rounded-lg overflow-hidden border">
          <img
            src={imageUrl}
            alt="Outfit visualization"
            className="w-full h-auto"
          />
        </div>
      )}
    </div>
  );
}
```

---

## Cost Comparison

| Method | Cost per Image | Quality | Speed |
|--------|---------------|---------|-------|
| Text Description (Gemini) | $0.0001 | N/A | Instant |
| Stable Diffusion (Replicate) | $0.002-0.01 | Good | 5-10s |
| DALL-E 3 | $0.04 | Excellent | 10-15s |
| Virtual Try-On (Fashable) | $0.10-0.50 | Photorealistic | 15-30s |
| Image Composite | $0 (free) | Basic | 1-2s |

---

## Next Steps

1. **Test the visualization API** I created
2. **Choose your image generation provider** (I recommend Replicate for MVP)
3. **Add the UI component** to your outfit creation page
4. **Test with real outfits**

The foundation is ready - you just need to add the image generation step!

---

## Alternative: On-Device with Core ML

For true on-device generation on iOS, you'd need to:
1. Convert Stable Diffusion model to Core ML format
2. Bundle with iOS app (~2-4GB app size)
3. Use Swift to run inference

This is complex but possible. Let me know if you want to explore this option!
