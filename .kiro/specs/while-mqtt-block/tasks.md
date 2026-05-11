# Plan de Implementación: WhileMQTT Block

## Visión General

Implementar el bloque `temi_while_mqtt` de extremo a extremo: definición visual en Blockly, extracción del comando en TypeScript, parsing en el cliente WebSocket Android y ejecución del bucle con cliente MQTT en `RobotReflectionRunner`.

---

## Tareas

- [x] 1. Añadir el tipo `WhileMqttCommand` a `robot-adapter.ts`
  - Declarar `export type WhileMqttCommand = { type: "WhileMqtt"; topic: string; commands: RobotExecuteCommand[] }` en `src/lib/robot-adapter.ts`
  - Añadir `WhileMqttCommand` a la unión `RobotExecuteCommand`
  - _Requisitos: 2.4, 3.1_

- [x] 2. Implementar la extracción del bloque `temi_while_mqtt` en `extractCommandsFromWorkspace`
  - [x] 2.1 Añadir el caso `temi_while_mqtt` en la función `walk` de `extractCommandsFromWorkspace`
    - Leer el campo `TOPIC`; si está vacío usar `"robot/stop"` como valor por defecto
    - Recorrer el input `DO` para obtener los comandos hijos con `walk`
    - Hacer `acc.push({ type: "WhileMqtt", topic, commands: innerCommands })`
    - _Requisitos: 2.1, 2.2, 2.3_

  - [ ]* 2.2 Escribir tests de propiedad para `extractCommandsFromWorkspace` (Propiedad 2)
    - **Propiedad 2: Extracción correcta del workspace**
    - Para cualquier topic arbitrario y lista arbitraria de bloques hijos, `extractCommandsFromWorkspace` produce exactamente un `WhileMqttCommand` con el topic y comandos correctos
    - **Valida: Requisitos 2.1**

- [x] 3. Definir el bloque Blockly `temi_while_mqtt` en la UI
  - Localizar el archivo donde se registran los bloques Blockly (p. ej. `blockly-workspace.tsx` o archivo de definiciones de bloques)
  - Registrar el bloque con la definición JSON del diseño: campo `TOPIC` (default `"robot/stop"`) e input `DO`
  - Añadir el bloque a la categoría "Control" del toolbox
  - _Requisitos: 1.1, 1.2, 1.3, 1.4_

- [x] 4. Checkpoint — Verificar la capa web
  - Asegurarse de que todos los tests de TypeScript pasan. Consultar al usuario si surgen dudas.

- [x] 5. Añadir `RobotCommand.WhileMqtt` al modelo de comandos Android
  - En `RobotCommandRunner.kt`, añadir `data class WhileMqtt(val topic: String, val commands: List<RobotCommand>) : RobotCommand()`
  - _Requisitos: 3.1_

- [x] 6. Añadir el parser de `WhileMqtt` en `RobotWebSocketClient`
  - [x] 6.1 Añadir el caso `"whileMqtt", "WhileMqtt"` en `parseCommand`
    - Parsear `topic` y `commands` del `JsonObject`
    - Retornar `RobotCommand.WhileMqtt(topic, parseCommands(...))`
    - _Requisitos: 3.2_

  - [ ]* 6.2 Escribir test de propiedad para el round-trip de serialización (Propiedad 1)
    - **Propiedad 1: Round-trip de serialización de WhileMqttCommand**
    - Para cualquier `WhileMqttCommand` válido, serializar a JSON y parsear con `parseCommand` debe producir un `RobotCommand.WhileMqtt` equivalente
    - **Valida: Requisitos 3.3**

- [x] 7. Crear `MqttConfig` con las credenciales HiveMQ en la app Android
  - Crear el objeto `MqttConfig` en el paquete `com.esbot.edulab.core.robot`
  - Definir las constantes `BROKER_URI`, `PORT`, `USERNAME`, `PASSWORD` y `CLIENT_ID_PREFIX`
  - Usar TLS (`ssl://`) en `BROKER_URI`
  - _Requisitos: 5.1, 6.1, 6.2, 6.3_

- [x] 8. Añadir la dependencia del cliente MQTT en `build.gradle.kts`
  - Añadir `implementation("org.eclipse.paho:org.eclipse.paho.client.mqttv3:<version>")` en `apps/App_Edulab/app/build.gradle.kts`
  - _Requisitos: 5.1_

- [x] 9. Implementar `whileMqttAndWait` en `RobotReflectionRunner`
  - [x] 9.1 Implementar la función privada `whileMqttAndWait(topic: String, commands: List<RobotCommand>): Result<Unit>`
    - Declarar `@Volatile var stopReceived = false`
    - Construir el cliente MQTT con `buildMqttClient()` usando `MqttConfig`; generar `clientId` con `CLIENT_ID_PREFIX + UUID.randomUUID()`
    - Suscribirse al topic con callback que establece `stopReceived = true`
    - Ejecutar el bucle `while (true)`: llamar `runSequence(commands)`, retornar en fallo, comprobar `stopReceived` y hacer `break` si es `true`
    - Desconectar y desuscribir en el bloque `finally`
    - _Requisitos: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.2, 5.3, 5.4_

  - [x] 9.2 Añadir el caso `is RobotCommand.WhileMqtt` en el `when` de `run()`
    - Delegar a `whileMqttAndWait(command.topic, command.commands)`
    - _Requisitos: 4.1_

  - [ ]* 9.3 Escribir test de propiedad para la completitud de iteración (Propiedad 3)
    - **Propiedad 3: Completitud de iteración ante mensaje MQTT**
    - Para cualquier lista de comandos y cualquier momento en que `stopReceived` se active durante la iteración N, el bucle ejecuta exactamente N iteraciones completas antes de salir
    - Usar mock de `runSequence` y mock del cliente MQTT
    - **Valida: Requisitos 4.3, 4.4**

  - [ ]* 9.4 Escribir test de propiedad para la limpieza del cliente MQTT (Propiedad 4)
    - **Propiedad 4: Limpieza garantizada del cliente MQTT**
    - Para cualquier ejecución de `whileMqttAndWait` (exitosa o fallida), el cliente MQTT siempre se desconecta y desuscribe al finalizar
    - **Valida: Requisitos 5.2**

  - [ ]* 9.5 Escribir test de propiedad para la monotonía de `stopReceived` (Propiedad 5)
    - **Propiedad 5: Monotonía de stopReceived**
    - Una vez que `stopReceived` toma el valor `true`, no puede volver a `false` en ninguna iteración posterior
    - **Valida: Requisitos 4.6**

  - [ ]* 9.6 Escribir test de propiedad para la continuación de la secuencia (Propiedad 6)
    - **Propiedad 6: Continuación de la secuencia tras el bucle**
    - Para cualquier secuencia con `WhileMqtt` seguido de otros comandos, tras la parada del bucle todos los comandos posteriores se ejecutan correctamente
    - **Valida: Requisitos 4.5**

- [x] 10. Checkpoint final — Asegurarse de que todos los tests pasan
  - Verificar que todos los tests unitarios y de propiedad pasan. Consultar al usuario si surgen dudas.

## Notas

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia los requisitos específicos para trazabilidad
- Los tests de propiedad usan Kotest (Kotlin) y fast-check (TypeScript)
- Las credenciales MQTT nunca se incluyen en el JSON enviado al robot (solo el `topic`)
