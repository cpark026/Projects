# R Script: Export Predictions Using Real Crash Data (Matching Training Approach)
# This script replicates the feature engineering from UpdatedModelTraining.R
# and uses the trained accident_prediction_model_improved.rds to predict crash counts

library(dplyr)
library(readr)
library(lubridate)
library(randomForest)
library(gbm)

# Setup
if (exists("rstudioapi") && rstudioapi::isAvailable()) {
  script_dir <- dirname(rstudioapi::getActiveDocumentContext()$path)
  setwd(script_dir)
} else {
  script_file <- commandArgs()[grep("--file=", commandArgs())]
  if (length(script_file) > 0) {
    script_dir <- dirname(sub("--file=", "", script_file[1]))
    setwd(script_dir)
  }
}

args <- commandArgs(trailingOnly = TRUE)
prediction_date <- if (length(args) > 0) args[1] else Sys.Date()

if (is.character(prediction_date)) {
  prediction_date <- as.Date(prediction_date, format = "%Y-%m-%d")
} else {
  prediction_date <- as.Date(prediction_date)
}

cat("═══════════════════════════════════════════════════════════════\n")
cat("Virginia Crash Prediction - Real Data Locations\n")
cat("Date:", format(prediction_date, "%Y-%m-%d"), "\n")
cat("═══════════════════════════════════════════════════════════════\n")

# STEP 1: Check cache
cat("\n[1/5] Checking cache...\n")
cache_dir <- "../data/cache"
cache_file <- file.path(cache_dir, paste0("predictions_", format(prediction_date, "%Y-%m-%d"), ".csv"))

if (dir.exists(cache_dir) && file.exists(cache_file)) {
  cat("✓ Cache hit!\n")
  predictions <- read_csv(cache_file, show_col_types = FALSE)
  write_csv(predictions, "../data/crash_predictions.csv")
  cat("✓ Done!\n")
  quit(save = "no")
}

# STEP 2: Load real crash data
cat("\n[2/5] Loading crash data...\n")

crash_data_path <- "../../CrashData_test_6478750435646127290.csv"

if (!file.exists(crash_data_path)) {
  cat("✗ Crash data not found at:", crash_data_path, "\n")
  quit(save = "no", status = 1)
}

