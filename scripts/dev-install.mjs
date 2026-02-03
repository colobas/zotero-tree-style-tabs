import { spawn } from "child_process";
import { access } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { config as dotenv } from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

dotenv({ path: join(rootDir, ".env") });

const { config } = await import("../package.json", {
  assert: { type: "json" },
});

const ZOTERO_BIN = process.env.ZOTERO_BIN || "/Applications/Zotero.app/Contents/MacOS/zotero";
const ZOTERO_PROFILE = process.env.ZOTERO_PROFILE;

async function runBuild() {
  return new Promise((resolve, reject) => {
    const proc = spawn("node", [join(__dirname, "build.mjs"), "development"], {
      cwd: rootDir,
      stdio: "inherit",
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Build failed with code ${code}`));
      }
    });
  });
}

async function run() {
  console.log("Building development package...");
  await runBuild();

  const xpiName = `${config.addonRef}-dev.xpi`;
  const xpiPath = join(rootDir, xpiName);

  try {
    await access(xpiPath);
  } catch (e) {
    console.error("Dev XPI missing. Make sure the build succeeded.");
    process.exit(1);
  }

  const installArgs = ["-install-addon", xpiPath];
  if (ZOTERO_PROFILE) {
    installArgs.push("-P", ZOTERO_PROFILE);
  }

  console.log(`Installing ${xpiName} into Zotero...`);
  const installer = spawn(ZOTERO_BIN, installArgs, { stdio: "inherit" });

  installer.on("close", (code) => {
    if (code === 0) {
      console.log("Installation complete. Zotero will restart with the addon loaded.");
    } else {
      console.error(`Installation failed (code ${code}).`);
      process.exit(code ?? 1);
    }
  });
}

await run();
