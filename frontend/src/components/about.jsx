import { FaGithub, FaDiscord, FaKey } from "react-icons/fa";
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

    const socialLinks = [
        {
            name: "GitHub",
            icon: <FaGithub className="text-4xl" />,
            url: "https://github.com/linewatchx",
            description: "Check out our repositories",
            color: "hover:text-white",
        },
        {
            name: "Discord",
            icon: <FaDiscord className="text-4xl" />,
            url: "https://discord.gg/linewatchx",
            description: "Join our community",
            color: "hover:text-indigo-400",
        },
    ];

    return (
        <div className="flex min-h-full flex-col p-6">
            {/* About Header */}
            <div className="mb-8 text-center">
                <div className="mb-6 flex justify-center">
                    <img 
                        src={keyScopeXLogo} 
                        alt="KeyScopeX Logo" 
                        className="w-48 h-auto filter drop-shadow-lg"
                    />
                </div>
                <h2 className="mb-3 text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    KeyScopeX
                </h2>
                <p className="text-base-content/80 text-lg max-w-2xl mx-auto">
                    Advanced DRM key extraction and decryption tool powered by LineWatchX Project
                </p>
                <div className="mt-4 flex justify-center gap-3">
                    <div className="badge badge-primary badge-lg">Version 1.0.0</div>
                    <div className="badge badge-success badge-lg">
                        <FaKey className="mr-1" /> DRM Extraction
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
                            className="card bg-base-200 border border-primary/20 shadow-lg hover:shadow-xl transition-all"
                        >
                            <div className="card-body items-center text-center">
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
                <div className="card-body">
                    <h3 className="card-title text-primary text-xl mb-4">How It Works</h3>
                    <ol className="space-y-3 text-base-content/80">
                        <li className="flex items-start">
                            <span className="badge badge-primary badge-sm mr-3 mt-1">1</span>
                            <span>Configure your CDRM instance in the Settings tab</span>
                        </li>
                        <li className="flex items-start">
                            <span className="badge badge-primary badge-sm mr-3 mt-1">2</span>
                            <span>Navigate to a page with DRM-protected content</span>
                        </li>
                        <li className="flex items-start">
                            <span className="badge badge-primary badge-sm mr-3 mt-1">3</span>
                            <span>Click "Capture Current Tab" to begin monitoring</span>
                        </li>
                        <li className="flex items-start">
                            <span className="badge badge-primary badge-sm mr-3 mt-1">4</span>
                            <span>Play the video and KeyScopeX will automatically extract the keys</span>
                        </li>
                        <li className="flex items-start">
                            <span className="badge badge-primary badge-sm mr-3 mt-1">5</span>
                            <span>Copy keys or export as JSON for use with decryption tools</span>
                        </li>
                    </ol>
                </div>
            </div>

            {/* Community Section */}
            <div className="mb-8">
                <h3 className="text-2xl font-bold mb-6 text-center text-primary">Connect With Us</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                    {socialLinks.map((link) => (
                        <a
                            key={link.name}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`card bg-base-200 border border-primary/20 shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl ${link.color}`}
                        >
                            <div className="card-body items-center text-center">
                                <div className="mb-2">{link.icon}</div>
                                <h4 className="card-title text-xl font-semibold">{link.name}</h4>
                                <p className="text-base-content/70">{link.description}</p>
                            </div>
                        </a>
                    ))}
                </div>
            </div>

            {/* Disclaimer */}
            <div className="alert bg-warning/10 border-warning/30">
                <IoShieldCheckmark className="h-5 w-5 text-warning" />
                <div className="text-sm">
                    <p className="font-semibold text-warning mb-1">Legal Notice</p>
                    <p className="text-base-content/70">
                        This tool is intended for educational and research purposes only. 
                        Users are responsible for ensuring their use complies with applicable laws and regulations. 
                        Always respect content creators' rights and licensing agreements.
                    </p>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-base-content/60 text-sm">
                <p>
                    Made with 🧡 by{" "}
                    <span className="text-primary font-semibold">LineWatchX Project</span>
                </p>
                <p className="mt-2">© 2024 KeyScopeX. All rights reserved.</p>
            </div>
        </div>
    );
};

export default AboutPage;
