# 🔧 Sistema de Gestión de Técnicos - Documentación Completa

## 📋 Resumen del Sistema

Se ha implementado un sistema completo de gestión de técnicos que permite al administrador crear usuarios técnicos y asignarles salas específicas. Los técnicos solo pueden ver y trabajar con las salas que les fueron asignadas.

---

## 🎯 Funcionalidades Implementadas

### 1. **Módulo de Gestión de Técnicos (Admin)**

El administrador puede:
- ✅ Crear nuevos usuarios técnicos
- ✅ Asignar salas específicas a cada técnico
- ✅ Editar información de técnicos existentes
- ✅ Activar/desactivar técnicos
- ✅ Eliminar técnicos
- ✅ Ver estadísticas de técnicos activos

### 2. **Restricción por Salas**

Cada técnico solo puede:
- ✅ Ver las salas que le fueron asignadas en el grid de reportes
- ✅ Crear reportes solo para sus salas asignadas
- ✅ Ver reportes solo de sus salas asignadas
- ✅ El selector de salas muestra solo las salas permitidas

---

## 📁 Archivos Creados/Modificados

### Archivos Nuevos:

| Archivo | Descripción |
|---------|-------------|
| `view/gestion-tecnicos.html` | Página de gestión de técnicos para admin |
| `css/gestion-tecnicos.css` | Estilos del módulo de gestión |
| `js/gestion-tecnicos.js` | Lógica CRUD de técnicos |

### Archivos Modificados:

| Archivo | Cambios |
|---------|---------|
| `view/admin-mas.html` | + Tarjeta "Gestión de Técnicos" en página 2 |
| `js/admin-mas.js` | + Case 'tecnicos' y función navigateToTecnicos() |
| `js/admin-login.js` | + Guardar salasAsignadas en technicianSession |
| `js/technician-reportes.js` | + Función getSalasDisponibles()<br>+ Filtrado de salas por técnico<br>+ Selector dinámico de salas |

---

## 🗄️ Estructura de Datos en Firestore

### Colección: `tecnico`

```javascript
{
    // Campos de autenticación
    usuario: "juan.perez",              // String, único, sin espacios
    contraseña: "password123",          // String, texto plano
    nombre: "Juan Pérez García",        // String, nombre completo

    // Permisos
    salasAsignadas: [                   // Array de strings
        "Sica 1",
        "Sica 4"
    ],

    // Estado
    estado: "activo",                   // "activo" o "inactivo"

    // Metadata
    fechaCreacion: Timestamp,
    fechaActualizacion: Timestamp
}
```

### Session Storage: `technicianSession`

```javascript
{
    tipoUsuario: 'tecnico',
    usuario: 'juan.perez',
    nombre: 'Juan Pérez García',
    id: 'abc123',
    rol: 'tecnico',
    salasAsignadas: ['Sica 1', 'Sica 4'],  // ⭐ NUEVO
    loginTime: '2024-12-04T10:30:00Z'
}
```

---

## 🔄 Flujo de Trabajo Completo

### Paso 1: Admin Crea un Técnico

1. Admin va a **Más Opciones** → **Gestión de Técnicos** (página 2)
2. Click en **"Nuevo Técnico"**
3. Rellena formulario:
   - Usuario: `juan.perez` (único)
   - Contraseña: `password123`
   - Nombre: `Juan Pérez García`
   - **Salas Asignadas**: Selecciona checkboxes:
     - ☑️ Sica 1
     - ☑️ Sica 4
   - Estado: Activo
4. Click en **"Guardar"**
5. Se crea en Firestore con `salasAsignadas: ["Sica 1", "Sica 4"]`

### Paso 2: Técnico Inicia Sesión

1. Presiona **Alt+T** desde cualquier página
2. Ingresa:
   - Usuario: `juan.perez`
   - Contraseña: `password123`
3. Sistema valida y crea sesión con:
   ```javascript
   {
       usuario: 'juan.perez',
       salasAsignadas: ['Sica 1', 'Sica 4']
   }
   ```
4. Redirige a panel técnico

### Paso 3: Técnico Usa el Panel (Restringido)

**En la vista de Reportes:**
- Solo ve 2 tarjetas en el grid:
  - 🏢 Sica 1
  - 🏢 Sica 4
- NO ve: Sica 2, Sica 3, Salón Inteligente 1, Salón Inteligente 2

**Al crear un reporte:**
- El selector de salas solo muestra:
  - Sica 1
  - Sica 4
- NO puede seleccionar otras salas

