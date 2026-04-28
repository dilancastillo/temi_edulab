# Requirements Document

## Introduction

This feature adds a "repeat N times" (for loop) block to the Blockly visual programming workspace used by students to program the Temi robot. Students will be able to drag a `temi_repeat` block onto the canvas, set a repetition count (1–10), and nest any sequence of existing robot command blocks inside it. When the program is executed, the nested commands are expanded and sent to the robot in order, repeating the full inner sequence the specified number of times.

The feature spans three layers:
1. **Blockly UI** — a new block definition with a number input and a statement (container) input.
2. **Web adapter** (`robot-adapter.ts`) — command extraction that expands the repeat block into a flat list of `RobotExecuteCommand` entries.
3. **Android app** (`TemiLocationServer.kt` / `RobotCommandRunner.kt`) — a new `Repeat` command type and parser so the robot can execute the loop natively if needed in the future (forward-compatibility).

---

## Glossary

- **Blockly_Workspace**: The visual drag-and-drop programming environment rendered in the browser via the Blockly library.
- **temi_repeat Block**: The new Blockly block that wraps a sequence of robot command blocks and repeats them N times.
- **RepeatCommand**: The TypeScript type added to `robot-adapter.ts` representing a repeat instruction with a count and a nested list of commands.
- **Robot_Adapter**: The TypeScript module (`src/lib/robot-adapter.ts`) responsible for translating Blockly workspace state into `RobotExecuteCommand` arrays sent to the robot.
- **Command_Extractor**: The `extractCommandsFromWorkspace` function inside `Robot_Adapter`.
- **Android_Parser**: The `parseCommandsFromJson` method inside `TemiLocationServer.kt` that deserialises the JSON payload sent by the web app.
- **RobotCommandRunner**: The Kotlin interface and its implementation (`RobotReflectionRunner`) that executes `RobotCommand` objects on the physical Temi robot.
- **Statement_Input**: A Blockly block input that accepts a vertical stack of other blocks (used for the body of the repeat loop).
- **Repetition_Count**: The integer value (1–10) that controls how many times the inner block sequence is executed.

---

## Requirements

### Requirement 1: temi_repeat Blockly Block Definition

**User Story:** As a student, I want to drag a "repeat N times" block onto the canvas and place other robot blocks inside it, so that I can make the robot perform a sequence of actions multiple times without duplicating blocks.

#### Acceptance Criteria

1. THE Blockly_Workspace SHALL provide a `temi_repeat` block in the toolbox under a "Control" category.
2. THE `temi_repeat` block SHALL display a numeric field labelled with the repetition count, defaulting to 2.
3. WHEN a student changes the numeric field, THE `temi_repeat` block SHALL accept only integer values between 1 and 10 inclusive.
4. IF a student enters a value outside the range 1–10, THEN THE `temi_repeat` block SHALL clamp the value to the nearest valid bound (1 or 10).
5. THE `temi_repeat` block SHALL expose a Statement_Input named `DO` that accepts any sequence of `temi_*` blocks as its body.
6. THE `temi_repeat` block SHALL connect to the preceding block via a previous-statement connector and to the following block via a next-statement connector, consistent with all other `temi_*` blocks.
7. THE `temi_repeat` block SHALL render with a visually distinct colour (hue 120, green) to differentiate it from movement, speech, and media blocks.

---

### Requirement 2: Command Extraction — Repeat Expansion

**User Story:** As a student, I want the "repeat" block to correctly send the nested commands to the robot the right number of times, so that the robot physically repeats the sequence.

#### Acceptance Criteria

1. WHEN `extractCommandsFromWorkspace` encounters a `temi_repeat` block, THE Command_Extractor SHALL read the `TIMES` field value as the Repetition_Count.
2. WHEN `extractCommandsFromWorkspace` encounters a `temi_repeat` block, THE Command_Extractor SHALL recursively extract all `RobotExecuteCommand` entries from the `DO` Statement_Input body.
3. THE Command_Extractor SHALL append the extracted inner commands to the output list exactly Repetition_Count times, in order, producing a flat sequence.
4. IF the `DO` Statement_Input body is empty, THEN THE Command_Extractor SHALL append zero commands for that repeat block (no-op).
5. THE Command_Extractor SHALL support `temi_repeat` blocks nested inside other `temi_repeat` blocks, expanding inner loops before outer loops.
6. WHEN a `temi_repeat` block appears in the top-level sequence, THE Command_Extractor SHALL continue walking the `next` chain after the repeat block and append subsequent commands after the expanded repeat commands.

---

### Requirement 3: RepeatCommand TypeScript Type

**User Story:** As a developer, I want a well-typed `RepeatCommand` in `robot-adapter.ts`, so that the repeat structure can be represented in the command model before expansion.

#### Acceptance Criteria

1. THE Robot_Adapter SHALL define a `RepeatCommand` type with a `type` field equal to `"Repeat"`, a `times` field of type `number`, and a `commands` field of type `RobotExecuteCommand[]`.
2. THE Robot_Adapter SHALL add `RepeatCommand` to the `RobotExecuteCommand` union type.
3. THE Robot_Adapter SHALL export `RepeatCommand` so it is available to other modules.

---

### Requirement 4: Android Parser — Repeat Command Support

**User Story:** As a developer, I want the Android app to parse and execute a `Repeat` command from the JSON payload, so that the robot can handle repeat instructions sent directly without prior client-side expansion.

#### Acceptance Criteria

1. THE Android_Parser SHALL recognise a JSON command object with `"type": "Repeat"` and extract its `times` integer field and `commands` array field.
2. WHEN a `Repeat` command is parsed, THE Android_Parser SHALL add a `RobotCommand.Repeat` instance to the command list with the parsed `times` value and the recursively parsed inner `commands`.
3. THE `RobotCommandRunner` SHALL define a `RobotCommand.Repeat` sealed subclass with a `times: Int` field and a `commands: List<RobotCommand>` field.
4. WHEN `RobotReflectionRunner` executes a `RobotCommand.Repeat`, THE RobotCommandRunner SHALL call `runSequence` on the inner commands list exactly `times` times in order.
5. IF `times` is less than 1, THEN THE RobotCommandRunner SHALL execute the inner sequence zero times and return `Result.success(Unit)`.
6. IF any inner command in a repeat iteration returns a failure, THEN THE RobotCommandRunner SHALL stop execution and propagate the failure, consistent with the existing `runSequence` behaviour.

---

### Requirement 5: Toolbox Visibility Control

**User Story:** As a teacher, I want to control whether the repeat block appears in a student's toolbox, so that I can introduce the concept at the right time in the curriculum.

#### Acceptance Criteria

1. THE Blockly_Workspace SHALL include `"Control"` as a valid value for the `allowedCategories` prop filter.
2. WHEN `allowedCategories` does not include `"Control"`, THE Blockly_Workspace SHALL not render the `temi_repeat` block in the toolbox.
3. WHEN `allowedCategories` is undefined (no filter), THE Blockly_Workspace SHALL render the `temi_repeat` block in the toolbox by default.
