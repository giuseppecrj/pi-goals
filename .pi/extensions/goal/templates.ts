import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";

const TEMPLATE_DIR = ".pi-goals";
const DEFAULT_COMMAND_TIMEOUT_MS = 10_000;
const DEFAULT_COMMAND_OUTPUT_LIMIT = 20_000;
const TEMPLATE_COMMAND_POLICY_ENV = "PI_GOALS_TEMPLATE_COMMANDS";
const DEFAULT_TEMPLATE_COMMAND_POLICY: TemplateCommandPolicy = "off";
const ALLOWLISTED_COMMANDS = ["git"];
const SHELL_CHAIN_META_PATTERN = /[;&|`$<>\\\n\r]/;
const GIT_UNSAFE_ARG_PATTERN = /^(?:-c|--config(?:=.*)?|--exec-path(?:=.*)?|--upload-pack(?:=.*)?|--receive-pack(?:=.*)?|--git-dir(?:=.*)?|--work-tree(?:=.*)?)$/;

type TemplateCommandPolicy = "off" | "allowlist" | "on";

export type GoalTemplate = {
	name: string;
	path: string;
	description?: string;
	aliases: string[];
	allowCommands: boolean;
	commandTimeoutMs: number;
	commandOutputLimit: number;
	body: string;
};

export type GoalTemplateMetadata = {
	name: string;
	path: string;
	description?: string;
	aliases: string[];
	allowCommands: boolean;
	requiredPlaceholders: string[];
	requiredFlags: string[];
	requiresArgs: boolean;
};

export type ResolvedGoalTemplate = {
	name: string;
	path: string;
	objective: string;
	flags: Record<string, string>;
	args: string;
};

export type TemplateResolution = { ok: true; template: ResolvedGoalTemplate } | { ok: false; error: string } | { ok: false; notTemplate: true };

type ParsedInvocation = {
	name: string;
	flags: Record<string, string>;
	args: string;
};

type Frontmatter = Record<string, string>;

export function discoverGoalTemplates(root = process.cwd()): GoalTemplate[] {
	const templates: GoalTemplate[] = [];
	for (const dir of findTemplateDirs(root)) collectTemplates(root, dir, templates);
	templates.sort((a, b) => a.name.localeCompare(b.name));
	return templates;
}

export function listGoalTemplateMetadata(root = process.cwd()): GoalTemplateMetadata[] {
	return discoverGoalTemplates(root).map((template) => {
		const requiredPlaceholders = findRequiredPlaceholders(template.body);
		return {
			name: template.name,
			path: template.path,
			description: template.description,
			aliases: template.aliases,
			allowCommands: template.allowCommands,
			requiredPlaceholders,
			requiredFlags: requiredPlaceholders.filter((placeholder) => placeholder !== "args"),
			requiresArgs: requiredPlaceholders.includes("args"),
		};
	});
}

export function resolveGoalTemplateInvocation(input: string, root = process.cwd()): TemplateResolution {
	const parsed = parseInvocation(input);
	if (!parsed) return { ok: false, notTemplate: true };
	return resolveGoalTemplateByName(parsed.name, parsed.flags, parsed.args, root);
}

export function resolveGoalTemplateInvocationArgs(nameOrAlias: string, invocationArgs = "", flags: Record<string, string> = {}, root = process.cwd()): TemplateResolution {
	const parsed = parseInvocation(`${nameOrAlias}${invocationArgs.trim() ? ` ${invocationArgs.trim()}` : ""}`);
	if (!parsed) return { ok: false, notTemplate: true };
	return resolveGoalTemplateByName(parsed.name, { ...parsed.flags, ...flags }, parsed.args, root);
}

export function resolveGoalTemplateByName(nameOrAlias: string, flags: Record<string, string>, args = "", root = process.cwd()): TemplateResolution {
	const matches = findTemplates(nameOrAlias, root);
	if (matches.length === 0) return { ok: false, notTemplate: true };
	if (matches.length > 1) return { ok: false, error: `Ambiguous goal template '${nameOrAlias}' matches: ${matches.map((template) => template.name).join(", ")}.` };
	const template = matches[0];
	try {
		const values = { ...flags, args };
		const interpolated = interpolate(template.body, values);
		const objective = resolveInlineCommands(interpolated, template, root).trim();
		return { ok: true, template: { name: template.name, path: template.path, objective, flags: { ...flags }, args } };
	} catch (error) {
		return { ok: false, error: error instanceof Error ? error.message : String(error) };
	}
}

function findTemplates(nameOrAlias: string, root: string): GoalTemplate[] {
	return discoverGoalTemplates(root).filter((template) => template.name === nameOrAlias || template.aliases.includes(nameOrAlias));
}

function findTemplateDirs(root: string): string[] {
	return [join(root, TEMPLATE_DIR)].filter(isDirectory);
}

function isDirectory(path: string): boolean {
	try {
		return statSync(path).isDirectory();
	} catch {
		return false;
	}
}

function collectTemplates(root: string, templateDir: string, templates: GoalTemplate[]): void {
	collectMarkdown(templateDir, (path) => {
		const raw = readFileSync(path, "utf8");
		const parsed = parseFrontmatter(raw);
		const relativeName = stripMarkdownExt(relative(templateDir, path).split(sep).join("/"));
		templates.push({
			name: relativeName,
			path: relative(root, path),
			description: parsed.frontmatter.description || firstContentLine(parsed.body),
			aliases: parseList(parsed.frontmatter.aliases),
			allowCommands: parseBoolean(parsed.frontmatter.allow_commands),
			commandTimeoutMs: parsePositiveInt(parsed.frontmatter.command_timeout_ms, DEFAULT_COMMAND_TIMEOUT_MS),
			commandOutputLimit: parsePositiveInt(parsed.frontmatter.command_output_limit, DEFAULT_COMMAND_OUTPUT_LIMIT),
			body: parsed.body,
		});
	});
}

function collectMarkdown(dir: string, visit: (path: string) => void): void {
	let entries: string[];
	try {
		entries = readdirSync(dir);
	} catch {
		return;
	}
	for (const entry of entries) {
		const path = join(dir, entry);
		let stats;
		try {
			stats = statSync(path);
		} catch {
			continue;
		}
		if (stats.isDirectory()) collectMarkdown(path, visit);
		else if ([".md", ".markdown", ".txt"].includes(extname(entry))) visit(path);
	}
}

function parseFrontmatter(raw: string): { frontmatter: Frontmatter; body: string } {
	if (!raw.startsWith("---\n")) return { frontmatter: {}, body: raw };
	const end = raw.indexOf("\n---", 4);
	if (end < 0) return { frontmatter: {}, body: raw };
	const frontmatter: Frontmatter = {};
	for (const line of raw.slice(4, end).split(/\r?\n/)) {
		const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
		if (match) frontmatter[match[1]] = stripQuotes(match[2].trim());
	}
	return { frontmatter, body: raw.slice(end + 4).replace(/^\r?\n/, "") };
}

function parseInvocation(input: string): ParsedInvocation | undefined {
	const trimmed = input.trim();
	if (!trimmed) return undefined;
	const match = trimmed.match(/^(\S+)(?:\s+([\s\S]*))?$/);
	if (!match) return undefined;
	const name = match[1];
	let rest = match[2] ?? "";
	let args = "";
	if (rest.startsWith("-- ")) {
		args = rest.slice(3).trim();
		rest = "";
	} else {
		const delimiter = rest.indexOf(" -- ");
		if (delimiter >= 0) {
			args = rest.slice(delimiter + 4).trim();
			rest = rest.slice(0, delimiter).trim();
		}
	}
	return { name, flags: parseFlags(rest), args };
}

function parseFlags(input: string): Record<string, string> {
	const values: Record<string, string> = {};
	const tokens = input.match(/"[^"]*"|'[^']*'|\S+/g) ?? [];
	for (let i = 0; i < tokens.length; i++) {
		const token = unquote(tokens[i]);
		if (!token.startsWith("--")) continue;
		const eq = token.indexOf("=");
		if (eq > 2) {
			values[token.slice(2, eq)] = token.slice(eq + 1);
			continue;
		}
		const next = tokens[i + 1] && !tokens[i + 1].startsWith("--") ? unquote(tokens[++i]) : "true";
		values[token.slice(2)] = next;
	}
	return values;
}

function interpolate(text: string, values: Record<string, string>): string {
	return text.replace(/\{\{\s*([A-Za-z0-9_-]+)(?:\s+([A-Za-z0-9_-]+))?\s*\}\}/g, (_match, first: string, second: string | undefined) => {
		if (second === undefined) {
			if (values[first] === undefined) throw new Error(`Missing template value for {{${first}}}.`);
			return values[first];
		}
		if (values[second] === undefined) throw new Error(`Missing template value for {{${second}}}.`);
		return applyInterpolationHelper(first, values[second]);
	});
}

function applyInterpolationHelper(helper: string, value: string): string {
	if (helper === "shell_quote") return shellQuote(value);
	if (helper === "json") return JSON.stringify(value);
	if (helper === "heredoc") return value.replace(/\r\n/g, "\n");
	throw new Error(`Unknown template interpolation helper '${helper}'.`);
}

function shellQuote(value: string): string {
	return `'${value.replace(/'/g, `'\\''`)}'`;
}

