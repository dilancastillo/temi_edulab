# Implementation Plan: temi-while-block

## Overview

Add three independent "while" loop blocks (`temi_while_count`, `temi_while_timer`, `temi_while_listen`) to the Blockly workspace. `temi_while_count` expands flat (identical to `temi_repeat`); `temi_while_timer` and `temi_while_listen` emit structured commands handled by the Android runtime. The change spans Blockly UI, the TypeScript robot adapter, and the Android app.

## Tasks

- [x] 1. Add `temi_while_count`, `temi_while_timer`, and `temi_while_listen` block definitions to `blockly-workspace.tsx`
  - Define `temi_while_count` with `field_number` (LIMIT, default 5, min 1, max 50, precision 1) and `input_statement` (DO)
  - Define `temi_while_timer` with `field_number` (SECONDS, default 30, min 1, max 300, precision 1) and `input_statement` (DO)
  - Define `temi_while_listen` with `field_input` (STOP_WORD, default "listo") and `input_statement` (DO); no max-iterations field exposed
  - All three blocks use `colour: 120`, `previousStatement: null`, `nextStatement: null`
  - Add the three new blocks to the existing "Control" toolbox category alongside `temi_repeat`
  - _Requirements: 1.1–1.7, 2.1–2.7, 3.1–3.6, 11.1, 11.2, 11.3_

- [x] 2. Add `WhileCountCommand`, `WhileTimerCommand`, `WhileListenCommand` types and extraction logic to `robot-adapter.ts`
  - [x] 2.1 Define and export the three new command types; extend `RobotExecuteCommand` union
    - `WhileCountCommand`: `{ type: "WhileCount"; limit: number; commands: RobotExecuteCommand[] }`
    - `WhileTimerCommand`: `{ type: "WhileTimer"; seconds: number; commands: RobotExecuteCommand[] }`
    - `WhileListenCommand`: `{ type: "WhileListen"; stopWord: string; maxIterations: number; commands: RobotExecuteCommand[] }`
    - Add all three to the `RobotExecuteCommand` union
    - _Requirements: 7.1–7.5_

  - [x] 2.2 Add `temi_while_count` branch to `walk` in `extractCommandsFromWorkspace`
    - Read `LIMIT` field, clamp to [1, 50] with `Math.max(1, Math.min(50, parseInt(...)))`
    - Walk the `DO` statement input recursively into `innerCommands`
    - Push `innerCommands` into `acc` exactly `limit` times (flat expansion, same as `temi_repeat`)
    - Empty `DO` body is a no-op (zero commands appended)
    - _Requirements: 4.1–4.6_

  - [ ]* 2.3 Write property tests for `temi_while_count` extraction (fast-check)
    - **Property 1: LIMIT field clamping** — arbitrary integers always clamp to [1, 50]
    - **Property 3: Flat expansion correctness** — arbitrary (N ∈ [1,50], M inner commands) → output length = N × M, order preserved
    - **Property 4: Nested expansion** — N_outer × N_inner × K commands
    - **Validates: Requirements 1.3, 1.4, 4.1–4.6**

  - [x] 2.4 Add `temi_while_timer` branch to `walk` in `extractCommandsFromWorkspace`
    - Read `SECONDS` field, clamp to [1, 300]
    - Walk the `DO` statement input recursively into `innerCommands`
    - Push a single `WhileTimerCommand { type: "WhileTimer", seconds, commands: innerCommands }` into `acc`
    - Empty `DO` body emits `WhileTimerCommand` with empty `commands` array
    - _Requirements: 5.1–5.5_

  - [ ]* 2.5 Write property tests for `temi_while_timer` extraction (fast-check)
    - **Property 2: SECONDS field clamping** — arbitrary integers always clamp to [1, 300]
    - **Property 5: WhileTimerCommand emission correctness** — arbitrary (S, M) → single `WhileTimerCommand` with `seconds = S` and `commands.length = M`
    - **Validates: Requirements 2.3, 2.4, 5.1–5.5**

  - [x] 2.6 Add `temi_while_listen` branch to `walk` in `extractCommandsFromWorkspace`
    - Read `STOP_WORD` field, trim; default to `"listo"` if blank
    - Walk the `DO` statement input recursively into `innerCommands`
    - Push a single `WhileListenCommand { type: "WhileListen", stopWord, maxIterations: 5, commands: innerCommands }` into `acc`
    - Empty `DO` body emits `WhileListenCommand` with empty `commands` array
    - _Requirements: 6.1–6.5_

  - [ ]* 2.7 Write property tests for `temi_while_listen` extraction and toolbox filter (fast-check)
    - **Property 6: WhileListenCommand emission correctness** — arbitrary (stopWord, M) → single `WhileListenCommand` with correct `stopWord`, `maxIterations = 5`, `commands.length = M`
    - **Property 14: Toolbox category filter** — arbitrary `allowedCategories` not containing `"Control"` → no `temi_while_*` block in filtered toolbox
    - **Validates: Requirements 6.1–6.5, 11.1, 11.2**

