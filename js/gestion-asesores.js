// Variables globales para Firebase
let gestionDB;
let gestionAuth;
let gestionStorage;

// Variables de estado
let asesoresList = [];
let filteredAsesores = [];
let currentAsesor = null;
let editingMode = false;

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    const checkFirebase = setInterval(() => {
        if (window.firebase && window.firebaseDB && window.firebaseAuth && window.firebaseStorage) {
            clearInterval(checkFirebase);
            initializeGestionAsesores();
        }
    }, 100);
    
    setTimeout(() => {
        clearInterval(checkFirebase);
        if (!gestionDB) {
            showNotification('Error de conexión con Firebase', 'error');
        }
    }, 10000);
});

async function initializeGestionAsesores() {
    try {
        gestionDB = window.firebaseDB;
        gestionAuth = window.firebaseAuth;
        gestionStorage = window.firebaseStorage;
        
        console.log('👥 Gestión de Asesores inicializada');
        
        // Verificar autenticación
        gestionAuth.onAuthStateChanged(async (user) => {
            if (!user) {
                window.location.href = 'login.html';
                return;
            }
            
            await setupGestionAsesores();
        });
        
    } catch (error) {
        console.error('❌ Error inicializando gestión:', error);
        showNotification('Error al cargar la página', 'error');
    }
}

async function setupGestionAsesores() {
    try {
        // Configurar event listeners
        setupEventListeners();
        
        // Cargar asesores
        await loadAsesores();
        
        // Cargar estadísticas
        await loadEstadisticas();
        
        console.log('✅ Gestión de asesores configurada correctamente');
        
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
    
    // Modal de asesor - foto
    const fotoContainer = document.querySelector('.foto-container');
    if (fotoContainer) {
        fotoContainer.addEventListener('click', () => {
            const fotoInput = document.getElementById('fotoInput');
            if (fotoInput) fotoInput.click();
        });
    }
    
    // ✅ CONFIGURAR TODOS LOS INPUTS DE ARCHIVOS
    const fileInputs = [
        'fotoInput',
        'comprobanteDomicilioInput', 
        'ineInput',
        'historiaInput',
        'curpInput',
        'credencialUnamInput',
        'comprobanteInscripcionInput'
    ];
    
    fileInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('change', (e) => handleFileChange(e, inputId));
            console.log(`✅ Event listener configurado para ${inputId}`);
        }
    });
    
    console.log('🎧 Event listeners configurados');
}


// =====================================================================
// CARGA DE DATOS
// =====================================================================

