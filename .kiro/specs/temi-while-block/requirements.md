# Requirements Document

## Introduction

This feature adds three independent "while" blocks to the Blockly visual programming workspace used by students to program the Temi robot. Unlike the `temi_repeat` block (which repeats a fixed number of times), each while block encodes its own looping condition directly — there are no condition dropdowns or separate condition blocks to connect.

The three blocks are:

- **`temi_while_count`** — repeats while an internal counter is less than N (counter starts at 0, increments by 1 each iteration).
- **`temi_while_timer`** — repeats while elapsed time since the block started is less than N seconds (timestamp captured once at the start).
- **`temi_while_listen`** — repeats up to 5 times while the last answer captured by `temi_ask_question` is different from a configurable stop word (case-insensitive; first iteration always runs because `lastAnswer` is null).

Each block exposes a single `DO` statement input where students stack robot command blocks. The change spans three layers:

1. **Blockly UI** (`src/components/blockly-workspace.tsx`) — three independent block definitions, each self-contained with its own numeric or text field and a `DO` statement input.
2. **Web adapter** (`src/lib/robot-adapter.ts`) — three new command types (`WhileCountCommand`, `WhileTimerCommand`, `WhileListenCommand`) and expansion logic in `extractCommandsFromWorkspace`.
3. **Android app** (`RobotCommandRunner.kt` / `TemiLocationServer.kt` / `RobotReflectionRunner.kt`) — sealed subclasses and parser/execution support for each while variant.

---

## Glossary

- **Blockly_Workspace**: The visual drag-and-drop programming environment rendered in the browser via the Blockly library.
- **temi_while_count Block**: A Blockly block that repeats its `DO` body while an internal counter is less than N.
- **temi_while_timer Block**: A Blockly block that repeats its `DO` body while elapsed time since block start is less than N seconds.
- **temi_while_listen Block**: A Blockly block that repeats its `DO` body up to 5 times while the last captured answer differs from a stop word.
- **WhileCountCommand**: TypeScript type representing a count-based while loop with a `limit` field and nested `commands`.
- **WhileTimerCommand**: TypeScript type representing a timer-based while loop with a `seconds` field and nested `commands`.
- **WhileListenCommand**: TypeScript type representing a listen-based while loop with a `stopWord` field and nested `commands`.
- **Robot_Adapter**: The TypeScript module (`src/lib/robot-adapter.ts`) responsible for translating Blockly workspace state into `RobotExecuteCommand` arrays sent to the robot.
- **Command_Extractor**: The `extractCommandsFromWorkspace` function inside `Robot_Adapter`.
- **Statement_Input**: A Blockly block input that accepts a vertical stack of other blocks (used for the `DO` body of each while block).
- **Android_Parser**: The `parseCommandsFromJson` method inside `TemiLocationServer.kt` that deserialises the JSON payload sent by the web app.
- **RobotCommandRunner**: The Kotlin interface and its implementation (`RobotReflectionRunner`) that executes `RobotCommand` objects on the physical Temi robot.
- **lastAnswer**: The most recent string captured by a `temi_ask_question` execution, stored in the Android execution context; null before any question has been answered.

---

## Requirements

### Requirement 1: temi_while_count Block Definition

**User Story:** As a student, I want to drag a "repeat while counter < N" block onto the canvas and place robot blocks inside it, so that the robot repeats a sequence a controlled number of times using an explicit counter condition.

#### Acceptance Criteria

1. THE Blockly_Workspace SHALL provide a `temi_while_count` block in the toolbox under the "Control" category.
2. THE `temi_while_count` block SHALL display a numeric field labelled "repetir mientras contador <" with a default value of 5, a minimum of 1, and a maximum of 50.
3. WHEN a student changes the numeric field, THE `temi_while_count` block SHALL accept only integer values between 1 and 50 inclusive.
4. IF a student enters a value outside the range 1–50, THEN THE `temi_while_count` block SHALL clamp the value to the nearest valid bound (1 or 50).
5. THE `temi_while_count` block SHALL expose a Statement_Input named `DO` that accepts any sequence of `temi_*` blocks as its body.
6. THE `temi_while_count` block SHALL connect to the preceding block via a previous-statement connector and to the following block via a next-statement connector, consistent with all other `temi_*` blocks.
7. THE `temi_while_count` block SHALL render with the green colour (hue 120) of the "Control" category, identical to `temi_repeat`.

