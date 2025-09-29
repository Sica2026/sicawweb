// Solo verifica si hay usuario autenticado con Firebase
firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = '../login.html';
        return;
    }
    
    // Esperar a que las funciones estén disponibles
    if (typeof setupGestionMaterias === 'function') {
        await setupGestionMaterias();
    } else {
        // Esperar un poco más si la función no está disponible
        setTimeout(async () => {
            if (typeof setupGestionMaterias === 'function') {
                await setupGestionMaterias();
            }
        }, 500);
    }
});

/**
 * Gestión de Materias - Interfaz de Usuario
 * Manejo de la interfaz y eventos de usuario
 */

// Variables globales de UI
let currentSection = null;
let searchTimeout = null;
let materiasCache = [];

/**
 * Configuración principal de la página
 */
async function setupGestionMaterias() {
    try {
        // Configurar título y breadcrumbs
        if (typeof SICAComponents !== 'undefined') {
            SICAComponents.setPageTitle('Gestión de Materias - SICA');
        }

        // Inicializar eventos
        setupEventListeners();
        
        // Cargar estadísticas (esperamos a que la función esté disponible)
        setTimeout(async () => {
            if (typeof loadMateriasStats === 'function') {
                await loadMateriasStats();
            }
        }, 500);
        
        // Agregar animaciones
        addPageAnimations();
        
        console.log('Gestión de Materias inicializada correctamente');
    } catch (error) {
        console.error('Error configurando página:', error);
        throw error;
    }
}

/**
 * Configurar event listeners
 */
function setupEventListeners() {
    // Event listeners para las tarjetas de acción
    document.querySelectorAll('.action-card').forEach(card => {
        card.addEventListener('click', () => {
            const action = card.dataset.action;
            selectAction(action);
        });
    });

    // Event listener para el formulario manual
    const manualForm = document.getElementById('manual-form');
    if (manualForm) {
        manualForm.addEventListener('submit', handleManualSubmit);
    }

    // Event listeners para los campos de entrada (convertir a mayúsculas)
    const claveInput = document.getElementById('clave-materia');
    const nombreInput = document.getElementById('nombre-materia');
    
    if (claveInput) {
        claveInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
            validateField(e.target);
        });
    }
    
    if (nombreInput) {
        nombreInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
            validateField(e.target);
        });
    }

    // Event listener para búsqueda
    const searchInput = document.getElementById('search-materias');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }

    // Event listeners para modales
    setupModalListeners();

    // Event listeners para upload de archivos
    setupUploadListeners();
}

/**
 * Seleccionar acción principal
 */
function selectAction(action) {
    // Remover clases activas
    document.querySelectorAll('.action-card').forEach(card => {
        card.classList.remove('active');
    });

    // Ocultar todas las secciones
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });

    // Activar tarjeta seleccionada
    document.querySelector(`[data-action="${action}"]`).classList.add('active');

    // Mostrar sección correspondiente
    const sectionId = `${action}-section`;
    const section = document.getElementById(sectionId);
    
    if (section) {
        section.style.display = 'block';
        section.classList.add('fade-in-up');
        currentSection = action;

        // Acciones específicas según la sección
        switch (action) {
            case 'manual':
                focusFirstInput();
                break;
            case 'excel':
                resetUploadZone();
                break;
            case 'manage':
                loadMateriasList();
                break;
        }
    }
}

/**
 * Ocultar sección
 */
function hideSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.style.display = 'none';
    }

    // Remover clases activas
    document.querySelectorAll('.action-card').forEach(card => {
        card.classList.remove('active');
    });

    currentSection = null;
}

/**
 * Enfocar primer input
 */
function focusFirstInput() {
    setTimeout(() => {
        const firstInput = document.getElementById('clave-materia');
        if (firstInput) {
            firstInput.focus();
        }
    }, 300);
}

/**
 * Manejar envío del formulario manual
 */
