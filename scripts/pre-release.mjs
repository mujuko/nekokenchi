import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const bump = args.find((arg) => !arg.startsWith("--")) ?? "patch";
const dryRun = args.includes("--dry-run");
const allowedBumps = new Set(["patch", "minor", "major"]);

function usage() {
  console.log(`Usage: npm run pre-release -- [patch|minor|major] [--dry-run]

Creates a release branch from origin/main, bumps package.json/package-lock.json,
commits the version update, and pushes the branch.

Examples:
  npm run pre-release
  npm run pre-release -- minor
  npm run pre-release -- major --dry-run`);
}

if (args.includes("--help") || args.includes("-h")) {
  usage();
  process.exit(0);
}

if (!allowedBumps.has(bump)) {
  console.error(`Unsupported version bump: ${bump}`);
  usage();
  process.exit(1);
}

function run(command, args, options = {}) {
  if (dryRun && options.mutate) {
    console.log(`[dry-run] ${command} ${args.join(" ")}`);
    return { status: 0, stdout: "", stderr: "" };
  }

  const executable = process.platform === "win32" && command === "npm" ? "npm.cmd" : command;
  const result = spawnSync(executable, args, {
    encoding: "utf8",
    stdio: options.stdio ?? "pipe",
    shell: false,
  });

  if (result.status !== 0 && options.check !== false) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }

  return result;
}

function readPackageVersion() {
  return JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
}

function incrementVersion(version, bump) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);

  if (!match) {
    console.error(`Cannot dry-run non-standard semver version: ${version}`);
    process.exit(1);
  }

  let [, major, minor, patch] = match.map(Number);

  if (bump === "major") {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (bump === "minor") {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }

  return `${major}.${minor}.${patch}`;
}

const status = run("git", ["status", "--porcelain"]);

if (status.stdout.trim()) {
  console.error("Working tree is not clean. Commit or stash your changes before preparing a release.");
  process.exit(1);
}

const currentVersion = readPackageVersion();
const nextVersion = dryRun ? incrementVersion(currentVersion, bump) : null;
const plannedBranch = `release/v${nextVersion ?? `<${bump}>`}`;

if (dryRun) {
  console.log(`Current version: ${currentVersion}`);
  console.log(`Next version: ${nextVersion}`);
  console.log(`Release branch: ${plannedBranch}`);
}

run("git", ["fetch", "origin", "main"], { stdio: "inherit", mutate: true });
run("git", ["switch", "--detach", "origin/main"], { stdio: "inherit", mutate: true });
run("npm", ["version", bump, "--no-git-tag-version"], { stdio: "inherit", mutate: true });

const version = dryRun ? nextVersion : readPackageVersion();
const branch = `release/v${version}`;
const message = `chore: release v${version}`;

run("git", ["switch", "-c", branch], { stdio: "inherit", mutate: true });
run("git", ["add", "package.json", "package-lock.json"], { stdio: "inherit", mutate: true });
run("git", ["commit", "-m", message], { stdio: "inherit", mutate: true });
run("git", ["push", "origin", branch], { stdio: "inherit", mutate: true });

console.log(`Prepared ${branch} with commit message: ${message}`);
