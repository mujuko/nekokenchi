import { spawnSync } from "node:child_process";

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: "utf8",
    stdio: options.stdio ?? "pipe",
    shell: process.platform === "win32",
  });
}

run("git", ["fetch", "--tags", "--force"], { stdio: "inherit" });

const tag = run("git", ["describe", "--tags", "--exact-match", "HEAD"]);

if (tag.status !== 0) {
  console.log("skip deploy: HEAD is not tagged");
  process.exit(0);
}

console.log(`deploy tagged version: ${tag.stdout.trim()}`);

if (process.env.DEPLOY_DRY_RUN === "1") {
  console.log("dry run: skipping wrangler upload");
  process.exit(0);
}

const upload = run("npx", ["wrangler", "versions", "upload"], {
  stdio: "inherit",
});

process.exit(upload.status ?? 1);