async function handleManualSubmit(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    try {
        // Deshabilitar botón y mostrar loading
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <div class="spinner-border spinner-border-sm me-2" role="status">
                <span class="visually-hidden">Cargando...</span>
            </div>
            Agregando...
        `;

        // Obtener datos del formulario
        const clave = document.getElementById('clave-materia').value.trim().toUpperCase();
        const nombre = document.getElementById('nombre-materia').value.trim().toUpperCase();

        // Validar datos
        if (!clave || !nombre) {
            throw new Error('Todos los campos son requeridos');
        }

        // Validar longitud
        if (clave.length < 1) {
            throw new Error('La clave es requerida');
        }

        if (nombre.length < 5) {
            throw new Error('El nombre debe tener al menos 5 caracteres');
        }

        // Agregar materia
        await addMateria(clave, nombre);
        
        // Limpiar formulario
        document.getElementById('manual-form').reset();
        
        // Mostrar mensaje de éxito
        showSuccessMessage('Materia agregada correctamente');
        
        // Actualizar estadísticas
        await loadMateriasStats();

    } catch (error) {
        console.error('Error agregando materia:', error);
        showErrorMessage(error.message);
    } finally {
        // Restaurar botón
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

/**
 * Validar campo individual
 */
function validateField(field) {
    const value = field.value.trim();
    const fieldName = field.id;
    
    // Remover clases de validación previas
    field.classList.remove('is-valid', 'is-invalid');
    
    // Remover mensajes de error previos
    const feedback = field.parentNode.querySelector('.invalid-feedback');
    if (feedback) {
        feedback.textContent = '';
    }

    // Validaciones específicas
    let isValid = true;
    let errorMessage = '';

    if (!value) {
        isValid = false;
        errorMessage = 'Este campo es requerido';
    } else if (fieldName === 'clave-materia') {
        if (value.length < 1) {
            isValid = false;
            errorMessage = 'La clave es requerida';
        } else if (!/^[A-Z0-9]+$/.test(value)) {
            isValid = false;
            errorMessage = 'Solo se permiten letras mayúsculas y números';
        }
    } else if (fieldName === 'nombre-materia') {
        if (value.length < 5) {
            isValid = false;
            errorMessage = 'El nombre debe tener al menos 5 caracteres';
        }
    }

    // Aplicar clases de validación
    if (isValid) {
        field.classList.add('is-valid');
    } else {
        field.classList.add('is-invalid');
        if (feedback) {
            feedback.textContent = errorMessage;
        }
    }

    return isValid;
}

/**
 * Manejar búsqueda de materias
 */
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    // Limpiar timeout anterior
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }

    // Debounce la búsqueda
    searchTimeout = setTimeout(() => {
        filterMaterias(searchTerm);
    }, 300);
}

/**
 * Filtrar materias en la tabla
 */
function filterMaterias(searchTerm) {
    const tbody = document.getElementById('materias-tbody');
    const rows = tbody.querySelectorAll('tr');

    let visibleCount = 0;

    rows.forEach(row => {
        const clave = row.cells[0].textContent.toLowerCase();
        const nombre = row.cells[1].textContent.toLowerCase();
        
        const matches = clave.includes(searchTerm) || nombre.includes(searchTerm);
        
        if (matches || searchTerm === '') {
            row.style.display = '';
            visibleCount++;
            
            // Efecto de highlight
            if (searchTerm !== '') {
                highlightText(row.cells[0], searchTerm);
                highlightText(row.cells[1], searchTerm);
            } else {
                removeHighlight(row.cells[0]);
                removeHighlight(row.cells[1]);
            }
        } else {
            row.style.display = 'none';
        }
    });

    // Mostrar/ocultar empty state
    const emptyState = document.getElementById('empty-state');
    if (visibleCount === 0 && searchTerm !== '') {
        emptyState.style.display = 'block';
        emptyState.innerHTML = `
            <i class="bi bi-search empty-icon"></i>
            <h4>No se encontraron resultados</h4>
            <p>Intenta con otro término de búsqueda</p>
        `;
    } else if (visibleCount === 0) {
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
    }
}

/**
 * Resaltar texto en búsqueda
 */
function highlightText(cell, searchTerm) {
    const originalText = cell.dataset.originalText || cell.textContent;
    cell.dataset.originalText = originalText;
    
    if (searchTerm) {
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        const highlightedText = originalText.replace(regex, '<mark class="search-highlight">$1</mark>');
        cell.innerHTML = highlightedText;
    }
}

/**
 * Remover resaltado de texto
 */
function removeHighlight(cell) {
    if (cell.dataset.originalText) {
        cell.textContent = cell.dataset.originalText;
        delete cell.dataset.originalText;
    }
}

/**
 * Configurar listeners de modales
 */
function setupModalListeners() {
    // Modal de edición
    const editModal = document.getElementById('editModal');
    const editForm = document.getElementById('edit-form');
    
    if (editForm) {
        editForm.addEventListener('submit', handleEditSubmit);
    }

    // Modal de eliminación
    const confirmDeleteBtn = document.getElementById('confirm-delete');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', handleDelete);
    }

    // Convertir a mayúsculas en modal de edición
    const editClave = document.getElementById('edit-clave');
    const editNombre = document.getElementById('edit-nombre');
    
    if (editClave) {
        editClave.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });
    }
    
    if (editNombre) {
        editNombre.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });
    }
}

/**
 * Manejar envío del formulario de edición
 */
async function handleEditSubmit(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    try {
        // Deshabilitar botón y mostrar loading
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <div class="spinner-border spinner-border-sm me-2" role="status">
                <span class="visually-hidden">Cargando...</span>
            </div>
            Guardando...
        `;

        // Obtener datos del formulario
        const materiaId = document.getElementById('edit-materia-id').value;
        const clave = document.getElementById('edit-clave').value.trim().toUpperCase();
        const nombre = document.getElementById('edit-nombre').value.trim().toUpperCase();

        // Validar datos
        if (!clave || !nombre) {
            throw new Error('Todos los campos son requeridos');
        }

        // Actualizar materia
        await updateMateria(materiaId, clave, nombre);
        
        // Cerrar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editModal'));
        modal.hide();
        
        // Recargar lista
        await loadMateriasList();
        
        // Mostrar mensaje de éxito
        showSuccessMessage('Materia actualizada correctamente');

    } catch (error) {
        console.error('Error actualizando materia:', error);
        showErrorMessage(error.message);
    } finally {
        // Restaurar botón
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

/**
 * Manejar eliminación de materia
 */
async function handleDelete() {
    const deleteBtn = document.getElementById('confirm-delete');
    const materiaId = deleteBtn.dataset.materiaId;
    const originalText = deleteBtn.innerHTML;
    
    try {
        // Deshabilitar botón y mostrar loading
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = `
            <div class="spinner-border spinner-border-sm me-2" role="status">
                <span class="visually-hidden">Cargando...</span>
            </div>
            Eliminando...
        `;

        // Eliminar materia
        await deleteMateria(materiaId);
        
        // Cerrar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
        modal.hide();
        
        // Recargar lista
        await loadMateriasList();
        
        // Actualizar estadísticas
        await loadMateriasStats();
        
        // Mostrar mensaje de éxito
        showSuccessMessage('Materia eliminada correctamente');

    } catch (error) {
        console.error('Error eliminando materia:', error);
        showErrorMessage(error.message);
    } finally {
        // Restaurar botón
        deleteBtn.disabled = false;
        deleteBtn.innerHTML = originalText;
    }
}

/**
 * Abrir modal de edición
 */
function openEditModal(materiaId, clave, nombre) {
    // Llenar formulario
    document.getElementById('edit-materia-id').value = materiaId;
    document.getElementById('edit-clave').value = clave;
    document.getElementById('edit-nombre').value = nombre;
    
    // Abrir modal
    const modal = new bootstrap.Modal(document.getElementById('editModal'));
    modal.show();
}

/**
 * Abrir modal de eliminación
 */
function openDeleteModal(materiaId, clave, nombre) {
    // Configurar información
    document.getElementById('delete-materia-info').textContent = `${clave} - ${nombre}`;
    document.getElementById('confirm-delete').dataset.materiaId = materiaId;
    
    // Abrir modal
    const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
    modal.show();
}

/**
 * Configurar listeners de upload
 */
function setupUploadListeners() {
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('excel-file');
    const processBtn = document.getElementById('process-excel');

    if (uploadZone && fileInput) {
        // Click en zona de upload
        uploadZone.addEventListener('click', () => {
            fileInput.click();
        });

        // Drag and drop
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('drag-over');
        });

        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('drag-over');
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('drag-over');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFileSelect(files[0]);
            }
        });

        // Selección de archivo
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFileSelect(e.target.files[0]);
            }
        });
    }

    // Botón de procesar
    if (processBtn) {
        processBtn.addEventListener('click', processExcelFile);
    }
}

