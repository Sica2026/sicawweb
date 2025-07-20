let dashboardDB;
let dashboardAuth;
let pendientesCollection = [];

// Inicializar dashboard cuando esté disponible
document.addEventListener('DOMContentLoaded', function() {
    // Esperar a que Firebase esté disponible
    const checkFirebase = setInterval(() => {
        if (window.firebase && window.firebaseDB && window.firebaseAuth) {
            clearInterval(checkFirebase);
            initializeDashboard();
        }
    }, 100);
    
    // Timeout después de 10 segundos
    setTimeout(() => {
        clearInterval(checkFirebase);
        if (!db) {
            showNotification('Error de conexión con Firebase', 'error');
        }
    }, 10000);
});

async function initializeDashboard() {
    try {
        // Inicializar Firebase
        dashboardDB = window.firebaseDB;
        dashboardAuth = window.firebaseAuth;
        
        console.log('🔥 Dashboard conectado a Firebase');
        
        // Verificar autenticación
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                await setupDashboard(user);
            } else {
                // Redirigir al login si no está autenticado
                window.location.href = 'login.html';
            }
        });
        
    } catch (error) {
        console.error('❌ Error inicializando dashboard:', error);
        showNotification('Error al cargar el dashboard', 'error');
    }
}

async function setupDashboard(user) {
    try {
        // Mostrar información del usuario
        updateUserInfo(user);
               
        // Configurar event listeners
        setupEventListeners();
        
        // Cargar pendientes
        await loadPendientes();
        
        console.log('✅ Dashboard cargado correctamente');
        
    } catch (error) {
        console.error('❌ Error configurando dashboard:', error);
        showNotification('Error al configurar el dashboard', 'error');
    }
}

function updateUserInfo(user) {
    const adminName = document.getElementById('adminName');
    const welcomeMessage = document.getElementById('welcomeMessage');
    
    if (adminName) {
        adminName.textContent = user.displayName || user.email || 'Administrador';
    }
    
    if (welcomeMessage) {
        const hour = new Date().getHours();
        let greeting = 'Buenos días';
        if (hour >= 12 && hour < 18) greeting = 'Buenas tardes';
        else if (hour >= 18) greeting = 'Buenas noches';
        
        welcomeMessage.textContent = `${greeting}, ${user.displayName || 'administrador'}`;
    }
}

