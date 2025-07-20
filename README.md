# CDRM Extension

An extension to show keys from DRM protected content, which are used to decrypt content.

## Notes

Keep these extension core files inside `src`:

- `background.js`
- `content.js`
- `inject.js`
- `manifest.json`

Frontend React source stays in `frontend`.

The build process will take care of everything into `extension-release`.

To update the version across the entire project, simply change the version number in the root `package.json`. The build script will handle version sync automatically to both the extension's version and the frontend's title bar.

## Build instructions

### Prerequisites

- Node.js v21 or higher. [Download Node.js here](https://nodejs.org/en/download).

### How to build by yourself

- Open terminal at the project root

- Run the build script:

```bash
npm run buildext
```

This will:

- Sync the version number from the root `package.json` to `src/manifest.json` and `frontend/package.json`
- Install frontend dependencies if needed
- Build the React frontend
- Clean and prepare the `extension-release` folder
- Copy extension files in `src`, built frontend assets, and icons into `extension-release`

### How to load the extension in Google Chrome or Chromium browsers

1. Go to `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `extension-release` folder
4. Verify the extension is working by clicking its icon or opening the developer console (F12) to check for any logs or errors.
