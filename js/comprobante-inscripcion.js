/* ========================================
   COMPROBANTE DE INSCRIPCIÓN - JAVASCRIPT
======================================== */

let comprobanteDB;
let comprobanteStorage;
let currentUser = null;

// Estado de la aplicación
const appState = {
    currentSection: 'verification',
    userData: null,
    uploadedFile: null,
    isUploading: false
};

// Configuración del documento
const documentConfig = {
    label: 'Comprobante de Inscripción',
    icon: 'bi-file-earmark-text',
    maxSize: 10 * 1024 * 1024, // 10MB
    storageName: 'comprobante_inscripcion',
    dbField: 'comprobanteInscripcionUrl'
};

/* ========================================
   INICIALIZACIÓN
======================================== */

document.addEventListener('DOMContentLoaded', function() {
    const checkFirebase = setInterval(() => {
        if (window.firebase && window.firebaseDB && window.firebaseStorage) {
            clearInterval(checkFirebase);
            initializeComprobante();
        }
    }, 100);
    
    setTimeout(() => {
        clearInterval(checkFirebase);
        if (!comprobanteDB) {
            showNotification('Error de conexión con Firebase', 'error');
        }
    }, 10000);
});

async function initializeComprobante() {
    try {
        comprobanteDB = window.firebaseDB;
        comprobanteStorage = window.firebaseStorage;
        
        console.log('📄 Comprobante de Inscripción inicializado');
        
        // Configurar event listeners
        setupEventListeners();
        
        // Configurar drag & drop
        setupDragAndDrop();
        
        console.log('✅ Sistema de comprobante listo');
        
    } catch (error) {
        console.error('❌ Error inicializando comprobante:', error);
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
    
    // Input de archivo
    const fileInput = document.getElementById('comprobante_inscripcion');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => handleFileSelect(e));
    }
    
    // Drop zone
    const dropZone = document.querySelector('.file-drop-zone');
    if (dropZone) {
        dropZone.addEventListener('click', () => {
            fileInput.click();
        });
    }
    
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
        const asesorSnapshot = await comprobanteDB.collection('asesores')
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
    const dropZone = document.querySelector('.file-drop-zone');
    if (!dropZone) return;
    
    // Prevenir comportamiento por defecto
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });
    
    // Destacar zona de drop
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
    });
    
    // Manejar drop
    dropZone.addEventListener('drop', handleDrop, false);
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleDrop(e) {
    const files = e.dataTransfer.files;
    
    if (files.length > 0) {
        const file = files[0];
        handleFileSelect({ target: { files: [file] } });
    }
}

/* ========================================
   MANEJO DE ARCHIVOS
======================================== */

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validar tipo de archivo
    if (file.type !== 'application/pdf') {
        showNotification('Solo se permiten archivos PDF', 'warning');
        return;
    }
    
    // Validar tamaño
    if (file.size > documentConfig.maxSize) {
        const maxSizeMB = documentConfig.maxSize / (1024 * 1024);
        showNotification(`El archivo excede el tamaño máximo de ${maxSizeMB}MB`, 'warning');
        return;
    }
    
    // Guardar archivo en el estado
    appState.uploadedFile = file;
    
    // Mostrar preview
    showFilePreview(file);
    
    showNotification(`${documentConfig.label} seleccionado correctamente`, 'success');
}

