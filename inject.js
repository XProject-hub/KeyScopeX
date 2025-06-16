let widevineDeviceInfo = null;
let playreadyDeviceInfo = null;
let originalChallenge = null
let serviceCertFound = false;
let drmType = "NONE";
let psshFound = false;
let pssh = null;
let drmOverride = "DISABLED";
let interceptType = "DISABLED";
let remoteCDM = null;
let generateRequestCalled = false;
let remoteListenerMounted = false;
let injectionSuccess = false;
let foundChallengeInBody = false;
let licenseResponseCounter = 0;

// Post message to content.js to get DRM override
window.postMessage({ type: "__GET_DRM_OVERRIDE__" }, "*");

// Add listener for DRM override messages
window.addEventListener("message", function(event) {
  if (event.source !== window) return;
    if (event.data.type === "__DRM_OVERRIDE__") {
    drmOverride = event.data.drmOverride || "DISABLED";
    console.log("DRM Override set to:", drmOverride);
    }
});

// Post message to content.js to get injection type
window.postMessage({ type: "__GET_INJECTION_TYPE__" }, "*");

// Add listener for injection type messages
window.addEventListener("message", function(event) {
  if (event.source !== window) return;

  if (event.data.type === "__INJECTION_TYPE__") {
    interceptType = event.data.injectionType || "DISABLED";
    console.log("Injection type set to:", interceptType);
  }
});

// Post message to get CDM devices
window.postMessage({ type: "__GET_CDM_DEVICES__" }, "*");

// Add listener for CDM device messages
window.addEventListener("message", function(event) {
  if (event.source !== window) return;

  if (event.data.type === "__CDM_DEVICES__") {
    const { widevine_device, playready_device } = event.data;

    console.log("Received device info:", widevine_device, playready_device);

    widevineDeviceInfo = widevine_device;
    playreadyDeviceInfo = playready_device;
  }
});


// PlayReady Remote CDM Class
class remotePlayReadyCDM {
    constructor(security_level, host, secret, device_name) {
        this.security_level = security_level;
        this.host = host;
        this.secret = secret;
        this.device_name = device_name;
        this.session_id = null;
        this.challenge = null;
        this.keys = null;
    }

    // Open PlayReady session
    openSession() {
        const url = `${this.host}/remotecdm/playready/${this.device_name}/open`;
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, false);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send();
        const jsonData = JSON.parse(xhr.responseText);
        if (jsonData.data?.session_id) {
            this.session_id = jsonData.data.session_id;
            console.log("PlayReady session opened:", this.session_id);
        } else {
            console.error("Failed to open PlayReady session:", jsonData.message);
            throw new Error("Failed to open PlayReady session");
        }
    }

    // Get PlayReady challenge
    getChallenge(init_data) {
        const url = `${this.host}/remotecdm/playready/${this.device_name}/get_license_challenge`;
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, false);
        xhr.setRequestHeader('Content-Type', 'application/json');
        const body = {
            session_id: this.session_id,
            init_data: init_data
        };
        xhr.send(JSON.stringify(body));
        const jsonData = JSON.parse(xhr.responseText);
        if (jsonData.data?.challenge) {
            this.challenge = btoa(jsonData.data.challenge);
            console.log("PlayReady challenge received:", this.challenge);
        } else {
            console.error("Failed to get PlayReady challenge:", jsonData.message);
            throw new Error("Failed to get PlayReady challenge");
        }
    }

    // Parse PlayReady license response
    parseLicense(license_message) {
        const url = `${this.host}/remotecdm/playready/${this.device_name}/parse_license`;
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, false);
        xhr.setRequestHeader('Content-Type', 'application/json');
        const body = {
            session_id: this.session_id,
            license_message: license_message
        }
        xhr.send(JSON.stringify(body));
        const jsonData = JSON.parse(xhr.responseText);
        if (jsonData.message === "Successfully parsed and loaded the Keys from the License message")
        {
            console.log("PlayReady license response parsed successfully");
            return true;
        } else {
            console.error("Failed to parse PlayReady license response:", jsonData.message);
            throw new Error("Failed to parse PlayReady license response");
        }
    }

    // Get PlayReady keys
    getKeys() {
        const url = `${this.host}/remotecdm/playready/${this.device_name}/get_keys`;
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, false);
        xhr.setRequestHeader('Content-Type', 'application/json');
        const body = {
            session_id: this.session_id
        }
        xhr.send(JSON.stringify(body));
        const jsonData = JSON.parse(xhr.responseText);
        if (jsonData.data?.keys) {
            this.keys = jsonData.data.keys;
            console.log("PlayReady keys received:", this.keys);
        } else {
            console.error("Failed to get PlayReady keys:", jsonData.message);
            throw new Error("Failed to get PlayReady keys");
        }
    }

    // Close PlayReady session
    closeSession () {
        const url = `${this.host}/remotecdm/playready/${this.device_name}/close/${this.session_id}`;
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, false);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send();
        const jsonData = JSON.parse(xhr.responseText);
        if (jsonData) {
            console.log("PlayReady session closed successfully");
        } else {
            console.error("Failed to close PlayReady session:", jsonData.message);
            throw new Error("Failed to close PlayReady session");
        }
    }
}

