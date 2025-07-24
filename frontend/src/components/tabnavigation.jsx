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
        <div className="mb-4 flex items-center justify-center">
            <div role="tablist" className="tabs tabs-box">
                <NavLink
                    role="tab"
                    to="/results"
                    className={`tab ${!validConfig ? "cursor-not-allowed" : activeTab === "main" ? "tab-active font-semibold" : ""}`}
                    onClick={(e) => {
                        if (!validConfig) {
                            e.preventDefault();
                        }
                    }}
                >
                    <IoHomeOutline className="mr-1 h-5 w-5" />
                    Main
                </NavLink>
                <NavLink
                    role="tab"
                    to="/settings"
                    className={`tab ${activeTab === "settings" ? "tab-active font-semibold" : ""}`}
                >
                    <IoSettingsOutline className="mr-1 h-5 w-5" />
                    Settings
                </NavLink>
                <NavLink
                    role="tab"
                    to="/about"
                    className={`tab ${activeTab === "about" ? "tab-active font-semibold" : ""}`}
                >
                    <IoIosInformationCircleOutline className="mr-1 h-5 w-5" />
                    About
                </NavLink>
            </div>
        </div>
    );
};

export default TabNavigation;
