// Variables globales para Firebase
let gestionDB;
let gestionAuth;

// Variables de estado
let tecnicosList = [];
let filteredTecnicos = [];
let currentTecnico = null;
let editingMode = false;

// Salas disponibles en el sistema
const SALAS_DISPONIBLES = [
    'Sica 1',
    'Sica 2',
    'Sica 3',
    'Sica 4',
    'Salón Inteligente 1',
    'Salón Inteligente 2'
];

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    const checkFirebase = setInterval(() => {
        if (window.firebase && window.firebaseDB && window.firebaseAuth) {
            clearInterval(checkFirebase);
            initializeGestionTecnicos();
        }
    }, 100);

    setTimeout(() => {
        clearInterval(checkFirebase);
        if (!gestionDB) {
            showNotification('Error de conexión con Firebase', 'error');
        }
    }, 10000);
});

async function initializeGestionTecnicos() {
    try {
        gestionDB = window.firebaseDB;
        gestionAuth = window.firebaseAuth;

        console.log('🔧 Gestión de Técnicos inicializada');

        // Verificar autenticación
        gestionAuth.onAuthStateChanged(async (user) => {
            if (!user) {
                window.location.href = 'login.html';
                return;
            }

            await setupGestionTecnicos();
        });

    } catch (error) {
        console.error('❌ Error inicializando gestión:', error);
        showNotification('Error al cargar la página', 'error');
    }
}

async function setupGestionTecnicos() {
    try {
        // Configurar event listeners
        setupEventListeners();

        // Cargar técnicos
        await loadTecnicos();

        console.log('✅ Gestión de técnicos configurada correctamente');

    } catch (error) {
        console.error('❌ Error configurando gestión:', error);
    }
}

function setupEventListeners() {
    // Búsqueda
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }

    // Filtros
    const filterSelect = document.getElementById('filterSelect');
    if (filterSelect) {
        filterSelect.addEventListener('change', handleFilter);
    }

    console.log('🎧 Event listeners configurados');
}

// =====================================================================
// CARGA DE DATOS
// =====================================================================

async function loadTecnicos() {
    const loadingState = document.getElementById('loadingState');
    const tableBody = document.getElementById('tecnicosTableBody');
    const emptyState = document.getElementById('emptyState');
    const table = document.querySelector('.table-responsive');

    try {
        if (loadingState) loadingState.style.display = 'flex';
        if (tableBody) tableBody.innerHTML = '';

        // Cargar técnicos desde Firestore
        const snapshot = await gestionDB.collection('tecnico')
            .orderBy('fechaCreacion', 'desc')
            .get();

        tecnicosList = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            tecnicosList.push({
                id: doc.id,
                ...data
            });
        });

        if (loadingState) loadingState.style.display = 'none';

        // Aplicar filtro por defecto: activos
        const filterSelect = document.getElementById('filterSelect');
        if (filterSelect && !filterSelect.value) {
            filterSelect.value = 'activo';
        }

        // Filtrar solo activos para mostrar por defecto
        const tecnicosParaMostrar = tecnicosList.filter(tecnico => tecnico.estado === 'activo');

        if (tecnicosParaMostrar.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            if (table) table.style.display = 'none';
        } else {
            if (emptyState) emptyState.style.display = 'none';
            if (table) table.style.display = 'block';
            renderTecnicos(tecnicosParaMostrar);
        }

        // Actualizar estadísticas
        updateEstadisticas();

    } catch (error) {
        console.error('Error cargando técnicos:', error);
        if (loadingState) loadingState.style.display = 'none';
        showNotification('Error al cargar los técnicos', 'error');
    }
}

function renderTecnicos(tecnicos) {
    const tableBody = document.getElementById('tecnicosTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    tecnicos.forEach((tecnico, index) => {
        const row = createTecnicoRow(tecnico, index);
        tableBody.appendChild(row);
    });
}

