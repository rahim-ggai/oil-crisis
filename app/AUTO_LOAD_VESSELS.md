# ✅ Auto-Load Vessels on Startup

## What's New

The map now **automatically loads 8 vessels** when you open the Ship Tracking panel!

### Default Vessels (Auto-Loaded)

These IMO numbers load automatically on page load:

```
9089229
9839492
9976769
9137284
8794310
9171058
9974917
8967656
```

## How It Works

1. **Open the Map panel**
2. See "Loading 8 vessels... Please wait" message
3. Vessels load one by one (with 500ms delay between each)
4. Each vessel appears with its route automatically
5. Map auto-zooms to fit all vessels

### Loading Process

- **Sequential loading** - One vessel at a time to avoid API rate limits
- **500ms delay** between requests
- **Auto-fetch routes** - Each vessel's 7-day history loads automatically
- **Progress indicator** - Blue banner shows loading status
- **Error handling** - Failed vessels are logged but don't stop the process

## Features

✅ **8 vessels auto-load on startup**  
✅ **Manual add still works** - Add more vessels anytime  
✅ **Loading indicator** - Shows progress  
✅ **Rate limit friendly** - 500ms delay between requests  
✅ **Auto-routes** - All vessels show their tracks  
✅ **Clear All** - Reset and start fresh  
✅ **Demo mode** - Still available with mock data  

## User Experience

### On Page Load
```
1. Navigate to "Ship Tracking" 
2. See: "Loading 8 vessels... Please wait"
3. Vessels appear one by one on map
4. Routes draw automatically
5. Map zooms to show all vessels
6. Ready to add more or interact!
```

### After Loading
- **Search shows**: "Search Vessel (8 tracked)"
- All 8 vessels visible on map with routes
- Can add more vessels manually
- Can click "Clear All" to reset
- Can click "Load Demo Vessels" for mock data

## Manual Add Flow (Still Works!)

You can still add vessels manually:

1. Enter any IMO number
2. Click "Add Ship" (or press Enter)
3. New vessel adds to the existing 8
4. Route loads automatically
5. Now you have 9+ vessels!

## Configuration

### Change Default Vessels

Edit `/src/components/modules/MapPanel.tsx`:

```typescript
const DEFAULT_IMOS = [
  '9089229',
  '9839492',
  '9976769',
  '9137284',
  '8794310',
  '9171058',
  '9974917',
  '8967656',
];
```

Replace with your preferred IMO numbers.

### Adjust Loading Delay

Change the delay between requests (currently 500ms):

```typescript
await new Promise(resolve => setTimeout(resolve, 500)); // Change 500 to desired ms
```

**Note:** Don't set too low or you'll hit API rate limits!

## Technical Details

### Implementation

- **useEffect hook** - Runs once on component mount
- **initialLoadDone state** - Prevents re-loading on re-renders
- **Sequential async loading** - Avoids overwhelming the API
- **Error handling** - Continues loading even if one vessel fails

### API Calls

For 8 vessels:
- 8 vessel position calls (`/api/ship-tracking/vessel`)
- 8 vessel history calls (`/api/ship-tracking/history`)
- Total: **16 API calls** on page load

With 500ms delay: **~8 seconds** total load time

### Rate Limits

MyShipTracking API:
- Trial: 90 calls/minute
- Our load: 16 calls in ~8 seconds = well within limits ✅

## Benefits

### For Demos
- **Instant visualization** - No manual setup needed
- **Professional look** - Map populated immediately
- **Real data** - Shows actual vessel tracking

### For Production
- **Fleet monitoring** - Track your key vessels automatically
- **Dashboard ready** - Opens with relevant data
- **Customizable** - Easy to change default vessels

## Summary

🎉 **The map now auto-loads 8 real vessels on startup!**

- Opens with vessels already tracked
- Routes displayed automatically
- Manual add still works perfectly
- Professional, ready-to-demo experience

Just navigate to the Map panel and watch it populate! 🚢🗺️
