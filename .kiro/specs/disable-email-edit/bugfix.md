# Bugfix Requirements Document

## Introduction

El formulario de edición de perfil del docente (`ProfileFormModal` en `settings-screen.tsx`) expone el campo de correo institucional como un input editable. Sin embargo, el correo está vinculado a la cuenta de autenticación del docente y no puede modificarse desde el perfil: la función `upsertProfile` en `db-store.ts` omite el campo `email` deliberadamente. Esto genera una inconsistencia en la UI donde el docente puede escribir un nuevo correo, guardar el formulario, y no ver ningún cambio reflejado, sin recibir ningún mensaje de error ni advertencia. El fix consiste en deshabilitar el campo de correo en el formulario, mostrándolo como solo lectura.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN el docente abre el modal de edición de perfil THEN el sistema muestra el campo "Correo institucional" como un input de texto editable (`type="email"`)

1.2 WHEN el docente modifica el valor del campo de correo y guarda el formulario THEN el sistema acepta el cambio sin mostrar ningún error ni advertencia, pero el nuevo correo no se persiste en la base de datos

1.3 WHEN el docente guarda el formulario con un correo modificado THEN el sistema actualiza el estado local en memoria con el nuevo correo, pero al recargar la página el correo vuelve al valor original de la base de datos

### Expected Behavior (Correct)

2.1 WHEN el docente abre el modal de edición de perfil THEN el sistema SHALL mostrar el campo "Correo institucional" como un campo de solo lectura, visualmente diferenciado de los campos editables

2.2 WHEN el docente intenta interactuar con el campo de correo en el modal THEN el sistema SHALL impedir la edición del valor, manteniendo el correo original de la cuenta de autenticación

2.3 WHEN el docente guarda el formulario THEN el sistema SHALL enviar únicamente los campos editables (`fullName`, `biography`, `avatarUrl`) sin incluir el email en el payload de actualización

### Unchanged Behavior (Regression Prevention)

3.1 WHEN el docente edita su nombre completo en el modal de perfil THEN el sistema SHALL CONTINUE TO guardar y persistir el nuevo nombre correctamente

3.2 WHEN el docente edita su biografía en el modal de perfil THEN el sistema SHALL CONTINUE TO guardar y persistir la nueva biografía correctamente

3.3 WHEN el docente cambia su foto de perfil en el modal THEN el sistema SHALL CONTINUE TO guardar y persistir la nueva URL del avatar correctamente

3.4 WHEN el docente visualiza su perfil en la pantalla de configuración (fuera del modal) THEN el sistema SHALL CONTINUE TO mostrar el correo institucional correctamente en la sección de solo lectura

3.5 WHEN el docente cancela el modal de edición de perfil THEN el sistema SHALL CONTINUE TO descartar todos los cambios sin modificar el perfil