function createTecnicoRow(tecnico, index) {
    const row = document.createElement('tr');
    row.setAttribute('data-tecnico-id', tecnico.id);

    const salasHtml = (tecnico.salasAsignadas || []).map(sala => {
        const isSica = sala.toLowerCase().includes('sica');
        const badgeClass = isSica ? 'sica' : 'salon-inteligente';
        return `<span class="sala-badge ${badgeClass}">${sala}</span>`;
    }).join(' ');

    const statusClass = tecnico.estado === 'activo' ? 'status-activo' : 'status-inactivo';
    const statusText = tecnico.estado === 'activo' ? 'Activo' : 'Inactivo';

    row.innerHTML = `
        <td>${index + 1}</td>
        <td><strong>${tecnico.usuario || 'N/A'}</strong></td>
        <td>${tecnico.nombre || 'Sin nombre'}</td>
        <td>${salasHtml || '<span class="text-muted">Sin salas asignadas</span>'}</td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        <td>
            <div class="action-buttons">
                <button class="btn-action btn-view" onclick="verTecnico('${tecnico.id}')" title="Ver">
                    <i class="bi bi-eye"></i>
                </button>
                <button class="btn-action btn-edit" onclick="editarTecnico('${tecnico.id}')" title="Editar">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn-action btn-delete" onclick="eliminarTecnico('${tecnico.id}')" title="Eliminar">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </td>
    `;

    return row;
}

function updateEstadisticas() {
    const totalTecnicosElement = document.getElementById('totalTecnicos');
    const totalSalasElement = document.getElementById('totalSalas');

    const activosTecnicos = tecnicosList.filter(t => t.estado === 'activo').length;

    // Contar salas únicas asignadas
    const salasAsignadas = new Set();
    tecnicosList.forEach(tecnico => {
        if (tecnico.salasAsignadas && Array.isArray(tecnico.salasAsignadas)) {
            tecnico.salasAsignadas.forEach(sala => salasAsignadas.add(sala));
        }
    });

    if (totalTecnicosElement) {
        totalTecnicosElement.textContent = activosTecnicos;
    }
    if (totalSalasElement) {
        totalSalasElement.textContent = salasAsignadas.size;
    }
}

// =====================================================================
// BÚSQUEDA Y FILTROS
// =====================================================================

function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase();

    filteredTecnicos = tecnicosList.filter(tecnico => {
        const usuario = (tecnico.usuario || '').toLowerCase();
        const nombre = (tecnico.nombre || '').toLowerCase();

        return usuario.includes(searchTerm) || nombre.includes(searchTerm);
    });

    renderTecnicos(filteredTecnicos);
}

function handleFilter(event) {
    const filterValue = event.target.value;

    if (filterValue === 'todos') {
        filteredTecnicos = [...tecnicosList];
    } else if (filterValue === 'activo') {
        filteredTecnicos = tecnicosList.filter(tecnico => tecnico.estado === 'activo');
    } else if (filterValue === 'inactivo') {
        filteredTecnicos = tecnicosList.filter(tecnico => tecnico.estado === 'inactivo');
    }

    renderTecnicos(filteredTecnicos);
}

// =====================================================================
// CRUD OPERATIONS
// =====================================================================

function openNuevoTecnico() {
    currentTecnico = null;
    editingMode = false;

    // Limpiar formulario
    const tecnicoForm = document.getElementById('tecnicoForm');
    const tecnicoModalTitle = document.getElementById('tecnicoModalTitle');

    if (tecnicoForm) tecnicoForm.reset();
    if (tecnicoModalTitle) {
        tecnicoModalTitle.innerHTML = `
            <i class="bi bi-person-plus me-2"></i>
            Nuevo Técnico
        `;
    }

    // Desmarcar todas las salas
    uncheckAllSalas();

    const modal = new bootstrap.Modal(document.getElementById('tecnicoModal'));
    modal.show();
}

