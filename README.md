# @plasius/learning-paddle-pulse

Immutable curriculum, declarative learner-program contracts, deterministic game rules, and protected assessment for the Junior Coder **Paddle Pulse** reference module.

Package `0.1.0` contains immutable module content `2.0.0`. The package deliberately has no React, HTTP, authentication, persistence, database, entitlement, telemetry, or browser-API dependency. Site and API adapters own those concerns.

## Public entry points

- `@plasius/learning-paddle-pulse`: learner-safe 54-stage content, starter source, validation, bounded QuickJS execution, deterministic engine, input/frame contracts, and save/progress transport types.
- `@plasius/learning-paddle-pulse/browser-worker`: disposable worker handler used by a preview adapter.
- `@plasius/learning-paddle-pulse/server`: independent mission and final assessment. Never bundle this entry point into a learner client.

## Course shape

Paddle Pulse 2.0 has six missions of nine stages—54 stages in total. Each mission follows `learn → predict → build → run → assess → inspect → fix → explain → reward`.

Normal navigation is sequential and each mission assessment needs 80 or higher. The final challenge is visible from the start; a protected final score of at least 80 grants completion so experienced learners do not need artificial stage visits. Power-ups are an optional post-completion extension.

## Learner boundary

Learner JavaScript runs once in a fresh QuickJS realm and can only call eight bounded host functions:

```text
configureCourt     configurePaddle    configureControls    configureBall
configureBricks    configureRules     configureLevels      configureSound
```

Those calls build a validated declarative program. Learner code never receives animation callbacks, the DOM, network, cookies, storage, account APIs, or raw assessment scenarios. Trusted host code owns the fixed 60 Hz engine, seeded simulation, collision resolution, rendering, input lifecycle, and generated cue events.

```ts
import {
  PADDLE_PULSE_MODULE_V2,
  PADDLE_PULSE_STARTER_PROJECT_V1,
  createInitialPaddlePulseState,
  executePaddlePulseProject,
  renderPaddlePulseFrame,
} from "@plasius/learning-paddle-pulse";

const execution = await executePaddlePulseProject(
  PADDLE_PULSE_STARTER_PROJECT_V1,
);

if (execution.outcome === "completed" && execution.program) {
  const state = createInitialPaddlePulseState(execution.program, 17);
  const frame = renderPaddlePulseFrame(state, execution.program);
  console.log(PADDLE_PULSE_MODULE_V2.missions.length, frame.semanticState);
}
```

The immutable limits include 32 KiB UTF-8 source, 256 commands, 8 MiB QuickJS memory, 256 KiB stack, a 250 ms evaluator deadline, a five-second worker hard-timeout contract, five catch-up ticks, 240 bricks, and 320 draw commands.

## Preview and persistence adapters

The frame contract uses a responsive 640 × 480 logical court plus semantic score, lives, level, status, and brick-count state. Keyboard and touch adapters emit the same ordered input commands. Touch adapters should use Pointer Events with capture and scale client coordinates to the logical court.

Progress contracts define one `auto` slot and manual slots `1`–`9`, stable stage states, server-issued assessment evidence references, source digests, revisions, ETags, and monotonic completion. This package validates transport shapes; authenticated storage and conflict resolution remain adapter responsibilities.

Generated `bounce`, `brick`, `life-loss`, `level-clear`, and `win` cue identifiers are optional feedback. Sound is never assessment-critical.

## Development

Use Node.js 24 and npm.

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run test:coverage
npm run build
npm run pack:check
```

Tracked implementation: [Plasius-LTD/learning-paddle-pulse#1](https://github.com/Plasius-LTD/learning-paddle-pulse/issues/1).
