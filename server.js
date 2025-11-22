const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const util = require('util');
const os = require('os');

const app = express();
const execPromise = util.promisify(exec);

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
            return res.status(400).json({ error: 'Date is required (YYYY-MM-DD format)' });
        }
        
        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
        }
        
        console.log(`Generating predictions for ${date}...`);
        
        // Run R script with date parameter
        const rScriptPath = path.join(__dirname, 'r-scripts', 'export_predictions.R');
        const command = getRScriptCommand(rScriptPath) + ` "${date}"`;
        
        console.log(`Executing: ${command}`);
        
        const execOptions = { 
            timeout: 120000, // 2 minute timeout
            cwd: path.join(__dirname, 'r-scripts')
        };
        
        // Only use bash shell on Linux/WSL
        if (os.platform() === 'linux') {
            execOptions.shell = '/bin/bash';
        }
        
        try {
            const { stdout, stderr } = await execPromise(command, execOptions);
            
            if (stderr) {
                console.log('R Script stderr:', stderr);
            }
            
            console.log('R Script output:', stdout);
            
            // Read the generated CSV file
            const csvPath = path.join(__dirname, 'data', 'crash_predictions.csv');
            
            if (!fs.existsSync(csvPath)) {
                return res.status(500).json({ error: 'CSV file was not generated' });
            }
            
            const csvData = fs.readFileSync(csvPath, 'utf-8');
            
            res.json({
                success: true,
                message: `Predictions generated for ${date}`,
                csv: csvData,
                timestamp: new Date().toISOString()
            });
            
        } catch (execError) {
            console.error('R Script execution error:', execError);
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
