// Open popout window when the extension icon is clicked
chrome.browserAction.onClicked.addListener(() => {
  chrome.windows.create({
    url: chrome.runtime.getURL("react/index.html"),
    type: "popup",  // opens as a floating window
    width: 800,
    height: 600
  });
});

// Listen for messages and store data in chrome.storage.local
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { type, data } = message;

  switch (type) {
    case "DRM_TYPE":
      console.log("DRM Type:", data);
      chrome.storage.local.set({ drmType: data });
      break;

    case "PSSH_DATA":
      console.log("Storing PSSH:", data);
      chrome.storage.local.set({ latestPSSH: data });
      break;

    case "KEYS_DATA":
      console.log("Storing Decryption Keys:", data);
      chrome.storage.local.set({ latestKeys: data });
      break;
    
    case "LICENSE_URL":
      console.log("Storling License URL " + data);
      chrome.storage.local.set({licenseURL: data});
      break;

    default:
      console.warn("Unknown message type received:", type);
  }
});

// Set initial config and injection type on install
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.storage.local.set({ valid_config: false }, () => {
      if (chrome.runtime.lastError) {
        console.error("Error setting valid_config:", chrome.runtime.lastError);
      } else {
        console.log("valid_config set to false on first install.");
      }
    });

    chrome.storage.local.set({ injection_type: "LICENSE" }, () => {
      if (chrome.runtime.lastError) {
        console.error("Error setting Injection Type:", chrome.runtime.lastError);
      } else {
        console.log("Injection type set to LICENSE on first install.");
      }
    });

    chrome.storage.local.set({ drm_override: "DISABLED" }, () => {
      if (chrome.runtime.lastError) {
        console.error("Error setting DRM Override type:", chrome.runtime.lastError);
      } else {
        console.log("DRM Override type set to DISABLED on first install.");
      }
    });

    chrome.storage.local.set({ cdrm_instance: null }, () => {
      if (chrome.runtime.lastError) {
        console.error("Error setting CDRM instance:", chrome.runtime.lastError);
      } else {
        console.log("CDRM instance set to null.");
      }
    });

    chrome.storage.local.set({ cdrm_api_key: null }, () => {
      if (chrome.runtime.lastError) {
        console.error("Error setting CDRM API Key:", chrome.runtime.lastError);
      } else {
        console.log("CDRM API Key set.");
      }
    });
  }
});