async function loadAsesores() {
    const loadingState = document.getElementById('loadingState');
    const asesoresGrid = document.getElementById('asesoresGrid');
    const emptyState = document.getElementById('emptyState');
    
    try {
        if (loadingState) loadingState.style.display = 'flex';
        if (asesoresGrid) asesoresGrid.innerHTML = '';
        
        // ✅ SOLO CARGAR ASESORES APROBADOS
        const snapshot = await gestionDB.collection('asesores')
            .where('estado', '==', 'aprobado')
            .orderBy('fechaRegistro', 'desc')
            .get();
        
        asesoresList = [];
        snapshot.forEach(doc => {
            asesoresList.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        if (loadingState) loadingState.style.display = 'none';
        
        if (asesoresList.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            if (asesoresGrid) asesoresGrid.style.display = 'none';
        } else {
            if (emptyState) emptyState.style.display = 'none';
            if (asesoresGrid) asesoresGrid.style.display = 'grid';
            renderAsesores(asesoresList);
        }
        
        // Actualizar contador
        const totalAsesoresElement = document.getElementById('totalAsesores');
        if (totalAsesoresElement) {
            totalAsesoresElement.textContent = asesoresList.length;
        }
        
    } catch (error) {
        console.error('Error cargando asesores:', error);
        if (loadingState) loadingState.style.display = 'none';
        showNotification('Error al cargar los asesores', 'error');
    }
}

function renderAsesores(asesores) {
    const asesoresGrid = document.getElementById('asesoresGrid');
    if (!asesoresGrid) return;
    
    asesoresGrid.innerHTML = '';
    
    asesores.forEach((asesor, index) => {
        const asesorCard = createAsesorCard(asesor);
        asesoresGrid.appendChild(asesorCard);
        
        // Animación de entrada escalonada
        setTimeout(() => {
            asesorCard.classList.add('visible');
        }, index * 100);
    });
}

function createAsesorCard(asesor) {
    const card = document.createElement('div');
    card.className = `asesor-card ${getAsesorStatus(asesor)}`;
    card.setAttribute('data-asesor-id', asesor.id);
    
    const fotoUrl = asesor.fotoUrl || '../image/default-avatar.png';
    const numeroAsesor = asesor.numeroAsesor || 'N/A';
    const nombreCompleto = getNombreCompleto(asesor);
    const status = getAsesorStatus(asesor);
    
    card.innerHTML = `
        <div class="asesor-foto">
            <img src="${fotoUrl}" alt="${nombreCompleto}" onerror="this.src='../image/default-avatar.png'">
        </div>
        <div class="asesor-info">
            <div class="asesor-numero">#${numeroAsesor}</div>
            <h3>${nombreCompleto}</h3>
            <div class="asesor-status">
                <span class="status-badge status-${status}">${getStatusText(status)}</span>
            </div>
        </div>
    `;
    
    card.addEventListener('click', () => openAsesorModal(asesor));
    
    return card;
}

function getNombreCompleto(asesor) {
    // ✅ VERIFICAR QUE ASESOR EXISTE
    if (!asesor) return 'Sin nombre';
    
    // Si tiene nombreAsesor, usarlo
    if (asesor.nombreAsesor) return asesor.nombreAsesor;
    
    // Construir nombre a partir de partes
    const partes = [];
    if (asesor.nombre) partes.push(asesor.nombre);
    if (asesor.apellidoPaterno) partes.push(asesor.apellidoPaterno);
    if (asesor.apellidoMaterno) partes.push(asesor.apellidoMaterno);
    
    return partes.length > 0 ? partes.join(' ') : 'Sin nombre';
}

function getAsesorStatus(asesor) {
    // ✅ NUEVA LÓGICA:
    if (asesor.estado === 'aprobado') return 'activo';
    if (asesor.estado === 'pendiente') return 'pendiente';
    if (asesor.estado === 'rechazado') return 'inactivo';
    
    // Fallback para registros antiguos
    if (asesor.activo === false) return 'inactivo';
    if (asesor.tipoRegistro === 'publico' && !asesor.numeroAsesor) return 'pendiente';
    
    return 'activo';
}

function getStatusText(status) {
    const statusTexts = {
        'activo': 'Activo',
        'inactivo': 'Inactivo',
        'pendiente': 'Pendiente'
    };
    return statusTexts[status] || 'Desconocido';
}

// =====================================================================
// BÚSQUEDA Y FILTROS
// =====================================================================

function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    
    filteredAsesores = asesoresList.filter(asesor => {
        const nombreCompleto = getNombreCompleto(asesor).toLowerCase();
        const numeroAsesor = (asesor.numeroAsesor || '').toString().toLowerCase();
        
        return nombreCompleto.includes(searchTerm) || numeroAsesor.includes(searchTerm);
    });
    
    renderAsesores(filteredAsesores);
}

function handleFilter(event) {
    const filterValue = event.target.value;
    
    if (filterValue === 'todos') {
        filteredAsesores = [...asesoresList];
    } else {
        filteredAsesores = asesoresList.filter(asesor => 
            getAsesorStatus(asesor) === filterValue
        );
    }
    
    renderAsesores(filteredAsesores);
}

// =====================================================================
// MODALES Y FORMULARIOS
// =====================================================================

function openEstadisticas() {
    // ✅ CARGAR ESTADÍSTICAS DETALLADAS
    loadEstadisticasDetalladas();
    const modal = new bootstrap.Modal(document.getElementById('estadisticasModal'));
    modal.show();
}

// ✅ FUNCIÓN FALTANTE
async function loadEstadisticasDetalladas() {
    try {
        // Cargar todos los asesores para estadísticas completas
        const allSnapshot = await gestionDB.collection('asesores').get();
        const todosLosAsesores = [];
        allSnapshot.forEach(doc => {
            todosLosAsesores.push({ id: doc.id, ...doc.data() });
        });
        
        const totalAsesores = todosLosAsesores.length;
        const activosAsesores = todosLosAsesores.filter(a => a.estado === 'aprobado').length;
        const pendientesAsesores = todosLosAsesores.filter(a => a.estado === 'pendiente').length;
        const becarios = todosLosAsesores.filter(a => a.tieneBeca === 'si').length;
        
        // Actualizar elementos del modal
        const statTotal = document.getElementById('statTotalAsesores');
        const statActivos = document.getElementById('statActivosAsesores');
        const statPendientes = document.getElementById('statPendientesAsesores');
        const statBecarios = document.getElementById('statBecarios');
        
        if (statTotal) statTotal.textContent = totalAsesores;
        if (statActivos) statActivos.textContent = activosAsesores;
        if (statPendientes) statPendientes.textContent = pendientesAsesores;
        if (statBecarios) statBecarios.textContent = becarios;
        
    } catch (error) {
        console.error('Error cargando estadísticas detalladas:', error);
    }
}

function openNuevoAsesor() {
    currentAsesor = null;
    editingMode = false;
    
    // Limpiar formulario
    const asesorForm = document.getElementById('asesorForm');
    const fotoPreview = document.getElementById('fotoPreview');
    const asesorModalTitle = document.getElementById('asesorModalTitle');
    
    if (asesorForm) asesorForm.reset();
    if (fotoPreview) fotoPreview.src = '../image/default-avatar.png';
    if (asesorModalTitle) {
        asesorModalTitle.innerHTML = `
            <i class="bi bi-person-plus me-2"></i>
            Nuevo Asesor
        `;
    }
    
    // Generar número de asesor automático
    const nuevoNumero = generateNumeroAsesor();
    const numeroAsesorInput = document.getElementById('numeroAsesor');
    if (numeroAsesorInput) {
        numeroAsesorInput.value = nuevoNumero;
    }
    
    const modal = new bootstrap.Modal(document.getElementById('asesorModal'));
    modal.show();
}

function openAsesorModal(asesor) {
    currentAsesor = asesor;
    editingMode = true;
    
    // Llenar formulario con datos existentes
    fillAsesorForm(asesor);
    
    const asesorModalTitle = document.getElementById('asesorModalTitle');
    if (asesorModalTitle) {
        asesorModalTitle.innerHTML = `
            <i class="bi bi-person-gear me-2"></i>
            Editar Asesor: ${getNombreCompleto(asesor)}
        `;
    }
    
    const modal = new bootstrap.Modal(document.getElementById('asesorModal'));
    modal.show();
}

function fillAsesorForm(asesor) {
    console.log('📋 Llenando formulario con datos:', asesor);
    
    // Helper function para setear valores de forma segura
    const setValue = (id, value) => {
        const element = document.getElementById(id);
        if (element) {
            element.value = value || '';
        }
    };
    
    const setChecked = (id, checked) => {
        const element = document.getElementById(id);
        if (element) {
            element.checked = checked || false;
        }
    };
    
    // ====== INFORMACIÓN PERSONAL ======
    setValue('numeroAsesor', asesor.numeroAsesor);
    setValue('nombreAsesor', asesor.nombreAsesor || getNombreCompleto(asesor));
    setValue('curp', asesor.curp);
    setValue('fechaNacimiento', asesor.fechaNacimiento);
    setValue('sexo', asesor.sexo);
    setValue('estadoCivil', asesor.estadoCivil);
    
    // ====== INFORMACIÓN DE CONTACTO ======
    setValue('email', asesor.correoElectronico);
    setValue('telefono', asesor.telefonoCelular);
    setValue('telefonoCasa', asesor.telefonoCasa);
    setValue('emailInstitucional', asesor.emailInstitucional);
    
    // ====== INFORMACIÓN ACADÉMICA ======
    setValue('numeroCuentaAsesor', asesor.numeroCuenta);
    setValue('plantelAsesor', asesor.plantel);
    setValue('carreraAsesor', asesor.carrera);
    setValue('promedioAcademico', asesor.promedio);
    setValue('semestreCursando', asesor.semestreCursando);
    setValue('semestreConsecutivo', asesor.semestreConsecutivo);
    setValue('materiasCursando', asesor.materiasCursando);
    setValue('metodoInscripcion', asesor.metodoInscripcion);
    setValue('avanceCarrera', asesor.avance);
    
    // ====== ADMINISTRACIÓN Y ASIGNACIONES ======
    setValue('administrador', asesor.administrador);
    setValue('procedencia', asesor.procedencia);
    setValue('locker', asesor.locker);
    setValue('bloques', asesor.bloques);
    
    // ====== CONTROL DE HORAS ======
    setValue('horasSemana', asesor.horasSemana || 8);
    
    // ====== INFORMACIÓN FINANCIERA ======
    setValue('tieneBeca', asesor.tieneBeca);
    setValue('tipoBeca', asesor.tipoBeca);
    
    // Mostrar/ocultar tipo de beca
    toggleTipoBeca();
    
    // ====== VERIFICACIONES Y DOCUMENTOS ======
    setChecked('articulo22', asesor.articulo22);
    setChecked('gafete', asesor.gafete);
    setChecked('horarioImpreso', asesor.horarioImpreso);
    setChecked('permanencia', asesor.permanencia);
    setChecked('servicioSocial', asesor.servicioSocial);
    
    // ====== OBSERVACIONES Y NOTAS ======
    setValue('motivacion', asesor.motivacion);
    setValue('experiencia', asesor.experiencia);
    setValue('observaciones', asesor.observaciones);
    
    // ====== METADATOS DEL SISTEMA ======
    setValue('estadoAsesor', asesor.estado || 'pendiente');
    setValue('tipoRegistro', asesor.tipoRegistro || 'publico');
    setValue('fechaRegistro', formatDate(asesor.fechaRegistro));
    setValue('registradoPor', asesor.registradoPor);
    
    // ====== FOTO ======
    const fotoPreview = document.getElementById('fotoPreview');
    if (fotoPreview) {
        fotoPreview.src = asesor.fotoUrl || '../image/default-avatar.png';
    }
    
    // ====== DOCUMENTOS EXISTENTES ======
    const documentFields = {
        'comprobanteDomicilioInput': asesor.comprobanteDomicilioUrl,
        'ineInput': asesor.ineUrl,
        'historiaInput': asesor.historialAcademicoUrl,
        'curpInput': asesor.curpUrl,
        'credencialUnamInput': asesor.credencialUnamUrl,
        'comprobanteInscripcionInput': asesor.comprobanteInscripcionUrl
    };
    
    Object.entries(documentFields).forEach(([inputId, url]) => {
        if (url) {
            showExistingDocument({ downloadURL: url, originalName: getDocumentName(inputId) }, inputId);
        }
    });
    
    console.log('✅ Formulario llenado completamente');
}

function getDocumentName(inputId) {
    const names = {
        'comprobanteDomicilioInput': 'Comprobante de Domicilio',
        'ineInput': 'INE',
        'historiaInput': 'Historia Académica',
        'curpInput': 'CURP',
        'credencialUnamInput': 'Credencial UNAM',
        'comprobanteInscripcionInput': 'Comprobante de Inscripción'
    };
    return names[inputId] || 'Documento';
}

function showExistingDocument(documento, inputId) {
    const input = document.getElementById(inputId);
    if (!input || !documento.downloadURL) return;
    
    const container = input.parentElement;
    if (!container) return;
    
    const docTypeMap = {
        'comprobanteDomicilioInput': { name: 'Comprobante de Domicilio', icon: 'bi-house', class: 'comprobante-domicilio' },
        'ineInput': { name: 'INE/Identificación', icon: 'bi-person-badge', class: 'ine' },
        'historiaInput': { name: 'Historia Académica', icon: 'bi-file-pdf', class: 'historia' },
        'curpInput': { name: 'CURP', icon: 'bi-file-text', class: 'curp' },
        'credencialUnamInput': { name: 'Credencial UNAM', icon: 'bi-credit-card', class: 'credencial-unam' },
        'comprobanteInscripcionInput': { name: 'Comprobante de Inscripción', icon: 'bi-file-earmark-check', class: 'comprobante-inscripcion' }
    };
    
    const docInfo = docTypeMap[inputId] || { name: 'Documento', icon: 'bi-file', class: 'documento' };
    
    // ✅ SIN FECHA - Solo información relevante
    container.innerHTML = `
        <div class="document-loaded ${docInfo.class}" style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: rgba(76, 175, 80, 0.1); border-radius: 10px; border: 1px solid rgba(76, 175, 80, 0.3);">
            <i class="bi ${docInfo.icon}" style="font-size: 2rem; color: #4CAF50;"></i>
            <div style="flex: 1;">
                <strong style="color: var(--text-primary);">📄 ${docInfo.name} cargado</strong><br>
                <span style="color: var(--text-secondary); font-size: 0.9rem;">✅ Documento disponible</span>
            </div>
            <div style="display: flex; gap: 0.5rem;">
                <button type="button" class="btn btn-sm btn-success" onclick="abrirDocumento('${documento.downloadURL}')">
                    <i class="bi bi-eye"></i> Ver
                </button>
                <button type="button" class="btn btn-sm btn-warning" onclick="cambiarDocumentoExistente('${inputId}')">
                    <i class="bi bi-upload"></i> Cambiar
                </button>
            </div>
        </div>
        <input type="file" id="${inputId}" accept="image/*,application/pdf" style="display: none;">
    `;
    
    // ✅ RECONFIGURAR EVENT LISTENER DESPUÉS DE RECREAR EL INPUT
    const newInput = document.getElementById(inputId);
    if (newInput) {
        newInput.addEventListener('change', (e) => handleFileChange(e, inputId));
        console.log(`✅ Event listener reconfigurado para ${inputId}`);
    }
}

// Función para manejar el toggle de tipo de beca
function toggleTipoBeca() {
    const tieneBeca = document.getElementById('tieneBeca');
    const tipoBecaContainer = document.getElementById('tipoBecaContainer');
    const tipoBeca = document.getElementById('tipoBeca');
    
    if (!tieneBeca || !tipoBecaContainer) return;
    
    if (tieneBeca.value === 'si') {
        tipoBecaContainer.style.display = 'block';
    } else {
        tipoBecaContainer.style.display = 'none';
        if (tipoBeca) tipoBeca.value = '';
    }
}

// Función para manejar cambios de archivos
function handleFileChange(event, inputId) {
    const file = event.target.files[0];
    if (!file) {
        console.log('❌ No se seleccionó archivo');
        return;
    }
    
    console.log(`📁 Procesando archivo para ${inputId}:`, file.name, file.size);
    
    // ✅ VALIDAR TAMAÑO DE ARCHIVO (máximo 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        showNotification('El archivo es demasiado grande. Máximo 10MB permitido.', 'error');
        event.target.value = '';
        return;
    }
    
    // ✅ VALIDAR TIPO DE ARCHIVO
    const allowedTypes = {
        'fotoInput': ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
        'comprobanteDomicilioInput': ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
        'ineInput': ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
        'historiaInput': ['application/pdf'],
        'curpInput': ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
        'credencialUnamInput': ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
        'comprobanteInscripcionInput': ['application/pdf']
    };
    
    if (allowedTypes[inputId] && !allowedTypes[inputId].includes(file.type)) {
        showNotification('Tipo de archivo no permitido para este campo.', 'error');
        event.target.value = '';
        return;
    }
    
    // ✅ GUARDAR EL ARCHIVO EN UNA VARIABLE GLOBAL TEMPORAL
    if (!window.tempFiles) {
        window.tempFiles = {};
    }
    window.tempFiles[inputId] = file;
    console.log(`💾 Archivo guardado temporalmente para ${inputId}:`, file.name);
    
    // ✅ MANEJO ESPECÍFICO POR TIPO DE INPUT
    if (inputId === 'fotoInput') {
        handleFotoPreview(file);
        return;
    }
    
    // ✅ PARA DOCUMENTOS
    handleDocumentPreview(file, inputId, event.target);
}

