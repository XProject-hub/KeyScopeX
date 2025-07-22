let widevineDeviceInfo = null;
let playreadyDeviceInfo = null;
let originalChallenge = null;
let serviceCertFound = false;
let drmType = "NONE";
let psshFound = false;
let foundWidevinePssh = null;
let foundPlayreadyPssh = null;
let drmDecided = null;
let drmOverride = "DISABLED";
let interceptType = "DISABLED";
let remoteCDM = null;
let generateRequestCalled = false;
let remoteListenerMounted = false;
let injectionSuccess = false;
let foundChallengeInBody = false;
let licenseResponseCounter = 0;
let keysRetrieved = false;

const DRM_SIGNATURES = {
    WIDEVINE: "CAES",
    PLAYREADY: "PD94",
    SERVICE_CERT: "CAUS",
    WIDEVINE_INIT: "CAQ=",
};

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

window.postMessage({ type: "__GET_DRM_OVERRIDE__" }, "*");
window.postMessage({ type: "__GET_INJECTION_TYPE__" }, "*");
window.postMessage({ type: "__GET_CDM_DEVICES__" }, "*");

function createMessageHandler(handlers) {
    window.addEventListener("message", function (event) {
        if (event.source !== window) return;

        const handler = handlers[event.data.type];
        if (handler) {
            handler(event.data);
        }
    });
}

createMessageHandler({
    __DRM_OVERRIDE__: (data) => {
        drmOverride = data.drmOverride || "DISABLED";
        logWithPrefix("DRM Override set to:", drmOverride);
    },
    __INJECTION_TYPE__: (data) => {
        interceptType = data.injectionType || "DISABLED";
        logWithPrefix("Injection type set to:", interceptType);
    },
    __CDM_DEVICES__: (data) => {
        const { widevine_device, playready_device } = data;
        logWithPrefix("Received device info:", widevine_device, playready_device);
        widevineDeviceInfo = widevine_device;
        playreadyDeviceInfo = playready_device;
    },
});

