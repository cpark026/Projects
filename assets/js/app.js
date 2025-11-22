// Global variables
let map;
let markerClusterGroup;
let crashData = [];
let currentHour = 12;
let currentThreshold = 0.3;
// Store date in YYYY-MM-DD format internally for consistency with CSV files
let currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
let isGeneratingPredictions = false;

let paginatedData = [];
let currentPage = 0;

const itemsPerPage = 5;
const chunkSize = 10;
const API_URL = 'http://localhost:3000/api'; // Backend API URL

// Initialize map
function initMap() {
    // Center on Virginia
    map = L.map('map').setView([37.5407, -78.8], 7);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);

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
    const confidence = location.confidence_score || Math.round(Math.max(location.probability, 1 - location.probability) * 100);

    return `
        <div class="popup-title">Crash Hot Spot</div>
        <div class="popup-info">
            <strong>Location:</strong> ${location.location_name || 'Virginia'}<br>
            <strong>Hour:</strong> ${formatHour(location.hour)}<br>
            <strong>Risk Level:</strong> <span style="color: ${color};">${riskLevel}</span><br>
            <strong>Probability:</strong> <span class="risk-value" style="color: ${color};">${(location.probability * 100).toFixed(1)}%</span><br>
            <strong>Confidence:</strong> ${confidence}%<br>
            <strong>Coordinates:</strong> ${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}
        </div>
    `;
}