function handleFotoPreview(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const fotoPreview = document.getElementById('fotoPreview');
        if (fotoPreview) {
            fotoPreview.src = e.target.result;
            console.log('✅ Preview de foto actualizado');
        }
    };
    reader.readAsDataURL(file);
    
    showNotification(`Foto seleccionada: ${file.name}`, 'success', 3000);
}

function handleDocumentPreview(file, inputId, inputElement) {
    const container = inputElement.parentElement;
    if (!container) {
        console.error('❌ No se encontró contenedor para', inputId);
        return;
    }
    
    const docTypeMap = {
        'comprobanteDomicilioInput': { name: 'Comprobante de Domicilio', icon: 'bi-house', class: 'comprobante-domicilio' },
        'ineInput': { name: 'INE/Identificación', icon: 'bi-person-badge', class: 'ine' },
        'historiaInput': { name: 'Historia Académica', icon: 'bi-file-pdf', class: 'historia' },
        'curpInput': { name: 'CURP', icon: 'bi-file-text', class: 'curp' },
        'credencialUnamInput': { name: 'Credencial UNAM', icon: 'bi-credit-card', class: 'credencial-unam' },
        'comprobanteInscripcionInput': { name: 'Comprobante de Inscripción', icon: 'bi-file-earmark-check', class: 'comprobante-inscripcion' }
    };
    
    const docInfo = docTypeMap[inputId];
    const fileTypeClass = file.type.includes('pdf') ? 'file-type-pdf' : 'file-type-img';
    const fileTypeText = file.type.includes('pdf') ? 'PDF' : 'IMG';
    
    container.innerHTML = `
        <div class="document-loaded ${docInfo.class}" style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: rgba(34, 197, 94, 0.1); border-radius: 10px; border: 1px solid rgba(34, 197, 94, 0.3); position: relative;">
            <i class="bi ${docInfo.icon}" style="font-size: 2rem; color: #22C55E;"></i>
            <div style="flex: 1;">
                <strong style="color: var(--text-primary);">✅ ${docInfo.name} listo:</strong><br>
                <span style="color: var(--text-secondary);">${file.name}</span><br>
                <small style="color: var(--text-light);">Tamaño: ${(file.size / 1024 / 1024).toFixed(2)} MB</small><br>
                <small style="color: #22C55E; font-weight: bold;">⏳ Se subirá al guardar</small>
            </div>
            <div class="file-type-indicator ${fileTypeClass}">${fileTypeText}</div>
            <div style="display: flex; gap: 0.5rem;">
                <button type="button" class="btn btn-sm btn-warning" onclick="resetFileInput('${inputId}')">
                    <i class="bi bi-arrow-clockwise"></i> Cambiar
                </button>
            </div>
        </div>
        <input type="file" id="${inputId}" accept="image/*,application/pdf" style="display: none;">
    `;
    
    // ✅ ANIMACIÓN DE ÉXITO
    const documentContainer = container.querySelector('.document-loaded');
    if (documentContainer) {
        documentContainer.classList.add('document-upload-success');
        setTimeout(() => {
            documentContainer.classList.remove('document-upload-success');
        }, 600);
    }
    
    // ✅ RECONFIGURAR EVENT LISTENER
    setTimeout(() => {
        const newInput = document.getElementById(inputId);
        if (newInput) {
            newInput.addEventListener('change', (e) => handleFileChange(e, inputId));
            console.log(`✅ Event listener reconfigurado para ${inputId}`);
        }
    }, 100);
    
    showNotification(`${docInfo.name} seleccionado: ${file.name}`, 'success', 3000);
    console.log(`✅ Archivo ${file.name} listo para ${inputId}`);
}

