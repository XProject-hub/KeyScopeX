import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import url from "url";
import syncVersion from "./syncVersion.js";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const frontendDir = path.join(__dirname, "frontend");
const distDir = path.join(frontendDir, "dist");
const srcDir = path.join(__dirname, "src");
const iconDir = path.join(__dirname, "icons");
const releaseDir = path.join(__dirname, "extension-release");

const run = (cmd, cwd) => {
    console.log(`🛠️ Running: ${cmd}`);
    execSync(cmd, { cwd, stdio: "inherit" });
};

const copyDir = async (src, dest) => {
    await fs.promises.mkdir(dest, { recursive: true });
    await fs.promises.cp(src, dest, {
        recursive: true,
        force: true,
        filter: (src) => !src.endsWith(".map"),
    });
};

const main = async () => {
    await syncVersion();

    console.log("🚀 Starting extension build...");

    // 1. Install frontend deps if needed
    if (!fs.existsSync(path.join(frontendDir, "node_modules"))) {
        console.log("📦 node_modules not found. Running npm install...");
        run("npm install", frontendDir);
    }

    // 2. Build frontend
    console.log("📦 Building frontend...");
    run("npm run build", frontendDir);

    // 3. Clean release folder
    if (fs.existsSync(releaseDir)) {
        console.log("🧹 Cleaning existing extension-release folder...");
        await fs.promises.rm(releaseDir, { recursive: true, force: true });
    }
    await fs.promises.mkdir(releaseDir);

    // 4. Copy src files (manifest, background, etc) to release
    console.log("📦 Copying src files to extension-release...");
    await copyDir(srcDir, releaseDir);

    // 5. Copy frontend dist files to release (merged at root)
    console.log("📦 Copying frontend dist files to extension-release...");
    await copyDir(distDir, releaseDir);

    // 6. Copy icon directory to release (merged at root)
    console.log("📦 Copying icon directory to extension-release...");
    await copyDir(iconDir, path.join(releaseDir, "icons"));

    console.log("✅ Build complete! extension-release ready.");
};

main().catch((e) => {
    console.error("❌ Build failed:", e);
    process.exit(1);
});
