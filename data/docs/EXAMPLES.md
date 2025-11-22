# Usage Examples

This document provides practical examples of using the Virginia Crash Hot Spot Map application.

## Basic Usage

### 1. Opening the Application

```bash
# Simply open the HTML file in your browser
open index.html

# Or start a local web server
python -m http.server 8000
# Then navigate to http://localhost:8000
```

### 2. Viewing Predictions by Hour

1. **Default View**: Map loads showing predictions for 12:00 (noon)
2. **Change Hour**: Drag the hour slider to any time from 00:00 to 23:00
3. **Observe Changes**: Markers update automatically to show that hour's predictions

### 3. Filtering by Risk Level

1. **Adjust Threshold**: Move the "Min Risk Threshold" slider
2. **Example**: Set to 0.6 to show only high and very high risk locations
3. **Result**: Lower risk locations are hidden from the map

### 4. Exploring Hot Spots

1. **Click Marker**: Click any colored dot on the map
2. **View Details**: Popup shows:
   - Location name
   - Hour of prediction
   - Risk level and probability
   - Exact coordinates
3. **Close Popup**: Click the X or click elsewhere on the map

## Advanced Usage

### Loading Custom Data

#### Method 1: Replace Sample File

```bash
# Place your predictions CSV in the data directory
cp my_predictions.csv data/crash_predictions.csv

# Reload the page - data loads automatically
```

#### Method 2: Modify JavaScript

Edit `assets/js/app.js` to load from a different location:

```javascript
// At the bottom of the file, change:
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    initEventListeners();
    loadData('path/to/your/custom_data.csv');
});
```

### Generating Predictions with R

#### Example 1: Simple Export

```r
# Load your data
library(dplyr)
library(readr)

# Your predictions dataframe
predictions <- data.frame(
  lat = c(37.5407, 36.8529),
  lon = c(-77.4360, -75.9780),
  probability = c(0.65, 0.55),
  hour = c(8, 17),
  location_name = c("Richmond", "Virginia Beach")
)

# Export
write_csv(predictions, "data/crash_predictions.csv")
```

#### Example 2: From ML Model

```r
# Load the export script
source("r-scripts/export_predictions.R")

# Load your trained model
model <- readRDS("my_crash_model.rds")

# Prepare grid of locations and hours
grid <- expand.grid(
  lat = seq(36.5, 39.5, by = 0.1),
  lon = seq(-83.7, -75.2, by = 0.1),
  hour = 0:23
)

# Add features for prediction
grid <- grid %>%
  mutate(
    # Add your features here
    day_of_week = 1,
    weather = "clear",
    # ... other features
  )

# Make predictions
predictions <- grid %>%
  mutate(
    probability = predict(model, newdata = ., type = "response"),
    location_name = "Virginia"
  ) %>%
  select(lat, lon, probability, hour, location_name)

# Export using helper function
export_crash_predictions(predictions, "data/crash_predictions.csv")
```

#### Example 3: Filtering High-Risk Only

```r
# Generate predictions
predictions <- make_predictions(model, features)

# Export only high-risk locations (probability > 0.5)
high_risk <- predictions %>%
  filter(probability >= 0.5)

write_csv(high_risk, "data/crash_predictions_high_risk.csv")
```

## Customization Examples

### Example 1: Change Default Hour

Edit `assets/js/app.js`:

```javascript
// Line ~5
let currentHour = 17;  // Change from 12 to 17 (5 PM - rush hour)
```

### Example 2: Change Default Threshold

```javascript
// Line ~6
let currentThreshold = 0.5;  // Change from 0.3 to 0.5 (show only moderate+ risk)
```

### Example 3: Customize Risk Colors

```javascript
// In getRiskColor function
function getRiskColor(probability) {
    if (probability >= 0.8) return '#8B0000';  // Dark red
    if (probability >= 0.6) return '#DC143C';  // Crimson
    if (probability >= 0.5) return '#FF4500';  // Orange red
    if (probability >= 0.4) return '#FFA500';  // Orange
    if (probability >= 0.3) return '#FFD700';  // Gold
    if (probability >= 0.2) return '#FFFF00';  // Yellow
    return '#90EE90';  // Light green
}
```

### Example 4: Change Map Center and Zoom

```javascript
// In initMap function
map = L.map('map').setView([37.4316, -78.6569], 8);  // Center on Richmond, closer zoom
```

### Example 5: Add Custom Location Labels

Edit your CSV to include descriptive location names:

```csv
lat,lon,probability,hour,location_name
37.5407,-77.4360,0.65,8,"I-95 at Broad St, Richmond"
36.8529,-75.9780,0.55,17,"I-264 Virginia Beach Blvd"
38.8816,-77.0910,0.78,18,"I-66 at Route 50, Arlington"
```

