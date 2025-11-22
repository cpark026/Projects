// Global variables
let map;
let markerClusterGroup;
let crashData = [];
let currentHour = 12;
let currentThreshold = 0.3;
const options = {
  timeZone: 'America/New_York', 
  year: 'numeric',
  month: 'numeric',
  day: 'numeric'
};
let currentDate = new Date().toLocaleDateString("en-US", options);

let paginatedData = [];
let currentPage = 0;

const itemsPerPage = 5;
const chunkSize = 10;

// Initialize map
function initMap() {
    // Center on Virginia
    map = L.map('map').setView([37.5407, -78.8], 7);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);

    // L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    // attribution: 'Tiles &copy; Esri'
    // }).addTo(map);

    // Initialize marker cluster group
    markerClusterGroup = L.markerClusterGroup({
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true
    });

    map.addLayer(markerClusterGroup);
    console.log('Map initialized');
}

// Get color based on risk probability
function getRiskColor(probability) {
    if (probability >= 0.8) return '#800026';
    if (probability >= 0.6) return '#BD0026';
    if (probability >= 0.5) return '#E31A1C';
    if (probability >= 0.4) return '#FC4E2A';
    if (probability >= 0.3) return '#FD8D3C';
    if (probability >= 0.2) return '#FEB24C';
    return '#FED976';
}

// Get risk level text
function getRiskLevel(probability) {
    if (probability >= 0.8) return 'Very High';
    if (probability >= 0.6) return 'High';
    if (probability >= 0.5) return 'Moderate-High';
    if (probability >= 0.4) return 'Moderate';
    if (probability >= 0.3) return 'Low-Moderate';
    if (probability >= 0.2) return 'Low';
    return 'Very Low';
}

// Format hour for display
function formatHour(hour) {
    return `${hour.toString().padStart(2, '0')}:00`;
}

// Create custom marker icon
function createCustomIcon(color) {
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
    });
}

// Create popup content
function createPopupContent(location) {
    const riskLevel = getRiskLevel(location.probability);
    const color = getRiskColor(location.probability);

    return `
        <div class="popup-title">Crash Hot Spot</div>
        <div class="popup-info">
            <strong>Location:</strong> ${location.location_name || 'Virginia'}<br>
            <strong>Hour:</strong> ${formatHour(location.hour)}<br>
            <strong>Risk Level:</strong> <span style="color: ${color};">${riskLevel}</span><br>
            <strong>Probability:</strong> <span class="risk-value" style="color: ${color};">${(location.probability * 100).toFixed(1)}%</span><br>
            <strong>Coordinates:</strong> ${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}
        </div>
    `;
}

// Update markers based on selected hour and threshold
function updateMarkers() {
    // Clear existing markers
    markerClusterGroup.clearLayers();

    // Filter data by current hour and threshold
    const filteredData = crashData.filter(location =>
        location.hour === currentHour && location.probability >= currentThreshold
    );

    console.log(`Displaying ${filteredData.length} locations for hour ${currentHour} with threshold ${currentThreshold}`);

    // Add markers for filtered data
    filteredData.forEach(location => {
        const color = getRiskColor(location.probability);
        const marker = L.marker([location.lat, location.lon], {
            icon: createCustomIcon(color)
        });

        marker.bindPopup(createPopupContent(location));
        markerClusterGroup.addLayer(marker);
    });
}

function createSummary() {
    const summaryData = crashData.filter(
        loc => loc.probability >= currentThreshold
    );

    // break into chunks of 10
    paginatedData = [];
    for (let i = 0; i < summaryData.length; i += chunkSize) {
        paginatedData.push(summaryData.slice(i, i + chunkSize));
    }

    currentPage = 0;
    renderSummaryPage();
}


function renderSummaryPage() {
    const summaryDiv = document.querySelector(".summary");

    if (paginatedData.length === 0) {
        summaryDiv.innerHTML = `
            <h3>Summary</h3>
            <p>No results above threshold.</p>
        `;
        return;
    }

    // take first 5 items from the current chunk
    const page = paginatedData[currentPage];
    const visibleItems = page.slice(0, itemsPerPage);

    const itemsHTML = visibleItems.map(item => `
        <div class="summaryItem">
            <strong>${item.location_name}</strong><br>
            Probability: ${item.probability.toFixed(3)}<br>
            Lat: ${item.lat}, Lon: ${item.lon}
        </div>
    `).join("");

    summaryDiv.innerHTML = `
        <h3>Summary</h3>

        ${itemsHTML}

        <div class="summaryControls">
            <button id="prevPage">← Back</button>
            <span>Page ${currentPage + 1} / ${paginatedData.length}</span>
            <button id="nextPage">Next →</button>
        </div>
    `;

    // Reattach events because we re-render the HTML
    document.getElementById("nextPage").onclick = () => {
        if (currentPage < paginatedData.length - 1) {
            currentPage++;
            renderSummaryPage();
        }
    };

    document.getElementById("prevPage").onclick = () => {
        if (currentPage > 0) {
            currentPage--;
            renderSummaryPage();
        }
    };
}


