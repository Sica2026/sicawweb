# 📋 Guía: Colección "tecnico" en Firestore

## Estructura de la Colección

Para que el modo técnico funcione correctamente, necesitas crear una colección en Firestore llamada **`tecnico`** con documentos que tengan la siguiente estructura:

```json
{
  "usuario": "tecnico1",
  "contraseña": "mi_contraseña_123",
  "nombre": "Juan García",
  "activo": true,
  "rol": "tecnico",
  "email": "juan@example.com",
  "telefono": "5551234567",
  "fechaCreacion": "2024-12-04T10:30:00Z"
}
```

### Campos Requeridos

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| **usuario** | String | Nombre de usuario único (se usa para login) | `"tecnico1"` |
| **contraseña** | String | Contraseña en texto plano | `"mi_contraseña"` |
| **nombre** | String | Nombre completo del técnico | `"Juan García"` |
| **activo** | Boolean | Si está habilitado para acceder | `true` |
| **rol** | String | Rol del usuario (para futuros filtrados) | `"tecnico"` |

### Campos Opcionales

| Campo | Tipo | Descripción |
|-------|------|-------------|
| **email** | String | Correo electrónico de contacto |
| **telefono** | String | Número de teléfono |
| **fechaCreacion** | Timestamp | Fecha de creación (puedes usar `serverTimestamp()`) |
| **departamento** | String | Departamento o área |
| **permisos** | Array | Lista de permisos específicos |

---

## Cómo Crear la Colección en Firestore

### Opción 1: Manualmente desde Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Selecciona tu proyecto **sica-a5c24**
3. Abre **Firestore Database**
4. Haz clic en **+ Crear colección**
5. Escribe el nombre: `tecnico`
6. Haz clic en **Siguiente**
7. Crea tu primer documento con los datos:

```
ID: tecnico_1 (o déjalo vacío para que genere uno automático)

usuario: tecnico1
contraseña: mi_contraseña_123
nombre: Juan García
activo: true
rol: tecnico
email: juan@example.com
telefono: 5551234567
```

### Opción 2: Datos de Ejemplo (Copia y pega)

Aquí hay ejemplos de técnicos que puedes crear:

#### Técnico 1
```json
{
  "usuario": "tecnico1",
  "contraseña": "tecnico123",
  "nombre": "Juan García",
  "activo": true,
  "rol": "tecnico",
  "email": "juan.garcia@example.com",
  "telefono": "5551234567",
  "departamento": "Mantenimiento"
}
```

#### Técnico 2
```json
{
  "usuario": "admin_tech",
  "contraseña": "admin_tech_456",
  "nombre": "María López",
  "activo": true,
  "rol": "tecnico_admin",
  "email": "maria.lopez@example.com",
  "telefono": "5559876543",
  "departamento": "Administración Técnica"
}
```

#### Técnico Inactivo (Ejemplo)
```json
{
  "usuario": "tecnico_antiguo",
  "contraseña": "old_password",
  "nombre": "Pedro Martínez",
  "activo": false,
  "rol": "tecnico",
  "email": "pedro@example.com",
  "telefono": "5558765432",
  "departamento": "Soporte"
}
```

---

## Cómo Acceder (Cliente)

### Desde la pantalla de login

1. **Presiona Alt + T** en la página de login
2. La pantalla cambiará a modo técnico (color verde, iconografía diferente)
3. Ingresa:
   - **Usuario**: `tecnico1`
   - **Contraseña**: `tecnico123`
4. Presiona **Acceso Técnico** o Enter

### Resultado

- Si es correcto: Se crea una sesión en `sessionStorage` y se redirige a `admin-dashboard.html?tipo=tecnico`
- Si es incorrecto: Muestra error "Usuario o contraseña incorrectos"

---

## Información Registrada

Cada intento de login (exitoso o no) se registra en la colección `technician_logins`:

```json
{
  "username": "tecnico1",
  "tipoUsuario": "tecnico",
  "success": true,
  "timestamp": "2024-12-04T10:35:00Z",
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "errorCode": null
}
```

---

## Verificación en el Dashboard

El dashboard puede detectar si el usuario es técnico mediante:

```javascript
// En admin-dashboard.html o cualquier otra página protegida:

const techSession = JSON.parse(sessionStorage.getItem('technicianSession'));
if (techSession) {
    console.log('Usuario técnico:', techSession.usuario);
    console.log('Nombre:', techSession.nombre);
    console.log('Rol:', techSession.rol);
} else {
    // Es un administrador (Firebase Auth)
}
```

---

## Seguridad (Notas)

⚠️ **Actualización futura**: Para mejorar seguridad, podrías:
- Usar hashing de contraseñas (bcrypt)
- Implementar renovación de tokens
- Agregar 2FA
- Registrar más detalles en auditoría

Por ahora, se usan contraseñas en texto plano como solicitaste.

---

## Prueba Rápida

Después de crear la colección `tecnico`, puedes probar:

1. Abre `login.html`
2. Presiona **Alt + T**
3. Ingresa: `usuario: tecnico1` | `contraseña: tecnico123`
4. Deberías ver: "¡Bienvenido técnico!" y ser redirigido

¡Listo! 🎉
