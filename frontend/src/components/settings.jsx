import { useEffect, useState } from "react";
import { IoSaveOutline, IoServerOutline, IoCheckmarkCircle, IoWarning, IoKey } from "react-icons/io5";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const PANEL_URL = "https://keyscopex.xproject.live";

const Settings = ({ onConfigSaved }) => {
    const [instanceUrl, setInstanceUrl] = useState("");
    const [storedUrl, setStoredUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [deviceInfo, setDeviceInfo] = useState(null);
    
    // Panel License Integration
    const [licenseKey, setLicenseKey] = useState("");
    const [storedLicense, setStoredLicense] = useState(null);
    const [licenseInfo, setLicenseInfo] = useState(null);
    const [licenseLoading, setLicenseLoading] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        chrome.storage.local.get(["cdrm_instance", "widevine_device", "playready_device", "panel_license", "panel_license_info"], (result) => {
            if (chrome.runtime.lastError) {
                toast.error("Error fetching configuration");
                console.error("Error:", chrome.runtime.lastError);
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
            toast.error("Please enter a valid URL");
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
                toast.success("Connected to CDRM instance");

                const widevineRes = await fetch(`${trimmedUrl}/remotecdm/widevine/deviceinfo`);
                if (!widevineRes.ok) {
                    toast.error(`Failed to fetch Widevine device info`);
                    return;
                }
                const widevineData = await widevineRes.json();

                const playreadyRes = await fetch(`${trimmedUrl}/remotecdm/playready/deviceinfo`);
                if (!playreadyRes.ok) {
                    toast.error(`Failed to fetch PlayReady device info`);
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
                            toast.error("Error saving configuration");
                        } else {
                            setStoredUrl(trimmedUrl);
                            setInstanceUrl("");
                            setDeviceInfo({
                                widevine: widevineData,
                                playready: playreadyData,
                            });
                            if (onConfigSaved) onConfigSaved();
                            toast.success("Configuration saved");
                            setTimeout(() => navigate("/results"), 1000);
                        }
                    }
                );
            } else {
                toast.error("Invalid response from endpoint");
            }
        } catch (err) {
            console.error("Connection error:", err);
            toast.error("Connection failed. Check your CDRM instance");
        } finally {
            setLoading(false);
        }
    };

    const handleLicenseValidation = async () => {
        const trimmedLicense = licenseKey.trim();
        if (!trimmedLicense) {
            toast.error("Please enter your license key");
            return;
        }

        if (!trimmedLicense.startsWith('KSX-')) {
            toast.error("Invalid license key format");
            return;
        }

        setLicenseLoading(true);

        try {
            const response = await fetch(`${PANEL_URL}/panel/backend/api/license.php?action=check`, {
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
                            setLicenseKey("");
                            toast.success(`License activated - Welcome ${data.user.username}`);
                        }
                    }
                );
            } else {
                toast.error(data.message || "Invalid license key");
            }
        } catch (err) {
            console.error("License validation error:", err);
            toast.error("Failed to validate license. Check your connection");
        } finally {
            setLicenseLoading(false);
        }
    };

    return (
        <div className="flex h-full w-full flex-col gap-4">
            
            {/* Panel License Section - Primary */}
            {storedLicense && licenseInfo ? (
                <div className="alert bg-success/20 border-success/50">
                    <IoCheckmarkCircle className="h-6 w-6 text-success" />
                    <div className="flex flex-col flex-1">
                        <span className="font-semibold text-success">Panel Connected</span>
                        <span className="text-sm text-base-content">
                            {licenseInfo.user.username} - {licenseInfo.license_type} License
                        </span>
                        <span className="text-xs font-mono text-base-content/60 mt-1">{storedLicense}</span>
                    </div>
                    <a href={`${PANEL_URL}/panel/user/`} target="_blank" className="btn btn-sm btn-success">
                        Open Dashboard
                    </a>
                </div>
            ) : (
                <div className="alert bg-warning/20 border-warning/50">
                    <IoWarning className="h-6 w-6 text-warning" />
                    <div className="flex flex-col">
                        <span className="font-semibold text-warning">No License Connected</span>
                        <span className="text-sm text-base-content">Enter your license key to auto-sync captured keys</span>
                    </div>
                </div>
            )}

            {/* License Configuration */}
            <fieldset className="fieldset">
                <legend className="fieldset-legend text-base flex items-center gap-2">
                    <IoKey className="h-5 w-5" />
                    KeyScopeX Panel License
                </legend>
                <input
                    type="text"
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value)}
                    placeholder="KSX-xxxxxxxx-xxxxxxxx-xxxxxxxx"
                    className="input w-full font-mono"
                    disabled={licenseLoading}
                />
                <p className="label">
                    <span className="label-text-alt text-base-content/60">
                        Get your license from{" "}
                        <a href={`${PANEL_URL}/panel/public/register.php`} target="_blank" className="text-primary underline">
                            KeyScopeX Panel
                        </a>
                    </span>
                </p>
                <button
                    type="button"
                    onClick={handleLicenseValidation}
                    disabled={licenseLoading || !licenseKey.trim()}
                    className="btn btn-primary btn-block mt-3"
                >
                    {licenseLoading ? (
                        <>
                            <span className="loading loading-spinner loading-sm"></span> 
                            Validating...
                        </>
                    ) : (
                        <>
                            <IoSaveOutline className="h-5 w-5" />
                            {storedLicense ? "Update License" : "Activate License"}
                        </>
                    )}
                </button>
            </fieldset>

            <div className="divider my-6"></div>

            {/* CDRM Instance Configuration - Secondary */}
            {storedUrl ? (
                <div className="alert bg-success/20 border-success/50">
                    <IoCheckmarkCircle className="h-6 w-6 text-success" />
                    <div className="flex flex-col">
                        <span className="font-semibold text-success">CDRM Instance Connected</span>
                        <span className="text-sm font-mono text-base-content">{storedUrl}</span>
                    </div>
                </div>
            ) : (
                <div className="alert bg-info/20 border-info/50">
                    <IoServerOutline className="h-6 w-6 text-info" />
                    <div className="flex flex-col">
                        <span className="font-semibold text-info">CDRM Instance (Optional)</span>
                        <span className="text-sm text-base-content">Configure if you have access to a CDRM server</span>
                    </div>
                </div>
            )}

            {/* Device Information */}
            {deviceInfo && (
                <div className="card bg-base-200 border border-primary/30">
                    <div className="card-body p-4">
                        <h3 className="card-title text-primary text-sm">
                            <IoServerOutline className="h-4 w-4" />
                            Device Information
                        </h3>
                        <div className="divider my-1"></div>
                        {deviceInfo.widevine && (
                            <div className="mb-2">
                                <h4 className="font-semibold text-accent mb-1 text-sm">Widevine CDM</h4>
                                <div className="text-xs space-y-0.5 font-mono">
                                    <p><span className="text-base-content/60">Device:</span> {deviceInfo.widevine.device_name}</p>
                                    <p><span className="text-base-content/60">Security Level:</span> L{deviceInfo.widevine.security_level}</p>
                                </div>
                            </div>
                        )}
                        {deviceInfo.playready && (
                            <div>
                                <h4 className="font-semibold text-accent mb-1 text-sm">PlayReady</h4>
                                <div className="text-xs space-y-0.5 font-mono">
                                    <p><span className="text-base-content/60">Device:</span> {deviceInfo.playready.device_name}</p>
                                    <p><span className="text-base-content/60">Security:</span> {deviceInfo.playready.security_level}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* CDRM Configuration Form */}
            <fieldset className="fieldset">
                <legend className="fieldset-legend text-base flex items-center gap-2">
                    <IoServerOutline className="h-5 w-5" />
                    CDRM Instance URL (Optional)
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
                        Enter CDRM instance URL for decryption capabilities
                    </span>
                </p>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={loading || !instanceUrl.trim()}
                    className="btn btn-primary btn-block mt-3"
                >
                    {loading ? (
                        <>
                            <span className="loading loading-spinner loading-sm"></span> 
                            Connecting...
                        </>
                    ) : (
                        <>
                            <IoSaveOutline className="h-5 w-5" />
                            {storedUrl ? "Update Instance" : "Connect Instance"}
                        </>
                    )}
                </button>
            </fieldset>

            {/* Help Text */}
            <div className="card bg-base-200/50 border border-base-300">
                <div className="card-body py-3 px-4">
                    <h4 className="font-semibold text-sm text-primary mb-2">About CDRM Instance</h4>
                    <p className="text-xs text-base-content/80 leading-relaxed">
                        A CDRM instance handles decryption of DRM-protected content. 
                        It's optional but required for full decryption capabilities.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Settings;
