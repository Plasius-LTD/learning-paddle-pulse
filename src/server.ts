import {
  createInitialPaddlePulseState,
  renderPaddlePulseFrame,
  simulatePaddlePulse,
  stepPaddlePulseState,
} from "./engine.js";
import { executePaddlePulseProject } from "./evaluator.js";
import type {
  PaddlePulseAssessmentResultV1,
  PaddlePulseAssessmentScopeV1,
  PaddlePulseEvaluatorOptionsV1,
  PaddlePulseProgramV1,
  PaddlePulseProjectV1,
} from "./types.js";

interface GoalDefinition {
  readonly id: string;
  readonly missionId: string;
  readonly points: number;
  readonly feedback: string;
}

const goals: readonly GoalDefinition[] = [
  { id: "paddle-pulse-court-complete", missionId: "paddle-pulse-court-coordinates", points: 10, feedback: "Configure the logical court and bounded paddle, then run the scene again." },
  { id: "paddle-pulse-controls-complete", missionId: "paddle-pulse-paddle-controls", points: 15, feedback: "Provide equivalent Arrow/A/D and horizontal pointer-drag controls." },
  { id: "paddle-pulse-motion-complete", missionId: "paddle-pulse-ball-motion", points: 15, feedback: "Configure finite ball velocity and a controllable paddle-bounce angle." },
  { id: "paddle-pulse-bricks-complete", missionId: "paddle-pulse-bricks-collisions", points: 20, feedback: "Build a bounded multi-row brick grid with one score value per row." },
  { id: "paddle-pulse-states-complete", missionId: "paddle-pulse-score-lives-states", points: 15, feedback: "Configure lives, serve delay and level-clear scoring while preserving legal transitions." },
  { id: "paddle-pulse-levels-complete", missionId: "paddle-pulse-levels-final-game", points: 20, feedback: "Provide at least three distinct, progressively faster original levels." },
  { id: "paddle-pulse-sandbox-safety", missionId: "paddle-pulse-levels-final-game", points: 5, feedback: "Keep source, commands, values and execution inside the protected sandbox limits." },
] as const;

function selectedGoals(scope: PaddlePulseAssessmentScopeV1): readonly GoalDefinition[] {
  if (scope.kind === "final") return goals;
  return goals.filter(
    (goal) => goal.missionId === scope.missionId || goal.id === "paddle-pulse-sandbox-safety",
  );
}

function hasConfigured(program: PaddlePulseProgramV1, ...kinds: readonly string[]): boolean {
  return kinds.every((kind) => (program.configuredCommandKinds as readonly string[]).includes(kind));
}

function courtCheck(program: PaddlePulseProgramV1): boolean {
  const state = createInitialPaddlePulseState(program, 17);
  const frame = renderPaddlePulseFrame(state, program);
  return hasConfigured(program, "court", "paddle")
    && program.court.width === 640
    && program.court.height === 480
    && program.paddle.width >= 72
    && program.paddle.width <= 144
    && state.paddle.x >= 0
    && state.paddle.x + program.paddle.width <= program.court.width
    && frame.drawCommands.length > 0
    && frame.drawCommands.every((command) => {
      if (command.kind === "circle") return Number.isFinite(command.x) && Number.isFinite(command.y);
      return Number.isFinite(command.x) && Number.isFinite(command.y);
    });
}

function controlsCheck(program: PaddlePulseProgramV1): boolean {
  const keys = new Set(program.controls.keyboard);
  let keyboard = createInitialPaddlePulseState(program, 4);
  const pointer = keyboard.paddle.x + 80;
  keyboard = stepPaddlePulseState(keyboard, program, [{
    sequence: 1,
    action: "right",
    phase: "pressed",
    source: "assessment",
    atTick: 1,
  }]);
  const moved = keyboard.paddle.x;
  const dragged = stepPaddlePulseState(createInitialPaddlePulseState(program, 4), program, [{
    sequence: 1,
    action: "pointer",
    phase: "move",
    source: "assessment",
    atTick: 1,
    pointerX: pointer,
  }]);
  return hasConfigured(program, "controls")
    && keys.has("ArrowLeft")
    && keys.has("ArrowRight")
    && keys.has("KeyA")
    && keys.has("KeyD")
    && program.controls.pointer === "horizontal-drag"
    && moved > createInitialPaddlePulseState(program, 4).paddle.x
    && dragged.paddle.x >= 12
    && dragged.paddle.x + program.paddle.width <= program.court.width - 12;
}

function motionCheck(program: PaddlePulseProgramV1): boolean {
  const inputs = [{
    sequence: 1,
    action: "start" as const,
    phase: "pressed" as const,
    source: "assessment" as const,
    atTick: 1,
  }];
  const left = simulatePaddlePulse(program, { seed: 31, ticks: 90, inputs });
  const right = simulatePaddlePulse(program, { seed: 31, ticks: 90, inputs });
  return hasConfigured(program, "ball")
    && program.ball.radius >= 6
    && program.ball.radius <= 12
    && program.ball.speed >= 240
    && program.ball.speed <= 420
    && program.ball.maximumBounceAngleDegrees >= 50
    && program.ball.maximumBounceAngleDegrees <= 70
    && JSON.stringify(left.state) === JSON.stringify(right.state)
    && Number.isFinite(left.state.ball.x)
    && Number.isFinite(left.state.ball.y)
    && left.state.tick === 90;
}