tryCatch({
  # Read crash data with proper column types
  accidents <- read.csv(crash_data_path, stringsAsFactors = FALSE)
  
  cat("✓ Loaded", nrow(accidents), "crash records\n")
  
  # Preprocess like training data
  accidents_model <- accidents %>%
    mutate(
      Crash.Date = mdy_hms(Crash.Date),
      month = month(Crash.Date),
      day_of_week = wday(Crash.Date),
      hour = hour(Crash.Date),
      is_weekend = ifelse(day_of_week %in% c(1, 7), 1, 0),
      is_rush_hour = ifelse(hour %in% c(7:9, 16:18), 1, 0),
      is_night = ifelse(hour >= 22 | hour <= 5, 1, 0),
      season = case_when(
        month %in% c(12, 1, 2) ~ "Winter",
        month %in% c(3, 4, 5) ~ "Spring",
        month %in% c(6, 7, 8) ~ "Summer",
        TRUE ~ "Fall"
      ),
      x_broad = round(x, 2),
      y_broad = round(y, 2),
      location_cluster = paste(x_broad, y_broad, sep = ",")
    ) %>%
    filter(!is.na(x) & !is.na(y) & !is.na(Crash.Date))
  
  cat("✓ Preprocessed", nrow(accidents_model), "records\n")
  
  # Create location features (matching training process)
  cat("\n[3/5] Engineering features...\n")
  
  training_data <- accidents_model %>%
    group_by(location_cluster) %>%
    summarise(
      x = mean(x, na.rm = TRUE),
      y = mean(y, na.rm = TRUE),
      accident_count = n(),
      
      # Road characteristics
      roadway_surface_type = names(sort(table(Roadway.Surface.Type), decreasing = TRUE))[1],
      roadway_alignment = names(sort(table(Roadway.Alignment), decreasing = TRUE))[1],
      roadway_description = names(sort(table(Roadway.Description), decreasing = TRUE))[1],
      intersection_type = names(sort(table(Intersection.Type), decreasing = TRUE))[1],
      relation_to_roadway = names(sort(table(Relation.To.Roadway), decreasing = TRUE))[1],
      
      # Environmental
      weather = names(sort(table(Weather.Condition), decreasing = TRUE))[1],
      light = names(sort(table(Light.Condition), decreasing = TRUE))[1],
      surface_condition = names(sort(table(Roadway.Surface.Condition), decreasing = TRUE))[1],
      collision_type = names(sort(table(Collision.Type), decreasing = TRUE))[1],
      
      # Time features
      avg_month = mean(month, na.rm = TRUE),
      avg_day_of_week = mean(day_of_week, na.rm = TRUE),
      avg_hour = mean(hour, na.rm = TRUE),
      
      # Temporal patterns
      pct_weekend = mean(is_weekend, na.rm = TRUE),
      pct_rush_hour = mean(is_rush_hour, na.rm = TRUE),
      pct_night = mean(is_night, na.rm = TRUE),
      
      # Risk factors
      pct_alcohol = mean(Alcohol. == "Yes", na.rm = TRUE),
      pct_distracted = mean(Distracted. == "Yes", na.rm = TRUE),
      pct_speeding = mean(Speed. == "Yes", na.rm = TRUE),
      pct_drowsy = mean(Drowsy. == "Yes", na.rm = TRUE),
      pct_drug = mean(Drug.Related. == "Yes", na.rm = TRUE),
      pct_unrestrained = mean(Unrestrained. == "Belted", na.rm = TRUE),
      pct_hitrun = mean(Hitrun. == "Yes", na.rm = TRUE),
      pct_motorcycle = mean(Motorcycle. == "Yes", na.rm = TRUE),
      pct_pedestrian = mean(Pedestrian. == "Yes", na.rm = TRUE),
      
      # Severity
      pct_fatal = mean(Crash.Severity == "Fatal" | Crash.Severity == "K", na.rm = TRUE),
      avg_persons_injured = mean(Persons.Injured, na.rm = TRUE),
      avg_vehicle_count = mean(Vehicle.Count, na.rm = TRUE),
      total_killed = sum(K_People, na.rm = TRUE),
      
      # Special conditions
      pct_work_zone = mean(Work.Zone.Related == "1. Yes", na.rm = TRUE),
      pct_school_zone = mean(School.Zone == "1. Yes", na.rm = TRUE),
      has_traffic_signal = mean(Traffic.Control.Type == "3. Traffic Signal", na.rm = TRUE),
      
      # Demographics
      pct_senior = mean(Senior. == "Yes", na.rm = TRUE),
      pct_young = mean(Young. == "Yes", na.rm = TRUE),
      
      .groups = "drop"
    )
  
  # Convert factors
  training_data <- training_data %>%
    mutate(
      roadway_surface_type = as.factor(roadway_surface_type),
      roadway_alignment = as.factor(roadway_alignment),
      roadway_description = as.factor(roadway_description),
      intersection_type = as.factor(intersection_type),
      relation_to_roadway = as.factor(relation_to_roadway),
      weather = as.factor(weather),
      light = as.factor(light),
      surface_condition = as.factor(surface_condition),
      collision_type = as.factor(collision_type)
    ) %>%
    na.omit()
  
  cat("✓ Generated", nrow(training_data), "location features\n")
  
  # Calculate distance to hotspots
  high_risk_centers <- training_data %>%
    top_n(10, accident_count) %>%
    select(x, y)
  
  training_data <- training_data %>%
    rowwise() %>%
    mutate(
      dist_to_hotspot = min(sqrt((x - high_risk_centers$x)^2 + 
                                  (y - high_risk_centers$y)^2))
    ) %>%
    ungroup()
  
  cat("✓ Calculated distance features\n")
  
}, error = function(e) {
  cat("✗ Error processing crash data:", conditionMessage(e), "\n")
  quit(save = "no", status = 1)
})

