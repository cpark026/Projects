# Backend Setup Guide - Virginia Crash Hot Spot Predictions

This guide explains how to set up and run the backend server that generates crash predictions when a date is selected on the website.

## Overview

The system works as follows:
1. User selects a date on the website
2. Website sends date to Node.js backend server
3. Backend server runs R script with the date parameter
4. R script generates predictions using the ML model and exports to CSV
5. Backend returns CSV data to website
6. Website displays predictions on the map

## Prerequisites

You need to install:

### 1. Node.js
Download and install from https://nodejs.org/
- Choose the LTS (Long Term Support) version
- This includes npm (Node Package Manager)

Verify installation:
```powershell
node --version
npm --version
```

### 2. R
R must already be installed on your system (for running the R script).

Verify R is in PATH:
```powershell
Rscript --version
```

If this doesn't work, you need to add R to your system PATH:
- Find your R installation folder (typically `C:\Program Files\R\R-x.x.x`)
- Add the `bin` folder to your system PATH environment variable
- Restart your terminal

## Installation Steps

### 1. Install Node.js Dependencies

Navigate to the project folder and install dependencies:

```powershell
cd \Projects
npm install
```

This will install:
- `express` - Web framework for handling API requests
- `cors` - Allows requests from the website to the server

### 2. Verify R Script

Make sure the R script at `r-scripts/export_predictions.R` has the required libraries:
- dplyr
- readr
- lubridate

If you get errors about missing packages when running the server, install them in R:
```r
install.packages("dplyr")
install.packages("readr")
install.packages("lubridate")
```

### 3. Verify Model File

Check that the RDS model exists:
```
Projects/r-scripts/models/virginia_crash_severity_model.rds
```

## Running the Server

### Start the backend server:

```powershell
cd \Projects
npm start
```

You should see:
```
================================
Server running at http://localhost:3000
================================

Available endpoints:
  POST /api/predictions - Generate predictions for a date
  GET  /api/predictions/load - Load existing CSV
  GET  /api/health - Health check
```

### Open the website:

In your browser, go to:
```
http://localhost:3000
```

The website will load with the map. When you select a date, the server will:
1. Run the R script
2. Generate predictions
3. Send results back to the website
4. Map will update automatically

## How It Works

### API Endpoints

**POST /api/predictions**
- Purpose: Generate predictions for a specific date
- Request body: `{ "date": "YYYY-MM-DD" }`
- Response: CSV data with predictions
- Example: User selects 2025-11-22 → sends POST to generate predictions

**GET /api/predictions/load**
- Purpose: Load existing crash_predictions.csv file
- Useful if predictions were already generated

**GET /api/health**
- Purpose: Check if server is running
- Useful for debugging connection issues

### Data Flow

1. **Frontend**: User selects date → calls `generatePredictionsFromBackend(date)`
2. **Frontend → Backend**: Sends POST request to `/api/predictions` with date
3. **Backend**: 
   - Validates date format (YYYY-MM-DD)
   - Runs: `Rscript "r-scripts/export_predictions.R" "2025-11-22"`
4. **R Script**:
   - Accepts date parameter
   - Loads ML model from `models/virginia_crash_severity_model.rds`
   - Generates predictions
   - Adds date column to predictions
   - Exports to `data/crash_predictions.csv`
5. **Backend**: Reads CSV file and sends back as JSON
6. **Frontend**: Parses CSV and displays on map

## Troubleshooting

### Error: "Cannot find module 'express'"
```powershell
npm install
```

### Error: "Rscript command not found"
R is not in your system PATH. Add it manually:
1. Find R installation: typically `C:\Program Files\R\R-4.x.x`
2. Add to PATH: `C:\Program Files\R\R-4.x.x\bin`
3. Restart terminal and try again

### Error: "FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed"
Increase Node.js memory:
```powershell
node --max-old-space-size=4096 server.js
```

### Error: "Failed to execute R script"
Check console output in the terminal for R error messages. Common issues:
- Missing R packages: install.packages("package_name")
- Model file missing: verify path to virginia_crash_severity_model.rds
- Date format: must be YYYY-MM-DD

### Website shows "Cannot reach server"
1. Check that server is running: `npm start`
2. Check that server is on port 3000: look for "Server running at http://localhost:3000"
3. Try visiting http://localhost:3000/api/health in your browser

### First request is slow
The first request takes longer because:
- R script is launching and loading libraries
- ML model is loading into memory
- Predictions are being calculated

Subsequent requests for different dates will be similarly slow (this is expected).

## Stopping the Server

Press `Ctrl+C` in the terminal running the server.

## Next Steps

- Generate predictions for multiple dates to populate the database
- Schedule the script to run on a schedule using a task scheduler
- Deploy to a cloud server for public access
- Add authentication if needed

## File Locations

```
Projects/
├── server.js                          # Backend server
├── package.json                       # Node.js dependencies
├── index.html                         # Frontend (website)
├── assets/
│   ├── js/
│   │   └── app.js                    # Frontend JavaScript
│   └── css/
│       └── styles.css                # Frontend CSS
├── data/
│   ├── crash_predictions.csv         # Generated predictions (output)
│   └── docs/
├── r-scripts/
│   ├── export_predictions.R          # R script for generating predictions
│   └── models/
│       └── virginia_crash_severity_model.rds  # ML model
```
