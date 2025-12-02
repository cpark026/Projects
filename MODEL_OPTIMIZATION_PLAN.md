# Model Optimization Plan - Virginia Crash Prediction

## Current State Analysis

### Model Architecture
- **Type**: Ensemble (Random Forest + Gradient Boosting)
- **File**: `models/virginia_crash_severity_model.rds` / `accident_prediction_model_improved.rds`
- **Input Features**: 46,127 location clusters
- **Output**: 720 predictions (10 cities × 24 hours × 3 spots)
- **Performance**: R² = 91.20%, MAE = 5.84

### Current Pipeline Issues
1. **Synthetic Data**: `export_predictions.R` generates fake predictions instead of using trained model
2. **No Feature Input**: Missing CSV of actual features for real predictions
3. **Inefficient Filtering**: City-distance vectorization doesn't scale beyond 10 cities
4. **No Caching**: Runs full prediction pipeline on every API call
5. **No Pre-computation**: Could pre-generate predictions for common date ranges

### Performance Bottlenecks
- **Loading model**: ~2-5 seconds (RDS file I/O)
- **Generating 720 predictions**: <1 second (synthetic data only)
- **Real model predictions**: Unknown (never actually run)
- **Filtering/snapping**: <1 second (vectorized)
- **CSV export**: <1 second

---

## Optimization Strategies

### Priority 1: Model Integration (Critical)
**Problem**: Not using actual trained model
**Solution**: Connect real feature data to model predictions

```
├─ Step 1: Load feature engineering script
├─ Step 2: Create prediction_features.csv (all VA highway locations)
├─ Step 3: Generate predictions once for date ranges
├─ Step 4: Cache predictions in `data/precomputed/`
└─ Step 5: API returns cached predictions (instant load)
```

**Expected Impact**: 
- Real predictions instead of synthetic
- No model loading on every request
- Sub-second API response times

---

### Priority 2: Feature Pre-computation (High)
**Problem**: Generating features for every location is expensive
**Solution**: Pre-compute all highway location features once

```
├─ Generate feature matrix for VA highways
├─ Cache as `data/highway_features.csv` (indexed by lat/lon)
├─ On API call: lookup features → predict → return
└─ Result: O(1) feature lookup instead of O(n) generation
```

**Expected Impact**: 
- Reduce computation from seconds to milliseconds
- Enable batch predictions for multiple dates

---

### Priority 3: Intelligent Caching (High)
**Problem**: API calls recalculate same predictions repeatedly
**Solution**: Cache predictions by date in memory + disk

```
├─ Memory cache: Last 7 days of predictions
├─ Disk cache: `data/cache/predictions_YYYY-MM-DD.json`
├─ TTL: 24 hours (refresh daily)
└─ On API call: Check cache first → return or compute
```

**Expected Impact**: 
- 100ms → instant for repeated date requests
- Reduced R process spawning

---

### Priority 4: Model Size Optimization (Medium)
**Problem**: RDS file loading overhead
**Solutions**:
1. **Serialize to binary format**: Protobuf/msgpack instead of RDS
2. **Quantize model**: Reduce float64 → float32 precision
3. **Prune ensemble**: Remove low-importance trees

**Expected Impact**: 
- Reduce model file size by 40-60%
- Faster load times (2-5s → 500ms)

---

### Priority 5: Road-Based Filtering (Medium)
**Problem**: City-distance filtering loses accuracy for non-urban highways
**Solution**: Create highway segments index for O(log n) spatial lookup

```
├─ Load VA road centerlines (one time)
├─ Build spatial index (R-tree, quad-tree)
├─ On predict: Find nearest road segment in O(log n)
└─ Result: Accurate highway-only predictions
```

**Expected Impact**: 
- More realistic predictions on actual roads
- Eliminate city-distance bias

---

### Priority 6: Backend Concurrency (Low)
**Problem**: Sequential R process calls block API
**Solution**: Use worker pool pattern

```
├─ Spawn 2-4 R processes at startup
├─ Queue predictions to workers
├─ Return early from full computation
└─ Result: Handle concurrent requests
```

**Expected Impact**: 
- Support multiple simultaneous date requests
- Better Node.js utilization

---

## Implementation Order

### Phase 1 (This Session): Model Connection
1. Load actual trained model in `export_predictions.R`
2. Create feature generation pipeline
3. Generate `data/prediction_features.csv`
4. Test real predictions (vs synthetic)
5. Commit: `perf: Connect trained model to prediction pipeline`

### Phase 2 (Next): Caching Layer
1. Implement disk cache for predictions
2. Add memory cache in Node.js
3. Update API endpoint to check cache first
4. Commit: `perf: Add prediction caching layer`

### Phase 3: Pre-computation
1. Generate predictions for 30-day rolling window
2. Update cache job to refresh daily
3. Add background job to server startup
4. Commit: `perf: Pre-compute predictions for common dates`

### Phase 4: Road-Based Filtering
1. Load VA road centerlines (one-time)
2. Build spatial index
3. Replace city-distance with road snapping
4. Commit: `feat: Add highway-based prediction filtering`

### Phase 5: Model Optimization
1. Profile current model loading
2. Consider serialization format change
3. Quantize if needed
4. Commit: `perf: Optimize model serialization`

---

## Key Metrics to Track

| Metric | Current | Target |
|--------|---------|--------|
| API response time | Unknown | <500ms |
| Model load time | 2-5s | <500ms |
| Predictions/sec | <10 | >100 |
| File size (model) | Unknown | <50MB |
| Cache hit rate | 0% | >80% |
| Highway accuracy | Low | High |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Model prediction quality unknown | Test with validation data first |
| Cache staleness | TTL + manual refresh on error |
| Road index memory overhead | Lazy load, limit to ~50km grid |
| API timeout (120s) | Pre-compute common dates |

---

## Quick Wins (Implement First)
1. ✅ Switch to actual model predictions (5 min)
2. ✅ Add simple file cache (10 min)
3. ✅ Pre-generate 7-day predictions (2 min)
4. **Total**: 30 minutes, 10x performance gain