**Al ver reportes:**
- Solo ve reportes de Sica 1 y Sica 4
- Los reportes de otras salas están ocultos

---

## 📊 Ejemplos de Uso

### Ejemplo 1: Técnico con Todas las Salas

**Configuración:**
```javascript
salasAsignadas: [
    "Sica 1",
    "Sica 2",
    "Sica 3",
    "Sica 4",
    "Salon inteligente 1",
    "Salon inteligente 2"
]
```

**Resultado:** Ve todas las salas, funciona como técnico general.

### Ejemplo 2: Técnico Solo para Sica 1

**Configuración:**
```javascript
salasAsignadas: ["Sica 1"]
```

**Resultado:**
- Solo ve la tarjeta de "Sica 1"
- Solo puede crear reportes para "Sica 1"
- Solo ve estadísticas de "Sica 1"

### Ejemplo 3: Técnico para Salones Inteligentes

**Configuración:**
```javascript
salasAsignadas: [
    "Salon inteligente 1",
    "Salon inteligente 2"
]
```

**Resultado:**
- Solo ve 2 tarjetas: Salón Inteligente 1 y 2
- No tiene acceso a Sicas 1-4

---

## 🎨 Interfaz del Módulo de Gestión

### Vista Principal (Tabla de Técnicos)

```
┌─────────────────────────────────────────────────────────────────┐
│ Centro de Gestión de Técnicos                                   │
│ ┌─────────────┬─────────────┐                                   │
│ │ 5 Técnicos  │ 6 Salas     │     [🔍 Buscar] [Nuevo Técnico]  │
│ │ Activos     │ Asignadas   │                                   │
│ └─────────────┴─────────────┘                                   │
├─────────────────────────────────────────────────────────────────┤
│ ID  Usuario     Nombre           Salas         Estado  Acciones │
├─────────────────────────────────────────────────────────────────┤
│ 1   juan.perez  Juan Pérez       [Sica1][S4]  ●Activo [Ver][✏][🗑]│
│ 2   maria.lopez María López      [Sica2][S3]  ●Activo [Ver][✏][🗑]│
│ 3   carlos.ruiz Carlos Ruiz      [SI1][SI2]   ○Inact. [Ver][✏][🗑]│
└─────────────────────────────────────────────────────────────────┘
```

### Modal de Creación/Edición

```
┌──────────────────────────────────────────────┐
│ ➕ Nuevo Técnico                        [X] │
├──────────────────────────────────────────────┤
│ Usuario *                                    │
│ ┌────────────────────────────────────────┐  │
│ │ juan.perez                             │  │
│ └────────────────────────────────────────┘  │
│                                              │
│ Contraseña *                                 │
│ ┌────────────────────────────────────────┐  │
│ │ ●●●●●●●●                               │  │
│ └────────────────────────────────────────┘  │
│                                              │
│ Nombre Completo *                            │
│ ┌────────────────────────────────────────┐  │
│ │ Juan Pérez García                      │  │
│ └────────────────────────────────────────┘  │
│                                              │
│ Salas Asignadas *                            │
│ ☑ Sica 1        ☑ Sica 2        ☑ Sica 3   │
│ ☑ Sica 4        ☐ SI 1          ☐ SI 2     │
│                                              │
│ Estado                                       │
│ ● Activo  ○ Inactivo                        │
├──────────────────────────────────────────────┤
│          [Cancelar]  [💾 Guardar Técnico]   │
└──────────────────────────────────────────────┘
```

---

## 🔒 Reglas de Firestore Necesarias

```javascript
// Regla para colección "tecnico"
match /tecnico/{document=**} {
  allow read: if request.auth != null || true;
  allow create: if request.auth != null || true;
  allow update: if request.auth != null || true;
  allow delete: if request.auth != null || true;
}
```

**⚠️ Importante:** Estas reglas son permisivas para desarrollo. En producción, deberían restringirse según roles.

---

## 🧪 Cómo Probar el Sistema

### Prueba 1: Crear Técnico con Salas Limitadas

1. Login como admin
2. Ir a **Más Opciones** → Página 2 → **Gestión de Técnicos**
3. Click **"Nuevo Técnico"**
4. Crear técnico:
   - Usuario: `prueba.sica1`
   - Contraseña: `test123`
   - Nombre: `Técnico de Prueba Sica 1`
   - Salas: Solo **Sica 1** ✅
   - Estado: Activo
5. Guardar

### Prueba 2: Login como Técnico Restringido

