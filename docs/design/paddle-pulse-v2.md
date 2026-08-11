# Paddle Pulse 2.0 runtime and course design

## Course

Six missions teach coordinates/rendering, equivalent input, fixed-step motion, collisions, score/lives/state machines, and integrated levels/sound/testing. Every mission owns nine canonical stages. Mission assessments unlock sequential progress at 80; the final mission remains visible and a protected integrated score of at least 80 satisfies skipped stages through the site progress adapter.

## Program boundary

One learner-owned JavaScript source file executes once. Eight host functions accept JSON-compatible values and emit at most 256 validated commands. Last-command-wins resolution produces a complete `PaddlePulseProgramV1` over safe preview defaults. Cross-command validation verifies court geometry, finite values, brick bounds, and level-layout dimensions.

QuickJS receives no animation callback or ambient DOM, network, storage, cookies, Node, account, or database authority. The browser runs it in a disposable worker; the server independently re-executes the saved source before assessment.

## Trusted engine

The package advances exactly one 1/60-second tick at a time. Ordered keyboard, touch, and assessment inputs enter one contract. Pointer coordinates are already scaled to the 640 × 480 logical court. The engine clamps paddle movement, substeps ball motion, resolves one brick contact per tick, and owns score, lives, serve, pause, level-clear, win, and game-over transitions.

Frames contain bounded renderer-neutral primitives and an equivalent semantic state. Generated sound cue IDs report engine events but do not influence them and are never assessment criteria.

## Adapter lifecycle

The site owns `requestAnimationFrame`, a five-tick catch-up cap, visibility/fullscreen/unmount pauses, Pointer Event capture, coordinate scaling, Web Audio activation/mute, canvas drawing, semantic announcements, save slots, autosave, ETag/idempotency handling, account deletion, feature flags, capabilities, and fullscreen/expanded-mode fallback.

## Completion

Mission checks are formative. The server entry point scores seven goals totalling 100 points; sandbox safety is five points. Final completion is monotonic once score is at least 80 and safety passes. Resetting practice state cannot remove stored completion.
