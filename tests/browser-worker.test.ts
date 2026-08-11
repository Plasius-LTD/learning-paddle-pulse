import { describe, expect, it, vi } from "vitest";
import {
  createPaddlePulseWorkerMessageHandler,
  installPaddlePulseBrowserWorker,
  type PaddlePulseWorkerResponseV1,
} from "../src/browser-worker.js";
import { COMPLETE_PADDLE_PULSE_PROJECT } from "./fixtures.js";

describe("Paddle Pulse browser worker boundary", () => {
  it("compiles, steps, restarts and disposes without exposing worker internals", async () => {
    const responses: PaddlePulseWorkerResponseV1[] = [];
    const handler = createPaddlePulseWorkerMessageHandler((response) => responses.push(response));
    await handler({ data: { id: "compile", type: "compile", project: COMPLETE_PADDLE_PULSE_PROJECT } } as MessageEvent);
    await handler({ data: { id: "step", type: "step", inputs: [{ sequence: 1, action: "start", phase: "pressed", source: "keyboard", atTick: 1 }] } } as MessageEvent);
    await handler({ data: { id: "restart", type: "restart", seed: 7 } } as MessageEvent);
    await handler({ data: { id: "dispose", type: "dispose" } } as MessageEvent);
    expect(responses.map((response) => response.outcome)).toEqual([
      "ready", "frame", "frame", "disposed",
    ]);
    expect(responses[1]).toMatchObject({ frame: { tick: 1 } });
    expect(responses[2]).toMatchObject({ frame: { tick: 0 } });
  });

  it("rejects stepping an uncompiled worker and ignores malformed request IDs", async () => {
    const post = vi.fn();
    const handler = createPaddlePulseWorkerMessageHandler(post);
    await handler({ data: { id: "step", type: "step" } } as MessageEvent);
    await handler({ data: { id: "", type: "step" } } as MessageEvent);
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith({
      id: "step",
      outcome: "error",
      errorCode: "PADDLE_PULSE_WORKER_NOT_COMPILED",
    });
  });

  it("installs into an explicit worker-like scope", () => {
    const scope = { onmessage: null, postMessage: vi.fn() };
    installPaddlePulseBrowserWorker(scope);
    expect(scope.onmessage).toBeTypeOf("function");
  });
});
