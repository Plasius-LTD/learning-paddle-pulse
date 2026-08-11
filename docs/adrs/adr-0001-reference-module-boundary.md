# ADR-0001: Extract Paddle Pulse as an immutable reference module

## Status

Accepted

## Context

The existing Paddle Pulse 1.1 experience is one short site-owned mission. The complete 54-stage course must be reusable by browser and server adapters while the v1.1 export and API remain stable. Importing a successor package from `@plasius/learning` would introduce a dependency cycle because this package reuses the shared learning stage contract.

## Decision

Publish content, declarative learner-program contracts, validation, deterministic game rules, worker handling, and assessment as `@plasius/learning-paddle-pulse@0.1.0`, containing immutable module content `2.0.0`. Keep React, HTTP, identity, persistence, feature evaluation, and cloud services outside the package.

`@plasius/learning` references the exact package name, package version, export name, schema version, and canonical content digest without importing it. Its existing Paddle Pulse 1.1 exports remain unchanged.

Protected scenarios live only in the `./server` entry point. The root/browser dependency graph exposes criterion contracts and safe feedback, never scenario inputs.

## Consequences

- Browser preview and backend assessment share program validation and trusted simulation.
- Package and catalog releases remain independently versioned and digest-bound.
- Adapters must enforce authentication, capability/flag rollout, worker termination, storage, concurrency, deletion, fullscreen, and audio activation.
- Any published content change requires a new immutable content version and digest.
