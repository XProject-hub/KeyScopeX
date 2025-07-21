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

// Post message to content.js to get DRM override
window.postMessage({ type: "__GET_DRM_OVERRIDE__" }, "*");

// Add listener for DRM override messages
window.addEventListener("message", function (event) {
    if (event.source !== window) return;
    if (event.data.type === "__DRM_OVERRIDE__") {
        drmOverride = event.data.drmOverride || "DISABLED";
        console.log("DRM Override set to:", drmOverride);
    }
});

// Post message to content.js to get injection type
window.postMessage({ type: "__GET_INJECTION_TYPE__" }, "*");

// Add listener for injection type messages
window.addEventListener("message", function (event) {
    if (event.source !== window) return;

    if (event.data.type === "__INJECTION_TYPE__") {
        interceptType = event.data.injectionType || "DISABLED";
        console.log("Injection type set to:", interceptType);
    }
});

// Post message to get CDM devices
window.postMessage({ type: "__GET_CDM_DEVICES__" }, "*");

// Add listener for CDM device messages
window.addEventListener("message", function (event) {
    if (event.source !== window) return;

    if (event.data.type === "__CDM_DEVICES__") {
        const { widevine_device, playready_device } = event.data;

        console.log("Received device info:", widevine_device, playready_device);

        widevineDeviceInfo = widevine_device;
        playreadyDeviceInfo = playready_device;
    }
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
    console.log(`[Manifest][${source}]`, url, contentType);

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
            console.log("Session opened:", this.session_id);
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
            console.log("Challenge received:", this.challenge);
        } else if (jsonData.data?.challenge_b64) {
            this.challenge = jsonData.data.challenge_b64;
            console.log("Challenge received:", this.challenge);
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
            console.log("License response parsed successfully");
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
            console.log("Keys received:", this.keys);
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
            console.log("Session closed successfully");
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
            console.log("Service certificate set successfully");
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
            console.log("Widevine challenge received:", this.challenge);
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

// Challenge generator interceptor
const originalGenerateRequest = MediaKeySession.prototype.generateRequest;
MediaKeySession.prototype.generateRequest = function (initDataType, initData) {
    const session = this;
    let playReadyPssh = getPlayReadyPssh(initData);
    if (playReadyPssh) {
        console.log("[DRM Detected] PlayReady");
        foundPlayreadyPssh = playReadyPssh;
        console.log("[PlayReady PSSH found] " + playReadyPssh);
    }
    let wideVinePssh = getWidevinePssh(initData);
    if (wideVinePssh) {
        // Widevine code
        console.log("[DRM Detected] Widevine");
        foundWidevinePssh = wideVinePssh;
        console.log("[Widevine PSSH found] " + wideVinePssh);
    }
    // Challenge message interceptor
    if (!remoteListenerMounted) {
        remoteListenerMounted = true;
        session.addEventListener("message", function messageInterceptor(event) {
            event.stopImmediatePropagation();
            const uint8Array = new Uint8Array(event.message);
            const base64challenge = arrayBufferToBase64(uint8Array);
            if (
                base64challenge === DRM_SIGNATURES.WIDEVINE_INIT &&
                interceptType !== "DISABLED" &&
                !serviceCertFound
            ) {
                const { device_type, system_id, security_level, host, secret, device_name } =
                    widevineDeviceInfo;
                remoteCDM = new remoteWidevineCDM(
                    device_type,
                    system_id,
                    security_level,
                    host,
                    secret,
                    device_name
                );
                remoteCDM.openSession();
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
                    window.postMessage({ type: "__DRM_TYPE__", data: "Widevine" }, "*");
                    window.postMessage({ type: "__PSSH_DATA__", data: foundWidevinePssh }, "*");
                    if (interceptType === "EME" && !remoteCDM) {
                        const {
                            device_type,
                            system_id,
                            security_level,
                            host,
                            secret,
                            device_name,
                        } = widevineDeviceInfo;
                        remoteCDM = new remoteWidevineCDM(
                            device_type,
                            system_id,
                            security_level,
                            host,
                            secret,
                            device_name
                        );
                        remoteCDM.openSession();
                        remoteCDM.getChallenge(foundWidevinePssh);
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
                        window.postMessage({ type: "__DRM_TYPE__", data: "PlayReady" }, "*");
                        window.postMessage(
                            { type: "__PSSH_DATA__", data: foundPlayreadyPssh },
                            "*"
                        );
                        originalChallenge = match[1];
                        if (interceptType === "EME" && !remoteCDM) {
                            const { security_level, host, secret, device_name } =
                                playreadyDeviceInfo;
                            remoteCDM = new remotePlayReadyCDM(
                                security_level,
                                host,
                                secret,
                                device_name
                            );
                            remoteCDM.openSession();
                            remoteCDM.getChallenge(foundPlayreadyPssh);
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
                    console.log("Intercepted EME Challenge and injected custom one.");
                    session.dispatchEvent(syntheticEvent);
                }
            }
        });
        console.log("Message interceptor mounted.");
    }
    return originalGenerateRequest.call(session, initDataType, initData);
};

// Message update interceptors
const originalUpdate = MediaKeySession.prototype.update;
MediaKeySession.prototype.update = function (response) {
    const uint8 = response instanceof Uint8Array ? response : new Uint8Array(response);
    const base64Response = window.btoa(String.fromCharCode(...uint8));
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
                    console.log("[CLEARKEY] ", clearKeys);
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
                console.log("[CLEARKEY] Not found");
            });
    }

    return updatePromise;
};

