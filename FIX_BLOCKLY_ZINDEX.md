# Fix: Toolbox de Blockly aparecía sobre el navbar y el modal

## Problema

El toolbox de Blockly (categorías: Movimiento, Hablar, Mostrar, Audio) aparecía por encima de:
- La barra de navegación del estudiante al hacer scroll
- El modal "¿Listo para enviar?" al abrirlo

## Causa

Blockly inyecta su toolbox directamente en el `body` del DOM con un z-index interno muy alto (~70-999). Los elementos del proyecto tenían z-index bajos:

```css
/* Antes */
.student-topbar { z-index: 5; }
.modal-backdrop { z-index: 10; }
```

Ambos valores eran menores al z-index que Blockly usa internamente, por lo que el toolbox quedaba visible por encima de ellos.

## Solución

Subir el z-index del navbar y del modal por encima del toolbox de Blockly:

```css
/* Después */
.student-topbar { z-index: 1000; }
.modal-backdrop { z-index: 9999; }
```

## Archivo modificado

- `src/app/globals.css`

## Comportamiento esperado

1. Al hacer scroll en la pantalla de misión, el navbar permanece por encima del toolbox de Blockly
2. Al abrir el modal "¿Listo para enviar?", el toolbox no aparece encima del modal
