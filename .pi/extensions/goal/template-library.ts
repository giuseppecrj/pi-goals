import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, isAbsolute, join, normalize, relative, resolve, sep } from "node:path";

const EXAMPLE_TEMPLATE_DIR = join("examples", "pi-goals");
const PROJECT_TEMPLATE_DIR = ".pi-goals";
const SCRIPTS_DIR = "scripts";
const TEMPLATE_EXTENSIONS = [".md", ".markdown", ".txt"];
const HELPER_REFERENCE_PATTERN = /\.pi-goals\/scripts\/([A-Za-z0-9._/-]+)/g;

type Frontmatter = Record<string, string>;
type PathStatus = "absent" | "file" | "directory" | "other";

type HelperReferenceScan = {
	helperScripts: string[];
	invalidReferences: string[];
};

export type BundledGoalTemplate = {
	name: string;
	relativePath: string;
	sourcePath: string;
	destinationPath: string;
	description?: string;
	aliases: string[];
	usage?: string;
	body: string;
	helperScripts: string[];
	invalidHelperReferences: string[];
};

export type BundledGoalTemplateMetadata = {
	name: string;
	relativePath: string;
	destinationPath: string;
	description?: string;
	aliases: string[];
	usage?: string;
	helperScripts: string[];
	installed: boolean;
};

export type BundledTemplateImportFile = {
	kind: "template" | "helper";
	sourcePath: string;
	destinationPath: string;
	relativeDestinationPath: string;
	overwritten: boolean;
};

export type BundledTemplateCopySuccess = {
	ok: true;
	template: BundledGoalTemplate;
	files: BundledTemplateImportFile[];
	nextInvocation: string;
};

export type BundledTemplateCopyFailure = {
	ok: false;
	error: string;
};

export type BundledTemplateCopyResult = BundledTemplateCopySuccess | BundledTemplateCopyFailure;

export type BundledTemplateCopyOptions = {
	force?: boolean;
};

export function discoverBundledGoalTemplates(packageRoot = defaultPackageRoot()): BundledGoalTemplate[] {
	const examplesDir = resolve(packageRoot, EXAMPLE_TEMPLATE_DIR);
	const templates: BundledGoalTemplate[] = [];
	collectBundledTemplateFiles(examplesDir, (path) => {
		const raw = readFileSync(path, "utf8");
		const parsed = parseFrontmatter(raw);
		const relativePath = toPosixPath(relative(examplesDir, path));
		const name = stripMarkdownExt(relativePath);
		const helperScan = findHelperScriptReferences(parsed.body);
		templates.push({
			name,
			relativePath,
			sourcePath: path,
			destinationPath: toPosixPath(join(PROJECT_TEMPLATE_DIR, relativePath)),
			description: parsed.frontmatter.description || firstContentLine(parsed.body),
			aliases: parseList(parsed.frontmatter.aliases),
			usage: parsed.frontmatter.usage,
			body: parsed.body,
			helperScripts: helperScan.helperScripts,
			invalidHelperReferences: helperScan.invalidReferences,
		});
	});
	templates.sort((a, b) => a.name.localeCompare(b.name));
	return templates;
}

export function listBundledGoalTemplateMetadata(projectRoot = process.cwd(), packageRoot = defaultPackageRoot()): BundledGoalTemplateMetadata[] {
	return discoverBundledGoalTemplates(packageRoot).map((template) => ({
		name: template.name,
		relativePath: template.relativePath,
		destinationPath: template.destinationPath,
		description: template.description,
		aliases: template.aliases,
		usage: template.usage,
		helperScripts: template.helperScripts,
		installed: existsSync(resolveProjectTemplateDestination(projectRoot, template.relativePath)),
	}));
}

export function copyBundledGoalTemplate(nameOrAlias: string, options: BundledTemplateCopyOptions = {}, projectRoot = process.cwd(), packageRoot = defaultPackageRoot()): BundledTemplateCopyResult {
	const plan = planBundledGoalTemplateCopy(nameOrAlias, options, projectRoot, packageRoot);
	if (!plan.ok) return plan;
	try {
		for (const file of plan.files) {
			mkdirSync(dirname(file.destinationPath), { recursive: true });
			copyFileSync(file.sourcePath, file.destinationPath);
		}
		return plan;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { ok: false, error: `Failed to copy bundled goal template '${plan.template.name}': ${message}` };
	}
}

