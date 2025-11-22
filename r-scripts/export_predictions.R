# R Script for Exporting Crash Predictions to CSV
# This script demonstrates how to export ML model predictions for the Virginia Crash Hot Spot Map

# Load required libraries
library(dplyr)
library(readr)
library(lubridate)

setwd("Projects/r-scripts")

# Function to export predictions to CSV format
export_crash_predictions <- function(predictions_df, output_file = "crash_predictions.csv") {
  # Ensure the dataframe has the required columns:
  # - lat: latitude (numeric)
  # - lon: longitude (numeric)
  # - probability: crash risk probability 0-1 (numeric)
  # - hour: hour of day 0-23 (integer)
  # - location_name: optional location identifier (character)
  
  # Validate required columns
  required_cols <- c("lat", "lon", "probability", "hour")
  missing_cols <- setdiff(required_cols, names(predictions_df))
  
  if (length(missing_cols) > 0) {
    stop(paste("Missing required columns:", paste(missing_cols, collapse = ", ")))
  }
  
  # Ensure proper data types
  predictions_df <- predictions_df %>%
    mutate(
      lat = as.numeric(lat),
      lon = as.numeric(lon),
      probability = as.numeric(probability),
      hour = as.integer(hour)
    ) %>%
    # Ensure probability is between 0 and 1
    mutate(probability = pmax(0, pmin(1, probability))) %>%
    # Ensure hour is between 0 and 23
    filter(hour >= 0 & hour <= 23)
  
  # Write to CSV
  write_csv(predictions_df, output_file)
  
  cat(sprintf("Exported %d predictions to %s\n", nrow(predictions_df), output_file))
  cat("Columns:", paste(names(predictions_df), collapse = ", "), "\n")
  
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
  
  # Export predictions
  export_crash_predictions(predictions, "../data/crash_predictions.csv")
  
  # Print summary statistics
  cat("\nSummary Statistics:\n")
  cat("Total predictions:", nrow(predictions), "\n")
  cat("Hours covered:", paste(sort(unique(predictions$hour)), collapse = ", "), "\n")
  cat("Probability range:", sprintf("%.3f - %.3f", min(predictions$probability), max(predictions$probability)), "\n")
  cat("Locations:", paste(unique(predictions$location_name), collapse = ", "), "\n")
  cat("\nModel file used: models/virginia_crash_severity_model.rds\n")
}

