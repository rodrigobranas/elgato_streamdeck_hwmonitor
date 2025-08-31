const { exec } = require('child_process');
const WebSocket = require('ws');
const { createCanvas } = require('canvas');

// Parse Stream Deck arguments
const args = process.argv.slice(2);
let port, pluginUUID, registerEvent;

for (let i = 0; i < args.length; i++) {
    if (args[i] === '-port') port = args[++i];
    if (args[i] === '-pluginUUID') pluginUUID = args[++i];
    if (args[i] === '-registerEvent') registerEvent = args[++i];
}

if (!port || !pluginUUID || !registerEvent) {
    console.error('Missing Stream Deck arguments');
    process.exit(1);
}

// Connect to Stream Deck
const ws = new WebSocket(`ws://127.0.0.1:${port}`);
const contexts = new Map();

ws.on('open', () => {
    // Register plugin
    ws.send(JSON.stringify({
        event: registerEvent,
        uuid: pluginUUID
    }));
});

ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    const { event, context, action } = msg;
    
    if (event === 'willAppear' && action === 'com.branas.hwmonitor.disk') {
        // Clear any existing title first
        ws.send(JSON.stringify({
            event: 'setTitle',
            context: context,
            payload: {
                title: '',
                target: 0
            }
        }));
        
        // Start monitoring
        updateDiskSpace(context);
        const interval = setInterval(() => updateDiskSpace(context), 5000);
        contexts.set(context, interval);
    }
    
    if (event === 'willDisappear') {
        // Stop monitoring
        const interval = contexts.get(context);
        if (interval) {
            clearInterval(interval);
            contexts.delete(context);
        }
    }
    
    if (event === 'keyDown' && action === 'com.branas.hwmonitor.disk') {
        updateDiskSpace(context);
    }
});

ws.on('error', (err) => {
    console.error('WebSocket error:', err);
});

function createProgressBarImage(usagePercent) {
    const canvas = createCanvas(144, 144);
    const ctx = canvas.getContext('2d');
    
    // Black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 144, 144);
    
    // Grid configuration
    const gridSize = 10; // 10x10 grid
    const lineWidth = 2; // Width of grid lines
    const cellSize = (144 - (gridSize - 1) * lineWidth) / gridSize;
    
    // Calculate how many cells to fill (from bottom)
    const freePercent = 100 - usagePercent;
    const totalCells = gridSize * gridSize;
    const cellsToFill = Math.round((totalCells * freePercent) / 100);
    
    // Calculate how many complete rows to fill
    const rowsToFill = Math.ceil(cellsToFill / gridSize);
    
    // Draw grid cells
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const x = col * (cellSize + lineWidth);
            const y = row * (cellSize + lineWidth);
            const rowFromBottom = gridSize - 1 - row;
            
            // Fill entire rows from bottom
            if (rowFromBottom < rowsToFill) {
                // Determine color based on row position from bottom
                const cellIndex = rowFromBottom * gridSize; // First cell of this row
                if (cellIndex < 50) {
                    ctx.fillStyle = '#00FF00'; // Green
                } else if (cellIndex < 80) {
                    ctx.fillStyle = '#FFFF00'; // Yellow
                } else {
                    ctx.fillStyle = '#FF0000'; // Red
                }
            } else {
                ctx.fillStyle = '#000000'; // Black for unused cells
            }
            ctx.fillRect(x, y, cellSize, cellSize);
        }
    }
    
    // Convert to base64
    return canvas.toDataURL().split(',')[1];
}

function updateDiskSpace(context) {
    // Get both available space and usage percentage
    exec("df -h / | awk 'NR==2 {print $4, $5}'", (err, stdout) => {
        if (err) {
            ws.send(JSON.stringify({
                event: 'setTitle',
                context: context,
                payload: {
                    title: 'Error',
                    target: 0
                }
            }));
            return;
        }
        
        const [availableSpace, usagePercentStr] = stdout.trim().split(' ');
        const usagePercent = parseInt(usagePercentStr.replace('%', '')) || 0;
        
        // Set the progress bar image
        const imageBase64 = createProgressBarImage(usagePercent);
        ws.send(JSON.stringify({
            event: 'setImage',
            context: context,
            payload: {
                image: `data:image/png;base64,${imageBase64}`,
                target: 0
            }
        }));
        
        // Set the title with available space and percentage
        const freePercent = 100 - usagePercent;
        const title = `${availableSpace || 'N/A'}\n${freePercent}%`;
        ws.send(JSON.stringify({
            event: 'setTitle',
            context: context,
            payload: {
                title: title,
                target: 0
            }
        }));
    });
}

// Keep the process running
process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));