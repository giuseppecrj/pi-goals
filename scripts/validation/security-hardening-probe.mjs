import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const repo = new URL("../..", import.meta.url).pathname;
const buildDir = mkdtempSync(join(tmpdir(), "pi-goals-security-build-"));
const sourceFiles = readdirSync(join(repo, ".pi", "extensions", "goal"))
  .filter((name) => name.endsWith(".ts"))
  .map((name) => join(".pi", "extensions", "goal", name));

try {
  execFileSync(
    "npx",
    [
      "--no-install",
      "tsc",
      "--target", "ES2022",
      "--module", "commonjs",
      "--moduleResolution", "node",
      "--ignoreDeprecations", "6.0",
      "--types", "node",
      "--strict",
      "--skipLibCheck",
      "--outDir", buildDir,
      ...sourceFiles,
    ],
    { cwd: repo, stdio: "inherit" },
  );

  const require = createRequire(import.meta.url);
  const templates = require(join(buildDir, "templates.js"));
  const templateLibrary = require(join(buildDir, "template-library.js"));
  const monitorReport = require(join(buildDir, "monitor-report.js"));

  testTemplateCommandsDefaultOff(templates);
  testTemplateCommandsPerInvocationFlag(templates);
  testTemplateCommandsAllowlistBlocksShellInjection(templates);
  testTemplateCommandsAllowlistBlocksGitAliasExecution(templates);
  testTemplateCommandsAllowlistBlocksRipgrepPreprocessor(templates);
  testSafeInterpolationHelpers(templates);
  testBundledTemplateImportCopiesHelpersWithoutExecutingCommands(templateLibrary);
  testBundledTemplateImportPreflightsConflictsAndMissingHelpers(templateLibrary);
  testBundledTemplateImportRejectsUnsafeResolution(templateLibrary);
  testMonitorReportRedactsSecretLikeContent(monitorReport);

  console.log("security-hardening probe passed");
} finally {
  rmSync(buildDir, { recursive: true, force: true });
}

function testTemplateCommandsDefaultOff({ resolveGoalTemplateByName }) {
  const root = mkdtempSync(join(tmpdir(), "pi-goals-default-off-"));
  const dir = join(root, ".pi-goals");
  mkdirSync(dir, { recursive: true });
  const marker = join(root, "pwned.txt");
  writeFileSync(join(dir, "danger.md"), `---\nallow_commands: true\n---\n!\`printf pwned > ${shellQuote(marker)}\``);

  delete process.env.PI_GOALS_TEMPLATE_COMMANDS;
  const result = resolveGoalTemplateByName("danger", {}, "", root);

  assert.equal(result.ok, false, "template command execution should be disabled by default");
  assert.equal(existsSync(marker), false, "disabled template command must not execute");
}

function testTemplateCommandsPerInvocationFlag({ resolveGoalTemplateInvocation, resolveGoalTemplateByName }) {
  const root = mkdtempSync(join(tmpdir(), "pi-goals-per-invocation-"));
  const dir = join(root, ".pi-goals");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "shell.md"), `---\nallow_commands: true\n---\nResult: !\`printf command-output\`\nArgs: {{args}}\n`);
  writeFileSync(join(dir, "git.md"), `---\nallow_commands: true\n---\n!\`git --version\``);

  delete process.env.PI_GOALS_TEMPLATE_COMMANDS;
  const shell = resolveGoalTemplateInvocation("shell --template-commands=on -- trailing args", root);

  assert.equal(shell.ok, true, "per-invocation on flag should enable shell template commands");
  assert.match(shell.template.objective, /Result: command-output/);
  assert.match(shell.template.objective, /Args: trailing args/);
  assert.equal(shell.template.commandPolicy, "on");
  assert.equal(shell.template.flags["template-commands"], undefined, "template command policy flag must not be passed as a template value");

  const shorthand = resolveGoalTemplateInvocation("shell --allow-template-commands -- trailing args", root);
  assert.equal(shorthand.ok, true, "--allow-template-commands should enable shell template commands");
  assert.equal(shorthand.template.commandPolicy, "on");

  const allowlisted = resolveGoalTemplateByName("git", { "template-commands": "allowlist" }, "", root);
  assert.equal(allowlisted.ok, true, "tool flags should also accept template command policy");
  assert.match(allowlisted.template.objective, /git version/);
  assert.equal(allowlisted.template.commandPolicy, "allowlist");

  const invalid = resolveGoalTemplateInvocation("shell --template-commands=sudo", root);
  assert.equal(invalid.ok, false, "invalid per-invocation policy should fail clearly");
  assert.match(invalid.error, /Invalid value/);
}

