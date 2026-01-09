# Manual Purchase Entry

For emails that the parser can't automatically read, you can manually add purchase data using the same structure the parser would return.

## API Endpoint

`POST /api/purchases`

## Format 1: Multiple Items (Recommended for Order Confirmations)

Send a `ParsedPurchase` structure with an array of items:

```json
{
  "userId": "user-uuid",
  "store": "Nordstrom",
  "orderNumber": "1020297046",
  "purchaseDate": "2025-12-31",
  "total": 128.35,
  "items": [
    {
      "name": "Lands' End Corduroy Chore Jacket",
      "price": 74.96,
      "type": "jacket",
      "color": "Lush Burgundy",
      "brand": "Lands' End",
      "imageUrl": "https://example.com/image.jpg"
    },
    {
      "name": "Topman Textured Overshirt",
      "price": 41.99,
      "type": "shirt",
      "color": "BLACK",
      "brand": "Topman",
      "imageUrl": "https://example.com/image2.jpg"
    }
  ]
}
```

## Format 2: Single Item (Backward Compatible)

```json
{
  "userId": "user-uuid",
  "itemName": "501 Original Fit Jeans",
  "store": "Levi's",
  "purchaseDate": "2026-01-04",
  "price": 59.99,
  "brand": "Levi's",
  "itemType": "pants",
  "color": "Blue",
  "imageUrl": "https://example.com/image.jpg"
}
```

## Example: cURL

```bash
curl -X POST https://your-domain.com/api/purchases \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "your-user-id",
    "store": "Nordstrom",
    "orderNumber": "1020297046",
    "purchaseDate": "2025-12-31",
    "items": [
      {
        "name": "Lands'\'' End Corduroy Chore Jacket",
        "price": 74.96,
        "type": "jacket",
        "color": "Lush Burgundy",
        "brand": "Lands'\'' End",
        "imageUrl": "https://example.com/image.jpg"
      }
    ]
  }'
```

## Example: JavaScript/TypeScript

```typescript
const response = await fetch('/api/purchases', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'your-user-id',
    store: 'Nordstrom',
    orderNumber: '1020297046',
    purchaseDate: '2025-12-31',
    items: [
      {
        name: "Lands' End Corduroy Chore Jacket",
        price: 74.96,
        type: 'jacket',
        color: 'Lush Burgundy',
        brand: "Lands' End",
        imageUrl: 'https://example.com/image.jpg'
      }
    ]
  })
});

const result = await response.json();
console.log(result.message); // "Added 1 purchase(s), 1 added to wardrobe"
```

## Response

```json
{
  "purchases": [
    {
      "id": 123,
      "userId": "user-uuid",
      "itemName": "Lands' End Corduroy Chore Jacket",
      "store": "Nordstrom",
      "price": 74.96,
      "brand": "Lands' End",
      "itemType": "jacket",
      "color": "Lush Burgundy",
      "addedToWardrobe": true,
      "clothingItemId": 456
    }
  ],
  "addedToWardrobe": 1,
  "message": "Added 1 purchase(s), 1 added to wardrobe"
}
```

## Field Descriptions

### Required Fields
- `userId` - User's UUID
- `store` - Store name (e.g., "Nordstrom", "Levi's")
- For Format 1: `items` array with at least one item
- For Format 2: `itemName`

### Optional Fields
- `orderNumber` - Order confirmation number
- `purchaseDate` - Date in YYYY-MM-DD format (defaults to today)
- `total` - Total order amount
- `items[].name` - Product name (required)
- `items[].price` - Item price
- `items[].type` - Clothing type (e.g., "jacket", "shirt", "pants")
- `items[].color` - Item color
- `items[].brand` - Brand name
- `items[].imageUrl` - Product image URL (will be used in wardrobe)

## Notes

- Items are automatically added to your wardrobe with the provided image
- If no `imageUrl` is provided, a placeholder image is used
- Purchase history is tracked separately from wardrobe items
- The endpoint automatically normalizes clothing types and estimates style vibes