// Generate sample data for demonstration
function generateSampleData() {
    const sampleData = [];

    // Virginia cities with approximate coordinates
    const vaLocations = [
        { name: 'Richmond', lat: 37.5407, lon: -77.4360 },
        { name: 'Virginia Beach', lat: 36.8529, lon: -75.9780 },
        { name: 'Norfolk', lat: 36.8508, lon: -76.2859 },
        { name: 'Chesapeake', lat: 36.7682, lon: -76.2875 },
        { name: 'Arlington', lat: 38.8816, lon: -77.0910 },
        { name: 'Newport News', lat: 37.0871, lon: -76.4730 },
        { name: 'Alexandria', lat: 38.8048, lon: -77.0469 },
        { name: 'Hampton', lat: 37.0299, lon: -76.3452 },
        { name: 'Roanoke', lat: 37.2710, lon: -79.9414 },
        { name: 'Portsmouth', lat: 36.8354, lon: -76.2983 },
        { name: 'Suffolk', lat: 36.7282, lon: -76.5836 },
        { name: 'Lynchburg', lat: 37.4138, lon: -79.1422 },
        { name: 'Harrisonburg', lat: 38.4496, lon: -78.8689 },
        { name: 'Charlottesville', lat: 38.0293, lon: -78.4767 },
        { name: 'Blacksburg', lat: 37.2296, lon: -80.4139 },
        { name: 'Danville', lat: 36.5860, lon: -79.3950 },
        { name: 'Fredericksburg', lat: 38.3032, lon: -77.4605 },
        { name: 'Petersburg', lat: 37.2279, lon: -77.4019 },
        { name: 'Winchester', lat: 39.1857, lon: -78.1633 },
        { name: 'Manassas', lat: 38.7509, lon: -77.4753 }
    ];

    // Generate predictions for each location and each hour
    vaLocations.forEach(location => {
        for (let hour = 0; hour < 24; hour++) {
            // Create multiple hotspots near each city with varying probabilities
            for (let i = 0; i < 3; i++) {
                // Add some random offset to create multiple spots
                const latOffset = (Math.random() - 0.5) * 0.1;
                const lonOffset = (Math.random() - 0.5) * 0.1;

                // Generate probability based on hour (higher during rush hours and night)
                let baseProbability = 0.2;
                if (hour >= 7 && hour <= 9) baseProbability = 0.5; // Morning rush
                if (hour >= 16 && hour <= 18) baseProbability = 0.6; // Evening rush
                if (hour >= 22 || hour <= 2) baseProbability = 0.4; // Late night

                // Add random variation
                const probability = Math.min(0.95, Math.max(0.05, baseProbability + (Math.random() - 0.5) * 0.3));

                sampleData.push({
                    lat: location.lat + latOffset,
                    lon: location.lon + lonOffset,
                    probability: probability,
                    hour: hour,
                    location_name: location.name
                });
            }
        }
    });

    return sampleData;
}

// Load data from CSV file or use sample data
async function loadData(dataPath = null) {
    try {
        if (dataPath) {
            // Load from CSV file
            const response = await fetch(dataPath);
            const csvText = await response.text();
            crashData = parseCSV(csvText);
            console.log(`Loaded ${crashData.length} records from ${dataPath}`);
        } else {
            // Use sample data
            crashData = generateSampleData();
            console.log(`Generated ${crashData.length} sample records`);
        }

        updateMarkers();
        return true;
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Error loading data. Using sample data instead.');
        crashData = generateSampleData();
        updateMarkers();
        return false;
    }
}

// Parse CSV data
function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;

        const values = lines[i].split(',');
        const record = {};

        headers.forEach((header, index) => {
            const value = values[index]?.trim();
            if (header === 'lat' || header === 'lon' || header === 'probability') {
                record[header] = parseFloat(value);
            } else if (header === 'hour') {
                record[header] = parseInt(value);
            } else {
                record[header] = value;
            }
        });

        data.push(record);
    }

    return data;
}

// Reset map view to Virginia
function resetView() {
    map.setView([37.5407, -78.8], 7);
}

// Initialize event listeners
function initEventListeners() {
    // Hour slider
    const hourSlider = document.getElementById('hourSlider');
    const hourDisplay = document.getElementById('hourDisplay');

    hourSlider.addEventListener('input', (e) => {
        currentHour = parseInt(e.target.value);
        hourDisplay.textContent = formatHour(currentHour);
        updateMarkers();
    });

    // Threshold slider
    const thresholdSlider = document.getElementById('thresholdSlider');
    const thresholdDisplay = document.getElementById('thresholdDisplay');

    thresholdSlider.addEventListener('input', (e) => {
        currentThreshold = parseFloat(e.target.value);
        thresholdDisplay.textContent = currentThreshold.toFixed(2);
        updateMarkers();
    });

    // Load data button
    document.getElementById('loadDataBtn').addEventListener('click', () => {
        // Try to load from data directory, otherwise use sample data
        loadData('data/crash_predictions.csv').catch(() => {
            loadData();
        });
    });

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', resetView);
}

const slider = document.getElementById("thresholdSlider");

slider.addEventListener("input", () => {
    currentThreshold = slider.value;
    console.log("Threshold changed to:", currentThreshold);
    createSummary();
});

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Virginia Crash Hot Spot Map...');

    initMap();
    initEventListeners();

    console.log(`Current Date: ${currentDate}`);
    const month = currentDate.split('/')[0];
    const day = currentDate.split('/')[1];
    const year = currentDate.split('/')[2];
    document.getElementById('datePicker').value  = `${year}-${month}-${day}`;
    
    // Automatically load sample data on startup
    loadData();
    createSummary();
});
