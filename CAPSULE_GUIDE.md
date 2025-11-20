# Capsule Wardrobe Guide

## What is a Capsule Wardrobe?

A capsule wardrobe is a curated collection of versatile clothing items that can be mixed and matched to create multiple outfits. Stylr automatically selects the most versatile pieces from your closet and plans daily outfits for a week or month.

## Benefits

- **Simplify decision-making** - Pre-planned outfits for every day
- **Maximize wardrobe usage** - Discover new combinations
- **Travel planning** - Pack only what you need
- **Seasonal organization** - Rotate your wardrobe efficiently
- **Identify gaps** - See which pieces you need

---

## Weekly Capsule

### Overview
- **Duration**: 7 days (Monday-Sunday)
- **Items**: 12-15 pieces
- **Occasions**: Customizable mix (default: 3 casual, 4 work)
- **Goal**: Cover a typical week with minimal items

### Composition
```
~4 tops (35%)
~3 bottoms (25%)
~2-3 layers (20%)
~1 dress (10%)
~1-2 accessories (10%)
```

### Example API Call

```javascript
const response = await fetch('/api/capsule/weekly', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-123',
    occasionMix: {
      casual: 3,    // 3 casual days
      work: 4       // 4 work days
    }
  })
});

const data = await response.json();
```

### Response Structure

```json
{
  "capsule": {
    "items": [
      {
        "id": 1,
        "type": "shirt",
        "primaryColor": "white",
        "vibe": "professional"
      },
      // ... 11 more items
    ],
    "outfits": [
      {
        "day": "Monday",
        "occasion": "work",
        "items": [/* 3-4 items for the outfit */],
        "reasoning": "Professional outfit with neutral colors..."
      },
      {
        "day": "Tuesday",
        "occasion": "work",
        "items": [/* 3-4 items */],
        "reasoning": "..."
      },
      // ... through Sunday
    ],
    "stats": {
      "totalItems": 12,
      "outfitsPerItem": {
        "1": 3,  // Item #1 used in 3 outfits
        "2": 2,  // Item #2 used in 2 outfits
        ...
      },
      "versatilityScore": 85  // 0-100, higher is better
    }
  },
  "message": "Created weekly capsule with 12 items for 7 days"
}
```

---

## Monthly Capsule

### Overview
- **Duration**: 30 days
- **Items**: 20-30 pieces
- **Occasions**: Customizable (default: 12 casual, 16 work, 2 formal)
- **Goal**: Cover an entire month with coordinated outfits

### Composition
```
~10 tops (35%)
~7 bottoms (25%)
~5-6 layers (20%)
~3 dresses (10%)
~3-4 accessories (10%)
```

### Example API Call

```javascript
const response = await fetch('/api/capsule/monthly', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-123',
    occasionMix: {
      casual: 12,   // 12 casual days
      work: 16,     // 16 work days
      formal: 2     // 2 formal events
    }
  })
});

const data = await response.json();
```

### Response
Same structure as weekly, but with 30 daily outfits and 20-30 items.

---

## Versatility Score

The versatility score (0-100) indicates how well your capsule items work together:

- **90-100**: Excellent - All items used evenly, high reuse
- **75-89**: Very Good - Most items well-utilized
- **60-74**: Good - Some items underused
- **Below 60**: Needs improvement - Many items unused or unbalanced

### What affects the score:
1. **Item utilization** - How many items are actually used
2. **Balanced reuse** - Items worn multiple times (not just once)
3. **Coverage** - All days have good outfit options

---

## Use Cases

### 1. Weekly Work Capsule
```javascript
{
  occasionMix: {
    work: 5,      // Monday-Friday
    casual: 2     // Weekend
  }
}
```

### 2. Vacation Capsule (Week)
```javascript
{
  occasionMix: {
    casual: 5,
    date: 2       // Nice dinners
  }
}
```

### 3. Monthly Balanced Capsule
```javascript
{
  occasionMix: {
    casual: 8,
    work: 20,
    formal: 2
  }
}
```

### 4. Minimalist Challenge
For advanced users, try even fewer items:
- Modify `lib/capsule-generator.ts`
- Reduce `capsuleSize` to 8-10 items for weekly
- Aim for versatility score above 90

---

## Retrieving Saved Capsules

```javascript
// Get all your capsules
const all = await fetch('/api/capsule?userId=user-123').then(r => r.json());

// Get only weekly capsules
const weekly = await fetch('/api/capsule?userId=user-123&period=weekly')
  .then(r => r.json());

// Get only monthly capsules
const monthly = await fetch('/api/capsule?userId=user-123&period=monthly')
  .then(r => r.json());
```

---

## Tips for Better Capsules

### 1. Build a Base of Neutrals
Ensure you have neutral-colored basics:
- Black pants
- White shirt
- Navy blazer
- Grey sweater

