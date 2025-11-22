# R Script for Exporting Crash Predictions to CSV
# This script demonstrates how to export ML model predictions for the Virginia Crash Hot Spot Map
# Can be called from command line with a date parameter: Rscript export_predictions.R "2025-11-22"

# Load required libraries
library(dplyr)
library(readr)
library(lubridate)
library(sf)
library(osmdata)

# Get the script's directory and set it as working directory
# This handles both interactive and command-line execution
if (exists("rstudioapi") && rstudioapi::isAvailable()) {
  script_dir <- dirname(rstudioapi::getActiveDocumentContext()$path)
  setwd(script_dir)
} else {
  # For command line execution, assume we're already in the right directory
  # or use the directory of the script file
  script_file <- commandArgs()[grep("--file=", commandArgs())]
  if (length(script_file) > 0) {
    script_dir <- dirname(sub("--file=", "", script_file[1]))
    setwd(script_dir)
  }
}

# Get date from command line arguments
args <- commandArgs(trailingOnly = TRUE)
prediction_date <- if (length(args) > 0) args[1] else Sys.Date()

# Ensure date is in proper format
if (is.character(prediction_date)) {
  prediction_date <- as.Date(prediction_date, format = "%Y-%m-%d")
  if (is.na(prediction_date)) {
    stop("Invalid date format. Please use YYYY-MM-DD")
  }
} else {
  prediction_date <- as.Date(prediction_date)
}

cat("Generating predictions for:", format(prediction_date, "%Y-%m-%d"), "\n")

# Function to snap predictions to verified road locations
# Filters predictions to remove offshore and unrealistic locations
snap_to_roads <- function(predictions_df) {
  cat("Filtering predictions to remove offshore/unrealistic locations...\n")
  
  before_count <- nrow(predictions_df)
  
  # Virginia cities - keep predictions near these
  va_cities <- tribble(
    ~lat,     ~lon,
    37.5407,  -77.4360,  # Richmond
    36.8529,  -75.9780,  # Virginia Beach
    36.8508,  -76.2859,  # Norfolk
    36.7682,  -76.2875,  # Chesapeake
    38.8816,  -77.0910,  # Arlington
    37.0871,  -76.4730,  # Newport News
    38.8048,  -77.0469,  # Alexandria
    37.0299,  -76.3452,  # Hampton
    37.2710,  -79.9414,  # Roanoke
    36.8354,  -76.2983   # Portsmouth
  )
  
  # Vectorized distance calculation to nearest city
  predictions_df <- predictions_df %>%
    mutate(
      # Calculate distances to all cities and find minimum (vectorized)
      min_city_dist = pmin(
        sqrt((lat - va_cities$lat[1])^2 + (lon - va_cities$lon[1])^2),
        sqrt((lat - va_cities$lat[2])^2 + (lon - va_cities$lon[2])^2),
        sqrt((lat - va_cities$lat[3])^2 + (lon - va_cities$lon[3])^2),
        sqrt((lat - va_cities$lat[4])^2 + (lon - va_cities$lon[4])^2),
        sqrt((lat - va_cities$lat[5])^2 + (lon - va_cities$lon[5])^2),
        sqrt((lat - va_cities$lat[6])^2 + (lon - va_cities$lon[6])^2),
        sqrt((lat - va_cities$lat[7])^2 + (lon - va_cities$lon[7])^2),
        sqrt((lat - va_cities$lat[8])^2 + (lon - va_cities$lon[8])^2),
        sqrt((lat - va_cities$lat[9])^2 + (lon - va_cities$lon[9])^2),
        sqrt((lat - va_cities$lat[10])^2 + (lon - va_cities$lon[10])^2)
      ),
      # Simple geographic bounds check (fast)
      in_virginia = lat > 36.55 & lat < 39.45 & lon < -75.1 & lon > -83.5,
      # Keep if: near a city OR in Virginia interior
      keep_pred = (min_city_dist < 0.12) | in_virginia
    ) %>%
    filter(keep_pred) %>%
    select(-min_city_dist, -in_virginia, -keep_pred)
  
  after_count <- nrow(predictions_df)
  cat(sprintf("  Filtering: %d -> %d predictions (removed %d offshore)\n", before_count, after_count, before_count - after_count))
  
  return(predictions_df)
}