## Integration Examples

### Example 1: Automated Daily Updates

Create a cron job to regenerate predictions daily:

```bash
# crontab entry (runs at 2 AM daily)
0 2 * * * cd /path/to/project && Rscript r-scripts/export_predictions.R

# Or use a shell script
#!/bin/bash
cd /path/to/project
Rscript r-scripts/export_predictions.R
git add data/crash_predictions.csv
git commit -m "Update predictions $(date +%Y-%m-%d)"
git push
```

### Example 2: Web Server Deployment

```bash
# Using Nginx
server {
    listen 80;
    server_name crashmap.example.com;
    root /var/www/virginia-crash-map;
    index index.html;
    
    location / {
        try_files $uri $uri/ =404;
    }
}
```

### Example 3: Embed in Existing Website

```html
<!-- In your existing page -->
<iframe 
    src="https://yoursite.com/crash-map/index.html" 
    width="100%" 
    height="800px" 
    frameborder="0">
</iframe>
```

## Real-World Scenarios

### Scenario 1: Morning Rush Hour Analysis

1. Set hour slider to 08:00
2. Set threshold to 0.5 (moderate+ risk)
3. Observe concentrated hot spots near:
   - Major highway interchanges
   - Urban centers
   - School zones

### Scenario 2: Weekend Night Risk Assessment

1. Set hour slider to 23:00 (11 PM)
2. Set threshold to 0.4
3. Identify areas with elevated weekend night risk
4. Use for police patrol route planning

### Scenario 3: Compare Rush Hours

1. View 08:00 (morning rush)
2. Take note of high-risk locations
3. Change to 17:00 (evening rush)
4. Compare differences in risk patterns

### Scenario 4: High-Risk Location Report

1. Set threshold to 0.7 (high risk only)
2. Cycle through all 24 hours
3. Note locations that appear frequently
4. Generate list of persistent hot spots

## Troubleshooting Examples

### Issue: No Markers Showing

**Solution 1**: Lower threshold
```
Set "Min Risk Threshold" slider to 0.0
```

**Solution 2**: Load sample data
```
Click "Load Sample Data" button
```

**Solution 3**: Check data file
```bash
python3 validate_data.py data/crash_predictions.csv
```

### Issue: Map Not Loading

**Solution 1**: Check browser console
```
Press F12 → Console tab
Look for error messages
```

**Solution 2**: Test with local server
```bash
python -m http.server 8000
# Navigate to http://localhost:8000
```

### Issue: Incorrect Predictions Display

**Solution**: Validate your CSV format
```bash
python3 validate_data.py your_predictions.csv
```

## Performance Tips

### For Large Datasets

1. **Pre-filter data**: Export only locations with probability > 0.2
2. **Aggregate**: Combine nearby predictions into single points
3. **Reduce resolution**: Use coarser lat/lon grid (e.g., 0.05° instead of 0.01°)

```r
# Example: Pre-filter low-risk predictions
predictions %>%
  filter(probability >= 0.2) %>%
  write_csv("data/crash_predictions.csv")
```

### For Better User Experience

1. **Start with higher threshold**: Default to 0.4 instead of 0.3
2. **Limit sample data**: Use subset of full dataset for demo
3. **Add loading indicator**: Show spinner while data loads

## API Integration Example

If you want to fetch predictions dynamically from an API:

```javascript
// Modify loadData function in assets/js/app.js
async function loadDataFromAPI(hour) {
    try {
        const response = await fetch(`https://api.example.com/predictions?hour=${hour}`);
        const data = await response.json();
        crashData = data;
        updateMarkers();
    } catch (error) {
        console.error('API error:', error);
        loadData();  // Fallback to sample data
    }
}
```

## Testing Your Setup

### Quick Test Checklist

- [ ] Open index.html - page loads without errors
- [ ] Move hour slider - markers update
- [ ] Move threshold slider - fewer markers show at higher thresholds
- [ ] Click marker - popup appears with details
- [ ] Click "Load Sample Data" - map populates with demo data
- [ ] Click "Reset View" - map returns to Virginia center
- [ ] Test on mobile device - responsive layout works
- [ ] Check browser console - no JavaScript errors

### Validation Commands

```bash
# Validate CSV data
python3 validate_data.py data/crash_predictions.csv

# Check HTML structure
python3 -c "from html.parser import HTMLParser; parser = HTMLParser(); parser.feed(open('index.html').read()); print('Valid')"

# Check JavaScript syntax
node --check assets/js/app.js

# Start test server
python -m http.server 8000
```

## Support

For more examples or help:
- See full documentation: `docs/README.md`
- Check installation guide: `docs/INSTALLATION.md`
- Open an issue on GitHub
