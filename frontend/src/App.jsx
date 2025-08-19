import { useEffect, useState } from "react";
import { Navigate, Route, HashRouter as Router, Routes } from "react-router-dom";
import About from "./components/about";
import Container from "./components/container";
import Results from "./components/results";
import Settings from "./components/settings";
import TabNavigation from "./components/tabnavigation";

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
            <div className="flex h-screen items-center justify-center">
                <span className="loading loading-spinner loading-md ms-2"></span>
                Loading...
            </div>
        );
    }

    return (
        <Router>
            <div className="flex h-screen flex-col py-4">
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
                </Container>
            </div>
        </Router>
    );
};

export default App;
