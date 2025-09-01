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
            importancia: document.getElementById('tareaImportancia').value
        };
        
        if (editId) {
            // Actualizar tarea existente
            await db.collection('pendientes').doc(editId).update(tareaData);
            showNotification('Tarea actualizada exitosamente', 'success');
        } else {
            // Crear nueva tarea
            await db.collection('pendientes').add(tareaData);
            showNotification('Tarea creada exitosamente', 'success');
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
        'viewRegistros': () => {// Admin Downloads JavaScript
class AdminDownloadsManager {
    constructor() {
        this.documents = [];
        this.filteredDocuments = [];
        this.selectedDocuments = new Set();
        this.isLoading = false;
        this.downloadProgress = {
            current: 0,
            total: 0,
            currentFile: ''
        };
        
        this.init();
    }

    init() {
        this.initializeComponents();
        this.setupEventListeners();
        this.loadDocuments();
        this.setupSounds();
    }

    initializeComponents() {
        // Set page title
        if (window.SICAComponents) {
            window.SICAComponents.setPageTitle("Centro de Descargas - Administración SICA");
        }

        // Initialize UI elements
        this.elements = {
            searchInput: document.getElementById('search-input'),
            stateFilter: document.getElementById('state-filter'),
            selectAllBtn: document.getElementById('select-all-btn'),
            clearSelectionBtn: document.getElementById('clear-selection-btn'),
            downloadSelectedBtn: document.getElementById('download-selected-btn'),
            documentsGrid: document.getElementById('documents-grid'),
            loadingState: document.getElementById('loading-state'),
            emptyState: document.getElementById('empty-state'),
            totalDocuments: document.getElementById('total-documents'),
            selectedCount: document.getElementById('selected-count'),
            downloadModal: new bootstrap.Modal(document.getElementById('downloadModal')),
            closeDownloadModal: document.getElementById('close-download-modal')
        };
    }

    setupEventListeners() {
        // Search functionality
        this.elements.searchInput.addEventListener('input', 
            this.debounce(() => this.filterDocuments(), 300));

        // Filter by state
        this.elements.stateFilter.addEventListener('change', () => this.filterDocuments());

        // Bulk actions
        this.elements.selectAllBtn.addEventListener('click', () => this.selectAll());
        this.elements.clearSelectionBtn.addEventListener('click', () => this.clearSelection());
        this.elements.downloadSelectedBtn.addEventListener('click', () => this.downloadSelected());

        // Modal close
        this.elements.closeDownloadModal.addEventListener('click', () => {
            this.elements.downloadModal.hide();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    setupSounds() {
        // Audio context for UI sounds
        this.audioContext = null;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Audio context not supported');
        }
    }

    playSound(frequency, duration) {
        if (!this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    async loadDocuments() {
        try {
            this.showLoading(true);
            
            // Get documents from Firestore
            const documentsSnapshot = await firebase.firestore()
                .collection('asesores')
                .get();

            this.documents = [];
            
            documentsSnapshot.forEach(doc => {
                const data = doc.data();
                // Only include documents that have URLs for download
                if (this.hasDownloadableContent(data)) {
                    this.documents.push({
                        id: doc.id,
                        ...data,
                        displayName: this.getDisplayName(data),
                        downloadUrls: this.getDownloadUrls(data)
                    });
                }
            });

            this.filteredDocuments = [...this.documents];
            this.updateStats();
            this.renderDocuments();
            this.showLoading(false);
            
            this.playSound(440, 0.1); // Success sound
            
        } catch (error) {
            console.error('Error loading documents:', error);
            this.showError('Error al cargar los documentos');
            this.showLoading(false);
        }
    }

    hasDownloadableContent(data) {
        const urlFields = [
            'comprobanteDomicilio1',
            'comprovanteInscripcion1',
            'credencialUnam1',
            'curp1',
            'historialAcademico1',
            'ine1'
        ];
        
        return urlFields.some(field => data[field] && data[field].trim() !== '');
    }

    getDisplayName(data) {
        if (data.emailInstitucional) {
            // Extract name from institutional email
            const emailParts = data.emailInstitucional.split('@')[0];
            return emailParts.replace(/\./g, ' ').toUpperCase();
        }
        return data.curp || data.correoElectronico || 'Documento sin nombre';
    }

    getDownloadUrls(data) {
        const urls = [];
        const urlFields = {
            'comprobanteDomicilio1': 'Comprobante de Domicilio',
            'comprovanteInscripcion1': 'Comprobante de Inscripción', 
            'credencialUnam1': 'Credencial UNAM',
            'curp1': 'CURP',
            'historialAcademico1': 'Historial Académico',
            'ine1': 'INE'
        };

        Object.entries(urlFields).forEach(([field, label]) => {
            if (data[field] && data[field].trim() !== '') {
                urls.push({
                    url: data[field],
                    label: label,
                    field: field
                });
            }
        });

        return urls;
    }

    filterDocuments() {
        const searchTerm = this.elements.searchInput.value.toLowerCase().trim();
        const stateFilter = this.elements.stateFilter.value;

        this.filteredDocuments = this.documents.filter(doc => {
            // Search filter
            const matchesSearch = !searchTerm || 
                doc.displayName.toLowerCase().includes(searchTerm) ||
                (doc.curp && doc.curp.toLowerCase().includes(searchTerm)) ||
                (doc.correoElectronico && doc.correoElectronico.toLowerCase().includes(searchTerm)) ||
                (doc.emailInstitucional && doc.emailInstitucional.toLowerCase().includes(searchTerm));

            // State filter
            const matchesState = !stateFilter || doc.estado === stateFilter;

            return matchesSearch && matchesState;
        });

        this.updateStats();
        this.renderDocuments();
        this.updateSelectionAfterFilter();
    }

    updateSelectionAfterFilter() {
        // Remove selected documents that are no longer visible
        const visibleIds = new Set(this.filteredDocuments.map(doc => doc.id));
        const newSelection = new Set();
        
        this.selectedDocuments.forEach(id => {
            if (visibleIds.has(id)) {
                newSelection.add(id);
            }
        });
        
        this.selectedDocuments = newSelection;
        this.updateDownloadButton();
        this.updateStats();
    }

    renderDocuments() {
        const grid = this.elements.documentsGrid;
        
        if (this.filteredDocuments.length === 0) {
            grid.innerHTML = '';
            this.elements.emptyState.style.display = 'block';
            return;
        }

        this.elements.emptyState.style.display = 'none';
        
        grid.innerHTML = this.filteredDocuments.map((doc, index) => {
            const isSelected = this.selectedDocuments.has(doc.id);
            const statusClass = `status-${doc.estado || 'pendiente'}`;
            const statusIcon = this.getStatusIcon(doc.estado);
            
            return `
                <div class="col-lg-6 col-xl-4 fade-in-up" style="animation-delay: ${index * 0.1}s">
                    <div class="document-card ${isSelected ? 'selected' : ''}" data-id="${doc.id}">
                        <input type="checkbox" class="document-checkbox" 
                               ${isSelected ? 'checked' : ''} 
                               onchange="adminDownloads.toggleSelection('${doc.id}')">
                        
                        <div class="document-info">
                            <h3 class="document-name">${doc.displayName}</h3>
                            
                            <div class="document-details">
                                <div class="detail-item">
                                    <i class="bi bi-person-badge"></i>
                                    <span>${doc.curp || 'No disponible'}</span>
                                </div>
                                <div class="detail-item">
                                    <i class="bi bi-envelope"></i>
                                    <span>${doc.correoElectronico || 'No disponible'}</span>
                                </div>
                                <div class="detail-item">
                                    <i class="bi bi-files"></i>
                                    <span>${doc.downloadUrls.length} documento(s)</span>
                                </div>
                                <div class="detail-item">
                                    <i class="bi bi-calendar-event"></i>
                                    <span>${this.formatDate(doc.fechaActualizacion || doc.fechaNacimiento)}</span>
                                </div>
                            </div>
                            
                            <div class="document-status ${statusClass}">
                                <i class="bi ${statusIcon}"></i>
                                ${this.getStatusText(doc.estado)}
                            </div>
                            
                            <div class="document-actions">
                                <button class="btn-document-action btn-download-single" 
                                        onclick="adminDownloads.downloadSingle('${doc.id}')">
                                    <i class="bi bi-download"></i>
                                    Descargar
                                </button>
                                <button class="btn-document-action btn-view-details" 
                                        onclick="adminDownloads.viewDetails('${doc.id}')">
                                    <i class="bi bi-eye"></i>
                                    Detalles
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    getStatusIcon(estado) {
        const icons = {
            'aprobado': 'bi-check-circle-fill',
            'pendiente': 'bi-clock-fill',
            'rechazado': 'bi-x-circle-fill'
        };
        return icons[estado] || 'bi-question-circle-fill';
    }

    getStatusText(estado) {
        const texts = {
            'aprobado': 'Aprobado',
            'pendiente': 'Pendiente',
            'rechazado': 'Rechazado'
        };
        return texts[estado] || 'Sin Estado';
    }

    formatDate(dateString) {
        if (!dateString) return 'Fecha no disponible';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return 'Fecha inválida';
        }
    }

    toggleSelection(docId) {
        if (this.selectedDocuments.has(docId)) {
            this.selectedDocuments.delete(docId);
            this.playSound(300, 0.1);
        } else {
            this.selectedDocuments.add(docId);
            this.playSound(500, 0.1);
        }
        
        this.updateDocumentCardSelection(docId);
        this.updateDownloadButton();
        this.updateStats();
    }

    updateDocumentCardSelection(docId) {
        const card = document.querySelector(`[data-id="${docId}"]`);
        if (card) {
            const isSelected = this.selectedDocuments.has(docId);
            card.classList.toggle('selected', isSelected);
            
            const checkbox = card.querySelector('.document-checkbox');
            if (checkbox) {
                checkbox.checked = isSelected;
            }
        }
    }

    selectAll() {
        this.selectedDocuments.clear();
        this.filteredDocuments.forEach(doc => {
            this.selectedDocuments.add(doc.id);
        });
        
        this.updateAllDocumentCards();
        this.updateDownloadButton();
        this.updateStats();
        this.playSound(600, 0.2);
        
        this.showNotification('Todos los documentos seleccionados', 'success');
    }

    clearSelection() {
        this.selectedDocuments.clear();
        this.updateAllDocumentCards();
        this.updateDownloadButton();
        this.updateStats();
        this.playSound(200, 0.1);
        
        this.showNotification('Selección limpiada', 'info');
    }

    updateAllDocumentCards() {
        document.querySelectorAll('.document-card').forEach(card => {
            const docId = card.getAttribute('data-id');
            const isSelected = this.selectedDocuments.has(docId);
            
            card.classList.toggle('selected', isSelected);
            
            const checkbox = card.querySelector('.document-checkbox');
            if (checkbox) {
                checkbox.checked = isSelected;
            }
        });
    }

    updateDownloadButton() {
        const btn = this.elements.downloadSelectedBtn;
        const count = this.selectedDocuments.size;
        
        btn.disabled = count === 0;
        
        if (count === 0) {
            btn.querySelector('.download-text').textContent = 'Selecciona documentos';
        } else {
            btn.querySelector('.download-text').textContent = `Descargar ${count} documento(s)`;
        }
    }

    updateStats() {
        this.elements.totalDocuments.textContent = this.filteredDocuments.length;
        this.elements.selectedCount.textContent = this.selectedDocuments.size;
    }

    async downloadSelected() {
        if (this.selectedDocuments.size === 0) return;
        
        const selectedDocs = this.documents.filter(doc => 
            this.selectedDocuments.has(doc.id)
        );
        
        await this.downloadMultipleDocuments(selectedDocs);
    }

    async downloadSingle(docId) {
        const doc = this.documents.find(d => d.id === docId);
        if (!doc) return;
        
        await this.downloadMultipleDocuments([doc]);
    }

    async downloadMultipleDocuments(docs) {
        this.downloadProgress.current = 0;
        this.downloadProgress.total = docs.reduce((sum, doc) => sum + doc.downloadUrls.length, 0);
        this.downloadProgress.currentFile = '';
        
        this.elements.downloadModal.show();
        this.updateDownloadProgress();
        
        const logList = document.getElementById('download-log-list');
        logList.innerHTML = '';
        
        try {
            for (const doc of docs) {
                for (const urlInfo of doc.downloadUrls) {
                    this.downloadProgress.currentFile = `${doc.displayName} - ${urlInfo.label}`;
                    this.updateDownloadProgress();
                    
                    try {
                        await this.downloadFile(urlInfo.url, `${doc.displayName}_${urlInfo.label}`);
                        this.addDownloadLog(`✓ ${this.downloadProgress.currentFile}`, 'success');
                    } catch (error) {
                        console.error('Download error:', error);
                        this.addDownloadLog(`✗ Error: ${this.downloadProgress.currentFile}`, 'error');
                    }
                    
                    this.downloadProgress.current++;
                    this.updateDownloadProgress();
                    
                    // Small delay between downloads
                    await this.delay(500);
                }
            }
            
            this.playSound(800, 0.3);
            this.showNotification('Descarga completada', 'success');
            
        } catch (error) {
            console.error('Download process error:', error);
            this.showNotification('Error durante la descarga', 'error');
        } finally {
            document.getElementById('close-download-modal').disabled = false;
            this.downloadProgress.currentFile = 'Descarga completada';
            this.updateDownloadProgress();
        }
    }

    async downloadFile(url, filename) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = this.sanitizeFilename(filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            window.URL.revokeObjectURL(downloadUrl);
            
        } catch (error) {
            throw new Error(`Failed to download ${filename}: ${error.message}`);
        }
    }

    sanitizeFilename(filename) {
        return filename.replace(/[^a-z0-9_\-\.]/gi, '_');
    }

    updateDownloadProgress() {
        const percentage = this.downloadProgress.total > 0 
            ? (this.downloadProgress.current / this.downloadProgress.total) * 100 
            : 0;
            
        document.querySelector('.modal .progress-bar').style.width = `${percentage}%`;
        document.querySelector('.current-file').textContent = this.downloadProgress.currentFile;
        document.querySelector('.download-count').textContent = 
            `${this.downloadProgress.current} / ${this.downloadProgress.total}`;
    }

    addDownloadLog(message, type = 'info') {
        const logList = document.getElementById('download-log-list');
        const li = document.createElement('li');
        li.className = type;
        li.textContent = message;
        logList.appendChild(li);
        logList.scrollTop = logList.scrollHeight;
    }

    viewDetails(docId) {
        const doc = this.documents.find(d => d.id === docId);
        if (!doc) return;
        
        const details = {
            'ID': doc.id,
            'Nombre': doc.displayName,
            'CURP': doc.curp || 'No disponible',
            'Email': doc.correoElectronico || 'No disponible',
            'Email Institucional': doc.emailInstitucional || 'No disponible',
            'Estado': this.getStatusText(doc.estado),
            'Fecha de Nacimiento': doc.fechaNacimiento || 'No disponible',
            'Fecha de Actualización': doc.fechaActualizacion || 'No disponible',
            'Documentos disponibles': doc.downloadUrls.map(url => url.label).join(', ')
        };
        
        const detailsHtml = Object.entries(details)
            .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
            .join('<br>');
            
        if (window.SICAComponents && window.SICAComponents.notify) {
            window.SICAComponents.notify(
                'Detalles del Documento',
                detailsHtml,
                'info',
                'bi-info-circle-fill'
            );
        }
    }

    handleKeyboardShortcuts(e) {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case 'a':
                    e.preventDefault();
                    this.selectAll();
                    break;
                case 'd':
                    e.preventDefault();
                    if (this.selectedDocuments.size > 0) {
                        this.downloadSelected();
                    }
                    break;
            }
        }
        
        if (e.key === 'Escape') {
            this.clearSelection();
        }
    }

    showLoading(show) {
        this.elements.loadingState.style.display = show ? 'block' : 'none';
        this.elements.documentsGrid.style.display = show ? 'none' : 'block';
    }

    showNotification(message, type = 'info') {
        if (window.SICAComponents && window.SICAComponents.notify) {
            const icons = {
                'success': 'bi-check-circle-fill',
                'error': 'bi-exclamation-triangle-fill',
                'info': 'bi-info-circle-fill',
                'warning': 'bi-exclamation-circle-fill'
            };
            
            window.SICAComponents.notify(
                type.charAt(0).toUpperCase() + type.slice(1),
                message,
                type,
                icons[type]
            );
        }
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Admin Downloads page loaded');
    
    // Check if user is authenticated (only admins have accounts)
    firebase.auth().onAuthStateChanged((user) => {
        console.log('Auth state changed:', user ? 'User logged in' : 'No user');
        
        if (user) {
            console.log('User authenticated:', user.email);
            console.log('Initializing admin downloads manager...');
            
            // Initialize admin downloads manager
            window.adminDownloads = new AdminDownloadsManager();
        } else {
            console.log('No user authenticated, redirecting to login');
            // Redirect unauthenticated users to login
            window.location.href = '../login.html';
        }
    });
});

// Export for global access
window.AdminDownloadsManager = AdminDownloadsManager;
            // Mostrar modal de contraseña
            const modal = new bootstrap.Modal(document.getElementById('passwordModal'));
            modal.show();
            
            // Focus en el input cuando se abra el modal
            document.getElementById('passwordModal').addEventListener('shown.bs.modal', () => {
                document.getElementById('pagrenPassword').focus();
            });
        },
        'manageUsers': () => {
            // Redirigir a la página de descargas
            window.location.href = '../view/admin-downloads.html';
        },
        'systemSettings': () =>  {
            // Redirigir a la página de descargas
            window.location.href = '../view/folio-manager.html';
        },
        'generateReport': () => generateReport(),
        // 👇 AGREGAR ESTA LÍNEA
        'technicianPanel': () => {
    window.location.href = '../view/tec.html'; // ✅ Ruta correcta
}
    };
    
    Object.entries(actions).forEach(([id, handler]) => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('click', handler);
        }
    });
    
    // Event listener para verificar contraseña
    const verifyBtn = document.getElementById('verifyPassword');
    const passwordInput = document.getElementById('pagrenPassword');
    const errorDiv = document.getElementById('passwordError');
    
    if (verifyBtn && passwordInput) {
        verifyBtn.addEventListener('click', verifyPagrenPassword);
        
        // Permitir Enter para enviar
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                verifyPagrenPassword();
            }
        });
    }
}

function verifyPagrenPassword() {
    const password = document.getElementById('pagrenPassword').value;
    const errorDiv = document.getElementById('passwordError');
    const modal = bootstrap.Modal.getInstance(document.getElementById('passwordModal'));
    
    if (password === '@@@@@') {
        errorDiv.style.display = 'none';
        modal.hide();
        showNotification('Acceso autorizado. Abriendo PAGREN...', 'success');
        setTimeout(() => {
            window.location.href = '../view/pagren.html';
        }, 500);
    } else {
        errorDiv.style.display = 'block';
        document.getElementById('pagrenPassword').classList.add('is-invalid');
        
        // Limpiar error después de 3 segundos
        setTimeout(() => {
            errorDiv.style.display = 'none';
            document.getElementById('pagrenPassword').classList.remove('is-invalid');
        }, 3000);
    }
}

async function generateReport() {
    try {
        showNotification('Generando reporte...', 'info');
        
        // Simular generación de reporte
        setTimeout(() => {
            showNotification('Reporte generado exitosamente', 'success');
        }, 2000);
        
    } catch (error) {
        console.error('❌ Error generando reporte:', error);
        showNotification('Error al generar el reporte', 'error');
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