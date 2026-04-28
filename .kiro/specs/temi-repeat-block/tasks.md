# Implementation Plan: temi-repeat-block

## Overview

Add a `temi_repeat` ("repeat N times") block to the Blockly workspace, expand it client-side in the robot adapter, and add forward-compatible `Repeat` command support to the Android app. Also enable the "Control" category in the demo mission.

## Tasks

- [x] 1. Add `temi_repeat` block and "Control" category to `blockly-workspace.tsx`
  - Define the `temi_repeat` block with `field_number` (TIMES, default 2, min 1, max 10) and `input_statement` (DO)
  - Add a "Control" toolbox category (colour `#4a7c59`) containing `temi_repeat`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 5.1, 5.2, 5.3_

- [x] 2. Add `RepeatCommand` type and expand repeat blocks in `robot-adapter.ts`
  - [x] 2.1 Add `RepeatCommand` type and extend `RobotExecuteCommand` union
    - Define `RepeatCommand` with `type: "Repeat"`, `times: number`, `commands: RobotExecuteCommand[]`
    - Export `RepeatCommand` and add it to the union
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 2.2 Update `extractCommandsFromWorkspace` to expand `temi_repeat` blocks
    - Refactor `walk` to accept a `commands` accumulator so inner walks share the same logic
    - Handle `temi_repeat`: read `TIMES`, walk the `DO` statement input recursively, push inner commands N times
    - Handle empty `DO` body as a no-op
    - Support nested `temi_repeat` blocks via recursive `walk`
    - Continue walking the `next` chain after the repeat block
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ]* 2.3 Write property tests for repeat expansion (fast-check)
    - **Property 2: Flat expansion correctness** — arbitrary (N, M) pairs produce N×M commands
    - **Property 3: Nested repeat expansion** — N_outer × N_inner × K commands
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6**

- [x] 3. Checkpoint — Ensure TypeScript changes compile and tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Add `RobotCommand.Repeat` to `RobotCommandRunner.kt`
  - Add `data class Repeat(val times: Int, val commands: List<RobotCommand>) : RobotCommand()`
  - _Requirements: 4.3_

- [x] 5. Update `TemiLocationServer.kt` to parse `Repeat` commands
  - Add `"Repeat"` case in `parseCommandsFromJson`: extract `times` and recursively parse inner `commands` array
  - Add helper `parseInnerCommandsFromContext` that reuses brace-counting logic to find and parse the nested `commands` array
  - _Requirements: 4.1, 4.2_

- [x] 6. Update `RobotReflectionRunner.kt` to execute `Repeat` commands
  - Add `is RobotCommand.Repeat` branch in `run`: if `times < 1` return success; otherwise call `runSequence` on inner commands `times` times, propagating any failure
  - _Requirements: 4.4, 4.5, 4.6_

- [x] 7. Add "Control" to `allowedCategories` of "Taller Guía mi salón" in `demo-data.ts`
  - Update `allowedCategories` from `["Movimiento", "Hablar", "Mostrar", "Condición"]` to include `"Control"`
  - _Requirements: 5.1_

- [x] 8. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Client-side expansion in `extractCommandsFromWorkspace` is the primary execution path; Android `Repeat` support is forward-compatible
- The `walk` refactor must preserve all existing command extraction behaviour
