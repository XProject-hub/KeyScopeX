import React, { useEffect, useState } from "react";
import { IoCameraOutline, IoCopyOutline, IoSaveOutline, IoCheckmarkCircle } from "react-icons/io5";
import { toast } from "sonner";
import InjectionMenu from "./injectionmenu";

const Results = () => {
    const [drmType, setDrmType] = useState("");
    const [pssh, setPssh] = useState("");
    const [licenseUrl, setLicenseUrl] = useState("");
    const [keys, setKeys] = useState([]);
    const [manifestUrl, setManifestUrl] = useState("");
    const [currentTabUrl, setCurrentTabUrl] = useState("");
    const [isCapturing, setIsCapturing] = useState(false);

    useEffect(() => {
        chrome.storage.local.get(
            [
                "drmType",
                "latestPSSH",
                "latestLicenseRequest",
                "latestKeys",
                "licenseURL",
                "manifestURL",
            ],
            (result) => {
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

        // Get current tab URL when component mounts
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
                    setKeys(changes.latestKeys.newValue || []);
                    if (changes.latestKeys.newValue && changes.latestKeys.newValue.length > 0) {
                        toast.success("Keys extracted successfully!", {
                            icon: <IoCheckmarkCircle className="text-success" />,
                        });
                    }
                }
            }
        };

        chrome.storage.onChanged.addListener(handleChange);
        return () => chrome.storage.onChanged.removeListener(handleChange);
    }, []);

    const handleCapture = () => {
        setIsCapturing(true);
        
        // Reset stored values
        chrome.storage.local.set({
            drmType: "",
            latestPSSH: "",
            licenseURL: "",
            manifestURL: "",
            latestKeys: [],
        });

        // Show capturing toast
        toast.loading("Capturing DRM data from current tab...", { id: "capture-toast" });

        // Get all normal windows to exclude your popup
        chrome.windows.getAll({ populate: true, windowTypes: ["normal"] }, (windows) => {
            if (!windows || windows.length === 0) {
                console.warn("No normal Chrome windows found");
                toast.dismiss("capture-toast");
                toast.error("No browser windows found");
                setIsCapturing(false);
                return;
            }

            // Find the last focused normal window
            const lastFocusedWindow = windows.find((w) => w.focused) || windows[0];

            if (!lastFocusedWindow) {
                console.warn("No focused normal window found");
                toast.dismiss("capture-toast");
                toast.error("No active window found");
                setIsCapturing(false);
                return;
            }

            // Find the active tab in that window (that is a regular webpage)
            const activeTab = lastFocusedWindow.tabs.find(
                (tab) => tab.active && tab.url && /^https?:\/\//.test(tab.url)
            );

            if (activeTab?.id) {
                chrome.tabs.reload(activeTab.id, () => {
                    if (chrome.runtime.lastError) {
                        console.error("Failed to reload tab:", chrome.runtime.lastError);
                        toast.dismiss("capture-toast");
                        toast.error("Failed to reload tab");
                        setIsCapturing(false);
                    } else {
                        setTimeout(() => {
                            toast.dismiss("capture-toast");
                            toast.info("Page reloaded. Play the video to capture DRM keys.");
                            setIsCapturing(false);
                        }, 1000);
                    }
                });
            } else {
                console.warn("No active tab found in the last focused normal window");
                toast.dismiss("capture-toast");
                toast.error("No active webpage found");
                setIsCapturing(false);
            }
        });
    };

    const handleCopyToClipboard = (text, label) => {
        navigator.clipboard.writeText(text);
        toast.success(`Copied ${label} to clipboard`, {
            icon: <IoCopyOutline className="text-info" />,
        });
    };

    // Check if current tab is YouTube
    const isYouTube = () => {
        return currentTabUrl.includes("youtube.com") || currentTabUrl.includes("youtu.be");
    };

    // Get manifest URL display value
    const getManifestDisplayValue = () => {
        if (manifestUrl) {
            return manifestUrl;
        }
        if (isYouTube()) {
            return "[Use yt-dlp to download video]";
        }
        return "";
    };

    // Get manifest URL placeholder
    const getManifestPlaceholder = () => {
        if (isYouTube() && !manifestUrl) {
            return "[Use yt-dlp to download video]";
        }
        return "[Not available]";
    };

    // Export to JSON file
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
            exportedBy: "KeyScopeX - LineWatchX Project",
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
        
        toast.success("DRM data exported successfully!", {
            icon: <IoSaveOutline className="text-success" />,
        });
    };

    return (
        <div className="flex h-full w-full flex-col gap-4">
            <InjectionMenu />
            
            <button 
                onClick={handleCapture} 
                className="btn btn-primary pulse-orange"
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

            {/* Status Indicator */}
            {hasData() && (
                <div className="alert bg-success/20 border-success/50">
                    <IoCheckmarkCircle className="h-6 w-6 text-success" />
                    <span className="text-success font-semibold">DRM Keys Successfully Extracted!</span>
                </div>
            )}

            <fieldset className="fieldset">
                <legend className="fieldset-legend text-base">
                    <span className="status-indicator status-online"></span>
                    DRM Type
                </legend>
                <input
                    type="text"
                    value={drmType || "[Waiting for capture...]"}
                    className="input w-full font-mono"
                    placeholder="[Not available]"
                    disabled
                />
            </fieldset>

            <fieldset className="fieldset">
                <legend className="fieldset-legend text-base">Manifest URL</legend>
                <input
                    type="text"
                    value={getManifestDisplayValue()}
                    className={`input w-full font-mono ${
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
                            <IoCopyOutline className="h-5 w-5" />
                            Copy Manifest URL
                        </button>
                    </p>
                )}
            </fieldset>

            <fieldset className="fieldset">
                <legend className="fieldset-legend text-base">PSSH (Protection System Specific Header)</legend>
                <input
                    type="text"
                    value={pssh}
                    className="input w-full font-mono text-sm"
                    placeholder="[Not available]"
                    disabled
                />
                {pssh && (
                    <p className="label flex justify-end">
                        <button
                            className="btn btn-link btn-sm text-info"
                            onClick={() => handleCopyToClipboard(pssh, "PSSH")}
                        >
                            <IoCopyOutline className="h-5 w-5" />
                            Copy PSSH
                        </button>
                    </p>
                )}
            </fieldset>

            <fieldset className="fieldset">
                <legend className="fieldset-legend text-base">License URL</legend>
                <input
                    type="text"
                    value={licenseUrl}
                    className="input w-full font-mono text-sm"
                    placeholder="[Not available]"
                    disabled
                />
                {licenseUrl && (
                    <p className="label flex justify-end">
                        <button
                            className="btn btn-link btn-sm text-info"
                            onClick={() => handleCopyToClipboard(licenseUrl, "license URL")}
                        >
                            <IoCopyOutline className="h-5 w-5" />
                            Copy License URL
                        </button>
                    </p>
                )}
            </fieldset>

            <fieldset className="fieldset">
                <legend className="fieldset-legend text-base">
                    Decryption Keys 
                    {hasData() && (
                        <span className="ml-2 badge badge-success badge-sm">
                            {keys.filter((k) => k.type !== "SIGNING").length} keys found
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
                    className="textarea w-full font-mono text-sm"
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
                                <IoCopyOutline className="h-5 w-5" />
                                Copy All Keys
                            </button>
                        </p>
                    )}
            </fieldset>

            {hasData() && (
                <button onClick={handleExportJSON} className="btn btn-success glow-orange">
                    <IoSaveOutline className="h-5 w-5" />
                    Export as JSON
                </button>
            )}
        </div>
    );
};

export default Results;
