# Plan: Implementación de Modo Técnico (Alt + T)

## Objetivo
Agregar un modo técnico oculto que se activa con la combinación de teclas **Alt + T**. Este modo:
- Muestra un formulario alternativo de login
- Autentica contra la colección "tecnico" en Firestore
- Usa **usuario** (no correo) y **contraseña** como credenciales
- No usa Firebase Authentication, sino validación contra documentos en Firestore

---

## Estructura de Datos en Firestore

### Colección: `tecnico`
Documentos con estructura:
```json
{
  "usuario": "tecnico1",
  "contraseña": "hash_seguro_o_contraseña",
  "nombre": "Nombre del Técnico",
  "activo": true,
  "rol": "tecnico",
  "fechaCreacion": "2024-01-01"
}
```

---

## Componentes a Crear/Modificar

### 1. **HTML** (view/login.html)
- Crear un modal/formulario oculto para modo técnico
- Cambiar el contenido dinámicamente cuando se detecte Alt + T
- Formulario con campos: Usuario y Contraseña
- Opción para volver al login regular

### 2. **CSS** (css/admin-login.css)
- Estilos para el modo técnico
- Animación para cambio entre formularios
- Diferenciar visualmente del login administrativo

### 3. **JavaScript** (js/admin-login.js)
- Detector de tecla Alt + T
- Función para cambiar entre modos (admin ↔ tecnico)
- Nueva función `handleTechnicianLogin()` para autenticar contra Firestore
- Lógica de validación de usuario/contraseña en colección "tecnico"
- Gestión de sesión para técnicos

---

## Detalles de Implementación

### En admin-login.js:

#### 1. Detectar Alt + T
```javascript
document.addEventListener('keydown', (e) => {
  if (e.altKey && e.key === 't') {
    e.preventDefault();
    toggleTechnicianMode();
  }
});
```

#### 2. Toggle entre modos
- Mostrar/ocultar formularios
- Cambiar título, iconografía
- Limpiar campos

#### 3. Nueva función: `handleTechnicianLogin()`
- Obtener usuario y contraseña del formulario
- Consultar colección "tecnico" donde `usuario === inputUsuario`
- Validar contraseña (comparación simple o con hash)
- Si es válido: crear sesión (localStorage o sessionStorage)
- Redirigir al dashboard

#### 4. Middleware de verificación
- Función para verificar si sesión es técnico
- Diferente flujo para técnicos vs administradores

### En admin-login.html:

Agregar dos secciones:
```html
<!-- Formulario Admin (visible por defecto) -->
<div id="adminLoginForm" class="login-form visible">
  <!-- Campos: email, contraseña -->
</div>

<!-- Formulario Técnico (oculto) -->
<div id="technicianLoginForm" class="login-form hidden">
  <!-- Campos: usuario, contraseña -->
  <!-- Botón para volver al admin -->
</div>
```

### En admin-login.css:

Agregar transiciones suaves:
- Animación de fade in/out
- Cambios de color/tema para técnico
- Estilos diferenciados

---

## Flujo de Autenticación Técnico

1. Usuario presiona Alt + T en login
2. Se muestra formulario técnico
3. Usuario ingresa usuario y contraseña
4. JavaScript consulta: `db.collection('tecnico').where('usuario', '==', usuarioInput)`
5. Si existe y contraseña coincide:
   - Guardar en sessionStorage: `{ tipoUsuario: 'tecnico', usuario: ... }`
   - Mostrar estado de éxito
   - Redirigir a dashboard con parámetro `?tipo=tecnico`
6. Si no existe o contraseña incorrecta:
   - Mostrar error específico
   - No registrar en admin_logins (o registrar como intento técnico)

---

## Consideraciones de Seguridad

⚠️ **IMPORTANTE**:
- No almacenar contraseñas en texto plano en Firestore
- Considerar usar hashing (bcrypt compatible o similar)
- O: usar campo `passwordHash` en lugar de `contraseña`
- Validar solo en servidor idealmente, pero para MVP se hace en cliente

---

## Archivos a Modificar

1. ✅ `view/login.html` - Agregar formulario técnico
2. ✅ `js/admin-login.js` - Agregar lógica de Alt+T y validación
3. ✅ `css/admin-login.css` - Agregar estilos para modo técnico

---

## Archivos Nuevos (Opcional)

- `js/technician-auth.js` - Lógica separada de autenticación técnica (modularidad)

---

## Testing Checklist

- [ ] Alt + T muestra formulario técnico
- [ ] Alt + T nuevamente vuelve a formulario admin
- [ ] Login con técnico válido funciona
- [ ] Login con técnico inválido muestra error
- [ ] Session se guarda correctamente
- [ ] Dashboard reconoce tipo de usuario
- [ ] Logout funciona para técnicos

---

## Prioridades

1. **Core**: Detector de tecla Alt+T + toggle UI
2. **Core**: Formulario técnico + estilos
3. **Core**: Función handleTechnicianLogin() con Firestore
4. **Enhancement**: Validación de contraseña segura
5. **Enhancement**: Diferentes dashboards por tipo de usuario
