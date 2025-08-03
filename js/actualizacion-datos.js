/* ========================================
   ACTUALIZACIÓN DE DATOS - JAVASCRIPT
======================================== */

let actualizacionDB;
let actualizacionStorage;
let currentUser = null;

// Estado de la aplicación
const appState = {
    currentSection: 'verification',
    userData: null,
    uploadedFiles: {},
    isUploading: false
};

// Configuración de documentos
const documentConfig = {
    'historial_academico': {
        label: 'Historial Académico',
        icon: 'bi-mortarboard',
        maxSize: 10 * 1024 * 1024, // 10MB
        storageName: 'historial_academico',
        dbField: 'historialAcademicoUrl' // ✅ Campo en BD
    },
    'comprobante_domicilio': {
        label: 'Comprobante de Domicilio',
        icon: 'bi-house',
        maxSize: 10 * 1024 * 1024, // 10MB
        storageName: 'comprobante_domicilio',
        dbField: 'comprobanteDomicilioUrl' // ✅ Campo en BD
    },
    'curp': {
        label: 'CURP',
        icon: 'bi-file-text',
        maxSize: 10 * 1024 * 1024, // 10MB
        storageName: 'curp',
        dbField: 'curpUrl' // ✅ Campo en BD
    },
    'ine': {
        label: 'INE',
        icon: 'bi-credit-card',
        maxSize: 10 * 1024 * 1024, // 10MB
        storageName: 'ine',
        dbField: 'ineUrl' // ✅ Campo en BD
    },
    'credencial_unam': {
        label: 'Credencial UNAM',
        icon: 'bi-badge-tm',
        maxSize: 10 * 1024 * 1024, // 10MB
        storageName: 'credencial_unam',
        dbField: 'credencialUnamUrl' // ✅ Campo en BD
    }
};

/* ========================================
   INICIALIZACIÓN
======================================== */

document.addEventListener('DOMContentLoaded', function() {
    const checkFirebase = setInterval(() => {
        if (window.firebase && window.firebaseDB && window.firebaseStorage) {
            clearInterval(checkFirebase);
            initializeActualizacion();
        }
    }, 100);
    
    setTimeout(() => {
        clearInterval(checkFirebase);
        if (!actualizacionDB) {
            showNotification('Error de conexión con Firebase', 'error');
        }
    }, 10000);
});

async function initializeActualizacion() {
    try {
        actualizacionDB = window.firebaseDB;
        actualizacionStorage = window.firebaseStorage;
        
        console.log('📄 Actualización de Datos inicializada');
        
        // Configurar event listeners
        setupEventListeners();
        
        // Configurar drag & drop
        setupDragAndDrop();
        
        console.log('✅ Sistema de actualización listo');
        
    } catch (error) {
        console.error('❌ Error inicializando actualización:', error);
        showNotification('Error al cargar el sistema', 'error');
    }
}

/* ========================================
   EVENT LISTENERS
======================================== */

function setupEventListeners() {
    // Botón de verificación
    const verifyBtn = document.getElementById('verifyBtn');
    if (verifyBtn) {
        verifyBtn.addEventListener('click', handleVerification);
    }
    
    // Input de número de cuenta (Enter key)
    const numeroCuentaInput = document.getElementById('numeroCuenta');
    if (numeroCuentaInput) {
        numeroCuentaInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleVerification();
            }
        });
        
        // Solo números
        numeroCuentaInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '');
        });
    }
    
    // Botones de confirmación
    const backBtn = document.getElementById('backBtn');
    const confirmBtn = document.getElementById('confirmBtn');
    
    if (backBtn) {
        backBtn.addEventListener('click', () => showSection('verification'));
    }
    
    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => showSection('upload'));
    }
    
    // Inputs de archivos
    Object.keys(documentConfig).forEach(docType => {
        const input = document.getElementById(docType);
        if (input) {
            input.addEventListener('change', (e) => handleFileSelect(e, docType));
        }
    });
    
    // Drop zones
    const dropZones = document.querySelectorAll('.file-drop-zone');
    dropZones.forEach(zone => {
        zone.addEventListener('click', () => {
            const target = zone.getAttribute('data-target');
            const input = document.getElementById(target);
            if (input) input.click();
        });
    });
    
    // Formulario de subida
    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleFormSubmit);
    }
    
    // Botón de nueva actualización
    const newUpdateBtn = document.getElementById('newUpdateBtn');
    if (newUpdateBtn) {
        newUpdateBtn.addEventListener('click', () => {
            resetForm();
            showSection('verification');
        });
    }
    
    console.log('🎧 Event listeners configurados');
}

/* ========================================
   VERIFICACIÓN DE USUARIO
======================================== */

