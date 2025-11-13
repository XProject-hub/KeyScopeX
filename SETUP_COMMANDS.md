# KeyScopeX - Setup Commands

## 🎯 Complete Setup for Fresh Ubuntu 22.04

### One-Line Installation (Recommended)

```bash
git clone https://github.com/XProject-hub/KeyScopeX.git && cd KeyScopeX && chmod +x install-ubuntu.sh && ./install-ubuntu.sh
```

### Step-by-Step Installation

```bash
# 1. Clone the repository
git clone https://github.com/XProject-hub/KeyScopeX.git

# 2. Navigate to directory
cd KeyScopeX

# 3. Make install script executable
chmod +x install-ubuntu.sh

# 4. Run the automated installer
./install-ubuntu.sh
```

---

## 📋 What the Installer Does

The `install-ubuntu.sh` script automatically:

1. ✅ Updates system packages
2. ✅ Installs Node.js 21.x
3. ✅ Installs Python 3 and pip
4. ✅ Installs Pillow (for icon generation)
5. ✅ Installs Git and build tools
6. ✅ Installs all npm dependencies (root + frontend)
7. ✅ Builds the KeyScopeX extension
8. ✅ Generates the `extension-release` folder

**Total Time**: ~5-10 minutes (depending on internet speed)

---

## 🖥️ Manual Commands (If You Prefer)

### Install Node.js 21
```bash
curl -fsSL https://deb.nodesource.com/setup_21.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Install Dependencies
```bash
sudo apt-get update
sudo apt-get install -y build-essential git python3 python3-pip
pip3 install Pillow --user
```

### Clone and Build
```bash
git clone https://github.com/XProject-hub/KeyScopeX.git
cd KeyScopeX
npm install
cd frontend && npm install && cd ..
npm run buildext
```

---

## 🔄 Update Existing Installation

```bash
# Navigate to KeyScopeX directory
cd KeyScopeX

# Pull latest changes
git pull origin main

# Rebuild extension
npm run buildext
```

---

## 🌐 Load Extension in Browser

After installation is complete:

```bash
# The extension will be at:
KeyScopeX/extension-release/
```

**Steps to load in Chrome/Edge:**

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Navigate to and select: `KeyScopeX/extension-release/`
5. Done! 🎉

---

## 🧪 Quick Test

Verify everything works:

```bash
# Check Node.js version (should be 21+)
node --version

# Check npm version
npm --version

# Check if extension-release exists
ls -la extension-release/

# Should see these files:
# - manifest.json
# - background.js
# - content.js
# - inject.js
# - index.html
# - icons/ folder
# - assets/ folder
```

---

## 🚀 Quick Start After Installation

1. **Open KeyScopeX** - Click the extension icon in your browser
2. **Configure CDRM** - Go to Settings → Enter CDRM instance URL
3. **Capture Keys** - Navigate to DRM content → Click "Capture Current Tab"
4. **Play Video** - Keys will appear automatically
5. **Export** - Copy or export as JSON

---

## 📦 Repository Info

- **Website**: https://keyscopex.xproject.live
- **GitHub**: https://github.com/XProject-hub/KeyScopeX
- **Clone URL**: `https://github.com/XProject-hub/KeyScopeX.git`
- **Server IP**: 23.95.75.174
- **Version**: 1.0.0
- **License**: ISC

---

## 🛠️ Troubleshooting

### Permission Denied
```bash
chmod +x install-ubuntu.sh
```

### Node.js Not Found
```bash
# Verify installation
which node
node --version

# If missing, reinstall
curl -fsSL https://deb.nodesource.com/setup_21.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Build Fails
```bash
# Clean everything
rm -rf node_modules package-lock.json
rm -rf frontend/node_modules frontend/package-lock.json

# Reinstall
npm install
cd frontend && npm install && cd ..
npm run buildext
```

---

## 📚 Documentation

- **Installation Guide**: [INSTALL.md](INSTALL.md)
- **Quick Start**: [QUICKSTART.md](QUICKSTART.md)
- **Full Documentation**: [README.md](README.md)
- **Changelog**: [CHANGELOG_KeyScopeX.md](CHANGELOG_KeyScopeX.md)

---

## 💡 Tips

- **First Time?** Use the automated installer
- **Updating?** Just run `git pull` and `npm run buildext`
- **Issues?** Check the troubleshooting section above
- **Need Help?** Open an issue on GitHub

---

<div align="center">

### 🎉 Enjoy KeyScopeX! 🎉

**Made with 🧡 by LineWatchX Project**

[Report Bug](https://github.com/XProject-hub/KeyScopeX/issues) • 
[Request Feature](https://github.com/XProject-hub/KeyScopeX/issues)

</div>

