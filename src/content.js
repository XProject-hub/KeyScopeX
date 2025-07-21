// Inject `inject.js` into the page context
(function injectScript() {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("inject.js");
    script.type = "text/javascript";
    script.onload = () => script.remove(); // Clean up
    // Inject directly into <html> or <head>
    (document.documentElement || document.head || document.body).appendChild(script);
})();

// Listen for messages from the injected script
window.addEventListener("message", function (event) {
    if (event.source !== window) return;

    if (
        ["__DRM_TYPE__", "__PSSH_DATA__", "__KEYS_DATA__", "__LICENSE_URL__"].includes(
            event.data?.type
        )
    ) {
        chrome.runtime.sendMessage({
            type: event.data.type.replace("__", "").replace("__", ""),
            data: event.data.data,
        });
    }

    if (event.data.type === "__GET_CDM_DEVICES__") {
        chrome.storage.local.get(["widevine_device", "playready_device"], (result) => {
            const widevine_device = result.widevine_device || null;
            const playready_device = result.playready_device || null;

            window.postMessage(
                {
                    type: "__CDM_DEVICES__",
                    widevine_device,
                    playready_device,
                },
                "*"
            );
        });
    }

    if (event.data.type === "__GET_INJECTION_TYPE__") {
        chrome.storage.local.get("injection_type", (result) => {
            const injectionType = result.injection_type || "LICENSE";

            window.postMessage(
                {
                    type: "__INJECTION_TYPE__",
                    injectionType,
                },
                "*"
            );
        });
    }

    if (event.data.type === "__GET_DRM_OVERRIDE__") {
        chrome.storage.local.get("drm_override", (result) => {
            const drmOverride = result.drm_override || "DISABLED";

            window.postMessage(
                {
                    type: "__DRM_OVERRIDE__",
                    drmOverride,
                },
                "*"
            );
        });
    }

    // Manifest header and URL
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

    const seenManifestUrls = new Set();

    if (event.data?.type === "__MANIFEST_URL__") {
        const url = event.data.data;
        if (seenManifestUrls.has(url)) return;
        seenManifestUrls.add(url);
        logWithPrefix("✅ [Content] Unique manifest URL:", url);

        chrome.runtime.sendMessage({
            type: "MANIFEST_URL",
            data: url,
        });
    }

    if (event.data?.type === "__MANIFEST_HEADERS__") {
        const { url, headers } = event.data;
        logWithPrefix("[Content.js] Manifest Headers:", url, headers);

        chrome.runtime.sendMessage({
            type: "MANIFEST_HEADERS",
            url,
            headers,
        });
    }
});
