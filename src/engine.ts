import type {
  PaddlePulseBrickV1,
  PaddlePulseDrawCommandV1,
  PaddlePulseFrameV1,
  PaddlePulseGeneratedCueV1,
  PaddlePulseInputCommandV1,
  PaddlePulseProgramV1,
  PaddlePulseStateV1,
} from "./types.js";
import { parsePaddlePulseInputCommand } from "./validation.js";

const FIXED_TIMESTEP_SECONDS = 1 / 60;
const PADDLE_BOTTOM_MARGIN = 28;
const PADDLE_SIDE_MARGIN = 12;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function nextRandom(seed: number): number {
  return (Math.imul(seed >>> 0, 1_664_525) + 1_013_904_223) >>> 0;
}

function levelSpeed(program: PaddlePulseProgramV1, levelIndex: number): number {
  return program.ball.speed * (program.levels.levels[levelIndex]?.speedMultiplier ?? 1);
}

function initialBall(
  program: PaddlePulseProgramV1,
  levelIndex: number,
  paddleX: number,
  paddleY: number,
  seed: number,
): PaddlePulseStateV1["ball"] {
  const speed = levelSpeed(program, levelIndex);
  const random = nextRandom(seed + levelIndex);
  const horizontal = (random & 1) === 0 ? -0.52 : 0.52;
  return {
    x: paddleX + program.paddle.width / 2,
    y: paddleY - program.ball.radius - 2,
    vx: speed * horizontal,
    vy: -Math.sqrt(Math.max(0, speed * speed - (speed * horizontal) ** 2)),
  };
}

function buildBricks(
  program: PaddlePulseProgramV1,
  levelIndex: number,
): readonly PaddlePulseBrickV1[] {
  const { bricks } = program;
  const layout = program.levels.levels[levelIndex]?.layout
    ?? program.levels.levels[0]?.layout
    ?? [];
  const usableWidth = program.court.width - bricks.side * 2;
  const width = (usableWidth - (bricks.columns - 1) * bricks.gap) / bricks.columns;
  const result: PaddlePulseBrickV1[] = [];
  for (let row = 0; row < bricks.rows; row += 1) {
    for (let column = 0; column < bricks.columns; column += 1) {
      if (layout[row]?.[column] !== "1") continue;
      result.push({
        id: `level-${levelIndex + 1}-brick-${row}-${column}`,
        row,
        column,
        x: bricks.side + column * (width + bricks.gap),
        y: bricks.top + row * (bricks.height + bricks.gap),
        width,
        height: bricks.height,
        score: bricks.rowScores[row] ?? 1,
        active: true,
      });
    }
  }
  return result;
}

/** Create the deterministic trusted-host state for one compiled learner program. */
export function createInitialPaddlePulseState(
  program: PaddlePulseProgramV1,
  seed = 1,
): PaddlePulseStateV1 {
  const boundedSeed = Number.isInteger(seed) ? seed >>> 0 : 1;
  const paddleX = (program.court.width - program.paddle.width) / 2;
  const paddleY = program.court.height - PADDLE_BOTTOM_MARGIN - program.paddle.height;
  return {
    schemaVersion: "1",
    seed: boundedSeed,
    tick: 0,
    status: "ready",
    score: 0,
    lives: program.rules.initialLives,
    levelIndex: 0,
    serveTicksRemaining: program.rules.serveDelayTicks,
    paddle: { x: paddleX, y: paddleY, left: false, right: false },
    ball: initialBall(program, 0, paddleX, paddleY, boundedSeed),
    bricks: buildBricks(program, 0),
    pendingAudioCues: [],
    lastInputSequence: -1,
  };
}

function enabledCue(
  program: PaddlePulseProgramV1,
  cue: PaddlePulseGeneratedCueV1,
): readonly PaddlePulseGeneratedCueV1[] {
  return program.sound.cues.includes(cue) ? [cue] : [];
}

function withResetBall(
  state: PaddlePulseStateV1,
  program: PaddlePulseProgramV1,
  status: "life-lost" | "level-clear",
): PaddlePulseStateV1 {
  const paddleX = (program.court.width - program.paddle.width) / 2;
  return {
    ...state,
    status,
    serveTicksRemaining: program.rules.serveDelayTicks,
    paddle: { ...state.paddle, x: paddleX, left: false, right: false },
    ball: initialBall(program, state.levelIndex, paddleX, state.paddle.y, state.seed + state.tick),
  };
}

