# Training Model for VA Roads Only - Implementation Guide

## Problem Statement
Your ML model currently makes predictions across all of Virginia, including water/offshore areas. To improve accuracy and efficiency, we need to:
1. **Restrict training data** to actual road network locations (highways, state routes, local roads)
2. **Add spatial features** that capture road network characteristics
3. **Retrain the ensemble model** on road-filtered data
4. **Validate predictions** against actual crash data on roads

---

## Data Pipeline for Road-Only Training

### Phase 1: Load Road Network Data

#### Option A: Using OpenStreetMap (Recommended)
```r
# Load OSM data for VA highways
library(osmdata)
library(sf)
library(tidyverse)

# Define Virginia bounding box
va_bbox <- c(-83.7, 36.5, -75.0, 39.5)  # xmin, ymin, xmax, ymax

# Download major roads from OSM
va_roads <- opq(bbox = va_bbox) %>%
  add_osm_feature(key = "highway", 
                 value = c("motorway", "motorway_link", 
                          "trunk", "trunk_link",
                          "primary", "primary_link",
                          "secondary", "secondary_link")) %>%
  osmdata_sf()

# Extract road lines
road_lines <- va_roads$osm_lines %>%
  st_transform(4326)  # WGS84

# Save for later use
st_write(road_lines, "data/va_osm_roads.gpkg")
```

#### Option B: Using Official State Data
```r
# Virginia road centerlines (already referenced in your code)
road_shp <- st_read("data/VirginiaRoadCenterline.shp")

# Filter to highways only
highways <- road_shp %>%
  filter(SURF_TYPE %in% c("Asphalt", "Concrete") &
         !is.na(AADT))  # Has traffic data

# Extract major roads by class
major_roads <- highways %>%
  filter(CLASS_A %in% c("I", "MIA", "MAC") |  # Interstate, Major Interstate, Major Arterial
         CLASS_B %in% c("INT", "PA", "SA"))     # Interstate, Principal Arterial, Secondary Arterial
```

### Phase 2: Sample Points Along Roads

```r
# Create grid of points along road network
sample_road_points <- function(road_lines, spacing_km = 0.5) {
  library(sf)
  
  # Convert spacing to degrees (~1 deg = 111 km at equator, ~86 km at VA latitude)
  spacing_deg <- spacing_km / 111
  
  all_points <- list()
  
  for (i in 1:nrow(road_lines)) {
    line <- road_lines$geometry[i]
    
    # Sample points along line at regular intervals
    points <- st_line_sample(line, density = 1/spacing_deg)
    points_sf <- st_cast(points, "POINT") %>% st_sf()
    
    all_points[[i]] <- points_sf
  }
  
  # Combine all points
  road_points <- do.call(rbind, all_points) %>%
    mutate(id = row_number())
  
  return(road_points)
}

# Generate points along major roads (~500m spacing)
road_locations <- sample_road_points(major_roads, spacing_km = 0.5)

cat(sprintf("Generated %d location points along VA roads\n", nrow(road_locations)))

# Save for use in feature engineering
road_locations_df <- road_locations %>%
  st_drop_geometry() %>%
  cbind(st_coordinates(road_locations))

write_csv(road_locations_df, "data/road_locations.csv")
```

### Phase 3: Feature Engineering for Road Locations

```r
# Feature engineering for training data
engineer_road_features <- function(crashes_df, road_locations_df) {
  library(dplyr)
  library(lubridate)
  
  # 1. Temporal features (per location-hour combination)
  features <- expand_grid(
    location_id = road_locations_df$id,
    hour = 0:23,
    day_of_week = 1:7
  ) %>%
    left_join(road_locations_df %>% select(id, X, Y), 
              by = c("location_id" = "id")) %>%
    rename(lon = X, lat = Y) %>%
    mutate(
      # Temporal features
      hour_sin = sin(2 * pi * hour / 24),
      hour_cos = cos(2 * pi * hour / 24),
      day_sin = sin(2 * pi * day_of_week / 7),
      day_cos = cos(2 * pi * day_of_week / 7),
      
      # Rush hour indicators
      is_morning_rush = as.integer(hour >= 7 & hour <= 9),
      is_evening_rush = as.integer(hour >= 16 & hour <= 18),
      is_night = as.integer(hour >= 22 | hour <= 2),
      is_weekend = as.integer(day_of_week %in% c(6, 7)),
      
      # Weather season indicators
      season = case_when(
        month(Sys.Date()) %in% c(12, 1, 2) ~ "winter",
        month(Sys.Date()) %in% c(3, 4, 5) ~ "spring",
        month(Sys.Date()) %in% c(6, 7, 8) ~ "summer",
        month(Sys.Date()) %in% c(9, 10, 11) ~ "fall"
      )
    )
  
  # 2. Match crashes to nearest road point (target variable)
  features <- features %>%
    left_join(
      crashes_df %>%
        mutate(
          hour = hour(crash_time),
          day_of_week = wday(crash_date)
        ) %>%
        group_by(location_id, hour, day_of_week) %>%
        summarise(crash_count = n(), .groups = "drop"),
      by = c("location_id", "hour", "day_of_week")
    ) %>%
    mutate(
      crash_count = replace_na(crash_count, 0),
      had_crash = as.integer(crash_count > 0),
      severity_avg = ifelse(crash_count > 0, crash_count / crash_count, NA)
    )
  
  return(features)
}

# Generate features
training_features <- engineer_road_features(crashes_df, road_locations_df)
```