// ✅ FUNCIÓN CORREGIDA - guardarAsesorCompleto
async function guardarAsesorCompleto() {
    let saveButton = null;
    let originalText = '';
    
    try {
        console.log('💾 Iniciando guardado de asesor...');
        
        const errors = validateAllSections();
        if (errors.length > 0) {
            showNotification('Errores de validación:\n' + errors.join('\n'), 'error');
            return;
        }
        
        saveButton = document.querySelector('[onclick="guardarAsesorCompleto()"]');
        if (saveButton) {
            originalText = saveButton.innerHTML;
            saveButton.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Guardando...';
            saveButton.disabled = true;
        }
        
        const asesorData = collectFormData();
        
        // ✅ VERIFICAR QUE TENEMOS NÚMERO DE CUENTA PARA LA CARPETA
        const numeroCuenta = asesorData.numeroCuenta || asesorData.numeroAsesor;
        if (!numeroCuenta) {
            throw new Error('Se requiere número de cuenta o número de asesor para organizar documentos');
        }
        
        console.log(`📂 Usando carpeta: asesor_${numeroCuenta}`);
        
        // ✅ SUBIR ARCHIVOS USANDO ARCHIVOS TEMPORALES
        console.log('📤 Verificando archivos para subir...');
        console.log('🗂️ Archivos temporales disponibles:', window.tempFiles);
        
        // FOTO
        if (window.tempFiles && window.tempFiles['fotoInput']) {
            console.log('📸 Subiendo foto desde tempFiles:', window.tempFiles['fotoInput'].name);
            try {
                const fotoUrl = await uploadFoto(window.tempFiles['fotoInput'], numeroCuenta);
                asesorData.fotoUrl = fotoUrl;
                console.log('✅ Foto subida:', fotoUrl);
                delete window.tempFiles['fotoInput'];
            } catch (error) {
                console.error('❌ Error subiendo foto:', error);
                showNotification('Error subiendo foto: ' + error.message, 'warning');
            }
        }
        
        // DOCUMENTOS
        const documentInputs = [
            'comprobanteDomicilioInput',
            'ineInput', 
            'historiaInput',
            'curpInput',
            'credencialUnamInput',
            'comprobanteInscripcionInput'
        ];
        
        const documentUrlFields = {
            'comprobanteDomicilioInput': 'comprobanteDomicilioUrl',
            'ineInput': 'ineUrl',
            'historiaInput': 'historialAcademicoUrl',
            'curpInput': 'curpUrl',
            'credencialUnamInput': 'credencialUnamUrl',
            'comprobanteInscripcionInput': 'comprobanteInscripcionUrl'
        };
        
        for (const inputId of documentInputs) {
            if (window.tempFiles && window.tempFiles[inputId]) {
                console.log(`📄 Subiendo ${inputId} desde tempFiles:`, window.tempFiles[inputId].name);
                try {
                    const documentUrl = await uploadDocument(window.tempFiles[inputId], numeroCuenta, inputId);
                    const urlField = documentUrlFields[inputId];
                    asesorData[urlField] = documentUrl;
                    console.log(`✅ ${inputId} subido:`, documentUrl);
                    delete window.tempFiles[inputId];
                } catch (error) {
                    console.error(`❌ Error subiendo ${inputId}:`, error);
                    showNotification(`Error subiendo ${getDocumentName(inputId)}: ${error.message}`, 'warning');
                }
            }
        }
        
        console.log('💾 Guardando en Firestore...');
        
        // Guardar en Firebase
        if (editingMode && currentAsesor && currentAsesor.id) {
            const docRef = gestionDB.collection('asesores').doc(currentAsesor.id);
            const docSnap = await docRef.get();
            
            if (docSnap.exists) {
                await docRef.update(asesorData);
                console.log('✅ Asesor actualizado');
                showNotification('Asesor actualizado exitosamente', 'success');
            } else {
                asesorData.fechaRegistro = firebase.firestore.FieldValue.serverTimestamp();
                await gestionDB.collection('asesores').add(asesorData);
                console.log('✅ Asesor creado');
                showNotification('Asesor creado exitosamente', 'success');
            }
        } else {
            asesorData.fechaRegistro = firebase.firestore.FieldValue.serverTimestamp();
            asesorData.registradoPor = gestionAuth.currentUser?.email;
            await gestionDB.collection('asesores').add(asesorData);
            console.log('✅ Asesor creado');
            showNotification('Asesor creado exitosamente', 'success');
        }
        
        // ✅ LIMPIAR ARCHIVOS TEMPORALES AL FINAL
        if (window.tempFiles) {
            window.tempFiles = {};
            console.log('🧹 Archivos temporales limpiados');
        }
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('asesorModal'));
        if (modal) modal.hide();
        
        await loadAsesores();
        await loadEstadisticas();
        
    } catch (error) {
        console.error('❌ Error guardando asesor:', error);
        showNotification('Error al guardar el asesor: ' + error.message, 'error');
    } finally {
        if (saveButton && originalText) {
            saveButton.innerHTML = originalText;
            saveButton.disabled = false;
        }
    }
}

