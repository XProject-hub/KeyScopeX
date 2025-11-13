#!/bin/bash
##############################################################################
# KeyScopeX - One-Command Update Script
# Updates extension and panel from GitHub
# LineWatchX Project
##############################################################################

echo "🔄 Updating KeyScopeX from GitHub..."

# Pull latest changes
git pull origin main

# Rebuild extension
echo "🔨 Rebuilding extension..."
npm install
cd frontend && npm install && cd ..
npm run buildext

echo "✅ Extension updated! Reload in chrome://extensions/"
echo "📦 Updated extension: extension-release/"
echo ""
echo "🧡 Made by LineWatchX Project"

