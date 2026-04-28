# Design Document — temi-repeat-block

## Overview

This feature adds a `temi_repeat` ("repeat N times") block to the Blockly visual programming workspace used by students to program the Temi robot. The block lets students wrap any sequence of robot commands inside a loop that executes 1–10 times, without duplicating blocks manually.

The change spans three layers:

1. **Blockly UI** (`src/components/blockly-workspace.tsx`) — new block definition with a number field and a statement (container) input, plus a new "Control" toolbox category.
2. **Web adapter** (`src/lib/robot-adapter.ts`) — a `RepeatCommand` type and expansion logic inside `extractCommandsFromWorkspace` that flattens the repeat into a sequence of `RobotExecuteCommand` entries.
3. **Android app** (`TemiLocationServer.kt` / `RobotCommandRunner.kt` / `RobotReflectionRunner.kt`) — a `RobotCommand.Repeat` sealed subclass, parser support, and execution logic.

Additionally, the `"Taller Guía mi salón"` mission in `demo-data.ts` will have `"Control"` added to its `allowedCategories` so students can use the new block in that mission.

---

## Architecture

```mermaid
flowchart TD
    Student["Student (browser)"]
    BW["BlocklyWorkspace\n(blockly-workspace.tsx)"]
    RA["Robot Adapter\n(robot-adapter.ts)"]
    HTTP["HTTP POST /execute\n(JSON payload)"]
    TLS["TemiLocationServer\n(TemiLocationServer.kt)"]
    RCR["RobotCommandRunner\n(RobotReflectionRunner.kt)"]
    Robot["Temi Robot SDK"]

    Student -->|drag & drop| BW
    BW -->|workspaceState| RA
    RA -->|extractCommandsFromWorkspace\n→ flat RobotExecuteCommand[]| HTTP
    HTTP --> TLS
    TLS -->|parseCommandsFromJson\n→ List<RobotCommand>| RCR
    RCR -->|runSequence| Robot
```

The key design decision is **client-side expansion**: `extractCommandsFromWorkspace` flattens the repeat block into a plain sequence of commands before sending to the robot. This keeps the Android parser simple and avoids adding loop-execution logic to the robot's HTTP server. The `RobotCommand.Repeat` type and Android parser are added for **forward-compatibility** only (e.g., future direct-send scenarios), but the primary execution path uses the pre-expanded flat list.

---

## Components and Interfaces

### 1. Blockly Block Definition (`blockly-workspace.tsx`)

A new block type `temi_repeat` is added inside `defineTemiBlocks`:

```typescript
{
  type: "temi_repeat",
  message0: "repetir %1 veces",
  args0: [{ type: "field_number", name: "TIMES", value: 2, min: 1, max: 10, precision: 1 }],
  message1: "%1",
  args1: [{ type: "input_statement", name: "DO" }],
  previousStatement: null,
  nextStatement: null,
  colour: 120,
  tooltip: "Repite los bloques internos N veces",
  helpUrl: ""
}
```

Key points:
- `field_number` with `min: 1`, `max: 10`, `precision: 1` enforces integer clamping natively via Blockly.
- `input_statement` named `"DO"` accepts a vertical stack of `temi_*` blocks.
- `colour: 120` (green) distinguishes it from movement (blue), speech (purple), media (orange/green), and condition (red) blocks.
- `previousStatement: null` and `nextStatement: null` allow it to connect in any sequence position.

A new **"Control"** category is added to the `toolbox` definition:

```typescript
{
  kind: "category",
  name: "Control",
  colour: "#4a7c59",
  contents: [{ kind: "block", type: "temi_repeat" }]
}
```

The existing `allowedCategories` filter in `BlocklyWorkspace` already handles visibility — no additional changes needed there.

### 2. Command Extraction (`robot-adapter.ts`)

**New type:**

```typescript
export type RepeatCommand = {
  type: "Repeat";
  times: number;
  commands: RobotExecuteCommand[];
};
```

`RepeatCommand` is added to the `RobotExecuteCommand` union (for type completeness), but `extractCommandsFromWorkspace` **expands** it inline rather than emitting a `RepeatCommand` in the output array. This keeps the flat contract with the Android endpoint unchanged.

**Updated `walk` function inside `extractCommandsFromWorkspace`:**

