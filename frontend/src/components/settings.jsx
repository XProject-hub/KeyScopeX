import { useEffect, useState } from "react";
import { IoSaveOutline, IoServerOutline, IoCheckmarkCircle, IoWarning } from "react-icons/io5";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Settings = ({ onConfigSaved }) => {
    const [instanceUrl, setInstanceUrl] = useState("");
    const [storedUrl, setStoredUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [deviceInfo, setDeviceInfo] = useState(null);
    
    // Panel License Integration
    const [panelLicense, setPanelLicense] = useState("");
    const [storedLicense, setStoredLicense] = useState(null);
    const [licenseInfo, setLicenseInfo] = useState(null);
    const [licenseLoading, setLicenseLoading] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        chrome.storage.local.get(["cdrm_instance", "widevine_device", "playready_device", "panel_license", "panel_license_info"], (result) => {
            if (chrome.runtime.lastError) {
                toast.error("Error fetching CDRM instance:", chrome.runtime.lastError);
                console.error("Error fetching CDRM instance:", chrome.runtime.lastError);
            } else {
                if (result.cdrm_instance) {
                    setStoredUrl(result.cdrm_instance);
                }
                if (result.widevine_device || result.playready_device) {
                    setDeviceInfo({
                        widevine: result.widevine_device,
                        playready: result.playready_device,
                    });
                }
                if (result.panel_license) {
                    setStoredLicense(result.panel_license);
                }
                if (result.panel_license_info) {
                    setLicenseInfo(result.panel_license_info);
                }
            }
        });
    }, []);

    const handleSave = async () => {
        const trimmedUrl = instanceUrl.trim().replace(/\/+$/, "");
        if (!trimmedUrl) {
            toast.error("Please enter a valid URL.");
            return;
        }

        const endpoint = trimmedUrl + "/api/extension";
        setLoading(true);

        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            const data = await response.json();

            if (data.status === true) {
                toast.success("Successfully connected to CDRM instance!", {
                    icon: <IoCheckmarkCircle className="text-success" />,
                });

                const widevineRes = await fetch(`${trimmedUrl}/remotecdm/widevine/deviceinfo`);
                if (!widevineRes.ok) {
                    toast.error(
                        `Failed to fetch Widevine device info. Reason: ${widevineRes.statusText}`
                    );
                    return;
                }
                const widevineData = await widevineRes.json();

                const playreadyRes = await fetch(`${trimmedUrl}/remotecdm/playready/deviceinfo`);
                if (!playreadyRes.ok) {
                    toast.error(
                        `Failed to fetch PlayReady device info. Reason: ${playreadyRes.statusText}`
                    );
                    return;
                }
                const playreadyData = await playreadyRes.json();

                chrome.storage.local.set(
                    {
                        valid_config: true,
                        cdrm_instance: trimmedUrl,
                        widevine_device: {
                            device_type: widevineData.device_type,
                            system_id: widevineData.system_id,
                            security_level: widevineData.security_level,
                            secret: widevineData.secret,
                            device_name: widevineData.device_name,
                            host: trimmedUrl,
                        },
                        playready_device: {
                            security_level: playreadyData.security_level,
                            secret: playreadyData.secret,
                            device_name: playreadyData.device_name,
                            host: trimmedUrl,
                        },
                    },
                    () => {
                        if (chrome.runtime.lastError) {
                            console.error(
                                "Error saving to chrome.storage:",
                                chrome.runtime.lastError
                            );
                            toast.error(
                                `Error saving configuration. Reason: ${chrome.runtime.lastError}`
                            );
                        } else {
                            console.log("Configuration saved");
                            setStoredUrl(trimmedUrl);
                            setInstanceUrl("");
                            setDeviceInfo({
                                widevine: widevineData,
                                playready: playreadyData,
                            });
                            if (onConfigSaved) onConfigSaved();
                            toast.success("Configuration saved successfully!");
                            setTimeout(() => navigate("/results"), 1000);
                        }
                    }
                );
            } else {
                toast.error("Invalid response from endpoint.");
            }
        } catch (err) {
            console.error("Connection error:", err);
            toast.error(
                `Invalid endpoint or device info could not be retrieved. Reason: ${err.message}`,
                {
                    icon: <IoWarning className="text-error" />,
                }
            );
        } finally {
            setLoading(false);
        }
    };

    const handleLicenseValidation = async () => {
        const trimmedLicense = panelLicense.trim();
        if (!trimmedLicense) {
            toast.error("Please enter your license key");
            return;
        }

        setLicenseLoading(true);

        try {
            const response = await fetch('https://keyscopex.xproject.live/panel/backend/api/license.php?action=check', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ license_key: trimmedLicense })
            });

            const data = await response.json();

            if (data.valid) {
                const licenseData = {
                    license_key: trimmedLicense,
                    license_type: data.license_type,
                    user: data.user,
                    expires: data.expires
                };

                chrome.storage.local.set(
                    {
                        panel_license: trimmedLicense,
                        panel_license_info: licenseData
                    },
                    () => {
                        if (chrome.runtime.lastError) {
                            toast.error("Error saving license");
                        } else {
                            setStoredLicense(trimmedLicense);
                            setLicenseInfo(licenseData);
                            setPanelLicense("");
                            toast.success(`License activated! Type: ${data.license_type}`, {
                                icon: <IoCheckmarkCircle className="text-success" />,
                            });
                        }
                    }
                );
            } else {
                toast.error(data.message || "Invalid license key", {
                    icon: <IoWarning className="text-error" />,
                });
            }
        } catch (err) {
            console.error("License validation error:", err);
            toast.error("Failed to validate license. Check your connection.", {
                icon: <IoWarning className="text-error" />,
            });
        } finally {
            setLicenseLoading(false);
        }
    };

    return (
        <div className="flex h-full w-full flex-col gap-4">
            {/* Current Configuration Status */}
            {storedUrl ? (
                <div className="alert bg-success/20 border-success/50">
                    <IoCheckmarkCircle className="h-6 w-6 text-success" />
                    <div className="flex flex-col">
                        <span className="font-semibold text-success">Connected to CDRM Instance</span>
                        <span className="text-sm font-mono text-base-content">{storedUrl}</span>
                    </div>
                </div>
            ) : (
                <div className="alert bg-warning/20 border-warning/50">
                    <IoWarning className="h-6 w-6 text-warning" />
                    <div className="flex flex-col">
                        <span className="font-semibold text-warning">No CDRM Instance Configured</span>
                        <span className="text-sm text-base-content">Please configure a CDRM instance to begin</span>
                    </div>
                </div>
            )}

            {/* Device Information */}
            {deviceInfo && (
                <div className="card bg-base-200 border border-primary/30">
                    <div className="card-body">
                        <h3 className="card-title text-primary">
                            <IoServerOutline className="h-5 w-5" />
                            Device Information
                        </h3>
                        <div className="divider my-1"></div>
                        {deviceInfo.widevine && (
                            <div className="mb-3">
                                <h4 className="font-semibold text-accent mb-2">Widevine CDM</h4>
                                <div className="text-sm space-y-1 font-mono">
                                    <p><span className="text-base-content/60">Device:</span> {deviceInfo.widevine.device_name}</p>
                                    <p><span className="text-base-content/60">Security Level:</span> L{deviceInfo.widevine.security_level}</p>
                                    <p><span className="text-base-content/60">System ID:</span> {deviceInfo.widevine.system_id}</p>
                                </div>
                            </div>
                        )}
                        {deviceInfo.playready && (
                            <div>
                                <h4 className="font-semibold text-accent mb-2">PlayReady</h4>
                                <div className="text-sm space-y-1 font-mono">
                                    <p><span className="text-base-content/60">Device:</span> {deviceInfo.playready.device_name}</p>
                                    <p><span className="text-base-content/60">Security Level:</span> {deviceInfo.playready.security_level}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Configuration Form */}
            <fieldset className="fieldset">
                <legend className="fieldset-legend text-base">
                    <IoServerOutline className="inline h-5 w-5 mr-1" />
                    CDRM Instance URL
                </legend>
                <input
                    type="text"
                    value={instanceUrl}
                    onChange={(e) => setInstanceUrl(e.target.value)}
                    placeholder="https://cdrm-project.com/ or http://127.0.0.1:5000/"
                    className="input w-full font-mono"
                    disabled={loading}
                />
                <p className="label">
                    <span className="label-text-alt text-base-content/60">
                        Enter the URL of your CDRM instance to connect and decrypt DRM content
                    </span>
                </p>
            </fieldset>

            <button
                type="button"
                onClick={handleSave}
                disabled={loading || !instanceUrl.trim()}
                className="btn btn-primary btn-block"
            >
                {loading ? (
                    <>
                        <span className="loading loading-spinner loading-sm"></span> 
                        Connecting to CDRM...
                    </>
                ) : (
                    <>
                        <IoSaveOutline className="h-5 w-5" />
                        {storedUrl ? "Update Instance" : "Connect Instance"}
                    </>
                )}
            </button>

            {/* Panel License Integration */}
            <div className="divider my-6"></div>
            
            {/* License Status */}
            {storedLicense && licenseInfo ? (
                <div className="alert bg-primary/20 border-primary/50">
                    <IoCheckmarkCircle className="h-6 w-6 text-primary" />
                    <div className="flex flex-col">
                        <span className="font-semibold text-primary">Panel License Active</span>
                        <span className="text-sm text-base-content">
                            {licenseInfo.user.username} • {licenseInfo.license_type} License
                        </span>
                        <span className="text-xs font-mono text-base-content/60 mt-1">{storedLicense}</span>
                    </div>
                    <a href="https://keyscopex.xproject.live/panel/user/" target="_blank" className="btn btn-sm btn-primary">
                        Open Dashboard
                    </a>
                </div>
            ) : (
                <div className="alert bg-warning/20 border-warning/50">
                    <IoWarning className="h-6 w-6 text-warning" />
                    <div className="flex flex-col">
                        <span className="font-semibold text-warning">No Panel License</span>
                        <span className="text-sm text-base-content">Connect to KeyScopeX Panel to auto-sync keys</span>
                    </div>
                </div>
            )}

            {/* License Configuration */}
            <fieldset className="fieldset">
                <legend className="fieldset-legend text-base">
                    🔑 KeyScopeX Panel License
                </legend>
                <input
                    type="text"
                    value={panelLicense}
                    onChange={(e) => setPanelLicense(e.target.value)}
                    placeholder="KSX-xxxxxxxx-xxxxxxxx-xxxxxxxx"
                    className="input w-full font-mono"
                    disabled={licenseLoading}
                />
                <p className="label">
                    <span className="label-text-alt text-base-content/60">
                        Enter your license key from <a href="https://keyscopex.xproject.live/panel/public/register.php" target="_blank" className="text-primary underline">KeyScopeX Panel</a>
                    </span>
                </p>
            </fieldset>

            <button
                type="button"
                onClick={handleLicenseValidation}
                disabled={licenseLoading || !panelLicense.trim()}
                className="btn btn-primary btn-block"
            >
                {licenseLoading ? (
                    <>
                        <span className="loading loading-spinner loading-sm"></span> 
                        Validating License...
                    </>
                ) : (
                    <>
                        <IoSaveOutline className="h-5 w-5" />
                        {storedLicense ? "Update License" : "Activate License"}
                    </>
                )}
            </button>

            {/* Help Text */}
            <div className="card bg-base-200/50 border border-base-300">
                <div className="card-body py-4">
                    <h4 className="font-semibold text-sm text-primary mb-2">ℹ️ What is a CDRM Instance?</h4>
                    <p className="text-sm text-base-content/80 leading-relaxed">
                        A CDRM (Content Decryption and Rights Management) instance is a server that handles 
                        the decryption of DRM-protected content. You need to set up or have access to a CDRM 
                        instance to use KeyScopeX for extracting decryption keys from protected media.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Settings;