function safeHeaderShellEscape(str) {
    return str
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"')
        .replace(/\$/g, "\\$") // escape shell expansion
        .replace(/`/g, "\\`")
        .replace(/\n/g, ""); // strip newlines
}

function headersToFlags(headersObj) {
    return Object.entries(headersObj)
        .map(
            ([key, val]) =>
                '--add-headers "' +
                safeHeaderShellEscape(key) +
                ": " +
                safeHeaderShellEscape(val) +
                '"'
        )
        .join(" ");
}

function handleManifestDetection(url, headersObj, contentType, source) {
    window.postMessage({ type: "__MANIFEST_URL__", data: url }, "*");
    logWithPrefix(`[Manifest][${source}]`, url, contentType);

    const headerFlags = headersToFlags(headersObj);

    window.postMessage(
        {
            type: "__MANIFEST_HEADERS__",
            url,
            headers: headerFlags,
        },
        "*"
    );
}

// Intercep network to find manifest
function injectManifestInterceptor() {
    // Execute the interceptor code directly instead of injecting a script
    (function () {
        function isProbablyManifest(text = "", contentType = "") {
            const lowerCT = contentType?.toLowerCase() ?? "";
            const sample = text.slice(0, 2000);

            const isHLSMime = lowerCT.includes("mpegurl");
            const isDASHMime = lowerCT.includes("dash+xml");
            const isSmoothMime = lowerCT.includes("sstr+xml");

            const isHLSKeyword = sample.includes("#EXTM3U") || sample.includes("#EXT-X-STREAM-INF");
            const isDASHKeyword = sample.includes("<MPD") || sample.includes("<AdaptationSet");
            const isSmoothKeyword = sample.includes("<SmoothStreamingMedia");
            const isJsonManifest = sample.includes('"playlist"') && sample.includes('"segments"');

            return (
                isHLSMime ||
                isDASHMime ||
                isSmoothMime ||
                isHLSKeyword ||
                isDASHKeyword ||
                isSmoothKeyword ||
                isJsonManifest
            );
        }

        const originalFetch = window.fetch;
        window.fetch = async function (input, init) {
            const response = await originalFetch.apply(this, arguments);

            try {
                const clone = response.clone();
                const contentType = clone.headers.get("content-type") || "";
                const text = await clone.text();

                const url = typeof input === "string" ? input : input.url;

                if (isProbablyManifest(text, contentType)) {
                    const headersObj = {};
                    clone.headers.forEach((value, key) => {
                        headersObj[key] = value;
                    });
                    handleManifestDetection(url, headersObj, contentType, "fetch");
                }
            } catch (e) {}

            return response;
        };

        const originalXHROpen = XMLHttpRequest.prototype.open;
        const originalXHRSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function (method, url) {
            this.__url = url;
            return originalXHROpen.apply(this, arguments);
        };

        XMLHttpRequest.prototype.send = function (body) {
            this.addEventListener("load", function () {
                try {
                    const contentType = this.getResponseHeader("content-type") || "";
                    const text = this.responseText;

                    if (isProbablyManifest(text, contentType)) {
                        const xhrHeaders = {};
                        const rawHeaders = this.getAllResponseHeaders().trim().split(/\r?\n/);
                        rawHeaders.forEach((line) => {
                            const parts = line.split(": ");
                            if (parts.length === 2) {
                                xhrHeaders[parts[0]] = parts[1];
                            }
                        });
                        handleManifestDetection(this.__url, xhrHeaders, contentType, "xhr");
                    }
                } catch (e) {}
            });
            return originalXHRSend.apply(this, arguments);
        };
    })();
}

injectManifestInterceptor();

class RemoteCDMBase {
    constructor({ host, secret, device_name, security_level }) {
        this.host = host;
        this.secret = secret;
        this.device_name = device_name;
        this.security_level = security_level;
        this.session_id = null;
        this.challenge = null;
        this.keys = null;
    }

    openSession(path) {
        const url = `${this.host}${path}/open`;
        const xhr = new XMLHttpRequest();
        xhr.open("GET", url, false);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.send();
        const jsonData = JSON.parse(xhr.responseText);
        if (jsonData.data?.session_id) {
            this.session_id = jsonData.data.session_id;
            logWithPrefix("Session opened:", this.session_id);
        } else {
            console.error("Failed to open session:", jsonData.message);
            throw new Error("Failed to open session");
        }
    }

    getChallenge(path, body) {
        const url = `${this.host}${path}/get_license_challenge`;
        const xhr = new XMLHttpRequest();
        xhr.open("POST", url, false);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.send(JSON.stringify(body));
        const jsonData = JSON.parse(xhr.responseText);
        if (jsonData.data?.challenge) {
            this.challenge = btoa(jsonData.data.challenge);
            logWithPrefix("Challenge received:", this.challenge);
        } else if (jsonData.data?.challenge_b64) {
            this.challenge = jsonData.data.challenge_b64;
            logWithPrefix("Challenge received:", this.challenge);
        } else {
            console.error("Failed to get challenge:", jsonData.message);
            throw new Error("Failed to get challenge");
        }
    }

    parseLicense(path, body) {
        const url = `${this.host}${path}/parse_license`;
        const xhr = new XMLHttpRequest();
        xhr.open("POST", url, false);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.send(JSON.stringify(body));
        const jsonData = JSON.parse(xhr.responseText);
        if (jsonData.status === 200 || jsonData.message?.includes("parsed and loaded")) {
            logWithPrefix("License response parsed successfully");
            return true;
        } else {
            console.error("Failed to parse license response:", jsonData.message);
            throw new Error("Failed to parse license response");
        }
    }

    getKeys(path, body, extraPath = "") {
        const url = `${this.host}${path}/get_keys${extraPath}`;
        const xhr = new XMLHttpRequest();
        xhr.open("POST", url, false);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.send(JSON.stringify(body));
        const jsonData = JSON.parse(xhr.responseText);
        if (jsonData.data?.keys) {
            this.keys = jsonData.data.keys;
            logWithPrefix("Keys received:", this.keys);
        } else {
            console.error("Failed to get keys:", jsonData.message);
            throw new Error("Failed to get keys");
        }
    }

    closeSession(path) {
        const url = `${this.host}${path}/close/${this.session_id}`;
        const xhr = new XMLHttpRequest();
        xhr.open("GET", url, false);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.send();
        const jsonData = JSON.parse(xhr.responseText);
        if (jsonData) {
            logWithPrefix("Session closed successfully");
        } else {
            console.error("Failed to close session:", jsonData.message);
            throw new Error("Failed to close session");
        }
    }
}

// PlayReady Remote CDM Class
class remotePlayReadyCDM extends RemoteCDMBase {
    constructor(security_level, host, secret, device_name) {
        super({ host, secret, device_name, security_level });
    }

    openSession() {
        super.openSession(`/remotecdm/playready/${this.device_name}`);
    }

    getChallenge(init_data) {
        super.getChallenge(`/remotecdm/playready/${this.device_name}`, {
            session_id: this.session_id,
            init_data: init_data,
        });
    }

    parseLicense(license_message) {
        return super.parseLicense(`/remotecdm/playready/${this.device_name}`, {
            session_id: this.session_id,
            license_message: license_message,
        });
    }

    getKeys() {
        super.getKeys(`/remotecdm/playready/${this.device_name}`, {
            session_id: this.session_id,
        });
    }

    closeSession() {
        super.closeSession(`/remotecdm/playready/${this.device_name}`);
    }
}

// Widevine Remote CDM Class
class remoteWidevineCDM extends RemoteCDMBase {
    constructor(device_type, system_id, security_level, host, secret, device_name) {
        super({ host, secret, device_name, security_level });
        this.device_type = device_type;
        this.system_id = system_id;
    }

    openSession() {
        super.openSession(`/remotecdm/widevine/${this.device_name}`);
    }

    setServiceCertificate(certificate) {
        const url = `${this.host}/remotecdm/widevine/${this.device_name}/set_service_certificate`;
        const xhr = new XMLHttpRequest();
        xhr.open("POST", url, false);
        xhr.setRequestHeader("Content-Type", "application/json");
        const body = {
            session_id: this.session_id,
            certificate: certificate ?? null,
        };
        xhr.send(JSON.stringify(body));
        const jsonData = JSON.parse(xhr.responseText);
        if (jsonData.status === 200) {
            logWithPrefix("Service certificate set successfully");
        } else {
            console.error("Failed to set service certificate:", jsonData.message);
            throw new Error("Failed to set service certificate");
        }
    }

    getChallenge(init_data, license_type = "STREAMING") {
        const url = `${this.host}/remotecdm/widevine/${this.device_name}/get_license_challenge/${license_type}`;
        const xhr = new XMLHttpRequest();
        xhr.open("POST", url, false);
        xhr.setRequestHeader("Content-Type", "application/json");
        const body = {
            session_id: this.session_id,
            init_data: init_data,
            privacy_mode: serviceCertFound,
        };
        xhr.send(JSON.stringify(body));
        const jsonData = JSON.parse(xhr.responseText);
        if (jsonData.data?.challenge_b64) {
            this.challenge = jsonData.data.challenge_b64;
            logWithPrefix("Widevine challenge received:", this.challenge);
        } else {
            console.error("Failed to get Widevine challenge:", jsonData.message);
            throw new Error("Failed to get Widevine challenge");
        }
    }

    parseLicense(license_message) {
        return super.parseLicense(`/remotecdm/widevine/${this.device_name}`, {
            session_id: this.session_id,
            license_message: license_message,
        });
    }

    getKeys() {
        super.getKeys(
            `/remotecdm/widevine/${this.device_name}`,
            {
                session_id: this.session_id,
            },
            "/ALL"
        );
    }

    closeSession() {
        super.closeSession(`/remotecdm/widevine/${this.device_name}`);
    }
}

// Utility functions
function hexStrToU8(hexString) {
    return Uint8Array.from(hexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));
}