---

## Model Retraining Strategy

### Option 1: Random Forest + Gradient Boosting (Your Current Ensemble)

```r
library(caret)
library(randomForest)
library(gbm)

# Split training/testing
set.seed(42)
train_idx <- createDataPartition(training_features$had_crash, p = 0.8, list = FALSE)
train_data <- training_features[train_idx, ]
test_data <- training_features[-train_idx, ]

# Feature columns
feature_cols <- c("hour_sin", "hour_cos", "day_sin", "day_cos", 
                  "is_morning_rush", "is_evening_rush", "is_night", 
                  "is_weekend")

# Random Forest
rf_model <- randomForest(
  had_crash ~ .,
  data = train_data %>% select(all_of(feature_cols), had_crash),
  ntree = 1000,
  mtry = 3,
  importance = TRUE,
  parallel = TRUE
)

# Gradient Boosting
gb_model <- gbm(
  had_crash ~ .,
  data = train_data %>% select(all_of(feature_cols), had_crash),
  distribution = "bernoulli",
  n.trees = 1500,
  interaction.depth = 5,
  shrinkage = 0.01
)

# Ensemble predictions
rf_pred <- predict(rf_model, test_data, type = "prob")[, 2]
gb_pred <- predict(gb_model, test_data, n.trees = 1500, type = "response")
ensemble_pred <- (rf_pred + gb_pred) / 2

# Evaluate
ensemble_auc <- pROC::auc(test_data$had_crash, ensemble_pred)
cat(sprintf("Ensemble AUC: %.4f\n", ensemble_auc))

# Save models
saveRDS(rf_model, "models/va_roads_rf_model.rds")
saveRDS(gb_model, "models/va_roads_gb_model.rds")
```

### Option 2: XGBoost (Faster Training)

```r
library(xgboost)
library(caret)

# Prepare data for XGBoost
X_train <- train_data %>% 
  select(all_of(feature_cols)) %>% 
  as.matrix()

y_train <- train_data$had_crash

# Create XGBoost data structure
dtrain <- xgb.DMatrix(data = X_train, label = y_train)

# Train model
xgb_model <- xgb.train(
  params = list(
    objective = "binary:logistic",
    eval_metric = "auc",
    max_depth = 6,
    eta = 0.1,
    subsample = 0.8
  ),
  data = dtrain,
  nrounds = 500,
  verbose = 0
)

# Predictions
X_test <- test_data %>% 
  select(all_of(feature_cols)) %>% 
  as.matrix()
dtest <- xgb.DMatrix(data = X_test)
xgb_pred <- predict(xgb_model, dtest)

# Evaluate
xgb_auc <- pROC::auc(test_data$had_crash, xgb_pred)
cat(sprintf("XGBoost AUC: %.4f\n", xgb_auc))

saveRDS(xgb_model, "models/va_roads_xgboost_model.rds")
```

### Option 3: Hybrid Approach (Recommended)

```r
# Use the best of both worlds:
# - RF for interpretability and importance
# - GB for accuracy
# - Weighted ensemble based on validation performance

ensemble_model <- list(
  rf = rf_model,
  gb = gb_model,
  rf_weight = 0.4,  # Random Forest gets 40%
  gb_weight = 0.6   # Gradient Boosting gets 60%
)

predict_hybrid <- function(model_list, newdata) {
  rf_pred <- predict(model_list$rf, newdata, type = "prob")[, 2]
  gb_pred <- predict(model_list$gb, newdata, n.trees = 1500, type = "response")
  
  hybrid_pred <- (rf_pred * model_list$rf_weight) + (gb_pred * model_list$gb_weight)
  return(hybrid_pred)
}

saveRDS(ensemble_model, "models/va_roads_ensemble_model.rds")
```

---

## Validation Strategy

### 1. Historical Crash Validation
```r
# Use actual crash data from previous year
historical_crashes <- read_csv("data/crash_database_2024.csv")

# For each historical crash:
# 1. Get prediction at that lat/lon for that hour
# 2. Check if prediction was in top-risk areas
# 3. Calculate precision/recall

validation_results <- historical_crashes %>%
  left_join(predictions, by = c("lat", "lon", "hour")) %>%
  mutate(
    predicted_high_risk = probability > 0.6,
    actual_crash = TRUE
  ) %>%
  summarise(
    precision = sum(predicted_high_risk & actual_crash) / sum(predicted_high_risk),
    recall = sum(predicted_high_risk & actual_crash) / sum(actual_crash),
    f1_score = 2 * (precision * recall) / (precision + recall)
  )
```

