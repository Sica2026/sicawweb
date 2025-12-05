# 🔧 Resumen: Implementación de Modo Técnico (Alt + T)

## ✅ Lo que se ha hecho

### 1. **HTML** (`view/login.html`)
- ✅ Agregado formulario técnico oculto por defecto
- ✅ Cambio dinámico de header (icono, título, subtítulo)
- ✅ Campos: Usuario y Contraseña
- ✅ Botón "Acceso Técnico"
- ✅ Botón "Volver al Acceso Administrador"

### 2. **CSS** (`css/admin-login.css`)
- ✅ Estilos diferenciados para modo técnico (colores verde)
- ✅ Transiciones suaves entre formularios
- ✅ Logo cambia de azul a verde en modo técnico
- ✅ Botón técnico con gradiente verde
- ✅ Responsive y compatible con tema oscuro

### 3. **JavaScript** (`js/admin-login.js`)
- ✅ Detector de tecla: **Alt + T**
- ✅ Función `toggleTechnicianMode()` para cambiar entre modos
- ✅ Función `handleTechnicianLogin()` para autenticar contra Firestore
- ✅ Validación de usuario y contraseña
- ✅ Verificación de estado (activo/inactivo)
- ✅ Creación de sesión técnica en `sessionStorage`
- ✅ Redirección a dashboard con parámetro `?tipo=tecnico`
- ✅ Registro de intentos de login en colección `technician_logins`

---

## 🚀 Flujo de Funcionamiento

```
┌─────────────────────────────┐
│   Usuario en login.html      │
└──────────────┬──────────────┘
               │
               │ Presiona Alt + T
               ▼
    ┌──────────────────────┐
    │ toggleTechnicianMode │
    │  - Oculta formulario │
    │    administrador     │
    │  - Muestra formulario│
    │    técnico          │
    │  - Cambia header     │
    │  - Colores a verde   │
    └──────────────┬───────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        │ Usuario ingresa:    │
        │ - Usuario: tecnico1 │
        │ - Pass: tecnico123  │
        │                     │
        └──────────┬──────────┘
                   │
                   │ Presiona "Acceso Técnico"
                   ▼
      ┌────────────────────────────┐
      │ handleTechnicianLogin()     │
      │ - Consulta Firestore       │
      │ - Busca: usuario = tecnico1│
      │ - Valida contraseña        │
      │ - Verifica si está activo  │
      └──────────┬─────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
    ✅ VÁLIDO         ❌ INVÁLIDO
        │                 │
        ▼                 ▼
┌──────────────────┐  Error
│ Crea sesión:     │  "Usuario o
│ sessionStorage   │  contraseña
│ techSession={... │  incorrectos"
└──────────┬───────┘
           │
           │ Redirige a:
           │ admin-dashboard.html
           │ ?tipo=tecnico
           ▼
    ┌────────────────┐
    │ Dashboard      │
    │ (Modo Técnico) │
    └────────────────┘
```

---

## 📝 Estructura de Datos en Firestore

### Colección: `tecnico`

```json
{
  "usuario": "tecnico1",
  "contraseña": "tecnico123",
  "nombre": "Juan García",
  "activo": true,
  "rol": "tecnico",
  "email": "juan@example.com"
}
```

### Colección: `technician_logins` (Auditoría)

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

## 🔄 Cómo Cambiar entre Modos

| Acción | Resultado |
|--------|-----------|
| **Alt + T** (Modo Admin) | Cambia a Modo Técnico |
| **Alt + T** (Modo Técnico) | Cambia a Modo Admin |
| **Click botón "Volver..."** | Cambia a Modo Admin |

---

## 📋 API Global Disponible

En `window.AdminAuth` puedes acceder a:

```javascript
// Verificar si es técnico
window.AdminAuth.isTechnician()
// → true / false

// Obtener sesión técnica
window.AdminAuth.getTechnicianSession()
// → { tipoUsuario: 'tecnico', usuario: 'tecnico1', ... }

// Toggle manual
window.AdminAuth.toggleTechnicianMode()

// Logout admin
window.AdminAuth.logout()
```

