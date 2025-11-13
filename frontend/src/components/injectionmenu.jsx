import { useEffect, useState } from "react";
import { IoCodeSlash } from "react-icons/io5";
import { toast } from "sonner";

const InjectionMenu = () => {
    const [injectionType, setInjectionType] = useState("LICENSE");
    const [drmOverride, setDrmOverride] = useState("DISABLED");

    useEffect(() => {
        chrome.storage.local.get(["injection_type", "drm_override"], (result) => {
            if (result.injection_type !== undefined) {
                setInjectionType(result.injection_type);
            }
            if (result.drm_override !== undefined) {
                setDrmOverride(result.drm_override);
            }
        });
    }, []);

    const handleInjectionTypeChange = (type) => {
        chrome.storage.local.set({ injection_type: type }, () => {
            if (chrome.runtime.lastError) {
                console.error("Error updating injection_type:", chrome.runtime.lastError);
                toast.error("Failed to update injection type");
            } else {
                setInjectionType(type);
                console.log(`Injection type updated to ${type}`);
                toast.success(`Injection type set to ${type}`);
            }
        });
    };

    const handleDrmOverrideChange = (type) => {
        chrome.storage.local.set({ drm_override: type }, () => {
            if (chrome.runtime.lastError) {
                console.error("Error updating drm_override:", chrome.runtime.lastError);
                toast.error("Failed to update DRM override");
            } else {
                setDrmOverride(type);
                console.log(`DRM Override updated to ${type}`);
            }
        });
    };

    return (
        <div className="card bg-base-200 border border-primary/20 shadow-md">
            <div className="card-body p-4">
                <div className="flex flex-col gap-3">
                    {/* Injection Type */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <div className="flex items-center gap-2 min-w-fit">
                            <IoCodeSlash className="h-5 w-5 text-primary" />
                            <span className="font-semibold text-base-content">Injection Type:</span>
                        </div>
                        <div role="tablist" className="tabs tabs-box flex-1">
                            <a
                                role="tab"
                                className={`tab flex-1 ${injectionType === "LICENSE" ? "tab-active font-semibold" : ""}`}
                                onClick={() => handleInjectionTypeChange("LICENSE")}
                                title="Inject via License Request (recommended)"
                            >
                                License
                            </a>
                            <a
                                role="tab"
                                className={`tab flex-1 ${injectionType === "EME" ? "tab-active font-semibold" : ""}`}
                                onClick={() => handleInjectionTypeChange("EME")}
                                title="Inject via EME API"
                            >
                                EME
                            </a>
                            <a
                                role="tab"
                                className={`tab flex-1 ${injectionType === "DISABLED" ? "tab-active font-semibold" : ""}`}
                                onClick={() => handleInjectionTypeChange("DISABLED")}
                                title="Disable injection"
                            >
                                Disabled
                            </a>
                        </div>
                    </div>
                    
                    {/* Info tooltip */}
                    <div className="text-xs text-base-content/60">
                        {injectionType === "LICENSE" && (
                            <p>✓ Using License Request injection (best compatibility)</p>
                        )}
                        {injectionType === "EME" && (
                            <p>✓ Using EME API injection (alternative method)</p>
                        )}
                        {injectionType === "DISABLED" && (
                            <p>⚠ Injection is disabled - no keys will be captured</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InjectionMenu;