// ✅ FUNCIÓN HELPER PARA RECOPILAR DATOS DEL FORMULARIO
function collectFormData() {
    console.log('📋 Recopilando datos del formulario...');
    
    const getValue = (id) => {
        const element = document.getElementById(id);
        return element ? element.value.trim() : '';
    };
    
    const getChecked = (id) => {
        const element = document.getElementById(id);
        return element ? element.checked : false;
    };
    
    const getNumber = (id) => {
        const value = getValue(id);
        return value ? parseFloat(value) : null;
    };
    
    const getInteger = (id) => {
        const value = getValue(id);
        return value ? parseInt(value) : null;
    };
    
    const data = {
        numeroAsesor: getValue('numeroAsesor'),
        nombreAsesor: getValue('nombreAsesor'),
        curp: getValue('curp'),
        fechaNacimiento: getValue('fechaNacimiento'),
        sexo: getValue('sexo'),
        estadoCivil: getValue('estadoCivil'),
        correoElectronico: getValue('email'),
        telefonoCelular: getValue('telefono'),
        telefonoCasa: getValue('telefonoCasa'),
        emailInstitucional: getValue('emailInstitucional'),
        numeroCuenta: getValue('numeroCuentaAsesor'),
        plantel: getValue('plantelAsesor'),
        carrera: getValue('carreraAsesor'),
        promedio: getNumber('promedioAcademico'),
        semestreCursando: getInteger('semestreCursando'),
        semestreConsecutivo: getInteger('semestreConsecutivo'),
        materiasCursando: getInteger('materiasCursando'),
        metodoInscripcion: getValue('metodoInscripcion'),
        avance: getValue('avanceCarrera'),
        administrador: getValue('administrador'),
        procedencia: getValue('procedencia'),
        locker: getInteger('locker'),
        bloques: getValue('bloques'),
        horasSemana: getInteger('horasSemana') || 8,
        tieneBeca: getValue('tieneBeca'),
        tipoBeca: getValue('tipoBeca'),
        articulo22: getChecked('articulo22'),
        gafete: getChecked('gafete'),
        horarioImpreso: getChecked('horarioImpreso'),
        permanencia: getChecked('permanencia'),
        servicioSocial: getChecked('servicioSocial'),
        motivacion: getValue('motivacion'),
        experiencia: getValue('experiencia'),
        observaciones: getValue('observaciones'),
        estado: getValue('estadoAsesor'),
        tipoRegistro: getValue('tipoRegistro'),
        fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp(),
        actualizadoPor: gestionAuth.currentUser?.email
    };
    
    console.log('📋 Datos recopilados:', data);
    return data;
}

