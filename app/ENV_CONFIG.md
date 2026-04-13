# Environment Configuration

## Available Environment Variables

### API Configuration

**`NEXT_PUBLIC_MYSHIPTRACKING_API_KEY`**
- **Description**: API key for MyShipTracking service
- **Required**: Yes
- **Example**: `"YNjYdXHeljjm%X9pI0xMXAk4$wdV6Ldq6B"`
- **Note**: Special characters like `%` and `$` should be escaped with backslashes or wrapped in quotes

### Map Configuration

**`NEXT_PUBLIC_DEFAULT_IMOS`**
- **Description**: Comma-separated list of IMO numbers to auto-load when the map opens
- **Required**: No (defaults to empty if not set)
- **Format**: Comma-separated string
- **Example**: `"9089229,9839492,9976769,9137284,8794310,9171058,9974917,8967656"`

## Configuration Files

### `.env` (Production/Local)
```env
NEXT_PUBLIC_MYSHIPTRACKING_API_KEY="YNjYdXHeljjm%X9pI0xMXAk4$wdV6Ldq6B"
NEXT_PUBLIC_DEFAULT_IMOS="9089229,9839492,9976769,9137284,8794310,9171058,9974917,8967656"
```

### `.env.example` (Template)
```env
NEXT_PUBLIC_MYSHIPTRACKING_API_KEY=your_api_key_here
NEXT_PUBLIC_DEFAULT_IMOS=9089229,9839492,9976769,9137284,8794310,9171058,9974917,8967656
```

## How to Configure Default IMO Numbers

### Option 1: Edit .env file
```bash
# Open .env file
nano .env

# Update the NEXT_PUBLIC_DEFAULT_IMOS line
NEXT_PUBLIC_DEFAULT_IMOS="1234567,2345678,3456789"
```

### Option 2: Set environment variable
```bash
export NEXT_PUBLIC_DEFAULT_IMOS="1234567,2345678,3456789"
```

### Option 3: Add to deployment platform
For platforms like Vercel, Netlify, etc., add the environment variable in their dashboard.

## Format Requirements

### IMO Numbers
- Must be comma-separated
- Whitespace around commas is automatically trimmed
- Empty values are filtered out
- No quotes needed around individual IMO numbers

### Valid Examples
```env
# Simple list
NEXT_PUBLIC_DEFAULT_IMOS="9089229,9839492,9976769"

# With spaces (automatically trimmed)
NEXT_PUBLIC_DEFAULT_IMOS="9089229, 9839492, 9976769"

# Single IMO
NEXT_PUBLIC_DEFAULT_IMOS="9089229"

# Empty (no auto-load)
NEXT_PUBLIC_DEFAULT_IMOS=""
```

## Usage in Code

The MapPanel component automatically reads and parses the environment variable:

```typescript
const DEFAULT_IMOS = (
  process.env.NEXT_PUBLIC_DEFAULT_IMOS || ""
)
  .split(",")
  .map((imo) => imo.trim())
  .filter((imo) => imo.length > 0);
```

## Benefits

✅ **Easy configuration** - Change IMO numbers without code changes  
✅ **Environment-specific** - Different IMOs for dev/staging/production  
✅ **No rebuild needed** - Update and restart (for local dev)  
✅ **Version control friendly** - Keep sensitive data out of code  

## After Changing Environment Variables

### Local Development
1. Update `.env` file
2. Restart dev server: `npm run dev`
3. Refresh browser

### Production
1. Update environment variable in deployment platform
2. Redeploy or restart application
3. Changes take effect immediately

## Notes

- All `NEXT_PUBLIC_*` variables are exposed to the browser
- Changes require server restart to take effect
- Empty or missing `NEXT_PUBLIC_DEFAULT_IMOS` results in no auto-load
- Invalid IMO numbers will still attempt to load (API will handle errors)
