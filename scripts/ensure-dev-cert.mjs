import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const certDir = resolve(".cert");
const certPath = resolve(certDir, "dev-cert.pem");
const keyPath = resolve(certDir, "dev-key.pem");
const hostsPath = resolve(certDir, "dev-hosts.json");

const hosts = [
  "localhost",
  "127.0.0.1",
  "::1",
  ...Object.values(networkInterfaces())
    .flatMap((items) => items ?? [])
    .filter((item) => !item.internal && item.family === "IPv4")
    .map((item) => item.address),
];
const uniqueHosts = [...new Set(hosts)];

if (hasCurrentCertificate(uniqueHosts)) {
  process.exit(0);
}

if (!commandExists("mkcert")) {
  console.error(
    [
      "mkcert is required to create a browser-trusted local HTTPS certificate.",
      "",
      "Install it, then run npm run dev:https again:",
      "  brew install mkcert",
      "  mkcert -install",
      "",
      "The script will create .cert/dev-cert.pem for:",
      `  ${uniqueHosts.join(", ")}`,
    ].join("\n"),
  );
  process.exit(1);
}

mkdirSync(certDir, { recursive: true });

run("mkcert", ["-install"]);
run("mkcert", [
  "-key-file",
  keyPath,
  "-cert-file",
  certPath,
  ...uniqueHosts,
]);

writeFileSync(hostsPath, `${JSON.stringify(uniqueHosts, null, 2)}\n`);

function hasCurrentCertificate(nextHosts) {
  if (!existsSync(certPath) || !existsSync(keyPath) || !existsSync(hostsPath)) {
    return false;
  }

  try {
    const currentHosts = JSON.parse(readFileSync(hostsPath, "utf8"));
    return JSON.stringify(currentHosts) === JSON.stringify(nextHosts);
  } catch {
    return false;
  }
}

function commandExists(command) {
  return spawnSync("which", [command], { stdio: "ignore" }).status === 0;
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
