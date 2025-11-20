# Stylr API Reference

Quick reference for all API endpoints.

---

## 🤖 AI & Chat

### POST `/api/chat`
**Description**: Stream chat with AI style assistant

**Headers**:
```
Content-Type: application/json
```

**Body**:
```json
{
  "messages": [
    { "role": "user", "content": "What should I wear today?" }
  ],
  "userId": "optional-user-id"
}
```

**Response**: Streaming text (Server-Sent Events)

**Example**:
```javascript
const response = await fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'Style my blue jacket' }],
    userId: 'user-123'
  })
});
```

---

## 👕 Clothing Management

### POST `/api/clothing/upload`
**Description**: Upload clothing image and analyze with AI

**Headers**:
```
Content-Type: multipart/form-data
```

**Body**: FormData with `file` field

**Response**:
```json
{
  "success": true,
  "item": {
    "id": 1,
    "imageUrl": "https://...",
    "type": "shirt",
    "primaryColor": "blue",
    "secondaryColor": null,
    "pattern": "solid",
    "fit": "regular",
    "vibe": "casual",
    "notes": "Cotton t-shirt",
    "layeringCategory": "base"
  },
  "analysis": { ... }
}
```

**Example**:
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('/api/clothing/upload', {
  method: 'POST',
  body: formData
});
```

---

### POST `/api/clothing/analyze`
**Description**: Analyze existing image URL

**Body**:
```json
{
  "imageUrl": "https://example.com/shirt.jpg"
}
```

**Response**: Same as upload endpoint

---

### GET `/api/clothing/search`
**Description**: Search and filter wardrobe

**Query Parameters**:
- `userId` (optional) - User ID
- `color` - Filter by color (primary or secondary)
- `type` - Filter by clothing type
- `vibe` - Filter by style vibe
- `pattern` - Filter by pattern
- `layeringCategory` - Filter by layer (base/mid/outer/accessory)
- `tags` - Comma-separated tags

**Response**:
```json
{
  "items": [...],
  "count": 5,
  "filters": {
    "color": "blue",
    "type": "shirt"
  }
}
```

**Examples**:
```bash
# All blue items
GET /api/clothing/search?color=blue

# Casual shirts
GET /api/clothing/search?type=shirt&vibe=casual

# Outer layer items
GET /api/clothing/search?layeringCategory=outer

# Multiple filters
GET /api/clothing/search?color=navy&type=pants&vibe=formal
```

---

## 🎨 Outfit Generation

### GET `/api/outfits/daily`
**Description**: Generate a single "outfit of the day"

**Query Parameters**:
- `userId` (optional) - User ID
- `occasion` (optional, default: "casual") - Occasion type

**Occasions**: casual, work, formal, date, summer

**Response**:
```json
{
  "outfit": {
    "items": [
      { "id": 1, "type": "shirt", ... },
      { "id": 3, "type": "pants", ... }
    ],
    "score": 8,
    "reasoning": "A Classic outfit perfect for casual...",
    "occasion": "casual",
    "recommendationId": 42
  }
}
```

**Examples**:
```bash
# Casual outfit
GET /api/outfits/daily?occasion=casual

# Work outfit
GET /api/outfits/daily?occasion=work&userId=123
```

---

### POST `/api/outfits/generate`
**Description**: Generate multiple outfit suggestions

**Body**:
```json
{
  "userId": "optional-user-id",
  "occasion": "casual",
  "count": 3
}
```

**Response**:
```json
{
  "outfits": [
    {
      "items": [...],
      "score": 9,
      "reasoning": "...",
      "occasion": "casual",
      "recommendationId": 43
    },
    // ... more outfits, sorted by score
  ]
}
```

**Example**:
```javascript
const response = await fetch('/api/outfits/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-123',
    occasion: 'formal',
    count: 5
  })
});
```

---

### POST `/api/outfits/validate-colors`
**Description**: Validate color harmony of outfit

**Body Option 1** (Item IDs):
```json
{
  "itemIds": [1, 2, 3]
}
```

**Body Option 2** (Direct colors):
```json
{
  "colors": ["navy", "white", "beige"]
}
```

**Response**:
```json
{
  "validation": {
    "isHarmonious": true,
    "score": 10,
    "reasoning": "All neutral colors - classic palette...",
    "suggestions": []
  },
  "complementarySuggestions": [
    "Any color works with neutrals!",
    "Bright colors",
    "Pastels"
  ],
  "analyzedColors": ["navy", "white", "beige"]
}
```

**Score Range**: 0-10 (higher is better)

**Examples**:
```javascript
// Validate by item IDs
await fetch('/api/outfits/validate-colors', {
  method: 'POST',
  body: JSON.stringify({ itemIds: [1, 5, 8] })
});

