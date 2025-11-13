import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import url from "url";
import syncVersion from "./syncVersion.js";

// Try to import terser, but make it optional
let minify = null;
try {
    const terser = await import("terser");
    minify = terser.minify;
    console.log("✓ Terser available for minification");
} catch (e) {
    console.log("⚠️  Terser not available, skipping minification");
}

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const frontendDir = path.join(__dirname, "frontend");
const distDir = path.join(frontendDir, "dist");
const srcDir = path.join(__dirname, "src");
const iconDir = path.join(__dirname, "icons");
const releaseDir = path.join(__dirname, "extension-release");

const run = (cmd, cwd) => {
    console.log(`🛠️  Running: ${cmd}`);
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

const minifyJS = async (jsContent) => {
    if (!minify) {
        return jsContent; // Return original if terser not available
    }
    
    try {
        const result = await minify(jsContent, {
            compress: {
                drop_console: false, // Keep console logs for debugging
                drop_debugger: true,
                pure_funcs: ["console.debug"],
            },
            mangle: {
                reserved: ["chrome"], // Don't mangle chrome API
            },
        });
        return result.code;
    } catch (error) {
        console.warn("⚠️  Minification failed, using original:", error.message);
        return jsContent;
    }
};

// Copy and minify JavaScript files from src directory
const copyAndMinifySrcFiles = async (src, dest) => {
    await fs.promises.mkdir(dest, { recursive: true });

    const entries = await fs.promises.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            await copyAndMinifySrcFiles(srcPath, destPath);
        } else if (entry.name.endsWith(".js") && minify) {
            // Minify JavaScript files only if terser is available
            console.log(`🗜️  Minifying ${entry.name}...`);
            const content = await fs.promises.readFile(srcPath, "utf8");
            const originalSize = Buffer.byteLength(content, "utf8");
            const minified = await minifyJS(content, entry.name);
            const minifiedSize = Buffer.byteLength(minified, "utf8");
            const savings = (((originalSize - minifiedSize) / originalSize) * 100).toFixed(1);
            console.log(
                `   📊 ${entry.name}: ${originalSize} → ${minifiedSize} bytes (${savings}% smaller)`
            );
            await fs.promises.writeFile(destPath, minified, "utf8");
        } else {
            // Copy other files as-is
            await fs.promises.copyFile(srcPath, destPath);
        }
    }
};

const main = async () => {
    await syncVersion();

    console.log("🚀 Starting KeyScopeX extension build...");

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

    // 4. Copy and minify src files
    console.log("📦 Copying extension core files...");
    await copyAndMinifySrcFiles(srcDir, releaseDir);

    // 5. Copy frontend dist files to release (merged at root)
    console.log("📦 Copying frontend dist files to extension-release...");
    await copyDir(distDir, releaseDir);

    // 6. Copy icon directory to release (merged at root)
    console.log("📦 Copying icons to extension-release...");
    await copyDir(iconDir, path.join(releaseDir, "icons"));

    console.log("✅ Build complete! KeyScopeX extension-release ready.");
    console.log(`📁 Location: ${releaseDir}`);
};

main().catch((e) => {
    console.error("❌ Build failed:", e);
    process.exit(1);
});
