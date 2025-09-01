#!/bin/bash

echo "Installing HW Monitor Stream Deck Plugin"
echo "========================================="

PLUGIN_DIR="$(dirname "$0")"
cd "$PLUGIN_DIR"

# Install dependencies
echo "Installing dependencies..."
npm install

# Link to Stream Deck
echo "Linking plugin to Stream Deck..."
ln -sf "$PWD" ~/Library/Application\ Support/com.elgato.StreamDeck/Plugins/io.branas.hwmonitor.sdPlugin

# Attempt to restart the plugin (if streamdeck CLI is available)
echo "Attempting to restart plugin..."
if command -v streamdeck &> /dev/null; then
    streamdeck restart io.branas.hwmonitor
else
    echo "Stream Deck CLI not found. Please restart Stream Deck manually."
fi

echo ""
echo "Installation complete!"
echo ""
echo "To use the plugin:"
echo "1. Open Stream Deck application"
echo "2. Find 'HW Monitor' in the HW Monitor category"
echo "3. Choose from available monitors:"
echo "   - Disk Monitor: Shows disk usage"
echo "   - CPU Monitor: Shows CPU usage"
echo "   - Memory Monitor: Shows memory usage"
echo "   - Network Monitor: Shows network latency"
echo "4. Drag any monitor to a key on your Stream Deck"