async function loadPendientes() {
    const loadingState = document.getElementById('pendientesLoading');
    const pendientesList = document.getElementById('pendientesList');
    const emptyState = document.getElementById('emptyState');
    
    try {
        // Mostrar loading
        loadingState.style.display = 'block';
        pendientesList.style.display = 'none';
        emptyState.style.display = 'none';
        
        // Cargar pendientes de Firestore
        const snapshot = await db.collection('pendientes')
            .orderBy('fecha_final', 'asc')
            .get();
        
        pendientesCollection = [];
        snapshot.forEach(doc => {
            pendientesCollection.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Ocultar loading
        loadingState.style.display = 'none';
        
        if (pendientesCollection.length === 0) {
            emptyState.style.display = 'block';
        } else {
            pendientesList.style.display = 'block';
            renderPendientes();
        }
        
        console.log('✅ Pendientes cargados:', pendientesCollection.length);
        
    } catch (error) {
        console.error('❌ Error cargando pendientes:', error);
        loadingState.style.display = 'none';
        showNotification('Error al cargar las tareas pendientes', 'error');
    }
}

function renderPendientes() {
    const pendientesList = document.getElementById('pendientesList');
    if (!pendientesList) return;
    
    pendientesList.innerHTML = '';
    
    pendientesCollection.forEach((pendiente, index) => {
        const pendienteElement = createPendienteElement(pendiente);
        pendienteElement.style.animationDelay = `${index * 0.1}s`;
        pendienteElement.classList.add('fade-in-up');
        pendientesList.appendChild(pendienteElement);
    });
}

function createPendienteElement(pendiente) {
    const div = document.createElement('div');
    div.className = 'pendiente-item';
    div.setAttribute('data-id', pendiente.id);
    
    // Calcular prioridad basada en fecha límite
    const priority = calculatePriority(pendiente);
    
    // Formatear fecha
    const fechaLimite = formatDate(pendiente.fecha_final);
    const diasRestantes = getDaysRemaining(pendiente.fecha_final);
    
    div.innerHTML = `
        <div class="pendiente-header">
            <h5 class="pendiente-title">${pendiente.titulo}</h5>
            <span class="pendiente-priority priority-${priority}">${getPriorityText(priority)}</span>
        </div>
        <div class="pendiente-content">
            ${pendiente.contenido}
        </div>
        <div class="pendiente-meta">
            <div class="meta-left">
                <div class="meta-item">
                    <i class="bi bi-person-fill"></i>
                    <span>Asignado a: ${pendiente.asignacion}</span>
                </div>
                <div class="meta-item">
                    <i class="bi bi-calendar-event"></i>
                    <span>Fecha límite: ${fechaLimite}</span>
                </div>
                <div class="meta-item">
                    <i class="bi bi-clock"></i>
                    <span class="dias-restantes ${diasRestantes < 0 ? 'overdue' : diasRestantes <= 2 ? 'urgent' : ''}">
                        ${diasRestantes < 0 ? `Vencido hace ${Math.abs(diasRestantes)} días` : 
                          diasRestantes === 0 ? 'Vence hoy' : 
                          `${diasRestantes} días restantes`}
                    </span>
                </div>
            </div>
            <div class="pendiente-actions">
                <button class="btn-complete" onclick="completePendiente('${pendiente.id}')">
                    <i class="bi bi-check"></i> Completar
                </button>
                <button class="btn-edit" onclick="editPendiente('${pendiente.id}')">
                    <i class="bi bi-pencil"></i> Editar
                </button>
            </div>
        </div>
    `;
    
    return div;
}

function calculatePriority(pendiente) {
    // Si tiene importancia definida, usarla; si no, calcular por fecha
    if (pendiente.importancia) {
        return pendiente.importancia === 'urgente' ? 'high' : 'medium';
    }
    
    // Fallback para pendientes sin importancia
    const days = getDaysRemaining(pendiente.fecha_final);
    if (days < 0 || days <= 2) return 'high';
    return 'medium';
}

function getDaysRemaining(fechaFinal) {
    const now = new Date();
    const deadline = fechaFinal.toDate ? fechaFinal.toDate() : new Date(fechaFinal);
    const diffTime = deadline - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

function formatDate(fecha) {
    const date = fecha.toDate ? fecha.toDate() : new Date(fecha);
    return date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

async function completePendiente(id) {
    try {
        // Confirmar acción
        if (!confirm('¿Estás seguro de marcar esta tarea como completada?')) {
            return;
        }
        
        // Eliminar de Firestore
        await db.collection('pendientes').doc(id).delete();
        
        // Actualizar interfaz
        const element = document.querySelector(`[data-id="${id}"]`);
        if (element) {
            element.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => {
                element.remove();
                
                // Verificar si quedan pendientes
                if (document.querySelectorAll('.pendiente-item').length === 0) {
                    document.getElementById('pendientesList').style.display = 'none';
                    document.getElementById('emptyState').style.display = 'block';
                }
            }, 300);
        }
              
        showNotification('Tarea completada exitosamente', 'success');
        
        // Registrar actividad
        await logActivity('Tarea completada', `Se completó la tarea: ${id}`);
        
    } catch (error) {
        console.error('❌ Error completando pendiente:', error);
        showNotification('Error al completar la tarea', 'error');
    }
}

function editPendiente(id) {
    const pendiente = pendientesCollection.find(p => p.id === id);
    if (!pendiente) return;
    
    // Llenar el modal con los datos existentes
    document.getElementById('tareaTitle').value = pendiente.titulo;
    document.getElementById('tareaContent').value = pendiente.contenido;
    document.getElementById('tareaAssignee').value = pendiente.asignacion;
    document.getElementById('tareaImportancia').value = pendiente.importancia || 'normal';
    
    // Convertir fecha de Firestore a formato datetime-local
    const fecha = pendiente.fecha_final.toDate ? 
        pendiente.fecha_final.toDate() : 
        new Date(pendiente.fecha_final);
    
    const fechaString = fecha.toISOString().slice(0, 16);
    document.getElementById('tareaDeadline').value = fechaString;
    
    // Cambiar el botón de guardar para modo edición
    const saveBtn = document.getElementById('saveTarea');
    saveBtn.textContent = 'Actualizar Tarea';
    saveBtn.setAttribute('data-edit-id', id);
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('nuevaTareaModal'));
    modal.show();
}

function setupEventListeners() {
    // Botón de actualizar pendientes
    const refreshBtn = document.getElementById('refreshPendientes');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadPendientes);
    }
    
    // Botón de nueva tarea
    const addBtn = document.getElementById('addPendiente');
    const addFirstBtn = document.getElementById('addFirstPendiente');
    
    [addBtn, addFirstBtn].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', showNewTaskModal);
        }
    });
    
    // Botón de guardar tarea
    const saveBtn = document.getElementById('saveTarea');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveTarea);
    }
    
    // Formulario de nueva tarea
    const form = document.getElementById('nuevaTareaForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            saveTarea();
        });
    }
    
    // Acciones rápidas
    setupQuickActions();
    
    console.log('🎧 Event listeners configurados');
}

