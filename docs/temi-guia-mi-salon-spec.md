# Temi guia mi salon

## Estado

- Estado: propuesta funcional aprobada para implementacion
- Mision principal temporal del producto
- Convive por ahora con la mision demo existente

## Resumen

`Temi guia mi salon` es la primera mision real para talleres de primaria con Temi V3.

Esta mision esta pensada para:

- estudiantes de grado quinto
- edades entre 9 y 10 anos
- cero conocimiento previo en robotica o programacion
- un solo robot Temi por salon
- ejecucion por turnos individuales o por equipos

El objetivo es que el estudiante programe una secuencia simple para que Temi:

1. salude
2. vaya al lugar 1
3. explique el lugar 1
4. vaya al lugar 2
5. explique el lugar 2
6. vaya al lugar 3
7. explique el lugar 3
8. se despida
9. vuelva al punto base

## Proposito pedagogico

La mision introduce pensamiento computacional y robotica educativa de forma concreta, cercana y emocionalmente segura.

El estudiante comprende que:

- un robot necesita instrucciones claras
- una tarea compleja se puede dividir en pasos
- el orden de los pasos cambia el resultado
- equivocarse y corregir hace parte de programar

## Valor STEAM

La mision aplica a STEAM de forma real:

- Ciencia: relacion robot-entorno, seguridad, movimiento y observacion
- Tecnologia: uso de capa web estudiante y uso de Temi como dispositivo programable
- Ingenieria: construir una solucion funcional, probarla y mejorarla
- Arte: mensajes creativos, tono de guia, expresion oral y visual
- Matematicas: secuencias, orden, espacio, tiempo y logica

## Principios de diseno

### Principios pedagogicos

- exito temprano
- una decision importante por pantalla
- texto corto
- lenguaje concreto
- error como oportunidad de mejora
- trabajo por micro-retos

### Principios UX/UI

- KISS
- infantil y atractivo
- botones grandes
- iconos muy claros
- pocas opciones visibles al mismo tiempo
- celebracion suave sin volverlo competitivo
- feedback inmediato
- nada de lenguaje tecnico

### Principios operativos

- las ubicaciones de produccion vienen solo del robot
- el docente prepara el taller antes de iniciar
- el robot no ejecuta sin validacion del aula
- el robot no ejecuta sin aprobacion del docente
- el robot vuelve al punto base al final de cada turno
- debe existir modo `demo segura` sin movimiento real

## Estructura del taller

### Fase 1. Inspiracion

- duracion: 10 min
- objetivo: curiosidad y confianza

Actividad:

- presentacion corta de Temi
- demostracion breve de movimiento y voz
- mensaje clave: "Temi hace exactamente lo que le indicamos"

### Fase 2. Exploracion guiada

- duracion: 10 a 15 min
- objetivo: entender secuencia basica

Bloques o piezas minimas:

- iniciar
- hablar
- ir a lugar
- esperar
- finalizar

### Fase 3. Construccion

- duracion: 25 a 35 min
- objetivo: construir la mision completa

### Fase 4. Prueba y mejora

- duracion: 10 a 15 min
- objetivo: introducir iteracion y correccion

### Fase 5. Presentacion final

- duracion: 10 min
- objetivo: apropiacion, comunicacion y cierre emocional

## Arquitectura didactica de la mision

La mision se divide en micro-retos.

### Micro-reto 1. Temi saluda

Objetivo:

- iniciar mision
- elegir un saludo

Resultado esperado:

- Temi dice un saludo corto y amable

### Micro-reto 2. Temi va al lugar 1

Objetivo:

- seleccionar el primer lugar
- elegir o redactar un mensaje corto

Resultado esperado:

- Temi va al lugar 1 y lo presenta

### Micro-reto 3. Temi va al lugar 2

Misma estructura del reto 2.

### Micro-reto 4. Temi va al lugar 3

Misma estructura del reto 2.

### Micro-reto 5. Temi se despide y vuelve

Objetivo:

- elegir despedida
- volver al punto base

Resultado esperado:

- Temi cierra el recorrido y queda listo para el siguiente turno

## Capa profesor

## Objetivo

Permitir preparar y ejecutar el taller sin friccion operativa.

## Nueva experiencia principal

Crear una experiencia nueva llamada `Preparar taller`.

### Pantalla 1. Biblioteca de misiones

La mision `Temi guia mi salon` debe aparecer:

- como primera mision destacada
- con tarjeta principal
- con copy corto y claro para primaria

Acciones:

- vista previa
- preparar taller

### Pantalla 2. Preparar taller

Campos:

- nombre del taller
- curso
- modo de participacion:
  - individual
  - por equipos
- modo de dispositivo:
  - un dispositivo por estudiante
  - un dispositivo por equipo
  - demostracion guiada por docente
- tiempo por turno:
  - 5 min
  - 7 min
  - 10 min
  - personalizado
- modo de ejecucion:
  - normal
  - demo segura
- punto base del robot

