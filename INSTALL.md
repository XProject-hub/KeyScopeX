# KeyScopeX Installation Guide

## 🚀 One-Command Installation (Ubuntu 22.04)

### Fresh Installation from GitHub

```bash
# Clone the repository
git clone https://github.com/XProject-hub/KeyScopeX.git

# Navigate to directory
cd KeyScopeX

# Make install script executable
chmod +x install-ubuntu.sh

# Run the installer
./install-ubuntu.sh
```

That's it! The script will:
- ✅ Update system packages
- ✅ Install Node.js 21.x
- ✅ Install Python 3 and pip
- ✅ Install Pillow for icon generation
- ✅ Install Git and build tools
- ✅ Install all npm dependencies
- ✅ Build the extension
- ✅ Generate extension-release folder

---

## 📦 Manual Installation (Any OS)

### Prerequisites
- Node.js v21 or higher
- npm (comes with Node.js)
- Git

### Steps

```bash
# 1. Clone repository
git clone https://github.com/XProject-hub/KeyScopeX.git
cd KeyScopeX

# 2. Install dependencies
npm install

# 3. Install frontend dependencies
cd frontend
npm install
cd ..

# 4. Build extension
npm run buildext
```

---

## 🖥️ OS-Specific Instructions

### Ubuntu/Debian

```bash
# Install Node.js 21
curl -fsSL https://deb.nodesource.com/setup_21.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install build tools
sudo apt-get install -y build-essential git

# Clone and build
git clone https://github.com/XProject-hub/KeyScopeX.git
cd KeyScopeX
npm install
npm run buildext
```

### Windows

```powershell
# Install Node.js 21 from https://nodejs.org/

# Clone repository
git clone https://github.com/XProject-hub/KeyScopeX.git
cd KeyScopeX

# Install and build
npm install
npm run buildext
```

### macOS

```bash
# Install Node.js with Homebrew
brew install node@21

# Clone and build
git clone https://github.com/XProject-hub/KeyScopeX.git
cd KeyScopeX
npm install
npm run buildext
```

---

## 🔧 Load Extension in Browser

1. Open Chrome/Edge and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the `extension-release` folder
5. Done! 🎉

---

## 🐛 Troubleshooting

### Node.js version too old
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_21.x | sudo -E bash -
sudo apt-get install -y nodejs

# Or use nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 21
nvm use 21
```

### Build fails
```bash
# Clean and rebuild
rm -rf node_modules package-lock.json
rm -rf frontend/node_modules frontend/package-lock.json
npm install
cd frontend && npm install && cd ..
npm run buildext
```

### Permission denied on Linux
```bash
chmod +x install-ubuntu.sh
```

---

## 📚 Additional Resources

- **Quick Start**: See [QUICKSTART.md](QUICKSTART.md)
- **Full Documentation**: See [README.md](README.md)
- **Changelog**: See [CHANGELOG_KeyScopeX.md](CHANGELOG_KeyScopeX.md)

---

## 💡 Need Help?

- 🌐 Website: https://keyscopex.xproject.live
- 📧 GitHub Issues: https://github.com/XProject-hub/KeyScopeX/issues
- 💬 Discord: Join our community
- 📖 Documentation: Check README.md
- 🖥️ Server: 23.95.75.174

---

<div align="center">

**Made with 🧡 by LineWatchX Project**

</div>

