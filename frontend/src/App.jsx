import { useEffect, useState } from "react";
import { Navigate, Route, HashRouter as Router, Routes } from "react-router-dom";
import About from "./components/about";
import Container from "./components/container";
import Results from "./components/results";
import Settings from "./components/settings";
import TabNavigation from "./components/tabnavigation";
import keyScopeXLogo from "./assets/keyscopex-logo.png";

const App = () => {
    const [validConfig, setValidConfig] = useState(null);

    useEffect(() => {
        // Fix: Access chrome API properly for browser extensions
        if (typeof chrome !== "undefined" && chrome.storage) {
            chrome.storage.local.get("valid_config", (result) => {
                if (chrome.runtime.lastError) {
                    console.error("Error reading valid_config:", chrome.runtime.lastError);
                    setValidConfig(false);
                } else {
                    setValidConfig(result.valid_config === true);
                }
            });
        } else {
            // Fallback for development/testing
            setValidConfig(false);
        }
    }, []);

    const handleConfigSaved = () => {
        setValidConfig(true);
        // Navigate to main tab after config is saved
        window.location.hash = "#/results";
    };

    if (validConfig === null) {
        return (
            <div className="flex h-screen items-center justify-center bg-base-100">
                <div className="flex flex-col items-center gap-4">
                    <span className="loading loading-spinner loading-lg text-primary"></span>
                    <p className="text-lg text-base-content">Initializing KeyScopeX...</p>
                </div>
            </div>
        );
    }

    return (
        <Router>
            <div className="flex h-screen flex-col bg-base-100">
                {/* KeyScopeX Header with Logo */}
                <div className="ksx-header">
                    <img 
                        src={keyScopeXLogo} 
                        alt="KeyScopeX Logo" 
                        className="ksx-logo"
                    />
                </div>

                <Container>
                    <TabNavigation validConfig={validConfig} />
                    <div className="divider"></div>
                    <Routes>
                        {!validConfig ? (
                            <>
                                <Route
                                    path="/settings"
                                    element={<Settings onConfigSaved={handleConfigSaved} />}
                                />
                                <Route path="*" element={<Navigate to="/settings" replace />} />
                            </>
                        ) : (
                            <>
                                <Route path="/" element={<Navigate to="/results" replace />} />
                                <Route path="/results" element={<Results />} />
                                <Route path="/settings" element={<Settings />} />
                                <Route path="/about" element={<About />} />
                            </>
                        )}
                    </Routes>

                    {/* Footer Branding */}
                    <div className="ksx-footer">
                        <p>
                            Developed by <span className="ksx-footer-brand">X Project</span> | Version 1.0.1
                        </p>
                    </div>
                </Container>
            </div>
        </Router>
    );
};

export default App;