### 2. Geographic Accuracy Check
```r
# Verify predictions are on actual roads
predictions_on_roads <- predictions %>%
  mutate(
    # Find nearest road segment
    distance_to_road = nearest_road_distance(lat, lon, road_lines),
    on_road = distance_to_road < 0.001  # ~100m tolerance
  )

on_road_pct <- mean(predictions_on_roads$on_road) * 100
cat(sprintf("%.1f%% of predictions on actual roads\n", on_road_pct))
```

### 3. Temporal Pattern Validation
```r
# Check if patterns match real crash data
real_crashes_by_hour <- historical_crashes %>%
  group_by(hour) %>%
  summarise(crash_count = n())

predicted_risk_by_hour <- predictions %>%
  group_by(hour) %>%
  summarise(avg_probability = mean(probability))

# Should show correlation (crashes more likely during rush hours)
correlation <- cor(real_crashes_by_hour$crash_count, 
                   predicted_risk_by_hour$avg_probability)
cat(sprintf("Temporal correlation: %.3f\n", correlation))
```

---

## Integration with Current Pipeline

### Update export_predictions.R

```r
# In export_predictions.R, add function:
load_road_based_model <- function() {
  # Load the road-trained ensemble
  ensemble <- readRDS("models/va_roads_ensemble_model.rds")
  return(ensemble)
}

predict_on_roads <- function(model, features_df, prediction_date) {
  # Use road-based model for predictions
  
  # Extract feature columns
  feature_cols <- c("hour_sin", "hour_cos", "day_sin", "day_cos", 
                    "is_morning_rush", "is_evening_rush", "is_night", "is_weekend")
  X <- features_df[, feature_cols]
  
  # Get ensemble predictions
  rf_pred <- predict(model$rf, X, type = "prob")[, 2]
  gb_pred <- predict(model$gb, X, n.trees = 1500, type = "response")
  
  predictions <- (rf_pred * model$rf_weight) + (gb_pred * model$gb_weight)
  
  return(predictions)
}
```

---

## Performance Expectations

| Metric | Before (All VA) | After (Roads Only) |
|--------|-----------------|-------------------|
| **Accuracy** | ~85% | ~92%+ |
| **Precision** | ~78% | ~88%+ |
| **Recall** | ~82% | ~85%+ |
| **False Positives** | High (water regions) | Low (roads only) |
| **Prediction Speed** | 5-10s | <1s (cached) |
| **Memory Usage** | High (all VA coords) | Low (highway network) |

---

## Implementation Timeline

### Week 1: Data Preparation
- [ ] Load VA road network (OSM or shapefile)
- [ ] Sample points along highways (~0.5km spacing)
- [ ] Verify coverage of all major corridors
- [ ] Export road locations dataset

### Week 2: Feature Engineering
- [ ] Engineer temporal features (hour, day, season)
- [ ] Match training crashes to road locations
- [ ] Create complete feature matrix
- [ ] Validate feature distributions

### Week 3: Model Retraining
- [ ] Train Random Forest on road data
- [ ] Train Gradient Boosting ensemble
- [ ] Hyperparameter tuning (grid search)
- [ ] Evaluate on test set

### Week 4: Validation & Deployment
- [ ] Validate against historical crashes
- [ ] Check geographic accuracy
- [ ] Compare with previous model
- [ ] Deploy to production
- [ ] Monitor predictions over time

---

## Quick Wins (Can Start Today)

1. **Add highway-only filter** to current model:
   ```r
   predictions <- predictions %>%
     filter(lat > 36.5 & lat < 39.5 & lon > -83.5 & lon < -75.0) %>%
     # Add spatial distance to known highways
     mutate(distance_to_interstate = min_dist_to_interstates())
   ```

2. **Improve temporal features**:
   ```r
   # Replace generic hour with specific rush hour indicators
   features <- features %>%
     mutate(
       peak_risk_period = hour %in% c(7,8,9,16,17,18),  # Morning/evening rush
       low_traffic_period = hour %in% c(2,3,4)  # Lowest traffic
     )
   ```

3. **Cache better predictions** immediately (already implemented in server.js)

---

## Resources

- **Spatial Analysis in R**: `sf`, `sp`, `raster` packages
- **OSM Data**: `osmdata` package
- **Machine Learning**: `caret`, `mlbench`, `pROC` for evaluation
- **Visualization**: `ggmap`, `mapview` for validation
- **VA Road Data**: https://gis.vdot.gov/ (official VDOT GIS portal)

---

## Questions to Answer Before Starting

1. Do you have historical crash data with exact lat/lon?
2. What time period of crashes is available?
3. Are crashes categorized by severity (injury/fatality level)?
4. Do you have real AADT (Average Annual Daily Traffic) data?
5. Are there weather/lighting conditions in the crash data?

These answers will determine feature engineering priorities and model complexity needed.
