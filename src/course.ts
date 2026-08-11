import type { MissionStageKindV1 } from "@plasius/learning";
import { PADDLE_PULSE_STARTER_PROJECT_V1 } from "./starter.js";
import type {
  PaddlePulseLearnerModuleV2,
  PaddlePulseMissionV2,
  PaddlePulseModuleV2,
  PaddlePulseRuntimeLimitsV1,
} from "./types.js";

export const PADDLE_PULSE_STAGE_ORDER_V2 = Object.freeze([
  "learn",
  "predict",
  "build",
  "run",
  "assess",
  "inspect",
  "fix",
  "explain",
  "reward",
] as const satisfies readonly MissionStageKindV1[]);

export const PADDLE_PULSE_RUNTIME_LIMITS_V1: PaddlePulseRuntimeLimitsV1 =
  Object.freeze({
    tickRateHz: 60,
    logicalWidth: 640,
    logicalHeight: 480,
    maximumSourceBytes: 32_768,
    maximumCommands: 256,
    memoryLimitBytes: 8_388_608,
    stackLimitBytes: 262_144,
    executionTimeoutMs: 250,
    hardWorkerTimeoutMs: 5_000,
    maximumCatchUpTicks: 5,
    maximumBricks: 240,
    maximumDrawCommands: 320,
  });

interface MissionSeed {
  readonly id: string;
  readonly shortId: string;
  readonly title: string;
  readonly summary: string;
  readonly concepts: readonly string[];
  readonly readinessPrompt: string;
  readonly goal: string;
  readonly protectedGoal: string;
  readonly reward: string;
}

const missionSeeds: readonly MissionSeed[] = [
  {
    id: "paddle-pulse-court-coordinates",
    shortId: "court",
    title: "Court & Coordinates",
    summary: "Map the logical court and first render loop, then draw a bounded paddle and ball.",
    concepts: ["coordinates", "canvas primitives", "game loops", "bounds"],
    readinessPrompt: "Which coordinate changes when an object moves down the court?",
    goal: "Configure and explain a responsive 640 × 480 logical court with a bounded paddle and ball.",
    protectedGoal: "The court, paddle and initial frame remain finite, visible and inside every logical edge.",
    reward: "Court Builder",
  },
  {
    id: "paddle-pulse-paddle-controls",
    shortId: "controls",
    title: "Paddle Controls",
    summary: "Connect equivalent keyboard and direct horizontal pointer-drag input paths.",
    concepts: ["input state", "Pointer Events", "keyboard events", "clamping"],
    readinessPrompt: "What should happen when the paddle reaches the left or right court edge?",
    goal: "Configure Arrow/A/D and direct pointer-drag controls that clamp the paddle to the court.",
    protectedGoal: "Keyboard and pointer sequences produce equivalent, bounded movement without drift.",
    reward: "Paddle Pilot",
  },
  {
    id: "paddle-pulse-ball-motion",
    shortId: "motion",
    title: "Ball Motion & Bounces",
    summary: "Use velocity, a fixed timestep, contact normals and paddle angles to create a rally.",
    concepts: ["velocity", "fixed timesteps", "reflection", "contact normals", "paddle angles"],
    readinessPrompt: "Which velocity component changes when the ball hits a vertical wall?",
    goal: "Configure deterministic ball motion and control its wall and paddle reflections.",
    protectedGoal: "Protected trajectories avoid tunnelling and repeated contact for every tested seed.",
    reward: "Rally Master",
  },
  {
    id: "paddle-pulse-bricks-collisions",
    shortId: "bricks",
    title: "Bricks & Collisions",
    summary: "Build an original brick grid with arrays, loops and deterministic collision resolution.",
    concepts: ["arrays", "loops", "grids", "AABB collision", "collision resolution"],
    readinessPrompt: "How can one row and column pair locate a brick without searching the whole court?",
    goal: "Configure a bounded brick grid whose bricks score once and disappear on impact.",
    protectedGoal: "Face, corner and adjacent-brick impacts never double-score or leave invalid state.",
    reward: "Brick Breaker",
  },
  {
    id: "paddle-pulse-score-lives-states",
    shortId: "states",
    title: "Score, Lives & States",
    summary: "Use a state machine for serving, play, pause, life loss, level clear and game over.",
    concepts: ["state machines", "invariants", "scoring", "lives", "HUD state"],
    readinessPrompt: "Which values survive a lost life, and which values reset for the next serve?",
    goal: "Configure lives and bonuses while preserving legal state transitions and score invariants.",
    protectedGoal: "Every protected transition is legal, monotonic where required and replayable.",
    reward: "Game Keeper",
  },
  {
    id: "paddle-pulse-levels-final-game",
    shortId: "final",
    title: "Levels, Sound & Final Game",
    summary: "Assemble original levels, responsive rendering, generated cues and the integrated challenge.",
    concepts: ["level data", "difficulty", "responsive rendering", "accessible audio", "testing"],
    readinessPrompt: "Why should sound report an event without deciding whether that event happened?",
    goal: "Build multiple original levels, optional generated cues and a complete accessible game.",
    protectedGoal: "The integrated game passes the server-only deterministic challenge and sandbox limits.",
    reward: "Paddle Pulse Champion",
  },
] as const;

