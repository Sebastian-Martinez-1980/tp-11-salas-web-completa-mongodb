# TP 11 – Sistema web de reservas de salas con MongoDB

Aplicación para administrar reservas de salas mediante una interfaz web renderizada con EJS y una API REST. La persistencia se realiza en MongoDB usando Mongoose.

## 1. Tecnologías y requisitos

- Node.js 20.19.0 o superior.
- npm.
- MongoDB local o MongoDB Atlas.
- Visual Studio Code (recomendado).

Comprobá las versiones:

```bash
node -v
npm -v
```

## 2. Instalación

Abrí la carpeta raíz del proyecto en una terminal y ejecutá:

```bash
npm ci
```

`npm ci` instala las dependencias declaradas en `package-lock.json`.

## 3. Configuración de MongoDB

1. Creá una base de datos local o un clúster en MongoDB Atlas.
2. En Atlas, creá un usuario en **Database Access**.
3. En **Network Access**, autorizá la IP desde la que se conectará la aplicación.
4. En **Connect → Drivers**, copiá la URI de conexión para Node.js.
5. Copiá `.env.example` con el nombre `.env`.
6. Reemplazá los valores de ejemplo por los datos reales de tu conexión.

En PowerShell:

```powershell
Copy-Item .env.example .env
```

Ejemplo de `.env` (no usar estas credenciales de ejemplo):

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb+srv://USUARIO:CLAVE@HOST/reservas_salas?retryWrites=true&w=majority
```

Si la contraseña contiene caracteres especiales, codificalos para URL. No publiques ni compartas `.env`; el archivo está excluido del repositorio mediante `.gitignore`.

## 4. Ejecución

Con `.env` configurado:

```bash
npm start
```

La terminal debe informar que se estableció la conexión con MongoDB y que la aplicación está disponible en `http://localhost:3000` (o en el puerto configurado).

Direcciones principales:

- Inicio: `http://localhost:3000/`
- Listado: `http://localhost:3000/reservas`
- Alta: `http://localhost:3000/reservas/nueva`
- Estado del servidor: `http://localhost:3000/estado`

Detené el servidor con `Ctrl + C`. La aplicación requiere una conexión real a MongoDB; no utiliza una base ficticia si falla la conexión.

## 5. Estructura del proyecto

```text
.
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── README.md
├── datos/
├── public/
│   ├── css/
│   ├── img/
│   └── js/
├── scripts/
│   ├── comprobar-conexion.js
│   ├── crear-reserva.js
│   ├── listar-reservas.js
│   └── validar-reserva.js
├── src/
│   ├── config/
│   ├── controladores/
│   ├── middleware/
│   ├── modelos/
│   ├── rutas/
│   ├── servicios/
│   ├── app.js
│   └── index.js
└── views/
    ├── layouts/
    ├── partials/
    ├── reservas/
    ├── inicio.ejs
    └── no-encontrado.ejs
```

### Responsabilidad de las carpetas principales

- `src/modelos`: esquema y reglas de validación de Mongoose.
- `src/servicios`: operaciones de lectura, creación, reemplazo, actualización y eliminación en MongoDB.
- `src/controladores`: lógica que conecta las solicitudes con los servicios y las respuestas.
- `src/middleware`: validaciones de entrada, preparación de datos y manejo de errores.
- `src/rutas`: definición de rutas web y de API.
- `views`: vistas EJS.
- `public`: archivos CSS, imágenes y JavaScript del navegador.
- `scripts`: utilidades para comprobar conexión y consultar o validar datos.

## 6. Modelo de datos: Reserva

La colección de MongoDB se llama `reservas`. Cada reserva tiene siete campos editables:

| Campo | Tipo y reglas |
|---|---|
| `estudiante` | Texto obligatorio. |
| `email` | Texto obligatorio con formato de correo. |
| `sala` | `Sala Norte`, `Sala Sur` o `Sala Multimedia`. |
| `fecha` | Fecha válida con formato `AAAA-MM-DD` en las solicitudes. |
| `turno` | `Mañana`, `Tarde` o `Noche`. |
| `personas` | Número entero entre 1 y 6. |
| `estado` | `Pendiente`, `Confirmada` o `Rechazada`. |

Mongoose administra además el identificador `_id`. El servicio lo expone como `id` en las respuestas.

