// Inject `inject.js` into the page context
(function injectScript() {
    function append() {
        const container = document.head || document.documentElement;
        if (!container) {
            return requestAnimationFrame(append); // Wait for DOM to exist
        }
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('inject.js');
        script.type = 'text/javascript';
        script.onload = () => script.remove(); // Clean up after injecting
        container.appendChild(script);
    }
    append();
})();

// Listen for messages from the injected script
window.addEventListener("message", function(event) {
    if (event.source !== window) return;

    if (["__DRM_TYPE__", "__PSSH_DATA__", "__KEYS_DATA__"].includes(event.data?.type)) {
        chrome.runtime.sendMessage({
            type: event.data.type.replace("__", "").replace("__", ""),
            data: event.data.data
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
            playready_device
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
            injectionType
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
            drmOverride
          },
          "*"
        );
      });
    }
});
