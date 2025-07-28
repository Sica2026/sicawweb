/* ========================================
   PÁGINA DE IMPRESIONES - JAVASCRIPT
   ======================================== */

// Firebase ya debe estar inicializado por firebase-config.js
// Verificar si db ya está definido, sino crear referencia
let impresionesDB;
if (typeof db !== 'undefined') {
    // Usar la instancia global de db
    impresionesDB = db;
} else {
    // Crear nueva instancia si no existe con configuración moderna
    impresionesDB = firebase.firestore();
    
    // Configuración moderna de cache (reemplaza enablePersistence)
    try {
        impresionesDB.settings({
            cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
            cache: firebase.firestore.MemoryLocalCache.getInstance()
        });
    } catch (error) {
        console.warn('Firestore settings already configured:', error.message);
        // Fallback a la configuración básica si falla
        try {
            impresionesDB.settings({
                cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
            });
        } catch (fallbackError) {
            console.warn('Firestore fallback settings failed:', fallbackError.message);
        }
    }
}

// DOM Elements
let form, numeroCuentaInput, numeroImpresionesInput, submitBtn, 
    btnText, btnLoader, asesorInfo, asesorNombre;

// State
let currentAsesor = null;
let isValidating = false;

/* ========================================
   INICIALIZACIÓN
   ======================================== */

document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    initializeElements();
    setupEventListeners();
    setupFormValidation();
});

function initializePage() {
    // Set page title and breadcrumbs
    SICAComponents.setPageTitle("Registro de Impresiones - SICA");
}

function initializeElements() {
    form = document.getElementById('impresionesForm');
    numeroCuentaInput = document.getElementById('numeroCuenta');
    numeroImpresionesInput = document.getElementById('numeroImpresiones');
    submitBtn = document.getElementById('submitBtn');
    btnText = submitBtn.querySelector('.btn-text');
    btnLoader = submitBtn.querySelector('.btn-loader');
    asesorInfo = document.getElementById('asesorInfo');
    asesorNombre = document.getElementById('asesorNombre');
}

/* ========================================
   EVENT LISTENERS
   ======================================== */

