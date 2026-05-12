import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { MAX_OBJECTIVE_CHARS, STATE_ENTRY_TYPE, STATE_EVENT_VERSION } from "./constants";
import { isTelemetry } from "./telemetry";
import type { GoalRuntimeState, GoalState, GoalTelemetrySnapshot, MutationResult, PiGoalEventReason, PiGoalStateEvent } from "./types";

export type CreateGoalStateInput = {
	objective: string;
	tokenBudget?: number;
	timeBudgetSeconds?: number;
	minTokensBeforeWrapUp?: number;
	minTimeSecondsBeforeWrapUp?: number;
	now?: number;
};

let runtimeState: GoalRuntimeState = { goal: null, telemetry: null };

export function getGoal(): GoalState | null {
	return runtimeState.goal;
}

export function getTelemetry(): GoalTelemetrySnapshot | null {
	return runtimeState.telemetry;
}

export function getRuntimeState(): GoalRuntimeState {
	return { goal: runtimeState.goal, telemetry: runtimeState.telemetry };
}

export function replayGoalState(ctx: ExtensionContext): GoalRuntimeState {
	let next: GoalRuntimeState = { goal: null, telemetry: null };
	for (const entry of ctx.sessionManager.getBranch()) {
		const event = entryToGoalEvent(entry);
		if (!event) continue;
		next = applyEvent(next, event);
	}
	runtimeState = next;
	return getRuntimeState();
}

export function setRuntimeStateForTests(state: GoalRuntimeState): void {
	runtimeState = state;
}

export function createGoalState(input: CreateGoalStateInput): GoalState {
	const now = input.now ?? Date.now();
	return {
		goalId: crypto.randomUUID(),
		objective: input.objective,
		status: "active",
		tokenBudget: input.tokenBudget,
		timeBudgetSeconds: input.timeBudgetSeconds,
		minTokensBeforeWrapUp: input.minTokensBeforeWrapUp,
		minTimeSecondsBeforeWrapUp: input.minTimeSecondsBeforeWrapUp,
		tokensUsed: 0,
		timeUsedSeconds: 0,
		createdAt: now,
		updatedAt: now,
	};
}

export function persistSetGoal(
	pi: ExtensionAPI,
	goal: GoalState,
	telemetry: GoalTelemetrySnapshot,
	reason: PiGoalEventReason,
): MutationResult {
	return persistEvent(pi, { kind: "set", goalId: goal.goalId, goal, telemetry, reason });
}

export function persistUpdateGoal(
	pi: ExtensionAPI,
	goal: GoalState,
	telemetry: GoalTelemetrySnapshot | null,
	reason: PiGoalEventReason,
): MutationResult {
	if (runtimeState.goal && runtimeState.goal.goalId !== goal.goalId) {
		return { ok: false, goal: runtimeState.goal, telemetry: runtimeState.telemetry, message: "Stale goal update ignored." };
	}
	return persistEvent(pi, { kind: "update", goalId: goal.goalId, goal, telemetry, reason });
}

export function persistTelemetry(
	pi: ExtensionAPI,
	telemetry: GoalTelemetrySnapshot | null,
	reason: PiGoalEventReason,
): MutationResult {
	const goal = runtimeState.goal;
	if (!goal || !telemetry || telemetry.goalId !== goal.goalId) {
		return { ok: false, goal, telemetry: runtimeState.telemetry, message: "Stale telemetry update ignored." };
	}
	return persistEvent(pi, { kind: "telemetry", goalId: goal.goalId, goal, telemetry, reason });
}

export function persistAccountGoal(
	pi: ExtensionAPI,
	goalId: string,
	delta: { timeUsedSeconds?: number; tokensUsed?: number },
	telemetry: GoalTelemetrySnapshot | null,
	reason: PiGoalEventReason,
): MutationResult {
	const current = runtimeState.goal;
	if (!current || current.goalId !== goalId) {
		return { ok: false, goal: current, telemetry: runtimeState.telemetry, message: "Stale accounting ignored." };
	}
	const goal: GoalState = {
		...current,
		timeUsedSeconds: current.timeUsedSeconds + Math.max(0, Math.floor(delta.timeUsedSeconds ?? 0)),
		tokensUsed: current.tokensUsed + Math.max(0, Math.floor(delta.tokensUsed ?? 0)),
		updatedAt: Date.now(),
	};
	return persistEvent(pi, { kind: "account", goalId, goal, telemetry, delta, reason });
}

export function persistClearGoal(pi: ExtensionAPI, reason: PiGoalEventReason): MutationResult {
	return persistEvent(pi, { kind: "clear", goalId: runtimeState.goal?.goalId, goal: null, telemetry: null, reason });
}

