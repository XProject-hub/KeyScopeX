import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const syncVersion = async () => {
    const rootPkgPath = path.join(__dirname, "package.json");
    const frontendPkgPath = path.join(__dirname, "frontend", "package.json");
    const manifestPath = path.join(__dirname, "src", "manifest.json");

    // Read root package.json version
    const rootPkgRaw = await fs.readFile(rootPkgPath, "utf-8");
    const rootPkg = JSON.parse(rootPkgRaw);
    const version = rootPkg.version;

    if (!version) {
        console.warn("⚠️ No version field found in root package.json, skipping sync.");
        return;
    }

    // Update frontend/package.json if exists
    try {
        const frontendPkgRaw = await fs.readFile(frontendPkgPath, "utf-8");
        const frontendPkg = JSON.parse(frontendPkgRaw);
        frontendPkg.version = version;
        await fs.writeFile(frontendPkgPath, JSON.stringify(frontendPkg, null, 2));
        console.log(`🔄 Updated frontend/package.json version to ${version}`);
    } catch {
        console.log("ℹ️ frontend/package.json not found or unreadable, skipping version update.");
    }

    // Update src/manifest.json version
    try {
        const manifestRaw = await fs.readFile(manifestPath, "utf-8");
        const manifest = JSON.parse(manifestRaw);
        manifest.version = version;
        await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
        console.log(`🔄 Updated src/manifest.json version to ${version}`);
    } catch (err) {
        console.error(`❌ Failed to update src/manifest.json version: ${err.message}`);
    }
};

export default syncVersion;
