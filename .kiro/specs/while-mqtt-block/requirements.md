# Documento de Requisitos: WhileMQTT Block

## Introducción

Este documento define los requisitos del bloque `WhileMQTT`, una nueva primitiva de control para la plataforma de programación visual del robot Temi. El bloque permite ejecutar en bucle infinito una secuencia de comandos hijos y detener el bucle únicamente cuando llega un mensaje a un topic MQTT específico. Al recibir el mensaje de parada, el robot completa la iteración en curso antes de salir del bucle y continúa con el siguiente bloque de la secuencia.

La implementación sigue el mismo patrón que `WhileListen`: una variable `@Volatile` actualizada por un listener externo (cliente MQTT en la app Android en lugar del SDK de ASR de Temi).

---

## Glosario

- **Blockly_UI**: Interfaz visual de programación basada en Blockly que corre en el navegador (Next.js).
- **temi_while_mqtt**: Nombre del bloque Blockly que representa el comando WhileMQTT.
- **WhileMqttCommand**: Tipo TypeScript que representa el comando serializado enviado al robot.
- **RobotCommand.WhileMqtt**: Clase sealed de Kotlin que representa el comando en la app Android.
- **RobotWebSocketClient**: Componente Android que recibe comandos vía WebSocket y los parsea.
- **RobotReflectionRunner**: Componente Android que ejecuta los comandos del robot de forma secuencial.
- **MqttClient**: Cliente MQTT en la app Android que se conecta al broker HiveMQ Cloud.
- **MqttConfig**: Objeto Kotlin con las constantes de conexión al broker HiveMQ (URL, puerto, credenciales).
- **stopReceived**: Variable `@Volatile` en `RobotReflectionRunner` que se activa al recibir un mensaje MQTT.
- **topic**: String que identifica el canal MQTT al que el robot se suscribe para recibir la señal de parada.
- **extractCommandsFromWorkspace**: Función TypeScript que convierte el estado JSON del workspace Blockly en una lista de `RobotExecuteCommand`.
- **RobotExecuteCommand**: Unión de tipos TypeScript que representa todos los comandos ejecutables por el robot.
- **HiveMQ_Broker**: Broker MQTT en la nube (HiveMQ Cloud) al que se conecta la app Android.

---

## Requisitos

### Requisito 1: Bloque Blockly temi_while_mqtt

**User Story:** Como educador, quiero un bloque visual "repetir hasta mensaje MQTT" en el toolbox de Control, para poder programar al robot para que ejecute una secuencia en bucle hasta recibir una señal externa.

#### Criterios de Aceptación

1. THE Blockly_UI SHALL incluir el bloque `temi_while_mqtt` en la categoría "Control" del toolbox.
2. THE bloque `temi_while_mqtt` SHALL exponer un campo de texto `TOPIC` con valor por defecto `"robot/stop"`.
3. THE bloque `temi_while_mqtt` SHALL aceptar bloques hijos en el input `DO` para definir la secuencia a repetir.
4. WHEN el campo `TOPIC` está vacío, THE Blockly_UI SHALL usar `"robot/stop"` como valor efectivo del topic.

---

### Requisito 2: Extracción del comando en el workspace Blockly

**User Story:** Como sistema, quiero que `extractCommandsFromWorkspace` convierta el bloque `temi_while_mqtt` en un `WhileMqttCommand` correcto, para que el comando pueda enviarse al robot con el topic y los comandos hijos adecuados.

#### Criterios de Aceptación

1. WHEN el workspace contiene un bloque `temi_while_mqtt`, THE `extractCommandsFromWorkspace` SHALL producir exactamente un `WhileMqttCommand` con el `topic` y la lista `commands` correctos.
2. WHEN el campo `TOPIC` del bloque está vacío, THE `extractCommandsFromWorkspace` SHALL asignar `"robot/stop"` como valor del campo `topic` del `WhileMqttCommand`.
3. WHEN el bloque `temi_while_mqtt` no tiene bloques hijos, THE `extractCommandsFromWorkspace` SHALL producir un `WhileMqttCommand` con `commands` como lista vacía.
4. THE `WhileMqttCommand` SHALL ser parte de la unión de tipos `RobotExecuteCommand`.

---

### Requisito 3: Serialización y parsing del comando

**User Story:** Como sistema, quiero que `WhileMqttCommand` se serialice correctamente a JSON y que `RobotWebSocketClient` lo parsee de vuelta a `RobotCommand.WhileMqtt`, para garantizar la integridad del comando en el transporte WebSocket.

#### Criterios de Aceptación

1. THE `WhileMqttCommand` SHALL serializarse a JSON con los campos `type`, `topic` y `commands`.
2. WHEN `RobotWebSocketClient` recibe un JSON con `type` igual a `"WhileMqtt"` o `"whileMqtt"`, THE `RobotWebSocketClient` SHALL parsear el mensaje como `RobotCommand.WhileMqtt` con el `topic` y los `commands` correctos.
3. FOR ALL `WhileMqttCommand` válidos, serializar a JSON y luego parsear con `RobotWebSocketClient` SHALL producir un `RobotCommand.WhileMqtt` equivalente al original (propiedad de round-trip).

---

### Requisito 4: Ejecución del bucle WhileMQTT en el robot

