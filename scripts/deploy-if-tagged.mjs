import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const passthroughArgs = process.argv.slice(2);
const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
const expectedTag = `v${packageJson.version}`;

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: "utf8",
    stdio: options.stdio ?? "pipe",
    shell: process.platform === "win32",
  });
}

run("git", ["fetch", "--tags", "--force"], { stdio: "inherit" });

const tags = run("git", ["tag", "--points-at", "HEAD"]);
const matchingTags = tags.stdout
  .split("\n")
  .map((tag) => tag.trim())
  .filter(Boolean);

if (!matchingTags.includes(expectedTag)) {
  if (matchingTags.length === 0) {
    console.log("skip deploy: HEAD is not tagged");
    process.exit(0);
  }

  console.error(
    `refuse deploy: package.json version ${packageJson.version} requires tag ${expectedTag}, but HEAD has ${matchingTags.join(", ")}`,
  );
  process.exit(1);
}

console.log(`deploy tagged version: ${expectedTag}`);

if (process.env.DEPLOY_DRY_RUN === "1") {
  console.log("dry run: skipping wrangler upload");
  process.exit(0);
}

const upload = run("npx", ["wrangler", "versions", "upload", ...passthroughArgs], {
  stdio: "inherit",
});

process.exit(upload.status ?? 1);