## 7. Rutas de la interfaz web

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Página de inicio. |
| GET | `/estado` | Estado del servicio. |
| GET | `/reservas` | Lista las reservas. |
| GET | `/reservas/nueva` | Muestra el formulario de alta. |
| POST | `/reservas` | Valida y crea una reserva. |
| GET | `/reservas/:id` | Muestra el detalle. |
| GET | `/reservas/:id/editar` | Muestra el formulario de edición. |
| POST | `/reservas/:id/editar` | Valida y guarda los siete campos. Si se guarda, responde con redirección **303 See Other** al detalle de esa reserva. |

La edición web utiliza POST porque los formularios HTML nativos no envían PUT directamente. El controlador valida los siete campos, conserva el ID y los valores en `res.locals.formularioEdicion` antes de llamar al servicio de MongoDB. Si Mongoose o MongoDB producen un error, el manejador de errores vuelve a mostrar el formulario con los valores ingresados.

## 8. API REST

Todas las rutas de la API utilizan el prefijo `/api/reservas`.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/reservas` | Lista todas las reservas. |
| GET | `/api/reservas/consultar?sala=Sala%20Norte&orden=personas-asc` | Filtra por sala y ordena los resultados. |
| GET | `/api/reservas/:id` | Obtiene una reserva por ID. |
| POST | `/api/reservas` | Crea una reserva; responde `201 Created`. |
| PUT | `/api/reservas/:id` | Reemplaza los siete campos; exige todos y no admite campos adicionales. |
| PATCH | `/api/reservas/:id` | Actualiza únicamente `personas`. |
| DELETE | `/api/reservas/:id` | Elimina una reserva; responde `204 No Content`. |

### Contrato de PUT

El cuerpo debe ser un objeto JSON que contenga exactamente estas siete propiedades: `estudiante`, `email`, `sala`, `fecha`, `turno`, `personas` y `estado`.

- Si falta una propiedad, responde `400 Bad Request` e informa los campos faltantes.
- Si aparece una propiedad adicional, responde `400 Bad Request` e informa los campos adicionales.
- También se validan los tipos, el correo, la fecha, la sala, el turno, la cantidad de personas y el estado.
- `personas` debe enviarse como número JSON, no como texto.
- `estado` acepta `Pendiente`, `Confirmada` o `Rechazada`, respetando mayúsculas.
- Una solicitud válida actualiza los siete campos y devuelve la reserva actualizada en JSON.

Ejemplo de cuerpo completo para PUT:

```json
{
  "estudiante": "Ana Ejemplo",
  "email": "ana@example.com",
  "sala": "Sala Norte",
  "fecha": "2026-11-20",
  "turno": "Mañana",
  "personas": 3,
  "estado": "Confirmada"
}
```

Ejemplo de PATCH (solo admite `personas`):

```json
{
  "personas": 4
}
```

En Postman seleccioná **Body → raw → JSON**. Para las solicitudes JSON debe enviarse el encabezado `Content-Type: application/json`.

## 9. Pruebas manuales web y API con el mismo ID

Realizá estas pruebas con el servidor conectado a MongoDB. La idea es editar la misma reserva desde la web y desde la API, identificada por un único ID.

### 9.1 Crear y obtener el ID de prueba

Creá una reserva desde `http://localhost:3000/reservas/nueva` o mediante POST a `/api/reservas`. Completá los siete campos; por ejemplo:

```json
{
  "estudiante": "Ana Ejemplo",
  "email": "ana@example.com",
  "sala": "Sala Norte",
  "fecha": "2026-11-20",
  "turno": "Mañana",
  "personas": 2,
  "estado": "Pendiente"
}
```

Copiá el `id` devuelto por la API o visible en el detalle web. En los comandos siguientes reemplazá `ID_DE_LA_RESERVA` por ese mismo valor de 24 caracteres hexadecimales. No crees otra reserva entre las pruebas.

### 9.2 Prueba de edición web y redirección 303

1. Abrí `http://localhost:3000/reservas/ID_DE_LA_RESERVA/editar`.
2. Modificá uno o más campos, por ejemplo `personas` a `3` y `estado` a `Confirmada`.
3. Guardá los cambios.
4. En las herramientas de desarrollador del navegador, pestaña **Network/Red**, seleccioná la solicitud `POST /reservas/ID_DE_LA_RESERVA/editar`.
5. Comprobá que la respuesta sea `303 See Other` y que el encabezado `Location` apunte a `/reservas/ID_DE_LA_RESERVA`.
6. Verificá en el detalle que se muestren los valores nuevos.

También podés inspeccionar la respuesta con `curl` enviando los campos como formulario URL-encoded:

```bash
curl -i -X POST "http://localhost:3000/reservas/ID_DE_LA_RESERVA/editar" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "estudiante=Ana Ejemplo" \
  --data-urlencode "email=ana@example.com" \
  --data-urlencode "sala=Sala Norte" \
  --data-urlencode "fecha=2026-11-20" \
  --data-urlencode "turno=Mañana" \
  --data-urlencode "personas=3" \
  --data-urlencode "estado=Confirmada"
```

La respuesta esperada es `HTTP/1.1 303 See Other` con un encabezado `Location` hacia el detalle del mismo ID.

### 9.3 Prueba de PUT válido con el mismo ID

En Postman o con `curl`, enviá PUT al mismo identificador. Ejemplo:

```bash
curl -i -X PUT "http://localhost:3000/api/reservas/ID_DE_LA_RESERVA" \
  -H "Content-Type: application/json" \
  -d '{
    "estudiante": "Ana Ejemplo",
    "email": "ana@example.com",
    "sala": "Sala Sur",
    "fecha": "2026-11-21",
    "turno": "Tarde",
    "personas": 4,
    "estado": "Confirmada"
  }'
```

Resultado esperado: `200 OK` y un JSON con los siete campos actualizados. Consultá luego `GET /api/reservas/ID_DE_LA_RESERVA` y comprobá que el ID no cambió.

### 9.4 Prueba de PUT incompleto

Enviá el mismo PUT, pero quitá una propiedad (por ejemplo `estado`). Resultado esperado: `400 Bad Request`, con `estado` en la lista `faltantes`. La reserva no debe modificarse.

### 9.5 Prueba de PUT con un campo adicional

Enviá el cuerpo completo y agregá una propiedad no permitida, por ejemplo `administrador: true`. Resultado esperado: `400 Bad Request`, con `administrador` en la lista `adicionales`. La reserva no debe modificarse.

### 9.6 Prueba de persistencia después de reiniciar

1. Consultá `GET /api/reservas/ID_DE_LA_RESERVA` y anotá los siete valores actuales.
2. Detené el servidor con `Ctrl + C`.
3. Volvé a iniciarlo con `npm start` y esperá el mensaje de conexión exitosa a MongoDB.
4. Repetí `GET /api/reservas/ID_DE_LA_RESERVA`.
5. Comprobá que el ID y los valores guardados antes del reinicio continúen iguales.

Esta comprobación demuestra que los cambios quedaron persistidos en MongoDB y no solamente en memoria.

### 9.7 Resumen de resultados esperados

| Prueba | Resultado esperado |
|---|---|
| Edición web válida | `303 See Other`, `Location` al detalle del mismo ID. |
| PUT completo y válido | `200 OK`, devuelve la reserva actualizada. |
| PUT con campos faltantes | `400 Bad Request`, informa `faltantes`. |
| PUT con campos extra | `400 Bad Request`, informa `adicionales`. |
| GET después del reinicio | Conserva el mismo ID y los valores guardados. |

## 10. Scripts de utilidad

Con `.env` configurado:

```bash
node --env-file-if-exists=.env scripts/comprobar-conexion.js
node --env-file-if-exists=.env scripts/listar-reservas.js
node scripts/validar-reserva.js
```

`crear-reserva.js` inserta un registro de ejemplo en MongoDB; ejecutalo solamente cuando quieras crear ese dato.

## 11. Formato y análisis estático

Comprobá formato y lint:

```bash
npm run format:check
npm run lint
```

Aplicá el formato automático con:

```bash
npm run format
```

## 12. Problemas frecuentes

- **No se encuentra `.env`:** copiá `.env.example` como `.env` y completá `MONGODB_URI`.
- **Falta `MONGODB_URI`:** verificá el nombre exacto de la variable y que `.env` esté en la carpeta raíz.
- **`MongooseServerSelectionError`:** revisá URI, usuario, contraseña, IP autorizada en Atlas, DNS y conexión a Internet.
- **`EADDRINUSE`:** el puerto configurado ya está ocupado; cambiá `PORT` o cerrá el proceso que lo utiliza.
- **`Cannot find module`:** ejecutá `npm ci` desde la carpeta que contiene `package.json`.
- **PUT responde 400:** verificá que el JSON incluya exactamente los siete campos, sin propiedades extra, y que `personas` sea un número.

## 13. Seguridad

- No publiques `.env`, contraseñas ni cadenas de conexión.
- No subas `node_modules` al repositorio.
- Validá los datos recibidos antes de guardarlos.
- Usá permisos mínimos para el usuario de MongoDB.
- No dejes habilitado el acceso público a MongoDB Atlas como solución permanente a un problema de conexión.