function resetFileInput(inputId) {
    console.log(`🔄 Reseteando input: ${inputId}`);
    
    // ✅ LIMPIAR ARCHIVO TEMPORAL
    if (window.tempFiles && window.tempFiles[inputId]) {
        delete window.tempFiles[inputId];
        console.log(`🗑️ Archivo temporal eliminado para ${inputId}`);
    }
    
    // ✅ RESTAURAR CONTENEDOR ORIGINAL
    const input = document.getElementById(inputId);
    if (!input) return;
    
    const container = input.parentElement;
    if (!container) return;
    
    const docTypeMap = {
        'comprobanteDomicilioInput': { name: 'Subir comprobante de domicilio', icon: 'bi-house' },
        'ineInput': { name: 'Subir documento de identidad', icon: 'bi-person-badge' },
        'historiaInput': { name: 'Subir historia académica', icon: 'bi-file-pdf' },
        'curpInput': { name: 'Subir CURP', icon: 'bi-file-text' },
        'credencialUnamInput': { name: 'Subir credencial UNAM', icon: 'bi-credit-card' },
        'comprobanteInscripcionInput': { name: 'Subir comprobante de inscripción', icon: 'bi-file-earmark-check' }
    };
    
    const docInfo = docTypeMap[inputId] || { name: 'Subir documento', icon: 'bi-file' };
    
    container.innerHTML = `
        <i class="${docInfo.icon}"></i>
        <span>${docInfo.name}</span>
        <input type="file" id="${inputId}" accept="image/*,application/pdf" style="display: none;">
    `;
    
    // ✅ RECONFIGURAR EVENT LISTENER
    setTimeout(() => {
        const newInput = document.getElementById(inputId);
        if (newInput) {
            newInput.addEventListener('change', (e) => handleFileChange(e, inputId));
            console.log(`✅ Event listener reconfigurado para ${inputId}`);
        }
    }, 100);
}

// ✅ FUNCIÓN DE VALIDACIÓN FALTANTE
function validateAllSections() {
    const errors = [];
    
    // Helper para obtener valor de forma segura
    const getValue = (id) => {
        const element = document.getElementById(id);
        return element ? element.value.trim() : '';
    };
    
    // Validar información personal (requerida)
    if (!getValue('numeroAsesor')) {
        errors.push('Número de asesor es requerido');
    }
    if (!getValue('nombreAsesor')) {
        errors.push('Nombre completo es requerido');
    }
    
    // Validar formato de CURP si está presente
    const curp = getValue('curp');
    if (curp && curp.length !== 18) {
        errors.push('CURP debe tener 18 caracteres');
    }
    
    // Validar email si está presente
    const email = getValue('email');
    if (email && !email.includes('@')) {
        errors.push('Email debe tener formato válido');
    }
    
    // Validar promedio si está presente
    const promedio = getValue('promedioAcademico');
    if (promedio && (promedio < 0 || promedio > 10)) {
        errors.push('Promedio debe estar entre 0 y 10');
    }
    
    return errors;
}

// =====================================================================
// SUBIDA DE ARCHIVOS
// =====================================================================

async function uploadFoto(file, numeroCuenta) {
    try {
        console.log(`📸 Subiendo foto para asesor ${numeroCuenta}`);
        
        // Eliminar foto anterior si existe
        await deleteExistingFile(`documentos_asesores/asesor_${numeroCuenta}/foto_asesor`);
        
        const fileName = 'foto_asesor';
        const filePath = `documentos_asesores/asesor_${numeroCuenta}/${fileName}`;
        const ref = gestionStorage.ref(filePath);
        
        const snapshot = await ref.put(file);
        const downloadURL = await snapshot.ref.getDownloadURL();
        
        console.log(`✅ Foto subida exitosamente: ${downloadURL}`);
        return downloadURL;
    } catch (error) {
        console.error('❌ Error subiendo foto:', error);
        throw new Error(`Error subiendo foto: ${error.message}`);
    }
}

async function deleteExistingFile(basePath) {
    try {
        // Buscar archivos con diferentes extensiones
        const extensions = ['', '.jpg', '.jpeg', '.png', '.pdf', '.webp'];
        
        for (const ext of extensions) {
            try {
                const ref = gestionStorage.ref(basePath + ext);
                await ref.delete();
                console.log(`🗑️ Archivo anterior eliminado: ${basePath + ext}`);
                break; // Si se eliminó exitosamente, salir del loop
            } catch (deleteError) {
                // Si el archivo no existe, continuar con la siguiente extensión
                if (deleteError.code !== 'storage/object-not-found') {
                    console.warn(`⚠️ Error eliminando ${basePath + ext}:`, deleteError.message);
                }
            }
        }
    } catch (error) {
        console.warn(`⚠️ Error en deleteExistingFile para ${basePath}:`, error.message);
        // No lanzar error aquí, solo advertir
    }
}

async function uploadDocument(file, numeroCuenta, documentType) {
    try {
        console.log(`📄 Subiendo ${documentType} para asesor ${numeroCuenta}`);
        
        // Mapeo de tipos de documentos a nombres de archivos
        const fileNameMap = {
            'comprobanteDomicilioInput': 'comprobante_domicilio',
            'ineInput': 'ine',
            'historiaInput': 'historial_academico',
            'curpInput': 'curp',
            'credencialUnamInput': 'credencial_unam',
            'comprobanteInscripcionInput': 'comprobante_inscripcion'
        };
        
        const fileName = fileNameMap[documentType];
        if (!fileName) {
            throw new Error(`Tipo de documento no reconocido: ${documentType}`);
        }
        
        // Eliminar documento anterior si existe
        await deleteExistingFile(`documentos_asesores/asesor_${numeroCuenta}/${fileName}`);
        
        const filePath = `documentos_asesores/asesor_${numeroCuenta}/${fileName}`;
        const ref = gestionStorage.ref(filePath);
        
        const snapshot = await ref.put(file);
        const downloadURL = await snapshot.ref.getDownloadURL();
        
        console.log(`✅ ${documentType} subido exitosamente: ${downloadURL}`);
        return downloadURL;
    } catch (error) {
        console.error(`❌ Error subiendo ${documentType}:`, error);
        throw new Error(`Error subiendo ${documentType}: ${error.message}`);
    }
}

// =====================================================================
// PRE-REGISTROS
// =====================================================================

async function openPreRegistros() {
    try {
        console.log('🔍 Cargando pre-registros...');
        
        let snapshot;
        
        try {
            snapshot = await gestionDB.collection('asesores')
                .where('estado', '==', 'pendiente')
                .orderBy('fechaRegistro', 'desc')
                .get();
        } catch (error) {
            console.log('⚠️ No se puede buscar por estado, intentando por tipoRegistro...');
            snapshot = await gestionDB.collection('asesores')
                .where('tipoRegistro', '==', 'publico')
                .orderBy('fechaRegistro', 'desc')
                .get();
        }
        
        const preRegistros = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            
            const esPendiente = data.estado === 'pendiente' || 
                              (data.tipoRegistro === 'publico' && !data.numeroAsesor);
            
            if (esPendiente) {
                preRegistros.push({
                    id: doc.id,
                    firebaseId: doc.id,
                    ...data
                });
                
                console.log('📋 Pre-registro:', {
                    firebaseId: doc.id,
                    campoInternoId: data.id,
                    nombre: data.nombre || data.nombreAsesor
                });
            }
        });
        
        console.log(`✅ Total pre-registros encontrados: ${preRegistros.length}`);
        
        renderPreRegistros(preRegistros);
        
        const modal = new bootstrap.Modal(document.getElementById('preRegistrosModal'));
        modal.show();
        
    } catch (error) {
        console.error('❌ Error cargando pre-registros:', error);
        showNotification('Error al cargar pre-registros', 'error');
    }
}

