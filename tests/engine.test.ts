import { describe, expect, it } from "vitest";
import {
  createInitialPaddlePulseState,
  renderPaddlePulseFrame,
  resolvePaddlePulseProgram,
  simulatePaddlePulse,
  stepPaddlePulseState,
  type PaddlePulseInputCommandV1,
} from "../src/index.js";

const program = resolvePaddlePulseProgram([]);

function input(
  sequence: number,
  action: PaddlePulseInputCommandV1["action"],
  phase: PaddlePulseInputCommandV1["phase"] = "pressed",
): PaddlePulseInputCommandV1 {
  return { sequence, action, phase, source: "assessment", atTick: sequence };
}

describe("trusted deterministic 60 Hz engine", () => {
  it("produces identical simulation state and frames for a seed and inputs", () => {
    const inputs = [input(1, "start"), input(20, "left"), input(35, "left", "released")];
    const left = simulatePaddlePulse(program, { seed: 42, ticks: 180, inputs });
    const right = simulatePaddlePulse(program, { seed: 42, ticks: 180, inputs });
    expect(left).toEqual(right);
    expect(left.state.tick).toBe(180);
    expect(left.frames).toHaveLength(181);
  });

  it("treats keyboard movement and scaled pointer position as bounded engine input", () => {
    const initial = createInitialPaddlePulseState(program, 1);
    const keyboard = stepPaddlePulseState(initial, program, [input(1, "right")]);
    const pointer = stepPaddlePulseState(initial, program, [{
      ...input(1, "pointer", "move"),
      source: "touch",
      pointerX: 1_000,
    }]);
    expect(keyboard.paddle.x).toBeGreaterThan(initial.paddle.x);
    expect(pointer.paddle.x + program.paddle.width).toBeLessThanOrEqual(
      program.court.width - 12,
    );
  });

  it("reflects wall, paddle and brick contacts without double-scoring", () => {
    const initial = createInitialPaddlePulseState(program, 3);
    const wall = stepPaddlePulseState({
      ...initial,
      status: "playing",
      ball: { x: program.ball.radius + 0.1, y: 300, vx: -300, vy: -10 },
    }, program);
    expect(wall.ball.vx).toBeGreaterThan(0);

    const paddle = stepPaddlePulseState({
      ...initial,
      status: "playing",
      ball: {
        x: initial.paddle.x + program.paddle.width - 8,
        y: initial.paddle.y - program.ball.radius - 0.1,
        vx: 0,
        vy: 300,
      },
    }, program);
    expect(paddle.ball.vy).toBeLessThan(0);
    expect(paddle.ball.vx).toBeGreaterThan(0);

    const target = initial.bricks[0]!;
    const before = {
      ...initial,
      status: "playing" as const,
      bricks: initial.bricks.map((brick, index) => ({
        ...brick,
        active: index === 0 || index === initial.bricks.length - 1,
      })),
      ball: {
        x: target.x + target.width / 2,
        y: target.y + target.height + program.ball.radius + 0.1,
        vx: 0,
        vy: -300,
      },
    };
    const hit = stepPaddlePulseState(before, program);
    const second = stepPaddlePulseState(hit, program);
    expect(hit.bricks[0]?.active).toBe(false);
    expect(hit.score).toBe(target.score);
    expect(second.score).toBe(hit.score);
  });

  it("preserves score across life loss and never grants negative lives", () => {
    const initial = createInitialPaddlePulseState(program, 5);
    const lost = stepPaddlePulseState({
      ...initial,
      status: "playing",
      score: 99,
      ball: { ...initial.ball, y: 500, vy: 300 },
    }, program);
    expect(lost.status).toBe("life-lost");
    expect(lost.lives).toBe(2);
    expect(lost.score).toBe(99);

    const over = stepPaddlePulseState({
      ...lost,
      status: "playing",
      lives: 1,
      ball: { ...lost.ball, y: 500, vy: 300 },
    }, program);
    expect(over.status).toBe("game-over");
    expect(over.lives).toBe(0);
  });

  it("advances levels, awards the bonus, and emits bounded semantic frames", () => {
    const initial = createInitialPaddlePulseState(program, 7);
    const target = initial.bricks[0]!;
    const clear = stepPaddlePulseState({
      ...initial,
      status: "playing",
      bricks: initial.bricks.map((brick, index) => ({ ...brick, active: index === 0 })),
      ball: {
        x: target.x + target.width / 2,
        y: target.y + target.height + program.ball.radius + 0.1,
        vx: 0,
        vy: -300,
      },
    }, program);
    expect(clear.status).toBe("level-clear");
    expect(clear.levelIndex).toBe(1);
    expect(clear.score).toBe(target.score + program.rules.levelClearBonus);
    const frame = renderPaddlePulseFrame(clear, program);
    expect(frame.drawCommands.length).toBeLessThanOrEqual(320);
    expect(frame.semanticState.level).toBe(2);
    expect(frame.semanticState.statusText).toBe("level-clear");
  });

  it("pauses, resumes and restarts without running a hidden tick", () => {
    let state = createInitialPaddlePulseState(program, 11);
    state = stepPaddlePulseState(state, program, [input(1, "start")]);
    state = stepPaddlePulseState(state, program, [input(2, "pause")]);
    const tick = state.tick;
    state = stepPaddlePulseState(state, program);
    expect(state.tick).toBe(tick);
    state = stepPaddlePulseState(state, program, [input(3, "pause")]);
    expect(state.status).toBe("playing");
    state = stepPaddlePulseState(state, program, [input(4, "restart")]);
    expect(state.tick).toBe(0);
    expect(state.status).toBe("ready");
  });
});
