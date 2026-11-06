# Historial de versiones de la app del robot (App_Edulab)

Formato: `MAYOR.MENOR.PARCHE`.

- **MAYOR**: cambio que obliga a actualizar la plataforma web al tiempo (por ejemplo, un cambio en el protocolo).
- **MENOR**: algo nuevo que hace el robot, por ejemplo un bloque nuevo.
- **PARCHE**: corrección de un error.

En cada entrega al robot:

1. Subir `versionCode` en 1 y ajustar `versionName` en `app/build.gradle.kts`.
2. Anotar los cambios aquí.
3. Marcar el commit con la etiqueta `app-vX.Y.Z`.

## 1.0.0 (versionCode 1) — 2026-11-06

Primera versión numerada. Es la app que corre en el robot Temi a partir de esta fecha.

- Se conecta a la plataforma por WebSocket (`wss://edulab.esbot.co/api/robot/ws`) con el número de serie del robot como ID. No acepta el ID "unknown".
- Ejecuta los programas en bloques que envía la web:
  - ir a una ubicación;
  - decir un texto, con voz, velocidad, tono, idioma y animación;
  - preguntar y decidir;
  - preguntar y guardar la respuesta;
  - mostrar una imagen;
  - reproducir un video;
  - repetir, repetir con contador, repetir por tiempo y repetir hasta escuchar una palabra;
  - repetir hasta la señal de un sensor (MQTT);
  - esperar.
- Bloque «reproducir audio»: campana, aplausos o confirmación. Los sonidos van incluidos en la app.
- Permite cancelar un programa en curso y envía las ubicaciones del mapa a la web.
- Pantalla de espera con animación y una barra superior con hora, idioma, ID del robot, batería y conexión a internet.
