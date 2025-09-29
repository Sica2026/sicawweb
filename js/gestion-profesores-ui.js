/**
 * GESTIÓN DE PROFESORES - UI FUNCTIONS
 * Funciones para manejo de interfaz de usuario
 */

// Función de utilidad para mostrar notificaciones
function showNotification(title, message, type = 'info', icon = 'bi-info-circle') {
    if (window.UtilityHelper) {
        window.UtilityHelper.showNotification(title, message, type, icon);
    } else if (window.SICAComponents && window.SICAComponents.notify) {
        window.SICAComponents.notify(title, message, type, icon);
    } else {
        alert(`${title}: ${message}`);
    }
}

// Función de utilidad para botones loading
function setButtonLoading(button, isLoading) {
    if (window.UtilityHelper) {
        window.UtilityHelper.setButtonLoading(button, isLoading);
    } else {
        if (isLoading) {
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }
}

/**
 * CONTROL DE FORMULARIOS
 */

// Mostrar formulario manual
function showManualForm() {
    hideAllForms();
    document.getElementById('manual-form').style.display = 'block';
    document.getElementById('nombreProfesor').focus();
    
    // Animar entrada
    setTimeout(() => {
        document.getElementById('manual-form').classList.add('show');
    }, 100);
}

// Mostrar formulario Excel
function showExcelForm() {
    hideAllForms();
    document.getElementById('excel-form').style.display = 'block';
    
    // Animar entrada
    setTimeout(() => {
        document.getElementById('excel-form').classList.add('show');
    }, 100);
}

// Mostrar formulario de gestión
function showManageForm() {
    hideAllForms();
    document.getElementById('manage-form').style.display = 'block';
    loadProfessorsTable();
    
    // Animar entrada
    setTimeout(() => {
        document.getElementById('manage-form').classList.add('show');
    }, 100);
}

// Ocultar todos los formularios
function hideAllForms() {
    const forms = document.querySelectorAll('.form-container');
    forms.forEach(form => {
        form.style.display = 'none';
        form.classList.remove('show');
    });
    
    // Limpiar formularios
    clearAllForms();
}

// Limpiar todos los formularios
function clearAllForms() {
    // Limpiar formulario manual
    const manualForm = document.getElementById('profesorForm');
    if (manualForm) {
        manualForm.reset();
        ValidationHelper.clearFormErrors(manualForm);
        resetPhotoPreview('photoPreview', 'previewImg');
    }
    
    // Limpiar formulario Excel
    const excelForm = document.getElementById('excelForm');
    if (excelForm) {
        excelForm.reset();
        ValidationHelper.clearFormErrors(excelForm);
        removeFile();
    }
    
    // Limpiar búsqueda
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
        AppState.searchTerm = '';
    }
}

/**
 * MANEJO DE FOTOS
 */

// Configurar preview de foto
function setupPhotoPreview(previewId, imgId, inputId) {
    const preview = document.getElementById(previewId);
    const img = document.getElementById(imgId);
    const input = document.getElementById(inputId);
    
    if (!preview || !img || !input) return;
    
    // Click en preview abre selector de archivo
    preview.addEventListener('click', () => {
        input.click();
    });
    
    // Cambio en input actualiza preview
    input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
}

// Resetear preview de foto
function resetPhotoPreview(previewId, imgId) {
    const img = document.getElementById(imgId);
    if (img) {
        img.src = '../image/default-avatar.png';
    }
}

/**
 * MANEJO DE EXCEL
 */

// Configurar zona de drag & drop para Excel
function setupExcelDropZone() {
    const dropZone = document.getElementById('excelDropZone');
    const fileInput = document.getElementById('excelInput');
    const fileInfo = document.getElementById('fileInfo');
    const uploadContent = dropZone.querySelector('.upload-content');
    
    // Click en zona abre selector
    dropZone.addEventListener('click', (e) => {
        if (e.target.closest('.btn')) return;
        fileInput.click();
    });
    
    // Drag & Drop events
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    
    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            handleFileSelection(files[0]);
        }
    });
    
    // Input change event
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelection(e.target.files[0]);
        }
    });
    
    function handleFileSelection(file) {
        const errors = ValidationHelper.validateExcelFile(file);
        
        if (errors.length > 0) {
            UtilityHelper.showNotification(
                'Archivo inválido',
                errors.join(', '),
                'error',
                'bi-exclamation-triangle'
            );
            removeFile();
            return;
        }
        
        // Mostrar información del archivo
        document.getElementById('fileName').textContent = file.name;
        uploadContent.style.display = 'none';
        fileInfo.style.display = 'flex';
        
        // Habilitar botón de submit
        document.getElementById('excelSubmitBtn').disabled = false;
    }
}

