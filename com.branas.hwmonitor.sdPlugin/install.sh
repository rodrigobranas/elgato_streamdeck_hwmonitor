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
ln -sf "$PWD" ~/Library/Application\ Support/com.elgato.StreamDeck/Plugins/com.branas.hwmonitor.sdPlugin

# Restart the plugin
echo "Restarting plugin..."
streamdeck restart com.branas.hwmonitor

echo ""
echo "Installation complete!"
echo ""
echo "To use the plugin:"
echo "1. Open Stream Deck application"
echo "2. Find 'HW Monitor' in the System category"
echo "3. Drag it to any key on your Stream Deck"
echo ""
echo "The plugin will show available disk space and update every 5 seconds."