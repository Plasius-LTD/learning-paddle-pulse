import type { MissionStageKindV1 } from "@plasius/learning";

export const PADDLE_PULSE_COMMAND_KINDS = Object.freeze([
  "court",
  "paddle",
  "controls",
  "ball",
  "bricks",
  "rules",
  "levels",
  "sound",
] as const);

export type PaddlePulseCommandKindV1 =
  (typeof PADDLE_PULSE_COMMAND_KINDS)[number];

export interface PaddlePulseCourtConfigV1 {
  readonly width: number;
  readonly height: number;
  readonly background: string;
}

export interface PaddlePulsePaddleConfigV1 {
  readonly width: number;
  readonly height: number;
  readonly speed: number;
}

export interface PaddlePulseControlsConfigV1 {
  readonly keyboard: readonly ("ArrowLeft" | "ArrowRight" | "KeyA" | "KeyD")[];
  readonly pointer: "horizontal-drag";
}

export interface PaddlePulseBallConfigV1 {
  readonly radius: number;
  readonly speed: number;
  readonly maximumBounceAngleDegrees: number;
}

export interface PaddlePulseBrickConfigV1 {
  readonly rows: number;
  readonly columns: number;
  readonly gap: number;
  readonly top: number;
  readonly side: number;
  readonly height: number;
  readonly rowScores: readonly number[];
}

export interface PaddlePulseRulesConfigV1 {
  readonly initialLives: number;
  readonly serveDelayTicks: number;
  readonly levelClearBonus: number;
}

export interface PaddlePulseLevelV1 {
  readonly id: string;
  readonly layout: readonly string[];
  readonly speedMultiplier: number;
}

export interface PaddlePulseLevelsConfigV1 {
  readonly levels: readonly PaddlePulseLevelV1[];
}

export type PaddlePulseGeneratedCueV1 =
  | "bounce"
  | "brick"
  | "life-loss"
  | "level-clear"
  | "win";

export interface PaddlePulseSoundConfigV1 {
  readonly cues: readonly PaddlePulseGeneratedCueV1[];
}

export type PaddlePulseProgramCommandV1 =
  | { readonly kind: "court"; readonly value: PaddlePulseCourtConfigV1 }
  | { readonly kind: "paddle"; readonly value: PaddlePulsePaddleConfigV1 }
  | { readonly kind: "controls"; readonly value: PaddlePulseControlsConfigV1 }
  | { readonly kind: "ball"; readonly value: PaddlePulseBallConfigV1 }
  | { readonly kind: "bricks"; readonly value: PaddlePulseBrickConfigV1 }
  | { readonly kind: "rules"; readonly value: PaddlePulseRulesConfigV1 }
  | { readonly kind: "levels"; readonly value: PaddlePulseLevelsConfigV1 }
  | { readonly kind: "sound"; readonly value: PaddlePulseSoundConfigV1 };

/** Complete trusted-host game program resolved from bounded learner commands. */
export interface PaddlePulseProgramV1 {
  readonly schemaVersion: "1";
  readonly court: PaddlePulseCourtConfigV1;
  readonly paddle: PaddlePulsePaddleConfigV1;
  readonly controls: PaddlePulseControlsConfigV1;
  readonly ball: PaddlePulseBallConfigV1;
  readonly bricks: PaddlePulseBrickConfigV1;
  readonly rules: PaddlePulseRulesConfigV1;
  readonly levels: PaddlePulseLevelsConfigV1;
  readonly sound: PaddlePulseSoundConfigV1;
  readonly configuredCommandKinds: readonly PaddlePulseCommandKindV1[];
}

export interface PaddlePulseProjectV1 {
  readonly schemaVersion: "1";
  readonly starterRevision: string;
  readonly source: string;
}

export interface PaddlePulseRuntimeLimitsV1 {
  readonly tickRateHz: 60;
  readonly logicalWidth: 640;
  readonly logicalHeight: 480;
  readonly maximumSourceBytes: 32_768;
  readonly maximumCommands: 256;
  readonly memoryLimitBytes: 8_388_608;
  readonly stackLimitBytes: 262_144;
  readonly executionTimeoutMs: 250;
  readonly hardWorkerTimeoutMs: 5_000;
  readonly maximumCatchUpTicks: 5;
  readonly maximumBricks: 240;
  readonly maximumDrawCommands: 320;
}

export interface PaddlePulseStageV2 {
  readonly id: string;
  readonly kind: MissionStageKindV1;
  readonly title: string;
  readonly instruction: string;
  readonly artifactIds: readonly string[];
}

export interface PaddlePulseMissionV2 {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly estimatedMinutes: 60;
  readonly concepts: readonly string[];
  readonly reward: string;
  readonly stages: readonly PaddlePulseStageV2[];
  readonly learner: {
    readonly readinessPrompt: string;
    readonly goal: string;
    readonly accessibilityAlternatives: readonly string[];
  };
  readonly facilitator: {
    readonly protectedGoal: string;
    readonly protectedScenarioIds: readonly string[];
  };
}

export interface PaddlePulseModuleV2 {
  readonly schemaVersion: "2";
  readonly moduleId: "junior-coder.paddle-pulse";
  readonly moduleVersion: "2.0.0";
  readonly contentRevision: string;
  readonly title: "Paddle Pulse";
  readonly estimatedMinutes: 360;
  readonly navigation: "sequential-with-visible-final";
  readonly completionAuthority: "server-final-assessment";
  readonly completionScore: 80;
  readonly fullscreenUnlock: "historical-completion-and-successful-run";
  readonly missions: readonly PaddlePulseMissionV2[];
  readonly starterProject: PaddlePulseProjectV1;
  readonly runtimeLimits: PaddlePulseRuntimeLimitsV1;
  readonly optionalExtensions: readonly ["power-ups"];
}

