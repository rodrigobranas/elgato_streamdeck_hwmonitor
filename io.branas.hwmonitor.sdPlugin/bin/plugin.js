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
    
    if (event === 'willAppear') {
        if (action === 'io.branas.hwmonitor.disk') {
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
            const interval = setInterval(() => updateDiskSpace(context), 30000);
            contexts.set(context, interval);
        } else if (action === 'io.branas.hwmonitor.cpu') {
            // Clear any existing title first
            ws.send(JSON.stringify({
                event: 'setTitle',
                context: context,
                payload: {
                    title: '',
                    target: 0
                }
            }));
            
            // Start CPU monitoring
            updateCPUUsage(context);
            const interval = setInterval(() => updateCPUUsage(context), 5000);
            contexts.set(context, interval);
        } else if (action === 'io.branas.hwmonitor.memory') {
            // Clear any existing title first
            ws.send(JSON.stringify({
                event: 'setTitle',
                context: context,
                payload: {
                    title: '',
                    target: 0
                }
            }));
            
            // Start Memory monitoring
            updateMemoryUsage(context);
            const interval = setInterval(() => updateMemoryUsage(context), 3000);
            contexts.set(context, interval);
        } else if (action === 'io.branas.hwmonitor.network') {
            // Clear any existing title first
            ws.send(JSON.stringify({
                event: 'setTitle',
                context: context,
                payload: {
                    title: '',
                    target: 0
                }
            }));

            // Start Network monitoring
            updateNetworkLatency(context);
            const interval = setInterval(() => updateNetworkLatency(context), 5000);
            contexts.set(context, interval);
        } else if (action === 'io.branas.hwmonitor.cputemp') {
            ws.send(JSON.stringify({
                event: 'setTitle',
                context: context,
                payload: { title: '', target: 0 }
            }));
            updateCPUTemp(context);
            const interval = setInterval(() => updateCPUTemp(context), 10000);
            contexts.set(context, interval);
        } else if (action === 'io.branas.hwmonitor.gputemp') {
            ws.send(JSON.stringify({
                event: 'setTitle',
                context: context,
                payload: { title: '', target: 0 }
            }));
            updateGPUTemp(context);
            const interval = setInterval(() => updateGPUTemp(context), 10000);
            contexts.set(context, interval);
        }
    }
    
    if (event === 'willDisappear') {
        // Stop monitoring
        const interval = contexts.get(context);
        if (interval) {
            clearInterval(interval);
            contexts.delete(context);
        }
    }
    
    if (event === 'keyDown') {
        if (action === 'io.branas.hwmonitor.disk') {
            updateDiskSpace(context);
        } else if (action === 'io.branas.hwmonitor.cpu') {
            updateCPUUsage(context);
        } else if (action === 'io.branas.hwmonitor.memory') {
            updateMemoryUsage(context);
        } else if (action === 'io.branas.hwmonitor.network') {
            updateNetworkLatency(context);
        } else if (action === 'io.branas.hwmonitor.cputemp') {
            updateCPUTemp(context);
        } else if (action === 'io.branas.hwmonitor.gputemp') {
            updateGPUTemp(context);
        }
    }
});

ws.on('error', (err) => {
    console.error('WebSocket error:', err);
});