```typescript
} else if (b["type"] === "temi_repeat") {
  const times = Math.max(1, Math.min(10, parseInt(fields?.["TIMES"] ?? "2", 10)));
  const doInput = (b["inputs"] as Record<string, unknown>)?.["DO"];
  const innerBlock = (doInput as Record<string, unknown>)?.["block"];
  const innerCommands: RobotExecuteCommand[] = [];
  // Temporarily collect inner commands
  function walkInner(inner: unknown): void { /* same walk logic */ }
  walkInner(innerBlock);
  for (let i = 0; i < times; i++) {
    commands.push(...innerCommands);
  }
}
```

The `walk` function is refactored to accept a `commands` accumulator parameter so inner and outer walks share the same logic without duplication.

### 3. Android — `RobotCommand.Repeat` (`RobotCommandRunner.kt`)

```kotlin
data class Repeat(
    val times: Int,
    val commands: List<RobotCommand>
) : RobotCommand()
```

### 4. Android — Parser (`TemiLocationServer.kt`)

Inside `parseCommandsFromJson`, a new `"Repeat"` case is added:

```kotlin
"Repeat" -> {
    val timesMatch = Regex(""""times"\s*:\s*(\d+)""").find(context)
    val times = timesMatch?.groupValues?.getOrNull(1)?.toIntOrNull() ?: 0
    // Extract the inner "commands" array from context
    val innerCommands = parseInnerCommandsFromContext(context)
    if (innerCommands != null) {
        commands.add(RobotCommand.Repeat(times, innerCommands))
    }
}
```

A helper `parseInnerCommandsFromContext(context: String): List<RobotCommand>?` reuses the existing brace-counting extraction logic to find the nested `"commands"` array within the `Repeat` object and recursively parse it.

### 5. Android — Execution (`RobotReflectionRunner.kt`)

A new branch in the `run` `when` expression:

```kotlin
is RobotCommand.Repeat -> {
    if (command.times < 1) return Result.success(Unit)
    repeat(command.times) { iteration ->
        val result = runSequence(command.commands)
        if (result.isFailure) return result
    }
    Result.success(Unit)
}
```

### 6. Mission Data (`demo-data.ts`)

The `"Taller Guía mi salón"` mission's `allowedCategories` is updated from:

```typescript
allowedCategories: ["Movimiento", "Hablar", "Mostrar", "Condición"]
```

to:

```typescript
allowedCategories: ["Movimiento", "Hablar", "Mostrar", "Condición", "Control"]
```

---

## Data Models

### TypeScript (`robot-adapter.ts`)

```typescript
// New type
export type RepeatCommand = {
  type: "Repeat";
  times: number;           // 1–10
  commands: RobotExecuteCommand[];
};

// Updated union
export type RobotExecuteCommand =
  | NavigateCommand
  | SayCommand
  | ShowImageCommand
  | ShowVideoCommand
  | AskConditionCommand
  | RepeatCommand;          // ← new
```

### Blockly Workspace State (JSON)

When a `temi_repeat` block is serialised by Blockly, it produces:

```json
{
  "type": "temi_repeat",
  "id": "abc123",
  "fields": { "TIMES": 3 },
  "inputs": {
    "DO": {
      "block": {
        "type": "temi_move",
        "fields": { "LOCATION": "Sala Principal" },
        "next": { "block": { "type": "temi_say", "fields": { "TEXT": "Hola" } } }
      }
    }
  },
  "next": { "block": { ... } }
}
```

### Kotlin (`RobotCommandRunner.kt`)