function setupEventListeners() {
    // Validación en tiempo real del número de cuenta
    numeroCuentaInput.addEventListener('input', debounce(validateAsesor, 500));
    numeroCuentaInput.addEventListener('blur', validateAsesor);
    
    // Validación del número de impresiones
    numeroImpresionesInput.addEventListener('input', validateImpresiones);
    
    // Submit del formulario
    form.addEventListener('submit', handleFormSubmit);
    
    // Teclas de acceso rápido
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

function setupFormValidation() {
    // Bootstrap validation
    form.classList.add('needs-validation');
}

/* ========================================
   VALIDACIONES
   ======================================== */

async function validateAsesor() {
    const numeroCuenta = numeroCuentaInput.value.trim();
    
    if (!numeroCuenta) {
        resetAsesorValidation();
        return false;
    }

    if (isValidating) return false;
    isValidating = true;

    // Mostrar indicador de búsqueda
    showSearchingState();

    try {
        // Estrategia 1: Búsqueda exacta
        let asesorQuery = await impresionesDB.collection('asesores')
            .where('numeroCuenta', '==', numeroCuenta)
            .limit(1)
            .get({ source: 'default' }); // Intenta servidor primero, luego cache

        // Estrategia 2: Si no encuentra, buscar como string
        if (asesorQuery.empty) {
            asesorQuery = await impresionesDB.collection('asesores')
                .where('numeroCuenta', '==', String(numeroCuenta))
                .limit(1)
                .get({ source: 'default' });
        }

        // Estrategia 3: Si aún no encuentra, buscar en cache
        if (asesorQuery.empty) {
            asesorQuery = await impresionesDB.collection('asesores')
                .where('numeroCuenta', '==', numeroCuenta)
                .limit(1)
                .get({ source: 'cache' });
        }

        // Estrategia 4: Búsqueda manual si todo falla
        if (asesorQuery.empty) {
            const allAsesores = await impresionesDB.collection('asesores')
                .get({ source: 'default' })
                .catch(() => impresionesDB.collection('asesores').get({ source: 'cache' }));
            
            const foundAsesor = allAsesores.docs.find(doc => {
                const data = doc.data();
                return String(data.numeroCuenta).trim() === String(numeroCuenta).trim();
            });

            if (foundAsesor) {
                const asesorData = foundAsesor.data();
                currentAsesor = {
                    id: foundAsesor.id,
                    ...asesorData
                };
                hideSearchingState();
                showAsesorValid(asesorData.nombreAsesor || 'Asesor encontrado');
                return true;
            }
        }

        if (!asesorQuery.empty) {
            const asesorDoc = asesorQuery.docs[0];
            const asesorData = asesorDoc.data();
            
            currentAsesor = {
                id: asesorDoc.id,
                ...asesorData
            };

            hideSearchingState();
            showAsesorValid(asesorData.nombreAsesor || 'Asesor encontrado');
            return true;
        } else {
            hideSearchingState();
            showAsesorInvalid();
            return false;
        }
    } catch (error) {
        console.error('Error validating asesor:', error);
        hideSearchingState();
        
        // Manejar diferentes tipos de errores
        if (error.code === 'unavailable') {
            showConnectionError();
        } else if (error.code === 'permission-denied') {
            showPermissionError();
        } else {
            showAsesorError();
        }
        return false;
    } finally {
        isValidating = false;
    }
}

function validateImpresiones() {
    const value = parseInt(numeroImpresionesInput.value);
    
    if (!value || value < 1 || value > 9999) {
        numeroImpresionesInput.classList.remove('is-valid');
        numeroImpresionesInput.classList.add('is-invalid');
        return false;
    } else {
        numeroImpresionesInput.classList.remove('is-invalid');
        numeroImpresionesInput.classList.add('is-valid');
        return true;
    }
}

function showAsesorValid(nombreAsesor) {
    numeroCuentaInput.classList.remove('is-invalid');
    numeroCuentaInput.classList.add('is-valid');
    asesorNombre.textContent = `Asesor: ${nombreAsesor}`;
    asesorInfo.style.display = 'block';
    
    // Animate the validation feedback
    asesorInfo.style.opacity = '0';
    asesorInfo.style.transform = 'translateY(-10px)';
    
    setTimeout(() => {
        asesorInfo.style.transition = 'all 0.3s ease';
        asesorInfo.style.opacity = '1';
        asesorInfo.style.transform = 'translateY(0)';
    }, 50);
}

function showAsesorInvalid() {
    numeroCuentaInput.classList.remove('is-valid');
    numeroCuentaInput.classList.add('is-invalid');
    asesorInfo.style.display = 'none';
    currentAsesor = null;
    
    SICAComponents.notify(
        "Número de Cuenta No Encontrado",
        "El número de cuenta ingresado no está registrado en el sistema.",
        "warning",
        "bi-person-x"
    );
}

function showAsesorError() {
    numeroCuentaInput.classList.remove('is-valid');
    numeroCuentaInput.classList.add('is-invalid');
    asesorInfo.style.display = 'none';
    currentAsesor = null;
    
    SICAComponents.notify(
        "Error de Validación",
        "No se pudo verificar el número de cuenta. Intenta nuevamente.",
        "warning",
        "bi-exclamation-triangle"
    );
}

function showConnectionError() {
    numeroCuentaInput.classList.remove('is-valid');
    numeroCuentaInput.classList.add('is-invalid');
    asesorInfo.style.display = 'none';
    currentAsesor = null;
    
    SICAComponents.notify(
        "Error de Conexión",
        "No se puede conectar al servidor. Verifica tu conexión a internet e intenta nuevamente.",
        "error",
        "bi-wifi-off"
    );
}

function showPermissionError() {
    numeroCuentaInput.classList.remove('is-valid');
    numeroCuentaInput.classList.add('is-invalid');
    asesorInfo.style.display = 'none';
    currentAsesor = null;
    
    SICAComponents.notify(
        "Error de Permisos",
        "No tienes permisos para acceder a esta información. Contacta al administrador.",
        "error",
        "bi-shield-x"
    );
}

function showSearchingState() {
    const loadingIcon = document.createElement('div');
    loadingIcon.id = 'searching-icon';
    loadingIcon.innerHTML = '<i class="bi bi-search text-primary"></i>';
    loadingIcon.style.cssText = `
        position: absolute;
        right: 15px;
        top: 50%;
        transform: translateY(-50%);
        animation: pulse 1.5s infinite;
        z-index: 10;
    `;
    
    // Remove existing searching icon
    const existingIcon = document.getElementById('searching-icon');
    if (existingIcon) existingIcon.remove();
    
    // Add to input container
    numeroCuentaInput.parentElement.style.position = 'relative';
    numeroCuentaInput.parentElement.appendChild(loadingIcon);
}

function hideSearchingState() {
    const searchingIcon = document.getElementById('searching-icon');
    if (searchingIcon) {
        searchingIcon.remove();
    }
}

function resetAsesorValidation() {
    numeroCuentaInput.classList.remove('is-valid', 'is-invalid');
    asesorInfo.style.display = 'none';
    currentAsesor = null;
}

/* ========================================
   MANEJO DEL FORMULARIO
   ======================================== */

async function handleFormSubmit(e) {
    e.preventDefault();
    e.stopPropagation();

    // Validar formulario
    const isAsesorValid = currentAsesor !== null;
    const isImpresionesValid = validateImpresiones();

    if (!isAsesorValid) {
        await validateAsesor();
    }

    if (!currentAsesor || !isImpresionesValid) {
        form.classList.add('was-validated');
        
        SICAComponents.notify(
            "Formulario Incompleto",
            "Por favor completa todos los campos correctamente.",
            "warning",
            "bi-exclamation-triangle"
        );
        return;
    }

    // Procesar el formulario
    await submitImpresiones();
}

async function submitImpresiones() {
    try {
        showLoadingState();

        const impresionData = {
            numeroCuenta: numeroCuentaInput.value.trim(),
            nombreAsesor: currentAsesor.nombreAsesor || 'Asesor',
            numeroImpresiones: parseInt(numeroImpresionesInput.value),
            asesorId: currentAsesor.id,
            fechaRegistro: firebase.firestore.FieldValue.serverTimestamp(),
            timestamp: Date.now()
        };

        // Intentar guardar con reintentos
        let attempts = 0;
        const maxAttempts = 3;
        
        while (attempts < maxAttempts) {
            try {
                await impresionesDB.collection('impresionesasesores').add(impresionData);
                break; // Éxito, salir del loop
            } catch (error) {
                attempts++;
                if (attempts >= maxAttempts) {
                    throw error; // Re-lanzar el error después de todos los intentos
                }
                
                // Esperar antes del siguiente intento
                await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            }
        }

        hideLoadingState();
        showSuccessModal();
        resetForm();
        
        // Play success sound if available
        if (window.modernNav && window.modernNav.playSound) {
            window.modernNav.playSound('success');
        }

        SICAComponents.notify(
            "¡Registro Exitoso!",
            `Se registraron ${impresionData.numeroImpresiones} impresiones para ${impresionData.nombreAsesor}`,
            "success",
            "bi-check-circle-fill"
        );

    } catch (error) {
        console.error('Error saving impresiones:', error);
        hideLoadingState();
        
        let errorMessage = "No se pudo registrar las impresiones. Intenta nuevamente.";
        let errorTitle = "Error al Guardar";
        
        if (error.code === 'unavailable') {
            errorMessage = "No hay conexión al servidor. Verifica tu internet e intenta nuevamente.";
            errorTitle = "Error de Conexión";
        } else if (error.code === 'permission-denied') {
            errorMessage = "No tienes permisos para guardar esta información.";
            errorTitle = "Error de Permisos";
        }
        
        SICAComponents.notify(
            errorTitle,
            errorMessage,
            "error",
            "bi-exclamion-circle"
        );
    }
}

function showLoadingState() {
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'flex';
    submitBtn.classList.add('btn-loading');
}

function hideLoadingState() {
    submitBtn.disabled = false;
    btnText.style.display = 'flex';
    btnLoader.style.display = 'none';
    submitBtn.classList.remove('btn-loading');
}

function showSuccessModal() {
    const successModal = new bootstrap.Modal(document.getElementById('successModal'));
    successModal.show();
}

function resetForm() {
    form.reset();
    form.classList.remove('was-validated');
    resetAsesorValidation();
    numeroImpresionesInput.classList.remove('is-valid', 'is-invalid');
    currentAsesor = null;
    
    // Focus back to first input
    setTimeout(() => {
        numeroCuentaInput.focus();
    }, 500);
}

/* ========================================
   FUNCIONES DE UTILIDAD
   ======================================== */

function debounce(func, wait) {
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

function handleKeyboardShortcuts(e) {
    // Ctrl/Cmd + Enter para enviar formulario
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!submitBtn.disabled) {
            form.dispatchEvent(new Event('submit'));
        }
    }
    
    // Escape para limpiar formulario
    if (e.key === 'Escape') {
        resetForm();
    }
}