// Update markers based on selected date, hour and threshold
function updateMarkers() {
    // Clear existing markers
    markerClusterGroup.clearLayers();

    // Convert hour 24 to 0 (midnight)
    const displayHour = currentHour === 24 ? 0 : currentHour;

    // Filter data by current date, hour and threshold
    const filteredData = crashData.filter(location => {
        // If location has a date field, filter by it; otherwise show all
        const dateMatch = !location.date || location.date === currentDate;
        return dateMatch && location.hour === displayHour && location.probability >= currentThreshold;
    });

    console.log(`Displaying ${filteredData.length} locations for ${currentDate} at hour ${displayHour} with threshold ${currentThreshold}`);

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

    const itemsHTML = visibleItems.map((item, index) => {
        const confidence = item.confidence_score || Math.round(Math.max(item.probability, 1 - item.probability) * 100);
        return `
        <div class="summaryItem clickable-item" data-index="${index}" style="cursor: pointer; padding: 10px; border-radius: 5px; transition: background-color 0.2s;">
            <strong>${item.location_name}</strong><br>
            Hour: ${formatHour(item.hour)}<br>
            Probability: ${(item.probability * 100).toFixed(1)}%<br>
            Confidence: ${confidence}%<br>
            Lat: ${item.lat.toFixed(4)}, Lon: ${item.lon.toFixed(4)}
        </div>
    `;
    }).join("");

    summaryDiv.innerHTML = `
        <h3>Summary</h3>

        ${itemsHTML}

        <div class="summaryControls">
            <button id="prevPage">← Back</button>
            <span>Page ${currentPage + 1} / ${paginatedData.length}</span>
            <button id="nextPage">Next →</button>
        </div>
    `;

    // Add click handlers to summary items
    const summaryItems = summaryDiv.querySelectorAll('.clickable-item');
    summaryItems.forEach((item, index) => {
        item.addEventListener('mouseenter', () => {
            item.style.backgroundColor = '#f0f0f0';
        });
        item.addEventListener('mouseleave', () => {
            item.style.backgroundColor = 'transparent';
        });
        item.addEventListener('click', () => {
            const page = paginatedData[currentPage];
            const clickedItem = page[index];
            
            // Set the hour slider to the item's hour
            currentHour = clickedItem.hour;
            document.getElementById('hourSlider').value = currentHour;
            document.getElementById('hourDisplay').textContent = formatHour(currentHour);
            
            // Center map on the location
            map.setView([clickedItem.lat, clickedItem.lon], 12);
            
            // Update markers to show the new hour
            updateMarkers();
            updateHourSliderThumb();
            createSummary();
        });
    });

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

// Load predictions from pre-generated CSV file for a specific date
async function loadPredictionsForDate(date) {
    try {
        const statusElement = document.querySelector('.summary');
        if (statusElement) {
            statusElement.innerHTML = '<h3>Loading predictions...</h3><p>Loading data for ' + date + '</p>';
        }
        
        console.log('Loading predictions for:', date);
        
        // Load the date-specific CSV file (date is already in YYYY-MM-DD format)
        const csvPath = `data/by-date/predictions_${date}.csv`;
        
        const response = await fetch(csvPath);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const csvText = await response.text();
        crashData = parseCSV(csvText);
        
        console.log(`Loaded ${crashData.length} predictions for ${date}`);
        updateMarkers();
        createSummary();
        return true;
        
    } catch (error) {
        console.error('Error loading predictions:', error);
        const statusElement = document.querySelector('.summary');
        if (statusElement) {
            statusElement.innerHTML = '<h3>Error</h3><p>Failed to load predictions for ' + date + '</p>';
        }
        return false;
    }
}

// Generate predictions from backend API for the current date
async function generatePredictionsFromBackend() {
    if (isGeneratingPredictions) {
        console.log('Predictions already being generated...');
        return false;
    }
    
    try {
        isGeneratingPredictions = true;
        
        // Show loading status
        const statusElement = document.querySelector('.summary');
        if (statusElement) {
            statusElement.innerHTML = '<h3>Generating predictions...</h3><p>Running R script for ' + currentDate + '</p>';
        }
        
        console.log('Requesting predictions for:', currentDate);
        
        // Call backend API
        const response = await fetch(`${API_URL}/predictions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ date: currentDate })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to generate predictions');
        }
        
        const result = await response.json();
        console.log('Predictions generated:', result.message);
        
        // Parse CSV from response
        if (result.csv) {
            crashData = parseCSV(result.csv);
            console.log(`Loaded ${crashData.length} predictions for ${currentDate}`);
            updateMarkers();
            createSummary();
            return true;
        }
        
    } catch (error) {
        console.error('Error generating predictions:', error);
        const statusElement = document.querySelector('.summary');
        if (statusElement) {
            statusElement.innerHTML = '<h3>Error</h3><p>Failed to generate predictions: ' + error.message + '</p><p>Make sure the backend server is running: npm start</p>';
        }
        return false;
        
    } finally {
        isGeneratingPredictions = false;
    }
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
            } else if (header === 'hour' || header === 'confidence_score') {
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
    // Legend toggle button
    const toggleLegendBtn = document.getElementById('toggleLegendBtn');
    const legendOverlay = document.getElementById('legendOverlay');
    
    if (toggleLegendBtn && legendOverlay) {
        // Initially show the legend
        legendOverlay.classList.remove('hidden');
        
        toggleLegendBtn.addEventListener('click', () => {
            legendOverlay.classList.toggle('hidden');
            // Update button text to indicate state
            toggleLegendBtn.textContent = legendOverlay.classList.contains('hidden') ? 'Show Legend' : 'Hide Legend';
        });
    }
    
    // Date picker
    const datePicker = document.getElementById('datePicker');
    if (datePicker) {
        datePicker.addEventListener('change', async (e) => {
            currentDate = e.target.value;
            console.log(`Date changed to: ${currentDate}`);
            
            // Load pre-generated predictions for the selected date
            await loadPredictionsForDate(currentDate);
        });
    }

    // Hour slider
    const hourSlider = document.getElementById('hourSlider');
    const hourDisplay = document.getElementById('hourDisplay');

    hourSlider.addEventListener('input', (e) => {
        currentHour = parseInt(e.target.value);
        hourDisplay.textContent = formatHour(currentHour);
        updateMarkers();
        createSummary();
    });

    // Threshold slider
    const thresholdSlider = document.getElementById('thresholdSlider');
    const thresholdDisplay = document.getElementById('thresholdDisplay');

    thresholdSlider.addEventListener('input', (e) => {
        currentThreshold = parseFloat(e.target.value);
        thresholdDisplay.textContent = currentThreshold.toFixed(2);
        updateMarkers();
        createSummary();
    });

    // Load data button - Generate predictions from backend API
    document.getElementById('loadDataBtn').addEventListener('click', async () => {
        // Try to generate from backend API first
        const success = await generatePredictionsFromBackend();
        
        if (!success) {
            // If backend is not available, try to load pre-generated CSV
            console.log('Backend not available, trying pre-generated CSV...');
            loadData('data/crash_predictions.csv').catch(() => {
                loadData();
            });
        }
    });

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', resetView);
}

const slider = document.getElementById("thresholdSlider");

slider.addEventListener("input", () => {
    currentThreshold = slider.value;
    console.log("Threshold changed to:", currentThreshold);
    updateThresholdSliderThumb(); // Set initial color
    createSummary();
});

// Color interpolation helper
function interpolateColor(color1, color2, t) {
    const r = Math.round(color1[0] + (color2[0] - color1[0]) * t);
    const g = Math.round(color1[1] + (color2[1] - color1[1]) * t);
    const b = Math.round(color1[2] + (color2[2] - color1[2]) * t);
    return `rgb(${r}, ${g}, ${b})`;
}

// Hour slider: #667eea (102,126,234) → #764ba2 (118,75,162)
function updateHourSliderThumb() {
    const slider = document.getElementById('hourSlider');
    const t = (slider.value - slider.min) / (slider.max - slider.min);
    const color = interpolateColor([102, 126, 234], [118, 75, 162], t);
    slider.style.setProperty('--thumb-color', color);
}

// Threshold slider: #FED976 (254,217,118) → #800026 (128,0,38)
function updateThresholdSliderThumb() {
    const slider = document.getElementById('thresholdSlider');
    const t = (slider.value - slider.min) / (slider.max - slider.min);
    const color = interpolateColor([254, 217, 118], [128, 0, 38], t);
    slider.style.setProperty('--thumb-color', color);
}


// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Virginia Crash Hot Spot Map...');

    initMap();
    initEventListeners();
   // createSummary();

    // Set date picker to current date
    console.log(`Current Date: ${currentDate}`);
    // Set date picker to current date (it expects YYYY-MM-DD)
    document.getElementById('datePicker').value = currentDate;

    // Initialize sliders
    const hourSlider = document.getElementById('hourSlider');
    updateThresholdSliderThumb();

    if (hourSlider) {
        hourSlider.addEventListener('input', updateHourSliderThumb);
        updateHourSliderThumb(); // Set initial color
    }

    // Load predictions for today on startup
    loadPredictionsForDate(currentDate).then(success => {
        if (!success) {
            // Fallback to sample data if file doesn't exist
            console.log('Falling back to sample data');
            loadData();
        }
    });
    createSummary();
});
