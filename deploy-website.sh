#!/bin/bash

##############################################################################
# KeyScopeX Website Deployment Script
# Domain: keyscopex.xproject.live
# Server IP: 23.95.75.174
#
# This script deploys the KeyScopeX website to your VPS
##############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
ORANGE='\033[0;33m'
NC='\033[0m'

echo -e "${ORANGE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║              KeyScopeX Website Deployment                     ║"
echo "║                  keyscopex.xproject.live                      ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Variables
DOMAIN="keyscopex.xproject.live"
WEB_ROOT="/var/www/keyscopex"
NGINX_CONF="/etc/nginx/sites-available/keyscopex"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Please run as root (use sudo)${NC}"
    exit 1
fi

##############################################################################
# Step 1: Install Nginx if not present
##############################################################################
echo -e "${GREEN}▶ Step 1: Checking Nginx installation${NC}"
if ! command -v nginx &> /dev/null; then
    echo "Installing Nginx..."
    apt-get update
    apt-get install -y nginx
    echo -e "${GREEN}✓ Nginx installed${NC}"
else
    echo -e "${GREEN}✓ Nginx already installed${NC}"
fi
echo ""

##############################################################################
# Step 2: Create web root directory
##############################################################################
echo -e "${GREEN}▶ Step 2: Creating web root directory${NC}"
mkdir -p $WEB_ROOT
echo -e "${GREEN}✓ Directory created: $WEB_ROOT${NC}"
echo ""

##############################################################################
# Step 3: Copy website files
##############################################################################
echo -e "${GREEN}▶ Step 3: Copying website files${NC}"
if [ -d "docs" ]; then
    cp -r docs/* $WEB_ROOT/
    echo -e "${GREEN}✓ Website files copied${NC}"
else
    echo -e "${RED}❌ docs/ directory not found${NC}"
    exit 1
fi
echo ""

##############################################################################
# Step 4: Set proper permissions
##############################################################################
echo -e "${GREEN}▶ Step 4: Setting permissions${NC}"
chown -R www-data:www-data $WEB_ROOT
chmod -R 755 $WEB_ROOT
echo -e "${GREEN}✓ Permissions set${NC}"
echo ""

##############################################################################
# Step 5: Configure Nginx
##############################################################################
echo -e "${GREEN}▶ Step 5: Configuring Nginx${NC}"
if [ -f "nginx.conf" ]; then
    cp nginx.conf $NGINX_CONF
    
    # Create symbolic link
    if [ ! -L "/etc/nginx/sites-enabled/keyscopex" ]; then
        ln -s $NGINX_CONF /etc/nginx/sites-enabled/keyscopex
    fi
    
    # Test Nginx configuration
    nginx -t
    echo -e "${GREEN}✓ Nginx configured${NC}"
else
    echo -e "${YELLOW}⚠️  nginx.conf not found, skipping Nginx configuration${NC}"
fi
echo ""

##############################################################################
# Step 6: Restart Nginx
##############################################################################
echo -e "${GREEN}▶ Step 6: Restarting Nginx${NC}"
systemctl restart nginx
systemctl enable nginx
echo -e "${GREEN}✓ Nginx restarted${NC}"
echo ""

##############################################################################
# Step 7: Configure Firewall (if UFW is installed)
##############################################################################
echo -e "${GREEN}▶ Step 7: Configuring firewall${NC}"
if command -v ufw &> /dev/null; then
    ufw allow 'Nginx Full'
    echo -e "${GREEN}✓ Firewall configured${NC}"
else
    echo -e "${YELLOW}⚠️  UFW not installed, skipping firewall configuration${NC}"
fi
echo ""

##############################################################################
# Step 8: SSL Setup Instructions (Let's Encrypt)
##############################################################################
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📋 Optional: Setup SSL Certificate (HTTPS)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "To enable HTTPS, install certbot and obtain an SSL certificate:"
echo ""
echo -e "${ORANGE}  sudo apt-get install certbot python3-certbot-nginx${NC}"
echo -e "${ORANGE}  sudo certbot --nginx -d $DOMAIN${NC}"
echo ""
echo "Certbot will automatically configure HTTPS for you."
echo ""

##############################################################################
# Final Summary
##############################################################################
echo -e "${ORANGE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║              🎉 Deployment Complete! 🎉                       ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${GREEN}✅ KeyScopeX website deployed successfully!${NC}\n"

echo -e "${BLUE}🌐 Access your website at:${NC}"
echo -e "   http://$DOMAIN"
echo -e "   http://23.95.75.174\n"

echo -e "${BLUE}📂 Website files location:${NC}"
echo -e "   $WEB_ROOT\n"

echo -e "${BLUE}📝 Nginx configuration:${NC}"
echo -e "   $NGINX_CONF\n"

echo -e "${YELLOW}📋 Next Steps:${NC}"
echo -e "   1. Ensure DNS A record points to 23.95.75.174"
echo -e "   2. Wait for DNS propagation (up to 48 hours)"
echo -e "   3. Install SSL certificate using certbot (see instructions above)"
echo -e "   4. Test your website: http://$DOMAIN\n"

echo -e "${ORANGE}🧡 Made with love by LineWatchX Project${NC}\n"

exit 0

