import type { PaddlePulseProjectV1 } from "../src/index.js";

export const COMPLETE_PADDLE_PULSE_SOURCE = `
configureCourt({ width: 640, height: 480, background: "#101936" });
configurePaddle({ width: 96, height: 16, speed: 420 });
configureControls({ keyboard: ["ArrowLeft", "ArrowRight", "KeyA", "KeyD"], pointer: "horizontal-drag" });
configureBall({ radius: 8, speed: 300, maximumBounceAngleDegrees: 65 });
configureBricks({ rows: 6, columns: 10, gap: 4, top: 64, side: 32, height: 20, rowScores: [7, 7, 5, 5, 3, 1] });
configureRules({ initialLives: 3, serveDelayTicks: 45, levelClearBonus: 100 });
configureLevels({ levels: [
  { id: "pulse-one", layout: ["1111111111", "1111111111", "1111111111", "1111111111", "1111111111", "1111111111"], speedMultiplier: 1 },
  { id: "pulse-two", layout: ["1010101010", "0111111110", "1110011111", "1110011111", "0111111110", "1010101010"], speedMultiplier: 1.12 },
  { id: "pulse-three", layout: ["0001111000", "0011111100", "0111111110", "1111111111", "0110110110", "0011001100"], speedMultiplier: 1.25 }
] });
configureSound({ cues: ["bounce", "brick", "life-loss", "level-clear", "win"] });
`;

export const COMPLETE_PADDLE_PULSE_PROJECT: PaddlePulseProjectV1 = {
  schemaVersion: "1",
  starterRevision: "test-complete.1",
  source: COMPLETE_PADDLE_PULSE_SOURCE,
};
