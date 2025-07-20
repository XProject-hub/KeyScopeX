import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const updateVersionWithRegex = async (filePath, newVersion) => {
    try {
        const content = await fs.readFile(filePath, "utf-8");

        // Regex to match "version": "any.version.number"
        const versionRegex = /("version"\s*:\s*")([^"]+)(")/;

        if (!versionRegex.test(content)) {
            console.warn(`⚠️ No version field found in ${filePath}`);
            return false;
        }

        const updatedContent = content.replace(versionRegex, `$1${newVersion}$3`);

        if (content !== updatedContent) {
            await fs.writeFile(filePath, updatedContent);
            return true;
        }

        return false;
    } catch (err) {
        console.error(`❌ Failed to update ${filePath}: ${err.message}`);
        return false;
    }
};

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

    // Update frontend/package.json using regex
    const frontendUpdated = await updateVersionWithRegex(frontendPkgPath, version);
    if (frontendUpdated) {
        console.log(`🔄 Updated frontend/package.json version to ${version}`);
    } else {
        console.log("ℹ️ frontend/package.json not found or no changes needed.");
    }

    // Update src/manifest.json using regex
    const manifestUpdated = await updateVersionWithRegex(manifestPath, version);
    if (manifestUpdated) {
        console.log(`🔄 Updated src/manifest.json version to ${version}`);
    } else {
        console.log("ℹ️ src/manifest.json not found or no changes needed.");
    }
};

export default syncVersion;