// Widevine Remote CDM Class
class remoteWidevineCDM {
        constructor(device_type, system_id, security_level, host, secret, device_name) {
            this.device_type = device_type;
            this.system_id = system_id;
            this.security_level = security_level;
            this.host = host;
            this.secret = secret;
            this.device_name = device_name;
            this.session_id = null;
            this.challenge = null;
            this.keys = null;
        }

    // Open Widevine session
    openSession () {
        const url = `${this.host}/remotecdm/widevine/${this.device_name}/open`;
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, false);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send();
        const jsonData = JSON.parse(xhr.responseText);
        if (jsonData.data?.session_id) {
            this.session_id = jsonData.data.session_id;
            console.log("Widevine session opened:", this.session_id);
        } else {
            console.error("Failed to open Widevine session:", jsonData.message);
            throw new Error("Failed to open Widevine session");
        }
    }

    // Set Widevine service certificate
    setServiceCertificate(certificate) {
        const url = `${this.host}/remotecdm/widevine/${this.device_name}/set_service_certificate`;
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, false);
        xhr.setRequestHeader('Content-Type', 'application/json');
        const body = {
            session_id: this.session_id,
            certificate: certificate ?? null
        }
        xhr.send(JSON.stringify(body));
        const jsonData = JSON.parse(xhr.responseText);
        if (jsonData.status === 200) {
            console.log("Service certificate set successfully");
        } else {
            console.error("Failed to set service certificate:", jsonData.message);
            throw new Error("Failed to set service certificate");
        }
    }

    // Get Widevine challenge
    getChallenge(init_data, license_type = 'STREAMING') {
        const url = `${this.host}/remotecdm/widevine/${this.device_name}/get_license_challenge/${license_type}`;
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, false);
        xhr.setRequestHeader('Content-Type', 'application/json');
        const body = {
            session_id: this.session_id,
            init_data: init_data,
            privacy_mode: serviceCertFound
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

    // Parse Widevine license response
    parseLicense(license_message) {
        const url =  `${this.host}/remotecdm/widevine/${this.device_name}/parse_license`;
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, false);
        xhr.setRequestHeader('Content-Type', 'application/json');
        const body = {
            session_id: this.session_id,
            license_message: license_message
        };
        xhr.send(JSON.stringify(body));
        const jsonData = JSON.parse(xhr.responseText);
        if (jsonData.status === 200) {
            console.log("Widevine license response parsed successfully");
            return true;
        } else {
            console.error("Failed to parse Widevine license response:", jsonData.message);
            throw new Error("Failed to parse Widevine license response");
        }
    }

    // Get Widevine keys
    getKeys() {
        const url = `${this.host}/remotecdm/widevine/${this.device_name}/get_keys/ALL`;
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, false);
        xhr.setRequestHeader('Content-Type', 'application/json');
        const body = {
            session_id: this.session_id
        };
        xhr.send(JSON.stringify(body));
        const jsonData = JSON.parse(xhr.responseText);
        if (jsonData.data?.keys) {
            this.keys = jsonData.data.keys;
            console.log("Widevine keys received:", this.keys);
        } else {
            console.error("Failed to get Widevine keys:", jsonData.message);
            throw new Error("Failed to get Widevine keys");
        }
    }

    // Close Widevine session
    closeSession() {
        const url = `${this.host}/remotecdm/widevine/${this.device_name}/close/${this.session_id}`;
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, false);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send();
        const jsonData = JSON.parse(xhr.responseText);
        if (jsonData) {
            console.log("Widevine session closed successfully");
        } else {
            console.error("Failed to close Widevine session:", jsonData.message);
            throw new Error("Failed to close Widevine session");
        }
    }
}