export type PaddlePulseLearnerMissionV2 = Omit<
  PaddlePulseMissionV2,
  "facilitator"
>;

export interface PaddlePulseLearnerModuleV2
  extends Omit<PaddlePulseModuleV2, "missions"> {
  readonly missions: readonly PaddlePulseLearnerMissionV2[];
}

export interface PaddlePulseValidationIssueV1 {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export type PaddlePulseInputActionV1 =
  | "left"
  | "right"
  | "pointer"
  | "start"
  | "pause"
  | "restart";

export interface PaddlePulseInputCommandV1 {
  readonly sequence: number;
  readonly action: PaddlePulseInputActionV1;
  readonly phase: "pressed" | "released" | "move";
  readonly source: "keyboard" | "touch" | "assessment";
  readonly atTick: number;
  readonly pointerX?: number;
}

export type PaddlePulseGameStatusV1 =
  | "ready"
  | "playing"
  | "paused"
  | "life-lost"
  | "level-clear"
  | "won"
  | "game-over";

export interface PaddlePulseBrickV1 {
  readonly id: string;
  readonly row: number;
  readonly column: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly score: number;
  readonly active: boolean;
}

export interface PaddlePulseStateV1 {
  readonly schemaVersion: "1";
  readonly seed: number;
  readonly tick: number;
  readonly status: PaddlePulseGameStatusV1;
  readonly statusBeforePause?: Exclude<PaddlePulseGameStatusV1, "paused">;
  readonly score: number;
  readonly lives: number;
  readonly levelIndex: number;
  readonly serveTicksRemaining: number;
  readonly paddle: { readonly x: number; readonly y: number; readonly left: boolean; readonly right: boolean };
  readonly ball: { readonly x: number; readonly y: number; readonly vx: number; readonly vy: number };
  readonly bricks: readonly PaddlePulseBrickV1[];
  readonly pendingAudioCues: readonly PaddlePulseGeneratedCueV1[];
  readonly lastInputSequence: number;
}

export type PaddlePulseDrawCommandV1 =
  | { readonly kind: "rect"; readonly x: number; readonly y: number; readonly width: number; readonly height: number; readonly colour: string }
  | { readonly kind: "circle"; readonly x: number; readonly y: number; readonly radius: number; readonly colour: string }
  | { readonly kind: "text"; readonly x: number; readonly y: number; readonly text: string; readonly colour: string };

export interface PaddlePulseSemanticStateV1 {
  readonly statusText: string;
  readonly score: number;
  readonly lives: number;
  readonly level: number;
  readonly bricksRemaining: number;
  readonly paused: boolean;
  readonly gameOver: boolean;
}

export interface PaddlePulseFrameV1 {
  readonly tick: number;
  readonly drawCommands: readonly PaddlePulseDrawCommandV1[];
  readonly audioCues: readonly PaddlePulseGeneratedCueV1[];
  readonly semanticState: PaddlePulseSemanticStateV1;
}

export type PaddlePulseStageStateV1 =
  | "locked"
  | "available"
  | "in-progress"
  | "passed"
  | "mastery-satisfied";

export const PADDLE_PULSE_SLOT_IDS = Object.freeze([
  "auto",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
] as const);

export type PaddlePulseSlotIdV1 = (typeof PADDLE_PULSE_SLOT_IDS)[number];

export interface PaddlePulseAssessmentEvidenceReferenceV1 {
  readonly evidenceId: string;
  readonly missionId: string;
  readonly score: number;
  readonly issuedAt: string;
  readonly digest: string;
}

export interface PaddlePulseProgressSnapshotV1 {
  readonly schemaVersion: "1";
  readonly moduleVersion: "2.0.0";
  readonly source: string;
  readonly activeStageId: string;
  readonly stageStates: Readonly<Record<string, PaddlePulseStageStateV1>>;
  readonly assessmentEvidence: readonly PaddlePulseAssessmentEvidenceReferenceV1[];
  readonly sourceDigest: string;
}

export interface PaddlePulseSaveSlotV1 {
  readonly schemaVersion: "1";
  readonly slotId: PaddlePulseSlotIdV1;
  readonly label: string;
  readonly snapshot: PaddlePulseProgressSnapshotV1;
  readonly revision: number;
  readonly etag: string;
  readonly savedAt: string;
}

export interface PaddlePulseCompletionV1 {
  readonly schemaVersion: "1";
  readonly moduleVersion: "2.0.0";
  readonly earnedAt: string;
  readonly bestFinalScore: number;
  readonly evidenceDigest: string;
}

export type PaddlePulseAssessmentScopeV1 =
  | { readonly kind: "mission"; readonly missionId: string }
  | { readonly kind: "final" };

export interface PaddlePulseAssessmentResultV1 {
  readonly schemaVersion: "1";
  readonly outcome: "completed" | "error" | "timeout";
  readonly score: number;
  readonly completed: boolean;
  readonly passedGoalIds: readonly string[];
  readonly failedGoalIds: readonly string[];
  readonly criterionFeedback: readonly { readonly goalId: string; readonly passed: boolean; readonly message: string }[];
  readonly errorCode?: string;
}

export interface PaddlePulseExecutionResultV1 {
  readonly schemaVersion: "1";
  readonly outcome: "completed" | "error" | "timeout";
  readonly boundary: "quickjs-wasm-v2";
  readonly commands: readonly PaddlePulseProgramCommandV1[];
  readonly program?: PaddlePulseProgramV1;
  readonly errorCode?: string;
}

export interface PaddlePulseEvaluatorOptionsV1 {
  readonly executionTimeoutMs?: number;
  readonly memoryLimitBytes?: number;
  readonly stackLimitBytes?: number;
  readonly maximumCommands?: number;
}