function createGridImage(usagePercent) {
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
                    ctx.fillStyle = '#00E600'; // Bright-Medium Green
                } else if (cellIndex < 80) {
                    ctx.fillStyle = '#FFD700'; // Bright-Medium Yellow/Gold
                } else {
                    ctx.fillStyle = '#FF4444'; // Bright-Medium Red
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
    // Get APFS container usage percentage
    exec("diskutil apfs list | grep 'Capacity In Use By Volumes' | head -1 | grep -o '([0-9.]*% used)' | grep -o '[0-9.]*'", (err, stdout) => {
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

        const usagePercent = parseFloat(stdout.trim()) || 0;
        const availablePercent = 100 - usagePercent;

        // Set the progress bar image - show available space (89% free = 89% green)
        const imageBase64 = createGridImage(availablePercent);
        ws.send(JSON.stringify({
            event: 'setImage',
            context: context,
            payload: {
                image: `data:image/png;base64,${imageBase64}`,
                target: 0
            }
        }));

        // Set the title with DISK label and available percentage
        const title = `DISK\n${usagePercent.toFixed(1)}%`;
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

function updateCPUUsage(context) {
    // Get CPU usage using top command (100 - idle%)
    exec("top -l 1 | grep 'CPU usage' | awk '{gsub(\"%\",\"\", $7); print int(100 - $7)}'", (err, stdout) => {
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
        
        const cpuUsage = parseInt(stdout.trim()) || 0;
        
        // Set the grid image - for CPU, we use usage directly (not inverted like disk)
        const imageBase64 = createGridImage(100 - cpuUsage); // Invert for visual consistency
        ws.send(JSON.stringify({
            event: 'setImage',
            context: context,
            payload: {
                image: `data:image/png;base64,${imageBase64}`,
                target: 0
            }
        }));
        
        // Set the title with CPU label above percentage
        const title = `CPU\n${cpuUsage}%`;
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

function updateMemoryUsage(context) {
    // Get memory free percentage using memory_pressure command
    exec("memory_pressure | tail -1 | awk '{print $5}' | tr -d '%'", (err, stdout) => {
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
        
        const memoryFree = parseInt(stdout.trim()) || 0;
        const memoryUsed = 100 - memoryFree;
        
        // Set the grid image - show used memory (grid fills as memory is used)
        const imageBase64 = createGridImage(memoryFree); // Pass free percentage for visual consistency
        ws.send(JSON.stringify({
            event: 'setImage',
            context: context,
            payload: {
                image: `data:image/png;base64,${imageBase64}`,
                target: 0
            }
        }));
        
        // Set the title with MEM label and used percentage
        const title = `MEM\n${memoryUsed}%`;
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

function updateNetworkLatency(context) {
    // Ping google.com and get latency
    exec("ping -c 1 google.com | grep 'round-trip' | awk -F'/' '{print $5}'", (err, stdout) => {
        let latency = 0;
        let latencyText = 'Error';
        
        if (!err && stdout.trim()) {
            latency = parseFloat(stdout.trim());
            latencyText = `${latency.toFixed(1)}ms`;
        }
        
        // Calculate grid fill based on linear scale: latency/20
        // 20ms = 10%, 40ms = 20%, 100ms = 50%, 200ms = 100%
        let fillPercent = 0;
        if (latency === 0 && err) {
            fillPercent = 0; // Error state
        } else {
            fillPercent = Math.min(100, (latency / 20) * 10); // Cap at 100%
        }
        
        // Set the grid image - higher latency = less green (worse)
        const imageBase64 = createGridImage(100 - fillPercent);
        ws.send(JSON.stringify({
            event: 'setImage',
            context: context,
            payload: {
                image: `data:image/png;base64,${imageBase64}`,
                target: 0
            }
        }));
        
        // Set the title with NET label and latency
        const title = `NET\n${latencyText}`;
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

function updateCPUTemp(context) {
    exec("/opt/homebrew/bin/smctemp -c", (err, stdout) => {
        if (err) {
            ws.send(JSON.stringify({
                event: 'setTitle',
                context: context,
                payload: { title: 'Error', target: 0 }
            }));
            return;
        }

        const temp = parseFloat(stdout.trim()) || 0;
        // Map 30°C=0%, 100°C=100%
        const percent = Math.max(0, Math.min(100, ((temp - 30) / 70) * 100));

        const imageBase64 = createGridImage(100 - percent);
        ws.send(JSON.stringify({
            event: 'setImage',
            context: context,
            payload: {
                image: `data:image/png;base64,${imageBase64}`,
                target: 0
            }
        }));

        const title = `CPU T\n${temp.toFixed(1)}°C`;
        ws.send(JSON.stringify({
            event: 'setTitle',
            context: context,
            payload: { title: title, target: 0 }
        }));
    });
}

function updateGPUTemp(context) {
    exec("/opt/homebrew/bin/smctemp -g", (err, stdout) => {
        if (err) {
            ws.send(JSON.stringify({
                event: 'setTitle',
                context: context,
                payload: { title: 'Error', target: 0 }
            }));
            return;
        }

        const temp = parseFloat(stdout.trim()) || 0;
        // Map 30°C=0%, 100°C=100%
        const percent = Math.max(0, Math.min(100, ((temp - 30) / 70) * 100));

        const imageBase64 = createGridImage(100 - percent);
        ws.send(JSON.stringify({
            event: 'setImage',
            context: context,
            payload: {
                image: `data:image/png;base64,${imageBase64}`,
                target: 0
            }
        }));

        const title = `GPU T\n${temp.toFixed(1)}°C`;
        ws.send(JSON.stringify({
            event: 'setTitle',
            context: context,
            payload: { title: title, target: 0 }
        }));
    });
}

// Keep the process running
process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));