/* ========================================
   REGISTROS RECIENTES (OPCIONAL)
   ======================================== */

async function loadRecentRecords() {
    if (!currentAsesor) return;
    
    try {
        const recentQuery = await impresionesDB.collection('impresionesasesores')
            .where('asesorId', '==', currentAsesor.id)
            .orderBy('fechaRegistro', 'desc')
            .limit(5)
            .get();
        
        if (!recentQuery.empty) {
            displayRecentRecords(recentQuery.docs);
        }
    } catch (error) {
        console.error('Error loading recent records:', error);
    }
}

function displayRecentRecords(records) {
    const recentRecordsDiv = document.getElementById('recentRecords');
    const recordsList = document.getElementById('recordsList');
    
    recordsList.innerHTML = '';
    
    records.forEach(doc => {
        const data = doc.data();
        const recordItem = createRecordItem(data);
        recordsList.appendChild(recordItem);
    });
    
    recentRecordsDiv.style.display = 'block';
    
    // Animate appearance
    setTimeout(() => {
        recentRecordsDiv.style.opacity = '0';
        recentRecordsDiv.style.transform = 'translateY(20px)';
        recentRecordsDiv.style.transition = 'all 0.5s ease';
        
        setTimeout(() => {
            recentRecordsDiv.style.opacity = '1';
            recentRecordsDiv.style.transform = 'translateY(0)';
        }, 50);
    }, 100);
}

