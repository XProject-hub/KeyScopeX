import { FaDiscord, FaTelegram } from "react-icons/fa";
import { SiGitea } from "react-icons/si";

const AboutPage = () => {
    const socialLinks = [
        {
            name: "Discord",
            icon: <FaDiscord className="text-4xl" />,
            url: "https://discord.cdrm-project.com/",
            description: "Join our Discord community",
            color: "hover:text-indigo-400",
        },
        {
            name: "Telegram",
            icon: <FaTelegram className="text-4xl" />,
            url: "https://telegram.cdrm-project.com/",
            description: "Follow us on Telegram",
            color: "hover:text-sky-400",
        },
        {
            name: "Gitea",
            icon: <SiGitea className="text-4xl" />,
            url: "https://cdm-project.com/tpd94/cdrm-project",
            description: "Check out our code",
            color: "hover:text-lime-400",
        },
    ];

    return (
        <div className="flex min-h-full flex-col items-center justify-center p-6">
            <div className="mb-8 text-center">
                <h2 className="mb-2 text-3xl font-bold">Connect with us</h2>
                <p className="text-base-content/70 text-lg">Join our community and stay updated</p>
            </div>

            <div className="grid w-full max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
                {socialLinks.map((link) => (
                    <a
                        key={link.name}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`card bg-base-200 shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl ${link.color}`}
                    >
                        <div className="card-body items-center text-center">
                            <div className="mb-2">{link.icon}</div>
                            <h3 className="card-title text-xl font-semibold">{link.name}</h3>
                            <p className="text-base-content/70">{link.description}</p>
                        </div>
                    </a>
                ))}
            </div>
        </div>
    );
};

export default AboutPage;
