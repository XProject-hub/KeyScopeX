# Quick Fix for Update Issues

## Issue 1: Local Changes Conflict

### Fix (Run on local machine):
```bash
cd ~/KeyScopeX
git stash
git pull origin main
npm run buildext
```

This will:
- Save your local changes
- Pull latest from GitHub
- Rebuild extension

---

## Issue 2: Panel Not on VPS Yet

### First Time Panel Setup (Run on VPS):
```bash
# SSH to VPS
ssh root@23.95.75.174

# Create directories
mkdir -p /var/www/keyscopex

# Clone repository
cd /var/www/keyscopex
git clone https://github.com/XProject-hub/KeyScopeX.git

# Setup database
cd KeyScopeX
mysql -u root -p < panel/database/schema.sql

# Move panel to web directory
cp -r panel /var/www/keyscopex/

# Configure database
nano /var/www/keyscopex/panel/backend/config/database.php
# Change DB_USER and DB_PASS

# Set permissions
chmod -R 755 /var/www/keyscopex/panel
chown -R www-data:www-data /var/www/keyscopex/panel
mkdir -p /var/www/keyscopex/panel/logs
chmod 777 /var/www/keyscopex/panel/logs

# Restart services
systemctl restart nginx php8.1-fpm

echo "✅ Panel deployed!"
```

---

## Future Updates (After First Setup)

### Update Extension:
```bash
cd ~/KeyScopeX && git pull && npm run buildext
```

### Update Panel:
```bash
ssh root@23.95.75.174 "cd /var/www/keyscopex/KeyScopeX && git pull && cp -r panel/* /var/www/keyscopex/panel/ && systemctl restart nginx"
```

---

Made with 🧡 by LineWatchX Project

