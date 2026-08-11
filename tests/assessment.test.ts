import { describe, expect, it } from "vitest";
import { executePaddlePulseProject } from "../src/index.js";
import { assessPaddlePulseProject } from "../src/server.js";
import {
  COMPLETE_PADDLE_PULSE_PROJECT,
  COMPLETE_PADDLE_PULSE_SOURCE,
} from "./fixtures.js";

describe("bounded QuickJS program execution", () => {
  it("emits eight declarative commands and a complete trusted program", async () => {
    const result = await executePaddlePulseProject(COMPLETE_PADDLE_PULSE_PROJECT);
    expect(result.outcome).toBe("completed");
    expect(result.commands).toHaveLength(8);
    expect(result.program?.configuredCommandKinds).toEqual([
      "court", "paddle", "controls", "ball", "bricks", "rules", "levels", "sound",
    ]);
  });

  it("has no DOM, network or storage globals and sanitizes failures", async () => {
    for (const name of ["document", "fetch", "localStorage", "indexedDB"]) {
      const result = await executePaddlePulseProject({
        schemaVersion: "1",
        starterRevision: "isolation-test",
        source: `if (typeof ${name} !== "undefined") throw new Error("LEAK");\n${COMPLETE_PADDLE_PULSE_SOURCE}`,
      });
      expect(result.outcome).toBe("completed");
    }
    const failed = await executePaddlePulseProject({
      schemaVersion: "1",
      starterRevision: "failure-test",
      source: "throw new Error('do-not-reflect-this');",
    });
    expect(failed).toMatchObject({
      outcome: "error",
      errorCode: "PADDLE_PULSE_EVALUATION_FAILED",
    });
    expect(JSON.stringify(failed)).not.toContain("do-not-reflect-this");
  });

  it("stops infinite work and command floods", async () => {
    const timeout = await executePaddlePulseProject({
      schemaVersion: "1",
      starterRevision: "timeout-test",
      source: "while (true) {}",
    }, { executionTimeoutMs: 10 });
    expect(timeout.outcome).toBe("timeout");

    const flood = await executePaddlePulseProject({
      schemaVersion: "1",
      starterRevision: "command-test",
      source: "for (let i = 0; i < 300; i += 1) configureCourt({ width: 640, height: 480, background: '#101936' });",
    });
    expect(flood.outcome).toBe("error");
    expect(flood.commands).toHaveLength(256);
  });
});

describe("server-only protected assessment", () => {
  it("scores all mission and final criteria for the integrated game", async () => {
    for (const missionId of [
      "paddle-pulse-court-coordinates",
      "paddle-pulse-paddle-controls",
      "paddle-pulse-ball-motion",
      "paddle-pulse-bricks-collisions",
      "paddle-pulse-score-lives-states",
      "paddle-pulse-levels-final-game",
    ]) {
      const mission = await assessPaddlePulseProject(
        COMPLETE_PADDLE_PULSE_PROJECT,
        { kind: "mission", missionId },
      );
      expect(mission.score, missionId).toBe(100);
      expect(mission.failedGoalIds, missionId).toEqual([]);
    }
    const final = await assessPaddlePulseProject(
      COMPLETE_PADDLE_PULSE_PROJECT,
      { kind: "final" },
    );
    expect(final).toMatchObject({ outcome: "completed", score: 100, completed: true });
  });

  it("allows the 80-point fast path while keeping protected scripts private", async () => {
    const sourceWithoutRules = COMPLETE_PADDLE_PULSE_SOURCE.replace(
      /configureRules\([^\n]+\);/u,
      "",
    );
    const result = await assessPaddlePulseProject({
      ...COMPLETE_PADDLE_PULSE_PROJECT,
      source: sourceWithoutRules,
    }, { kind: "final" });
    expect(result.score).toBe(85);
    expect(result.completed).toBe(true);
    expect(JSON.stringify(result)).not.toContain("protectedScenario");
    expect(JSON.stringify(result)).not.toContain("atTick");
  });

  it("does not count sound as assessment-critical", async () => {
    const result = await assessPaddlePulseProject({
      ...COMPLETE_PADDLE_PULSE_PROJECT,
      source: COMPLETE_PADDLE_PULSE_SOURCE.replace(/configureSound\([^;]+\);/u, ""),
    }, { kind: "final" });
    expect(result.score).toBe(100);
    expect(result.completed).toBe(true);
  });
});
