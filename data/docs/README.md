# Virginia Crash Hot Spot Map - Interactive Hourly Predictions

## Overview

This project provides an interactive web-based map that visualizes predicted crash hot spots across Virginia for any hour of the day using machine learning model predictions trained on historical crash data from 2017-2025.

![Virginia Crash Hot Spot Map](https://img.shields.io/badge/Status-Active-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue)

## Features

- **Interactive Map**: Web-based visualization using Leaflet.js with smooth panning and zooming
- **Hourly Time Slider**: View crash risk predictions for any hour (0:00 - 23:00)
- **Risk Threshold Filter**: Adjust minimum risk level to focus on high-risk areas
- **Color-Coded Risk Levels**: Seven-tier color scheme from very low to very high risk
- **Detailed Popups**: Click markers to see location details, risk probability, and hour
- **Marker Clustering**: Automatic grouping of nearby markers for better performance
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Sample Data**: Includes demonstration data for immediate testing

## Quick Start

### 1. Setup

No installation required! Simply open the HTML file in a web browser:

```bash
# Clone the repository
git clone https://github.com/cpark026/Projects.git
cd Projects

# Open in browser
open index.html
# Or for Linux:
xdg-open index.html
# Or for Windows:
start index.html
```

### 2. Using the Map

1. **View Predictions**: The map loads with sample data automatically
2. **Change Hour**: Use the hour slider to view predictions for different times
3. **Filter Risk**: Adjust the risk threshold slider to show only higher-risk locations
4. **Explore Details**: Click on any marker to see detailed information
5. **Reset View**: Click "Reset View" to return to the default Virginia view

## Data Format

### CSV Format for Predictions

The map expects prediction data in CSV format with the following columns:

```csv
lat,lon,probability,hour,location_name
37.5407,-77.4360,0.65,8,Richmond
36.8529,-75.9780,0.55,17,Virginia Beach
38.8816,-77.0910,0.78,18,Arlington
```

**Column Descriptions:**

| Column | Type | Range/Format | Description |
|--------|------|--------------|-------------|
| `lat` | numeric | -90 to 90 | Latitude coordinate |
| `lon` | numeric | -180 to 180 | Longitude coordinate |
| `probability` | numeric | 0.0 to 1.0 | Crash risk probability |
| `hour` | integer | 0 to 23 | Hour of day (24-hour format) |
| `location_name` | string | any | Optional location identifier |

### Example Data Structure

```r
# R data frame structure
predictions <- data.frame(
  lat = c(37.5407, 36.8529, 38.8816),
  lon = c(-77.4360, -75.9780, -77.0910),
  probability = c(0.65, 0.55, 0.78),
  hour = c(8, 17, 18),
  location_name = c("Richmond", "Virginia Beach", "Arlington")
)
```

## Exporting Predictions from R Studio

### Method 1: Using the Provided R Script

```bash
cd r-scripts
Rscript export_predictions.R
```

### Method 2: From Your ML Model

```r
# Load required libraries
library(dplyr)
library(readr)

# Load your trained model
model <- readRDS("path/to/your/model.rds")

# Create or load prediction features
prediction_data <- read_csv("prediction_features.csv")

# Make predictions
predictions <- prediction_data %>%
  mutate(
    probability = predict(model, newdata = ., type = "response")
  ) %>%
  select(lat, lon, probability, hour, location_name)

# Export to CSV
write_csv(predictions, "data/crash_predictions.csv")
```

### Method 3: Direct Export Function

```r
# Source the export function
source("r-scripts/export_predictions.R")

# Export your predictions
export_crash_predictions(your_predictions_df, "data/crash_predictions.csv")
```

## Project Structure

```
Projects/
├── index.html                      # Main HTML page
├── assets/
│   ├── css/
│   │   └── styles.css             # Styling
│   └── js/
│       └── app.js                 # Main application logic
├── data/
│   └── crash_predictions.csv      # Sample prediction data
├── r-scripts/
│   └── export_predictions.R       # R script for data export
├── docs/
│   └── README.md                  # This documentation
└── Read.ME                         # Repository info
```

## Risk Level Classification

The map uses a seven-tier risk classification system:

| Risk Level | Probability Range | Color | Description |
|------------|-------------------|-------|-------------|
| Very High | 0.8 - 1.0 | Dark Red (#800026) | Extreme caution advised |
| High | 0.6 - 0.8 | Red (#BD0026) | High accident probability |
| Moderate-High | 0.5 - 0.6 | Orange-Red (#E31A1C) | Elevated risk |
| Moderate | 0.4 - 0.5 | Orange (#FC4E2A) | Moderate risk |
| Low-Moderate | 0.3 - 0.4 | Light Orange (#FD8D3C) | Slightly elevated risk |
| Low | 0.2 - 0.3 | Yellow (#FEB24C) | Low risk |
| Very Low | 0.0 - 0.2 | Light Yellow (#FED976) | Minimal risk |

## Technical Details

### Technologies Used

- **Leaflet.js 1.9.4**: Interactive map library
- **Leaflet.markercluster**: Marker clustering for performance
- **OpenStreetMap**: Base map tiles
- **Vanilla JavaScript**: No framework dependencies
- **CSS3**: Modern styling with flexbox and gradients

### Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

### Performance

- Efficient marker clustering handles thousands of data points
- Dynamic filtering updates in real-time
- Optimized for mobile and desktop viewing

## Customization

### Changing Map Center and Zoom

Edit `assets/js/app.js`:

```javascript
// Line ~10
map = L.map('map').setView([37.5407, -78.8], 7);
//                           [lat, lon], zoom
```

### Modifying Risk Colors

Edit the `getRiskColor()` function in `assets/js/app.js`:

```javascript
function getRiskColor(probability) {
    if (probability >= 0.8) return '#800026';  // Change colors here
    if (probability >= 0.6) return '#BD0026';
    // ... etc
}
```

### Adjusting Default Values

Edit `assets/js/app.js`:

```javascript
let currentHour = 12;        // Default hour (12:00)
let currentThreshold = 0.3;  // Default risk threshold
```

## Integration with ML Models

### Step-by-Step Integration

1. **Train Your Model**: Use R Studio to train your crash prediction model on 2017-2025 data

2. **Generate Predictions**: Create predictions for each location and hour
   ```r
   predictions <- predict(model, newdata = features, type = "response")
   ```

3. **Format Data**: Ensure data includes lat, lon, probability, hour, location_name

4. **Export CSV**: Use the provided R script or create your own export function

5. **Update Map**: Place the CSV file in the `data/` directory

6. **Load Data**: The map will automatically load `data/crash_predictions.csv`

### Example ML Workflow

```r
# 1. Load historical crash data
crash_data <- read_csv("virginia_crashes_2017_2025.csv")

# 2. Prepare features (location, time, weather, road conditions, etc.)
features <- prepare_features(crash_data)

# 3. Train model
model <- train_crash_model(features, crashes)

# 4. Generate predictions for each grid point and hour
grid_points <- create_virginia_grid()
predictions <- expand.grid(
  lat = grid_points$lat,
  lon = grid_points$lon,
  hour = 0:23
) %>%
  add_features() %>%
  mutate(probability = predict(model, newdata = ., type = "response"))

# 5. Export
write_csv(predictions, "data/crash_predictions.csv")
```

## Loading Custom Data

### Option 1: Replace Sample Data

Place your CSV file at `data/crash_predictions.csv` and reload the page.

### Option 2: Load from Different Location

Modify `assets/js/app.js`:

```javascript
// Change the default data path
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    initEventListeners();
    loadData('path/to/your/predictions.csv');
});
```

### Option 3: Dynamic Loading

Use the "Load Sample Data" button to trigger data loading, or modify it to load your custom file.

## Troubleshooting

### Map Not Displaying

- **Issue**: Blank map area
- **Solution**: Check browser console for errors. Ensure internet connection for loading map tiles.

### No Markers Showing

- **Issue**: Map loads but no markers appear
- **Solution**: 
  - Check that data is loaded (console should show "Loaded X records")
  - Verify hour slider is at a value with data
  - Lower the risk threshold slider
  - Click "Load Sample Data" to use demonstration data

### CSV Loading Errors

- **Issue**: Error loading CSV file
- **Solution**:
  - Verify file path is correct
  - Check CSV format matches specification
  - Ensure numeric columns contain valid numbers
  - Use the sample data as a template

### Performance Issues

- **Issue**: Slow map interaction with large datasets
- **Solution**:
  - Increase marker cluster radius in `app.js`
  - Filter data to include only high-risk locations
  - Aggregate predictions to reduce data points

## Deployment

### Local Deployment

Simply open `index.html` in a web browser. No server required!

### Web Server Deployment

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx http-server

# Using PHP
php -S localhost:8000
```

Then navigate to `http://localhost:8000` in your browser.

### GitHub Pages Deployment

1. Push code to GitHub repository
2. Go to repository Settings > Pages
3. Select branch and root folder
4. Your map will be available at `https://username.github.io/repository/`

### Production Deployment

For production deployment:

1. **Optimize Assets**: Minify CSS and JavaScript
2. **Use CDN**: Consider hosting large data files on a CDN
3. **Add Loading States**: Show spinners while data loads
4. **Error Handling**: Add user-friendly error messages
5. **Analytics**: Add tracking to monitor usage

## API Reference

### Main Functions

#### `initMap()`
Initializes the Leaflet map centered on Virginia.

#### `loadData(dataPath)`
Loads prediction data from CSV file or generates sample data.
- **Parameters**: `dataPath` (string, optional) - Path to CSV file
- **Returns**: Promise<boolean>

#### `updateMarkers()`
Updates map markers based on current hour and risk threshold filters.

#### `getRiskColor(probability)`
Returns color code for given risk probability.
- **Parameters**: `probability` (number) - Risk probability 0-1
- **Returns**: string (hex color code)

#### `formatHour(hour)`
Formats hour number as HH:00 string.
- **Parameters**: `hour` (number) - Hour 0-23
- **Returns**: string

### Global Variables

- `map`: Leaflet map instance
- `markerClusterGroup`: Marker cluster layer
- `crashData`: Array of prediction data
- `currentHour`: Currently selected hour (0-23)
- `currentThreshold`: Current risk threshold (0-1)

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License. See LICENSE file for details.

## Support

For questions or issues:

- Open an issue on GitHub
- Contact: @cpark026

## Acknowledgments

- Virginia Department of Transportation for crash data
- OpenStreetMap contributors for map tiles
- Leaflet.js team for the mapping library

## Future Enhancements

- [ ] Add heatmap visualization option
- [ ] Include weather condition overlays
- [ ] Time-lapse animation showing risk changes throughout the day
- [ ] Export filtered data functionality
- [ ] Integration with real-time traffic data
- [ ] Mobile app version
- [ ] Multi-state support
- [ ] Historical trend analysis

## Version History

- **v1.0.0** (2025-11-20): Initial release
  - Interactive hourly map
  - Sample data generation
  - R script for data export
  - Comprehensive documentation

---

**Last Updated**: November 20, 2025  
**Maintained By**: @cpark026