// Utility functions
const hexStrToU8 = hexString =>
    Uint8Array.from(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

const u8ToHexStr = bytes =>
    bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');

const b64ToHexStr = b64 =>
    [...atob(b64)].map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join``;

function jsonContainsValue(obj, target) {
    if (typeof obj === "string") return obj === target;
    if (Array.isArray(obj)) return obj.some(val => jsonContainsValue(val, target));
    if (typeof obj === "object" && obj !== null) {
        return Object.values(obj).some(val => jsonContainsValue(val, target));
    }
    return false;
}

function jsonReplaceValue(obj, target, newValue) {
    if (typeof obj === "string") {
        return obj === target ? newValue : obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => jsonReplaceValue(item, target, newValue));
    }

    if (typeof obj === "object" && obj !== null) {
        const newObj = {};
        for (const key in obj) {
            if (Object.hasOwn(obj, key)) {
                newObj[key] = jsonReplaceValue(obj[key], target, newValue);
            }
        }
        return newObj;
    }

    return obj;
}

const isJson = (str) => {
    try {
        JSON.parse(str);
        return true;
    } catch (e) {
        return false;
    }
};

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
  let obj = JSON.parse((new TextDecoder("utf-8")).decode(response));
  return obj["keys"].map(o => ({
    key_id: b64ToHexStr(o["kid"].replace(/-/g, '+').replace(/_/g, '/')),
    key: b64ToHexStr(o["k"].replace(/-/g, '+').replace(/_/g, '/')),
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
  let binary = '';
  const len = uint8array.length;

  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8array[i]);
  }

  return window.btoa(binary);
}

// Challenge generator interceptor
const originalGenerateRequest = MediaKeySession.prototype.generateRequest;
MediaKeySession.prototype.generateRequest = function(initDataType, initData) {
    if (!generateRequestCalled) {
        generateRequestCalled = true;
        const session = this;
        let playReadyPssh = getPlayReadyPssh(initData);
        if (playReadyPssh && drmOverride !== "WIDEVINE") {
            // PlayReady Code
            drmType = "PlayReady";
            window.postMessage({ type: "__DRM_TYPE__", data: "PlayReady" }, "*");
            console.log("[DRM Detected] PlayReady");
            pssh = playReadyPssh;
            window.postMessage({ type: "__PSSH_DATA__", data: playReadyPssh }, "*");
            console.log("[PlayReady PSSH found] " + playReadyPssh)
        }
        let wideVinePssh = getWidevinePssh(initData)
        if (wideVinePssh && !playReadyPssh && drmOverride !== "PLAYREADY") {
            // Widevine code
            drmType = "Widevine";
            window.postMessage({ type: "__DRM_TYPE__", data: "Widevine" }, "*");
            console.log("[DRM Detected] Widevine");
            pssh = wideVinePssh;
            window.postMessage({ type: "__PSSH_DATA__", data: wideVinePssh }, "*");
            console.log("[Widevine PSSH found] " + wideVinePssh)
        }
        // Challenge message interceptor
        if (!remoteListenerMounted) {
            remoteListenerMounted = true;
            session.addEventListener("message", function messageInterceptor(event) {
                event.stopImmediatePropagation();
                const uint8Array = new Uint8Array(event.message);
                const base64challenge = arrayBufferToBase64(uint8Array);
                if (base64challenge === "CAQ=" && interceptType !== "DISABLED" && drmOverride !== "PLAYREADY") {
                    const {
                        device_type, system_id, security_level, host, secret, device_name
                    } = widevineDeviceInfo;
                    remoteCDM = new remoteWidevineCDM(device_type, system_id, security_level, host, secret, device_name);
                    remoteCDM.openSession();
                }
                if (!injectionSuccess && base64challenge !== "CAQ=" && interceptType !== "DISABLED") {
                    if (interceptType === "EME") {
                        injectionSuccess = true;
                    }
                    if (!originalChallenge) {
                        originalChallenge = base64challenge;
                    }
                    if (!remoteCDM && drmType === "Widevine" && drmOverride !== "PLAYREADY") {
                        const {
                            device_type, system_id, security_level, host, secret, device_name
                        } = widevineDeviceInfo;
                        remoteCDM = new remoteWidevineCDM(device_type, system_id, security_level, host, secret, device_name);
                        remoteCDM.openSession();
                    }
                    if (!remoteCDM && drmType === "PlayReady" && drmOverride !== "WIDEVINE") {
                        const {
                            security_level, host, secret, device_name
                        } = playreadyDeviceInfo;
                        remoteCDM = new remotePlayReadyCDM(security_level, host, secret, device_name)
                        remoteCDM.openSession();
                    }
                    if (remoteCDM && interceptType === "EME") {
                        remoteCDM.getChallenge(pssh);
                    }
                    if (interceptType === "EME" && remoteCDM) {
                        const uint8challenge = base64ToUint8Array(remoteCDM.challenge);
                        const challengeBuffer = uint8challenge.buffer;
                        const syntheticEvent = new MessageEvent("message", {
                            data: event.data,
                            origin: event.origin,
                            lastEventId: event.lastEventId,
                            source: event.source,
                            ports: event.ports
                        });
                        Object.defineProperty(syntheticEvent, "message", {
                            get: () => challengeBuffer
                        });
                        console.log("Intercepted EME Challenge and injected custom one.")
                        session.dispatchEvent(syntheticEvent);
                    }
                }
            })
            console.log("Message interceptor mounted.");
        }
    return originalGenerateRequest.call(session, initDataType, initData);
    }
};


