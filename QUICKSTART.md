# KeyScopeX Quick Start Guide

## ⚡ Super Quick Setup (5 minutes)

### Step 1: Build the Extension
```bash
cd CDRM-Extension
npm install
npm run buildext
```

### Step 2: Load in Browser
1. Open Chrome and go to `chrome://extensions/`
2. Toggle **Developer mode** ON (top right)
3. Click **Load unpacked**
4. Select the `extension-release` folder
5. Done! 🎉

### Step 3: Configure CDRM Instance
1. Click the KeyScopeX icon in your browser toolbar
2. Go to **Settings** tab
3. Enter your CDRM instance URL:
   - Public: `https://cdrm-project.com/`
   - Local: `http://127.0.0.1:5000/`
4. Click **Connect Instance**
5. Wait for success message ✓

### Step 4: Extract Your First Keys
1. Navigate to a site with DRM-protected video
2. Click KeyScopeX icon
3. Click **Capture Current Tab** button
4. Play the video
5. Watch the keys appear! 🔑

---

## 🎯 Key Features at a Glance

| Feature | Description |
|---------|-------------|
| **Capture** | One-click DRM key extraction |
| **Copy** | Quick copy buttons for all fields |
| **Export** | Download as JSON file |
| **Injection** | License or EME methods |
| **Live Updates** | Real-time key display |

---

## 🚨 Troubleshooting

### Extension won't load
- Make sure you selected the `extension-release` folder, not the root folder
- Check that Developer mode is enabled

### No keys captured
- Ensure your CDRM instance is properly configured
- Check that injection type is set (not "Disabled")
- Try reloading the page and playing the video again

### Build fails
- Verify Node.js v21+ is installed: `node --version`
- Delete `node_modules` and `package-lock.json`, then run `npm install` again
- In the frontend folder, run `npm install --production=false`

---

## 💡 Pro Tips

1. **Best Injection Method**: Use "License" for most sites
2. **Multiple Keys**: Some videos have multiple keys - KeyScopeX captures them all
3. **JSON Export**: Use the export feature to save keys for later use
4. **Dark Theme**: The interface is optimized for low-light use 🌙

---

## 📞 Need Help?

- Check the main [README.md](README.md) for detailed documentation
- Join our Discord community for support
- Report bugs on GitHub Issues

---

**Happy key hunting! 🔍🔑**

*- LineWatchX Project Team*

