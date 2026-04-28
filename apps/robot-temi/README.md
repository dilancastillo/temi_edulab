# Esbot EduLab Robot Layer

Aplicacion Android nativa para Temi V3 dentro del monorepo de Esbot EduLab.

## Alcance de esta app

- Runtime local de misiones.
- Interfaz fisica visible para el aula.
- Puente aislado hacia el SDK oficial de temi.
- Buffer y cola local persistidos con Room.
- Modo seguro operativo con bloqueos y recuperacion.
- Experiencia visible para estudiantes durante la clase.

## Estado actual de la Fase 4

- La app ya esta especializada para la mision `Temi guia mi salon`.
- La experiencia visible del robot sigue el flujo real del taller:
  - standby del aula,
  - aprobacion docente,
  - turno del equipo,
  - recorrido de tres lugares,
  - despedida y regreso a punto base.
- La UI del robot ahora muestra:
  - equipo actual y siguiente equipo,
  - modo de trabajo del taller,
  - ruta visible del recorrido,
  - mensajes mas simples y amigables para primaria,
  - feedback mas claro en error y modo seguro.
- La sincronizacion real con la plataforma ya queda planteada en codigo:
  - configuracion de URL del backend desde el panel docente,
  - pairing real con codigo y polling,
  - sincronizacion de ubicaciones,
  - heartbeat,
  - polling de sesiones,
  - descarga del runtime real,
  - reporte de eventos.

## Pantallas incluidas

1. Home / Standby de aula.
2. Clase en progreso.
3. Ejecucion de mision.
4. Interaccion estudiantil.
5. Error recuperable.
6. Modo seguro.

## Decisiones tecnicas

- Kotlin + Jetpack Compose.
- Android Gradle Plugin 9.0.0.
- Compose moderno con el plugin oficial de Kotlin.
- KSP 2.3.4 para compatibilidad con AGP 9 y built-in Kotlin.
- Room 2.8.4 para snapshot, cola local, incidentes y diagnostico de ubicaciones.
- `com.robotemi:sdk:1.137.1` encapsulado detras de un bridge por reflexion para reducir acoplamiento a cambios de API.
- Sync real por polling con token de dispositivo.
- Persistencia local de configuracion de sync con DataStore.
- `android:usesCleartextTraffic="true"` para pruebas locales sobre HTTP en red de aula.

## Estado de integracion

- La app intenta hablar con Temi V3 mediante el SDK oficial.
- Si una llamada del SDK falla o no esta disponible, el bridge cae a un comportamiento seguro y la UI sigue operativa.
- El panel docente ya permite:
  - guardar la URL de la API,
  - crear codigo de vinculacion,
  - sincronizar manualmente.
- El robot ya puede pedir pairing, esperar confirmacion en la web, recibir token y empezar a sincronizar.
- El runtime descargado desde backend prioriza la entrega del estudiante cuando ya existe una submission valida.

## Verificacion en este entorno

En este workspace no hay `java`, `gradle` ni `adb` en PATH, asi que aqui no pude compilar, instalar ni ejecutar la app Android. La estructura, el codigo y la documentacion quedan listos para abrirse en Android Studio o compilarse en una maquina con toolchain Android.

## Siguientes pasos sugeridos

1. Abrir `apps/robot-temi` en Android Studio.
2. Configurar el SDK de Android 36 y JDK 17.
3. Generar o completar el Gradle wrapper si se desea build reproducible por CLI.
4. Instalar la app en Temi V3 y validar:
   - URL del backend,
   - pairing web <-> robot,
   - permisos,
   - mapa y ubicaciones,
   - sync de ubicaciones,
   - heartbeat,
   - polling de sesiones,
   - TTS,
   - navegacion,
   - boton oculto de docente,
   - modo seguro.

## Fuentes oficiales consultadas

- Android Gradle Plugin 9.0.0: https://developer.android.com/build/releases/agp-9-0-0-release-notes
- Compose releases: https://developer.android.com/jetpack/androidx/releases/compose
- Activity releases: https://developer.android.com/jetpack/androidx/releases/activity
- Lifecycle releases: https://developer.android.com/jetpack/androidx/releases/lifecycle
- Room releases: https://developer.android.com/jetpack/androidx/releases/room
- Compose compiler migration guide: https://kotlinlang.org/docs/compose-compiler-migration-guide.html
- KSP releases: https://github.com/google/ksp/releases
- Temi SDK repository: https://github.com/robotemi/sdk
- Temi SDK releases: https://github.com/robotemi/sdk/releases