function testTemplateCommandsAllowlistBlocksShellInjection({ resolveGoalTemplateByName }) {
  const root = mkdtempSync(join(tmpdir(), "pi-goals-allowlist-"));
  const dir = join(root, ".pi-goals");
  mkdirSync(dir, { recursive: true });
  const marker = join(root, "pwned.txt");
  writeFileSync(join(dir, "danger.md"), `---\nallow_commands: true\n---\n!\`git status; printf pwned > ${shellQuote(marker)}\``);

  process.env.PI_GOALS_TEMPLATE_COMMANDS = "allowlist";
  const result = resolveGoalTemplateByName("danger", {}, "", root);

  assert.equal(result.ok, false, "allowlist mode should reject shell metacharacter command chains");
  assert.equal(existsSync(marker), false, "rejected allowlist command must not execute");
  delete process.env.PI_GOALS_TEMPLATE_COMMANDS;
}

function testTemplateCommandsAllowlistBlocksGitAliasExecution({ resolveGoalTemplateByName }) {
  const root = mkdtempSync(join(tmpdir(), "pi-goals-git-alias-"));
  const dir = join(root, ".pi-goals");
  mkdirSync(dir, { recursive: true });
  const marker = join(root, "pwned.txt");
  writeFileSync(join(dir, "danger.md"), `---\nallow_commands: true\n---\n!\`git -c alias.pwn=!touch ${shellQuote(marker)} pwn\``);

  process.env.PI_GOALS_TEMPLATE_COMMANDS = "allowlist";
  const result = resolveGoalTemplateByName("danger", {}, "", root);

  assert.equal(result.ok, false, "allowlist mode should reject git alias shell execution");
  assert.equal(existsSync(marker), false, "rejected git alias command must not execute");
  delete process.env.PI_GOALS_TEMPLATE_COMMANDS;
}

function testTemplateCommandsAllowlistBlocksRipgrepPreprocessor({ resolveGoalTemplateByName }) {
  const root = mkdtempSync(join(tmpdir(), "pi-goals-rg-pre-"));
  const dir = join(root, ".pi-goals");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "danger.md"), `---\nallow_commands: true\n---\n!\`rg --pre touch needle .\``);

  process.env.PI_GOALS_TEMPLATE_COMMANDS = "allowlist";
  const result = resolveGoalTemplateByName("danger", {}, "", root);

  assert.equal(result.ok, false, "allowlist mode should reject ripgrep preprocessor execution surface");
  delete process.env.PI_GOALS_TEMPLATE_COMMANDS;
}

