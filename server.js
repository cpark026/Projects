const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const util = require('util');
const os = require('os');

const app = express();
const execPromise = util.promisify(exec);

// OPTIMIZATION: In-memory cache for predictions
const PREDICTION_CACHE = new Map();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files from current directory

const PORT = 3000;

// Detect OS and set R executable path
function getRScriptCommand(scriptPath) {
    const platform = os.platform();
    const rPath = 'C:\\Program Files\\R\\R-4.5.1\\bin\\Rscript.exe';
    
    if (platform === 'win32') {
        // Windows: use full path to Rscript
        return `"${rPath}" "${scriptPath}"`;
    } else if (platform === 'linux') {
        // WSL/Linux: try to find R from Windows installation
        // Common R paths in WSL
        const possiblePaths = [
            '/mnt/c/Program Files/R/R-4.5.1/bin/Rscript.exe',
            '/mnt/c/Program Files/R/R-4.3.1/bin/Rscript.exe',
            '/mnt/c/Program Files/R/R-4.3.0/bin/Rscript.exe',
            '/mnt/c/Program Files/R/R-4.2.3/bin/Rscript.exe',
            '/usr/bin/Rscript', // If R is installed in WSL
        ];
        
        // Try to find which R path exists
        for (let rPath of possiblePaths) {
            if (fs.existsSync(rPath)) {
                return `"${rPath}" "${scriptPath}"`;
            }
        }
        
        // Fallback: try Rscript from PATH
        return `Rscript "${scriptPath}"`;
    } else if (platform === 'darwin') {
        // macOS
        return `Rscript "${scriptPath}"`;
    }
    
    return `Rscript "${scriptPath}"`;
}

// Endpoint to generate predictions for a specific date
app.post('/api/predictions', async (req, res) => {
    try {
        const { date } = req.body;
        
        if (!date) {
            return res.status(400).json({ error: 'Date is required (MM-DD-YYYY, MM/DD/YYYY, or YYYY-MM-DD format)' });
        }
        
        // Convert to YYYY-MM-DD format for R script
        let formattedDate = date;
        
        // Handle MM-DD-YYYY or MM/DD/YYYY format
        const mmddyyyyRegex = /^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/;
        let match = date.match(mmddyyyyRegex);
        if (match) {
            // Convert MM-DD-YYYY or MM/DD/YYYY to YYYY-MM-DD
            formattedDate = `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
        } else {
            // Validate YYYY-MM-DD format
            const yyyymmddRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!yyyymmddRegex.test(date)) {
                return res.status(400).json({ error: 'Invalid date format. Use MM-DD-YYYY, MM/DD/YYYY, or YYYY-MM-DD' });
            }
            formattedDate = date;
        }
        
        console.log(`[${new Date().toISOString()}] Prediction request for ${formattedDate}...`);
        
        // OPTIMIZATION 1: Check in-memory cache first (instant)
        if (PREDICTION_CACHE.has(formattedDate)) {
            console.log(`✓ Returning cached predictions for ${formattedDate}`);
            const cachedData = PREDICTION_CACHE.get(formattedDate);
            return res.json({
                success: true,
                message: `Predictions loaded from cache for ${formattedDate}`,
                csv: cachedData,
                timestamp: new Date().toISOString(),
                source: 'cache'
            });
        }
        
        // Run R script with date parameter (YYYY-MM-DD format)
        const rScriptPath = path.join(__dirname, 'r-scripts', 'export_predictions.R');
        const command = getRScriptCommand(rScriptPath) + ` "${formattedDate}"`;
        
        console.log(`Executing optimized R script...`);
        
        const execOptions = { 
            timeout: 120000, // 2 minute timeout
            cwd: path.join(__dirname, 'r-scripts'),
            maxBuffer: 10 * 1024 * 1024  // 10MB buffer for large outputs
        };
        
        // Only use bash shell on Linux/WSL
        if (os.platform() === 'linux') {
            execOptions.shell = '/bin/bash';
        }
        
        try {
            const { stdout, stderr } = await execPromise(command, execOptions);
            
            if (stderr) {
                console.log('R Script notes:', stderr.substring(0, 500));  // Log first 500 chars
            }
            
            console.log('R Script output (first 300 chars):', stdout.substring(0, 300));
            
            // Read the generated CSV file
            const csvPath = path.join(__dirname, 'data', 'crash_predictions.csv');
            
            if (!fs.existsSync(csvPath)) {
                return res.status(500).json({ error: 'CSV file was not generated' });
            }
            
            const csvData = fs.readFileSync(csvPath, 'utf-8');
            
            // OPTIMIZATION 2: Cache in memory for 1 hour
            PREDICTION_CACHE.set(formattedDate, csvData);
            setTimeout(() => {
                PREDICTION_CACHE.delete(formattedDate);
                console.log(`Cleared cache for ${formattedDate}`);
            }, 3600000);  // 1 hour TTL
            
            res.json({
                success: true,
                message: `Predictions generated for ${formattedDate}`,
                csv: csvData,
                timestamp: new Date().toISOString(),
                source: 'generated'
            });
            
        } catch (execError) {
            console.error('R Script execution error:', execError.message);
            return res.status(500).json({ 
                error: 'Failed to execute R script',
                details: execError.message 
            });
        }
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to load predictions from existing CSV
app.get('/api/predictions/load', (req, res) => {
    try {
        const csvPath = path.join(__dirname, 'data', 'crash_predictions.csv');
        
        if (!fs.existsSync(csvPath)) {
            return res.status(404).json({ error: 'No predictions CSV found' });
        }
        
        const csvData = fs.readFileSync(csvPath, 'utf-8');
        res.json({
            success: true,
            csv: csvData,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok',
        timestamp: new Date().toISOString(),
        message: 'Backend server is running'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`\n================================`);
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`================================\n`);
    console.log('Available endpoints:');
    console.log(`  POST /api/predictions - Generate predictions for a date`);
    console.log(`  GET  /api/predictions/load - Load existing CSV`);
    console.log(`  GET  /api/health - Health check\n`);
});