### Pantalla 3. Configurar ubicaciones

El docente debe elegir tres ubicaciones reales sincronizadas por el robot.

Para cada ubicacion debe configurar:

- ubicacion real del robot
- alias amigable visible para ninos
- icono
- mensaje:
  - plantilla editable
  - texto libre corto

Restricciones:

- maximo 3 ubicaciones
- sin duplicados
- limite sugerido de mensaje: 90 caracteres

Ejemplos de alias:

- Nuestro tablero
- Biblioteca del salon
- Rincon creativo

### Pantalla 4. Validacion del aula

Checklist obligatorio:

- robot conectado
- bateria suficiente
- mapa listo
- 3 ubicaciones validas
- punto base valido
- ruta segura
- modo normal o demo segura confirmado

Estados:

- listo
- necesita revision
- bloqueado

### Pantalla 5. Ejecucion del taller

Debe permitir:

- ver cola de turnos
- ver estudiante o equipo actual
- ver siguiente turno
- iniciar taller
- aprobar inicio
- siguiente turno
- repetir turno
- pausar
- pedir ayuda
- finalizar taller

Indicadores visibles:

- robot conectado
- modo de ejecucion
- tiempo restante
- micro-reto actual
- estado del robot

### Pantalla 6. Resultados y evidencia

Por turno debe quedar:

- completado o no completado
- cantidad de intentos
- errores corregidos
- observacion docente
- rubrica resumida

## Rubrica docente

Campos:

- secuencia correcta
- uso de tres ubicaciones
- mensajes claros y creativos
- correccion de errores
- trabajo en equipo

Escala sugerida:

- logrado
- en proceso
- necesita apoyo

## Capa estudiante

## Objetivo

Cambiar la experiencia actual de editor abierto por una experiencia guiada, sencilla y atractiva.

## Modos

### Modo guiado

Es el modo por defecto y recomendado.

### Modo avanzado

Es una opcion secundaria para docentes o grupos que quieran usar bloques visibles.

## Flujo estudiante

### Pantalla 1. Bienvenida

Contenido:

- titulo grande
- mensaje corto
- ilustracion o icono alegre
- boton grande `Empezar`

Copy sugerido:

- "Hoy Temi sera el guia del salon"
- "Tu le diras que hacer paso a paso"

### Pantalla 2. Elegir modo

Opciones:

- Guiado (recomendado)
- Avanzado con bloques

### Pantalla 3. Mapa de progreso

Mostrar:

- 5 micro-retos
- progreso visual
- estrellas suaves por avance

### Pantallas 4 a 8. Micro-retos

Cada micro-reto debe tener:

- un objetivo simple
- una sola tarea principal
- CTA claro
- pista opcional
- refuerzo visual al completar

### Modo guiado por micro-reto

#### Reto 1

Seleccionar saludo:

- Hola, bienvenidos a nuestro salon
- Hola, yo soy Temi y sere su guia
- plantilla editable corta

#### Reto 2, 3 y 4

Para cada lugar:

- elegir lugar
- elegir icono
- elegir mensaje o editar mensaje

#### Reto 5

- elegir despedida
- confirmar que Temi vuelve al punto base

### Modo avanzado

Debe mantener la idea de programacion por bloques, pero con toolbox mini.

Bloques visibles:

- iniciar
- hablar
- ir a lugar
- esperar
- finalizar

Reglas:

- no mostrar bloques complejos
- no mostrar condicionales ni bucles en esta mision
- no mostrar opciones avanzadas del editor general

## Pistas

Las pistas deben ser simples y cortas:

- Primero saluda
- Ahora elige el primer lugar
- Te falta la despedida
- Revisa el orden de los pasos

## Gamificacion

Gamificacion ligera:

- progreso visual
- estrellas suaves
- sonidos cortos de acierto
- celebracion al terminar

No incluir:

- ranking
- puntaje competitivo
- tabla de lideres

## Cierre emocional

Pantalla final:

- mensaje de logro
- animacion corta
- color alegre
- sonido positivo corto

Copy sugerido:

- Lo lograron
- Temi termino el recorrido
- Equipo listo

## Capa robot

## Objetivo

Hacer que Temi sea un companero de aula, no una interfaz tecnica.

## Principios

- una idea por pantalla
- texto minimo
- iconografia enorme
- frases muy cortas
- tono calido y amigable
- colores vivos pero limpios

## Pantallas robot

### 1. Standby de aula

Mostrar:

- nombre del taller
- robot listo
- estado de conexion
- bateria
- gran indicador visual

No debe verse como home tecnico.

### 2. Esperando turno

Mostrar:

- "Ahora sigue..."
- nombre del equipo o estudiante
- CTA central grande

### 3. En movimiento

Mostrar:

- icono enorme del lugar
- alias amigable del lugar
- mensaje corto

Copy ejemplo:

- Voy al tablero
- Ahora voy a la biblioteca

### 4. Llegue al lugar

Mostrar:

