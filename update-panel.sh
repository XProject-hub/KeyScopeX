#!/bin/bash
##############################################################################
# KeyScopeX Panel - One-Command Update Script (Run on VPS)
# Updates panel files from GitHub
# LineWatchX Project
##############################################################################

echo "🔄 Updating KeyScopeX Panel from GitHub..."

# Navigate to panel directory
cd /var/www/keyscopex

# Backup current panel
echo "💾 Backing up current panel..."
cp -r panel panel-backup-$(date +%Y%m%d-%H%M%S)

# Pull latest changes
if [ -d "KeyScopeX" ]; then
    cd KeyScopeX
    git pull origin main
else
    git clone https://github.com/XProject-hub/KeyScopeX.git
    cd KeyScopeX
fi

# Update panel files
echo "📦 Updating panel files..."
cp -r panel/* /var/www/keyscopex/panel/

# Set permissions
echo "🔐 Setting permissions..."
chmod -R 755 /var/www/keyscopex/panel
chown -R www-data:www-data /var/www/keyscopex/panel

# Restart services
echo "🔄 Restarting services..."
systemctl restart nginx
systemctl restart php8.1-fpm

echo "✅ Panel updated successfully!"
echo "🌐 Panel URL: https://keyscopex.xproject.live/panel/"
echo ""
echo "🧡 Made by LineWatchX Project"