function u8ToHexStr(bytes) {
    return bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, "0"), "");
}

function b64ToHexStr(b64) {
    return [...atob(b64)].map((c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join``;
}

function jsonContainsValue(obj, prefix = DRM_SIGNATURES.WIDEVINE) {
    if (typeof obj === "string") return obj.startsWith(prefix);
    if (Array.isArray(obj)) return obj.some((val) => jsonContainsValue(val, prefix));
    if (typeof obj === "object" && obj !== null) {
        return Object.values(obj).some((val) => jsonContainsValue(val, prefix));
    }
    return false;
}

function jsonReplaceValue(obj, newValue) {
    if (typeof obj === "string") {
        return obj.startsWith(DRM_SIGNATURES.WIDEVINE) || obj.startsWith(DRM_SIGNATURES.PLAYREADY)
            ? newValue
            : obj;
    }

    if (Array.isArray(obj)) {
        return obj.map((item) => jsonReplaceValue(item, newValue));
    }

    if (typeof obj === "object" && obj !== null) {
        const newObj = {};
        for (const key in obj) {
            if (Object.hasOwn(obj, key)) {
                newObj[key] = jsonReplaceValue(obj[key], newValue);
            }
        }
        return newObj;
    }

    return obj;
}

function isJson(str) {
    try {
        JSON.parse(str);
        return true;
    } catch (e) {
        return false;
    }
}

function getWidevinePssh(buffer) {
    const hex = u8ToHexStr(new Uint8Array(buffer));
    const match = hex.match(/000000(..)?70737368.*/);
    if (!match) return null;

    const boxHex = match[0];
    const bytes = hexStrToU8(boxHex);
    return window.btoa(String.fromCharCode(...bytes));
}

function getPlayReadyPssh(buffer) {
    const u8 = new Uint8Array(buffer);
    const systemId = "9a04f07998404286ab92e65be0885f95";
    const hex = u8ToHexStr(u8);
    const index = hex.indexOf(systemId);
    if (index === -1) return null;
    const psshBoxStart = hex.lastIndexOf("70737368", index);
    if (psshBoxStart === -1) return null;
    const lenStart = psshBoxStart - 8;
    const boxLen = parseInt(hex.substr(lenStart, 8), 16) * 2;
    const psshHex = hex.substr(lenStart, boxLen);
    const psshBytes = hexStrToU8(psshHex);
    return window.btoa(String.fromCharCode(...psshBytes));
}

function getClearkey(response) {
    let obj = JSON.parse(new TextDecoder("utf-8").decode(response));
    return obj["keys"].map((o) => ({
        key_id: b64ToHexStr(o["kid"].replace(/-/g, "+").replace(/_/g, "/")),
        key: b64ToHexStr(o["k"].replace(/-/g, "+").replace(/_/g, "/")),
    }));
}

function base64ToUint8Array(base64) {
    const binaryStr = atob(base64);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
    }
    return bytes;
}

function arrayBufferToBase64(uint8array) {
    let binary = "";
    const len = uint8array.length;

    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(uint8array[i]);
    }

    return window.btoa(binary);
}

