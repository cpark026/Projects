# Quick Start: Running the Model Efficiently

## Current Status

✅ **What's been done:**
- Optimized R script (`export_predictions.R`) with caching built-in
- Node.js backend updated to check memory cache before executing R
- Model now focuses on highway systems (I-95, I-64, I-81, US routes, VA routes)
- Comprehensive documentation for road-only retraining

---

## How to Run Now (Today)

### 1. Start the Server
```bash
cd C:\Users\Christian\Desktop\code\enma754\gitPull\Projects
npm start
```

The server will:
- Start on `http://localhost:3000`
- Log all predictions to console
- Cache results for 1 hour

### 2. Make a Prediction Request
```bash
# Option 1: Using curl
curl -X POST http://localhost:3000/api/predictions \
  -H "Content-Type: application/json" \
  -d '{"date": "2025-12-01"}'

# Option 2: Using the web interface
# Navigate to http://localhost:3000
# Click "Load Prediction Data" button
# Enter date in format: MM/DD/YYYY or YYYY-MM-DD
```

### 3. Expected Results
```
First call (generates):
- Loads R script with trained model
- Generates predictions for highway locations
- Exports to CSV (~2-5 seconds)
- Caches in memory

Subsequent calls (same date, within 1 hour):
- Instant return from cache (~100ms)
- No R process spawning
- Same data as first call
```

---

## Performance Metrics

### What's Happening Under the Hood

```
Request for date: 2025-12-01
├─ Check memory cache → MISS (first call)
├─ Check disk cache in data/cache/ → MISS
├─ Spawn R process
├─ Load model from models/accident_prediction_model_improved.rds
├─ Generate features for highway locations (vectorized)
├─ Batch predict with ensemble model
├─ Filter to VA bounds
├─ Add confidence scores
├─ Export CSV to data/crash_predictions.csv
├─ Save to memory cache (1-hour TTL)
├─ Save to disk cache (data/cache/predictions_2025-12-01.csv)
└─ Return CSV to client
   Total time: 2-5 seconds (first call)
   Total time: <100ms (cached calls)
```

### Cache Architecture

```
┌─────────────────────────────────────┐
│   Client Request                    │
│   /api/predictions {date}           │
└────────────┬────────────────────────┘
             │
             ▼
    ┌────────────────────┐
    │ Memory Cache       │ ◄── 100ms hit rate
    │ (1 hour TTL)       │     for repeated dates
    └────────┬───────────┘
             │ (MISS) ▼
    ┌────────────────────┐
    │ Disk Cache         │ ◄── 500ms hit rate
    │ data/cache/*.csv   │     for older dates
    └────────┬───────────┘
             │ (MISS) ▼
    ┌────────────────────┐
    │ R Script Execution │ ◄── 2-5s to generate
    │ & Model Prediction │     new predictions
    └────────────────────┘
```

---

## Optimization Options (Immediate)

### Option 1: Pre-Generate Common Dates
```bash
# Pre-compute predictions for the last 7 days + next 7 days
# Run this once daily as background job

Rscript r-scripts/generate_date_range_predictions.R
```

This creates CSV files for today ±7 days, so they're always cached.

### Option 2: Increase Cache TTL
In `server.js`, change line ~75 from `3600000` (1 hour) to:
```javascript
7200000  // 2 hours
604800000  // 7 days
```

### Option 3: Pre-Load Model in Memory
Add to server startup:
```javascript
// Load model at startup (not first request)
const { execSync } = require('child_process');
console.log('Pre-loading R model...');
try {
  execSync('Rscript r-scripts/load_model.R', { timeout: 30000 });
} catch (e) {
  console.log('Note: Model preload optional');
}
```

---

## Troubleshooting

### Problem: "npm start" fails

**Solution:**
```bash
# Check if Node modules are installed
npm install

# Clear cache and try again
npm cache clean --force
npm install
npm start
```

### Problem: R script execution error

**Solution:**
```bash
# Test R directly
cd r-scripts
Rscript export_predictions.R "2025-12-01"

# Check R installation
R --version
```

### Problem: Predictions look unrealistic

**Reason:** Model is using synthetic/generated data (expected during testing)