async function verTecnico(tecnicoId) {
    try {
        const tecnico = tecnicosList.find(t => t.id === tecnicoId);
        if (!tecnico) {
            showNotification('Técnico no encontrado', 'error');
            return;
        }

        const salasHtml = (tecnico.salasAsignadas || []).map(sala => {
            const isSica = sala.toLowerCase().includes('sica');
            const badgeClass = isSica ? 'sica' : 'salon-inteligente';
            return `<span class="sala-badge ${badgeClass}">${sala}</span>`;
        }).join(' ');

        const statusClass = tecnico.estado === 'activo' ? 'status-activo' : 'status-inactivo';
        const statusText = tecnico.estado === 'activo' ? 'Activo' : 'Inactivo';

        const content = `
            <div class="detalle-tecnico" style="background: rgba(102, 126, 234, 0.1); padding: 1.5rem; border-radius: 10px;">
                <div class="row g-3">
                    <div class="col-md-6">
                        <strong>Usuario:</strong><br>
                        <span style="color: var(--text-primary);">${tecnico.usuario || 'N/A'}</span>
                    </div>
                    <div class="col-md-6">
                        <strong>Nombre Completo:</strong><br>
                        <span style="color: var(--text-primary);">${tecnico.nombre || 'Sin nombre'}</span>
                    </div>
                    <div class="col-md-6">
                        <strong>Contraseña:</strong><br>
                        <span style="color: var(--text-primary);">${tecnico.contraseña || 'N/A'}</span>
                    </div>
                    <div class="col-md-6">
                        <strong>Estado:</strong><br>
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </div>
                    <div class="col-12">
                        <strong>Salas Asignadas:</strong><br>
                        ${salasHtml || '<span class="text-muted">Sin salas asignadas</span>'}
                    </div>
                    <div class="col-md-6">
                        <strong>Fecha de Creación:</strong><br>
                        <span style="color: var(--text-primary);">${formatDate(tecnico.fechaCreacion)}</span>
                    </div>
                    ${tecnico.fechaActualizacion ? `
                        <div class="col-md-6">
                            <strong>Última Actualización:</strong><br>
                            <span style="color: var(--text-primary);">${formatDate(tecnico.fechaActualizacion)}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        const verTecnicoContent = document.getElementById('verTecnicoContent');
        if (verTecnicoContent) {
            verTecnicoContent.innerHTML = content;
        }

        const modal = new bootstrap.Modal(document.getElementById('verTecnicoModal'));
        modal.show();

    } catch (error) {
        console.error('Error viendo técnico:', error);
        showNotification('Error al cargar los detalles del técnico', 'error');
    }
}

async function editarTecnico(tecnicoId) {
    try {
        const tecnico = tecnicosList.find(t => t.id === tecnicoId);
        if (!tecnico) {
            showNotification('Técnico no encontrado', 'error');
            return;
        }

        currentTecnico = tecnico;
        editingMode = true;

        // Llenar formulario
        fillTecnicoForm(tecnico);

        const tecnicoModalTitle = document.getElementById('tecnicoModalTitle');
        if (tecnicoModalTitle) {
            tecnicoModalTitle.innerHTML = `
                <i class="bi bi-person-gear me-2"></i>
                Editar Técnico: ${tecnico.nombre || tecnico.usuario}
            `;
        }

        const modal = new bootstrap.Modal(document.getElementById('tecnicoModal'));
        modal.show();

    } catch (error) {
        console.error('Error editando técnico:', error);
        showNotification('Error al cargar el técnico', 'error');
    }
}

function fillTecnicoForm(tecnico) {
    // Llenar campos básicos
    const setValue = (id, value) => {
        const element = document.getElementById(id);
        if (element) {
            element.value = value || '';
        }
    };

    setValue('usuario', tecnico.usuario);
    setValue('contrasena', tecnico.contraseña);
    setValue('nombre', tecnico.nombre);
    setValue('estado', tecnico.estado || 'activo');

    // Marcar salas asignadas
    uncheckAllSalas();
    if (tecnico.salasAsignadas && Array.isArray(tecnico.salasAsignadas)) {
        tecnico.salasAsignadas.forEach(sala => {
            const checkboxId = getSalaCheckboxId(sala);
            const checkbox = document.getElementById(checkboxId);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
    }
}

function uncheckAllSalas() {
    const checkboxes = [
        'sala_sica1',
        'sala_sica2',
        'sala_sica3',
        'sala_sica4',
        'sala_si1',
        'sala_si2'
    ];

    checkboxes.forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            checkbox.checked = false;
        }
    });
}