function bufferToBase64(buffer) {
    const uint8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    return window.btoa(String.fromCharCode(...uint8));
}

// DRM type detection
function isWidevine(base64str) {
    return base64str.startsWith(DRM_SIGNATURES.WIDEVINE);
}
function isPlayReady(base64str) {
    return base64str.startsWith(DRM_SIGNATURES.PLAYREADY);
}
function isServiceCertificate(base64str) {
    return base64str.startsWith(DRM_SIGNATURES.SERVICE_CERT);
}

function postDRMTypeAndPssh(type, pssh) {
    window.postMessage({ type: "__DRM_TYPE__", data: type }, "*");
    window.postMessage({ type: "__PSSH_DATA__", data: pssh }, "*");
}

function createAndOpenRemoteCDM(type, deviceInfo, pssh) {
    let cdm;
    if (type === "Widevine") {
        const { device_type, system_id, security_level, host, secret, device_name } = deviceInfo;
        cdm = new remoteWidevineCDM(
            device_type,
            system_id,
            security_level,
            host,
            secret,
            device_name
        );
        cdm.openSession();
        cdm.getChallenge(pssh);
    } else if (type === "PlayReady") {
        const { security_level, host, secret, device_name } = deviceInfo;
        cdm = new remotePlayReadyCDM(security_level, host, secret, device_name);
        cdm.openSession();
        cdm.getChallenge(pssh);
    }
    return cdm;
}

