import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const useDevHttps = process.env.VITE_DEV_HTTPS === "1";
const devCert = {
  key: resolve(rootDir, ".cert/dev-key.pem"),
  cert: resolve(rootDir, ".cert/dev-cert.pem"),
};

function getDevHttpsOptions() {
  if (!useDevHttps) return undefined;

  if (!existsSync(devCert.key) || !existsSync(devCert.cert)) {
    throw new Error(
      "Dev HTTPS certificate not found. Run npm run dev:https to generate it.",
    );
  }

  return {
    key: readFileSync(devCert.key),
    cert: readFileSync(devCert.cert),
  };
}

const devHttpsOptions = getDevHttpsOptions();

function getAppVersion() {
  try {
    try {
      execSync("git fetch --tags --force", {
        cwd: rootDir,
        stdio: "ignore",
      });
    } catch {
      // Local/offline builds can still use whatever refs are already available.
    }

    return execSync("git describe --tags --always --dirty", {
      cwd: rootDir,
      encoding: "utf8",
    }).trim();
  } catch {
    return "unknown";
  }
}

export default defineConfig({
  base: "./",
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(getAppVersion()),
  },
  plugins: [viteSingleFile()],
  server: {
    host: useDevHttps ? "0.0.0.0" : "localhost",
    port: 5187,
    strictPort: true,
    https: devHttpsOptions,
    headers: {
      "Cache-Control": "no-store",
    },
  },
  preview: {
    host: useDevHttps ? "0.0.0.0" : "localhost",
    port: 5188,
    strictPort: true,
    https: devHttpsOptions,
  },
  build: {
    assetsInlineLimit: 100_000_000,
  },
});
