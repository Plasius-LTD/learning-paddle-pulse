import type { QuickJSContext, QuickJSHandle } from "quickjs-emscripten";
import { PADDLE_PULSE_RUNTIME_LIMITS_V1 } from "./course.js";
import type {
  PaddlePulseEvaluatorOptionsV1,
  PaddlePulseExecutionResultV1,
  PaddlePulseProgramCommandV1,
  PaddlePulseProjectV1,
} from "./types.js";
import {
  parsePaddlePulseProgramCommand,
  parsePaddlePulseProject,
  resolvePaddlePulseProgram,
} from "./validation.js";

const hostFunctions = Object.freeze({
  configureCourt: "court",
  configurePaddle: "paddle",
  configureControls: "controls",
  configureBall: "ball",
  configureBricks: "bricks",
  configureRules: "rules",
  configureLevels: "levels",
  configureSound: "sound",
} as const);

/** Sanitized QuickJS failure with no learner source or stack. */
export class PaddlePulseEvaluationError extends Error {
  readonly code: string;
  readonly outcome: "error" | "timeout";

  constructor(code: string, outcome: "error" | "timeout") {
    super(code);
    this.name = "PaddlePulseEvaluationError";
    this.code = code;
    this.outcome = outcome;
  }
}

function boundedOption(
  value: number | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new PaddlePulseEvaluationError("PADDLE_PULSE_EVALUATOR_OPTIONS_INVALID", "error");
  }
  return value;
}

function dumpedErrorMessage(context: QuickJSContext, handle: QuickJSHandle): string {
  try {
    const dumped = context.dump(handle);
    if (typeof dumped === "string") return dumped;
    if (typeof dumped === "object" && dumped !== null) {
      const message = (dumped as Record<string, unknown>).message;
      return typeof message === "string" ? message : "";
    }
  } catch {
    return "";
  }
  return "";
}

function failed(
  outcome: "error" | "timeout",
  commands: readonly PaddlePulseProgramCommandV1[],
): PaddlePulseExecutionResultV1 {
  return {
    schemaVersion: "1",
    outcome,
    boundary: "quickjs-wasm-v2",
    commands,
    errorCode: outcome === "timeout"
      ? "PADDLE_PULSE_EVALUATION_TIMEOUT"
      : "PADDLE_PULSE_EVALUATION_FAILED",
  };
}

/**
 * Execute one bounded source file in a fresh QuickJS realm.
 * Learner code can only emit validated declarative commands; the realm receives
 * no DOM, network, cookie, or persistent-storage host objects.
 */
export async function executePaddlePulseProject(
  projectValue: PaddlePulseProjectV1,
  options: PaddlePulseEvaluatorOptionsV1 = {},
): Promise<PaddlePulseExecutionResultV1> {
  let project: PaddlePulseProjectV1;
  try {
    project = parsePaddlePulseProject(projectValue);
  } catch {
    return failed("error", []);
  }
  const executionTimeoutMs = boundedOption(
    options.executionTimeoutMs,
    PADDLE_PULSE_RUNTIME_LIMITS_V1.executionTimeoutMs,
    1,
    PADDLE_PULSE_RUNTIME_LIMITS_V1.executionTimeoutMs,
  );
  const memoryLimitBytes = boundedOption(
    options.memoryLimitBytes,
    PADDLE_PULSE_RUNTIME_LIMITS_V1.memoryLimitBytes,
    4 * 1024 * 1024,
    PADDLE_PULSE_RUNTIME_LIMITS_V1.memoryLimitBytes,
  );
  const stackLimitBytes = boundedOption(
    options.stackLimitBytes,
    PADDLE_PULSE_RUNTIME_LIMITS_V1.stackLimitBytes,
    128 * 1024,
    PADDLE_PULSE_RUNTIME_LIMITS_V1.stackLimitBytes,
  );
  const maximumCommands = boundedOption(
    options.maximumCommands,
    PADDLE_PULSE_RUNTIME_LIMITS_V1.maximumCommands,
    1,
    PADDLE_PULSE_RUNTIME_LIMITS_V1.maximumCommands,
  );
  const commands: PaddlePulseProgramCommandV1[] = [];
  const { getQuickJS, shouldInterruptAfterDeadline } = await import("quickjs-emscripten");
  const quickJs = await getQuickJS();
  const runtime = quickJs.newRuntime();
  runtime.setMemoryLimit(memoryLimitBytes);
  runtime.setMaxStackSize(stackLimitBytes);
  runtime.setInterruptHandler(shouldInterruptAfterDeadline(Date.now() + executionTimeoutMs));
  const context = runtime.newContext();
  const handles: QuickJSHandle[] = [];
  try {
    for (const [name, kind] of Object.entries(hostFunctions)) {
      const handle = context.newFunction(name, (valueHandle) => {
        if (commands.length >= maximumCommands) {
          throw new PaddlePulseEvaluationError("PADDLE_PULSE_COMMAND_LIMIT", "error");
        }
        commands.push(parsePaddlePulseProgramCommand(kind, context.dump(valueHandle)));
        return context.undefined;
      });
      handles.push(handle);
      context.setProp(context.global, name, handle);
    }
    const evaluation = context.evalCode(project.source, "paddle-pulse.js", {
      type: "global",
      strict: true,
    });
    if (evaluation.error) {
      const message = dumpedErrorMessage(context, evaluation.error);
      evaluation.error.dispose();
      return failed(/interrupt|timeout|deadline/iu.test(message) ? "timeout" : "error", commands);
    }
    evaluation.value.dispose();
    try {
      return {
        schemaVersion: "1",
        outcome: "completed",
        boundary: "quickjs-wasm-v2",
        commands,
        program: resolvePaddlePulseProgram(commands),
      };
    } catch {
      return failed("error", commands);
    }
  } finally {
    for (const handle of handles) handle.dispose();
    context.dispose();
    runtime.dispose();
  }
}

export function isPaddlePulseEvaluationTimeout(
  value: unknown,
): value is PaddlePulseEvaluationError {
  return value instanceof PaddlePulseEvaluationError && value.outcome === "timeout";
}