function getSalaCheckboxId(salaNombre) {
    const mapping = {
        'Sica 1': 'sala_sica1',
        'Sica 2': 'sala_sica2',
        'Sica 3': 'sala_sica3',
        'Sica 4': 'sala_sica4',
        'Salón Inteligente 1': 'sala_si1',
        'Salón Inteligente 2': 'sala_si2'
    };
    return mapping[salaNombre] || '';
}

async function guardarTecnico() {
    try {
        console.log('💾 Guardando técnico...');

        // Validar formulario
        const errors = validateTecnicoForm();
        if (errors.length > 0) {
            showNotification('Errores de validación:\n' + errors.join('\n'), 'error');
            return;
        }

        // Recopilar datos
        const tecnicoData = collectTecnicoData();

        // Verificar usuario único (solo en modo creación)
        if (!editingMode) {
            const usuarioExiste = await verificarUsuarioExiste(tecnicoData.usuario);
            if (usuarioExiste) {
                showNotification('El usuario ya existe. Por favor, elige otro.', 'error');
                return;
            }
        }

        // Guardar en Firestore
        if (editingMode && currentTecnico && currentTecnico.id) {
            // Actualizar
            await gestionDB.collection('tecnico').doc(currentTecnico.id).update({
                ...tecnicoData,
                fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
            });
            showNotification('Técnico actualizado exitosamente', 'success');
        } else {
            // Crear nuevo
            await gestionDB.collection('tecnico').add({
                ...tecnicoData,
                fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
                fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
            });
            showNotification('Técnico creado exitosamente', 'success');
        }

        // Cerrar modal y recargar
        const modal = bootstrap.Modal.getInstance(document.getElementById('tecnicoModal'));
        if (modal) modal.hide();

        await loadTecnicos();

    } catch (error) {
        console.error('❌ Error guardando técnico:', error);
        showNotification('Error al guardar el técnico: ' + error.message, 'error');
    }
}

function validateTecnicoForm() {
    const errors = [];

    const getValue = (id) => {
        const element = document.getElementById(id);
        return element ? element.value.trim() : '';
    };

    // Validar usuario
    const usuario = getValue('usuario');
    if (!usuario) {
        errors.push('Usuario es obligatorio');
    } else if (usuario.includes(' ')) {
        errors.push('Usuario no puede contener espacios');
    }

    // Validar contraseña
    const contrasena = getValue('contrasena');
    if (!contrasena) {
        errors.push('Contraseña es obligatoria');
    }

    // Validar nombre
    const nombre = getValue('nombre');
    if (!nombre) {
        errors.push('Nombre completo es obligatorio');
    }

    // Validar al menos una sala asignada
    const salasAsignadas = getSalasAsignadas();
    if (salasAsignadas.length === 0) {
        errors.push('Debe asignar al menos una sala');
    }

    return errors;
}

function collectTecnicoData() {
    const getValue = (id) => {
        const element = document.getElementById(id);
        return element ? element.value.trim() : '';
    };

    return {
        usuario: getValue('usuario'),
        contraseña: getValue('contrasena'), // Texto plano
        nombre: getValue('nombre'),
        salasAsignadas: getSalasAsignadas(),
        estado: getValue('estado') || 'activo'
    };
}

function getSalasAsignadas() {
    const salas = [];
    const checkboxes = [
        { id: 'sala_sica1', value: 'Sica 1' },
        { id: 'sala_sica2', value: 'Sica 2' },
        { id: 'sala_sica3', value: 'Sica 3' },
        { id: 'sala_sica4', value: 'Sica 4' },
        { id: 'sala_si1', value: 'Salón Inteligente 1' },
        { id: 'sala_si2', value: 'Salón Inteligente 2' }
    ];

    checkboxes.forEach(checkbox => {
        const element = document.getElementById(checkbox.id);
        if (element && element.checked) {
            salas.push(checkbox.value);
        }
    });

    return salas;
}

