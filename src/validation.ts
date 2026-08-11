import {
  PADDLE_PULSE_COMMAND_KINDS,
  PADDLE_PULSE_SLOT_IDS,
  type PaddlePulseBallConfigV1,
  type PaddlePulseBrickConfigV1,
  type PaddlePulseControlsConfigV1,
  type PaddlePulseCourtConfigV1,
  type PaddlePulseInputCommandV1,
  type PaddlePulseLevelV1,
  type PaddlePulseLevelsConfigV1,
  type PaddlePulseModuleV2,
  type PaddlePulsePaddleConfigV1,
  type PaddlePulseProgramCommandV1,
  type PaddlePulseProgramV1,
  type PaddlePulseProjectV1,
  type PaddlePulseRulesConfigV1,
  type PaddlePulseSlotIdV1,
  type PaddlePulseSoundConfigV1,
  type PaddlePulseValidationIssueV1,
} from "./types.js";
import {
  PADDLE_PULSE_RUNTIME_LIMITS_V1,
  PADDLE_PULSE_STAGE_ORDER_V2,
} from "./course.js";

const encoder = new TextEncoder();
const colourPattern = /^#[0-9a-f]{6}$/iu;
const identifierPattern = /^[a-z0-9][a-z0-9-]{0,63}$/u;
const keyboardKeys = new Set(["ArrowLeft", "ArrowRight", "KeyA", "KeyD"]);
const cueIds = new Set(["bounce", "brick", "life-loss", "level-clear", "win"]);
const commandKinds = new Set<string>(PADDLE_PULSE_COMMAND_KINDS);
const inputActions = new Set(["left", "right", "pointer", "start", "pause", "restart"]);
const inputSources = new Set(["keyboard", "touch", "assessment"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === "number"
    && Number.isFinite(value)
    && value >= minimum
    && value <= maximum;
}

function finiteInteger(value: unknown, minimum: number, maximum: number): value is number {
  return finiteNumber(value, minimum, maximum) && Number.isInteger(value);
}

function keysExactly(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && actual.every((key) => keys.includes(key));
}

function issue(code: string, path: string, message: string): PaddlePulseValidationIssueV1 {
  return { code, path, message };
}

function parseCourt(value: unknown): PaddlePulseCourtConfigV1 {
  if (
    !isRecord(value)
    || !keysExactly(value, ["width", "height", "background"])
    || !finiteInteger(value.width, 320, 1_024)
    || !finiteInteger(value.height, 240, 768)
    || typeof value.background !== "string"
    || !colourPattern.test(value.background)
  ) throw new Error("PADDLE_PULSE_COURT_INVALID");
  return Object.freeze({ width: value.width, height: value.height, background: value.background.toLowerCase() });
}

function parsePaddle(value: unknown): PaddlePulsePaddleConfigV1 {
  if (
    !isRecord(value)
    || !keysExactly(value, ["width", "height", "speed"])
    || !finiteInteger(value.width, 48, 240)
    || !finiteInteger(value.height, 8, 40)
    || !finiteNumber(value.speed, 60, 1_200)
  ) throw new Error("PADDLE_PULSE_PADDLE_INVALID");
  return Object.freeze({ width: value.width, height: value.height, speed: value.speed });
}

function parseControls(value: unknown): PaddlePulseControlsConfigV1 {
  if (
    !isRecord(value)
    || !keysExactly(value, ["keyboard", "pointer"])
    || !Array.isArray(value.keyboard)
    || value.keyboard.length < 2
    || value.keyboard.length > 4
    || value.keyboard.some((key) => typeof key !== "string" || !keyboardKeys.has(key))
    || new Set(value.keyboard).size !== value.keyboard.length
    || value.pointer !== "horizontal-drag"
  ) throw new Error("PADDLE_PULSE_CONTROLS_INVALID");
  return Object.freeze({
    keyboard: Object.freeze([...value.keyboard]) as PaddlePulseControlsConfigV1["keyboard"],
    pointer: "horizontal-drag",
  });
}

function parseBall(value: unknown): PaddlePulseBallConfigV1 {
  if (
    !isRecord(value)
    || !keysExactly(value, ["radius", "speed", "maximumBounceAngleDegrees"])
    || !finiteNumber(value.radius, 4, 20)
    || !finiteNumber(value.speed, 120, 720)
    || !finiteNumber(value.maximumBounceAngleDegrees, 30, 75)
  ) throw new Error("PADDLE_PULSE_BALL_INVALID");
  return Object.freeze({
    radius: value.radius,
    speed: value.speed,
    maximumBounceAngleDegrees: value.maximumBounceAngleDegrees,
  });
}

function parseBricks(value: unknown): PaddlePulseBrickConfigV1 {
  if (
    !isRecord(value)
    || !keysExactly(value, ["rows", "columns", "gap", "top", "side", "height", "rowScores"])
    || !finiteInteger(value.rows, 1, 12)
    || !finiteInteger(value.columns, 1, 20)
    || value.rows * value.columns > PADDLE_PULSE_RUNTIME_LIMITS_V1.maximumBricks
    || !finiteNumber(value.gap, 0, 12)
    || !finiteNumber(value.top, 32, 220)
    || !finiteNumber(value.side, 8, 120)
    || !finiteNumber(value.height, 8, 40)
    || !Array.isArray(value.rowScores)
    || value.rowScores.length !== value.rows
    || value.rowScores.some((score) => !finiteInteger(score, 1, 100))
  ) throw new Error("PADDLE_PULSE_BRICKS_INVALID");
  return Object.freeze({
    rows: value.rows,
    columns: value.columns,
    gap: value.gap,
    top: value.top,
    side: value.side,
    height: value.height,
    rowScores: Object.freeze([...value.rowScores]) as readonly number[],
  });
}

function parseRules(value: unknown): PaddlePulseRulesConfigV1 {
  if (
    !isRecord(value)
    || !keysExactly(value, ["initialLives", "serveDelayTicks", "levelClearBonus"])
    || !finiteInteger(value.initialLives, 1, 9)
    || !finiteInteger(value.serveDelayTicks, 0, 300)
    || !finiteInteger(value.levelClearBonus, 0, 10_000)
  ) throw new Error("PADDLE_PULSE_RULES_INVALID");
  return Object.freeze({
    initialLives: value.initialLives,
    serveDelayTicks: value.serveDelayTicks,
    levelClearBonus: value.levelClearBonus,
  });
}

function parseLevel(value: unknown): PaddlePulseLevelV1 {
  if (
    !isRecord(value)
    || !keysExactly(value, ["id", "layout", "speedMultiplier"])
    || typeof value.id !== "string"
    || !identifierPattern.test(value.id)
    || !Array.isArray(value.layout)
    || value.layout.length < 1
    || value.layout.length > 12
    || value.layout.some((row) => typeof row !== "string" || row.length < 1 || row.length > 20 || !/^[01]+$/u.test(row))
    || new Set(value.layout.map((row) => row.length)).size !== 1
    || !finiteNumber(value.speedMultiplier, 0.75, 2)
  ) throw new Error("PADDLE_PULSE_LEVEL_INVALID");
  return Object.freeze({
    id: value.id,
    layout: Object.freeze([...value.layout]) as readonly string[],
    speedMultiplier: value.speedMultiplier,
  });
}

function parseLevels(value: unknown): PaddlePulseLevelsConfigV1 {
  if (
    !isRecord(value)
    || !keysExactly(value, ["levels"])
    || !Array.isArray(value.levels)
    || value.levels.length < 1
    || value.levels.length > 12
  ) throw new Error("PADDLE_PULSE_LEVELS_INVALID");
  const levels = value.levels.map(parseLevel);
  if (new Set(levels.map((level) => level.id)).size !== levels.length) {
    throw new Error("PADDLE_PULSE_LEVEL_IDS_INVALID");
  }
  return Object.freeze({ levels: Object.freeze(levels) });
}

function parseSound(value: unknown): PaddlePulseSoundConfigV1 {
  if (
    !isRecord(value)
    || !keysExactly(value, ["cues"])
    || !Array.isArray(value.cues)
    || value.cues.length > 5
    || value.cues.some((cue) => typeof cue !== "string" || !cueIds.has(cue))
    || new Set(value.cues).size !== value.cues.length
  ) throw new Error("PADDLE_PULSE_SOUND_INVALID");
  return Object.freeze({ cues: Object.freeze([...value.cues]) as PaddlePulseSoundConfigV1["cues"] });
}

/** Parse one host command without preserving an unsafe learner object. */
export function parsePaddlePulseProgramCommand(
  kind: unknown,
  value: unknown,
): PaddlePulseProgramCommandV1 {
  if (typeof kind !== "string" || !commandKinds.has(kind)) {
    throw new Error("PADDLE_PULSE_COMMAND_INVALID");
  }
  if (kind === "court") return { kind, value: parseCourt(value) };
  if (kind === "paddle") return { kind, value: parsePaddle(value) };
  if (kind === "controls") return { kind, value: parseControls(value) };
  if (kind === "ball") return { kind, value: parseBall(value) };
  if (kind === "bricks") return { kind, value: parseBricks(value) };
  if (kind === "rules") return { kind, value: parseRules(value) };
  if (kind === "levels") return { kind, value: parseLevels(value) };
  return { kind: "sound", value: parseSound(value) };
}

const defaultProgram: Omit<PaddlePulseProgramV1, "configuredCommandKinds"> = Object.freeze({
  schemaVersion: "1",
  court: Object.freeze({ width: 640, height: 480, background: "#101936" }),
  paddle: Object.freeze({ width: 96, height: 16, speed: 420 }),
  controls: Object.freeze({
    keyboard: Object.freeze(["ArrowLeft", "ArrowRight", "KeyA", "KeyD"]) as PaddlePulseControlsConfigV1["keyboard"],
    pointer: "horizontal-drag",
  }),
  ball: Object.freeze({ radius: 8, speed: 300, maximumBounceAngleDegrees: 65 }),
  bricks: Object.freeze({ rows: 6, columns: 10, gap: 4, top: 64, side: 32, height: 20, rowScores: Object.freeze([7, 7, 5, 5, 3, 1]) }),
  rules: Object.freeze({ initialLives: 3, serveDelayTicks: 45, levelClearBonus: 100 }),
  levels: Object.freeze({ levels: Object.freeze([
    Object.freeze({ id: "pulse-one", layout: Object.freeze(["1111111111", "1111111111", "1111111111", "1111111111", "1111111111", "1111111111"]), speedMultiplier: 1 }),
    Object.freeze({ id: "pulse-two", layout: Object.freeze(["1010101010", "0111111110", "1110011111", "1110011111", "0111111110", "1010101010"]), speedMultiplier: 1.12 }),
    Object.freeze({ id: "pulse-three", layout: Object.freeze(["0001111000", "0011111100", "0111111110", "1111111111", "0110110110", "0011001100"]), speedMultiplier: 1.25 }),
  ]) }),
  sound: Object.freeze({
    cues: Object.freeze(["bounce", "brick", "life-loss", "level-clear", "win"]) as PaddlePulseSoundConfigV1["cues"],
  }),
});

/** Resolve the last command of each kind over safe preview defaults. */
export function resolvePaddlePulseProgram(
  commands: readonly PaddlePulseProgramCommandV1[],
): PaddlePulseProgramV1 {
  if (commands.length > PADDLE_PULSE_RUNTIME_LIMITS_V1.maximumCommands) {
    throw new Error("PADDLE_PULSE_COMMAND_LIMIT");
  }
  const values = { ...defaultProgram } as {
    -readonly [Key in keyof typeof defaultProgram]: (typeof defaultProgram)[Key]
  };
  const configured = new Set<string>();
  for (const commandValue of commands) {
    const command = parsePaddlePulseProgramCommand(commandValue.kind, commandValue.value);
    configured.add(command.kind);
    if (command.kind === "court") values.court = command.value;
    else if (command.kind === "paddle") values.paddle = command.value;
    else if (command.kind === "controls") values.controls = command.value;
    else if (command.kind === "ball") values.ball = command.value;
    else if (command.kind === "bricks") values.bricks = command.value;
    else if (command.kind === "rules") values.rules = command.value;
    else if (command.kind === "levels") values.levels = command.value;
    else values.sound = command.value;
  }
  const program: PaddlePulseProgramV1 = Object.freeze({
    ...values,
    configuredCommandKinds: Object.freeze(
      PADDLE_PULSE_COMMAND_KINDS.filter((kind) => configured.has(kind)),
    ),
  });
  const issues = validatePaddlePulseProgram(program);
  if (issues.length > 0) throw new Error(issues[0]?.code ?? "PADDLE_PULSE_PROGRAM_INVALID");
  return program;
}

/** Validate cross-command program invariants. */
export function validatePaddlePulseProgram(
  program: PaddlePulseProgramV1,
): PaddlePulseValidationIssueV1[] {
  const issues: PaddlePulseValidationIssueV1[] = [];
  if (program.schemaVersion !== "1") {
    issues.push(issue("PADDLE_PULSE_PROGRAM_SCHEMA_INVALID", "schemaVersion", "Program schema version must be 1."));
  }
  const playableWidth = program.court.width - program.bricks.side * 2;
  const brickWidth = (playableWidth - program.bricks.gap * (program.bricks.columns - 1)) / program.bricks.columns;
  if (!Number.isFinite(brickWidth) || brickWidth < 8) {
    issues.push(issue("PADDLE_PULSE_BRICK_WIDTH_INVALID", "bricks", "Brick geometry must fit the court."));
  }
  const brickBottom = program.bricks.top
    + program.bricks.rows * program.bricks.height
    + (program.bricks.rows - 1) * program.bricks.gap;
  if (brickBottom >= program.court.height - 120) {
    issues.push(issue("PADDLE_PULSE_BRICK_FIELD_INVALID", "bricks", "The brick field must leave a rally area."));
  }
  if (program.paddle.width >= program.court.width - 16) {
    issues.push(issue("PADDLE_PULSE_PADDLE_GEOMETRY_INVALID", "paddle.width", "The paddle must move inside the court."));
  }
  for (const [index, level] of program.levels.levels.entries()) {
    if (
      level.layout.length !== program.bricks.rows
      || level.layout.some((row) => row.length !== program.bricks.columns)
    ) {
      issues.push(issue("PADDLE_PULSE_LEVEL_LAYOUT_INVALID", `levels.levels[${index}].layout`, "Every level layout must match the brick grid."));
    }
    if (!level.layout.some((row) => row.includes("1"))) {
      issues.push(issue("PADDLE_PULSE_LEVEL_EMPTY", `levels.levels[${index}].layout`, "Every level needs at least one brick."));
    }
  }
  return issues;
}

/** Parse and bound learner source before either browser or server execution. */
export function parsePaddlePulseProject(value: unknown): PaddlePulseProjectV1 {
  if (
    !isRecord(value)
    || value.schemaVersion !== "1"
    || typeof value.starterRevision !== "string"
    || value.starterRevision.length < 1
    || value.starterRevision.length > 120
    || typeof value.source !== "string"
    || value.source.length < 1
    || encoder.encode(value.source).byteLength > PADDLE_PULSE_RUNTIME_LIMITS_V1.maximumSourceBytes
  ) throw new Error("PADDLE_PULSE_PROJECT_INVALID");
  return Object.freeze({
    schemaVersion: "1",
    starterRevision: value.starterRevision,
    source: value.source,
  });
}

/** Parse one input command before it reaches the engine. */
export function parsePaddlePulseInputCommand(value: unknown): PaddlePulseInputCommandV1 {
  if (
    !isRecord(value)
    || !finiteInteger(value.sequence, 0, Number.MAX_SAFE_INTEGER)
    || typeof value.action !== "string"
    || !inputActions.has(value.action)
    || (value.phase !== "pressed" && value.phase !== "released" && value.phase !== "move")
    || typeof value.source !== "string"
    || !inputSources.has(value.source)
    || !finiteInteger(value.atTick, 0, Number.MAX_SAFE_INTEGER)
    || (value.pointerX !== undefined && !finiteNumber(value.pointerX, -1_024, 2_048))
    || (value.action === "pointer" && value.phase === "move" && value.pointerX === undefined)
  ) throw new Error("PADDLE_PULSE_INPUT_INVALID");
  return Object.freeze({
    sequence: value.sequence,
    action: value.action as PaddlePulseInputCommandV1["action"],
    phase: value.phase,
    source: value.source as PaddlePulseInputCommandV1["source"],
    atTick: value.atTick,
    ...(value.pointerX === undefined ? {} : { pointerX: value.pointerX }),
  });
}

/** Parse the only supported autosave/manual slot identifiers. */
export function parsePaddlePulseSlotId(value: unknown): PaddlePulseSlotIdV1 {
  if (typeof value !== "string" || !(PADDLE_PULSE_SLOT_IDS as readonly string[]).includes(value)) {
    throw new Error("PADDLE_PULSE_SLOT_ID_INVALID");
  }
  return value as PaddlePulseSlotIdV1;
}

/** Validate immutable publish-time course invariants. */
export function validatePaddlePulseModule(
  module: PaddlePulseModuleV2,
): PaddlePulseValidationIssueV1[] {
  const issues: PaddlePulseValidationIssueV1[] = [];
  if (
    module.schemaVersion !== "2"
    || module.moduleId !== "junior-coder.paddle-pulse"
    || module.moduleVersion !== "2.0.0"
    || module.completionScore !== 80
  ) issues.push(issue("invalid-module-identity", "module", "The Paddle Pulse 2.0 identity is immutable."));
  if (module.missions.length !== 6) {
    issues.push(issue("invalid-mission-count", "missions", "Paddle Pulse requires exactly six missions."));
  }
  const missionIds = new Set<string>();
  const stageIds = new Set<string>();
  let stageCount = 0;
  for (const [missionIndex, mission] of module.missions.entries()) {
    if (missionIds.has(mission.id)) issues.push(issue("duplicate-mission-id", `missions[${missionIndex}].id`, "Mission IDs must be unique."));
    missionIds.add(mission.id);
    if (mission.stages.length !== 9) issues.push(issue("invalid-stage-count", `missions[${missionIndex}].stages`, "Each mission requires nine stages."));
    stageCount += mission.stages.length;
    for (const [stageIndex, stage] of mission.stages.entries()) {
      if (stage.kind !== PADDLE_PULSE_STAGE_ORDER_V2[stageIndex]) {
        issues.push(issue("invalid-stage-order", `missions[${missionIndex}].stages[${stageIndex}]`, "Stages must use the canonical learning cycle."));
      }
      if (stageIds.has(stage.id)) issues.push(issue("duplicate-stage-id", `missions[${missionIndex}].stages[${stageIndex}].id`, "Stage IDs must be unique."));
      stageIds.add(stage.id);
    }
  }
  if (stageCount !== 54) issues.push(issue("invalid-total-stage-count", "missions", "Paddle Pulse requires exactly 54 stages."));
  return issues;
}