function persistEvent(
	pi: ExtensionAPI,
	input: Omit<PiGoalStateEvent, "version" | "at">,
): MutationResult {
	const event: PiGoalStateEvent = { version: STATE_EVENT_VERSION, at: Date.now(), ...input };
	pi.appendEntry(STATE_ENTRY_TYPE, event);
	runtimeState = applyEvent(runtimeState, event);
	return { ok: true, goal: runtimeState.goal, telemetry: runtimeState.telemetry };
}

function applyEvent(state: GoalRuntimeState, event: PiGoalStateEvent): GoalRuntimeState {
	if (event.kind === "clear") return { goal: null, telemetry: null };
	if (event.goalId && state.goal && event.goalId !== state.goal.goalId && event.kind !== "set") return state;
	const parsedGoal = toGoalState(event.goal);
	const goal = parsedGoal ?? state.goal;
	const telemetry = event.telemetry === null ? null : isTelemetry(event.telemetry) ? event.telemetry : state.telemetry;
	return { goal, telemetry };
}

function entryToGoalEvent(entry: unknown): PiGoalStateEvent | null {
	if (typeof entry !== "object" || entry === null) return null;
	const candidate = entry as Record<string, unknown>;
	if (candidate.type !== "custom" || candidate.customType !== STATE_ENTRY_TYPE) return null;
	return isGoalEvent(candidate.data) ? candidate.data : null;
}

function isGoalEvent(value: unknown): value is PiGoalStateEvent {
	if (typeof value !== "object" || value === null) return false;
	const v = value as Record<string, unknown>;
	return v.version === STATE_EVENT_VERSION && isGoalEventKind(v.kind) && isGoalEventReason(v.reason);
}

function toGoalState(value: unknown): GoalState | null {
	if (typeof value !== "object" || value === null) return null;
	const v = value as Record<string, unknown>;
	const goalId = requiredString(v.goalId);
	const objective = requiredString(v.objective);
	const status = goalStatus(v.status);
	const tokensUsed = nonNegativeInteger(v.tokensUsed);
	const timeUsedSeconds = nonNegativeInteger(v.timeUsedSeconds);
	const createdAt = finiteTimestamp(v.createdAt);
	const updatedAt = finiteTimestamp(v.updatedAt);
	if (!goalId || !objective || [...objective].length > MAX_OBJECTIVE_CHARS || !status || tokensUsed === undefined || timeUsedSeconds === undefined || createdAt === undefined || updatedAt === undefined) return null;
	const tokenBudget = optionalPositiveIntegerField(v.tokenBudget);
	const timeBudgetSeconds = optionalPositiveIntegerField(v.timeBudgetSeconds);
	const minTokensBeforeWrapUp = optionalPositiveIntegerField(v.minTokensBeforeWrapUp);
	const minTimeSecondsBeforeWrapUp = optionalPositiveIntegerField(v.minTimeSecondsBeforeWrapUp);
	if (!tokenBudget.ok || !timeBudgetSeconds.ok || !minTokensBeforeWrapUp.ok || !minTimeSecondsBeforeWrapUp.ok) return null;
	return { goalId, objective, status, tokenBudget: tokenBudget.value, timeBudgetSeconds: timeBudgetSeconds.value, minTokensBeforeWrapUp: minTokensBeforeWrapUp.value, minTimeSecondsBeforeWrapUp: minTimeSecondsBeforeWrapUp.value, tokensUsed, timeUsedSeconds, createdAt, updatedAt };
}

function isGoalEventKind(kind: unknown): boolean {
	return kind === "set" || kind === "update" || kind === "account" || kind === "telemetry" || kind === "clear";
}

function isGoalEventReason(reason: unknown): boolean {
	return reason === "command" || reason === "tool" || reason === "turn" || reason === "budget" || reason === "abort" || reason === "resume" || reason === "reload" || reason === "continuation" || reason === "safety" || reason === "floor";
}

function goalStatus(value: unknown): GoalState["status"] | undefined {
	if (value === "active" || value === "paused" || value === "budgetLimited" || value === "complete") return value;
	return undefined;
}

function requiredString(value: unknown): string | undefined {
	return typeof value === "string" && value.trim() ? value : undefined;
}

function finiteTimestamp(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function nonNegativeInteger(value: unknown): number | undefined {
	return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : undefined;
}

function optionalPositiveIntegerField(value: unknown): { ok: true; value: number | undefined } | { ok: false } {
	if (value === undefined) return { ok: true, value: undefined };
	return typeof value === "number" && Number.isInteger(value) && value > 0 ? { ok: true, value } : { ok: false };
}
