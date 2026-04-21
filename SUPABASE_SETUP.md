# Configuración de Supabase Storage para Videos e Imágenes

## Requisitos

- Proyecto de Supabase configurado
- Variables de entorno configuradas:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (para el script de setup)

## Pasos de Configuración

### 1. Crear los Buckets Manualmente

#### Bucket de Videos:
1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **Storage** en el menú lateral
3. Haz clic en **Create a new bucket**
4. Nombre: `videos`
5. Marca **Public bucket** para permitir acceso público
6. Haz clic en **Create bucket**

#### Bucket de Imágenes:
1. Repite el proceso anterior
2. Nombre: `images`
3. Marca **Public bucket**

### 2. Configurar Políticas de Acceso

#### Para el bucket `videos`:
1. En el bucket `videos`, ve a la pestaña **Policies**
2. Haz clic en **New policy**
3. Selecciona **For queries only** → **SELECT**
4. Selecciona **Public users** (anon)
5. Haz clic en **Review** y luego **Save policy**
6. Repite para **INSERT** con la política: `true`

#### Para el bucket `images`:
1. En el bucket `images`, ve a la pestaña **Policies**
2. Haz clic en **New policy**
3. Selecciona **For queries only** → **SELECT**
4. Selecciona **Public users** (anon)
5. Haz clic en **Review** y luego **Save policy**
6. Repite para **INSERT** con la política: `true`

### 3. Configurar Límite de Tamaño (Opcional)

En el dashboard de Supabase:
1. Ve a **Storage** → **videos** → **Settings**
2. Establece el límite de tamaño a **200 MB** (o el que prefieras)
3. Ve a **Storage** → **images** → **Settings**
4. Establece el límite de tamaño a **50 MB** (o el que prefieras)

## Verificación

Para verificar que todo está configurado correctamente:

```bash
# Los videos se guardarán automáticamente en Supabase Storage
# Las imágenes se guardarán automáticamente en Supabase Storage
# Cuando subas un archivo, deberías ver:
# - El archivo en Storage → videos o Storage → images
# - Una URL pública en la respuesta del upload
```

## Estructura de Almacenamiento

Los archivos se guardan con el siguiente patrón:
```
videos/
├── {id}-{original-filename}.mp4
├── {id}-{original-filename}.mov
└── ...

images/
├── {id}-{original-filename}.jpg
├── {id}-{original-filename}.png
└── ...
```

## URLs Públicas

Las URLs públicas tienen el formato:
```
https://{project-id}.supabase.co/storage/v1/object/public/videos/{id}-{filename}
https://{project-id}.supabase.co/storage/v1/object/public/images/{id}-{filename}
```

Estas URLs se pueden compartir y acceder directamente sin autenticación.

## Notas Importantes

- Los videos y imágenes se guardan de forma permanente en Supabase Storage
- Las URLs públicas son accesibles desde cualquier lugar
- Los archivos se pueden eliminar manualmente desde el dashboard de Supabase
- Las imágenes se convierten automáticamente a JPEG para mejor compatibilidad