**User Story:** Como educador, quiero que el robot ejecute la secuencia de comandos en bucle hasta recibir un mensaje MQTT en el topic configurado, para poder detener el comportamiento del robot de forma remota y controlada.

#### Criterios de Aceptación

1. WHEN `RobotReflectionRunner` ejecuta `RobotCommand.WhileMqtt`, THE `RobotReflectionRunner` SHALL suscribirse al topic MQTT indicado antes de iniciar el bucle.
2. WHILE el bucle está activo y no se ha recibido ningún mensaje en el topic, THE `RobotReflectionRunner` SHALL ejecutar la secuencia de comandos hijos repetidamente.
3. WHEN llega un mensaje al topic MQTT durante una iteración, THE `RobotReflectionRunner` SHALL completar la iteración en curso antes de salir del bucle.
4. WHEN llega un mensaje al topic MQTT entre iteraciones, THE `RobotReflectionRunner` SHALL salir del bucle sin iniciar una nueva iteración.
5. WHEN el bucle finaliza, THE `RobotReflectionRunner` SHALL continuar ejecutando los comandos posteriores al bloque `WhileMqtt` en la secuencia.
6. THE variable `stopReceived` SHALL ser monotónica: una vez establecida en `true`, no podrá volver a `false` durante la ejecución del bucle.

---

### Requisito 5: Gestión del cliente MQTT

**User Story:** Como sistema, quiero que el cliente MQTT se conecte, suscriba y desconecte correctamente durante la ejecución del bloque WhileMQTT, para garantizar la limpieza de recursos y la estabilidad de la app Android.

#### Criterios de Aceptación

1. WHEN `whileMqttAndWait` inicia, THE `MqttClient` SHALL conectarse al broker HiveMQ usando las credenciales de `MqttConfig` con TLS (`ssl://`).
2. WHEN `whileMqttAndWait` finaliza (tanto en éxito como en error), THE `MqttClient` SHALL desconectarse del broker y desuscribirse del topic en el bloque `finally`.
3. IF la conexión al broker MQTT falla, THEN THE `RobotReflectionRunner` SHALL retornar `Result.failure` con el error correspondiente.
4. THE `MqttClient` SHALL usar un `clientId` único generado con el prefijo `MqttConfig.CLIENT_ID_PREFIX` más un UUID aleatorio.

---

### Requisito 6: Seguridad de las credenciales MQTT

**User Story:** Como administrador de la plataforma, quiero que las credenciales MQTT permanezcan exclusivamente en la app Android, para evitar que se expongan en el tráfico de red o en el código del cliente web.

#### Criterios de Aceptación

1. THE JSON enviado desde la plataforma web al robot SHALL contener únicamente los campos `type`, `topic` y `commands`, sin incluir credenciales MQTT.
2. THE `MqttConfig` SHALL almacenar las credenciales MQTT exclusivamente en la app Android.
3. THE `MqttClient` SHALL usar TLS (`ssl://`) para cifrar la conexión al broker HiveMQ Cloud.

---

## Propiedades de Corrección

*Una propiedad es una característica o comportamiento que debe mantenerse verdadero en todas las ejecuciones válidas del sistema — esencialmente, una declaración formal sobre lo que el sistema debe hacer. Las propiedades sirven como puente entre las especificaciones legibles por humanos y las garantías de corrección verificables por máquinas.*

### Propiedad 1: Round-trip de serialización de WhileMqttCommand

*Para cualquier* `WhileMqttCommand` válido (con topic no vacío y lista de comandos hijos arbitraria), serializar a JSON y luego parsear con `RobotWebSocketClient` debe producir un `RobotCommand.WhileMqtt` equivalente al original.

**Valida: Requisitos 3.3**

---

### Propiedad 2: Extracción correcta del workspace

*Para cualquier* workspace Blockly que contenga un bloque `temi_while_mqtt` con un topic arbitrario y una lista arbitraria de bloques hijos, `extractCommandsFromWorkspace` debe producir exactamente un `WhileMqttCommand` con el topic correcto y los comandos hijos correctos.

**Valida: Requisitos 2.1**

---

### Propiedad 3: Completitud de iteración ante mensaje MQTT

*Para cualquier* lista de comandos hijos y cualquier momento en que `stopReceived` se active durante la iteración N, `whileMqttAndWait` debe ejecutar exactamente N iteraciones completas antes de salir del bucle.

**Valida: Requisitos 4.3, 4.4**

---

### Propiedad 4: Limpieza garantizada del cliente MQTT

*Para cualquier* ejecución de `whileMqttAndWait` (exitosa o fallida, con cualquier topic y cualquier lista de comandos), el cliente MQTT debe desconectarse y desuscribirse del topic al finalizar.

**Valida: Requisitos 5.2**

---

### Propiedad 5: Monotonía de stopReceived

*Para cualquier* ejecución del bucle `whileMqttAndWait`, la variable `stopReceived` es monotónica: una vez que toma el valor `true`, no puede volver a `false` en ninguna iteración posterior.

**Valida: Requisitos 4.6**

---

### Propiedad 6: Continuación de la secuencia tras el bucle

*Para cualquier* secuencia de comandos que contenga un `WhileMqtt` seguido de otros comandos, tras la finalización del bucle (por recepción del mensaje MQTT), todos los comandos posteriores deben ejecutarse correctamente.

**Valida: Requisitos 4.5**