function createRecordItem(data) {
    const item = document.createElement('div');
    item.className = 'record-item';
    
    const date = data.fechaRegistro ? 
        data.fechaRegistro.toDate().toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }) : 'Fecha no disponible';
    
    item.innerHTML = `
        <div class="record-info">
            <div class="record-date">${date}</div>
        </div>
        <div class="record-count">
            <i class="bi bi-printer me-1"></i>
            ${data.numeroImpresiones}
        </div>
    `;
    
    return item;
}

/* ========================================
   EFECTOS VISUALES
   ======================================== */

function addInputFocusEffects() {
    const inputs = document.querySelectorAll('.form-control-sica');
    
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('input-focused');
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.classList.remove('input-focused');
        });
    });
}

// Initialize focus effects when page loads
document.addEventListener('DOMContentLoaded', addInputFocusEffects);

/* ========================================
   MANEJO DE ERRORES GLOBALES
   ======================================== */

window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    
    if (e.error && e.error.code) {
        let message = "Ha ocurrido un error inesperado.";
        
        switch(e.error.code) {
            case 'permission-denied':
                message = "No tienes permisos para realizar esta acción.";
                break;
            case 'unavailable':
                message = "El servicio no está disponible temporalmente.";
                break;
            case 'network-request-failed':
                message = "Error de conexión. Verifica tu internet.";
                break;
        }
        
        SICAComponents.notify(
            "Error",
            message,
            "error",
            "bi-exclamation-circle"
        );
    }
});

/* ========================================
   EXPORTAR FUNCIONES GLOBALES
   ======================================== */

// Hacer funciones disponibles globalmente si es necesario
window.ImpresionesPage = {
    validateAsesor,
    submitImpresiones,
    resetForm,
    loadRecentRecords
};