// Message update interceptors
const originalUpdate = MediaKeySession.prototype.update;
MediaKeySession.prototype.update = function(response) {
    const uint8 = response instanceof Uint8Array ? response : new Uint8Array(response);
    const base64Response = window.btoa(String.fromCharCode(...uint8));
    console.log(base64Response);
    if (base64Response.startsWith("CAUS") && pssh && remoteCDM) {
        remoteCDM.setServiceCertificate(base64Response);
    }
    if (!base64Response.startsWith("CAUS") && pssh) {
        if (licenseResponseCounter === 1 || foundChallengeInBody) {
            remoteCDM.parseLicense(base64Response);
            remoteCDM.getKeys();
            remoteCDM.closeSession();
            window.postMessage({ type: "__KEYS_DATA__", data: remoteCDM.keys }, "*");
        }
        licenseResponseCounter++;
    }
    const updatePromise = originalUpdate.call(this, response);
    if (!pssh && interceptType !== "DISABLED") {
        updatePromise
            .then(() => {
                let clearKeys = getClearkey(response);
                if (clearKeys && clearKeys.length > 0) {
                  console.log("[CLEARKEY] ", clearKeys);
                  const drmType = {
                      type: "__DRM_TYPE__",
                      data: 'ClearKey'
                  };
                  window.postMessage(drmType, "*");
                  const keysData = {
                      type: "__KEYS_DATA__",
                      data: clearKeys
                  };
                  window.postMessage(keysData, "*");
                }
            })
            .catch(e => {
                console.log("[CLEARKEY] Not found");
            });
    }

    return updatePromise;
};

// fetch POST interceptor
(function() {
  const originalFetch = window.fetch;

  window.fetch = async function(resource, config = {}) {
    const method = (config.method || 'GET').toUpperCase();

    if (method === 'POST') {
      console.log('Intercepted POST fetch request:');
      console.log('URL:', resource);
      console.log('Options:', config);
    }

    return originalFetch(resource, config);
  };
})();

// XHR POST interceptor
(function() {
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
    this._method = method;
    this._url = url;
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function(body) {
    if (this._method && this._method.toUpperCase() === 'POST') {
        if (body) {
            if (body instanceof ArrayBuffer || body instanceof Uint8Array) {
                const buffer = body instanceof Uint8Array ? body : new Uint8Array(body);
                const base64Body = window.btoa(String.fromCharCode(...buffer));
                if (base64Body.startsWith("CAES") && base64Body !== remoteCDM.challenge && interceptType === "EME") {
                    foundChallengeInBody = true;
                    // Block the request
                    return;
                }
                if (base64Body.startsWith("CAES") && interceptType == "LICENSE") {
                    foundChallengeInBody = true;
                    remoteCDM.getChallenge(pssh)
                    const injectedBody = base64ToUint8Array(remoteCDM.challenge);
                    return originalSend.call(this, injectedBody);
                }
            }
        }
    }
    return originalSend.apply(this, arguments);
  };
})();