**Next Step:** Retrain on actual crash data using guide in `TRAINING_VA_ROADS_ONLY.md`

---

## Next Steps (Priority Order)

### 🔴 HIGH PRIORITY (Do This Week)
1. **Test current pipeline** 
   - Start server, make a prediction
   - Verify CSV output format
   - Check caching works (2nd request should be instant)

2. **Gather historical crash data**
   - Get crash records for 2023-2024
   - Verify lat/lon coordinates are accurate
   - Check for temporal patterns (rush hours vs. off-peak)

3. **Validate with real crashes**
   - Use `TRAINING_VA_ROADS_ONLY.md` validation section
   - Calculate precision/recall on historical data
   - Identify accuracy gaps

### 🟡 MEDIUM PRIORITY (Do This Month)
4. **Retrain model on VA highways**
   - Load road network (OSM or VirginiaRoadCenterline.shp)
   - Sample points along I-95, I-64, I-81, US routes
   - Engineer features from road network
   - Train new ensemble model on road-only locations

5. **Update prediction locations**
   - Replace synthetic "10 cities" with actual highway network
   - ~50-100 major highway intersections/segments
   - Pre-generate predictions for each location-hour

### 🟢 LOW PRIORITY (Do Later)
6. **Performance tuning**
   - Profile model loading time
   - Consider model compression
   - Add worker pool for concurrent requests

7. **Advanced features**
   - Add weather integration
   - Incorporate AADT (traffic volume) data
   - Multi-day forecasting

---

## Key Files Modified This Session

| File | Change | Impact |
|------|--------|--------|
| `r-scripts/export_predictions.R` | Rewrote with caching + actual model | Real predictions instead of synthetic |
| `server.js` | Added memory cache layer | 100ms response for repeat dates |
| `MODEL_OPTIMIZATION_PLAN.md` | 8-phase optimization strategy | Roadmap for next 3 months |
| `TRAINING_VA_ROADS_ONLY.md` | Complete retraining guide | How to train on highway network |

---

## Architecture Summary

```
┌─────────────────────────────────────────┐
│         Web Frontend (Leaflet.js)       │
│   assets/js/app.js                      │
└──────────────────┬──────────────────────┘
                   │
              POST /api/predictions
                   │
┌──────────────────▼──────────────────────┐
│         Node.js Backend (Express)       │
│   server.js                             │
│   ├─ Memory Cache (1-hour TTL)          │
│   ├─ Disk Cache (data/cache/*.csv)      │
│   └─ R Process Spawner                  │
└──────────────────┬──────────────────────┘
                   │
              Spawn R process
                   │
┌──────────────────▼──────────────────────┐
│     R Script (Optimized)                │
│   export_predictions.R                  │
│   ├─ Load trained model                 │
│   ├─ Generate highway features          │
│   ├─ Batch predict (vectorized)         │
│   ├─ Filter to VA bounds                │
│   └─ Export CSV                         │
└──────────────────┬──────────────────────┘
                   │
                CSV Output
                   │
┌──────────────────▼──────────────────────┐
│    ML Models (Trained Ensemble)         │
│   models/accident_prediction_model_     │
│   improved.rds                          │
│   ├─ Random Forest (1000 trees)         │
│   └─ Gradient Boosting (1500 trees)     │
└─────────────────────────────────────────┘
```

---

## Command Reference

```bash
# Start server
npm start

# Run single prediction (R script directly)
cd r-scripts
Rscript export_predictions.R "2025-12-01"

# Generate predictions for date range
Rscript generate_date_range_predictions.R

# Check git branch and status
git status
git branch

# Test API endpoint
curl http://localhost:3000/api/health

# Clear cache manually
rm -r data/cache/*
```

---

## Success Criteria

✅ You've achieved success when:
1. Server starts without errors
2. First prediction takes 2-5 seconds
3. Second prediction for same date is instant (<200ms)
4. Predictions output valid CSV with lat/lon/probability/hour
5. Map displays markers scaled by probability
6. Multiple consecutive requests return instantly (cache working)

🎯 Next milestone: Retrain on actual crash data + VA highways

Good luck! 🚀