async function handleVerification() {
    const numeroCuenta = document.getElementById('numeroCuenta').value.trim();
    
    if (!numeroCuenta) {
        showNotification('Por favor ingresa tu número de cuenta', 'warning');
        return;
    }
    
    if (numeroCuenta.length !== 9) {
        showNotification('El número de cuenta debe tener 9 dígitos', 'warning');
        return;
    }
    
    const verifyBtn = document.getElementById('verifyBtn');
    const originalText = verifyBtn.innerHTML;
    
    try {
        // Mostrar estado de carga
        verifyBtn.innerHTML = '<i class="bi bi-arrow-clockwise spinning me-2"></i>Verificando...';
        verifyBtn.disabled = true;
        
        // Buscar en la base de datos
        const asesorSnapshot = await actualizacionDB.collection('asesores')
            .where('numeroCuenta', '==', numeroCuenta)
            .get();
        
        if (asesorSnapshot.empty) {
            showNotification('Número de cuenta no encontrado en el sistema', 'error');
            verifyBtn.innerHTML = originalText;
            verifyBtn.disabled = false;
            return;
        }
        
        // Obtener datos del asesor
        const asesorData = asesorSnapshot.docs[0].data();
        const asesorId = asesorSnapshot.docs[0].id;
        
        // Guardar datos del usuario
        appState.userData = {
            id: asesorId,
            numeroCuenta: numeroCuenta,
            nombre: asesorData.nombreAsesor || 'Nombre no disponible',
            ...asesorData
        };
        
        // Mostrar confirmación
        showUserConfirmation(appState.userData);
        
        showNotification('Usuario encontrado correctamente', 'success');
        
    } catch (error) {
        console.error('❌ Error verificando usuario:', error);
        showNotification('Error al verificar el usuario', 'error');
    } finally {
        verifyBtn.innerHTML = originalText;
        verifyBtn.disabled = false;
    }
}

function showUserConfirmation(userData) {
    // Actualizar información del usuario
    document.getElementById('confirmedName').textContent = userData.nombre;
    document.getElementById('confirmedAccount').textContent = `Cuenta: ${userData.numeroCuenta}`;
    
    // Mostrar sección de confirmación
    showSection('confirmation');
}

/* ========================================
   GESTIÓN DE SECCIONES
======================================== */

