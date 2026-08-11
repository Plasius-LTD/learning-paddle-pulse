import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  PADDLE_PULSE_MODULE_V2,
  PADDLE_PULSE_STAGE_IDS_V2,
  PADDLE_PULSE_STAGE_MANIFEST_V2,
  PADDLE_PULSE_STAGE_ORDER_V2,
  createPaddlePulseLearnerModuleProjection,
  validatePaddlePulseModule,
} from "../src/index.js";

describe("Paddle Pulse 2.0 course", () => {
  it("publishes six missions and exactly 54 unique canonical stages", () => {
    expect(PADDLE_PULSE_MODULE_V2.moduleVersion).toBe("2.0.0");
    expect(PADDLE_PULSE_MODULE_V2.missions).toHaveLength(6);
    expect(PADDLE_PULSE_STAGE_MANIFEST_V2).toHaveLength(54);
    expect(PADDLE_PULSE_STAGE_IDS_V2).toHaveLength(54);
    expect(new Set(PADDLE_PULSE_STAGE_IDS_V2)).toHaveLength(54);
    for (const mission of PADDLE_PULSE_MODULE_V2.missions) {
      expect(mission.stages.map((stage) => stage.kind)).toEqual(
        PADDLE_PULSE_STAGE_ORDER_V2,
      );
    }
    expect(validatePaddlePulseModule(PADDLE_PULSE_MODULE_V2)).toEqual([]);
  });

  it("keeps the final challenge visible while declaring sequential navigation", () => {
    expect(PADDLE_PULSE_MODULE_V2.navigation).toBe("sequential-with-visible-final");
    expect(PADDLE_PULSE_MODULE_V2.completionScore).toBe(80);
    expect(PADDLE_PULSE_MODULE_V2.missions.at(-1)?.title).toBe(
      "Levels, Sound & Final Game",
    );
    expect(PADDLE_PULSE_MODULE_V2.optionalExtensions).toEqual(["power-ups"]);
  });

  it("keeps the canonical content digest stable for exact catalog references", () => {
    const digest = createHash("sha256")
      .update(JSON.stringify(PADDLE_PULSE_MODULE_V2))
      .digest("hex");
    expect(digest).toBe(
      "19f3666bdb523a3faf069341b0bc748996b3db282f89171e3c9f0a373a8c8f7e",
    );
  });

  it("removes protected goals and scenario identifiers from learner data", () => {
    const learner = createPaddlePulseLearnerModuleProjection(
      PADDLE_PULSE_MODULE_V2,
    );
    const serialized = JSON.stringify(learner);
    expect(serialized).not.toContain("facilitator");
    expect(serialized).not.toContain("protectedScenarioIds");
    expect(learner.missions).toHaveLength(6);
  });

  it("rejects duplicate IDs and non-canonical stage ordering", () => {
    const mutable = structuredClone(PADDLE_PULSE_MODULE_V2);
    mutable.missions[0]!.stages[0]!.id = mutable.missions[0]!.stages[1]!.id;
    mutable.missions[1]!.stages[0]!.kind = "predict";
    const issues = validatePaddlePulseModule(mutable);
    expect(issues.map((entry) => entry.code)).toEqual(
      expect.arrayContaining(["duplicate-stage-id", "invalid-stage-order"]),
    );
  });
});
