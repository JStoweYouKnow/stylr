# AI Vision Provider Setup

This app uses **free AI models** for clothing image analysis with automatic fallback support.

## Providers (in priority order)

### 1. Google Gemini 1.5 Flash (PRIMARY - FREE)
- **Cost**: Completely FREE
- **Limits**: 15 requests/minute, 1M requests/day
- **Setup**: Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- **Environment Variable**: `GOOGLE_AI_API_KEY`

### 2. Groq Llama Vision (FALLBACK - FREE)
- **Cost**: FREE with generous limits
- **Model**: llama-3.2-90b-vision-preview
- **Setup**: Get your API key from [Groq Console](https://console.groq.com/keys)
- **Environment Variable**: `GROQ_API_KEY`

### 3. OpenAI GPT-4o-mini (FALLBACK - Paid)
- **Cost**: $0.15/1M input tokens (very cheap)
- **Setup**: Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
- **Environment Variable**: `OPENAI_API_KEY`

## How It Works

The system automatically tries providers in order:
1. Tries Gemini first (free)
2. If Gemini fails, tries Groq (free)
3. If Groq fails, tries OpenAI (cheap)
4. If all fail, returns detailed error

You only need **ONE** API key configured. The system will use whichever is available.

## Quick Start

### Option 1: Free with Google Gemini (Recommended)
```bash
# 1. Get free API key from https://makersuite.google.com/app/apikey
# 2. Add to .env
GOOGLE_AI_API_KEY="your_actual_key_here"
```

### Option 2: Free with Groq
```bash
# 1. Get free API key from https://console.groq.com/keys
# 2. Add to .env
GROQ_API_KEY="your_actual_key_here"
```

### Option 3: Multiple providers (best reliability)
```bash
# Configure all three for maximum reliability
GOOGLE_AI_API_KEY="your_gemini_key"
GROQ_API_KEY="your_groq_key"
OPENAI_API_KEY="your_openai_key"
```

## Usage

The API is already integrated. Just use the existing endpoints:

```typescript
import { analyzeClothingImage } from "@/lib/ai/vision";

const analysis = await analyzeClothingImage(imageUrl);
// Automatically uses available provider with fallback
```

## Direct Provider Access

If needed, you can call specific providers:

```typescript
import {
  analyzeWithGemini,
  analyzeWithOpenAI,
  analyzeWithGroq
} from "@/lib/ai/vision";

// Force specific provider
const analysis = await analyzeWithGemini(imageUrl);
```

## Migration from Claude

The old Claude integration has been completely replaced. No code changes needed in your application - the same `analyzeClothingImage` function now uses free providers with automatic fallback.

## Troubleshooting

If you see errors:
1. Check that at least one API key is configured in `.env`
2. Verify your API key is valid
3. Check console logs to see which provider failed and why
4. Free tier limits: Gemini (15/min), Groq (varies by model)