---

### Requirement 2: temi_while_timer Block Definition

**User Story:** As a student, I want to drag a "repeat while time < N seconds" block onto the canvas, so that the robot keeps repeating a sequence for a fixed duration.

#### Acceptance Criteria

1. THE Blockly_Workspace SHALL provide a `temi_while_timer` block in the toolbox under the "Control" category.
2. THE `temi_while_timer` block SHALL display a numeric field labelled "repetir mientras tiempo <" with a default value of 30, a minimum of 1, and a maximum of 300, followed by a fixed label "segundos".
3. WHEN a student changes the numeric field, THE `temi_while_timer` block SHALL accept only integer values between 1 and 300 inclusive.
4. IF a student enters a value outside the range 1–300, THEN THE `temi_while_timer` block SHALL clamp the value to the nearest valid bound (1 or 300).
5. THE `temi_while_timer` block SHALL expose a Statement_Input named `DO` that accepts any sequence of `temi_*` blocks as its body.
6. THE `temi_while_timer` block SHALL connect to the preceding block via a previous-statement connector and to the following block via a next-statement connector, consistent with all other `temi_*` blocks.
7. THE `temi_while_timer` block SHALL render with the green colour (hue 120) of the "Control" category.

---

### Requirement 3: temi_while_listen Block Definition

**User Story:** As a student, I want to drag a "repeat until hearing a stop word" block onto the canvas, so that the robot keeps repeating a sequence until a student says the expected word.

#### Acceptance Criteria

1. THE Blockly_Workspace SHALL provide a `temi_while_listen` block in the toolbox under the "Control" category.
2. THE `temi_while_listen` block SHALL display a text field labelled "repetir hasta escuchar" with a default value of "listo".
3. THE `temi_while_listen` block SHALL expose a Statement_Input named `DO` that accepts any sequence of `temi_*` blocks as its body.
4. THE `temi_while_listen` block SHALL connect to the preceding block via a previous-statement connector and to the following block via a next-statement connector, consistent with all other `temi_*` blocks.
5. THE `temi_while_listen` block SHALL render with the green colour (hue 120) of the "Control" category.
6. THE `temi_while_listen` block SHALL NOT expose any field for configuring the maximum iteration limit; the limit of 5 is fixed and not visible to the student.

---

### Requirement 4: Command Extraction — temi_while_count

**User Story:** As a student, I want the count-based while block to correctly expand its body commands, so that the robot executes the sequence the right number of times.

#### Acceptance Criteria

1. WHEN `extractCommandsFromWorkspace` encounters a `temi_while_count` block, THE Command_Extractor SHALL read the `LIMIT` field value as the iteration limit (clamped to 1–50).
2. WHEN `extractCommandsFromWorkspace` encounters a `temi_while_count` block, THE Command_Extractor SHALL recursively extract all `RobotExecuteCommand` entries from the `DO` Statement_Input body.
3. THE Command_Extractor SHALL append the extracted inner commands to the output list exactly `LIMIT` times, in order, producing a flat sequence.
4. IF the `DO` Statement_Input body is empty, THEN THE Command_Extractor SHALL append zero commands for that block (no-op).
5. THE Command_Extractor SHALL support `temi_while_count` blocks nested inside other `temi_while_count`, `temi_while_timer`, `temi_while_listen`, or `temi_repeat` blocks, expanding inner loops before outer loops.
6. WHEN a `temi_while_count` block appears in the top-level sequence, THE Command_Extractor SHALL continue walking the `next` chain after the block and append subsequent commands after the expanded commands.

---

### Requirement 5: Command Extraction — temi_while_timer

**User Story:** As a student, I want the timer-based while block to correctly encode its duration, so that the robot knows how long to keep repeating the sequence.

#### Acceptance Criteria

1. WHEN `extractCommandsFromWorkspace` encounters a `temi_while_timer` block, THE Command_Extractor SHALL read the `SECONDS` field value as the duration (clamped to 1–300).
2. WHEN `extractCommandsFromWorkspace` encounters a `temi_while_timer` block, THE Command_Extractor SHALL recursively extract all `RobotExecuteCommand` entries from the `DO` Statement_Input body.
3. THE Command_Extractor SHALL emit a single `WhileTimerCommand` with the `seconds` value and the extracted inner `commands` array, without pre-expanding the body; the Android runtime is responsible for the timing loop.
4. IF the `DO` Statement_Input body is empty, THEN THE Command_Extractor SHALL emit a `WhileTimerCommand` with an empty `commands` array (no-op on the robot).
5. WHEN a `temi_while_timer` block appears in the top-level sequence, THE Command_Extractor SHALL continue walking the `next` chain after the block and append subsequent commands after the `WhileTimerCommand`.