function applyInput(
  state: PaddlePulseStateV1,
  input: PaddlePulseInputCommandV1,
  program: PaddlePulseProgramV1,
): PaddlePulseStateV1 {
  if (input.action === "restart" && input.phase === "pressed") {
    return createInitialPaddlePulseState(program, state.seed);
  }
  if (input.action === "pause" && input.phase === "pressed") {
    if (state.status === "paused") {
      return { ...state, status: state.statusBeforePause ?? "ready", statusBeforePause: undefined };
    }
    if (state.status === "won" || state.status === "game-over") return state;
    return { ...state, statusBeforePause: state.status, status: "paused" };
  }
  if (input.action === "start" && input.phase === "pressed") {
    if (state.status === "ready" || state.status === "life-lost" || state.status === "level-clear") {
      return { ...state, status: "playing", serveTicksRemaining: 0 };
    }
    return state;
  }
  if (input.action === "pointer" && input.phase === "move" && input.pointerX !== undefined) {
    const x = clamp(
      input.pointerX - program.paddle.width / 2,
      PADDLE_SIDE_MARGIN,
      program.court.width - PADDLE_SIDE_MARGIN - program.paddle.width,
    );
    const ball = state.status === "ready" || state.status === "life-lost" || state.status === "level-clear"
      ? { ...state.ball, x: x + program.paddle.width / 2 }
      : state.ball;
    return { ...state, paddle: { ...state.paddle, x }, ball };
  }
  if (input.action === "left") {
    return { ...state, paddle: { ...state.paddle, left: input.phase === "pressed" } };
  }
  if (input.action === "right") {
    return { ...state, paddle: { ...state.paddle, right: input.phase === "pressed" } };
  }
  return state;
}

function circleOverlapsBrick(
  x: number,
  y: number,
  radius: number,
  brick: PaddlePulseBrickV1,
): boolean {
  const closestX = clamp(x, brick.x, brick.x + brick.width);
  const closestY = clamp(y, brick.y, brick.y + brick.height);
  return (x - closestX) ** 2 + (y - closestY) ** 2 <= radius ** 2;
}

function resolveBrickContact(
  x: number,
  y: number,
  radius: number,
  brick: PaddlePulseBrickV1,
  vx: number,
  vy: number,
): { readonly vx: number; readonly vy: number } {
  const overlapLeft = Math.abs((x + radius) - brick.x);
  const overlapRight = Math.abs((brick.x + brick.width) - (x - radius));
  const overlapTop = Math.abs((y + radius) - brick.y);
  const overlapBottom = Math.abs((brick.y + brick.height) - (y - radius));
  const minimum = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
  return minimum === overlapLeft || minimum === overlapRight
    ? { vx: -vx, vy }
    : { vx, vy: -vy };
}

interface BallStepResult {
  readonly state: PaddlePulseStateV1;
  readonly terminal: boolean;
}

