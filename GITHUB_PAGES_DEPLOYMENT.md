# GitHub Pages Deployment Guide

Your Virginia Crash Hot Spot Predictions website is now ready to deploy to GitHub Pages!

## What's Changed

The application has been converted from a **backend-dependent** system to a **static-only** system:

- ❌ **Removed:** Node.js backend server (server.js) - no longer needed
- ❌ **Removed:** Date-based API calls
- ✅ **Added:** Pre-generated CSV files for 31 days (Nov 7 - Dec 7, 2025)
- ✅ **Updated:** Frontend to load pre-generated CSV files directly

## How It Works Now

1. **Date Range:** The website can show predictions for Nov 7 - Dec 7, 2025
2. **No Backend:** Everything is static - pure HTML/CSS/JavaScript
3. **No Server Required:** Works on GitHub Pages without any server-side code
4. **Fast Loading:** Data is already generated and ready to serve

## Directory Structure for GitHub Pages

```
your-repo/
├── index.html                    # Main website
├── assets/
│   ├── js/app.js                 # Updated to load CSV files
│   └── css/styles.css
├── data/
│   └── by-date/                  # CSV files for each date
│       ├── predictions_2025-11-07.csv
│       ├── predictions_2025-11-08.csv
│       ├── ... (31 files total)
│       └── predictions_2025-12-07.csv
└── README.md
```

## Deployment to GitHub Pages

### Step 1: Push to GitHub

```bash
git add .
git commit -m "Ready for GitHub Pages deployment - static predictions"
git push origin main
```

### Step 2: Enable GitHub Pages

1. Go to your GitHub repository settings
2. Scroll to "GitHub Pages" section
3. Select "Deploy from a branch"
4. Choose branch: `main`
5. Choose folder: `/ (root)`
6. Click "Save"

### Step 3: Access Your Website

Your site will be available at:
```
https://your-username.github.io/your-repo-name/
```

(Replace with your actual username and repo name)

## Features

✅ **Date Selection:** Pick any date from Nov 7 - Dec 7, 2025
✅ **Hour Selection:** View predictions for any hour (0-23)
✅ **Risk Threshold:** Filter by minimum risk level
✅ **Interactive Map:** Zoom, pan, click markers
✅ **Legend:** Color-coded risk levels
✅ **Summary:** View prediction details

## How to Update Predictions

To generate new predictions for different dates:

1. Edit `r-scripts/generate_date_range_predictions.R`
2. Modify the date range:
   ```r
   start_date <- Sys.Date() - 15
   end_date <- Sys.Date() + 15
   ```
3. Run the script:
   ```powershell
   cd "Projects\r-scripts"
   "C:\Program Files\R\R-4.5.1\bin\Rscript.exe" generate_date_range_predictions.R
   ```
4. New CSV files will be created in `data/by-date/`
5. Commit and push to GitHub

## Local Testing

Before deploying, test locally by opening in your browser:

```bash
# Option 1: Open file directly
start index.html

# Option 2: Use a simple Python server
python -m http.server 8000
# Then visit: http://localhost:8000
```

## Troubleshooting

### "Cannot find CSV file" error
- Check that `data/by-date/` folder contains CSV files
- Verify the date format in the filename matches `YYYY-MM-DD`
- Check browser console for exact error message

### Map not loading
- Ensure Leaflet CDN is accessible (requires internet)
- Check browser console for any errors
- Verify `index.html` is in the root directory

### No predictions showing
- Select a date within the range (Nov 7 - Dec 7, 2025)
- Check that CSV file exists for that date in `data/by-date/`
- Try adjusting the risk threshold slider

## File Checklist for GitHub Pages

Before pushing to GitHub, verify:

- ✅ `index.html` exists in root
- ✅ `assets/js/app.js` updated (no API calls)
- ✅ `assets/css/styles.css` exists
- ✅ `data/by-date/` folder with 31 CSV files
- ✅ `.gitignore` includes `node_modules/` (if applicable)
- ✅ No `server.js` being used (optional to remove)
- ✅ All paths are relative (not absolute)

## No Longer Needed (Can Delete)

These files are no longer needed for GitHub Pages:
- `server.js` - Backend server
- `package.json` - Node.js dependencies
- `package-lock.json` - NPM lock file
- `BACKEND_SETUP.md` - Backend instructions

You can keep them if you want to maintain the ability to run locally with updates, but they won't be used by GitHub Pages.

## Notes

- Predictions are static and generated once (Nov 7 - Dec 7, 2025)
- To show future dates, regenerate predictions quarterly
- The model file (`virginia_crash_severity_model.rds`) is used only during generation, not needed on GitHub Pages
- All user interaction happens client-side in the browser

## Questions?

For issues with GitHub Pages deployment:
- Check [GitHub Pages documentation](https://pages.github.com/)
- Verify repository is public (or Pages is enabled for private repos)
- Check GitHub Actions tab for deployment logs

Enjoy your static, GitHub Pages-ready Virginia Crash Hot Spot Prediction Map! 🎉