---

### Requirement 6: Command Extraction — temi_while_listen

**User Story:** As a student, I want the listen-based while block to correctly encode the stop word, so that the robot stops repeating when it hears the expected answer.

#### Acceptance Criteria

1. WHEN `extractCommandsFromWorkspace` encounters a `temi_while_listen` block, THE Command_Extractor SHALL read the `STOP_WORD` field value as the stop word (trimmed; defaults to "listo" if empty).
2. WHEN `extractCommandsFromWorkspace` encounters a `temi_while_listen` block, THE Command_Extractor SHALL recursively extract all `RobotExecuteCommand` entries from the `DO` Statement_Input body.
3. THE Command_Extractor SHALL emit a single `WhileListenCommand` with the `stopWord` value, a fixed `maxIterations` of 5, and the extracted inner `commands` array; the Android runtime is responsible for the listen loop.
4. IF the `DO` Statement_Input body is empty, THEN THE Command_Extractor SHALL emit a `WhileListenCommand` with an empty `commands` array (no-op on the robot).
5. WHEN a `temi_while_listen` block appears in the top-level sequence, THE Command_Extractor SHALL continue walking the `next` chain after the block and append subsequent commands after the `WhileListenCommand`.

---

### Requirement 7: TypeScript Command Types

**User Story:** As a developer, I want well-typed command types for each while variant in `robot-adapter.ts`, so that the command model is explicit and type-safe before and after expansion.

#### Acceptance Criteria

1. THE Robot_Adapter SHALL define a `WhileCountCommand` type with a `type` field equal to `"WhileCount"`, a `limit` field of type `number`, and a `commands` field of type `RobotExecuteCommand[]`.
2. THE Robot_Adapter SHALL define a `WhileTimerCommand` type with a `type` field equal to `"WhileTimer"`, a `seconds` field of type `number`, and a `commands` field of type `RobotExecuteCommand[]`.
3. THE Robot_Adapter SHALL define a `WhileListenCommand` type with a `type` field equal to `"WhileListen"`, a `stopWord` field of type `string`, a `maxIterations` field of type `number`, and a `commands` field of type `RobotExecuteCommand[]`.
4. THE Robot_Adapter SHALL add `WhileCountCommand`, `WhileTimerCommand`, and `WhileListenCommand` to the `RobotExecuteCommand` union type.
5. THE Robot_Adapter SHALL export `WhileCountCommand`, `WhileTimerCommand`, and `WhileListenCommand` so they are available to other modules.

---

### Requirement 8: Android Parser — WhileCount Support

**User Story:** As a developer, I want the Android app to parse and execute a `WhileCount` command, so that the robot can run a count-based loop natively.

#### Acceptance Criteria

1. THE Android_Parser SHALL recognise a JSON command object with `"type": "WhileCount"` and extract its `limit` integer field and `commands` array field.
2. WHEN a `WhileCount` command is parsed, THE Android_Parser SHALL add a `RobotCommand.WhileCount` instance to the command list with the parsed `limit` value and the recursively parsed inner `commands`.
3. THE `RobotCommandRunner` SHALL define a `RobotCommand.WhileCount` sealed subclass with a `limit: Int` field and a `commands: List<RobotCommand>` field.
4. WHEN `RobotReflectionRunner` executes a `RobotCommand.WhileCount`, THE RobotCommandRunner SHALL maintain an internal counter starting at 0 and call `runSequence` on the inner commands list on each iteration while the counter is less than `limit`, incrementing the counter by 1 after each iteration.
5. THE RobotCommandRunner SHALL stop the loop when the counter reaches `limit` and return `Result.success(Unit)`.
6. IF `limit` is less than 1, THEN THE RobotCommandRunner SHALL execute the inner sequence zero times and return `Result.success(Unit)`.
7. IF any inner command in an iteration returns a failure, THEN THE RobotCommandRunner SHALL stop execution and propagate the failure, consistent with the existing `runSequence` behaviour.

