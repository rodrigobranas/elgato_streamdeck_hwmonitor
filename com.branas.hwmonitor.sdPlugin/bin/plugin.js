const { exec } = require('child_process');
const WebSocket = require('ws');

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

function updateDiskSpace(context) {
    exec("df -h / | awk 'NR==2 {print $4}'", (err, stdout) => {
        const space = err ? 'Error' : (stdout.trim() || 'N/A');
        
        ws.send(JSON.stringify({
            event: 'setTitle',
            context: context,
            payload: {
                title: space,
                target: 0
            }
        }));
    });
}

// Keep the process running
process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));