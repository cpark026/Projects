# Virginia Crash Hot Spot Map

Interactive web-based map visualizing predicted crash hot spots across Virginia for any hour of the day using machine learning model predictions.

## Quick Start

1. Clone this repository
2. Open `index.html` in a web browser
3. Use the hour slider to explore predictions throughout the day

## Features

✅ Interactive hourly time slider (0:00 - 23:00)  
✅ Dynamic risk threshold filtering  
✅ Color-coded risk levels with legend  
✅ Detailed popups with probability scores  
✅ Responsive design for all devices  
✅ Sample data included for demonstration  
✅ R script for exporting ML model predictions  

## Documentation

For complete documentation, setup instructions, and data format specifications, see [docs/README.md](docs/README.md).

## Project Structure

```
├── index.html                    # Main application
├── assets/
│   ├── css/styles.css           # Styling
│   └── js/app.js                # Application logic
├── data/
│   └── crash_predictions.csv    # Sample predictions
├── r-scripts/
│   └── export_predictions.R     # R export script
└── docs/
    └── README.md                # Full documentation
```

## Data Format

Predictions should be in CSV format:

```csv
lat,lon,probability,hour,location_name
37.5407,-77.4360,0.65,8,Richmond
36.8529,-75.9780,0.55,17,Virginia Beach
```

## Technologies

- Leaflet.js for interactive mapping
- Leaflet.markercluster for performance
- OpenStreetMap tiles
- Vanilla JavaScript (no dependencies)

## License

MIT License - See LICENSE file for details

## Author

@cpark026