---

### Requirement 9: Android Parser — WhileTimer Support

**User Story:** As a developer, I want the Android app to parse and execute a `WhileTimer` command, so that the robot can run a duration-based loop natively.

#### Acceptance Criteria

1. THE Android_Parser SHALL recognise a JSON command object with `"type": "WhileTimer"` and extract its `seconds` integer field and `commands` array field.
2. WHEN a `WhileTimer` command is parsed, THE Android_Parser SHALL add a `RobotCommand.WhileTimer` instance to the command list with the parsed `seconds` value and the recursively parsed inner `commands`.
3. THE `RobotCommandRunner` SHALL define a `RobotCommand.WhileTimer` sealed subclass with a `seconds: Int` field and a `commands: List<RobotCommand>` field.
4. WHEN `RobotReflectionRunner` executes a `RobotCommand.WhileTimer`, THE RobotCommandRunner SHALL capture a start timestamp once before the first iteration and call `runSequence` on the inner commands list on each iteration while the elapsed time since the start timestamp is less than `seconds` seconds.
5. THE RobotCommandRunner SHALL NOT reset the start timestamp between iterations; the same timestamp captured at block entry is used for all elapsed-time comparisons.
6. THE RobotCommandRunner SHALL stop the loop when elapsed time reaches or exceeds `seconds` seconds and return `Result.success(Unit)`.
7. IF `seconds` is less than 1, THEN THE RobotCommandRunner SHALL execute the inner sequence zero times and return `Result.success(Unit)`.
8. IF any inner command in an iteration returns a failure, THEN THE RobotCommandRunner SHALL stop execution and propagate the failure, consistent with the existing `runSequence` behaviour.

---

### Requirement 10: Android Parser — WhileListen Support

**User Story:** As a developer, I want the Android app to parse and execute a `WhileListen` command, so that the robot can run a listen-based loop that stops when a student says the expected word.

#### Acceptance Criteria

1. THE Android_Parser SHALL recognise a JSON command object with `"type": "WhileListen"` and extract its `stopWord` string field, `maxIterations` integer field, and `commands` array field.
2. WHEN a `WhileListen` command is parsed, THE Android_Parser SHALL add a `RobotCommand.WhileListen` instance to the command list with the parsed `stopWord`, `maxIterations`, and the recursively parsed inner `commands`.
3. THE `RobotCommandRunner` SHALL define a `RobotCommand.WhileListen` sealed subclass with a `stopWord: String` field, a `maxIterations: Int` field, and a `commands: List<RobotCommand>` field.
4. WHEN `RobotReflectionRunner` executes a `RobotCommand.WhileListen`, THE RobotCommandRunner SHALL execute the first iteration unconditionally because `lastAnswer` is null before any question has been answered.
5. WHEN `RobotReflectionRunner` executes a `RobotCommand.WhileListen`, THE RobotCommandRunner SHALL compare `lastAnswer` to `stopWord` using a case-insensitive string comparison before each subsequent iteration and stop the loop if they are equal.
6. THE RobotCommandRunner SHALL stop the loop after `maxIterations` completed iterations regardless of the `lastAnswer` value, and return `Result.success(Unit)`.
7. IF `maxIterations` is less than 1, THEN THE RobotCommandRunner SHALL execute the inner sequence zero times and return `Result.success(Unit)`.
8. IF any inner command in an iteration returns a failure, THEN THE RobotCommandRunner SHALL stop execution and propagate the failure, consistent with the existing `runSequence` behaviour.

---

### Requirement 11: Toolbox Visibility Control

**User Story:** As a teacher, I want to control whether the while blocks appear in a student's toolbox, so that I can introduce the concepts at the right time in the curriculum.

#### Acceptance Criteria

1. THE Blockly_Workspace SHALL include `"Control"` as a valid value for the `allowedCategories` prop filter, so that `temi_repeat`, `temi_while_count`, `temi_while_timer`, and `temi_while_listen` all fall under the same category.
2. WHEN `allowedCategories` does not include `"Control"`, THE Blockly_Workspace SHALL not render `temi_while_count`, `temi_while_timer`, or `temi_while_listen` in the toolbox.
3. WHEN `allowedCategories` is undefined (no filter), THE Blockly_Workspace SHALL render `temi_while_count`, `temi_while_timer`, and `temi_while_listen` in the toolbox by default.
