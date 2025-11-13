import { IoIosInformationCircleOutline } from "react-icons/io";
import { IoHomeOutline, IoSettingsOutline } from "react-icons/io5";
import { NavLink, useLocation } from "react-router-dom";

const TabNavigation = ({ validConfig }) => {
    const location = useLocation();
    const activeTab =
        location.pathname === "/settings"
            ? "settings"
            : location.pathname === "/about"
              ? "about"
              : "main";

    return (
        <div className="mb-6 flex items-center justify-center">
            <div role="tablist" className="tabs tabs-box shadow-lg">
                <NavLink
                    role="tab"
                    to="/results"
                    className={`tab gap-2 ${!validConfig ? "cursor-not-allowed opacity-50" : activeTab === "main" ? "tab-active font-semibold" : ""}`}
                    onClick={(e) => {
                        if (!validConfig) {
                            e.preventDefault();
                        }
                    }}
                    title={!validConfig ? "Configure CDRM instance first" : "View DRM extraction results"}
                >
                    <IoHomeOutline className="h-5 w-5" />
                    <span>Main</span>
                </NavLink>
                <NavLink
                    role="tab"
                    to="/settings"
                    className={`tab gap-2 ${activeTab === "settings" ? "tab-active font-semibold" : ""}`}
                    title="Configure CDRM instance"
                >
                    <IoSettingsOutline className="h-5 w-5" />
                    <span>Settings</span>
                </NavLink>
                <NavLink
                    role="tab"
                    to="/about"
                    className={`tab gap-2 ${activeTab === "about" ? "tab-active font-semibold" : ""}`}
                    title="About KeyScopeX"
                >
                    <IoIosInformationCircleOutline className="h-5 w-5" />
                    <span>About</span>
                </NavLink>
            </div>
        </div>
    );
};

export default TabNavigation;