// Validate by colors
await fetch('/api/outfits/validate-colors', {
  method: 'POST',
  body: JSON.stringify({ colors: ['red', 'orange', 'pink'] })
});
```

---

## 🌤️ Weather

### POST `/api/weather/outfit`
**Description**: Get weather-based outfit suggestions

**Body**:
```json
{
  "latitude": 40.7128,
  "longitude": -74.0060,
  "userId": "optional-user-id"
}
```

**Response**:
```json
{
  "weather": {
    "temperature": 65,
    "precipitation": 0,
    "conditions": "Clear",
    "layeringRecommendation": ["base", "mid"]
  },
  "suggestion": "Perfect weather! A light outfit...",
  "requiredLayers": ["base", "mid"],
  "suitableItems": {
    "base": [
      { "id": 1, "type": "shirt", ... }
    ],
    "mid": [
      { "id": 5, "type": "sweater", ... }
    ]
  }
}
```

**Temperature Units**: Fahrenheit

**Examples**:
```javascript
// Get weather for NYC
await fetch('/api/weather/outfit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    latitude: 40.7128,
    longitude: -74.0060
  })
});

// Get weather for LA
await fetch('/api/weather/outfit', {
  method: 'POST',
  body: JSON.stringify({
    latitude: 34.0522,
    longitude: -118.2437,
    userId: 'user-123'
  })
});
```

---

## 🔍 Quick Examples

### Complete Workflow
```javascript
// 1. Upload a clothing item
const formData = new FormData();
formData.append('file', file);
await fetch('/api/clothing/upload', { method: 'POST', body: formData });

// 2. Get weather
const weather = await fetch('/api/weather/outfit', {
  method: 'POST',
  body: JSON.stringify({ latitude: 40.7, longitude: -74 })
}).then(r => r.json());

// 3. Generate outfits
const outfits = await fetch('/api/outfits/generate', {
  method: 'POST',
  body: JSON.stringify({ occasion: 'work', count: 3 })
}).then(r => r.json());

// 4. Validate colors of best outfit
const validation = await fetch('/api/outfits/validate-colors', {
  method: 'POST',
  body: JSON.stringify({
    itemIds: outfits.outfits[0].items.map(i => i.id)
  })
}).then(r => r.json());

// 5. Ask AI for advice if needed
const chat = await fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({
    messages: [{
      role: 'user',
      content: 'Alternative to this outfit?'
    }]
  })
});
```

### Search Examples
```bash
# Find blue items
curl "http://localhost:3000/api/clothing/search?color=blue"

# Find casual t-shirts
curl "http://localhost:3000/api/clothing/search?type=shirt&vibe=casual"

# Find jackets (outer layer)
curl "http://localhost:3000/api/clothing/search?layeringCategory=outer"

# Complex search
curl "http://localhost:3000/api/clothing/search?color=black&type=pants&vibe=formal&userId=123"
```

### Color Validation Examples
```bash
# Good harmony
curl -X POST http://localhost:3000/api/outfits/validate-colors \
  -H "Content-Type: application/json" \
  -d '{"colors":["black","white","navy"]}'
# Score: 10

# Poor harmony
curl -X POST http://localhost:3000/api/outfits/validate-colors \
  -d '{"colors":["red","orange","purple","green","yellow"]}'
# Score: 3
```

---

## 🎨 Color Values

### Supported Colors
**Neutrals**: black, white, gray, grey, beige, tan, cream, ivory, navy, brown

**Warm**: red, orange, yellow, pink, coral, peach, burgundy, maroon

**Cool**: blue, green, purple, teal, turquoise, mint, lavender, violet

### Color Harmony Rules
- **Monochromatic** (same color): Score 9
- **All neutrals**: Score 10
- **Neutrals + 1 accent**: Score 9
- **All warm or all cool**: Score 8
- **Warm + cool without neutral**: Score 4
- **More than 3 colors**: Score 3

---

## 🎯 Occasion Types

Use these for outfit generation:

- `casual` - Everyday wear, relaxed
- `work` - Professional, office-appropriate
- `formal` - Dressy, elegant
- `date` - Romantic, stylish
- `summer` - Light, breathable

More can be added as needed!

---

## ⚡ Response Times

Typical response times:

- **Search**: <100ms
- **Color Validation**: <50ms (no AI call)
- **Weather**: <500ms
- **Outfit Generation**: <200ms
- **Image Upload + AI**: 2-5 seconds
- **Chat (first token)**: 1-2 seconds
- **Chat (streaming)**: Real-time

---

## 🐛 Error Handling

All endpoints return errors in this format:
```json
{
  "error": "Description of what went wrong"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad request (missing parameters)
- `404` - Not found (no items, no outfits)
- `500` - Server error (check logs)

---

## 💡 Pro Tips

1. **Chain APIs**: Weather → Generate → Validate
2. **Cache Results**: Weather changes slowly, cache for 1 hour
3. **Batch Operations**: Use multi-outfit generator instead of calling daily endpoint multiple times
4. **Search First**: Search for specific items before generating outfits
5. **Validate Early**: Check color harmony before showing outfit to user

---

**For more details, see [QUICK_START.md](QUICK_START.md)**
