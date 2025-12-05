# 🔧 Página de Reportes Técnicos - Guía de Configuración

## ✅ Qué se ha Creado

### 1. **Archivos HTML**
- `view/technician-dashboard.html` - Actualizado con:
  - Sección completa de Reportes con tabla y controles
  - Modal para crear/editar reportes
  - Modal para ver detalles de reportes

### 2. **Archivos CSS**
- `css/technician-reportes.css` (8.6 KB)
  - Estilos profesionales para tabla de reportes
  - Diseño responsive (mobile, tablet, desktop)
  - Badges de categoría y urgencia color-codificados
  - Modales estilizados

### 3. **Archivos JavaScript**
- `js/technician-reportes.js` (22 KB)
  - Sistema completo CRUD (Create, Read, Update, Delete)
  - Búsqueda en tiempo real
  - Filtro por sala
  - Carga de datos desde Firestore
  - Validaciones de formulario

- `js/technician-dashboard.js` - Actualizado con:
  - Carga de datos REALES de reportes desde Firestore
  - Estadísticas en tiempo real
  - Activity log dinámico basado en reportes del día

---

## 📋 Campos del Formulario de Reportes

### Campos Disponibles:
1. **Fecha de Inicio** (por defecto = hoy)
2. **Sala** (obligatorio)
   - Sica 1, 2, 3, 4
   - Salón Inteligente 1 y 2
3. **Salón/Aula** (ej: A101, B205)
4. **Nivel de Urgencia** (obligatorio)
   - Urgente (rojo)
   - Moderado (naranja)
   - Normal (verde)
5. **Categoría** (obligatorio)
   - Software
   - Hardware
6. **Subcategoría** (obligatorio, depende de categoría)
   - **Software:**
     - Activación de Office
     - Activación de Windows
     - Solicitud de nuevos programas
     - ANSYS
     - Otros - Especificar
   - **Hardware:**
     - Teclado
     - Pantalla
     - Fuente
     - Red
     - Mouse
     - Disco
     - RAM
     - Otros - Especificar
7. **Especificar** (aparece si subcategoría es "Otros")
8. **Descripción del Problema** (obligatorio)
9. **Técnico Responsable** (auto-llenado con usuario logueado)

---

## 🗄️ Estructura Firestore Requerida

### Colección: `reportes`

Cada documento tendrá esta estructura:

```json
{
  "fecha": "2024-12-04",
  "sala": "Sica 1",
  "salon": "A101",
  "urgencia": "Urgente",
  "categoria": "Software",
  "subcategoria": "Activación de Office",
  "especificar": "",
  "descripcion": "El Office no se abre correctamente",
  "tecnico": "Juan Pérez",
  "tecnicoId": "tecnico_001",
  "fechaCreacion": Timestamp,
  "fechaActualizacion": Timestamp
}
```

---

## 🔐 Reglas Firestore Necesarias

Agrega estas reglas a tu Firestore en Firebase Console:

```javascript
match /reportes/{document=**} {
  allow read: if request.auth != null || true;
  allow create: if true;
  allow update: if true;
  allow delete: if true;
}
```

**⚠️ IMPORTANTE:** Para mayor seguridad en producción, tighten estas reglas.

---

## 🎯 Funcionalidades Implementadas

### Panel de Inicio (Home)
- ✅ Conteo de reportes de hoy
- ✅ Conteo de reportes URGENTES (pendientes)
- ✅ Conteo de reportes de SOFTWARE (completados)
- ✅ Conteo de reportes de HARDWARE (en progreso)
- ✅ Activity Log con últimos 4 reportes del día

### Página de Reportes
- ✅ **Crear Reporte**: Modal con todos los campos
- ✅ **Ver Detalles**: Modal con info completa del reporte
- ✅ **Editar Reporte**: Abre modal con datos precargados
- ✅ **Eliminar Reporte**: Con confirmación
- ✅ **Buscar**: Campo de búsqueda en tiempo real
- ✅ **Filtrar por Sala**: Dropdown con todas las salas
- ✅ **Tabla Responsiva**: Se adapta a móvil/tablet/desktop
- ✅ **Estados Visuales**: Badges color-codificados

---

## 🚀 Cómo Usar

