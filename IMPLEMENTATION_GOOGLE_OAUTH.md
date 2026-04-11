# Implementación de Inicio de Sesión con Google OAuth

## Pasos realizados

### 1. Instalación de dependencia
```bash
npm install @react-oauth/google
```

### 2. Creación del proveedor de Google
**Archivo:** `src/components/google-auth-provider.tsx`

Wrapper que envuelve la aplicación con `GoogleOAuthProvider` de @react-oauth/google. Requiere el Client ID de Google como variable de entorno.

### 3. Modificación del Login Screen
**Archivo:** `src/components/login-screen.tsx`

- Reemplazo del botón "Continuar con Google" por el componente `GoogleLogin` de @react-oauth/google
- Manejo de respuesta exitosa con `handleGoogleSuccess`
- Extracción del credential token de Google y llamada a `loginWithGoogle`

### 4. Actualización del DemoStore
**Archivo:** `src/components/demo-store-provider.tsx`

- Agregado nuevo método `loginWithGoogle(credential: string)`
- Decodificación del JWT token de Google (payload)
- Extracción de: name, email, picture del token
- Creación de sesión con provider "google"
- Actualización del perfil del docente con los datos de Google

### 5. Configuración de Providers
**Archivo:** `src/app/providers.tsx`

- Envolvimiento de `DemoStoreProvider` con `GoogleAuthProvider`

### 6. Variables de entorno
**Archivo:** `.env.example`

```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
```

## Configuración en Google Cloud Console

1. Ir a [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Crear proyecto o seleccionar existente
3. Crear credenciales "OAuth client ID"
4. Tipo: "Web application"
5. Agregar `http://localhost:3000` en "Authorized JavaScript origins"
6. Copiar Client ID y agregar a `.env.local`

## Flujo de autenticación

1. Usuario hace clic en "Continuar con Google"
2. Popup de Google solicita credenciales
3. Google retorna credential token (JWT)
4. `handleGoogleSuccess` extrae el token
5. `loginWithGoogle` decodifica el JWT
6. Se crea sesión y se actualiza el perfil
7. Usuario redirigido a `/profesor`