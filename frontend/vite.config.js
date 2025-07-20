import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "fs";
import { defineConfig } from "vite";

const packageJson = JSON.parse(readFileSync("./package.json", "utf8"));

const replaceVersionPlugin = () => {
    return {
        name: "replace-version",
        transformIndexHtml(html) {
            return html.replace("%APPVERSION%", packageJson.version);
        },
    };
};

// https://vite.dev/config/
export default defineConfig({
    base: "./",
    plugins: [react(), tailwindcss(), replaceVersionPlugin()],
});