### 1. Crear un Reporte
1. Haz clic en "Nuevo Reporte" (botón azul)
2. Rellena todos los campos requeridos
3. Haz clic en "Guardar Reporte"
4. El reporte aparecerá en la tabla

### 2. Ver Detalles
1. Haz clic en el icono de ojo (👁️) en la tabla
2. Se abre un modal con todos los detalles

### 3. Editar un Reporte
1. Haz clic en el icono de lápiz (✏️) en la tabla
2. O desde el modal de detalles, haz clic en "Editar"
3. Modifica los datos y guarda

### 4. Eliminar un Reporte
1. Haz clic en el icono de basura (🗑️)
2. Confirma la eliminación

### 5. Buscar Reportes
- Escribe en el campo "Buscar reportes..."
- Busca por sala, descripción, categoría, etc.

### 6. Filtrar por Sala
- Usa el dropdown "Todas las salas"
- Selecciona una sala para ver solo sus reportes

---

## 📊 Estadísticas del Panel de Inicio

Las estadísticas se alimentan AUTOMÁTICAMENTE con reportes del DÍA:

| Métrica | Cálculo | Color |
|---------|---------|-------|
| **Reportes Hoy** | Total de reportes de hoy | Azul |
| **Pendientes** | Reportes con urgencia = "Urgente" | Naranja |
| **Completados** | Reportes con categoría = "Software" | Verde |
| **En Progreso** | Reportes con categoría = "Hardware" | Morado |

---

## 🔍 Filtros Implementados

1. **Búsqueda Global**: Busca en:
   - Sala
   - Salón/Aula
   - Descripción
   - Categoría
   - Subcategoría
   - Urgencia

2. **Filtro por Sala**: Solo muestra reportes de la sala seleccionada

3. **Mostrar Solo Hoy**: Todos los reportes mostrados son de HOY SOLAMENTE

---

## ⚙️ Configuración Técnica

### Base de Datos: Firestore
- Colección: `reportes`
- Auto-ID por defecto (genera IDs únicos)

### Autenticación:
- Técnico obtenido de `sessionStorage.technicianSession`
- Nombre del técnico se auto-rellena

### Validaciones:
- Todos los campos requeridos están marcados
- Validación en tiempo real de subcategorías

### Responsive Design:
- Desktop (1200px+): Tabla completa
- Tablet (768px-1199px): Tabla adaptada
- Mobile (<768px): Tabla comprimida, botones optimizados

---

## 🐛 Troubleshooting

### Los reportes no cargan
- Verifica que las reglas Firestore permitan lectura
- Abre la consola (F12) y busca errores

### No puedo crear reportes
- Verifica que la sesión de técnico sea válida
- Abre consola y confirma que `getTechnicianSession()` retorna datos

### La tabla está vacía pero creé reportes
- Los reportes se filtran por FECHA = HOY
- Verifica que la fecha del reporte sea hoy

### Los números en inicio no cambian
- Actualiza la página (F5)
- Los números se cargan cuando la página abre

---

## 📱 Navegación

- **Alt+T**: Ir a login técnico (desde cualquier página)
- **Alt+I**: Ir a Inicio (desde dashboard técnico)
- **Alt+L**: Cerrar sesión (desde dashboard técnico)

---

## 🎨 Colores y Estilo

### Urgencia:
- 🔴 Urgente: Rojo (#dc2626)
- 🟠 Moderado: Naranja (#d97706)
- 🟢 Normal: Verde (#16a34a)

### Categoría:
- 💻 Software: Azul (#0284c7)
- 🖥️ Hardware: Rosa (#be185d)

---

## ✨ Próximas Mejoras Opcionales

1. Exportar reportes a CSV/PDF
2. Filtros avanzados (por fecha rango)
3. Reportes completados / pendientes
4. Asignación de reportes a múltiples técnicos
5. Sistema de comentarios en reportes
6. Seguimiento de estado (abierto, en progreso, resuelto)
7. Historial de cambios
8. Notificaciones en tiempo real

---

## 📞 Soporte

Si algo no funciona:
1. Abre la consola (F12) y busca errores rojo
2. Verifica las reglas Firestore
3. Comprueba que Firestore está inicializado
4. Reinicia la aplicación (F5)

¡Todo listo! 🚀