export function planBundledGoalTemplateCopy(nameOrAlias: string, options: BundledTemplateCopyOptions = {}, projectRoot = process.cwd(), packageRoot = defaultPackageRoot()): BundledTemplateCopyResult {
	const resolved = resolveBundledGoalTemplate(nameOrAlias, packageRoot);
	if (!resolved.ok) return resolved;
	const template = resolved.template;
	if (template.invalidHelperReferences.length > 0) {
		return { ok: false, error: `Template '${template.name}' contains invalid helper script reference(s): ${template.invalidHelperReferences.join(", ")}.` };
	}

	const projectTemplateRoot = resolve(projectRoot, PROJECT_TEMPLATE_DIR);
	const packageScriptRoot = resolve(packageRoot, EXAMPLE_TEMPLATE_DIR, SCRIPTS_DIR);
	const projectScriptRoot = resolve(projectTemplateRoot, SCRIPTS_DIR);
	const files: BundledTemplateImportFile[] = [];

	const templateDestination = safeResolve(projectTemplateRoot, template.relativePath);
	if (!templateDestination) return { ok: false, error: `Template '${template.name}' has an invalid destination path.` };
	files.push({
		kind: "template",
		sourcePath: template.sourcePath,
		destinationPath: templateDestination,
		relativeDestinationPath: toPosixPath(relative(projectRoot, templateDestination)),
		overwritten: existsSync(templateDestination),
	});

	for (const helperScript of template.helperScripts) {
		const sourcePath = safeResolve(packageScriptRoot, helperScript);
		const destinationPath = safeResolve(projectScriptRoot, helperScript);
		if (!sourcePath || !destinationPath) return { ok: false, error: `Template '${template.name}' contains invalid helper script path '${helperScript}'.` };
		if (pathStatus(sourcePath) !== "file") return { ok: false, error: `Template '${template.name}' references missing bundled helper script: examples/pi-goals/scripts/${helperScript}.` };
		files.push({
			kind: "helper",
			sourcePath,
			destinationPath,
			relativeDestinationPath: toPosixPath(relative(projectRoot, destinationPath)),
			overwritten: existsSync(destinationPath),
		});
	}

	const invalidDestinations = files.filter((file) => {
		const status = pathStatus(file.destinationPath);
		return status === "directory" || status === "other";
	});
	if (invalidDestinations.length > 0) {
		return { ok: false, error: `Cannot copy bundled goal template '${template.name}' because destination path(s) are not regular files: ${invalidDestinations.map((file) => file.relativeDestinationPath).join(", ")}.` };
	}

	const conflicts = files.filter((file) => file.overwritten);
	if (conflicts.length > 0 && !options.force) {
		return { ok: false, error: `Refusing to overwrite existing file(s): ${conflicts.map((file) => file.relativeDestinationPath).join(", ")}. Re-run with --force to overwrite.` };
	}

	return { ok: true, template, files, nextInvocation: nextInvocationForTemplate(template) };
}

type BundledTemplateResolution = { ok: true; template: BundledGoalTemplate } | BundledTemplateCopyFailure;

export function resolveBundledGoalTemplate(nameOrAlias: string, packageRoot = defaultPackageRoot()): BundledTemplateResolution {
	const name = nameOrAlias.trim();
	if (!name) return { ok: false, error: "Template name or alias is required." };
	const matches = discoverBundledGoalTemplates(packageRoot).filter((template) => template.name === name || template.aliases.includes(name));
	if (matches.length === 0) return { ok: false, error: `Unknown bundled goal template '${name}'. Run /goal templates list to see available templates.` };
	if (matches.length > 1) return { ok: false, error: `Ambiguous bundled goal template '${name}' matches: ${matches.map((template) => template.name).join(", ")}.` };
	return { ok: true, template: matches[0] };
}