const stageTitles: Readonly<Record<MissionStageKindV1, string>> = Object.freeze({
  learn: "Learn the system",
  predict: "Predict the next state",
  build: "Build the program",
  run: "Run the preview",
  assess: "Assess the evidence",
  inspect: "Inspect the replay",
  fix: "Fix one cause",
  explain: "Explain the rule",
  reward: "Earn the mission reward",
});

const stageInstructions: Readonly<Record<MissionStageKindV1, string>> =
  Object.freeze({
    learn: "Read the model and identify the state, coordinates and invariant this mission owns.",
    predict: "Record what the next protected input should change before you run it.",
    build: "Add the bounded configuration and code needed for this mission outcome.",
    run: "Run a fresh sandbox and compare the preview with your prediction.",
    assess: "Submit the current source to the independent deterministic mission assessment.",
    inspect: "Use semantic state, event traces and the replay to locate the first mismatch.",
    fix: "Change the smallest responsible rule, then repeat the same scenario.",
    explain: "Describe how input, update, collision and visible output connect.",
    reward: "Record the reward after scoring at least 80, then unlock the next mission.",
  });

function missionFromSeed(seed: MissionSeed, index: number): PaddlePulseMissionV2 {
  return {
    id: seed.id,
    title: seed.title,
    summary: seed.summary,
    estimatedMinutes: 60,
    concepts: seed.concepts,
    reward: seed.reward,
    stages: PADDLE_PULSE_STAGE_ORDER_V2.map((kind, stageIndex) => ({
      id: `paddle-pulse-m${index + 1}-${seed.shortId}-${String(stageIndex + 1).padStart(2, "0")}-${kind}`,
      kind,
      title: stageTitles[kind],
      instruction: `${stageInstructions[kind]} Mission ${index + 1}: ${seed.title}.`,
      artifactIds: [`paddle-pulse-m${index + 1}-${seed.shortId}-${kind}`],
    })),
    learner: {
      readinessPrompt: seed.readinessPrompt,
      goal: seed.goal,
      accessibilityAlternatives: [
        "Keyboard and touch commands enter the same ordered input model.",
        "Semantic status, score, lives, level and brick counts do not rely on colour, motion or sound.",
        "Generated audio cues can be muted and never affect assessment scoring.",
      ],
    },
    facilitator: {
      protectedGoal: seed.protectedGoal,
      protectedScenarioIds: [
        `paddle-pulse-${seed.shortId}-nominal`,
        `paddle-pulse-${seed.shortId}-edge`,
        `paddle-pulse-${seed.shortId}-bounded`,
      ],
    },
  };
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }
  Object.freeze(value);
  for (const nested of Object.values(value as Record<string, unknown>)) {
    deepFreeze(nested);
  }
  return value;
}

/** Immutable package-owned Paddle Pulse content contract. */
export const PADDLE_PULSE_MODULE_V2: PaddlePulseModuleV2 = deepFreeze({
  schemaVersion: "2",
  moduleId: "junior-coder.paddle-pulse",
  moduleVersion: "2.0.0",
  contentRevision: "2026-08-11.1",
  title: "Paddle Pulse",
  estimatedMinutes: 360,
  navigation: "sequential-with-visible-final",
  completionAuthority: "server-final-assessment",
  completionScore: 80,
  fullscreenUnlock: "historical-completion-and-successful-run",
  missions: missionSeeds.map(missionFromSeed),
  starterProject: PADDLE_PULSE_STARTER_PROJECT_V1,
  runtimeLimits: PADDLE_PULSE_RUNTIME_LIMITS_V1,
  optionalExtensions: ["power-ups"],
});

/** Stable, ordered manifest of all 54 stage records. */
export const PADDLE_PULSE_STAGE_MANIFEST_V2 = Object.freeze(
  PADDLE_PULSE_MODULE_V2.missions.flatMap((mission) => mission.stages),
);

/** Stable ordered stage IDs for persistence and navigation. */
export const PADDLE_PULSE_STAGE_IDS_V2 = Object.freeze(
  PADDLE_PULSE_STAGE_MANIFEST_V2.map((stage) => stage.id),
);

/** Remove all facilitator and protected-scenario material from a client payload. */
export function createPaddlePulseLearnerModuleProjection(
  module: PaddlePulseModuleV2,
): PaddlePulseLearnerModuleV2 {
  return deepFreeze({
    ...module,
    missions: module.missions.map(({ facilitator: _facilitator, ...mission }) =>
      mission),
  });
}
