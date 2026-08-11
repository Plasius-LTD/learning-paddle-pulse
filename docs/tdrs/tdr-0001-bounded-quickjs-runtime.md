# TDR-0001: One-shot declarative QuickJS execution

Use `quickjs-emscripten` 0.32.0 in a fresh realm per Run or assessment. Evaluate one UTF-8 source file of at most 32 KiB, expose only eight configuration functions, and accept at most 256 commands. Apply an 8 MiB heap, 256 KiB stack, and 250 ms interrupt deadline. Return sanitized outcome codes with no source or QuickJS stack. Browser hosts must additionally terminate the disposable worker after five seconds.

Learner code constructs data; it never owns the live game loop. A trusted, seeded 60 Hz host engine consumes the validated program. This keeps animation, input lifecycle, collision invariants, and assessment deterministic across browser and server runtimes.
