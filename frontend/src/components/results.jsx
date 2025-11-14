import React, { useEffect, useState } from "react";
import { IoCameraOutline, IoCopyOutline, IoSaveOutline, IoCheckmarkCircle, IoCloudUploadOutline } from "react-icons/io5";
import { toast } from "sonner";
import InjectionMenu from "./injectionmenu";

const PANEL_URL = "https://keyscopex.xproject.live";

const Results = () => {
    const [drmType, setDrmType] = useState("");
    const [pssh, setPssh] = useState("");
    const [licenseUrl, setLicenseUrl] = useState("");
    const [keys, setKeys] = useState([]);
    const [manifestUrl, setManifestUrl] = useState("");
    const [currentTabUrl, setCurrentTabUrl] = useState("");
    const [isCapturing, setIsCapturing] = useState(false);
    
    // Panel integration
    const [panelLicense, setPanelLicense] = useState(null);
    const [licenseInfo, setLicenseInfo] = useState(null);

    useEffect(() => {
        chrome.storage.local.get(
            [
                "drmType",
                "latestPSSH",
                "latestKeys",
                "licenseURL",
                "manifestURL",
                "panel_license",
                "panel_license_info",
            ],
            (result) => {
                if (result.panel_license) {
                    setPanelLicense(result.panel_license);
                }
                if (result.panel_license_info) {
                    setLicenseInfo(result.panel_license_info);
                }
                if (result.drmType) setDrmType(result.drmType || "");
                if (result.latestPSSH) setPssh(result.latestPSSH || "");
                if (result.licenseURL) setLicenseUrl(result.licenseURL || "");
                if (result.manifestURL) setManifestUrl(result.manifestURL || "");
                if (result.latestKeys) {
                    try {
                        const parsed = Array.isArray(result.latestKeys)
                            ? result.latestKeys
                            : JSON.parse(result.latestKeys);
                        setKeys(parsed);
                    } catch (e) {
                        console.error("Failed to parse keys:", e);
                        setKeys([]);
                    }
                }
            }
        );

        chrome.windows.getAll({ populate: true, windowTypes: ["normal"] }, (windows) => {
            if (windows && windows.length > 0) {
                const lastFocusedWindow = windows.find((w) => w.focused) || windows[0];
                if (lastFocusedWindow) {
                    const activeTab = lastFocusedWindow.tabs.find(
                        (tab) => tab.active && tab.url && /^https?:\/\//.test(tab.url)
                    );
                    if (activeTab?.url) {
                        setCurrentTabUrl(activeTab.url);
                    }
                }
            }
        });

        const handleChange = (changes, area) => {
            if (area === "local") {
                if (changes.drmType) {
                    setDrmType(changes.drmType.newValue || "");
                }
                if (changes.latestPSSH) {
                    setPssh(changes.latestPSSH.newValue || "");
                }
                if (changes.licenseURL) {
                    setLicenseUrl(changes.licenseURL.newValue || "");
                }
                if (changes.manifestURL) {
                    setManifestUrl(changes.manifestURL.newValue || "");
                }
                if (changes.latestKeys) {
                    const newKeys = changes.latestKeys.newValue || [];
                    setKeys(newKeys);
                    if (newKeys && newKeys.length > 0) {
                        toast.success("Keys extracted successfully");
                        syncKeysToPanel(newKeys);
                    }
                }
            }
        };

        chrome.storage.onChanged.addListener(handleChange);
        return () => chrome.storage.onChanged.removeListener(handleChange);
    }, [panelLicense, drmType, pssh, licenseUrl, manifestUrl, currentTabUrl]);

    const handleCapture = () => {
        setIsCapturing(true);
        
        chrome.storage.local.set({
            drmType: "",
            latestPSSH: "",
            licenseURL: "",
            manifestURL: "",
            latestKeys: [],
        });

        toast.loading("Capturing DRM data from current tab...", { id: "capture-toast" });

        chrome.windows.getAll({ populate: true, windowTypes: ["normal"] }, (windows) => {
            if (!windows || windows.length === 0) {
                toast.dismiss("capture-toast");
                toast.error("No browser windows found");
                setIsCapturing(false);
                return;
            }

            const lastFocusedWindow = windows.find((w) => w.focused) || windows[0];

            if (!lastFocusedWindow) {
                toast.dismiss("capture-toast");
                toast.error("No active window found");
                setIsCapturing(false);
                return;
            }

            const activeTab = lastFocusedWindow.tabs.find(
                (tab) => tab.active && tab.url && /^https?:\/\//.test(tab.url)
            );

            if (activeTab?.id) {
                chrome.tabs.reload(activeTab.id, () => {
                    if (chrome.runtime.lastError) {
                        toast.dismiss("capture-toast");
                        toast.error("Failed to reload tab");
                        setIsCapturing(false);
                    } else {
                        setTimeout(() => {
                            toast.dismiss("capture-toast");
                            toast.info("Page reloaded. Play the video to capture keys");
                            setIsCapturing(false);
                        }, 1000);
                    }
                });
            } else {
                toast.dismiss("capture-toast");
                toast.error("No active webpage found");
                setIsCapturing(false);
            }
        });
    };

    const syncKeysToPanel = async (keysToSync) => {
        if (!panelLicense || !keysToSync || keysToSync.length === 0) {
            return;
        }

        try {
            const response = await fetch(`${PANEL_URL}/panel/backend/api/keys.php?action=submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-License-Key': panelLicense,
                    'X-Extension-Version': '1.0.1'
                },
                body: JSON.stringify({
                    license_key: panelLicense,
                    drm_type: drmType,
                    pssh: pssh,
                    keys: keysToSync.map(k => ({
                        key_id: k.key_id || k.keyId,
                        key: k.key
                    })),
                    license_url: licenseUrl,
                    manifest_url: manifestUrl,
                    content_url: currentTabUrl
                })
            });

            const data = await response.json();

            if (data.success) {
                toast.success(`Synced ${data.keys_saved} key(s) to Panel`);
            }
        } catch (error) {
            console.error('Panel sync error:', error);
        }
    };

    const handleCopyToClipboard = (text, label) => {
        navigator.clipboard.writeText(text);
        toast.success(`Copied ${label} to clipboard`);
    };

    const isYouTube = () => {
        return currentTabUrl.includes("youtube.com") || currentTabUrl.includes("youtu.be");
    };

    const getManifestDisplayValue = () => {
        if (manifestUrl) return manifestUrl;
        if (isYouTube()) return "[Use yt-dlp to download video]";
        return "";
    };

    const getManifestPlaceholder = () => {
        if (isYouTube() && !manifestUrl) {
            return "[Use yt-dlp to download video]";
        }
        return "[Not available]";
    };

    const hasData = () => {
        return Array.isArray(keys) && keys.filter((k) => k.type !== "SIGNING").length > 0;
    };

    const handleExportJSON = () => {
        const exportData = {
            drmType: drmType || null,
            manifestUrl: manifestUrl || null,
            pssh: pssh || null,
            licenseUrl: licenseUrl || null,
            keys:
                Array.isArray(keys) && keys.length > 0
                    ? keys
                          .filter((k) => k.type !== "SIGNING")
                          .map((k) => `${k.key_id || k.keyId}:${k.key}`)
                    : null,
            exportedAt: new Date().toISOString(),
            exportedBy: "KeyScopeX - X Project",
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: "application/json",
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `keyscopex-drm-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast.success("DRM data exported successfully");
    };

    return (
        <div className="flex h-full w-full flex-col gap-4">
            <InjectionMenu />
            
            {/* Panel Connection Status */}
            {panelLicense && licenseInfo && (
                <div className="alert bg-primary/20 border-primary/50">
                    <IoCloudUploadOutline className="h-5 w-5 text-primary" />
                    <div className="flex flex-col flex-1">
                        <span className="font-semibold text-primary">
                            Connected: {licenseInfo.user.username}
                        </span>
                        <span className="text-xs text-base-content/70">
                            {licenseInfo.license_type} License - Auto-sync enabled
                        </span>
                    </div>
                    <a href={`${PANEL_URL}/panel/user/`} target="_blank" className="btn btn-xs btn-primary">
                        Dashboard
                    </a>
                </div>
            )}
            
            <button 
                onClick={handleCapture} 
                className="btn btn-primary"
                disabled={isCapturing}
            >
                {isCapturing ? (
                    <>
                        <span className="loading loading-spinner loading-sm"></span>
                        Capturing...
                    </>
                ) : (
                    <>
                        <IoCameraOutline className="h-5 w-5" />
                        Capture Current Tab
                    </>
                )}
            </button>

            {hasData() && (
                <div className="alert bg-success/20 border-success/50">
                    <IoCheckmarkCircle className="h-6 w-6 text-success" />
                    <span className="text-success font-semibold">Keys Extracted Successfully</span>
                </div>
            )}

            <fieldset className="fieldset">
                <legend className="fieldset-legend text-sm">DRM Type</legend>
                <input
                    type="text"
                    value={drmType || "[Waiting for capture...]"}
                    className="input w-full font-mono text-sm"
                    disabled
                />
            </fieldset>

            <fieldset className="fieldset">
                <legend className="fieldset-legend text-sm">Manifest URL (MPD Link)</legend>
                <input
                    type="text"
                    value={getManifestDisplayValue()}
                    className={`input w-full font-mono text-sm ${
                        isYouTube() && !manifestUrl ? "text-warning" : ""
                    }`}
                    placeholder={getManifestPlaceholder()}
                    disabled
                />
                {!isYouTube() && manifestUrl && (
                    <p className="label flex justify-end">
                        <button
                            className="btn btn-link btn-sm text-info"
                            onClick={() => handleCopyToClipboard(manifestUrl, "manifest URL")}
                        >
                            <IoCopyOutline className="h-4 w-4" />
                            Copy MPD Link
                        </button>
                    </p>
                )}
            </fieldset>

            <fieldset className="fieldset">
                <legend className="fieldset-legend text-sm">PSSH</legend>
                <input
                    type="text"
                    value={pssh}
                    className="input w-full font-mono text-xs"
                    placeholder="[Not available]"
                    disabled
                />
                {pssh && (
                    <p className="label flex justify-end">
                        <button
                            className="btn btn-link btn-sm text-info"
                            onClick={() => handleCopyToClipboard(pssh, "PSSH")}
                        >
                            <IoCopyOutline className="h-4 w-4" />
                            Copy PSSH
                        </button>
                    </p>
                )}
            </fieldset>

            <fieldset className="fieldset">
                <legend className="fieldset-legend text-sm">License URL</legend>
                <input
                    type="text"
                    value={licenseUrl}
                    className="input w-full font-mono text-xs"
                    placeholder="[Not available]"
                    disabled
                />
                {licenseUrl && (
                    <p className="label flex justify-end">
                        <button
                            className="btn btn-link btn-sm text-info"
                            onClick={() => handleCopyToClipboard(licenseUrl, "license URL")}
                        >
                            <IoCopyOutline className="h-4 w-4" />
                            Copy License URL
                        </button>
                    </p>
                )}
            </fieldset>

            <fieldset className="fieldset">
                <legend className="fieldset-legend text-sm">
                    Decryption Keys (KID:Key)
                    {hasData() && (
                        <span className="ml-2 badge badge-success badge-sm">
                            {keys.filter((k) => k.type !== "SIGNING").length} keys
                        </span>
                    )}
                </legend>
                <textarea
                    value={
                        Array.isArray(keys) && keys.filter((k) => k.type !== "SIGNING").length > 0
                            ? keys
                                  .filter((k) => k.type !== "SIGNING")
                                  .map((k) => `${k.key_id || k.keyId}:${k.key}`)
                                  .join("\n")
                            : "[Keys will appear here after capture...]"
                    }
                    className="textarea w-full font-mono text-xs"
                    rows="6"
                    disabled
                />
                {hasData() &&
                    Array.isArray(keys) &&
                    keys.filter((k) => k.type !== "SIGNING").length > 0 && (
                        <p className="label flex justify-end">
                            <button
                                className="btn btn-link btn-sm text-info"
                                onClick={() =>
                                    handleCopyToClipboard(
                                        keys
                                            .filter((k) => k.type !== "SIGNING")
                                            .map((k) => `${k.key_id || k.keyId}:${k.key}`)
                                            .join("\n"),
                                        "keys"
                                    )
                                }
                            >
                                <IoCopyOutline className="h-4 w-4" />
                                Copy All Keys
                            </button>
                        </p>
                    )}
            </fieldset>

            {hasData() && (
                <button onClick={handleExportJSON} className="btn btn-success">
                    <IoSaveOutline className="h-5 w-5" />
                    Export as JSON
                </button>
            )}
        </div>
    );
};

export default Results;
