# Library Installation Guide

This application uses external JavaScript libraries for map functionality. For production use or offline deployment, download the libraries locally.

## Option 1: Using CDN (Default)

The application is configured to load libraries from CDN by default. This requires an internet connection.

- **Leaflet.js**: https://unpkg.com/leaflet@1.9.4/dist/
- **Leaflet.markercluster**: https://unpkg.com/leaflet.markercluster@1.5.3/dist/

## Option 2: Local Installation (Recommended for Production)

### Download Leaflet

1. Visit https://leafletjs.com/download.html
2. Download Leaflet 1.9.4
3. Extract to `assets/lib/leaflet/`
4. Update paths in `index.html`:

```html
<link rel="stylesheet" href="assets/lib/leaflet/leaflet.css">
<script src="assets/lib/leaflet/leaflet.js"></script>
```

### Download Leaflet MarkerCluster

1. Visit https://github.com/Leaflet/Leaflet.markercluster/releases
2. Download version 1.5.3
3. Extract to `assets/lib/leaflet.markercluster/`
4. Update paths in `index.html`:

```html
<link rel="stylesheet" href="assets/lib/leaflet.markercluster/MarkerCluster.css">
<link rel="stylesheet" href="assets/lib/leaflet.markercluster/MarkerCluster.Default.css">
<script src="assets/lib/leaflet.markercluster/leaflet.markercluster.js"></script>
```

## Option 3: Using NPM (For Build Tools)

If you're using a build system:

```bash
npm install leaflet leaflet.markercluster
```

Then import in your JavaScript:

```javascript
import L from 'leaflet';
import 'leaflet.markercluster';
```

## Verifying Installation

Open the browser console when loading the page. If libraries load successfully, you should see:

```
Initializing Virginia Crash Hot Spot Map...
Map initialized
Generated X sample records
```

If you see errors about `L is not defined`, the Leaflet library failed to load.

## Troubleshooting

### CDN Loading Issues

If CDN resources are blocked by your network or ad blocker:

1. Download libraries locally (Option 2)
2. Configure your ad blocker to allow unpkg.com
3. Use a VPN if network restrictions apply

### CORS Issues

If loading from local filesystem (`file://`), you may encounter CORS errors. Solutions:

1. Use a local web server (recommended)
2. Start Python server: `python -m http.server 8000`
3. Start PHP server: `php -S localhost:8000`
4. Use browser extensions that disable CORS for local development

### Missing Map Tiles

If the map background is gray:

- Check internet connection (OpenStreetMap tiles require internet)
- Check browser console for tile loading errors
- Consider using alternative tile providers if OSM is blocked

## Alternative Tile Providers

If OpenStreetMap tiles are blocked, edit `assets/js/app.js`:

```javascript
// Instead of:
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Use alternative:
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri'
}).addTo(map);
```

## License Notes

- **Leaflet**: BSD-2-Clause License
- **Leaflet.markercluster**: MIT License
- **OpenStreetMap**: Open Data Commons Open Database License (ODbL)

Always comply with respective licenses when distributing.