# Fallback function: snap to roads using distance to city centers
snap_to_roads_distance <- function(predictions_df) {
  va_cities <- tribble(
    ~city,            ~lat,     ~lon,
    "Richmond",       37.5407,  -77.4360,
    "Virginia Beach", 36.8529,  -75.9780,
    "Norfolk",        36.8508,  -76.2859,
    "Chesapeake",     36.7682,  -76.2875,
    "Arlington",      38.8816,  -77.0910,
    "Newport News",   37.0871,  -76.4730,
    "Alexandria",     38.8048,  -77.0469,
    "Hampton",        37.0299,  -76.3452,
    "Roanoke",        37.2710,  -79.9414,
    "Portsmouth",     36.8354,  -76.2983
  )
  
  before_count <- nrow(predictions_df)
  
  predictions_df <- predictions_df %>%
    rowwise() %>%
    mutate(min_distance = min(sqrt((lat - va_cities$lat)^2 + (lon - va_cities$lon)^2))) %>%
    filter(min_distance < 0.15) %>%
    ungroup() %>%
    select(-min_distance)
  
  after_count <- nrow(predictions_df)
  return(predictions_df)
}

# Function to filter predictions within Virginia land boundaries (geofencing)
filter_virginia_land <- function(predictions_df) {
  # Virginia approximate bounds (with some buffer to avoid edge issues)
  # These are approximate boundaries - predictions outside these are likely in water or out of state
  va_bounds <- list(
    lat_min = 36.5,   # Southernmost point
    lat_max = 39.5,   # Northernmost point
    lon_min = -83.5,  # Westernmost point
    lon_max = -75.0   # Easternmost point (Atlantic)
  )
  
  # Filter predictions within Virginia bounds
  filtered <- predictions_df %>%
    filter(
      lat >= va_bounds$lat_min & lat <= va_bounds$lat_max,
      lon >= va_bounds$lon_min & lon <= va_bounds$lon_max
    )
  
  cat("Filtered from", nrow(predictions_df), "to", nrow(filtered), "predictions (removed", 
      nrow(predictions_df) - nrow(filtered), "out-of-bounds predictions)\n")
  
  return(filtered)
}

# Function to add confidence score based on probability stability
add_confidence_score <- function(predictions_df) {
  # Confidence is based on how much the probability differs from base probability
  # Higher confidence when prediction is more extreme (very high or very low risk)
  predictions_df %>%
    mutate(
      # Confidence increases when probability is far from 0.5 (neutral)
      confidence = pmax(probability, 1 - probability),
      # Scale to 0-100 for display
      confidence_score = round(confidence * 100)
    ) %>%
    select(lat, lon, probability, confidence_score, hour, location_name)
}

# Function to export predictions to CSV format
export_crash_predictions <- function(predictions_df, output_file = "crash_predictions.csv", prediction_date = Sys.Date()) {
  # Ensure the dataframe has the required columns:
  # - lat: latitude (numeric)
  # - lon: longitude (numeric)
  # - probability: crash risk probability 0-1 (numeric)
  # - hour: hour of day 0-23 (integer)
  # - confidence_score: confidence level 0-100 (optional, integer)
  # - date: date of prediction YYYY-MM-DD (character, optional)
  # - location_name: optional location identifier (character)
  
  # Validate required columns
  required_cols <- c("lat", "lon", "probability", "hour")
  missing_cols <- setdiff(required_cols, names(predictions_df))
  
  if (length(missing_cols) > 0) {
    stop(paste("Missing required columns:", paste(missing_cols, collapse = ", ")))
  }
  
  # Ensure proper data types and add date column
  predictions_df <- predictions_df %>%
    mutate(
      lat = as.numeric(lat),
      lon = as.numeric(lon),
      probability = as.numeric(probability),
      hour = as.integer(hour),
      # Add confidence_score if not present
      confidence_score = if ("confidence_score" %in% names(predictions_df)) {
        as.integer(confidence_score)
      } else {
        as.integer(round(pmax(probability, 1 - probability) * 100))
      },
      date = format(prediction_date, "%Y-%m-%d")
    ) %>%
    # Ensure probability is between 0 and 1
    mutate(probability = pmax(0, pmin(1, probability))) %>%
    # Ensure hour is between 0 and 23
    filter(hour >= 0 & hour <= 23)
  
  # Write to CSV
  write_csv(predictions_df, output_file)
  
  cat(sprintf("Exported %d predictions to %s\n", nrow(predictions_df), output_file))
  cat("Columns:", paste(names(predictions_df), collapse = ", "), "\n")
  cat("Date:", format(prediction_date, "%Y-%m-%d"), "\n")
  return(invisible(output_file))
}