// Remover archivo seleccionado
function removeFile() {
    const fileInput = document.getElementById('excelInput');
    const fileInfo = document.getElementById('fileInfo');
    const uploadContent = document.querySelector('.upload-content');
    const submitBtn = document.getElementById('excelSubmitBtn');
    
    if (fileInput) fileInput.value = '';
    if (fileInfo) fileInfo.style.display = 'none';
    if (uploadContent) uploadContent.style.display = 'block';
    if (submitBtn) submitBtn.disabled = true;
}

/**
 * TABLA DE PROFESORES
 */

// Cargar tabla de profesores
async function loadProfessorsTable() {
    const tableBody = document.getElementById('professorsTableBody');
    const loadingDiv = document.getElementById('loadingTable');
    const table = document.getElementById('professorsTable');
    const emptyState = document.getElementById('emptyState');
    const totalCount = document.getElementById('totalCount');
    
    try {
        // Mostrar loading
        loadingDiv.style.display = 'block';
        table.style.display = 'none';
        emptyState.style.display = 'none';
        
        // Cargar profesores
        AppState.currentProfessors = await ProfessorsService.getAllProfessors();
        AppState.filteredProfessors = [...AppState.currentProfessors];
        
        // Actualizar contador
        updateProfessorsCount();
        
        // Renderizar tabla
        renderProfessorsTable();
        
    } catch (error) {
        console.error('Error al cargar profesores:', error);
        showNotification(
            'Error',
            'No se pudieron cargar los profesores',
            'error',
            'bi-exclamation-triangle'
        );
        
        loadingDiv.style.display = 'none';
        emptyState.style.display = 'block';
    }
}

// Renderizar tabla de profesores
function renderProfessorsTable() {
    const tableBody = document.getElementById('professorsTableBody');
    const loadingDiv = document.getElementById('loadingTable');
    const table = document.getElementById('professorsTable');
    const emptyState = document.getElementById('emptyState');
    
    loadingDiv.style.display = 'none';
    
    if (AppState.filteredProfessors.length === 0) {
        table.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    // Construir HTML de la tabla
    tableBody.innerHTML = AppState.filteredProfessors.map(professor => `
        <tr data-professor-id="${professor.id}">
            <td>
                <img src="${professor.foto || '../image/default-avatar.png'}" 
                     alt="${professor.nombre}" 
                     class="professor-photo"
                     onerror="this.src='../image/default-avatar.png'">
            </td>
            <td>
                <div class="professor-name">${professor.nombre}</div>
            </td>
            <td>
                <button type="button" class="btn btn-edit btn-sm" 
                        onclick="editProfessor('${professor.id}')">
                    <i class="bi bi-pencil me-1"></i>Editar
                </button>
                <button type="button" class="btn btn-delete btn-sm" 
                        onclick="deleteProfessor('${professor.id}', '${professor.nombre}')">
                    <i class="bi bi-trash me-1"></i>Eliminar
                </button>
            </td>
        </tr>
    `).join('');
    
    table.style.display = 'table';
    emptyState.style.display = 'none';
}

// Actualizar contador de profesores
function updateProfessorsCount() {
    const totalCount = document.getElementById('totalCount');
    if (totalCount) {
        const count = AppState.filteredProfessors.length;
        totalCount.textContent = `${count} profesor${count !== 1 ? 'es' : ''}`;
    }
}

// Configurar búsqueda de profesores
function setupProfessorsSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    const debouncedSearch = UtilityHelper.debounce((searchTerm) => {
        AppState.searchTerm = searchTerm;
        AppState.filteredProfessors = UtilityHelper.filterProfessors(
            AppState.currentProfessors, 
            searchTerm
        );
        updateProfessorsCount();
        renderProfessorsTable();
    }, 300);
    
    searchInput.addEventListener('input', (e) => {
        debouncedSearch(e.target.value);
    });
}

