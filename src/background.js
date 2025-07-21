chrome.action.onClicked.addListener(() => {
    chrome.windows.create({
        url: chrome.runtime.getURL("index.html"),
        type: "popup",
        width: 800,
        height: 600,
    });
});

// Listen for messages and store data in chrome.storage.local
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const { type, data } = message;

    switch (type) {
        case "DRM_TYPE":
            logWithPrefix("DRM Type:", data);
            chrome.storage.local.set({ drmType: data });
            break;

        case "PSSH_DATA":
            logWithPrefix("Storing PSSH:", data);
            chrome.storage.local.set({ latestPSSH: data });
            break;

        case "KEYS_DATA":
            logWithPrefix("Storing Decryption Keys:", data);
            chrome.storage.local.set({ latestKeys: data });
            break;

        case "LICENSE_URL":
            logWithPrefix("Storling License URL " + data);
            chrome.storage.local.set({ licenseURL: data });
            break;

        case "MANIFEST_URL":
            logWithPrefix("Storing Manifest URL:", data);
            chrome.storage.local.set({ manifestURL: data });
            break;

        default:
            console.warn("Unknown message type received:", type);
    }
});

// Set initial config and injection type on install
chrome.runtime.onInstalled.addListener((details) => {
    const EXTENSION_PREFIX = "[CDRM EXTENSION]";
    const PREFIX_COLOR = "black";
    const PREFIX_BACKGROUND_COLOR = "yellow";

    const logWithPrefix = (...args) => {
        const style = `color: ${PREFIX_COLOR}; background: ${PREFIX_BACKGROUND_COLOR}; font-weight: bold; padding: 2px 4px; border-radius: 2px;`;
        if (typeof args[0] === "string") {
            // If the first arg is a string, prepend the prefix
            console.log(`%c${EXTENSION_PREFIX}%c ${args[0]}`, style, "", ...args.slice(1));
        } else {
            // If not, just log the prefix and the rest
            console.log(`%c${EXTENSION_PREFIX}`, style, ...args);
        }
    };

    if (details.reason === "install") {
        chrome.storage.local.set({ valid_config: false }, () => {
            if (chrome.runtime.lastError) {
                console.error("Error setting valid_config:", chrome.runtime.lastError);
            } else {
                logWithPrefix("valid_config set to false on first install.");
            }
        });

        chrome.storage.local.set({ injection_type: "LICENSE" }, () => {
            if (chrome.runtime.lastError) {
                console.error("Error setting Injection Type:", chrome.runtime.lastError);
            } else {
                logWithPrefix("Injection type set to LICENSE on first install.");
            }
        });

        chrome.storage.local.set({ drm_override: "DISABLED" }, () => {
            if (chrome.runtime.lastError) {
                console.error("Error setting DRM Override type:", chrome.runtime.lastError);
            } else {
                logWithPrefix("DRM Override type set to DISABLED on first install.");
            }
        });

        chrome.storage.local.set({ cdrm_instance: null }, () => {
            if (chrome.runtime.lastError) {
                console.error("Error setting CDRM instance:", chrome.runtime.lastError);
            } else {
                logWithPrefix("CDRM instance set to null.");
            }
        });

        chrome.storage.local.set({ cdrm_api_key: null }, () => {
            if (chrome.runtime.lastError) {
                console.error("Error setting CDRM API Key:", chrome.runtime.lastError);
            } else {
                logWithPrefix("CDRM API Key set.");
            }
        });
    }
});