function showSection(sectionName) {
    // Ocultar todas las secciones
    const sections = ['verification', 'confirmation', 'upload', 'success'];
    sections.forEach(section => {
        const element = document.getElementById(`${section}Section`);
        if (element) {
            element.classList.add('d-none');
        }
    });
    
    // Mostrar sección solicitada
    const targetSection = document.getElementById(`${sectionName}Section`);
    if (targetSection) {
        targetSection.classList.remove('d-none');
        
        // Configuraciones específicas por sección
        if (sectionName === 'upload') {
            setupUploadSection();
        }
    }
    
    appState.currentSection = sectionName;
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setupUploadSection() {
    // Mostrar información del usuario en la barra
    document.getElementById('uploadUserName').textContent = appState.userData.nombre;
    document.getElementById('uploadUserAccount').textContent = `Cuenta: ${appState.userData.numeroCuenta}`;
}

/* ========================================
   DRAG & DROP
======================================== */

function setupDragAndDrop() {
    const dropZones = document.querySelectorAll('.file-drop-zone');
    
    dropZones.forEach(zone => {
        // Prevenir comportamiento por defecto
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            zone.addEventListener(eventName, preventDefaults, false);
        });
        
        // Destacar zona de drop
        ['dragenter', 'dragover'].forEach(eventName => {
            zone.addEventListener(eventName, () => zone.classList.add('dragover'), false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            zone.addEventListener(eventName, () => zone.classList.remove('dragover'), false);
        });
        
        // Manejar drop
        zone.addEventListener('drop', handleDrop, false);
    });
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleDrop(e) {
    const files = e.dataTransfer.files;
    const target = e.target.closest('.file-drop-zone').getAttribute('data-target');
    
    if (files.length > 0) {
        const file = files[0];
        handleFileSelect({ target: { files: [file] } }, target);
    }
}

/* ========================================
   MANEJO DE ARCHIVOS
======================================== */

function handleFileSelect(event, docType) {
    const file = event.target.files[0];
    if (!file) return;
    
    const config = documentConfig[docType];
    if (!config) return;
    
    // Validar tipo de archivo
    if (file.type !== 'application/pdf') {
        showNotification('Solo se permiten archivos PDF', 'warning');
        return;
    }
    
    // Validar tamaño
    if (file.size > config.maxSize) {
        const maxSizeMB = config.maxSize / (1024 * 1024);
        showNotification(`El archivo excede el tamaño máximo de ${maxSizeMB}MB`, 'warning');
        return;
    }
    
    // Guardar archivo en el estado
    appState.uploadedFiles[docType] = file;
    
    // Mostrar preview
    showFilePreview(docType, file);
    
    showNotification(`${config.label} seleccionado correctamente`, 'success');
}

function showFilePreview(docType, file) {
    const uploadField = document.querySelector(`#${docType}`).closest('.upload-field');
    const dropZone = uploadField.querySelector('.file-drop-zone');
    const preview = uploadField.querySelector('.file-preview');
    
    // Ocultar drop zone y mostrar preview
    dropZone.style.display = 'none';
    preview.classList.remove('d-none');
    
    // Formatear tamaño del archivo
    const fileSize = formatFileSize(file.size);
    
    preview.innerHTML = `
        <div class="file-preview-item">
            <div class="file-preview-info">
                <i class="bi bi-file-pdf"></i>
                <div>
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${fileSize}</div>
                </div>
            </div>
            <button type="button" class="file-remove" onclick="removeFile('${docType}')">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>
    `;
}

function removeFile(docType) {
    // Eliminar del estado
    delete appState.uploadedFiles[docType];
    
    // Limpiar input
    document.getElementById(docType).value = '';
    
    // Ocultar preview y mostrar drop zone
    const uploadField = document.querySelector(`#${docType}`).closest('.upload-field');
    const dropZone = uploadField.querySelector('.file-drop-zone');
    const preview = uploadField.querySelector('.file-preview');
    
    dropZone.style.display = 'block';
    preview.classList.add('d-none');
    preview.innerHTML = '';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/* ========================================
   ENVÍO DEL FORMULARIO
======================================== */

async function handleFormSubmit(event) {
    event.preventDefault();
    
    if (appState.isUploading) return;
    
    // Validar que todos los archivos estén seleccionados
    const requiredDocs = Object.keys(documentConfig);
    const missingDocs = requiredDocs.filter(doc => !appState.uploadedFiles[doc]);
    
    if (missingDocs.length > 0) {
        const missingLabels = missingDocs.map(doc => documentConfig[doc].label).join(', ');
        showNotification(`Faltan documentos: ${missingLabels}`, 'warning');
        return;
    }
    
    appState.isUploading = true;
    
    try {
        // Mostrar overlay de carga
        showLoadingOverlay(true);
        
        // Actualizar progreso
        updateProgress(10);
        
        // Subir archivos
        await uploadDocuments();
        
        // Mostrar éxito
        showSuccessScreen();
        
    } catch (error) {
        console.error('❌ Error subiendo documentos:', error);
        showNotification('Error al subir los documentos', 'error');
    } finally {
        appState.isUploading = false;
        showLoadingOverlay(false);
    }
}

async function uploadDocuments() {
    const numeroCuenta = appState.userData.numeroCuenta;
    const asesorId = appState.userData.id;
    const folderPath = `asesor_${numeroCuenta}`;
    const uploadPromises = [];
    const totalFiles = Object.keys(appState.uploadedFiles).length;
    let completedFiles = 0;
    
    // Eliminar documentos existentes primero
    await deleteExistingDocuments(numeroCuenta);
    updateProgress(30);
    
    // Subir cada documento
    for (const [docType, file] of Object.entries(appState.uploadedFiles)) {
        const config = documentConfig[docType];
        const fileName = config.storageName;
        const filePath = `documentos_asesores/${folderPath}/${fileName}`;
        
        const uploadPromise = uploadFileToStorage(file, filePath, docType)
            .then(async (downloadURL) => {
                completedFiles++;
                const progress = 30 + ((completedFiles / totalFiles) * 50);
                updateProgress(progress);
                
                return { docType, downloadURL, fileName, dbField: config.dbField };
            });
        
        uploadPromises.push(uploadPromise);
    }
    
    // Esperar a que terminen todas las subidas
    const results = await Promise.all(uploadPromises);
    updateProgress(90);
    
    // ✅ ACTUALIZAR EL DOCUMENTO DEL ASESOR CON LAS URLs
    await updateAsesorDocumentUrls(asesorId, results);
    updateProgress(100);
    
    console.log('✅ Todos los documentos subidos:', results);
    return results;
}

// ✅ NUEVA FUNCIÓN: Actualizar URLs en documento del asesor
async function updateAsesorDocumentUrls(asesorId, results) {
    try {
        // Crear objeto con las URLs para actualizar
        const updateData = {
            ultimaActualizacionDocumentos: firebase.firestore.FieldValue.serverTimestamp(),
            documentosActualizados: true
        };
        
        // Agregar cada URL al objeto de actualización
        results.forEach(result => {
            updateData[result.dbField] = result.downloadURL;
        });
        
        // Actualizar el documento del asesor
        const asesorRef = actualizacionDB.collection('asesores').doc(asesorId);
        await asesorRef.update(updateData);
        
        console.log('✅ URLs actualizadas en documento del asesor:', updateData);
        
    } catch (error) {
        console.error('❌ Error actualizando URLs del asesor:', error);
        throw error;
    }
}

async function deleteExistingDocuments(numeroCuenta) {
    try {
        const folderPath = `asesor_${numeroCuenta}`;
        
        // Eliminar archivos de Storage
        for (const docType of Object.keys(documentConfig)) {
            const config = documentConfig[docType];
            const fileName = config.storageName;
            const filePath = `documentos_asesores/${folderPath}/${fileName}`;
            
            try {
                const fileRef = actualizacionStorage.ref(filePath);
                await fileRef.delete();
                console.log(`🗑️ Eliminado de Storage: ${filePath}`);
            } catch (error) {
                // Si el archivo no existe, continuar
                if (error.code !== 'storage/object-not-found') {
                    console.warn(`⚠️ Error eliminando ${filePath}:`, error);
                }
            }
        }
        
        console.log('🗑️ Documentos anteriores eliminados de Storage');
        
    } catch (error) {
        console.warn('⚠️ Error eliminando documentos anteriores:', error);
        // No detener el proceso por errores de eliminación
    }
}

async function uploadFileToStorage(file, filePath, docType) {
    return new Promise((resolve, reject) => {
        const storageRef = actualizacionStorage.ref(filePath);
        const uploadTask = storageRef.put(file);
        
        uploadTask.on('state_changed',
            (snapshot) => {
                // Progreso de subida individual
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log(`📤 Subiendo ${docType}: ${progress.toFixed(1)}%`);
            },
            (error) => {
                console.error(`❌ Error subiendo ${docType}:`, error);
                reject(error);
            },
            async () => {
                try {
                    const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                    console.log(`✅ ${docType} subido exitosamente`);
                    resolve(downloadURL);
                } catch (error) {
                    reject(error);
                }
            }
        );
    });
}

// Funciones eliminadas: saveDocumentReference y updateLastUpdateTimestamp
// Ya no son necesarias porque ahora guardamos directamente en el documento del asesor

/* ========================================
   PANTALLA DE ÉXITO
======================================== */

function showSuccessScreen() {
    // Actualizar información de éxito
    const now = new Date();
    document.getElementById('updateDate').textContent = now.toLocaleString('es-MX');
    document.getElementById('filesCount').textContent = Object.keys(appState.uploadedFiles).length;
    
    // Mostrar sección de éxito
    showSection('success');
    
    showNotification('¡Documentos actualizados exitosamente!', 'success');
}

/* ========================================
   LOADING Y PROGRESO
======================================== */

function showLoadingOverlay(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        if (show) {
            overlay.classList.remove('d-none');
        } else {
            overlay.classList.add('d-none');
        }
    }
}

function updateProgress(percentage) {
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
    }
}