function ensureRemoteCDM(type, deviceInfo, pssh) {
    if (!remoteCDM) {
        remoteCDM = createAndOpenRemoteCDM(type, deviceInfo, pssh);
    }
}

function detectAndStorePssh(initData) {
    const detections = [
        {
            type: "PlayReady",
            getter: getPlayReadyPssh,
            store: (pssh) => (foundPlayreadyPssh = pssh),
        },
        { type: "Widevine", getter: getWidevinePssh, store: (pssh) => (foundWidevinePssh = pssh) },
    ];

    detections.forEach(({ type, getter, store }) => {
        const pssh = getter(initData);
        if (pssh) {
            logWithPrefix(`[DRM Detected] ${type}`);
            store(pssh);
            logWithPrefix(`[${type} PSSH found] ${pssh}`);
        }
    });
}

// Challenge generator interceptor
const originalGenerateRequest = MediaKeySession.prototype.generateRequest;
MediaKeySession.prototype.generateRequest = function (initDataType, initData) {
    const session = this;
    detectAndStorePssh(initData);

    // Challenge message interceptor
    if (!remoteListenerMounted) {
        remoteListenerMounted = true;
        session.addEventListener("message", function messageInterceptor(event) {
            event.stopImmediatePropagation();
            const base64challenge = bufferToBase64(event.message);
            if (
                base64challenge === DRM_SIGNATURES.WIDEVINE_INIT &&
                interceptType !== "DISABLED" &&
                !serviceCertFound
            ) {
                remoteCDM = createAndOpenRemoteCDM(
                    "Widevine",
                    widevineDeviceInfo,
                    foundWidevinePssh
                );
            }
            if (
                !injectionSuccess &&
                base64challenge !== DRM_SIGNATURES.WIDEVINE_INIT &&
                interceptType !== "DISABLED"
            ) {
                if (interceptType === "EME") {
                    injectionSuccess = true;
                }
                if (!originalChallenge) {
                    originalChallenge = base64challenge;
                }
                if (originalChallenge.startsWith(DRM_SIGNATURES.WIDEVINE)) {
                    postDRMTypeAndPssh("Widevine", foundWidevinePssh);
                    if (interceptType === "EME") {
                        ensureRemoteCDM("Widevine", widevineDeviceInfo, foundWidevinePssh);
                    }
                }
                if (!originalChallenge.startsWith(DRM_SIGNATURES.WIDEVINE)) {
                    const buffer = event.message;
                    const decoder = new TextDecoder("utf-16");
                    const decodedText = decoder.decode(buffer);
                    const match = decodedText.match(
                        /<Challenge encoding="base64encoded">([^<]+)<\/Challenge>/
                    );
                    if (match) {
                        postDRMTypeAndPssh("PlayReady", foundPlayreadyPssh);
                        originalChallenge = match[1];
                        if (interceptType === "EME") {
                            ensureRemoteCDM("PlayReady", playreadyDeviceInfo, foundPlayreadyPssh);
                        }
                    }
                }
                if (interceptType === "EME" && remoteCDM) {
                    const uint8challenge = base64ToUint8Array(remoteCDM.challenge);
                    const challengeBuffer = uint8challenge.buffer;
                    const syntheticEvent = new MessageEvent("message", {
                        data: event.data,
                        origin: event.origin,
                        lastEventId: event.lastEventId,
                        source: event.source,
                        ports: event.ports,
                    });
                    Object.defineProperty(syntheticEvent, "message", {
                        get: () => challengeBuffer,
                    });
                    logWithPrefix("Intercepted EME Challenge and injected custom one.");
                    session.dispatchEvent(syntheticEvent);
                }
            }
        });
        logWithPrefix("Message interceptor mounted.");
    }
    return originalGenerateRequest.call(session, initDataType, initData);
};