1. Presionar **Alt+T**
2. Login con:
   - Usuario: `prueba.sica1`
   - Contraseña: `test123`
3. Ir a **Reportes**
4. ✅ **Verificar:** Solo aparece la tarjeta de "Sica 1"
5. ✅ **Verificar:** No aparecen Sica 2, 3, 4, ni Salones Inteligentes

### Prueba 3: Crear Reporte Restringido

1. Click en **"Nuevo Reporte"**
2. ✅ **Verificar:** Selector de salas solo muestra "Sica 1"
3. Crear reporte de prueba
4. ✅ **Verificar:** Reporte se crea correctamente
5. ✅ **Verificar:** Aparece en la tarjeta de "Sica 1"

### Prueba 4: Editar Salas Asignadas

1. Login como admin
2. Ir a **Gestión de Técnicos**
3. Editar el técnico `prueba.sica1`
4. Agregar también **Sica 4** ✅
5. Guardar
6. Logout del admin
7. Login nuevamente como `prueba.sica1`
8. ✅ **Verificar:** Ahora ve 2 tarjetas: Sica 1 y Sica 4

---

## 🎯 Características Especiales

### 1. Validación de Usuario Único
- No permite crear dos técnicos con el mismo usuario
- Muestra error si el usuario ya existe

### 2. Salas Múltiples
- Un técnico puede tener asignadas de 1 a 6 salas
- Debe tener al menos 1 sala asignada

### 3. Compatibilidad Hacia Atrás
- Si un técnico antiguo no tiene `salasAsignadas`, muestra todas las salas
- Evita romper funcionalidad de técnicos existentes

### 4. Seguridad
- Contraseña en texto plano (según especificación)
- Advertencia en la interfaz sobre seguridad

### 5. Estados Visuales
- **Activo:** Badge verde, usuario puede login
- **Inactivo:** Badge gris, login bloqueado

---

## 📈 Estadísticas Disponibles

### En el Dashboard de Admin:

- **Total Técnicos Activos:** Cuenta de técnicos con estado "activo"
- **Total Salas Asignadas:** Número de salas únicas asignadas a al menos un técnico

### En la Tabla:

- Cada fila muestra las salas asignadas como badges
- Color azul para Sicas
- Color verde para Salones Inteligentes

---

## 🔧 Mantenimiento y Extensión

### Agregar Nueva Sala

1. Modificar array SALAS en `technician-reportes.js`
2. Agregar checkbox en `gestion-tecnicos.html`
3. Agregar opción en selector (se hace dinámicamente)

### Cambiar Validación de Contraseña

Editar `js/gestion-tecnicos.js`:
```javascript
// Línea ~150
if (!formData.contraseña || formData.contraseña.length < 8) {
    errors.push('La contraseña debe tener al menos 8 caracteres');
}
```

### Agregar Más Permisos

Agregar nuevos campos en Firestore:
```javascript
{
    salasAsignadas: [...],
    permisosReportes: true,      // Puede crear reportes
    permisosInventario: true,    // Puede gestionar inventario
    permisosMapas: false         // No puede ver mapas
}
```

---

## ✅ Checklist de Implementación

- [x] Página de gestión de técnicos (HTML, CSS, JS)
- [x] Tarjeta en admin-mas.html
- [x] Navegación desde admin-mas
- [x] CRUD completo en Firestore
- [x] Validación de usuario único
- [x] Asignación de salas múltiples
- [x] Login guarda salasAsignadas en sesión
- [x] Panel técnico filtra por salas asignadas
- [x] Selector de salas dinámico
- [x] Grid de salas filtrado
- [x] Compatibilidad hacia atrás
- [x] Estados activo/inactivo
- [x] Documentación completa

---

## 📞 Soporte y Troubleshooting

### Problema: Técnico no ve ninguna sala

**Causa:** Técnico sin salas asignadas
**Solución:**
1. Admin edita el técnico
2. Asigna al menos 1 sala
3. Técnico hace logout y login nuevamente

### Problema: Cambios de salas no se reflejan

**Causa:** Sesión antigua en sessionStorage
**Solución:**
1. Técnico hace logout
2. Login nuevamente
3. Sesión se actualiza con nuevas salas

### Problema: "Usuario ya existe"

**Causa:** Intento de crear técnico con usuario duplicado
**Solución:**
1. Usar otro nombre de usuario
2. O editar el técnico existente

---

**Última actualización:** 2024-12-06
**Versión:** 1.0 - Sistema de Gestión de Técnicos con Restricción por Salas
