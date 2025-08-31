#!/bin/bash

echo "========================================="
echo "Switching from diskspace to hwmonitor plugin"
echo "========================================="
echo ""

# Step 1: Uninstall old plugin
echo "Step 1: Uninstalling old diskspace plugin..."
rm -f ~/Library/Application\ Support/com.elgato.StreamDeck/Plugins/com.branas.diskspace.sdPlugin
echo "✓ Old plugin link removed"

# Step 2: Install dependencies for new plugin
echo ""
echo "Step 2: Installing dependencies for hwmonitor plugin..."
cd /Users/rodrigobranas/development/workspace/branas/elgato/com.branas.hwmonitor.sdPlugin
npm install
echo "✓ Dependencies installed"

# Step 3: Link new plugin
echo ""
echo "Step 3: Linking hwmonitor plugin to Stream Deck..."
ln -sf /Users/rodrigobranas/development/workspace/branas/elgato/com.branas.hwmonitor.sdPlugin ~/Library/Application\ Support/com.elgato.StreamDeck/Plugins/com.branas.hwmonitor.sdPlugin
echo "✓ New plugin linked"

# Step 4: Restart Stream Deck (optional, may need manual restart)
echo ""
echo "Step 4: Attempting to restart Stream Deck..."
if command -v streamdeck &> /dev/null; then
    streamdeck restart com.branas.hwmonitor
    echo "✓ Plugin restarted via CLI"
else
    echo "⚠ Stream Deck CLI not found. Please restart Stream Deck manually:"
    echo "  1. Quit Stream Deck from the menu bar"
    echo "  2. Reopen Stream Deck application"
fi

echo ""
echo "========================================="
echo "Installation complete!"
echo "========================================="
echo ""
echo "The HW Monitor plugin is now installed."
echo "Find it in the System category in Stream Deck."
echo ""
echo "If the plugin doesn't appear:"
echo "1. Restart the Stream Deck application"
echo "2. Look for 'HW Monitor' in the System category"
echo "3. Drag it to any key on your Stream Deck"