### 2. Add Color Strategically
1-2 accent colors that work with all neutrals:
- Blue
- Burgundy
- Olive

### 3. Include Layers
For versatility across weather:
- Light cardigan
- Blazer
- Jacket

### 4. Quality Over Quantity
12 well-chosen items beat 30 random pieces

### 5. Consider Your Lifestyle
Adjust `occasionMix` to match your actual schedule:
- More `work` if you're in office 5 days/week
- More `casual` if you work from home
- Add `formal` for events/meetings

---

## Integration with Other Features

### Weather + Capsule
```javascript
// 1. Generate monthly capsule
const capsule = await fetch('/api/capsule/monthly', {...});

// 2. Check weather for upcoming week
const weather = await fetch('/api/weather/outfit', {
  method: 'POST',
  body: JSON.stringify({ latitude: 40.7, longitude: -74 })
});

// 3. Filter capsule outfits by weather requirements
const suitableOutfits = capsule.outfits.filter(outfit => {
  const hasRequiredLayers = weather.requiredLayers.every(layer =>
    outfit.items.some(item => item.layeringCategory === layer)
  );
  return hasRequiredLayers;
});
```

### Capsule + Color Validation
```javascript
// Validate each daily outfit in your capsule
for (const outfit of capsule.outfits) {
  const itemIds = outfit.items.map(i => i.id);

  const validation = await fetch('/api/outfits/validate-colors', {
    method: 'POST',
    body: JSON.stringify({ itemIds })
  }).then(r => r.json());

  console.log(`${outfit.day}: Score ${validation.validation.score}/10`);
}
```

### Capsule + Wear Tracking
```javascript
// Log when you wear a capsule outfit
await fetch('/api/wear', {
  method: 'POST',
  body: JSON.stringify({
    itemIds: mondayOutfit.items.map(i => i.id),
    context: 'Weekly Capsule - Monday'
  })
});
```

---

## Database Schema

Capsules are saved in the `capsule_wardrobes` table:

```prisma
model CapsuleWardrobe {
  id                Int      @id @default(autoincrement())
  userId            String?
  name              String   // "Weekly Capsule - Week of 11/20/2025"
  period            String   // "weekly" or "monthly"
  itemIds           Int[]    // IDs of clothing items
  outfitPlan        Json     // Daily outfit schedule
  versatilityScore  Int      // 0-100
  startDate         DateTime?
  endDate           DateTime?
  createdAt         DateTime
}
```

---

## Advanced: Customizing Generation

Edit `lib/capsule-generator.ts` to customize:

### Change Composition Ratios
```typescript
// Current (line ~120)
const topsCount = Math.floor(targetSize * 0.35);
const bottomsCount = Math.floor(targetSize * 0.25);

// Modify for more bottoms:
const topsCount = Math.floor(targetSize * 0.30);
const bottomsCount = Math.floor(targetSize * 0.30);
```

### Prioritize Specific Colors
```typescript
// Add to selectCoreItems function
const myFavoriteColors = ['navy', 'black', 'white'];
const sorted = [...arr].sort((a, b) => {
  const aIsFavorite = myFavoriteColors.includes(a.primaryColor);
  const bIsFavorite = myFavoriteColors.includes(b.primaryColor);
  if (aIsFavorite && !bIsFavorite) return -1;
  if (!aIsFavorite && bIsFavorite) return 1;
  return 0;
});
```

### Add Seasonal Logic
```typescript
export function generateSeasonalCapsule(
  items: ClothingItem[],
  season: 'spring' | 'summer' | 'fall' | 'winter'
) {
  // Filter items by season
  const seasonalItems = items.filter(item => {
    // Your season logic here
    if (season === 'summer') {
      return !item.layeringCategory?.includes('outer');
    }
    return true;
  });

  return generateCapsuleWardrobe(seasonalItems, 7);
}
```

---

## Frequently Asked Questions

**Q: Can I generate multiple capsules?**
A: Yes! Generate as many as you want. They're all saved and retrievable.

**Q: What if I don't have enough items?**
A: You need at least 10-12 items total. The system will work with what you have.

**Q: Can I edit a generated capsule?**
A: Currently no, but you can delete and regenerate. Future feature!

**Q: How does it pick items?**
A: Prioritizes neutral colors, versatile pieces, and balanced categories.

**Q: Why is my versatility score low?**
A: Some items aren't being used in outfits. Try adding more neutrals or versatile pieces.

**Q: Can I force specific items into the capsule?**
A: Not yet, but this is planned! You could modify the code to prioritize certain item IDs.

---

## Next Steps

1. Generate your first weekly capsule
2. Check the versatility score
3. Try the outfits for a week
4. Provide feedback to improve algorithm
5. Generate monthly capsules for long-term planning

**Happy capsule building!** 📦✨