- icono del lugar
- nombre amigable
- mensaje que dira Temi

### 5. Error recuperable

Copy infantil y claro:

- No pude llegar
- Intentemos otra vez
- Necesito ayuda del profe

Botones:

- Reintentar
- Llamar al profe

### 6. Celebracion

Mostrar:

- Lo lograron
- Sonido corto
- animacion ligera
- luego regreso a punto base

## Modo demo segura

Cuando esta activo:

- el robot no se desplaza fisicamente
- simula el recorrido
- habla y muestra visuales
- sigue siendo valido para practica guiada

## Sistema y backend

## Reglas de negocio nuevas

- la mision usa solo ubicaciones reales del robot
- cada taller tiene 3 ubicaciones seleccionadas
- cada ubicacion tiene alias, icono y mensaje
- el robot siempre conoce punto base
- el taller puede correr en modo normal o demo segura
- el taller tiene cola de turnos
- el docente aprueba una vez al inicio
- luego confirma siguiente turno

## Nuevos conceptos de datos

### Mission template

Agregar soporte para una plantilla de mision especializada.

Campos sugeridos:

- missionType = `classroom_guide`
- recommendedAge
- workshopDuration
- guidedModeEnabled
- advancedModeEnabled

### Workshop session

Nueva entidad sugerida:

- workshopSession
- teacherId
- courseId
- robotId
- participationMode
- deviceMode
- executionMode
- turnDurationMinutes
- baseLocationId
- status

### Workshop location config

- workshopSessionId
- robotLocationId
- alias
- iconKey
- messageMode
- messageText
- orderIndex

### Workshop turn

- workshopSessionId
- participantName
- teamName
- turnIndex
- status
- startedAt
- completedAt
- attempts
- evidence

### Evaluation record

- turnId
- sequenceResult
- locationCoverage
- messageClarity
- iterationSkill
- teamwork
- teacherNotes

## Runtime del robot para esta mision

El runtime debe dejar de ser generico y pasar a ser especializado para `classroom_guide`.

Secuencia:

1. saludo
2. lugar 1
3. mensaje 1
4. lugar 2
5. mensaje 2
6. lugar 3
7. mensaje 3
8. despedida
9. regreso a base
10. celebracion

## Sonido y emocion

Usar pocos sonidos, pero muy claros:

- inicio de reto
- acierto
- celebracion final
- error suave

No usar sonidos estridentes ni sobrecargar la experiencia.

## Consideraciones de Tunja, Boyaca y aula real

La experiencia debe suponer:

- un solo robot por grupo
- espacios variables
- salones con sillas, mochilas y ruido
- conectividad local no siempre perfecta

Por eso:

- rutas cortas
- puntos amplios
- validacion previa del aula
- modo demo segura
- mensajes simples

## Accesibilidad

### Web

- botones grandes
- contraste alto
- texto corto
- foco visible
- feedback visual y verbal

### Robot

- texto legible a distancia
- iconos grandes
- mensajes de voz lentos y claros
- doble canal: voz + visual

## Criterios de aceptacion

### Profesor

- puede preparar el taller completo sin salir del flujo
- puede elegir 3 ubicaciones reales del robot
- puede asignar alias e iconos
- puede configurar modo individual o equipos
- puede configurar modo de dispositivo
- puede configurar modo normal o demo segura
- puede validar el aula antes de iniciar
- puede ejecutar turnos y registrar evidencia

### Estudiante

- entiende la mision sin explicacion tecnica
- completa el modo guiado por micro-retos
- puede usar modo avanzado si el docente lo habilita
- recibe pistas simples
- recibe celebracion al finalizar

### Robot

- muestra estado infantil y claro
- ejecuta secuencia de 3 lugares
- usa alias amigables
- vuelve al punto base
- soporta demo segura
- muestra errores recuperables entendibles

## Backlog recomendado

### Fase 1. Base funcional

1. destacar mision en biblioteca
2. crear `Preparar taller`
3. configurar 3 ubicaciones
4. crear checklist de aula
5. agregar modo normal y demo segura

### Fase 2. Estudiante guiado

1. nueva pantalla de bienvenida
2. selector de modo
3. mapa de micro-retos
4. flujo guiado completo
5. gamificacion ligera

### Fase 3. Robot infantil

1. nueva UI de standby
2. pantalla de turno
3. pantalla de movimiento
4. pantalla de llegada
5. error recuperable infantil
6. celebracion final

### Fase 4. Operacion de taller

1. cola de turnos
2. siguiente turno
3. evidencia
4. rubrica docente
5. cierre del taller

### Fase 5. Refinamiento

1. sonidos
2. iconografia
3. animaciones suaves
4. ajuste de copy infantil
5. pruebas con ninos

## Recomendacion final

`Temi guia mi salon` no debe construirse como otra mision mas del sistema.

Debe construirse como:

- la experiencia principal de onboarding pedagogico del producto
- la base de la UX para primaria
- el patron para futuras misiones guiadas con Temi