function showNewTaskModal() {
    // Limpiar formulario
    document.getElementById('nuevaTareaForm').reset();
    
    // Restaurar botón de guardar
    const saveBtn = document.getElementById('saveTarea');
    saveBtn.textContent = 'Crear Tarea';
    saveBtn.removeAttribute('data-edit-id');
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('nuevaTareaModal'));
    modal.show();
}

async function saveTarea() {
    try {
        const title = document.getElementById('tareaTitle').value.trim();
        const content = document.getElementById('tareaContent').value.trim();
        const assignee = document.getElementById('tareaAssignee').value.trim();
        const deadline = document.getElementById('tareaDeadline').value;
        
        // Validaciones
        if (!title || !content || !assignee || !deadline) {
            showNotification('Por favor, completa todos los campos', 'warning');
            return;
        }
        
        const saveBtn = document.getElementById('saveTarea');
        const editId = saveBtn.getAttribute('data-edit-id');
        
        // Preparar datos
        const tareaData = {
        titulo: title,
        contenido: content,
        asignacion: assignee,
        fecha_final: firebase.firestore.Timestamp.fromDate(new Date(deadline)),
        importancia: document.getElementById('tareaImportancia').value // ✅ AGREGAR
        };
        
        if (editId) {
            // Actualizar tarea existente
            await db.collection('pendientes').doc(editId).update(tareaData);
            showNotification('Tarea actualizada exitosamente', 'success');
            await logActivity('Tarea actualizada', `Se actualizó la tarea: ${title}`);
        } else {
            // Crear nueva tarea
            await db.collection('pendientes').add(tareaData);
            showNotification('Tarea creada exitosamente', 'success');
            await logActivity('Tarea creada', `Se creó la tarea: ${title}`);
        }
        
        // Cerrar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('nuevaTareaModal'));
        modal.hide();
        
        // Recargar pendientes
        await loadPendientes();
        
    } catch (error) {
        console.error('❌ Error guardando tarea:', error);
        showNotification('Error al guardar la tarea', 'error');
    }
}

function setupQuickActions() {
    const actions = {
        'viewRegistros': () => showNotification('Función en desarrollo', 'info'),
        'manageUsers': () => showNotification('Función en desarrollo', 'info'),
        'systemSettings': () => showNotification('Función en desarrollo', 'info'),
        'generateReport': () => generateReport()
    };
    
    Object.entries(actions).forEach(([id, handler]) => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('click', handler);
        }
    });
}

async function generateReport() {
    try {
        showNotification('Generando reporte...', 'info');
        
        // Simular generación de reporte
        setTimeout(() => {
            showNotification('Reporte generado exitosamente', 'success');
        }, 2000);
        
        await logActivity('Reporte generado', 'Se generó un reporte del sistema');
        
    } catch (error) {
        console.error('❌ Error generando reporte:', error);
        showNotification('Error al generar el reporte', 'error');
    }
}

async function logActivity(title, description) {
    try {
        if (!db) return;
        
        await db.collection('admin_activity').add({
            title: title,
            description: description,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            user: auth.currentUser?.email || 'unknown',
            type: 'admin_action'
        });
        
    } catch (error) {
        console.warn('⚠️ Error registrando actividad:', error);
    }
}

function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
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
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
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

function getPriorityText(priority) {
    const priorities = {
        'high': 'URGENTE',
        'medium': 'NORMAL',
        'low': 'NORMAL'
    };
    return priorities[priority] || 'NORMAL';
}

// Agregar CSS para animaciones
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(-100%);
        }
    }
    
    .dias-restantes.urgent {
        color: #f59e0b;
        font-weight: 600;
    }
    
    .dias-restantes.overdue {
        color: #ef4444;
        font-weight: 600;
    }
`;
document.head.appendChild(style);

// Exportar funciones para uso global
window.DashboardAdmin = {
    loadPendientes,
    completePendiente,
    editPendiente,
    generateReport,
    showNotification
};