// Message update interceptors
const originalUpdate = MediaKeySession.prototype.update;
MediaKeySession.prototype.update = function (response) {
    const base64Response = bufferToBase64(response);
    if (
        base64Response.startsWith(DRM_SIGNATURES.SERVICE_CERT) &&
        foundWidevinePssh &&
        remoteCDM &&
        !serviceCertFound
    ) {
        remoteCDM.setServiceCertificate(base64Response);
        if (interceptType === "EME" && !remoteCDM.challenge) {
            remoteCDM.getChallenge(foundWidevinePssh);
        }
        window.postMessage({ type: "__DRM_TYPE__", data: "Widevine" }, "*");
        window.postMessage({ type: "__PSSH_DATA__", data: foundWidevinePssh }, "*");
        serviceCertFound = true;
    }
    if (
        !base64Response.startsWith(DRM_SIGNATURES.SERVICE_CERT) &&
        (foundWidevinePssh || foundPlayreadyPssh) &&
        !keysRetrieved
    ) {
        if (licenseResponseCounter === 1 || foundChallengeInBody) {
            remoteCDM.parseLicense(base64Response);
            remoteCDM.getKeys();
            remoteCDM.closeSession();
            keysRetrieved = true;
            window.postMessage({ type: "__KEYS_DATA__", data: remoteCDM.keys }, "*");
        }
        licenseResponseCounter++;
    }
    const updatePromise = originalUpdate.call(this, response);
    if (!foundPlayreadyPssh && !foundWidevinePssh) {
        updatePromise
            .then(() => {
                let clearKeys = getClearkey(response);
                if (clearKeys && clearKeys.length > 0) {
                    logWithPrefix("[CLEARKEY] ", clearKeys);
                    const drmType = {
                        type: "__DRM_TYPE__",
                        data: "ClearKey",
                    };
                    window.postMessage(drmType, "*");
                    const keysData = {
                        type: "__KEYS_DATA__",
                        data: clearKeys,
                    };
                    window.postMessage(keysData, "*");
                }
            })
            .catch((e) => {
                logWithPrefix("[CLEARKEY] Not found");
            });
    }

    return updatePromise;
};

// Helpers
function detectDRMChallenge(body) {
    // Handles ArrayBuffer, Uint8Array, string, and JSON string
    // Returns: { type: "Widevine"|"PlayReady"|null, base64: string|null, bodyType: "buffer"|"string"|"json"|null }
    if (body instanceof ArrayBuffer || body instanceof Uint8Array) {
        const buffer = body instanceof Uint8Array ? body : new Uint8Array(body);
        const base64Body = window.btoa(String.fromCharCode(...buffer));
        if (base64Body.startsWith(DRM_SIGNATURES.WIDEVINE)) {
            return { type: "Widevine", base64: base64Body, bodyType: "buffer" };
        }
        if (base64Body.startsWith(DRM_SIGNATURES.PLAYREADY)) {
            return { type: "PlayReady", base64: base64Body, bodyType: "buffer" };
        }
    } else if (typeof body === "string" && !isJson(body)) {
        const base64EncodedBody = btoa(body);
        if (base64EncodedBody.startsWith(DRM_SIGNATURES.WIDEVINE)) {
            return { type: "Widevine", base64: base64EncodedBody, bodyType: "string" };
        }
        if (base64EncodedBody.startsWith(DRM_SIGNATURES.PLAYREADY)) {
            return { type: "PlayReady", base64: base64EncodedBody, bodyType: "string" };
        }
    } else if (typeof body === "string" && isJson(body)) {
        const jsonBody = JSON.parse(body);
        if (jsonContainsValue(jsonBody, DRM_SIGNATURES.WIDEVINE)) {
            return { type: "Widevine", base64: null, bodyType: "json" };
        }
        if (jsonContainsValue(jsonBody, DRM_SIGNATURES.PLAYREADY)) {
            return { type: "PlayReady", base64: null, bodyType: "json" };
        }
    }
    return { type: null, base64: null, bodyType: null };
}