async function verificarUsuarioExiste(usuario) {
    try {
        const snapshot = await gestionDB.collection('tecnico')
            .where('usuario', '==', usuario)
            .get();

        return !snapshot.empty;
    } catch (error) {
        console.error('Error verificando usuario:', error);
        return false;
    }
}

async function eliminarTecnico(tecnicoId) {
    try {
        const tecnico = tecnicosList.find(t => t.id === tecnicoId);
        if (!tecnico) {
            showNotification('Técnico no encontrado', 'error');
            return;
        }

        const confirmacion = confirm(
            `¿Está seguro de que desea eliminar al técnico "${tecnico.nombre || tecnico.usuario}"?\n\n` +
            `Esta acción no se puede deshacer.`
        );

        if (!confirmacion) {
            return;
        }

        await gestionDB.collection('tecnico').doc(tecnicoId).delete();

        showNotification('Técnico eliminado exitosamente', 'success');

        await loadTecnicos();

    } catch (error) {
        console.error('Error eliminando técnico:', error);
        showNotification('Error al eliminar el técnico: ' + error.message, 'error');
    }
}

// =====================================================================
// UTILIDADES
// =====================================================================

function formatDate(timestamp) {
    if (!timestamp) return 'No disponible';

    let date;
    if (timestamp.toDate) {
        date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
        date = timestamp;
    } else {
        date = new Date(timestamp);
    }

    return date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// =====================================================================
// NOTIFICACIONES
// =====================================================================

function showNotification(message, type = 'info', duration = 5000) {
    const container = document.getElementById('notification-container') || document.body;

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        min-width: 350px;
        max-width: 500px;
        background: ${getNotificationColor(type)};
        color: white;
        border-radius: 15px;
        padding: 1.5rem;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255,255,255,0.2);
        transform: translateX(100%) scale(0.8);
        opacity: 0;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    `;

    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 1rem;">
            <div style="font-size: 1.5rem;">
                <i class="bi ${getNotificationIcon(type)}"></i>
            </div>
            <div style="flex: 1;">
                ${message}
            </div>
            <button onclick="this.parentElement.parentElement.remove()" style="
                background: none; border: none; color: white; font-size: 1.2rem;
                cursor: pointer; opacity: 0.7; padding: 0; line-height: 1;
            ">
                <i class="bi bi-x"></i>
            </button>
        </div>
    `;

    container.appendChild(notification);

    // Animar entrada
    requestAnimationFrame(() => {
        notification.style.transform = 'translateX(0) scale(1)';
        notification.style.opacity = '1';
    });

    // Auto-remover
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.transform = 'translateX(100%) scale(0.8)';
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 400);
        }
    }, duration);
}

function getNotificationColor(type) {
    const colors = {
        'success': 'linear-gradient(135deg, #10B981, #059669)',
        'info': 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
        'warning': 'linear-gradient(135deg, #F59E0B, #D97706)',
        'error': 'linear-gradient(135deg, #EF4444, #DC2626)'
    };
    return colors[type] || colors['info'];
}

function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'bi-check-circle-fill';
        case 'error': return 'bi-exclamation-triangle-fill';
        case 'warning': return 'bi-exclamation-triangle-fill';
        case 'info': return 'bi-info-circle-fill';
        default: return 'bi-info-circle-fill';
    }
}

// =====================================================================
// FUNCIONES DE UI ADICIONALES
// =====================================================================

/**
 * Alternar visibilidad de la contraseña
 */
function togglePassword() {
    const passwordInput = document.getElementById('contrasena');
    const toggleIcon = document.getElementById('passwordToggleIcon');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.classList.remove('bi-eye');
        toggleIcon.classList.add('bi-eye-slash');
    } else {
        passwordInput.type = 'password';
        toggleIcon.classList.remove('bi-eye-slash');
        toggleIcon.classList.add('bi-eye');
    }
}

// =====================================================================
// EXPORTAR FUNCIONES GLOBALES
// =====================================================================

window.openNuevoTecnico = openNuevoTecnico;
window.verTecnico = verTecnico;
window.editarTecnico = editarTecnico;
window.eliminarTecnico = eliminarTecnico;
window.guardarTecnico = guardarTecnico;
window.togglePassword = togglePassword;
