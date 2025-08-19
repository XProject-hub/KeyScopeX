import React, { useEffect, useState } from "react";
import { IoCameraOutline, IoCopyOutline, IoSaveOutline } from "react-icons/io5";
import { toast } from "sonner";
import InjectionMenu from "./injectionmenu";

const Results = () => {
    const [drmType, setDrmType] = useState("");
    const [pssh, setPssh] = useState("");
    const [licenseUrl, setLicenseUrl] = useState("");
    const [keys, setKeys] = useState([]);
    const [manifestUrl, setManifestUrl] = useState("");
    const [currentTabUrl, setCurrentTabUrl] = useState("");

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
                }
            }
        };

        chrome.storage.onChanged.addListener(handleChange);
        return () => chrome.storage.onChanged.removeListener(handleChange);
    }, []);

    const handleCapture = () => {
        // Reset stored values
        chrome.storage.local.set({
            drmType: "",
            latestPSSH: "",
            licenseURL: "",
            manifestURL: "",
            latestKeys: [],
        });

        // Get all normal windows to exclude your popup
        chrome.windows.getAll({ populate: true, windowTypes: ["normal"] }, (windows) => {
            if (!windows || windows.length === 0) {
                console.warn("No normal Chrome windows found");
                return;
            }

            // Find the last focused normal window
            const lastFocusedWindow = windows.find((w) => w.focused) || windows[0];

            if (!lastFocusedWindow) {
                console.warn("No focused normal window found");
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
                    }
                });
            } else {
                console.warn("No active tab found in the last focused normal window");
            }
        });
    };

    const handleCopyToClipboard = (text, label) => {
        navigator.clipboard.writeText(text);
        toast.success(`Copied ${label} to clipboard`);
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
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: "application/json",
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `drm-data-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="flex h-full w-full flex-col gap-4">
            <InjectionMenu />
            <button onClick={handleCapture} className="btn btn-primary">
                <IoCameraOutline className="h-5 w-5" />
                Capture current tab
            </button>

            <fieldset className="fieldset">
                <legend className="fieldset-legend text-base">DRM Type</legend>
                <input
                    type="text"
                    value={drmType}
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
                        isYouTube() && !manifestUrl ? "text-yellow-400" : ""
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
                            Copy manifest URL
                        </button>
                    </p>
                )}
            </fieldset>

            <fieldset className="fieldset">
                <legend className="fieldset-legend text-base">PSSH</legend>
                <input
                    type="text"
                    value={pssh}
                    className="input w-full font-mono"
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
                    className="input w-full font-mono"
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
                            Copy license URL
                        </button>
                    </p>
                )}
            </fieldset>

            <fieldset className="fieldset">
                <legend className="fieldset-legend text-base">Keys</legend>
                <textarea
                    value={
                        Array.isArray(keys) && keys.filter((k) => k.type !== "SIGNING").length > 0
                            ? keys
                                  .filter((k) => k.type !== "SIGNING")
                                  .map((k) => `${k.key_id || k.keyId}:${k.key}`)
                                  .join("\n")
                            : "[Not available]"
                    }
                    className="textarea w-full font-mono"
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
                                Copy keys
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
