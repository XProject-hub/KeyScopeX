import { useEffect, useState } from "react";

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
            } else {
                setInjectionType(type);
                console.log(`Injection type updated to ${type}`);
            }
        });
    };

    const handleDrmOverrideChange = (type) => {
        chrome.storage.local.set({ drm_override: type }, () => {
            if (chrome.runtime.lastError) {
                console.error("Error updating drm_override:", chrome.runtime.lastError);
            } else {
                setDrmOverride(type);
                console.log(`DRM Override updated to ${type}`);
            }
        });
    };

    return (
        <div className="flex flex-row">
            <div className="mr-2 ml-auto flex h-full flex-row items-center justify-center">
                <p className="mr-2 p-2 text-lg text-nowrap">Injection type:</p>
                <div role="tablist" className="tabs tabs-border">
                    <a
                        role="tab"
                        className={`tab ${injectionType === "LICENSE" ? "tab-active font-semibold" : ""}`}
                        onClick={() => handleInjectionTypeChange("LICENSE")}
                    >
                        License
                    </a>
                    <a
                        role="tab"
                        className={`tab ${injectionType === "EME" ? "tab-active font-semibold" : ""}`}
                        onClick={() => handleInjectionTypeChange("EME")}
                    >
                        EME
                    </a>
                    <a
                        role="tab"
                        className={`tab ${injectionType === "DISABLED" ? "tab-active font-semibold" : ""}`}
                        onClick={() => handleInjectionTypeChange("DISABLED")}
                    >
                        Disabled
                    </a>
                </div>
            </div>
        </div>
    );
};

export default InjectionMenu;