---

## 🎨 Diferencias Visuales

| Aspecto | Modo Admin | Modo Técnico |
|---------|-----------|--------------|
| **Color Principal** | Azul (#003f7f) | Verde (#10b981) |
| **Icono Header** | Escudo cerrado | Engranaje |
| **Título** | "Acceso Administrador" | "Acceso Técnico" |
| **Campos** | Email + Contraseña | Usuario + Contraseña |
| **Botón** | Azul gradiente | Verde gradiente |
| **Footer** | "Firebase..." | "Personal técnico" |

---

## ✨ Características Implementadas

- [x] Atajo de teclado Alt + T
- [x] Toggle entre formularios
- [x] Validación contra Firestore
- [x] Autenticación sin Firebase Auth
- [x] Sesión en sessionStorage
- [x] Registro de intentos de login
- [x] Verificación de usuario activo
- [x] Redirección con parámetro tipo=tecnico
- [x] Estilos diferenciados
- [x] Toggle de contraseña
- [x] Soporte para tema oscuro
- [x] Mensajes de error personalizados

---

## ⚠️ Próximos Pasos (Para el Dashboard)

1. **Dashboard Técnico Separado**
   - Crear lógica para detectar `?tipo=tecnico`
   - Mostrar diferente UI/UX para técnicos
   - Limitar funcionalidades según rol

2. **Mejoras de Seguridad**
   - Implementar hashing de contraseñas
   - Agregar 2FA
   - Token de sesión con expiración
   - Auditoría detallada

3. **Gestión de Técnicos**
   - CRUD de técnicos en panel admin
   - Cambio de contraseñas
   - Roles y permisos específicos
   - Historial de acciones por técnico

---

## 🧪 Testing Checklist

- [ ] Alt + T muestra formulario técnico
- [ ] Alt + T nuevamente vuelve a formulario admin
- [ ] Login con técnico válido funciona
- [ ] Login con técnico inválido muestra error
- [ ] Técnico inactivo no puede entrar
- [ ] Session se guarda en sessionStorage
- [ ] Dashboard reconoce ?tipo=tecnico
- [ ] Intento de login se registra en Firestore
- [ ] Toggle de contraseña funciona
- [ ] Botón "Volver al Acceso Administrador" funciona
- [ ] Enter en campos funciona
- [ ] Funciona en mobile/responsivo

---

## 📚 Archivos Modificados

```
view/
├── login.html              ← HTML con formularios
css/
├── admin-login.css         ← Estilos técnico
js/
├── admin-login.js          ← Lógica de autenticación

Documentos de Guía:
├── GUIA_COLECCION_TECNICO.md    ← Estructura Firestore
└── RESUMEN_MODO_TECNICO.md      ← Este archivo
```

---

## 🔐 Seguridad Temporal

⚠️ **NOTA**: Las contraseñas están en **texto plano** en Firestore como solicitaste.

Para producción, considera:
- Usar `bcrypt` para hashear contraseñas
- Implementar rate limiting de intentos
- Agregar CAPTCHA
- Usar tokens JWT con expiración
- Auditoría más detallada

---

## 💡 Ejemplo de Uso en Dashboard

```javascript
// En admin-dashboard.html al cargar:

const isTech = window.AdminAuth.isTechnician();
const techSession = window.AdminAuth.getTechnicianSession();

if (isTech) {
    // Mostrar dashboard técnico
    console.log('Técnico:', techSession.nombre);
    loadTechnicianDashboard();
} else {
    // Mostrar dashboard admin
    console.log('Administrador');
    loadAdminDashboard();
}
```

---

**¡Listo para empezar! 🚀**

Próximo paso: Crea la colección `tecnico` en Firestore con técnicos de prueba.