// Limpiar búsqueda
function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
        AppState.searchTerm = '';
        AppState.filteredProfessors = [...AppState.currentProfessors];
        updateProfessorsCount();
        renderProfessorsTable();
    }
}

/**
 * MODALES
 */

// Editar profesor
function editProfessor(professorId) {
    const professor = AppState.currentProfessors.find(p => p.id === professorId);
    if (!professor) return;
    
    AppState.editingProfessor = professor;
    
    // Llenar formulario de edición
    document.getElementById('editId').value = professor.id;
    document.getElementById('editNombre').value = professor.nombre;
    document.getElementById('editPreviewImg').src = professor.foto || '../image/default-avatar.png';
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('editModal'));
    modal.show();
}

// Eliminar profesor
function deleteProfessor(professorId, professorName) {
    document.getElementById('deleteProfesorId').value = professorId;
    document.getElementById('deleteProfesorName').textContent = professorName;
    
    const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
    modal.show();
}

/**
 * EVENTOS DE FORMULARIOS
 */

// Configurar eventos del formulario manual
function setupManualFormEvents() {
    const form = document.getElementById('profesorForm');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleManualSubmit();
    });
    
    // Setup photo preview
    setupPhotoPreview('photoPreview', 'previewImg', 'photoInput');
}

// Configurar eventos del formulario Excel
function setupExcelFormEvents() {
    const form = document.getElementById('excelForm');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleExcelSubmit();
    });
    
    setupExcelDropZone();
}

// Configurar eventos de edición
function setupEditFormEvents() {
    const saveBtn = document.getElementById('saveEditBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', handleEditSubmit);
    }
    
    const deleteBtn = document.getElementById('confirmDeleteBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', handleDeleteConfirm);
    }
    
    // Setup photo preview para modal de edición
    setupPhotoPreview('editPhotoPreview', 'editPreviewImg', 'editPhotoInput');
}

/**
 * HANDLERS DE SUBMIT
 */