function findRequiredPlaceholders(text: string): string[] {
	return Array.from(text.matchAll(/\{\{\s*(?:(?:shell_quote|json|heredoc)\s+)?([A-Za-z0-9_-]+)\s*\}\}/g), (match) => match[1])
		.filter((placeholder, index, all) => all.indexOf(placeholder) === index)
		.sort();
}

function resolveInlineCommands(text: string, template: GoalTemplate, cwd: string): string {
	return text.replace(/!`([^`]+)`/g, (_match, command: string) => {
		if (!template.allowCommands) throw new Error(`Template ${template.name} uses inline commands but allow_commands is not true.`);
		const policy = templateCommandPolicy();
		if (policy === "off") {
			throw new Error(`Template ${template.name} uses inline commands but template command execution is disabled. Set ${TEMPLATE_COMMAND_POLICY_ENV}=allowlist or ${TEMPLATE_COMMAND_POLICY_ENV}=on to opt in.`);
		}
		if (policy === "allowlist") validateAllowlistedCommand(command, template.name);
		return runCommand(command, template, cwd);
	});
}

function templateCommandPolicy(): TemplateCommandPolicy {
	const value = process.env[TEMPLATE_COMMAND_POLICY_ENV];
	return value === "allowlist" || value === "on" || value === "off" ? value : DEFAULT_TEMPLATE_COMMAND_POLICY;
}

function validateAllowlistedCommand(command: string, templateName: string): void {
	const parsed = parseAllowlistedCommand(command, templateName);
	if (!ALLOWLISTED_COMMANDS.includes(parsed.commandName)) {
		throw new Error(`Inline command failed allowlist policy in template ${templateName}: '${parsed.commandName}' is not allowlisted.`);
	}
	if (parsed.commandName === "git") validateGitAllowlistedArgs(parsed.args, templateName);
}

function parseAllowlistedCommand(command: string, templateName: string): { commandName: string; args: string[] } {
	const trimmed = command.trim();
	if (!trimmed) throw new Error(`Inline command failed allowlist policy in template ${templateName}: empty command.`);
	if (SHELL_CHAIN_META_PATTERN.test(trimmed)) {
		throw new Error(`Inline command failed allowlist policy in template ${templateName}: shell metacharacters are not allowed in allowlist mode.`);
	}
	const tokens = splitCommandTokens(trimmed, templateName);
	const commandName = tokens[0];
	if (!commandName) throw new Error(`Inline command failed allowlist policy in template ${templateName}: empty command.`);
	return { commandName, args: tokens.slice(1) };
}

function validateGitAllowlistedArgs(args: string[], templateName: string): void {
	for (const arg of args) {
		if (GIT_UNSAFE_ARG_PATTERN.test(arg) || arg.startsWith("-c") || arg.includes("alias.")) {
			throw new Error(`Inline command failed allowlist policy in template ${templateName}: unsafe git argument '${arg}'.`);
		}
	}
}

function splitCommandTokens(input: string, templateName: string): string[] {
	const tokens: string[] = [];
	let current = "";
	let quote: '"' | "'" | undefined;
	for (const char of input) {
		if (quote) {
			if (char === quote) quote = undefined;
			else current += char;
			continue;
		}
		if (char === '"' || char === "'") {
			quote = char;
			continue;
		}
		if (/\s/.test(char)) {
			if (current) {
				tokens.push(current);
				current = "";
			}
			continue;
		}
		current += char;
	}
	if (quote) throw new Error(`Inline command failed allowlist policy in template ${templateName}: unterminated quote.`);
	if (current) tokens.push(current);
	return tokens;
}

function runCommand(command: string, template: GoalTemplate, cwd: string): string {
	const policy = templateCommandPolicy();
	const executable = policy === "allowlist" ? parseAllowlistedCommand(command, template.name) : undefined;
	try {
		const output = executable
			? execFileSync(executable.commandName, executable.args, { cwd, encoding: "utf8", timeout: template.commandTimeoutMs, maxBuffer: template.commandOutputLimit + 1024 })
			: execFileSync("/bin/bash", ["-lc", command], { cwd, encoding: "utf8", timeout: template.commandTimeoutMs, maxBuffer: template.commandOutputLimit + 1024 });
		return output.length > template.commandOutputLimit ? `${output.slice(0, template.commandOutputLimit)}\n[output truncated]` : output;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`Inline command failed in template ${template.name}: ${message}`);
	}
}

function stripMarkdownExt(path: string): string {
	return path.replace(/\.(md|markdown|txt)$/i, "");
}

function parseList(value?: string): string[] {
	if (!value) return [];
	return value.replace(/^\[|\]$/g, "").split(",").map((item) => stripQuotes(item.trim())).filter(Boolean);
}

function parseBoolean(value?: string): boolean {
	return value === "true" || value === "yes" || value === "1";
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
	const parsed = Number(value);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function firstContentLine(body: string): string | undefined {
	return body.split(/\r?\n/).map((line) => line.replace(/^#+\s*/, "").trim()).find(Boolean);
}

function stripQuotes(value: string): string {
	return value.replace(/^['"]|['"]$/g, "");
}

function unquote(value: string): string {
	return stripQuotes(value);
}