```kotlin
sealed class RobotCommand {
    data class Navigate(val location: String) : RobotCommand()
    data class Say(val text: String) : RobotCommand()
    data class ShowImage(val imageUrl: String, val durationMs: Long = 7000L) : RobotCommand()
    data class ShowVideo(val videoUrl: String) : RobotCommand()
    data class AskCondition(val question: String, val options: List<ConditionOption>) : RobotCommand()
    data class Repeat(val times: Int, val commands: List<RobotCommand>) : RobotCommand()  // ← new
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Repeat count clamping

*For any* integer input to the `TIMES` field validator, the resulting value SHALL always be in the range [1, 10]. Specifically, any value less than 1 SHALL be clamped to 1, and any value greater than 10 SHALL be clamped to 10.

**Validates: Requirements 1.3, 1.4**

---

### Property 2: Flat expansion correctness

*For any* Blockly workspace containing a `temi_repeat` block with count N and an inner sequence of M commands, `extractCommandsFromWorkspace` SHALL produce a flat output where the inner M commands appear exactly N times in order, with any commands before or after the repeat block also preserved in their correct positions.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.6**

---

### Property 3: Nested repeat expansion

*For any* `temi_repeat` block nested inside another `temi_repeat` block with outer count N and inner count M, and an innermost sequence of K commands, `extractCommandsFromWorkspace` SHALL produce exactly N × M × K commands in the correct order.

**Validates: Requirements 2.5**

---

### Property 4: Toolbox category filtering

*For any* `allowedCategories` array that does not contain `"Control"`, the filtered toolbox produced by `BlocklyWorkspace` SHALL contain no entry with `type: "temi_repeat"`.

**Validates: Requirements 5.1, 5.2**

---

### Property 5: Android repeat execution count

*For any* `RobotCommand.Repeat` with `times = N` (where N ≥ 1) and a non-empty inner command list, `RobotReflectionRunner` SHALL invoke `runSequence` on the inner commands exactly N times. When `times < 1`, it SHALL invoke `runSequence` zero times and return `Result.success(Unit)`.

**Validates: Requirements 4.4, 4.5**

---

### Property 6: Android repeat failure propagation

*For any* `RobotCommand.Repeat` where one of the inner commands returns a `Result.failure`, `RobotReflectionRunner` SHALL stop execution at that point and return the same failure, without executing any subsequent commands in that iteration or further iterations.

**Validates: Requirements 4.6**

---

## Error Handling

| Scenario | Layer | Handling |
|---|---|---|
| `TIMES` field is NaN or missing | TypeScript adapter | `parseInt` fallback to `"2"`, then clamped to [1,10] |
| `DO` input is empty (no inner blocks) | TypeScript adapter | `innerCommands` is empty; zero commands appended (no-op) |
| `temi_repeat` nested arbitrarily deep | TypeScript adapter | Recursive `walk` handles any depth; stack depth bounded by Blockly's own nesting limit |
| `Repeat` JSON missing `times` field | Android parser | Defaults to 0; `RobotReflectionRunner` executes zero times (safe no-op) |
| `Repeat` JSON missing `commands` array | Android parser | Returns `null` inner list; command is skipped |
| Inner command fails during repeat | Android runner | `runSequence` returns failure immediately; outer repeat propagates it |
| `times < 1` at runtime | Android runner | Returns `Result.success(Unit)` immediately without executing inner commands |

---

## Testing Strategy

### Unit Tests (TypeScript)

- **`extractCommandsFromWorkspace` with `temi_repeat`**: verify flat expansion for N=1, N=5, empty body, and commands before/after the repeat block.
- **Nested repeat**: verify N×M expansion for a two-level nest.
- **`TIMES` clamping**: verify boundary values (0→1, 1→1, 10→10, 11→10, -5→1).
- **Toolbox filter**: verify `"Control"` category is excluded when not in `allowedCategories`.

### Property-Based Tests (TypeScript — fast-check)

Using [fast-check](https://github.com/dubzzz/fast-check) (already compatible with the Next.js/Jest/Vitest ecosystem):

- **Property 1** — Generate arbitrary integers (including negatives and values > 10), apply the clamp function, assert result ∈ [1,10].
- **Property 2** — Generate arbitrary (N ∈ [1,10], inner command list of length M ∈ [0,5]) pairs, build a synthetic workspace JSON, call `extractCommandsFromWorkspace`, assert output length = N × M and order is preserved.
- **Property 3** — Generate arbitrary (N_outer, N_inner, K_inner_commands) triples, build nested workspace JSON, assert output length = N_outer × N_inner × K.
- **Property 4** — Generate arbitrary subsets of `["Movimiento", "Hablar", "Mostrar", "Audio", "Condición"]` (never including "Control"), apply the toolbox filter, assert no `temi_repeat` block appears.

Each property test runs a minimum of **100 iterations**.

Tag format: `// Feature: temi-repeat-block, Property N: <property_text>`

### Property-Based Tests (Kotlin — kotest with PropTest)

Using [Kotest PropTest](https://kotest.io/docs/proptest/property-based-testing.html):

- **Property 5** — Generate arbitrary `(times: Int, innerCommands: List<RobotCommand>)` pairs using a mock `RobotCommandRunner`. Assert the mock's `runSequence` call count equals `max(0, times)`.
- **Property 6** — Generate arbitrary repeat commands where one inner command is a failing mock. Assert execution stops and the failure is propagated.

Each property test runs a minimum of **100 iterations**.

### Integration Tests

- End-to-end: build a workspace with a `temi_repeat` block, call `executeRobotCommands` against a mock HTTP server, verify the correct flat sequence arrives.
- Android: send a `{"type":"Repeat","times":2,"commands":[...]}` JSON payload to `TemiLocationServer` on a test port, verify `parseCommandsFromJson` returns the correct `RobotCommand.Repeat`.