- [x] 3. Checkpoint — Ensure TypeScript changes compile and tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Add `WhileCount`, `WhileTimer`, `WhileListen` sealed subclasses to `RobotCommandRunner.kt`
  - Add `data class WhileCount(val limit: Int, val commands: List<RobotCommand>) : RobotCommand()`
  - Add `data class WhileTimer(val seconds: Int, val commands: List<RobotCommand>) : RobotCommand()`
  - Add `data class WhileListen(val stopWord: String, val maxIterations: Int, val commands: List<RobotCommand>) : RobotCommand()`
  - _Requirements: 8.3, 9.3, 10.3_

- [x] 5. Update `TemiLocationServer.kt` to parse `WhileCount`, `WhileTimer`, and `WhileListen` commands
  - Add `"WhileCount"` case: extract `limit` with `Regex(""""limit"\s*:\s*(\d+)""")`, call `parseInnerCommandsFromContext`, add `RobotCommand.WhileCount(limit, innerCommands)`
  - Add `"WhileTimer"` case: extract `seconds` with `Regex(""""seconds"\s*:\s*(\d+)""")`, call `parseInnerCommandsFromContext`, add `RobotCommand.WhileTimer(seconds, innerCommands)`
  - Add `"WhileListen"` case: extract `stopWord` and `maxIterations`, call `parseInnerCommandsFromContext`, add `RobotCommand.WhileListen(stopWord, maxIterations, innerCommands)`
  - `parseInnerCommandsFromContext` is already implemented for `Repeat` and is reused without modification
  - _Requirements: 8.1, 8.2, 9.1, 9.2, 10.1, 10.2_

  - [ ]* 5.1 Write property tests for Android parser round-trips (Kotest PropTest)
    - **Property 7: WhileCount parser round-trip** — arbitrary (limit, innerCommands) → `RobotCommand.WhileCount` with matching fields
    - **Property 8: WhileTimer parser round-trip** — arbitrary (seconds, innerCommands) → `RobotCommand.WhileTimer` with matching fields
    - **Property 9: WhileListen parser round-trip** — arbitrary (stopWord, maxIterations, innerCommands) → `RobotCommand.WhileListen` with matching fields
    - **Validates: Requirements 8.1, 8.2, 9.1, 9.2, 10.1, 10.2**

- [x] 6. Add `@Volatile private var lastAnswer: String?` field to `RobotReflectionRunner.kt` and update `askConditionAndWait` to set it
  - Declare `@Volatile private var lastAnswer: String? = null` as a class-level field
  - Inside `askConditionAndWait`, in the `onAsrResult` callback, assign `lastAnswer = asrText` (raw trimmed lowercase) immediately after normalization and before `latch.countDown()`
  - _Requirements: 10.4, 10.5_

- [x] 7. Update `RobotReflectionRunner.kt` to execute `WhileCount`, `WhileTimer`, and `WhileListen` commands
  - Add `is RobotCommand.WhileCount` branch: if `limit < 1` return success; loop `counter` from 0 to `limit - 1`, call `runSequence`, propagate any failure
  - Add `is RobotCommand.WhileTimer` branch: if `seconds < 1` return success; capture `startMs = System.currentTimeMillis()` once; loop while `(currentTimeMillis - startMs) < seconds * 1000L`, call `runSequence`, propagate any failure
  - Add `is RobotCommand.WhileListen` branch: if `maxIterations < 1` return success; first iteration always runs (lastAnswer is null); before each subsequent iteration compare `lastAnswer?.trim()` to `stopWord.trim()` case-insensitively and break if equal; stop after `maxIterations` total; propagate any failure
  - _Requirements: 8.4–8.7, 9.4–9.8, 10.4–10.8_

  - [ ]* 7.1 Write property tests for Android execution (Kotest PropTest)
    - **Property 10: WhileCount execution count** — arbitrary (limit, mock inner commands) → `runSequence` called exactly `max(0, limit)` times
    - **Property 11: WhileTimer elapsed-time loop** — mock clock, arbitrary (seconds, iterationDurationMs) → correct iteration count, start timestamp captured once
    - **Property 12: WhileListen stop condition and iteration cap** — arbitrary (stopWord, maxIterations, lastAnswerSequence) → stops at first case-insensitive match or after maxIterations; first iteration always runs
    - **Property 13: Failure propagation** — failing inner command stops all three while variants immediately
    - **Validates: Requirements 8.4–8.7, 9.4–9.8, 10.4–10.8**

- [x] 8. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- `temi_while_count` is never sent as a structured command to Android — it is pre-expanded to a flat sequence identical to `temi_repeat`
- `temi_while_timer` and `temi_while_listen` are sent as structured JSON objects; the Android runtime owns the loop
- `lastAnswer` (task 6) must be implemented before task 7 because `WhileListen` reads it between iterations
- The `DO` body of `temi_while_listen` must contain a `temi_ask_question` block for `lastAnswer` to update; without it the loop runs to `maxIterations`
- `parseInnerCommandsFromContext` in `TemiLocationServer.kt` is already implemented for `Repeat` and is reused as-is for all three new while variants