function renderPreRegistros(preRegistros) {
    const container = document.getElementById('preRegistrosList');
    if (!container) return;
    
    if (preRegistros.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="bi bi-inbox"></i>
                </div>
                <h5>No hay pre-registros pendientes</h5>
                <p>Todos los registros han sido procesados</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = preRegistros.map(preRegistro => {
        const firebaseId = preRegistro.id;
        
        console.log('🔄 Renderizando:', {
            firebaseId: firebaseId,
            nombre: getNombreCompleto(preRegistro)
        });
        
        return `
            <div class="preregistro-item">
                <div class="preregistro-info">
                    <h6>${getNombreCompleto(preRegistro)}</h6>
                    <p>
                        <strong>Email:</strong> ${preRegistro.correoElectronico || 'No disponible'}<br>
                        <strong>Carrera:</strong> ${preRegistro.carrera || 'No especificada'}<br>
                        <strong>Promedio:</strong> ${preRegistro.promedio || 'N/A'}<br>
                        <strong>Fecha:</strong> ${formatDate(preRegistro.fechaRegistro)}
                    </p>
                </div>
                <div class="preregistro-actions">
                    <button class="btn btn-sm btn-success" onclick="completarRegistro('${firebaseId}')">
                        <i class="bi bi-check"></i> Completar
                    </button>
                    <button class="btn btn-sm btn-info" onclick="verDetalles('${firebaseId}')">
                        <i class="bi bi-eye"></i> Ver
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="rechazarRegistro('${firebaseId}')">
                        <i class="bi bi-x"></i> Rechazar
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

async function completarRegistro(preRegistroId) {
    try {
        // Obtener el pre-registro
        const doc = await gestionDB.collection('asesores').doc(preRegistroId).get();
        
        if (!doc.exists) {
            showNotification('El registro no existe', 'error');
            return;
        }
        
        // Cerrar modal de pre-registros primero
        const preRegistrosModal = bootstrap.Modal.getInstance(document.getElementById('preRegistrosModal'));
        if (preRegistrosModal) {
            preRegistrosModal.hide();
        }
        
        // Esperar a que se cierre completamente
        setTimeout(async () => {
            try {
                // Cambiar estado a aprobado directamente
                const nuevoNumero = generateNumeroAsesor();
                await gestionDB.collection('asesores').doc(preRegistroId).update({
                    estado: 'aprobado',
                    numeroAsesor: nuevoNumero,
                    fechaAprobacion: firebase.firestore.FieldValue.serverTimestamp(),
                    aprobadoPor: gestionAuth.currentUser?.email
                });
                
                showNotification('Registro aprobado exitosamente', 'success');
                
                // Recargar datos
                await loadAsesores();
                await loadEstadisticas();
                
            } catch (error) {
                console.error('Error completando registro:', error);
                showNotification('Error al completar el registro', 'error');
            }
        }, 500);
        
    } catch (error) {
        console.error('Error completando registro:', error);
        showNotification('Error al completar el registro', 'error');
    }
}

async function verDetalles(preRegistroId) {
    try {
        console.log('🔍 Buscando registro con ID:', preRegistroId);
        
        const docRef = gestionDB.collection('asesores').doc(preRegistroId);
        const doc = await docRef.get();
        
        console.log('📄 Documento existe:', doc.exists);
        
        if (!doc.exists) {
            console.error('❌ Documento no encontrado:', preRegistroId);
            showNotification('El registro no existe o fue eliminado', 'error');
            return;
        }
        
        const preRegistro = doc.data();
        console.log('📋 Datos del registro:', preRegistro);
        
        if (!preRegistro) {
            showNotification('Error: No se pudieron cargar los datos del registro', 'error');
            return;
        }
        
        const detalles = `
            <div class="detalles-preregistro" style="background: rgba(0, 63, 127, 0.1); padding: 1.5rem; border-radius: 10px; color: var(--unam-blue);">
                <h5 style="color: var(--unam-blue); margin-bottom: 1rem;">Información Completa</h5>
                <div class="row g-3">
                    <div class="col-md-6">
                        <strong>Nombre:</strong> ${getNombreCompleto(preRegistro)}
                    </div>
                    <div class="col-md-6">
                        <strong>CURP:</strong> ${preRegistro.curp || 'No disponible'}
                    </div>
                    <div class="col-md-6">
                        <strong>Email:</strong> ${preRegistro.correoElectronico || 'No disponible'}
                    </div>
                    <div class="col-md-6">
                        <strong>Teléfono:</strong> ${preRegistro.telefonoCelular || 'No disponible'}
                    </div>
                    <div class="col-md-6">
                        <strong>Carrera:</strong> ${preRegistro.carrera || 'No especificada'}
                    </div>
                    <div class="col-md-6">
                        <strong>Promedio:</strong> ${preRegistro.promedio || 'N/A'}
                    </div>
                    <div class="col-md-6">
                        <strong>Plantel:</strong> ${preRegistro.plantel || 'No especificado'}
                    </div>
                    <div class="col-md-6">
                        <strong>Número de Cuenta:</strong> ${preRegistro.numeroCuenta || 'No disponible'}
                    </div>
                    <div class="col-md-6">
                        <strong>Estado:</strong> ${preRegistro.estado || 'Pendiente'}
                    </div>
                    <div class="col-md-6">
                        <strong>Fecha de Registro:</strong> ${formatDate(preRegistro.fechaRegistro)}
                    </div>
                    <div class="col-md-6">
                        <strong>ID del Registro:</strong> ${preRegistroId}
                    </div>
                    ${preRegistro.motivacion ? `
                        <div class="col-12">
                            <strong>Motivación:</strong><br>
                            <em style="color: black;">${preRegistro.motivacion}</em>
                        </div>
                    ` : ''}
                    ${preRegistro.experiencia ? `
                        <div class="col-12">
                            <strong>Experiencia:</strong><br>
                            <em style="color: black;">${preRegistro.experiencia}</em>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        showDetallesModal(detalles);
        
    } catch (error) {
        console.error('❌ Error completo viendo detalles:', error);
        showNotification(`Error al cargar los detalles: ${error.message}`, 'error');
    }
}

async function rechazarRegistro(preRegistroId) {
    if (!confirm('¿Está seguro de que desea rechazar este registro? Esta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        await gestionDB.collection('asesores').doc(preRegistroId).delete();
        showNotification('Registro rechazado exitosamente', 'success');
        
        // Recargar pre-registros
        openPreRegistros();
        
    } catch (error) {
        console.error('Error rechazando registro:', error);
        showNotification('Error al rechazar el registro', 'error');
    }
}

function showDetallesModal(contenido) {
    const modalHtml = `
        <div class="modal fade" id="detallesModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="bi bi-eye me-2"></i>
                            Detalles del Registro
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        ${contenido}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remover modal anterior si existe
    const existingModal = document.getElementById('detallesModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Agregar nuevo modal
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('detallesModal'));
    modal.show();
}

// ✅ NUEVA FUNCIÓN SIN window.open PARA ABRIR DOCUMENTOS
function abrirDocumento(url) {
    // Crear un enlace temporal y hacer clic en él
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    
    // Agregar al DOM temporalmente
    document.body.appendChild(link);
    
    // Hacer clic y remover
    link.click();
    document.body.removeChild(link);
}

function cambiarDocumento(inputId) {
    console.log(`🔄 Cambiando documento: ${inputId}`);
    const input = document.getElementById(inputId);
    if (input) {
        input.click();
        console.log(`✅ Click activado en ${inputId}`);
    } else {
        console.error(`❌ No se encontró el input: ${inputId}`);
    }
}

// =====================================================================
// FUNCIONES AUXILIARES Y UTILIDADES
// =====================================================================

function createAdditionalField(id, label, value) {
    // Esta función podría crear campos adicionales si no existen en el modal
    console.log(`Campo adicional: ${label} = ${value}`);
    return null;
}

function validateSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return true;
    
    const requiredFields = section.querySelectorAll('input[required], select[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            isValid = false;
        }
    });
    
    return isValid;
}

function updateAccordionIndicators() {
    const sections = [
        'collapsePersonal',
        'collapseContacto', 
        'collapseAcademico',
        'collapseAdmin',
        'collapseHoras',
        'collapseFinanciero',
        'collapseDocumentos',
        'collapseObservaciones',
        'collapseMetadatos'
    ];
    
    sections.forEach(sectionId => {
        const isValid = validateSection(sectionId);
        const button = document.querySelector(`[data-bs-target="#${sectionId}"]`);
        
        if (button) {
            // Remover clases anteriores
            button.classList.remove('completed', 'incomplete', 'error');
            
            // Agregar clase según validación
            if (isValid) {
                button.classList.add('completed');
            } else {
                button.classList.add('incomplete');
            }
        }
    });
}

function openAccordionSection(sectionId) {
    const targetElement = document.getElementById(sectionId);
    if (targetElement) {
        new bootstrap.Collapse(targetElement, {
            show: true
        });
    }
}

// Event listener para actualizar indicadores cuando cambien los campos
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('asesorModal');
    if (modal) {
        modal.addEventListener('input', updateAccordionIndicators);
        modal.addEventListener('change', updateAccordionIndicators);
    }
});

