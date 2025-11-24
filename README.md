# Virginia Crash Hot Spot Map

Interactive web-based map visualizing predicted crash hot spots across Virginia for any hour of the day using machine learning model predictions trained on historical crash data.

![Status](https://img.shields.io/badge/Status-Active-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue)

## Quick Start

### Option 1: Frontend Only (No Installation Required)
```bash
# Simply open in browser
open index.html
# Or on Windows:
start index.html
```

### Option 2: With Backend (Generate Predictions for Any Date)
```bash
# Install dependencies
npm install

# Start backend server
npm start

# Visit http://localhost:3000 and select a date to generate predictions
```

## Features

- ✅ **Interactive Map**: Web-based visualization using Leaflet.js with smooth panning/zooming
- ✅ **Hourly Time Slider**: View crash risk predictions for any hour (0:00 - 23:00)
- ✅ **Risk Threshold Filter**: Adjust minimum risk level to focus on high-risk areas
- ✅ **Color-Coded Risk Levels**: Seven-tier color scheme from very low to very high risk
- ✅ **Detailed Popups**: Click markers to see location details, probability scores, and hours
- ✅ **Marker Clustering**: Automatic grouping of nearby markers for better performance
- ✅ **Confidence Scoring**: 0-100 confidence scores indicate model certainty
- ✅ **Geographic Filtering**: Removes offshore/unrealistic predictions
- ✅ **Responsive Design**: Works on desktop, tablet, and mobile devices
- ✅ **Sample Data**: Includes demonstration data for immediate testing
- ✅ **Date-Based Predictions**: Generate predictions for any date via backend
- ✅ **Batch Processing**: Generate 31 days of predictions in ~5.5 seconds

## Project Structure

```
Projects/
├── index.html                           # Main interactive map application
├── validate_data.py                     # Data validation utility
├── IMPLEMENTATION_SUMMARY.txt           # Implementation notes
├── README.md                            # This comprehensive documentation
├── assets/
│   ├── css/
│   │   └── styles.css                   # Map styling and legend
│   └── js/
│       └── app.js                       # Leaflet map logic & interactivity
├── data/
│   ├── crash_predictions.csv            # Sample predictions
│   └── by-date/                         # Auto-generated date predictions
│       └── predictions_YYYY-MM-DD.csv   # 31 days of predictions (720 each)
└── r-scripts/
    ├── export_predictions.R             # Single-date prediction export
    ├── generate_date_range_predictions.R # Batch date range generation
    └── models/
        └── virginia_crash_severity_model.rds # Trained XGBoost model (135.62 MB)
```

## Data Format

### CSV Format for Predictions

The map expects prediction data in CSV format:

```csv
lat,lon,probability,confidence_score,hour,location_name,date
37.5407,-77.4360,0.65,85,8,Richmond,2025-11-22
36.8529,-75.9780,0.55,72,17,Virginia Beach,2025-11-22
```

**Column Descriptions:**

| Column | Type | Range | Description |
|--------|------|-------|-------------|
| `lat` | numeric | -90 to 90 | Latitude coordinate |
| `lon` | numeric | -180 to 180 | Longitude coordinate |
| `probability` | numeric | 0.0 to 1.0 | Crash risk probability |
| `confidence_score` | integer | 0 to 100 | Model confidence in prediction |
| `hour` | integer | 0 to 23 | Hour of day (24-hour format) |
| `location_name` | string | any | Location identifier (city name) |
| `date` | string | YYYY-MM-DD | Prediction date |

## Risk Level Classification

The map uses a seven-tier risk classification system:

| Risk Level | Probability | Color | Description |
|------------|-------------|-------|-------------|
| Very High | 0.8 - 1.0 | Dark Red (#800026) | Extreme caution advised |
| High | 0.6 - 0.8 | Red (#BD0026) | High accident probability |
| Moderate-High | 0.5 - 0.6 | Orange-Red (#E31A1C) | Elevated risk |
| Moderate | 0.4 - 0.5 | Orange (#FC4E2A) | Moderate risk |
| Low-Moderate | 0.3 - 0.4 | Light Orange (#FD8D3C) | Slightly elevated |
| Low | 0.2 - 0.3 | Yellow (#FEB24C) | Low risk |
| Very Low | 0.0 - 0.2 | Light Yellow (#FED976) | Minimal risk |

## Technologies & Dependencies

### Frontend
- **Leaflet.js v1.9.4** - Interactive mapping library
- **Leaflet.markercluster** - Marker clustering for performance
- **OpenStreetMap** - Base map tiles
- **Vanilla JavaScript** - No framework dependencies
- **CSS3** - Modern styling with flexbox

### Backend (Optional)
- **Node.js** - Backend server
- **Express.js** - Web framework

### ML & Data Processing
- **R 4.5.1** with dplyr - Data processing and predictions
- **XGBoost** - Gradient boosting model

### Browser Compatibility
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

## Installation & Setup

### Prerequisites

**For Frontend Only:**
- Web browser (any modern browser)

**For Backend & Predictions:**
- Node.js (https://nodejs.org)
- R 4.5.1 or later (https://www.r-project.org)
- Git (for cloning repository)

### Step 1: Clone Repository

```bash
git clone https://github.com/cpark026/Projects.git
cd Projects
```

### Step 2: Frontend Setup (No Additional Installation)

```bash
# Simply open in browser
open index.html
# Map loads with sample data automatically
```

### Step 3: Backend Setup (Optional - For Date-Based Predictions)

```bash
# Install Node.js dependencies
npm install

# Start the backend server
npm start

# Server runs on http://localhost:3000
```

### Step 4: R Dependencies (For Generating Predictions)

Verify R and Rscript are installed:
```powershell
Rscript --version
```

If not in PATH, add R bin folder to system PATH:
- Windows: `C:\Program Files\R\R-x.x.x\bin`
- Restart terminal after adding to PATH

## Usage Guide

### Using the Interactive Map

1. **Open Application**: Load `index.html` in web browser
2. **View Predictions**: Map displays sample data automatically
3. **Change Hour**: Drag the hour slider (0-23) to view predictions for different times
4. **Filter Risk**: Adjust the "Min Risk Threshold" slider to show only higher-risk areas
5. **Explore Details**: Click any marker to see location details and risk probability
6. **Reset View**: Click "Reset View" button to return to full Virginia view

### Generate Predictions for a Single Date

```powershell
# Generate predictions for November 22, 2025
Rscript r-scripts/export_predictions.R "2025-11-22"

# Output: data/by-date/predictions_2025-11-22.csv
```

### Generate Predictions for Multiple Dates (31 days)

```powershell
# Generate all 31 days automatically
Rscript r-scripts/generate_date_range_predictions.R

# Output: 31 CSV files in data/by-date/ (5.5 seconds total)
```

### Run Backend API Server

```powershell
# Install dependencies
npm install

# Start server
npm start

# Backend API endpoints:
# GET http://localhost:3000 - Main page
# POST http://localhost:3000/api/predictions - Generate predictions by date
```

### Load Custom Data

#### Method 1: Replace Sample File
```bash
# Place your CSV file at:
cp your_predictions.csv data/crash_predictions.csv

# Reload the page - data loads automatically
```

#### Method 2: Modify JavaScript
Edit `assets/js/app.js`:
```javascript
// Change the data path
loadData('path/to/your/custom_predictions.csv');
```

## Exporting Predictions from R

### Using the Provided Script

```r
# Source the export function
source("r-scripts/export_predictions.R")

# The script automatically:
# 1. Loads your trained model
# 2. Generates predictions for major Virginia cities
# 3. Applies geographic filtering (removes offshore predictions)
# 4. Adds confidence scores
# 5. Exports to CSV with date column
```

### Custom Export Function

```r
# Load required libraries
library(dplyr)
library(readr)

# Load your trained model
model <- readRDS("r-scripts/models/virginia_crash_severity_model.rds")

# Create prediction data
predictions <- data.frame(
  lat = c(37.5407, 36.8529),
  lon = c(-77.4360, -75.9780),
  probability = c(0.65, 0.55),
  hour = c(8, 17),
  location_name = c("Richmond", "Virginia Beach"),
  date = "2025-11-22"
)

# Export to CSV
write_csv(predictions, "data/crash_predictions.csv")
```

## Customization

### Change Map Center and Zoom

Edit `assets/js/app.js`:
```javascript
// Line ~10
map = L.map('map').setView([37.5407, -78.8], 7);
//                           [lat, lon], zoom level
```

### Modify Risk Colors

Edit the `getRiskColor()` function in `assets/js/app.js`:
```javascript
function getRiskColor(probability) {
    if (probability >= 0.8) return '#800026';  // Dark Red
    if (probability >= 0.6) return '#BD0026';  // Red
    if (probability >= 0.5) return '#E31A1C';  // Orange-Red
    // ... etc
}
```

### Adjust Default Values

Edit `assets/js/app.js`:
```javascript
const DEFAULT_RISK_THRESHOLD = 0.3;  // Default risk threshold (0-1)
const DEFAULT_HOUR = 12;              // Default hour (0-23)
```

### Change Default Marker Cluster Radius

Edit `assets/js/app.js`:
```javascript
markerClusterGroup = L.markerClusterGroup({
    maxClusterRadius: 80  // Increase to cluster more markers
});
```

## Troubleshooting

### Map Not Displaying

**Problem**: Blank map area  
**Solution**: 
- Check browser console (F12) for errors
- Verify internet connection (needed for map tiles from OpenStreetMap)
- Try a different browser
- Check if ad blocker is blocking resources

### No Markers Showing

**Problem**: Map loads but no markers appear  
**Solution**:
- Check that data is loaded (console should show "Loaded X records")
- Verify hour slider is at a value with data
- Lower the risk threshold slider
- Click "Load Sample Data" to use demonstration data

### CSV Loading Errors

**Problem**: Error loading CSV file  
**Solution**:
- Verify file path is correct
- Check CSV format matches specification (7 columns)
- Ensure numeric columns contain valid numbers
- Use sample data as template
- Check file has proper line endings (CRLF or LF)

### "Rscript not found"

**Problem**: R script execution fails  
**Solution**:
- R is not in your system PATH
- **Windows**: Add `C:\Program Files\R\R-x.x.x\bin` to PATH environment variable
- **Mac**: Install via Homebrew: `brew install r`
- **Linux**: Install via package manager: `sudo apt install r-base`
- Restart terminal after PATH changes
- Verify with: `Rscript --version`

### Backend Connection Fails

**Problem**: Cannot connect to http://localhost:3000  
**Solution**:
- Verify backend is running: Check terminal output for "Server running on port 3000"
- Check firewall settings
- Try different port in app.js if 3000 is in use
- Check for errors in terminal where server is running

### Performance Issues

**Problem**: Slow map interaction with large datasets  
**Solution**:
- Increase marker cluster radius
- Filter data to include only high-risk locations
- Aggregate predictions to reduce data points
- Use marker clustering (enabled by default)

### CORS Issues (Local Filesystem)

**Problem**: CORS errors when loading from `file://`  
**Solution** (use local web server instead):
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Node.js
npx http-server

# PHP
php -S localhost:8000
```

## Performance Metrics

- **Map Load Time**: <1 second (with sample data)
- **Single Date Prediction**: ~3.5 seconds
- **31-Day Batch Generation**: ~5.5 seconds  
- **API Response Time**: <200ms for date predictions
- **Marker Clustering**: Handles 10,000+ points efficiently

## Deployment Options

### Local Development

```bash
# Option 1: Direct file access (frontend only)
open index.html

# Option 2: Local web server
python -m http.server 8000
# Visit http://localhost:8000
```

### GitHub Pages

```bash
# 1. Push to GitHub
git add .
git commit -m "Deploy to GitHub Pages"
git push origin main

# 2. Enable GitHub Pages in repository Settings
# 3. Your map is now available at: https://username.github.io/Projects/
```

### Self-Hosted Server

```bash
# Copy project to web server
scp -r Projects/ user@server:/var/www/

# Access at: http://your-domain.com/Projects/
```

## API Reference

### Map Functions

#### `initMap()`
Initializes the Leaflet map centered on Virginia.

#### `loadData(dataPath)`
Loads prediction data from CSV file or uses sample data.
- **Parameters**: `dataPath` (string, optional) - Path to CSV file
- **Returns**: Promise<boolean>

#### `updateMarkers()`
Updates map markers based on current hour and risk threshold.

#### `getRiskColor(probability)`
Returns color code for given risk probability.
- **Parameters**: `probability` (number, 0-1)
- **Returns**: string (hex color code)

#### `formatHour(hour)`
Formats hour as HH:00 string.
- **Parameters**: `hour` (number, 0-23)
- **Returns**: string (e.g., "14:00")

### Global Variables

- `map`: Leaflet map instance
- `markerClusterGroup`: Marker cluster layer
- `crashData`: Array of prediction data
- `currentHour`: Currently selected hour (0-23)
- `currentThreshold`: Current risk threshold (0-1)

## Integration with ML Models

### Step-by-Step ML Integration

1. **Train Your Model**: Train crash prediction model on 2017-2025 Virginia crash data
   ```r
   model <- train_xgboost(features, target, hyperparams)
   ```

2. **Generate Predictions**: Create predictions for all locations and hours
   ```r
   predictions <- predict(model, newdata = features, type = "response")
   ```

3. **Format Data**: Ensure CSV has required columns
   ```r
   formatted_predictions <- predictions %>%
     select(lat, lon, probability, confidence_score, hour, location_name, date)
   ```

4. **Export CSV**: Use provided script or create custom export
   ```r
   write_csv(formatted_predictions, "data/crash_predictions.csv")
   ```

5. **Load Map**: Place CSV file in data directory and reload page

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For questions or issues:
- Open an issue on GitHub
- Contact: @cpark026

## License

This project is licensed under the MIT License. See LICENSE file for details.

## Version History

### v2.0 (Current - November 23, 2025)
- ✅ Vectorized geographic filtering (90%+ performance improvement)
- ✅ Confidence scoring for all predictions (0-100)
- ✅ 31-day prediction batch generation (~5.5 seconds)
- ✅ Backend API integration for date-based predictions
- ✅ Local path configuration (cross-platform)
- ✅ Consolidated single README documentation
- ✅ Enhanced customization options

### v1.0 (November 20, 2025)
- Initial interactive map with sample data
- Hourly time slider and risk filtering
- Marker clustering and color-coded risk levels
- R script for data export

## Acknowledgments

- Virginia Department of Transportation for crash data
- OpenStreetMap contributors for map tiles
- Leaflet.js team for the mapping library
- XGBoost developers for the ML framework

## Future Enhancements

- [ ] Heatmap visualization option
- [ ] Weather condition overlays
- [ ] Time-lapse animation showing risk changes
- [ ] Export filtered data functionality
- [ ] Real-time traffic data integration
- [ ] Mobile app version
- [ ] Multi-state support
- [ ] Historical trend analysis
- [ ] Statistical summaries by region

---

**Last Updated**: November 23, 2025  
**Status**: Active & Maintained  
**Maintainer**: @cpark026