function defaultPackageRoot(): string {
	return resolve(__dirname, "..", "..", "..");
}

function collectBundledTemplateFiles(dir: string, visit: (path: string) => void, root = dir): void {
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
		if (stats.isDirectory()) {
			const topLevel = relative(root, path).split(sep)[0];
			if (topLevel !== SCRIPTS_DIR) collectBundledTemplateFiles(path, visit, root);
		} else if (TEMPLATE_EXTENSIONS.includes(extname(entry))) {
			visit(path);
		}
	}
}

function resolveProjectTemplateDestination(projectRoot: string, relativePath: string): string {
	const projectTemplateRoot = resolve(projectRoot, PROJECT_TEMPLATE_DIR);
	return safeResolve(projectTemplateRoot, relativePath) ?? resolve(projectTemplateRoot, relativePath);
}

function safeResolve(root: string, relativePath: string): string | undefined {
	if (isAbsolute(relativePath)) return undefined;
	const resolvedRoot = resolve(root);
	const resolvedPath = resolve(resolvedRoot, relativePath);
	const pathFromRoot = relative(resolvedRoot, resolvedPath);
	if (pathFromRoot === "") return resolvedPath;
	if (pathFromRoot.startsWith("..") || isAbsolute(pathFromRoot)) return undefined;
	return resolvedPath;
}

function pathStatus(path: string): PathStatus {
	try {
		const stats = statSync(path);
		if (stats.isFile()) return "file";
		if (stats.isDirectory()) return "directory";
		return "other";
	} catch {
		return "absent";
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

function parseList(value?: string): string[] {
	if (!value) return [];
	return value.replace(/^\[|\]$/g, "").split(",").map((item) => stripQuotes(item.trim())).filter(Boolean);
}

function firstContentLine(body: string): string | undefined {
	return body.split(/\r?\n/).map((line) => line.replace(/^#+\s*/, "").trim()).find(Boolean);
}

function stripQuotes(value: string): string {
	return value.replace(/^[\'"]|[\'"]$/g, "");
}

function stripMarkdownExt(path: string): string {
	return path.replace(/\.(md|markdown|txt)$/i, "");
}

function toPosixPath(path: string): string {
	return path.split(sep).join("/");
}

function findHelperScriptReferences(body: string): HelperReferenceScan {
	const helperScripts: string[] = [];
	const invalidReferences: string[] = [];
	for (const match of body.matchAll(HELPER_REFERENCE_PATTERN)) {
		const rawReference = match[1];
		const normalized = normalizeHelperScriptReference(rawReference);
		if (!normalized) {
			invalidReferences.push(rawReference);
			continue;
		}
		if (!helperScripts.includes(normalized)) helperScripts.push(normalized);
	}
	helperScripts.sort();
	invalidReferences.sort();
	return { helperScripts, invalidReferences };
}

function normalizeHelperScriptReference(reference: string): string | undefined {
	if (!reference || isAbsolute(reference)) return undefined;
	const segments = reference.split("/");
	if (segments.includes("..")) return undefined;
	const normalized = toPosixPath(normalize(reference));
	if (!normalized || normalized === "." || normalized.startsWith("../") || normalized === ".." || normalized.includes("/../")) return undefined;
	return normalized;
}

function nextInvocationForTemplate(template: BundledGoalTemplate): string {
	if (template.usage) return template.usage;
	const placeholders = findRequiredPlaceholders(template.body);
	if (placeholders.includes("args")) return `/goal ${template.name} -- <description>`;
	const flags = placeholders.map((placeholder) => ` --${placeholder} <${placeholder}>`).join("");
	return `/goal ${template.name}${flags}`;
}

function findRequiredPlaceholders(text: string): string[] {
	return Array.from(text.matchAll(/\{\{\s*(?:(?:shell_quote|json|heredoc)\s+)?([A-Za-z0-9_-]+)\s*\}\}/g), (match) => match[1])
		.filter((placeholder, index, all) => all.indexOf(placeholder) === index)
		.sort();
}