function showFilePreview(file) {
    const uploadField = document.querySelector('.upload-field');
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
            <button type="button" class="file-remove" onclick="removeFile()">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>
    `;
}

function removeFile() {
    // Eliminar del estado
    appState.uploadedFile = null;
    
    // Limpiar input
    document.getElementById('comprobante_inscripcion').value = '';
    
    // Ocultar preview y mostrar drop zone
    const uploadField = document.querySelector('.upload-field');
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
    
    // Validar que el archivo esté seleccionado
    if (!appState.uploadedFile) {
        showNotification('Por favor selecciona tu comprobante de inscripción', 'warning');
        return;
    }
    
    appState.isUploading = true;
    
    try {
        // Mostrar overlay de carga
        showLoadingOverlay(true);
        
        // Actualizar progreso
        updateProgress(10);
        
        // Subir archivo
        await uploadDocument();
        
        // Mostrar éxito
        showSuccessScreen();
        
    } catch (error) {
        console.error('❌ Error subiendo comprobante:', error);
        showNotification('Error al subir el comprobante', 'error');
    } finally {
        appState.isUploading = false;
        showLoadingOverlay(false);
    }
}

async function uploadDocument() {
    const numeroCuenta = appState.userData.numeroCuenta;
    const asesorId = appState.userData.id;
    const folderPath = `asesor_${numeroCuenta}`;
    
    // Eliminar documento existente primero
    await deleteExistingDocument(numeroCuenta);
    updateProgress(30);
    
    // Subir nuevo documento
    const fileName = documentConfig.storageName;
    const filePath = `documentos_asesores/${folderPath}/${fileName}`;
    
    const downloadURL = await uploadFileToStorage(appState.uploadedFile, filePath);
    updateProgress(80);
    
    // Actualizar el documento del asesor con la URL
    await updateAsesorDocumentUrl(asesorId, downloadURL);
    updateProgress(100);
    
    console.log('✅ Comprobante subido exitosamente:', downloadURL);
    return downloadURL;
}

async function deleteExistingDocument(numeroCuenta) {
    try {
        const folderPath = `asesor_${numeroCuenta}`;
        const fileName = documentConfig.storageName;
        const filePath = `documentos_asesores/${folderPath}/${fileName}`;
        
        try {
            const fileRef = comprobanteStorage.ref(filePath);
            await fileRef.delete();
            console.log(`🗑️ Eliminado de Storage: ${filePath}`);
        } catch (error) {
            // Si el archivo no existe, continuar
            if (error.code !== 'storage/object-not-found') {
                console.warn(`⚠️ Error eliminando ${filePath}:`, error);
            }
        }
        
        console.log('🗑️ Documento anterior eliminado de Storage');
        
    } catch (error) {
        console.warn('⚠️ Error eliminando documento anterior:', error);
        // No detener el proceso por errores de eliminación
    }
}

async function uploadFileToStorage(file, filePath) {
    return new Promise((resolve, reject) => {
        const storageRef = comprobanteStorage.ref(filePath);
        const uploadTask = storageRef.put(file);
        
        uploadTask.on('state_changed',
            (snapshot) => {
                // Progreso de subida individual
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log(`📤 Subiendo comprobante: ${progress.toFixed(1)}%`);
                
                // Actualizar progreso en la UI (entre 30% y 80%)
                const uiProgress = 30 + ((progress / 100) * 50);
                updateProgress(uiProgress);
            },
            (error) => {
                console.error(`❌ Error subiendo comprobante:`, error);
                reject(error);
            },
            async () => {
                try {
                    const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                    console.log(`✅ Comprobante subido exitosamente`);
                    resolve(downloadURL);
                } catch (error) {
                    reject(error);
                }
            }
        );
    });
}

async function updateAsesorDocumentUrl(asesorId, downloadURL) {
    try {
        // Crear objeto con la URL para actualizar
        const updateData = {
            [documentConfig.dbField]: downloadURL,
            ultimaActualizacionComprobante: firebase.firestore.FieldValue.serverTimestamp(),
            comprobanteActualizado: true
        };
        
        // Actualizar el documento del asesor
        const asesorRef = comprobanteDB.collection('asesores').doc(asesorId);
        await asesorRef.update(updateData);
        
        console.log('✅ URL actualizada en documento del asesor:', updateData);
        
    } catch (error) {
        console.error('❌ Error actualizando URL del asesor:', error);
        throw error;
    }
}

/* ========================================
   PANTALLA DE ÉXITO
======================================== */

function showSuccessScreen() {
    // Actualizar información de éxito
    const now = new Date();
    document.getElementById('updateDate').textContent = now.toLocaleString('es-MX');
    
    // Mostrar sección de éxito
    showSection('success');
    
    showNotification('¡Comprobante subido exitosamente!', 'success');
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
    appState.uploadedFile = null;
    appState.isUploading = false;
    
    // Limpiar inputs
    document.getElementById('numeroCuenta').value = '';
    
    // Limpiar preview de archivo
    removeFile();
    
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
                background: none; border: none; color: currentColor; font-size: 1.2rem; 
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

// Función para obtener URL del formulario (se usará desde formularios-avisos.js)
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

window.ComprobanteInscripcion = {
    showNotification,
    getFormURL,
    resetForm
};

// Función global para remover archivos (usada en el HTML)
window.removeFile = removeFile;