/* ========================================
   RESET DEL FORMULARIO
======================================== */

function resetForm() {
    // Limpiar estado
    appState.currentSection = 'verification';
    appState.userData = null;
    appState.uploadedFiles = {};
    appState.isUploading = false;
    
    // Limpiar inputs
    document.getElementById('numeroCuenta').value = '';
    
    // Limpiar previews de archivos
    Object.keys(documentConfig).forEach(docType => {
        removeFile(docType);
    });
    
    // Reset progress
    updateProgress(0);
    
    console.log('🔄 Formulario reiniciado');
}

/* ========================================
   NOTIFICACIONES
======================================== */

function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icons = {
        success: 'bi-check-circle-fill',
        error: 'bi-exclamation-triangle-fill',
        warning: 'bi-exclamation-triangle-fill',
        info: 'bi-info-circle-fill'
    };
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 1rem;">
            <div style="font-size: 1.5rem;">
                <i class="bi ${icons[type] || icons.info}"></i>
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
    
    // Auto remove después de 5 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

/* ========================================
   UTILIDADES
======================================== */

// Función para copiar URL (se usará desde formularios-avisos.js)
function getFormURL() {
    return window.location.href;
}

// Agregar estilos para spinner
const style = document.createElement('style');
style.textContent = `
    .spinning {
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

/* ========================================
   EXPORTAR FUNCIONES GLOBALES
======================================== */

window.ActualizacionDatos = {
    showNotification,
    getFormURL,
    resetForm
};

// Función global para remover archivos (usada en el HTML)
window.removeFile = removeFile;