import { useEffect, useState } from "react";
import { IoSaveOutline } from "react-icons/io5";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Settings = ({ onConfigSaved }) => {
    const [instanceUrl, setInstanceUrl] = useState("");
    const [storedUrl, setStoredUrl] = useState(null);
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        chrome.storage.local.get("cdrm_instance", (result) => {
            if (chrome.runtime.lastError) {
                toast.error("Error fetching CDRM instance:", chrome.runtime.lastError);
                console.error("Error fetching CDRM instance:", chrome.runtime.lastError);
            } else if (result.cdrm_instance) {
                setStoredUrl(result.cdrm_instance);
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
                toast.success("Successfully connected to a CDRM instance");

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
                            if (onConfigSaved) onConfigSaved();
                            navigate("/results"); // Automatically redirect after success
                        }
                    }
                );
            } else {
                toast.error("Invalid response from endpoint.");
            }
        } catch (err) {
            console.error("Connection error:", err);
            toast.error(
                `Invalid endpoint or device info could not be retrieved. Reason: ${err.message}`
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-full w-full flex-col gap-4">
            {storedUrl && (
                <p className="mb-2 text-base">
                    Current instance: <span className="font-mono font-semibold">{storedUrl}</span>
                </p>
            )}

            <fieldset className="fieldset">
                <legend className="fieldset-legend text-base">New instance URL</legend>
                <input
                    type="text"
                    value={instanceUrl}
                    onChange={(e) => setInstanceUrl(e.target.value)}
                    placeholder="https://cdrm-project.com/, http://127.0.0.1:5000/"
                    className="input w-full font-mono"
                />
            </fieldset>

            <button
                type="button"
                onClick={handleSave}
                disabled={loading}
                className="btn btn-primary btn-block"
            >
                {loading ? (
                    <>
                        <span className="loading loading-spinner loading-sm"></span> Connecting...
                    </>
                ) : (
                    <>
                        <IoSaveOutline className="h-5 w-5" />
                        Save settings
                    </>
                )}
            </button>
        </div>
    );
};

export default Settings;
