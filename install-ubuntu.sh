#!/bin/bash

##############################################################################
# KeyScopeX - Automated Installation Script for Ubuntu 22.04
# LineWatchX Project
# 
# This script installs all dependencies and builds the KeyScopeX extension
##############################################################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
ORANGE='\033[0;33m'
NC='\033[0m' # No Color

# Banner
echo -e "${ORANGE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║                    KeyScopeX Installer                        ║"
echo "║              Advanced DRM Key Extraction Tool                 ║"
echo "║                  by LineWatchX Project                        ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if running on Ubuntu
if [ ! -f /etc/os-release ]; then
    echo -e "${RED}❌ Cannot detect OS version${NC}"
    exit 1
fi

. /etc/os-release
if [[ "$ID" != "ubuntu" ]]; then
    echo -e "${YELLOW}⚠️  This script is designed for Ubuntu. Detected: $ID${NC}"
    echo -e "${YELLOW}Continuing anyway, but some steps might fail...${NC}"
fi

echo -e "${BLUE}🖥️  Detected: $PRETTY_NAME${NC}"
echo ""

# Function to print step
print_step() {
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}▶ $1${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

##############################################################################
# Step 1: Update System
##############################################################################
print_step "Step 1/7: Updating system packages"
sudo apt-get update
echo -e "${GREEN}✓ System updated${NC}\n"

##############################################################################
# Step 2: Install Node.js 21
##############################################################################
print_step "Step 2/7: Installing Node.js 21.x"

if command_exists node; then
    NODE_VERSION=$(node --version | cut -d 'v' -f 2 | cut -d '.' -f 1)
    if [ "$NODE_VERSION" -ge 21 ]; then
        echo -e "${GREEN}✓ Node.js $(node --version) already installed${NC}\n"
    else
        echo -e "${YELLOW}⚠️  Node.js $NODE_VERSION detected, upgrading to v21...${NC}"
        sudo apt-get remove -y nodejs || true
        curl -fsSL https://deb.nodesource.com/setup_21.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
else
    echo "Installing Node.js 21.x..."
    curl -fsSL https://deb.nodesource.com/setup_21.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo -e "${GREEN}✓ Node.js $(node --version) installed${NC}"
echo -e "${GREEN}✓ npm $(npm --version) installed${NC}\n"

##############################################################################
# Step 3: Install Python 3 and pip (for icon generation)
##############################################################################
print_step "Step 3/7: Installing Python 3 and pip"

sudo apt-get install -y python3 python3-pip
echo -e "${GREEN}✓ Python $(python3 --version) installed${NC}"
echo -e "${GREEN}✓ pip installed${NC}\n"

##############################################################################
# Step 4: Install Pillow for icon generation
##############################################################################
print_step "Step 4/7: Installing Pillow (Python image library)"

pip3 install Pillow --user
echo -e "${GREEN}✓ Pillow installed${NC}\n"

##############################################################################
# Step 5: Install Git (if not present)
##############################################################################
print_step "Step 5/7: Checking Git installation"

if command_exists git; then
    echo -e "${GREEN}✓ Git $(git --version) already installed${NC}\n"
else
    sudo apt-get install -y git
    echo -e "${GREEN}✓ Git installed${NC}\n"
fi

##############################################################################
# Step 6: Install Build Dependencies
##############################################################################
print_step "Step 6/7: Installing build dependencies"

sudo apt-get install -y build-essential curl wget
echo -e "${GREEN}✓ Build tools installed${NC}\n"

##############################################################################
# Step 7: Build KeyScopeX Extension
##############################################################################
print_step "Step 7/7: Building KeyScopeX Extension"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found${NC}"
    echo -e "${RED}Please run this script from the KeyScopeX root directory${NC}"
    exit 1
fi

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install --production=false
cd ..

# Build the extension
echo "🔨 Building extension..."
npm run buildext

echo -e "${GREEN}✓ Extension built successfully!${NC}\n"

##############################################################################
# Final Summary
##############################################################################
echo -e "${ORANGE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║              🎉 Installation Complete! 🎉                     ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${GREEN}✅ KeyScopeX has been successfully built!${NC}\n"

echo -e "${BLUE}📂 Extension location:${NC}"
echo -e "   $(pwd)/extension-release/\n"

echo -e "${BLUE}📋 Next Steps:${NC}"
echo -e "   1. Open Chrome/Edge browser"
echo -e "   2. Navigate to chrome://extensions/"
echo -e "   3. Enable 'Developer mode' (top-right toggle)"
echo -e "   4. Click 'Load unpacked'"
echo -e "   5. Select the 'extension-release' folder"
echo -e "   6. Start capturing DRM keys! 🔑\n"

echo -e "${YELLOW}📚 Documentation:${NC}"
echo -e "   • README.md - Full documentation"
echo -e "   • QUICKSTART.md - Quick start guide"
echo -e "   • CHANGELOG_KeyScopeX.md - Change history\n"

echo -e "${ORANGE}🧡 Made with love by LineWatchX Project${NC}\n"

# Check if extension-release exists
if [ -d "extension-release" ]; then
    echo -e "${GREEN}✓ Extension ready at: extension-release/${NC}"
    echo -e "${GREEN}✓ You can now load it in your browser!${NC}\n"
else
    echo -e "${RED}❌ Warning: extension-release directory not found${NC}"
    echo -e "${RED}Something went wrong during the build${NC}\n"
    exit 1
fi

exit 0

