# Fix: Reset de perfil al cerrar sesión

## Problema

Al iniciar sesión con Google, el perfil del docente se actualizaba con los datos de Google (nombre, correo, foto). Sin embargo, al cerrar sesión y volver a entrar con las credenciales demo (`profesor@esbot.test`), el perfil seguía mostrando los datos de Google porque quedaban guardados en `esbot.profile.v1` en localStorage.

## Causa

La función `logout` en `demo-store-provider.tsx` solo limpiaba la sesión pero no reseteaba el perfil:

```ts
// Antes
const logout = useCallback(() => {
  setSession(null);
}, []);
```

## Solución

Se agregó `setProfile(demoTeacherProfile)` al hacer logout para restaurar el perfil demo por defecto:

```ts
// Después
const logout = useCallback(() => {
  setSession(null);
  setProfile(demoTeacherProfile);
}, []);
```

## Archivo modificado

- `src/components/demo-store-provider.tsx`

## Comportamiento esperado

1. Usuario entra con Google → perfil muestra datos de Google
2. Usuario hace clic en "Cerrar sesión" en el sidebar
3. Perfil se resetea a `demoTeacherProfile` (Elena Martinez)
4. Usuario entra con credenciales demo → perfil muestra datos demo correctamente