// Manejar envío de formulario manual
async function handleManualSubmit() {
    const form = document.getElementById('profesorForm');
    const submitBtn = document.getElementById('submitBtn');
    const nombreInput = document.getElementById('nombreProfesor');
    const photoInput = document.getElementById('photoInput');
    
    try {
        // Limpiar errores previos
        ValidationHelper.clearFormErrors(form);
        
        // Obtener datos
        const formData = {
            nombre: nombreInput.value,
            photoFile: photoInput.files[0]
        };
        
        // Validar
        const errors = ValidationHelper.validateProfessorData(formData);
        if (errors.length > 0) {
            ValidationHelper.showFieldError(nombreInput, errors[0]);
            return;
        }
        
        // Mostrar loading
        setButtonLoading(submitBtn, true);
        
        // Subir foto si existe
        let photoURL = null;
        if (formData.photoFile) {
            photoURL = await ProfessorsService.uploadPhoto(
                formData.photoFile, 
                formData.nombre
            );
        }
        
        // Crear profesor
        const professorData = {
            nombre: formData.nombre,
            foto: photoURL
        };
        
        await ProfessorsService.createProfessor(professorData);
        
        // Mostrar éxito
        showNotification(
            'Éxito',
            'Profesor agregado correctamente',
            'success',
            'bi-check-circle'
        );
        
        // Limpiar formulario
        form.reset();
        resetPhotoPreview('photoPreview', 'previewImg');
        
        // Si estamos en la vista de gestión, recargar tabla
        if (document.getElementById('manage-form').style.display === 'block') {
            await loadProfessorsTable();
        }
        
    } catch (error) {
        console.error('Error al crear profesor:', error);
        showNotification(
            'Error',
            error.message || 'Error al agregar el profesor',
            'error',
            'bi-exclamation-triangle'
        );
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

// Manejar envío de formulario Excel
async function handleExcelSubmit() {
    const form = document.getElementById('excelForm');
    const submitBtn = document.getElementById('excelSubmitBtn');
    const fileInput = document.getElementById('excelInput');
    
    try {
        const file = fileInput.files[0];
        if (!file) {
            showNotification(
                'Error',
                'Debe seleccionar un archivo',
                'error',
                'bi-exclamation-triangle'
            );
            return;
        }
        
        // Mostrar loading
        setButtonLoading(submitBtn, true);
        
        // Mostrar overlay de carga con animación
        showExcelLoadingOverlay();
        
        // Paso 1: Leer archivo (20%)
        updateExcelProgress(20, 'Leyendo archivo Excel...');
        await sleep(500);
        
        // Procesar archivo Excel
        const excelData = await UtilityHelper.processExcelFile(file);
        
        if (excelData.length === 0) {
            hideExcelLoadingOverlay();
            throw new Error('No se encontraron datos válidos en el archivo');
        }
        
        // Paso 2: Validación (40%)
        updateExcelProgress(40, `Validando ${excelData.length} registros...`);
        await sleep(500);
        
        // Paso 3: Procesando (60%)
        updateExcelProgress(60, 'Guardando en la base de datos...');
        showExcelCounter();
        
        // Procesar carga masiva con actualizaciones en tiempo real
        const results = await processBulkUploadWithProgress(excelData);
        
        // Paso 4: Finalizando (100%)
        updateExcelProgress(100, 'Proceso completado exitosamente');
        await sleep(500);
        
        // Ocultar overlay
        hideExcelLoadingOverlay();
        
        // Mostrar resultados
        const message = `
            Nuevos: ${results.success}
            Actualizados: ${results.updated}
            Errores: ${results.errors}
        `.trim();
        
        if (results.errors > 0) {
            console.warn('Errores en carga masiva:', results.errorDetails);
        }
        
        showNotification(
            'Carga Completada',
            message,
            results.errors > 0 ? 'warning' : 'success',
            results.errors > 0 ? 'bi-exclamation-triangle' : 'bi-check-circle'
        );
        
        // Limpiar formulario
        removeFile();
        
        // Si estamos en la vista de gestión, recargar tabla
        if (document.getElementById('manage-form').style.display === 'block') {
            await loadProfessorsTable();
        }
        
    } catch (error) {
        console.error('Error en carga masiva:', error);
        hideExcelLoadingOverlay();
        showNotification(
            'Error',
            error.message || 'Error al procesar el archivo',
            'error',
            'bi-exclamation-triangle'
        );
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

/**
 * FUNCIONES DE ANIMACIÓN EXCEL
 */

// Función auxiliar para pausas
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Mostrar overlay de carga
function showExcelLoadingOverlay() {
    const overlay = document.getElementById('excelLoadingOverlay');
    if (overlay) {
        overlay.classList.add('active');
        // Reset progress
        updateExcelProgress(0, 'Iniciando proceso...');
        document.getElementById('excelCounter').style.display = 'none';
        updateExcelCounters(0, 0, 0);
    }
}

// Ocultar overlay de carga
function hideExcelLoadingOverlay() {
    const overlay = document.getElementById('excelLoadingOverlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

// Actualizar progreso
function updateExcelProgress(percent, message) {
    const progressBar = document.getElementById('excelProgressBar');
    const messageEl = document.getElementById('excelLoadingMessage');
    
    if (progressBar) {
        progressBar.style.width = percent + '%';
    }
    
    if (messageEl && message) {
        messageEl.textContent = message;
    }
}

// Mostrar contadores
function showExcelCounter() {
    const counter = document.getElementById('excelCounter');
    if (counter) {
        counter.style.display = 'flex';
    }
}

// Actualizar contadores
function updateExcelCounters(success, updated, errors) {
    const successEl = document.getElementById('counterSuccess');
    const updateEl = document.getElementById('counterUpdate');
    const errorEl = document.getElementById('counterError');
    
    if (successEl) successEl.textContent = success;
    if (updateEl) updateEl.textContent = updated;
    if (errorEl) errorEl.textContent = errors;
}

// Procesar carga masiva con actualizaciones de progreso
async function processBulkUploadWithProgress(excelData) {
    const results = {
        success: 0,
        updated: 0,
        errors: 0,
        errorDetails: []
    };

    const total = excelData.length;
    let processed = 0;

    for (let i = 0; i < excelData.length; i++) {
        const row = excelData[i];
        
        if (!row.nombre || !row.nombre.trim()) {
            results.errors++;
            results.errorDetails.push(`Fila ${i + 2}: Nombre vacío`);
            processed++;
            continue;
        }

        try {
            const normalizedName = row.nombre.toUpperCase().trim();
            const existingProfessor = await ProfessorsService.checkProfessorExists(normalizedName);

            if (existingProfessor) {
                await profesoresDb.collection('maestros')
                    .doc(existingProfessor.id)
                    .update({
                        nombre: normalizedName,
                        fechaModificacion: firebase.firestore.FieldValue.serverTimestamp()
                    });
                results.updated++;
            } else {
                await profesoresDb.collection('maestros').add({
                    nombre: normalizedName,
                    foto: 'default-avatar.png',
                    fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
                    fechaModificacion: firebase.firestore.FieldValue.serverTimestamp()
                });
                results.success++;
            }
        } catch (error) {
            results.errors++;
            results.errorDetails.push(`Fila ${i + 2}: ${error.message}`);
        }
        
        processed++;
        
        // Actualizar progreso cada 5 registros o al final
        if (processed % 5 === 0 || processed === total) {
            const progress = 60 + Math.floor((processed / total) * 30); // 60-90%
            updateExcelProgress(progress, `Procesando: ${processed} de ${total} registros`);
            updateExcelCounters(results.success, results.updated, results.errors);
            await sleep(50); // Pequeña pausa para que se vea la animación
        }
    }

    return results;
}

// Manejar edición de profesor
async function handleEditSubmit() {
    const saveBtn = document.getElementById('saveEditBtn');
    const idInput = document.getElementById('editId');
    const nombreInput = document.getElementById('editNombre');
    const photoInput = document.getElementById('editPhotoInput');
    
    try {
        // Validar datos
        const formData = {
            nombre: nombreInput.value,
            photoFile: photoInput.files[0]
        };
        
        const errors = ValidationHelper.validateProfessorData(formData);
        if (errors.length > 0) {
            ValidationHelper.showFieldError(nombreInput, errors[0]);
            return;
        }
        
        // Mostrar loading
        setButtonLoading(saveBtn, true);
        
        // Subir nueva foto si existe
        let photoURL = null;
        if (formData.photoFile) {
            photoURL = await ProfessorsService.uploadPhoto(
                formData.photoFile, 
                formData.nombre
            );
        }
        
        // Actualizar profesor
        const updateData = {
            nombre: formData.nombre
        };
        
        if (photoURL) {
            updateData.foto = photoURL;
        }
        
        await ProfessorsService.updateProfessor(idInput.value, updateData);
        
        // Cerrar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editModal'));
        modal.hide();
        
        // Mostrar éxito
        showNotification(
            'Éxito',
            'Profesor actualizado correctamente',
            'success',
            'bi-check-circle'
        );
        
        // Recargar tabla
        await loadProfessorsTable();
        
    } catch (error) {
        console.error('Error al actualizar profesor:', error);
        showNotification(
            'Error',
            error.message || 'Error al actualizar el profesor',
            'error',
            'bi-exclamation-triangle'
        );
    } finally {
        setButtonLoading(saveBtn, false);
    }
}

// Manejar confirmación de eliminación
async function handleDeleteConfirm() {
    const deleteBtn = document.getElementById('confirmDeleteBtn');
    const idInput = document.getElementById('deleteProfesorId');
    
    try {
        // Mostrar loading
        setButtonLoading(deleteBtn, true);
        
        // Eliminar profesor
        await ProfessorsService.deleteProfessor(idInput.value);
        
        // Cerrar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
        modal.hide();
        
        // Mostrar éxito
        showNotification(
            'Éxito',
            'Profesor eliminado correctamente',
            'success',
            'bi-check-circle'
        );
        
        // Recargar tabla
        await loadProfessorsTable();
        
    } catch (error) {
        console.error('Error al eliminar profesor:', error);
        showNotification(
            'Error',
            error.message || 'Error al eliminar el profesor',
            'error',
            'bi-exclamation-triangle'
        );
    } finally {
        setButtonLoading(deleteBtn, false);
    }
}