function bricksCheck(program: PaddlePulseProgramV1): boolean {
  const base = createInitialPaddlePulseState(program, 9);
  const target = base.bricks.find((brick) => brick.active);
  if (!target) return false;
  const speed = Math.max(240, program.ball.speed);
  const before = {
    ...base,
    status: "playing" as const,
    ball: {
      x: target.x + target.width / 2,
      y: target.y + target.height + program.ball.radius + 0.25,
      vx: 0,
      vy: -speed,
    },
  };
  const after = stepPaddlePulseState(before, program);
  const afterAgain = stepPaddlePulseState(after, program);
  const targetAfter = after.bricks.find((brick) => brick.id === target.id);
  return hasConfigured(program, "bricks")
    && program.bricks.rows >= 5
    && program.bricks.columns >= 8
    && program.bricks.rows * program.bricks.columns <= 240
    && targetAfter?.active === false
    && after.score === target.score
    && afterAgain.score >= after.score;
}

function statesCheck(program: PaddlePulseProgramV1): boolean {
  const base = createInitialPaddlePulseState(program, 10);
  const lost = stepPaddlePulseState({
    ...base,
    status: "playing",
    score: 37,
    ball: {
      ...base.ball,
      y: program.court.height + program.ball.radius + 2,
      vy: Math.abs(base.ball.vy),
    },
  }, program);
  const paused = stepPaddlePulseState(base, program, [{
    sequence: 1,
    action: "pause",
    phase: "pressed",
    source: "assessment",
    atTick: 1,
  }]);
  return hasConfigured(program, "rules")
    && program.rules.initialLives === 3
    && program.rules.levelClearBonus >= 50
    && lost.lives === 2
    && lost.score === 37
    && lost.status === "life-lost"
    && paused.status === "paused";
}

function levelsCheck(program: PaddlePulseProgramV1): boolean {
  const layouts = new Set(program.levels.levels.map((level) => level.layout.join("/")));
  return hasConfigured(program, "levels")
    && program.levels.levels.length >= 3
    && layouts.size >= 3
    && program.levels.levels.every((level, index, levels) =>
      index === 0 || level.speedMultiplier >= levels[index - 1]!.speedMultiplier)
    && program.levels.levels.every((level) => level.layout.some((row) => row.includes("1")));
}

function failedResult(
  scope: PaddlePulseAssessmentScopeV1,
  outcome: "error" | "timeout",
): PaddlePulseAssessmentResultV1 {
  const selected = selectedGoals(scope);
  return {
    schemaVersion: "1",
    outcome,
    score: 0,
    completed: false,
    passedGoalIds: [],
    failedGoalIds: selected.map((goal) => goal.id),
    criterionFeedback: selected.map((goal) => ({ goalId: goal.id, passed: false, message: goal.feedback })),
    errorCode: outcome === "timeout"
      ? "PADDLE_PULSE_ASSESSMENT_TIMEOUT"
      : "PADDLE_PULSE_ASSESSMENT_FAILED",
  };
}

/**
 * Re-run learner source and protected scenarios independently on the server.
 * The result reveals criterion feedback, never protected inputs or expected data.
 */
export async function assessPaddlePulseProject(
  project: PaddlePulseProjectV1,
  scope: PaddlePulseAssessmentScopeV1,
  options: PaddlePulseEvaluatorOptionsV1 = {},
): Promise<PaddlePulseAssessmentResultV1> {
  const execution = await executePaddlePulseProject(project, options);
  if (execution.outcome !== "completed" || !execution.program) {
    return failedResult(scope, execution.outcome === "timeout" ? "timeout" : "error");
  }
  const checks = new Map<string, boolean>([
    ["paddle-pulse-court-complete", courtCheck(execution.program)],
    ["paddle-pulse-controls-complete", controlsCheck(execution.program)],
    ["paddle-pulse-motion-complete", motionCheck(execution.program)],
    ["paddle-pulse-bricks-complete", bricksCheck(execution.program)],
    ["paddle-pulse-states-complete", statesCheck(execution.program)],
    ["paddle-pulse-levels-complete", levelsCheck(execution.program)],
    ["paddle-pulse-sandbox-safety", true],
  ]);
  const selected = selectedGoals(scope);
  const passedGoalIds = selected.filter((goal) => checks.get(goal.id) === true).map((goal) => goal.id);
  const failedGoalIds = selected.filter((goal) => checks.get(goal.id) !== true).map((goal) => goal.id);
  const availablePoints = selected.reduce((total, goal) => total + goal.points, 0);
  const passedPoints = selected
    .filter((goal) => checks.get(goal.id) === true)
    .reduce((total, goal) => total + goal.points, 0);
  const score = availablePoints === 0 ? 0 : Math.round(passedPoints / availablePoints * 100);
  const completed = scope.kind === "final"
    && score >= 80
    && checks.get("paddle-pulse-sandbox-safety") === true;
  return {
    schemaVersion: "1",
    outcome: "completed",
    score,
    completed,
    passedGoalIds,
    failedGoalIds,
    criterionFeedback: selected.map((goal) => ({
      goalId: goal.id,
      passed: checks.get(goal.id) === true,
      message: checks.get(goal.id) === true ? "Criterion passed." : goal.feedback,
    })),
  };
}
