import { FaGithub, FaKey } from "react-icons/fa";
import { IoShieldCheckmark, IoCode, IoRocket } from "react-icons/io5";
import keyScopeXLogo from "../assets/keyscopex-logo.png";

const AboutPage = () => {
    const features = [
        {
            icon: <IoShieldCheckmark className="text-4xl text-primary" />,
            title: "Multi-DRM Support",
            description: "Extract keys from Widevine, PlayReady, and ClearKey protected content",
        },
        {
            icon: <IoCode className="text-4xl text-accent" />,
            title: "Developer Friendly",
            description: "JSON export and easy-to-use API for integration with your tools",
        },
        {
            icon: <IoRocket className="text-4xl text-success" />,
            title: "Fast & Reliable",
            description: "Built with modern technologies for optimal performance",
        },
    ];

    return (
        <div className="flex min-h-full flex-col p-6">
            {/* About Header */}
            <div className="mb-8 text-center">
                <div className="mb-6 flex justify-center">
                    <img 
                        src={keyScopeXLogo} 
                        alt="KeyScopeX" 
                        className="w-48 h-auto"
                    />
                </div>
                <h2 className="mb-3 text-3xl font-bold text-primary">
                    KeyScopeX
                </h2>
                <p className="text-base-content/80 text-lg max-w-2xl mx-auto">
                    Advanced DRM key extraction and decryption tool
                </p>
                <div className="mt-4 flex justify-center gap-3">
                    <div className="badge badge-primary badge-lg">Version 1.0.1</div>
                    <div className="badge badge-success badge-lg flex items-center gap-1">
                        <FaKey className="w-3 h-3" /> DRM Extraction
                    </div>
                </div>
            </div>

            {/* Features Section */}
            <div className="mb-8">
                <h3 className="text-2xl font-bold mb-6 text-center text-primary">Features</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="card bg-base-200 border border-primary/20 shadow-lg"
                        >
                            <div className="card-body items-center text-center p-6">
                                <div className="mb-3">{feature.icon}</div>
                                <h4 className="card-title text-lg font-semibold">{feature.title}</h4>
                                <p className="text-base-content/70 text-sm">{feature.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* How It Works */}
            <div className="mb-8 card bg-base-200 border border-primary/30">
                <div class="card-body p-6">
                    <h3 className="card-title text-primary text-xl mb-4">How It Works</h3>
                    <ol className="space-y-3 text-base-content/80">
                        <li className="flex items-start">
                            <span className="badge badge-primary badge-sm mr-3 mt-1">1</span>
                            <span>Get your license key from KeyScopeX Panel</span>
                        </li>
                        <li className="flex items-start">
                            <span className="badge badge-primary badge-sm mr-3 mt-1">2</span>
                            <span>Enter license key in Settings tab</span>
                        </li>
                        <li className="flex items-start">
                            <span className="badge badge-primary badge-sm mr-3 mt-1">3</span>
                            <span>Navigate to DRM-protected content</span>
                        </li>
                        <li className="flex items-start">
                            <span className="badge badge-primary badge-sm mr-3 mt-1">4</span>
                            <span>Click Capture Current Tab and play the video</span>
                        </li>
                        <li className="flex items-start">
                            <span className="badge badge-primary badge-sm mr-3 mt-1">5</span>
                            <span>Keys automatically sync to your Panel dashboard</span>
                        </li>
                    </ol>
                </div>
            </div>

            {/* Panel Access */}
            <div className="card bg-base-200 border border-primary/30 mb-8">
                <div className="card-body p-6">
                    <h3 className="card-title text-primary text-xl mb-4">Panel Access</h3>
                    <p className="text-base-content/80 mb-4">
                        All captured keys are automatically saved to your KeyScopeX Panel dashboard.
                        View, search, and export all your collected keys anytime.
                    </p>
                    <a 
                        href="https://keyscopex.xproject.live/panel/" 
                        target="_blank"
                        className="btn btn-primary"
                    >
                        <FaGithub className="w-4 h-4" />
                        Open Panel Dashboard
                    </a>
                </div>
            </div>

            {/* Disclaimer */}
            <div className="alert bg-warning/10 border-warning/30">
                <IoShieldCheckmark className="h-5 w-5 text-warning" />
                <div className="text-sm">
                    <p className="font-semibold text-warning mb-1">Legal Notice</p>
                    <p className="text-base-content/70">
                        This tool is for educational and research purposes only. 
                        Users are responsible for compliance with applicable laws and regulations.
                    </p>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-base-content/60 text-sm">
                <p>
                    Developed by{" "}
                    <span className="text-primary font-semibold">X Project</span>
                </p>
                <p className="mt-2">KeyScopeX v1.0.1</p>
            </div>
        </div>
    );
};

export default AboutPage;
