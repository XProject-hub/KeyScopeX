# KeyScopeX - DRM Key Extractor

<div align="center">
  <img src="frontend/src/assets/keyscopex-logo.png" alt="KeyScopeX Logo" width="300"/>
  
  **Advanced DRM key extraction and decryption tool by LineWatchX Project**
  
  [![Version](https://img.shields.io/badge/version-1.0.0-orange.svg)](https://github.com/XProject-hub/KeyScopeX)
  [![License](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)
  [![Chrome](https://img.shields.io/badge/chrome-extension-brightgreen.svg)](https://developer.chrome.com/docs/extensions/)
  [![Website](https://img.shields.io/badge/website-keyscopex.xproject.live-orange.svg)](https://keyscopex.xproject.live)
</div>

---

## 🚀 Features

- **Multi-DRM Support**: Extract keys from Widevine, PlayReady, and ClearKey protected content
- **Dark Theme**: Beautiful dark theme with orange accents matching the LineWatchX branding
- **Real-Time Capture**: Automatically captures DRM keys as content plays
- **Multiple Injection Methods**: Support for License Request and EME API injection
- **JSON Export**: Export captured data in JSON format for use with decryption tools
- **Modern UI**: Built with React, Vite, and TailwindCSS + DaisyUI
- **Developer Friendly**: Easy-to-use interface with copy-to-clipboard functionality

---

## 📋 Prerequisites

- **Node.js** v21 or higher ([Download Node.js](https://nodejs.org/))
- A **CDRM instance** to handle decryption (e.g., cdrm-project.com or your own server)
- Chrome, Edge, or any Chromium-based browser

---

## 🔧 Build Instructions

### 1. Clone the repository

```bash
git clone https://github.com/XProject-hub/KeyScopeX.git
cd KeyScopeX
```

### 2. Install dependencies

```bash
npm install
```

### 3. Build the extension

```bash
npm run buildext
```

This will:
- Sync version numbers across the project
- Install frontend dependencies if needed
- Build the React frontend with Vite
- Copy extension core files to `extension-release`
- Copy icons and assets
- Generate the production-ready extension

### 4. Load the extension in your browser

1. Open Chrome/Edge and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select the `extension-release` folder
5. The KeyScopeX extension should now appear in your browser!

---

## 🎨 Design & Branding

KeyScopeX features a premium dark theme with:
- **Primary Color**: Orange (#ff6b35) - matching the LineWatchX logo
- **Dark Background**: Deep blue-grays for comfortable viewing
- **Modern UI**: Smooth animations, glowing effects, and responsive design
- **Custom Icons**: Generated from the LineWatchX logo in 16x16, 32x32, and 128x128 sizes

---

## 📚 How to Use

### Initial Setup

1. Click the KeyScopeX extension icon in your browser
2. Navigate to the **Settings** tab
3. Enter your CDRM instance URL (e.g., `https://cdrm-project.com/` or `http://127.0.0.1:5000/`)
4. Click **Connect Instance**
5. Wait for the connection to be validated

### Capturing DRM Keys

1. Navigate to a webpage with DRM-protected content
2. Click the KeyScopeX extension icon
3. Click **Capture Current Tab**
4. Play the video on the page
5. KeyScopeX will automatically extract:
   - DRM Type (Widevine, PlayReady, or ClearKey)
   - PSSH (Protection System Specific Header)
   - License URL
   - Decryption Keys
   - Manifest URL

### Exporting Data

1. Once keys are captured, click **Copy** buttons to copy individual fields
2. Or click **Export as JSON** to download all data in a structured JSON file
3. Use the exported data with your preferred decryption tools

---

## 🛠️ Project Structure

```
CDRM-Extension/
├── frontend/                  # React frontend application
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── assets/          # Logo, fonts, icons
│   │   ├── App.jsx          # Main application
│   │   └── index.css        # Dark theme styles
│   ├── package.json
│   └── vite.config.js
├── src/                      # Extension core files
│   ├── background.js        # Background service worker
│   ├── content.js           # Content script
│   ├── inject.js            # Page injection script
│   └── manifest.json        # Extension manifest
├── icons/                    # Extension icons (16, 32, 128)
├── extension-release/        # Built extension (load this in browser)
├── buildext.js              # Build script
├── syncVersion.js           # Version synchronization
├── package.json
└── README.md
```

---

## 🔐 Legal Notice

**⚠️ IMPORTANT: This tool is intended for educational and research purposes only.**

Users are responsible for ensuring their use complies with applicable laws and regulations. Always respect content creators' rights and licensing agreements. The developers of KeyScopeX are not responsible for any misuse of this tool.

---

## 🤝 Support & Community

- **Website**: [keyscopex.xproject.live](https://keyscopex.xproject.live)
- **GitHub**: [github.com/XProject-hub/KeyScopeX](https://github.com/XProject-hub/KeyScopeX)
- **Server**: 23.95.75.174
- **Discord**: Join our community

---

## 📝 Version History

### v1.0.0 (November 2024)
- 🎨 Complete redesign with dark theme
- 🔧 Integrated LineWatchX branding and logo
- ✨ Enhanced UI with modern components
- 🚀 Improved build process
- 📱 Better mobile/responsive support
- 🎯 Optimized performance

---

## 🙏 Acknowledgments

- Original CDRM Extension project
- CDRM-Project community
- LineWatchX Project team

---

## 📄 License

ISC License - see LICENSE file for details

---

<div align="center">
  Made with 🧡 by <strong>LineWatchX Project</strong>
  <br><br>
  © 2024 KeyScopeX. All rights reserved.
</div>