function handleLicenseMode({
    drmInfo,
    body,
    setBody, // function to set the new body (for fetch: (b) => config.body = b, for XHR: (b) => originalSend.call(this, b))
    urlOrResource,
    getWidevinePssh,
    getPlayreadyPssh,
    widevineDeviceInfo,
    playreadyDeviceInfo,
}) {
    foundChallengeInBody = true;
    window.postMessage({ type: "__LICENSE_URL__", data: urlOrResource }, "*");

    // Create remoteCDM if needed
    if (!remoteCDM) {
        if (drmInfo.type === "Widevine") {
            remoteCDM = createAndOpenRemoteCDM("Widevine", widevineDeviceInfo, getWidevinePssh());
        }
        if (drmInfo.type === "PlayReady") {
            remoteCDM = createAndOpenRemoteCDM(
                "PlayReady",
                playreadyDeviceInfo,
                getPlayreadyPssh()
            );
        }
    }
    if (remoteCDM && remoteCDM.challenge === null) {
        remoteCDM.getChallenge(getWidevinePssh());
    }

    // Inject the new challenge into the request body
    if (drmInfo.bodyType === "json") {
        const jsonBody = JSON.parse(body);
        const injectedBody = jsonReplaceValue(jsonBody, remoteCDM.challenge);
        setBody(JSON.stringify(injectedBody));
    } else if (drmInfo.bodyType === "buffer") {
        setBody(base64ToUint8Array(remoteCDM.challenge));
    } else {
        setBody(atob(remoteCDM.challenge));
    }
}

function handleDRMInterception(drmInfo, body, url, setBodyCallback, continueRequestCallback) {
    // EME mode: block the request if a DRM challenge is detected
    if (
        drmInfo.type &&
        (!remoteCDM || remoteCDM.challenge === null || drmInfo.base64 !== remoteCDM.challenge) &&
        interceptType === "EME"
    ) {
        foundChallengeInBody = true;
        window.postMessage({ type: "__LICENSE_URL__", data: url }, "*");
        // Block the request
        return { shouldBlock: true };
    }

    // LICENSE mode: replace the challenge in the request
    if (drmInfo.type && interceptType === "LICENSE" && !foundChallengeInBody) {
        handleLicenseMode({
            drmInfo,
            body,
            setBody: setBodyCallback,
            urlOrResource: url,
            getWidevinePssh: () => foundWidevinePssh,
            getPlayreadyPssh: () => foundPlayreadyPssh,
            widevineDeviceInfo,
            playreadyDeviceInfo,
        });
        return { shouldIntercept: true, result: continueRequestCallback() };
    }

    return { shouldContinue: true };
}

// fetch POST interceptor
(function () {
    const originalFetch = window.fetch;

    window.fetch = async function (resource, config = {}) {
        const method = (config.method || "GET").toUpperCase();

        if (method === "POST" && config.body) {
            logWithPrefix("[FETCH] Intercepting POST request to:", resource);
            const drmInfo = detectDRMChallenge(config.body);

            const result = handleDRMInterception(
                drmInfo,
                config.body,
                resource,
                (b) => {
                    config.body = b;
                },
                () => originalFetch(resource, config)
            );

            if (result.shouldBlock) return;
            if (result.shouldIntercept) return result.result;
        }

        return originalFetch(resource, config);
    };
})();

// XHR POST interceptor
(function () {
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url, async, user, password) {
        this._method = method;
        this._url = url;
        return originalOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function (body) {
        if (this._method && this._method.toUpperCase() === "POST" && body) {
            logWithPrefix("[XHR] Intercepting POST request to:", this._url);
            const drmInfo = detectDRMChallenge(body);

            const result = handleDRMInterception(
                drmInfo,
                body,
                this._url,
                (b) => originalSend.call(this, b),
                () => {} // XHR doesn't need continuation callback
            );

            if (result.shouldBlock) return;
            if (result.shouldIntercept) return result.result;
        }

        return originalSend.apply(this, arguments);
    };
})();