/**
 * Manejar selección de archivo
 */
function handleFileSelect(file) {
    // Validar tipo de archivo
    const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
    ];
    
    if (!validTypes.includes(file.type)) {
        showErrorMessage('Por favor selecciona un archivo Excel válido (.xlsx o .xls)');
        return;
    }

    // Validar tamaño (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
        showErrorMessage('El archivo es demasiado grande. Máximo 10MB permitidos');
        return;
    }

    // Actualizar UI
    const uploadZone = document.getElementById('upload-zone');
    const processBtn = document.getElementById('process-excel');
    
    uploadZone.querySelector('.upload-content').innerHTML = `
        <i class="bi bi-file-earmark-excel-fill upload-file-icon" style="color: var(--unam-gold);"></i>
        <h4 class="upload-text" style="color: var(--unam-blue);">Archivo seleccionado</h4>
        <p class="upload-hint">${file.name}</p>
        <small class="text-muted">${formatFileSize(file.size)}</small>
    `;

    // Habilitar botón de procesar
    processBtn.disabled = false;
    processBtn.classList.add('pulse');
    
    // Guardar archivo para procesamiento
    uploadZone.dataset.selectedFile = file.name;
    window.selectedExcelFile = file;
}

/**
 * Resetear zona de upload
 */
function resetUploadZone() {
    const uploadZone = document.getElementById('upload-zone');
    const processBtn = document.getElementById('process-excel');
    const fileInput = document.getElementById('excel-file');
    
    // Verificar que los elementos existan antes de manipularlos
    if (uploadZone) {
        const uploadContent = uploadZone.querySelector('.upload-content');
        if (uploadContent) {
            uploadContent.innerHTML = `
                <i class="bi bi-file-earmark-excel upload-file-icon"></i>
                <h4 class="upload-text">Arrastra tu archivo Excel aquí</h4>
                <p class="upload-hint">o haz clic para seleccionar</p>
            `;
        }
        
        delete uploadZone.dataset.selectedFile;
    }
    
    if (processBtn) {
        processBtn.disabled = true;
        processBtn.classList.remove('pulse');
    }
    
    if (fileInput) {
        fileInput.value = '';
    }
    
    delete window.selectedExcelFile;
}