// =====================================================================
// ESTADÍSTICAS (CORREGIDA - SIN DUPLICACIÓN)
// =====================================================================

async function loadEstadisticas() {
    try {
        // ✅ CARGAR TODOS LOS ASESORES PARA ESTADÍSTICAS
        const allSnapshot = await gestionDB.collection('asesores').get();
        const todosLosAsesores = [];
        allSnapshot.forEach(doc => {
            todosLosAsesores.push({ id: doc.id, ...doc.data() });
        });
        
        const totalAsesores = asesoresList.length; // Solo aprobados
        const pendientesAsesores = todosLosAsesores.filter(a => a.estado === 'pendiente').length;
        
        const totalAsesoresElement = document.getElementById('totalAsesores');
        const totalPendientesElement = document.getElementById('totalPendientes');
        
        if (totalAsesoresElement) {
            totalAsesoresElement.textContent = totalAsesores;
        }
        if (totalPendientesElement) {
            totalPendientesElement.textContent = pendientesAsesores;
        }
        
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

// =====================================================================
// UTILIDADES
// =====================================================================

function generateNumeroAsesor() {
    // Generar número de asesor basado en año y contador
    const year = new Date().getFullYear().toString().slice(-2);
    const existingNumbers = asesoresList
        .map(a => a.numeroAsesor)
        .filter(n => n && n.startsWith(year))
        .map(n => parseInt(n.slice(2)))
        .filter(n => !isNaN(n));
    
    const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
    return `${year}${nextNumber.toString().padStart(3, '0')}`;
}

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
// SCROLL ANIMATIONS
// =====================================================================

// Intersection Observer para animaciones al hacer scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, observerOptions);

// Observar todas las tarjetas cuando se creen
function observeAsesorCards() {
    const cards = document.querySelectorAll('.asesor-card');
    cards.forEach(card => observer.observe(card));
}

// =====================================================================
// EXPORTAR FUNCIONES GLOBALES PARA COMPATIBILIDAD CON HTML
// =====================================================================

// Exportar funciones globales
// ✅ EXPORTACIONES ACTUALIZADAS
window.openEstadisticas = openEstadisticas;
window.openNuevoAsesor = openNuevoAsesor;
window.openPreRegistros = openPreRegistros;
window.completarRegistro = completarRegistro;
window.verDetalles = verDetalles;
window.rechazarRegistro = rechazarRegistro;
window.fillAsesorForm = fillAsesorForm;
window.toggleTipoBeca = toggleTipoBeca;
window.handleFileChange = handleFileChange;
window.guardarAsesorCompleto = guardarAsesorCompleto;
window.abrirDocumento = abrirDocumento;
window.cambiarDocumento = cambiarDocumento;
window.resetFileInput = resetFileInput; // ✅ NUEVA
window.uploadFoto = uploadFoto;
window.uploadDocument = uploadDocument;
window.deleteExistingFile = deleteExistingFile;
window.handleFotoPreview = handleFotoPreview;
window.handleDocumentPreview = handleDocumentPreview;
window.getDocumentName = getDocumentName;