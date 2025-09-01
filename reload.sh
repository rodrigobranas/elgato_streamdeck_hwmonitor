#!/bin/bash

echo "========================================="
echo "Reloading HW Monitor Plugin"
echo "========================================="
echo ""

# Kill any existing plugin processes
echo "Stopping existing plugin processes..."
pkill -f "io.branas.hwmonitor" 2>/dev/null
echo "✓ Plugin processes stopped"

echo ""
echo "========================================="
echo "Reload complete!"
echo "========================================="
echo ""
echo "The Stream Deck will automatically restart the plugin"
echo "when you use it next time."
echo ""
echo "If the changes don't appear:"
echo "1. Quit Stream Deck from the menu bar"
echo "2. Reopen Stream Deck application"