function stepBall(
  current: PaddlePulseStateV1,
  program: PaddlePulseProgramV1,
): BallStepResult {
  const radius = program.ball.radius;
  const speed = Math.hypot(current.ball.vx, current.ball.vy);
  const substeps = clamp(Math.ceil((speed * FIXED_TIMESTEP_SECONDS) / Math.max(2, radius / 2)), 1, 8);
  const delta = FIXED_TIMESTEP_SECONDS / substeps;
  let state = current;
  const cues: PaddlePulseGeneratedCueV1[] = [];
  let brickHitThisTick = false;

  for (let substep = 0; substep < substeps; substep += 1) {
    let { vx, vy } = state.ball;
    let x = state.ball.x + vx * delta;
    let y = state.ball.y + vy * delta;

    if (x - radius <= 0 && vx < 0) {
      x = radius;
      vx = Math.abs(vx);
      cues.push(...enabledCue(program, "bounce"));
    } else if (x + radius >= program.court.width && vx > 0) {
      x = program.court.width - radius;
      vx = -Math.abs(vx);
      cues.push(...enabledCue(program, "bounce"));
    }
    if (y - radius <= 0 && vy < 0) {
      y = radius;
      vy = Math.abs(vy);
      cues.push(...enabledCue(program, "bounce"));
    }

    const paddle = state.paddle;
    const paddleHit = vy > 0
      && x + radius >= paddle.x
      && x - radius <= paddle.x + program.paddle.width
      && y + radius >= paddle.y
      && y - radius <= paddle.y + program.paddle.height;
    if (paddleHit) {
      const offset = clamp(
        (x - (paddle.x + program.paddle.width / 2)) / (program.paddle.width / 2),
        -1,
        1,
      );
      const angle = offset * program.ball.maximumBounceAngleDegrees * Math.PI / 180;
      const magnitude = levelSpeed(program, state.levelIndex);
      vx = magnitude * Math.sin(angle);
      vy = -Math.max(magnitude * Math.cos(angle), magnitude * 0.25);
      y = paddle.y - radius;
      cues.push(...enabledCue(program, "bounce"));
    }

    const hitIndex = brickHitThisTick
      ? -1
      : state.bricks.findIndex(
          (brick) => brick.active && circleOverlapsBrick(x, y, radius, brick),
        );
    if (hitIndex >= 0) {
      brickHitThisTick = true;
      const hit = state.bricks[hitIndex]!;
      ({ vx, vy } = resolveBrickContact(x, y, radius, hit, vx, vy));
      const bricks = state.bricks.map((brick, index) =>
        index === hitIndex ? { ...brick, active: false } : brick);
      state = { ...state, score: state.score + hit.score, bricks };
      cues.push(...enabledCue(program, "brick"));
      if (!bricks.some((brick) => brick.active)) {
        const lastLevel = state.levelIndex >= program.levels.levels.length - 1;
        if (lastLevel) {
          return {
            state: {
              ...state,
              status: "won",
              ball: { x, y, vx, vy },
              pendingAudioCues: [...new Set([...cues, ...enabledCue(program, "win")])],
            },
            terminal: true,
          };
        }
        const levelIndex = state.levelIndex + 1;
        const next = withResetBall({
          ...state,
          levelIndex,
          score: state.score + program.rules.levelClearBonus,
          bricks: buildBricks(program, levelIndex),
          pendingAudioCues: [...new Set([...cues, ...enabledCue(program, "level-clear")])],
        }, program, "level-clear");
        return { state: next, terminal: true };
      }
    }

    if (y - radius > program.court.height) {
      const lives = state.lives - 1;
      if (lives <= 0) {
        return {
          state: {
            ...state,
            lives: 0,
            status: "game-over",
            ball: { x, y, vx, vy },
            pendingAudioCues: [...new Set([...cues, ...enabledCue(program, "life-loss")])],
          },
          terminal: true,
        };
      }
      return {
        state: withResetBall({
          ...state,
          lives,
          pendingAudioCues: [...new Set([...cues, ...enabledCue(program, "life-loss")])],
        }, program, "life-lost"),
        terminal: true,
      };
    }
    state = { ...state, ball: { x, y, vx, vy } };
  }
  return {
    state: { ...state, pendingAudioCues: [...new Set(cues)] },
    terminal: false,
  };
}

/** Advance exactly one 60 Hz engine tick with ordered, source-independent input. */
export function stepPaddlePulseState(
  current: PaddlePulseStateV1,
  program: PaddlePulseProgramV1,
  inputs: readonly PaddlePulseInputCommandV1[] = [],
): PaddlePulseStateV1 {
  const ordered = inputs
    .map(parsePaddlePulseInputCommand)
    .filter((input) => input.sequence > current.lastInputSequence)
    .sort((left, right) => left.sequence - right.sequence)
    .slice(0, 64);
  let state: PaddlePulseStateV1 = { ...current, pendingAudioCues: [] };
  for (const input of ordered) {
    state = applyInput(state, input, program);
    state = { ...state, lastInputSequence: input.sequence };
    if (input.action === "restart" && input.phase === "pressed") return state;
  }
  if (state.status === "paused" || state.status === "won" || state.status === "game-over") {
    return state;
  }

  const direction = Number(state.paddle.right) - Number(state.paddle.left);
  const nextPaddleX = clamp(
    state.paddle.x + direction * program.paddle.speed * FIXED_TIMESTEP_SECONDS,
    PADDLE_SIDE_MARGIN,
    program.court.width - PADDLE_SIDE_MARGIN - program.paddle.width,
  );
  const waiting = state.status === "ready" || state.status === "life-lost" || state.status === "level-clear";
  state = {
    ...state,
    tick: state.tick + 1,
    paddle: { ...state.paddle, x: nextPaddleX },
    ...(waiting
      ? {
          serveTicksRemaining: Math.max(0, state.serveTicksRemaining - 1),
          ball: { ...state.ball, x: nextPaddleX + program.paddle.width / 2 },
        }
      : {}),
  };
  if (waiting) return state;
  return stepBall(state, program).state;
}

