import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync, readdirSync } from "node:fs";
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
  const monitorReport = require(join(buildDir, "monitor-report.js"));

  testTemplateCommandsDefaultOff(templates);
  testTemplateCommandsAllowlistBlocksShellInjection(templates);
  testTemplateCommandsAllowlistBlocksGitAliasExecution(templates);
  testTemplateCommandsAllowlistBlocksRipgrepPreprocessor(templates);
  testSafeInterpolationHelpers(templates);
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