// fetch POST interceptor
(function () {
    const originalFetch = window.fetch;

    window.fetch = async function (resource, config = {}) {
        const method = (config.method || "GET").toUpperCase();

        if (method === "POST") {
            let body = config.body;
            if (body) {
                if (body instanceof ArrayBuffer || body instanceof Uint8Array) {
                    const buffer = body instanceof Uint8Array ? body : new Uint8Array(body);
                    const base64Body = window.btoa(String.fromCharCode(...buffer));
                    if (
                        (base64Body.startsWith(DRM_SIGNATURES.WIDEVINE) ||
                            base64Body.startsWith(DRM_SIGNATURES.PLAYREADY)) &&
                        (!remoteCDM ||
                            remoteCDM.challenge === null ||
                            base64Body !== remoteCDM.challenge) &&
                        interceptType === "EME"
                    ) {
                        foundChallengeInBody = true;
                        window.postMessage({ type: "__LICENSE_URL__", data: resource }, "*");
                        // Block the request
                        return;
                    }
                    if (
                        (base64Body.startsWith(DRM_SIGNATURES.WIDEVINE) ||
                            base64Body.startsWith(DRM_SIGNATURES.PLAYREADY)) &&
                        interceptType == "LICENSE" &&
                        !foundChallengeInBody
                    ) {
                        foundChallengeInBody = true;
                        window.postMessage({ type: "__LICENSE_URL__", data: resource }, "*");
                        if (!remoteCDM) {
                            if (base64Body.startsWith(DRM_SIGNATURES.WIDEVINE)) {
                                const {
                                    device_type,
                                    system_id,
                                    security_level,
                                    host,
                                    secret,
                                    device_name,
                                } = widevineDeviceInfo;
                                remoteCDM = new remoteWidevineCDM(
                                    device_type,
                                    system_id,
                                    security_level,
                                    host,
                                    secret,
                                    device_name
                                );
                                remoteCDM.openSession();
                                remoteCDM.getChallenge(foundWidevinePssh);
                            }
                            if (base64Body.startsWith(DRM_SIGNATURES.PLAYREADY)) {
                                const { security_level, host, secret, device_name } =
                                    playreadyDeviceInfo;
                                remoteCDM = new remotePlayReadyCDM(
                                    security_level,
                                    host,
                                    secret,
                                    device_name
                                );
                                remoteCDM.openSession();
                                remoteCDM.getChallenge(foundPlayreadyPssh);
                            }
                        }
                        if (remoteCDM && remoteCDM.challenge === null) {
                            remoteCDM.getChallenge(foundWidevinePssh);
                        }
                        const injectedBody = base64ToUint8Array(remoteCDM.challenge);
                        config.body = injectedBody;
                        return originalFetch(resource, config);
                    }
                }
                if (typeof body === "string" && !isJson(body)) {
                    const base64EncodedBody = btoa(body);
                    if (
                        (base64EncodedBody.startsWith(DRM_SIGNATURES.WIDEVINE) ||
                            base64EncodedBody.startsWith(DRM_SIGNATURES.PLAYREADY)) &&
                        (!remoteCDM ||
                            remoteCDM.challenge === null ||
                            base64EncodedBody !== remoteCDM.challenge) &&
                        interceptType === "EME"
                    ) {
                        foundChallengeInBody = true;
                        window.postMessage({ type: "__LICENSE_URL__", data: resource }, "*");
                        // Block the request
                        return;
                    }
                    if (
                        (base64EncodedBody.startsWith(DRM_SIGNATURES.WIDEVINE) ||
                            base64EncodedBody.startsWith(DRM_SIGNATURES.PLAYREADY)) &&
                        interceptType == "LICENSE" &&
                        !foundChallengeInBody
                    ) {
                        foundChallengeInBody = true;
                        window.postMessage({ type: "__LICENSE_URL__", data: resource }, "*");
                        if (!remoteCDM) {
                            if (base64EncodedBody.startsWith(DRM_SIGNATURES.WIDEVINE)) {
                                const {
                                    device_type,
                                    system_id,
                                    security_level,
                                    host,
                                    secret,
                                    device_name,
                                } = widevineDeviceInfo;
                                remoteCDM = new remoteWidevineCDM(
                                    device_type,
                                    system_id,
                                    security_level,
                                    host,
                                    secret,
                                    device_name
                                );
                                remoteCDM.openSession();
                                remoteCDM.getChallenge(foundWidevinePssh);
                            }
                            if (base64EncodedBody.startsWith(DRM_SIGNATURES.PLAYREADY)) {
                                const { security_level, host, secret, device_name } =
                                    playreadyDeviceInfo;
                                remoteCDM = new remotePlayReadyCDM(
                                    security_level,
                                    host,
                                    secret,
                                    device_name
                                );
                                remoteCDM.openSession();
                                remoteCDM.getChallenge(foundPlayreadyPssh);
                            }
                        }
                        if (remoteCDM && remoteCDM.challenge === null) {
                            remoteCDM.getChallenge(foundWidevinePssh);
                        }
                        const injectedBody = atob(remoteCDM.challenge);
                        config.body = injectedBody;
                        return originalFetch(resource, config);
                    }
                }
                if (typeof body === "string" && isJson(body)) {
                    const jsonBody = JSON.parse(body);

                    if (
                        (jsonContainsValue(jsonBody, DRM_SIGNATURES.WIDEVINE) ||
                            jsonContainsValue(jsonBody, DRM_SIGNATURES.PLAYREADY)) &&
                        (!remoteCDM || remoteCDM.challenge === null) &&
                        interceptType === "EME"
                    ) {
                        foundChallengeInBody = true;
                        window.postMessage({ type: "__LICENSE_URL__", data: resource }, "*");
                        // Block the request
                        return;
                    }

                    if (
                        (jsonContainsValue(jsonBody, DRM_SIGNATURES.WIDEVINE) ||
                            jsonContainsValue(jsonBody, DRM_SIGNATURES.PLAYREADY)) &&
                        interceptType === "LICENSE" &&
                        !foundChallengeInBody
                    ) {
                        foundChallengeInBody = true;
                        window.postMessage({ type: "__LICENSE_URL__", data: resource }, "*");
                        if (!remoteCDM) {
                            if (jsonContainsValue(jsonBody, DRM_SIGNATURES.WIDEVINE)) {
                                const {
                                    device_type,
                                    system_id,
                                    security_level,
                                    host,
                                    secret,
                                    device_name,
                                } = widevineDeviceInfo;
                                remoteCDM = new remoteWidevineCDM(
                                    device_type,
                                    system_id,
                                    security_level,
                                    host,
                                    secret,
                                    device_name
                                );
                                remoteCDM.openSession();
                                remoteCDM.getChallenge(foundWidevinePssh);
                            }
                            if (jsonContainsValue(jsonBody, DRM_SIGNATURES.PLAYREADY)) {
                                const { security_level, host, secret, device_name } =
                                    playreadyDeviceInfo;
                                remoteCDM = new remotePlayReadyCDM(
                                    security_level,
                                    host,
                                    secret,
                                    device_name
                                );
                                remoteCDM.openSession();
                                remoteCDM.getChallenge(foundPlayreadyPssh);
                            }
                        }
                        if (remoteCDM && remoteCDM.challenge === null) {
                            remoteCDM.getChallenge(foundWidevinePssh);
                        }
                        const injectedBody = jsonReplaceValue(jsonBody, remoteCDM.challenge);
                        config.body = JSON.stringify(injectedBody);
                    }
                }
            }
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
        if (this._method && this._method.toUpperCase() === "POST") {
            if (body) {
                if (body instanceof ArrayBuffer || body instanceof Uint8Array) {
                    const buffer = body instanceof Uint8Array ? body : new Uint8Array(body);
                    const base64Body = window.btoa(String.fromCharCode(...buffer));
                    if (
                        (base64Body.startsWith(DRM_SIGNATURES.WIDEVINE) ||
                            base64Body.startsWith(DRM_SIGNATURES.PLAYREADY)) &&
                        (!remoteCDM ||
                            remoteCDM.challenge === null ||
                            base64Body !== remoteCDM.challenge) &&
                        interceptType === "EME"
                    ) {
                        foundChallengeInBody = true;
                        window.postMessage({ type: "__LICENSE_URL__", data: this._url }, "*");
                        // Block the request
                        return;
                    }
                    if (
                        (base64Body.startsWith(DRM_SIGNATURES.WIDEVINE) ||
                            base64Body.startsWith(DRM_SIGNATURES.PLAYREADY)) &&
                        interceptType == "LICENSE" &&
                        !foundChallengeInBody
                    ) {
                        foundChallengeInBody = true;
                        window.postMessage({ type: "__LICENSE_URL__", data: this._url }, "*");
                        if (!remoteCDM) {
                            if (base64Body.startsWith(DRM_SIGNATURES.WIDEVINE)) {
                                const {
                                    device_type,
                                    system_id,
                                    security_level,
                                    host,
                                    secret,
                                    device_name,
                                } = widevineDeviceInfo;
                                remoteCDM = new remoteWidevineCDM(
                                    device_type,
                                    system_id,
                                    security_level,
                                    host,
                                    secret,
                                    device_name
                                );
                                remoteCDM.openSession();
                                remoteCDM.getChallenge(foundWidevinePssh);
                            }
                            if (base64Body.startsWith(DRM_SIGNATURES.PLAYREADY)) {
                                const { security_level, host, secret, device_name } =
                                    playreadyDeviceInfo;
                                remoteCDM = new remotePlayReadyCDM(
                                    security_level,
                                    host,
                                    secret,
                                    device_name
                                );
                                remoteCDM.openSession();
                                remoteCDM.getChallenge(foundPlayreadyPssh);
                            }
                        }
                        if (remoteCDM && remoteCDM.challenge === null) {
                            remoteCDM.getChallenge(foundWidevinePssh);
                        }
                        const injectedBody = base64ToUint8Array(remoteCDM.challenge);
                        return originalSend.call(this, injectedBody);
                    }
                }

                if (typeof body === "string" && !isJson(body)) {
                    const base64EncodedBody = btoa(body);
                    if (
                        (base64EncodedBody.startsWith(DRM_SIGNATURES.WIDEVINE) ||
                            base64EncodedBody.startsWith(DRM_SIGNATURES.PLAYREADY)) &&
                        (!remoteCDM ||
                            remoteCDM.challenge === null ||
                            base64EncodedBody !== remoteCDM.challenge) &&
                        interceptType === "EME"
                    ) {
                        foundChallengeInBody = true;
                        window.postMessage({ type: "__LICENSE_URL__", data: this._url }, "*");
                        // Block the request
                        return;
                    }
                    if (
                        (base64EncodedBody.startsWith(DRM_SIGNATURES.WIDEVINE) ||
                            base64EncodedBody.startsWith(DRM_SIGNATURES.PLAYREADY)) &&
                        interceptType == "LICENSE" &&
                        !foundChallengeInBody
                    ) {
                        foundChallengeInBody = true;
                        window.postMessage({ type: "__LICENSE_URL__", data: this._url }, "*");
                        if (!remoteCDM) {
                            if (base64EncodedBody.startsWith(DRM_SIGNATURES.WIDEVINE)) {
                                const {
                                    device_type,
                                    system_id,
                                    security_level,
                                    host,
                                    secret,
                                    device_name,
                                } = widevineDeviceInfo;
                                remoteCDM = new remoteWidevineCDM(
                                    device_type,
                                    system_id,
                                    security_level,
                                    host,
                                    secret,
                                    device_name
                                );
                                remoteCDM.openSession();
                                remoteCDM.getChallenge(foundWidevinePssh);
                            }
                            if (base64EncodedBody.startsWith(DRM_SIGNATURES.PLAYREADY)) {
                                const { security_level, host, secret, device_name } =
                                    playreadyDeviceInfo;
                                remoteCDM = new remotePlayReadyCDM(
                                    security_level,
                                    host,
                                    secret,
                                    device_name
                                );
                                remoteCDM.openSession();
                                remoteCDM.getChallenge(foundPlayreadyPssh);
                            }
                        }
                        if (remoteCDM && remoteCDM.challenge === null) {
                            remoteCDM.getChallenge(foundWidevinePssh);
                        }
                        const injectedBody = atob(remoteCDM.challenge);
                        return originalSend.call(this, injectedBody);
                    }
                }

                if (typeof body === "string" && isJson(body)) {
                    const jsonBody = JSON.parse(body);

                    if (
                        (jsonContainsValue(jsonBody, DRM_SIGNATURES.WIDEVINE) ||
                            jsonContainsValue(jsonBody, DRM_SIGNATURES.PLAYREADY)) &&
                        (!remoteCDM || remoteCDM.challenge === null) &&
                        interceptType === "EME"
                    ) {
                        foundChallengeInBody = true;
                        window.postMessage({ type: "__LICENSE_URL__", data: this._url }, "*");
                        // Block the request
                        return;
                    }

                    if (
                        (jsonContainsValue(jsonBody, DRM_SIGNATURES.WIDEVINE) ||
                            jsonContainsValue(jsonBody, DRM_SIGNATURES.PLAYREADY)) &&
                        interceptType === "LICENSE" &&
                        !foundChallengeInBody
                    ) {
                        foundChallengeInBody = true;
                        window.postMessage({ type: "__LICENSE_URL__", data: this._url }, "*");
                        if (!remoteCDM) {
                            if (jsonContainsValue(jsonBody, DRM_SIGNATURES.WIDEVINE)) {
                                const {
                                    device_type,
                                    system_id,
                                    security_level,
                                    host,
                                    secret,
                                    device_name,
                                } = widevineDeviceInfo;
                                remoteCDM = new remoteWidevineCDM(
                                    device_type,
                                    system_id,
                                    security_level,
                                    host,
                                    secret,
                                    device_name
                                );
                                remoteCDM.openSession();
                                remoteCDM.getChallenge(foundWidevinePssh);
                            }
                            if (jsonContainsValue(jsonBody, DRM_SIGNATURES.PLAYREADY)) {
                                const { security_level, host, secret, device_name } =
                                    playreadyDeviceInfo;
                                remoteCDM = new remotePlayReadyCDM(
                                    security_level,
                                    host,
                                    secret,
                                    device_name
                                );
                                remoteCDM.openSession();
                                remoteCDM.getChallenge(foundPlayreadyPssh);
                            }
                        }
                        if (remoteCDM && remoteCDM.challenge === null) {
                            remoteCDM.getChallenge(foundWidevinePssh);
                        }
                        const injectedBody = jsonReplaceValue(jsonBody, remoteCDM.challenge);
                        return originalSend.call(this, JSON.stringify(injectedBody));
                    }
                }
            }
        }
        return originalSend.apply(this, arguments);
    };
})();
