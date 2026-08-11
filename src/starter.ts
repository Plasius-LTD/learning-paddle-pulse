import type { PaddlePulseProjectV1 } from "./types.js";

const starterSource = `// Paddle Pulse 2.0 — build one trusted-host system at a time.
// The preview uses a 640 × 480 logical court at a fixed 60 Hz.
configureCourt({ width: 640, height: 480, background: "#101936" });
configurePaddle({ width: 96, height: 16, speed: 420 });

// Mission 2: configureControls({ keyboard: [...], pointer: "horizontal-drag" });
// Mission 3: configureBall({ radius: 8, speed: 300, maximumBounceAngleDegrees: 65 });
// Mission 4: configureBricks({ rows, columns, gap, top, side, height, rowScores });
// Mission 5: configureRules({ initialLives, serveDelayTicks, levelClearBonus });
// Mission 6: configureLevels({ levels: [...] }); and configureSound({ cues: [...] });
`;

/** Immutable learner starting point for Paddle Pulse content 2.0.0. */
export const PADDLE_PULSE_STARTER_PROJECT_V1: PaddlePulseProjectV1 =
  Object.freeze({
    schemaVersion: "1",
    starterRevision: "paddle-pulse-2.0.0-starter.1",
    source: starterSource,
  });
