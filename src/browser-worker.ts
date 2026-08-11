import {
  createInitialPaddlePulseState,
  renderPaddlePulseFrame,
  stepPaddlePulseState,
} from "./engine.js";
import { executePaddlePulseProject } from "./evaluator.js";
import type {
  PaddlePulseEvaluatorOptionsV1,
  PaddlePulseExecutionResultV1,
  PaddlePulseFrameV1,
  PaddlePulseInputCommandV1,
  PaddlePulseProgramV1,
  PaddlePulseProjectV1,
  PaddlePulseStateV1,
} from "./types.js";

export type PaddlePulseWorkerRequestV1 =
  | { readonly id: string; readonly type: "compile"; readonly project: PaddlePulseProjectV1; readonly options?: PaddlePulseEvaluatorOptionsV1 }
  | { readonly id: string; readonly type: "step"; readonly inputs?: readonly PaddlePulseInputCommandV1[] }
  | { readonly id: string; readonly type: "restart"; readonly seed?: number }
  | { readonly id: string; readonly type: "dispose" };

export type PaddlePulseWorkerResponseV1 =
  | { readonly id: string; readonly outcome: "ready" | "frame" | "disposed"; readonly frame?: PaddlePulseFrameV1; readonly execution?: PaddlePulseExecutionResultV1 }
  | { readonly id: string; readonly outcome: "error" | "timeout"; readonly errorCode: string; readonly execution?: PaddlePulseExecutionResultV1 };

type ExecuteProject = typeof executePaddlePulseProject;

/** Stateful handler for one disposable, no-DOM browser worker. */
export function createPaddlePulseWorkerMessageHandler(
  postMessage: (response: PaddlePulseWorkerResponseV1) => void,
  executeProject: ExecuteProject = executePaddlePulseProject,
): (event: MessageEvent<PaddlePulseWorkerRequestV1>) => Promise<void> {
  let program: PaddlePulseProgramV1 | undefined;
  let state: PaddlePulseStateV1 | undefined;
  return async (event) => {
    const request = event.data;
    if (
      typeof request !== "object"
      || request === null
      || typeof request.id !== "string"
      || request.id.length < 1
      || request.id.length > 100
    ) return;
    try {
      if (request.type === "dispose") {
        program = undefined;
        state = undefined;
        postMessage({ id: request.id, outcome: "disposed" });
        return;
      }
      if (request.type === "compile") {
        program = undefined;
        state = undefined;
        const execution = await executeProject(request.project, request.options);
        if (execution.outcome !== "completed" || !execution.program) {
          postMessage({
            id: request.id,
            outcome: execution.outcome === "timeout" ? "timeout" : "error",
            errorCode: execution.errorCode ?? "PADDLE_PULSE_WORKER_COMPILE_FAILED",
            execution,
          });
          return;
        }
        program = execution.program;
        state = createInitialPaddlePulseState(program, 1);
        postMessage({
          id: request.id,
          outcome: "ready",
          execution,
          frame: renderPaddlePulseFrame(state, program),
        });
        return;
      }
      if (!program || !state) {
        postMessage({
          id: request.id,
          outcome: "error",
          errorCode: "PADDLE_PULSE_WORKER_NOT_COMPILED",
        });
        return;
      }
      if (request.type === "restart") {
        state = createInitialPaddlePulseState(program, request.seed);
      } else {
        state = stepPaddlePulseState(state, program, request.inputs ?? []);
      }
      postMessage({
        id: request.id,
        outcome: "frame",
        frame: renderPaddlePulseFrame(state, program),
      });
    } catch {
      program = undefined;
      state = undefined;
      postMessage({
        id: request.id,
        outcome: "error",
        errorCode: "PADDLE_PULSE_WORKER_FAILED",
      });
    }
  };
}

interface PaddlePulseWorkerScopeV1 {
  onmessage: ((event: MessageEvent<PaddlePulseWorkerRequestV1>) => void) | null;
  postMessage(response: PaddlePulseWorkerResponseV1): void;
}

/** Install the package handler into an explicit WorkerGlobalScope-like object. */
export function installPaddlePulseBrowserWorker(scope: PaddlePulseWorkerScopeV1): void {
  const handler = createPaddlePulseWorkerMessageHandler((response) => {
    scope.postMessage(response);
  });
  scope.onmessage = (event) => {
    void handler(event);
  };
}

const possibleScope = globalThis as unknown as Partial<PaddlePulseWorkerScopeV1>;
if (
  typeof possibleScope.postMessage === "function"
  && "onmessage" in possibleScope
  && typeof (globalThis as { document?: unknown }).document === "undefined"
) {
  installPaddlePulseBrowserWorker(possibleScope as PaddlePulseWorkerScopeV1);
}
