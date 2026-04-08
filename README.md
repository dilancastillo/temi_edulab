# Esbot EduLab

App web local-first para la capa profesor de Esbot EduLab. La base usa TypeScript end-to-end con Next.js, React y datos demo persistidos en el navegador para validar flujos antes de conectar PostgreSQL, OAuth real y las capas de estudiante, analítica, administrador/institución y robot.

## Stack

- Next.js 16.2.2 + React 19.2.4 + TypeScript.
- CSS moderno sin librería de UI, con HTML semántico, foco visible, layout responsive y componentes accesibles.
- Vitest + Testing Library para pruebas unitarias/componentes.
- Playwright para pruebas end-to-end.

Se eligió Next.js sobre una SPA Vite porque el producto necesitará sesiones, roles, permisos, formularios server-side, rendering híbrido, caché HTTP y rutas protegidas por institución. Vite seguiría siendo una buena opción para experiencias puramente cliente, pero aquí Next deja mejor camino hacia API, PostgreSQL y seguridad de sesión.

## PWA

No se activó PWA todavía. Conviene evaluarla en la capa estudiante/robot, cuando haya requerimientos concretos de trabajo offline, caché de misiones, instalación en tablets o reintentos de envío. Para la capa profesor local-first actual, una PWA agregaría complejidad de caché y actualizaciones sin un beneficio claro.

## Ejecutar localmente

```powershell
npm.cmd install
npm.cmd run dev
```

Abre `http://localhost:3000`.

Credenciales demo profesor:

- Correo: `profesor@esbot.test`
- Contraseña: `demo2026`

Credenciales demo estudiante:

- Correo: `ana.garcia@esbot.test`
- Contraseña: `estudiante2026`
- Código de misión: `SGKRBY`

Los botones de Google y Microsoft funcionan como acceso local de demostración. Para producción deben conectarse con OAuth real y cookies/sesiones endurecidas.

## Verificacion

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run build
npm.cmd run test:e2e
```

En este entorno, Vitest, Next build y Playwright requieren permiso para lanzar procesos nativos o navegador.

## Alcance implementado

- Login docente local con email/contraseña y accesos demo Google/Microsoft.
- Layout docente con rutas para inicio, estudiantes, biblioteca, misiones y configuración.
- Dashboard con metricas derivadas de estudiantes/asignaciones.
- CRUD de estudiantes, filtros, busqueda, paginacion y carga de avatar con validacion.
- Importación CSV de estudiantes con validación de encabezados, correo, duplicados y curso.
- Biblioteca de misiones existentes con filtros por categoría/edad, preview y asignación a grupo.
- Misiones en curso/archivadas con acciones de archivar y eliminar.
- Perfil docente editable con carga de imagen local.
- Login de estudiante por correo/contraseña o código de misión.
- Dashboard estudiante con juego libre, misiones en progreso y misiones asignadas.
- Editor Blockly real para la misión “Ordena los pasos”.
- Guardado local de workspace y envío de entrega que marca al estudiante como “Revisar” en la capa profesor.
- Interfaz de adaptador robot para Temi V3 en modo demo, sin ejecución contra hardware todavía.

## Siguientes capas

- PostgreSQL: reemplazar `DemoStoreProvider` por repositorios/API y migraciones.
- Auth: credenciales reales + Google/Microsoft OAuth, sesiones seguras, CSRF, rate limiting y RBAC por institución.
- Estudiante: ampliar Blockly con más misiones reales y validadores por misión. MakeCode se evaluaría solo si se decide usar su ecosistema completo.
- Robot: conectar el adaptador demo con Temi V3 SDK, manteniéndolo separado de UI y de la lógica de misiones.
- Analítica: eventos de progreso, entregas, calificaciones y reportes por institución/curso.