const brickColours = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#8b5cf6"] as const;

/** Render a bounded, renderer-neutral frame with equivalent semantic state. */
export function renderPaddlePulseFrame(
  state: PaddlePulseStateV1,
  program: PaddlePulseProgramV1,
): PaddlePulseFrameV1 {
  const drawCommands: PaddlePulseDrawCommandV1[] = [
    { kind: "rect", x: 0, y: 0, width: program.court.width, height: program.court.height, colour: program.court.background },
    { kind: "text", x: 20, y: 28, text: `Score ${state.score}`, colour: "#ffffff" },
    { kind: "text", x: 260, y: 28, text: `Level ${state.levelIndex + 1}`, colour: "#ffffff" },
    { kind: "text", x: 520, y: 28, text: `Lives ${state.lives}`, colour: "#ffffff" },
  ];
  for (const brick of state.bricks) {
    if (!brick.active) continue;
    drawCommands.push({
      kind: "rect",
      x: brick.x,
      y: brick.y,
      width: brick.width,
      height: brick.height,
      colour: brickColours[brick.row % brickColours.length]!,
    });
  }
  drawCommands.push(
    { kind: "rect", x: state.paddle.x, y: state.paddle.y, width: program.paddle.width, height: program.paddle.height, colour: "#f472d0" },
    { kind: "circle", x: state.ball.x, y: state.ball.y, radius: program.ball.radius, colour: "#fde047" },
  );
  if (state.status !== "playing") {
    drawCommands.push({
      kind: "text",
      x: 240,
      y: 300,
      text: state.status.replace("-", " ").toUpperCase(),
      colour: "#ffffff",
    });
  }
  const bricksRemaining = state.bricks.filter((brick) => brick.active).length;
  return {
    tick: state.tick,
    drawCommands: drawCommands.slice(0, 320),
    audioCues: state.pendingAudioCues,
    semanticState: {
      statusText: state.status,
      score: state.score,
      lives: state.lives,
      level: state.levelIndex + 1,
      bricksRemaining,
      paused: state.status === "paused",
      gameOver: state.status === "game-over" || state.status === "won",
    },
  };
}

export interface PaddlePulseSimulationOptionsV1 {
  readonly seed?: number;
  readonly ticks: number;
  readonly inputs?: readonly PaddlePulseInputCommandV1[];
}

export interface PaddlePulseSimulationResultV1 {
  readonly state: PaddlePulseStateV1;
  readonly frames: readonly PaddlePulseFrameV1[];
}

/** Run a deterministic fixed-tick simulation for preview, tests, or server checks. */
export function simulatePaddlePulse(
  program: PaddlePulseProgramV1,
  options: PaddlePulseSimulationOptionsV1,
): PaddlePulseSimulationResultV1 {
  if (!Number.isInteger(options.ticks) || options.ticks < 0 || options.ticks > 36_000) {
    throw new Error("PADDLE_PULSE_SIMULATION_TICKS_INVALID");
  }
  let state = createInitialPaddlePulseState(program, options.seed);
  const frames: PaddlePulseFrameV1[] = [renderPaddlePulseFrame(state, program)];
  const byTick = new Map<number, PaddlePulseInputCommandV1[]>();
  for (const input of options.inputs ?? []) {
    const parsed = parsePaddlePulseInputCommand(input);
    const values = byTick.get(parsed.atTick) ?? [];
    values.push(parsed);
    byTick.set(parsed.atTick, values);
  }
  for (let tick = 1; tick <= options.ticks; tick += 1) {
    state = stepPaddlePulseState(state, program, byTick.get(tick) ?? []);
    frames.push(renderPaddlePulseFrame(state, program));
  }
  return { state, frames };
}