function testSafeInterpolationHelpers({ resolveGoalTemplateByName }) {
  const root = mkdtempSync(join(tmpdir(), "pi-goals-interpolation-"));
  const dir = join(root, ".pi-goals");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "quote.md"), `Quoted: {{shell_quote args}}\nJSON: {{json args}}\nHere: {{heredoc args}}`);

  const result = resolveGoalTemplateByName("quote", {}, "hello ' world", root);

  assert.equal(result.ok, true);
  assert.match(result.template.objective, /Quoted: 'hello '\\'' world'/);
  assert.match(result.template.objective, /JSON: "hello ' world"/);
  assert.match(result.template.objective, /Here: hello ' world/);
}

function testBundledTemplateImportCopiesHelpersWithoutExecutingCommands({ listBundledGoalTemplateMetadata, copyBundledGoalTemplate }) {
  const packageRoot = mkdtempSync(join(tmpdir(), "pi-goals-library-package-"));
  const projectRoot = mkdtempSync(join(tmpdir(), "pi-goals-library-project-"));
  const examplesDir = join(packageRoot, "examples", "pi-goals");
  const scriptsDir = join(examplesDir, "scripts");
  mkdirSync(scriptsDir, { recursive: true });
  const marker = join(projectRoot, "pwned.txt");
  writeFileSync(join(scriptsDir, "helper.py"), "print('helper')\n");
  writeFileSync(join(examplesDir, "importable.md"), `---\ndescription: Importable example\naliases: import-alias\nusage: /goal importable --thing <thing>\nallow_commands: true\n---\nUses .pi-goals/scripts/helper.py\n!\`printf pwned > ${shellQuote(marker)}\`\nImport {{thing}}.\n`);

  const before = listBundledGoalTemplateMetadata(projectRoot, packageRoot);
  assert.equal(before.length, 1);
  assert.equal(before[0].name, "importable");
  assert.deepEqual(before[0].aliases, ["import-alias"]);
  assert.equal(before[0].installed, false);

  const result = copyBundledGoalTemplate("import-alias", {}, projectRoot, packageRoot);

  assert.equal(result.ok, true);
  assert.equal(result.template.name, "importable");
  assert.equal(result.nextInvocation, "/goal importable --thing <thing>");
  assert.equal(existsSync(join(projectRoot, ".pi-goals", "importable.md")), true);
  assert.equal(existsSync(join(projectRoot, ".pi-goals", "scripts", "helper.py")), true);
  assert.equal(existsSync(marker), false, "copying a bundled template must not execute inline commands");
  const after = listBundledGoalTemplateMetadata(projectRoot, packageRoot);
  assert.equal(after[0].installed, true);
}

function testBundledTemplateImportPreflightsConflictsAndMissingHelpers({ copyBundledGoalTemplate }) {
  const packageRoot = mkdtempSync(join(tmpdir(), "pi-goals-library-conflict-package-"));
  const projectRoot = mkdtempSync(join(tmpdir(), "pi-goals-library-conflict-project-"));
  const examplesDir = join(packageRoot, "examples", "pi-goals");
  const scriptsDir = join(examplesDir, "scripts");
  mkdirSync(scriptsDir, { recursive: true });
  mkdirSync(join(projectRoot, ".pi-goals", "scripts"), { recursive: true });
  writeFileSync(join(scriptsDir, "helper.py"), "print('bundled')\n");
  writeFileSync(join(examplesDir, "with-helper.md"), "Uses .pi-goals/scripts/helper.py\n");
  writeFileSync(join(projectRoot, ".pi-goals", "scripts", "helper.py"), "print('local')\n");

  const conflict = copyBundledGoalTemplate("with-helper", {}, projectRoot, packageRoot);

  assert.equal(conflict.ok, false);
  assert.match(conflict.error, /Refusing to overwrite/);
  assert.equal(existsSync(join(projectRoot, ".pi-goals", "with-helper.md")), false, "conflict preflight must not copy the template first");
  assert.equal(readFileSync(join(projectRoot, ".pi-goals", "scripts", "helper.py"), "utf8"), "print('local')\n");

  const forced = copyBundledGoalTemplate("with-helper", { force: true }, projectRoot, packageRoot);

  assert.equal(forced.ok, true);
  assert.equal(readFileSync(join(projectRoot, ".pi-goals", "scripts", "helper.py"), "utf8"), "print('bundled')\n");

  const missingRoot = mkdtempSync(join(tmpdir(), "pi-goals-library-missing-package-"));
  const missingProject = mkdtempSync(join(tmpdir(), "pi-goals-library-missing-project-"));
  const missingExamples = join(missingRoot, "examples", "pi-goals");
  mkdirSync(missingExamples, { recursive: true });
  writeFileSync(join(missingExamples, "missing-helper.md"), "Uses .pi-goals/scripts/missing.py\n");

  const missing = copyBundledGoalTemplate("missing-helper", {}, missingProject, missingRoot);

  assert.equal(missing.ok, false);
  assert.match(missing.error, /missing bundled helper script/);
  assert.equal(existsSync(join(missingProject, ".pi-goals", "missing-helper.md")), false);
}

function testBundledTemplateImportRejectsUnsafeResolution({ copyBundledGoalTemplate }) {
  const packageRoot = mkdtempSync(join(tmpdir(), "pi-goals-library-unsafe-package-"));
  const projectRoot = mkdtempSync(join(tmpdir(), "pi-goals-library-unsafe-project-"));
  const examplesDir = join(packageRoot, "examples", "pi-goals");
  mkdirSync(examplesDir, { recursive: true });
  writeFileSync(join(examplesDir, "first.md"), "---\naliases: dup\n---\nFirst\n");
  writeFileSync(join(examplesDir, "second.md"), "---\naliases: dup\n---\nSecond\n");
  writeFileSync(join(examplesDir, "unsafe.md"), "Uses .pi-goals/scripts/../escape.py\n");

  const unknown = copyBundledGoalTemplate("missing", {}, projectRoot, packageRoot);
  assert.equal(unknown.ok, false);
  assert.match(unknown.error, /Unknown bundled goal template/);

  const ambiguous = copyBundledGoalTemplate("dup", {}, projectRoot, packageRoot);
  assert.equal(ambiguous.ok, false);
  assert.match(ambiguous.error, /Ambiguous bundled goal template/);

  const unsafe = copyBundledGoalTemplate("unsafe", {}, projectRoot, packageRoot);
  assert.equal(unsafe.ok, false);
  assert.match(unsafe.error, /invalid helper script reference/);
  assert.equal(existsSync(join(projectRoot, ".pi-goals", "unsafe.md")), false);
}

function testMonitorReportRedactsSecretLikeContent({ buildGoalMonitorReport }) {
  const secret = "sk-test-1234567890abcdef";
  const ctx = {
    cwd: "/tmp/example",
    sessionManager: {
      getSessionId: () => "session-1",
      getBranch: () => [
        {
          type: "message",
          message: {
            role: "user",
            content: `my OPENAI_API_KEY=${secret} should not be sent to monitor`,
          },
        },
      ],
    },
  };
  const goal = {
    goalId: "goal-1",
    objective: "test",
    status: "active",
    tokensUsed: 0,
    timeUsedSeconds: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const report = buildGoalMonitorReport(ctx, goal, null, Date.now());
  const serialized = JSON.stringify(report);

  assert.equal(serialized.includes(secret), false, "monitor report must redact secret-like content");
  assert.match(serialized, /\[REDACTED/, "monitor report should include redaction marker");
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}