/**
 * Formatear tamaño de archivo
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Agregar animaciones a la página
 */
function addPageAnimations() {
    // Animación de entrada para las tarjetas de acción
    const actionCards = document.querySelectorAll('.action-card');
    actionCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
        card.classList.add('fade-in-up');
    });

    // Animación de entrada para el header
    const header = document.querySelector('.materias-header');
    if (header) {
        header.classList.add('fade-in-up');
    }

    // Efecto hover mejorado para botones
    document.querySelectorAll('.btn-sica').forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'translateY(-2px)';
        });
        
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'translateY(0)';
        });
    });
}

/**
 * Mostrar mensaje de éxito
 */
function showSuccessMessage(message) {
    if (typeof SICAComponents !== 'undefined') {
        SICAComponents.notify(
            'Éxito',
            message,
            'success',
            'bi-check-circle'
        );
    } else {
        // Fallback
        console.log('Éxito:', message);
    }
}

/**
 * Mostrar mensaje de error
 */
function showErrorMessage(message) {
    if (typeof SICAComponents !== 'undefined') {
        SICAComponents.notify(
            'Error',
            message,
            'error',
            'bi-exclamation-triangle'
        );
    } else {
        // Fallback
        console.error('Error:', message);
    }
}

/**
 * Mostrar mensaje de información
 */
function showInfoMessage(title, message) {
    if (typeof SICAComponents !== 'undefined') {
        SICAComponents.notify(
            title,
            message,
            'info',
            'bi-info-circle'
        );
    } else {
        // Fallback
        console.info(title + ':', message);
    }
}

/**
 * Mostrar mensaje de advertencia
 */
function showWarningMessage(message) {
    if (typeof SICAComponents !== 'undefined') {
        SICAComponents.notify(
            'Advertencia',
            message,
            'warning',
            'bi-exclamation-triangle'
        );
    } else {
        // Fallback
        console.warn('Advertencia:', message);
    }
}

/**
 * Exportar funciones globales
 */
window.setupGestionMaterias = setupGestionMaterias;
window.selectAction = selectAction;
window.hideSection = hideSection;
window.openEditModal = openEditModal;
window.openDeleteModal = openDeleteModal;