# STEP 3: Load model
cat("\n[4/5] Loading trained model...\n")

tryCatch({
  model_obj <- readRDS("models/accident_prediction_model_improved.rds")
  
  if (is.list(model_obj) && "rf" %in% names(model_obj)) {
    cat("✓ Loaded ensemble model (RF + GBM)\n")
    rf_model <- model_obj$rf
    gbm_model <- model_obj$gbm
    best_iter <- model_obj$best_iter
  } else {
    cat("✗ Model format not recognized\n")
    quit(save = "no", status = 1)
  }
  
}, error = function(e) {
  cat("✗ Error loading model:", conditionMessage(e), "\n")
  quit(save = "no", status = 1)
})

# STEP 4: Generate predictions
cat("\n[5/5] Generating predictions...\n")

tryCatch({
  start_time <- Sys.time()
  
  # Prepare data for GBM (numeric)
  pred_gbm <- training_data %>%
    select(-location_cluster) %>%
    mutate(across(where(is.factor), as.numeric))
  
  # Get predictions from both models
  rf_pred <- predict(rf_model, training_data)
  gbm_pred <- predict(gbm_model, pred_gbm, n.trees = best_iter)
  
  # Ensemble prediction
  ensemble_pred <- (rf_pred + gbm_pred) / 2
  
  # Convert to probability-like scale (0-1) for display
  # Normalize by max crash count
  max_crashes <- max(training_data$accident_count, na.rm = TRUE)
  probability <- pmin(1, ensemble_pred / (max_crashes / 2))
  
  predictions <- training_data %>%
    select(x, y, location_cluster) %>%
    mutate(
      lat = y,
      lon = x,
      hour = 12,  # Default to midday
      probability = pmax(0.1, pmin(0.9, probability)),
      confidence_score = round(probability * 100),
      date = format(prediction_date, "%Y-%m-%d"),
      crash_count_prediction = ensemble_pred,
      name = location_cluster
    ) %>%
    select(lat, lon, probability, confidence_score, hour, date, name, crash_count_prediction)
  
  elapsed <- difftime(Sys.time(), start_time, units = "secs")
  cat("✓ Generated", nrow(predictions), "predictions in", 
      round(as.numeric(elapsed), 2), "seconds\n")
  
}, error = function(e) {
  cat("✗ Error generating predictions:", conditionMessage(e), "\n")
  quit(save = "no", status = 1)
})

# STEP 5: Export and cache
cat("\nExporting predictions...\n")

write_csv(predictions, "../data/crash_predictions.csv")
cat("✓ Exported to crash_predictions.csv\n")

if (!dir.exists(cache_dir)) {
  dir.create(cache_dir, showWarnings = FALSE)
}
write_csv(predictions, cache_file)
cat("✓ Cached for future use\n")

# Summary
cat("\n═══════════════════════════════════════════════════════════════\n")
cat("Summary Statistics:\n")
cat("═══════════════════════════════════════════════════════════════\n")
cat("Total predictions:    ", nrow(predictions), "\n")
cat("Unique locations:     ", n_distinct(predictions$name), "\n")
cat("Prob range:           ", sprintf("%.3f - %.3f", min(predictions$probability), max(predictions$probability)), "\n")
cat("Avg confidence:       ", sprintf("%.1f%%", mean(predictions$confidence_score)), "\n")
cat("Crash count range:    ", sprintf("%.0f - %.0f", min(predictions$crash_count_prediction), max(predictions$crash_count_prediction)), "\n")
cat("Date:                 ", format(prediction_date, "%Y-%m-%d"), "\n")
cat("═══════════════════════════════════════════════════════════════\n\n")