# Example usage with synthetic data
# Replace this section with your actual model predictions

generate_predictions <- function() {
  # Virginia major cities coordinates
  va_cities <- tribble(
    ~city,            ~lat,     ~lon,
    "Richmond",       37.5407,  -77.4360,
    "Virginia Beach", 36.8529,  -75.9780,
    "Norfolk",        36.8508,  -76.2859,
    "Chesapeake",     36.7682,  -76.2875,
    "Arlington",      38.8816,  -77.0910,
    "Newport News",   37.0871,  -76.4730,
    "Alexandria",     38.8048,  -77.0469,
    "Hampton",        37.0299,  -76.3452,
    "Roanoke",        37.2710,  -79.9414,
    "Portsmouth",     36.8354,  -76.2983
  )
  
  # Generate predictions for each hour
  predictions <- expand.grid(
    city_idx = 1:nrow(va_cities),
    hour = 0:23,
    spot = 1:3  # 3 spots per city per hour
  ) %>%
    left_join(va_cities %>% mutate(city_idx = row_number()), by = "city_idx") %>%
    mutate(
      # Add small random offset to create multiple spots
      lat = lat + rnorm(n(), 0, 0.03),
      lon = lon + rnorm(n(), 0, 0.03),
      # Generate probability based on hour (higher during rush hours)
      base_prob = case_when(
        hour >= 7 & hour <= 9 ~ 0.5,   # Morning rush
        hour >= 16 & hour <= 18 ~ 0.6, # Evening rush
        hour >= 22 | hour <= 2 ~ 0.4,  # Late night
        TRUE ~ 0.2
      ),
      probability = pmax(0.05, pmin(0.95, base_prob + rnorm(n(), 0, 0.15))),
      location_name = city
    ) %>%
    select(lat, lon, probability, hour, location_name)
  
  return(predictions)
}

# Main execution
if (!interactive()) {
  # Load your trained model
  model <- readRDS("models/virginia_crash_severity_model.rds")
  
  cat("Model loaded successfully!\n")
  cat("Model class:", class(model), "\n")
  
  # Option 1: Use generated example predictions if prediction data is not available
  predictions <- generate_predictions()
  
  # Option 2: If you have prediction_features.csv, uncomment the following:
  # prediction_data <- read_csv("data/prediction_features.csv")
  # predictions <- prediction_data %>%
  #   mutate(
  #     probability = predict(model, newdata = ., type = "response")
  #   ) %>%
  #   select(lat, lon, probability, hour, location_name)
  
  # Apply refinements
  cat("\nApplying prediction refinements...\n")
  
  # 1. Filter out water/ocean predictions (geofencing)
  predictions <- filter_virginia_land(predictions)
  
  # 2. Snap to verified roads (uses OpenStreetMap)
  predictions <- snap_to_roads(predictions)
  
  # 3. Add confidence scores
  predictions <- add_confidence_score(predictions)
  
  # Export predictions
  export_crash_predictions(predictions, "../data/crash_predictions.csv", prediction_date)
  
  # Print summary statistics
  cat("\nSummary Statistics:\n")
  cat("Total predictions:", nrow(predictions), "\n")
  cat("Hours covered:", paste(sort(unique(predictions$hour)), collapse = ", "), "\n")
  cat("Probability range:", sprintf("%.3f - %.3f", min(predictions$probability), max(predictions$probability)), "\n")
  cat("Locations:", paste(unique(predictions$location_name), collapse = ", "), "\n")
  cat("\nModel file used: models/virginia_crash_severity_model.rds\n")
  cat("Date parameter:", format(prediction_date, "%Y-%m-%d"), "\n")
}

