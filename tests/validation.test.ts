import { describe, expect, it } from "vitest";
import {
  PADDLE_PULSE_RUNTIME_LIMITS_V1,
  PADDLE_PULSE_STARTER_PROJECT_V1,
  parsePaddlePulseInputCommand,
  parsePaddlePulseProgramCommand,
  parsePaddlePulseProject,
  parsePaddlePulseSlotId,
  resolvePaddlePulseProgram,
  validatePaddlePulseProgram,
} from "../src/index.js";

describe("Paddle Pulse program validation", () => {
  it("accepts the immutable starter and resolves safe preview defaults", () => {
    expect(parsePaddlePulseProject(PADDLE_PULSE_STARTER_PROJECT_V1)).toEqual(
      PADDLE_PULSE_STARTER_PROJECT_V1,
    );
    const program = resolvePaddlePulseProgram([]);
    expect(program.court).toMatchObject({ width: 640, height: 480 });
    expect(program.levels.levels).toHaveLength(3);
    expect(program.configuredCommandKinds).toEqual([]);
    expect(validatePaddlePulseProgram(program)).toEqual([]);
  });

  it("rejects oversized source without reflecting it", () => {
    expect(() => parsePaddlePulseProject({
      schemaVersion: "1",
      starterRevision: "test",
      source: "x".repeat(PADDLE_PULSE_RUNTIME_LIMITS_V1.maximumSourceBytes + 1),
    })).toThrow("PADDLE_PULSE_PROJECT_INVALID");
  });

  it("bounds every command and validates cross-command level geometry", () => {
    expect(() => parsePaddlePulseProgramCommand("ball", {
      radius: Number.NaN,
      speed: 300,
      maximumBounceAngleDegrees: 65,
    })).toThrow("PADDLE_PULSE_BALL_INVALID");
    expect(() => parsePaddlePulseProgramCommand("controls", {
      keyboard: ["ArrowLeft", "ArrowLeft"],
      pointer: "horizontal-drag",
    })).toThrow("PADDLE_PULSE_CONTROLS_INVALID");
    expect(() => resolvePaddlePulseProgram([
      parsePaddlePulseProgramCommand("bricks", {
        rows: 2,
        columns: 2,
        gap: 4,
        top: 64,
        side: 32,
        height: 20,
        rowScores: [5, 1],
      }),
    ])).toThrow("PADDLE_PULSE_LEVEL_LAYOUT_INVALID");
  });

  it("parses keyboard, touch and assessment input through one contract", () => {
    expect(parsePaddlePulseInputCommand({
      sequence: 1,
      action: "pointer",
      phase: "move",
      source: "touch",
      atTick: 4,
      pointerX: 320,
    })).toMatchObject({ action: "pointer", pointerX: 320 });
    expect(() => parsePaddlePulseInputCommand({
      sequence: 2,
      action: "pointer",
      phase: "move",
      source: "touch",
      atTick: 5,
    })).toThrow("PADDLE_PULSE_INPUT_INVALID");
  });

  it("accepts auto and nine manual slot IDs only", () => {
    expect(parsePaddlePulseSlotId("auto")).toBe("auto");
    expect(parsePaddlePulseSlotId("9")).toBe("9");
    expect(() => parsePaddlePulseSlotId("10")).toThrow(
      "PADDLE_PULSE_SLOT_ID_INVALID",
    );
  });
});
