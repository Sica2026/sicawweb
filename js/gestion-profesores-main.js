/**
 * GESTIÓN DE PROFESORES - MAIN INITIALIZATION
 * Archivo principal de inicialización y configuración
 */

/**
 * CLASES DE UTILIDAD (Definidas primero para evitar errores de referencia)
 */

// Clase para manejo de notificaciones y utilidades
class ProfesoresUtility {
    static showNotification(title, message, type = 'info', icon = 'bi-info-circle') {
        if (window.SICAComponents && window.SICAComponents.notify) {
            window.SICAComponents.notify(title, message, type, icon);
        } else if (window.modernNav && window.modernNav.showModernNotification) {
            window.modernNav.showModernNotification(title, message, type, icon);
        } else {
            // Fallback para alert
            alert(`${title}: ${message}`);
        }
    }
    
    static setButtonLoading(button, isLoading) {
        if (isLoading) {
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }
}

// Asegurar que UtilityHelper esté disponible globalmente
if (!window.UtilityHelper) {
    window.UtilityHelper = ProfesoresUtility;
}

/**
 * FUNCIÓN PRINCIPAL DE INICIALIZACIÓN
 */

async function setupGestionProfesores() {
    try {
        console.log('Iniciando configuración de Gestión de Profesores...');
        
        // Configurar título y breadcrumbs
        setupPageConfiguration();
        
        // Configurar eventos de formularios
        setupAllFormEvents();
        
        // Configurar animaciones y efectos
        setupAnimationsAndEffects();
        
        // Configurar atajos de teclado
        setupKeyboardShortcuts();
        
        console.log('Gestión de Profesores configurada correctamente');
        
    } catch (error) {
        console.error('Error al configurar Gestión de Profesores:', error);
        UtilityHelper.showNotification(
            'Error de Inicialización',
            'Error al cargar la página. Por favor, recarga la página.',
            'error',
            'bi-exclamation-triangle'
        );
    }
}

/**
 * CONFIGURACIÓN DE PÁGINA
 */

function setupPageConfiguration() {
    // Configurar título dinámico
    if (window.SICAComponents && window.SICAComponents.setPageTitle) {
        window.SICAComponents.setPageTitle('Gestión de Profesores - SICA');
    }
    
    // Configurar breadcrumbs
    if (window.SICAComponents && window.SICAComponents.addBreadcrumbs) {
    }
}

/**
 * CONFIGURACIÓN DE EVENTOS
 */

function setupAllFormEvents() {
    // Esperar a que el DOM esté completamente cargado
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeFormEvents);
    } else {
        initializeFormEvents();
    }
}

function initializeFormEvents() {
    try {
        // Configurar eventos de formularios
        setupManualFormEvents();
        setupExcelFormEvents();
        setupEditFormEvents();
        
        // Configurar búsqueda (se configurará cuando se abra la gestión)
        setupProfessorsSearch();
        
        // Configurar eventos de modales
        setupModalEvents();
        
        console.log('Eventos de formularios configurados');
        
    } catch (error) {
        console.error('Error al configurar eventos:', error);
    }
}

function setupModalEvents() {
    // Limpiar formularios cuando se cierran los modales
    const editModal = document.getElementById('editModal');
    if (editModal) {
        editModal.addEventListener('hidden.bs.modal', () => {
            const form = document.getElementById('editForm');
            if (form) {
                form.reset();
                ValidationHelper.clearFormErrors(form);
                resetPhotoPreview('editPhotoPreview', 'editPreviewImg');
            }
        });
    }
    
    const deleteModal = document.getElementById('deleteModal');
    if (deleteModal) {
        deleteModal.addEventListener('hidden.bs.modal', () => {
            document.getElementById('deleteProfesorId').value = '';
            document.getElementById('deleteProfesorName').textContent = '';
        });
    }
}

/**
 * ANIMACIONES Y EFECTOS
 */

function setupAnimationsAndEffects() {
    // Animación de entrada para las cards de acción
    const actionCards = document.querySelectorAll('.action-card');
    actionCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 150);
    });
    
    // Efecto parallax en el header
    setupParallaxEffect();
    
    // Efectos de hover mejorados
    setupEnhancedHoverEffects();
}

function setupParallaxEffect() {
    const pageHeader = document.querySelector('.page-header');
    if (!pageHeader) return;
    
    let ticking = false;
    
    function updateParallax() {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.5;
        
        pageHeader.style.transform = `translateY(${rate}px)`;
        ticking = false;
    }
    
    function requestTick() {
        if (!ticking) {
            requestAnimationFrame(updateParallax);
            ticking = true;
        }
    }
    
    window.addEventListener('scroll', requestTick);
}

function setupEnhancedHoverEffects() {
    // Efecto de ondas en botones
    const buttons = document.querySelectorAll('.btn-action, .btn-sica');
    buttons.forEach(button => {
        button.addEventListener('click', createRippleEffect);
    });
    
    // Efecto de inclinación en cards
    const cards = document.querySelectorAll('.action-card');
    cards.forEach(card => {
        card.addEventListener('mousemove', handleCardTilt);
        card.addEventListener('mouseleave', resetCardTilt);
    });
}

function createRippleEffect(e) {
    const button = e.currentTarget;
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.classList.add('ripple');
    
    button.appendChild(ripple);
    
    setTimeout(() => {
        ripple.remove();
    }, 600);
}

function handleCardTilt(e) {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / 10;
    const rotateY = (centerX - x) / 10;
    
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
}

function resetCardTilt(e) {
    const card = e.currentTarget;
    card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateZ(0)';
}

/**
 * ATAJOS DE TECLADO
 */

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

function handleKeyboardShortcuts(e) {
    // Solo procesar atajos si no hay inputs activos
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
    }
    
    // Alt + M: Mostrar formulario manual
    if (e.altKey && e.key === 'm') {
        e.preventDefault();
        showManualForm();
        return;
    }
    
    // Alt + E: Mostrar formulario Excel
    if (e.altKey && e.key === 'e') {
        e.preventDefault();
        showExcelForm();
        return;
    }
    
    // Alt + G: Mostrar gestión
    if (e.altKey && e.key === 'g') {
        e.preventDefault();
        showManageForm();
        return;
    }
    
    // Escape: Cerrar formularios
    if (e.key === 'Escape') {
        hideAllForms();
        return;
    }
}

/**
 * FUNCIONES DE UTILIDAD ADICIONALES
 */

// Verificar conexión a Firebase
async function checkFirebaseConnection() {
    try {
        await profesoresDb.collection('test').limit(1).get();
        return true;
    } catch (error) {
        console.error('Error de conexión a Firebase:', error);
        return false;
    }
}

// Función de limpieza al salir de la página
function cleanup() {
    // Remover event listeners
    window.removeEventListener('scroll', updateParallax);
    document.removeEventListener('keydown', handleKeyboardShortcuts);
    
    // Limpiar timeouts y intervals si existen
    if (window.profesoresTimeouts) {
        window.profesoresTimeouts.forEach(timeout => clearTimeout(timeout));
    }
    
    if (window.profesoresIntervals) {
        window.profesoresIntervals.forEach(interval => clearInterval(interval));
    }
}

// Configurar limpieza al salir
window.addEventListener('beforeunload', cleanup);

/**
 * MANEJO DE ERRORES GLOBALES
 */

window.addEventListener('error', (e) => {
    console.error('Error global en gestión de profesores:', e.error);
    
    // Solo mostrar notificación si es un error crítico
    if (e.error && e.error.message && e.error.message.includes('Firebase')) {
        UtilityHelper.showNotification(
            'Error de Conexión',
            'Problema de conexión con la base de datos. Verifique su conexión a internet.',
            'error',
            'bi-wifi-off'
        );
    }
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Promesa rechazada no manejada:', e.reason);
    
    // Manejar errores específicos de Firebase
    if (e.reason && e.reason.code) {
        let message = 'Error en la operación';
        
        switch (e.reason.code) {
            case 'permission-denied':
                message = 'No tiene permisos para realizar esta operación';
                break;
            case 'unavailable':
                message = 'Servicio temporalmente no disponible';
                break;
            case 'unauthenticated':
                message = 'Sesión expirada. Por favor, inicie sesión nuevamente';
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
                break;
        }
        
        UtilityHelper.showNotification(
            'Error',
            message,
            'error',
            'bi-exclamation-triangle'
        );
    }
});

/**
 * FUNCIONES DE DESARROLLO Y DEBUG
 */

// Solo en desarrollo
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.profesoresDebug = {
        // Estado de la aplicación
        getAppState: () => AppState,
        
        // Limpiar todos los profesores (CUIDADO!)
        clearAllProfessors: async () => {
            if (confirm('¿ESTÁS SEGURO? Esto eliminará TODOS los profesores')) {
                const snapshot = await profesoresDb.collection(COLLECTION_NAME).get();
                const batch = profesoresDb.batch();
                snapshot.docs.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
                console.log('Todos los profesores eliminados');
                await loadProfessorsTable();
            }
        },
        
        // Crear profesores de prueba
        createTestProfessors: async () => {
            const testProfessors = [
                'DR. JUAN PÉREZ GARCÍA',
                'DRA. MARÍA GONZÁLEZ LÓPEZ',
                'DR. CARLOS HERNÁNDEZ RUIZ',
                'DRA. ANA MARTÍN SÁNCHEZ',
                'DR. LUIS FERNÁNDEZ TORRES'
            ];
            
            for (const nombre of testProfessors) {
                try {
                    await ProfessorsService.createProfessor({ 
                        nombre, 
                        foto: null 
                    });
                    console.log(`Creado: ${nombre}`);
                } catch (error) {
                    console.log(`Ya existe: ${nombre}`);
                }
            }
            
            if (document.getElementById('manage-form').style.display === 'block') {
                await loadProfessorsTable();
            }
        },
        
        // Verificar conexión
        testConnection: checkFirebaseConnection,
        
        // Recargar componentes
        reloadComponents: () => {
            window.location.reload();
        }
    };
    
    console.log('Funciones de debug disponibles en window.profesoresDebug');
}

/**
 * CONFIGURACIÓN DE ESTILOS CSS DINÁMICOS
 */

function addDynamicStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* Efectos de ripple para botones */
        .btn {
            position: relative;
            overflow: hidden;
        }
        
        .ripple {
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.3);
            transform: scale(0);
            animation: ripple-effect 0.6s linear;
            pointer-events: none;
        }
        
        @keyframes ripple-effect {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
        
        /* Mejoras de loading para botones */
        .btn.loading {
            pointer-events: none;
        }
        
        .btn.loading .spinner-border {
            width: 1rem;
            height: 1rem;
        }
        
        /* Efectos de transición suaves */
        .form-container {
            opacity: 0;
            transform: translateY(20px);
            transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        
        .form-container.show {
            opacity: 1;
            transform: translateY(0);
        }
        
        /* Mejoras para el drag and drop */
        .excel-upload-zone {
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        
        .excel-upload-zone.dragover {
            box-shadow: 0 0 30px rgba(32, 44, 86, 0.3);
        }
        
        /* Efectos hover para tabla */
        .table-sica tbody tr {
            transition: all 0.3s ease;
        }
        
        /* Animaciones de carga */
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .professor-photo {
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        
        /* Efectos de focus mejorados */
        .form-control:focus {
            box-shadow: 0 0 0 0.2rem rgba(172, 150, 90, 0.25);
            border-color: #ac965a;
            transform: translateY(-1px);
        }
        
        /* Estados de validación mejorados */
        .form-control.is-invalid {
            animation: shake 0.5s ease-in-out;
        }
        
        /* Mejoras responsive */
        @media (max-width: 768px) {
            .action-card {
                transform: none !important;
            }
            
            .action-card:hover {
                transform: translateY(-5px) !important;
            }
        }
    `;
    
    document.head.appendChild(style);
}

/**
 * INICIALIZACIÓN FINAL
 */

// Configurar estilos dinámicos cuando se carga el DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addDynamicStyles);
} else {
    addDynamicStyles();
}

// Performance monitoring
let performanceData = {
    startTime: performance.now(),
    loadTime: null,
    renderTime: null
};

window.addEventListener('load', () => {
    performanceData.loadTime = performance.now() - performanceData.startTime;
    console.log(`Página cargada en ${performanceData.loadTime.toFixed(2)}ms`);
});

// Exportar funciones principales para uso global
window.gestionProfesores = {
    showManualForm,
    showExcelForm,
    showManageForm,
    hideAllForms,
    loadProfessorsTable,
    clearSearch,
    editProfessor,
    deleteProfessor,
    
    // Funciones de utilidad
    utils: {
        checkConnection: checkFirebaseConnection,
        getAppState: () => AppState,
        reloadPage: () => window.location.reload()
    }
};

// Funciones de accesibilidad
function setupAccessibility() {
    // Agregar navegación por teclado para cards
    const actionCards = document.querySelectorAll('.action-card');
    actionCards.forEach((card, index) => {
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                card.click();
            }
        });
    });
    
    // Mejorar etiquetas ARIA
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.setAttribute('aria-label', 'Buscar profesores por nombre');
        searchInput.setAttribute('aria-describedby', 'search-help');
        
        // Agregar texto de ayuda oculto
        const helpText = document.createElement('div');
        helpText.id = 'search-help';
        helpText.className = 'visually-hidden';
        helpText.textContent = 'Escriba para filtrar la lista de profesores en tiempo real';
        searchInput.parentNode.appendChild(helpText);
    }
    
    // Anuncios para lectores de pantalla
    const announcer = document.createElement('div');
    announcer.id = 'sr-announcer';
    announcer.className = 'visually-hidden';
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    document.body.appendChild(announcer);
    
    window.announceToScreenReader = (message) => {
        announcer.textContent = message;
        setTimeout(() => {
            announcer.textContent = '';
        }, 1000);
    };
}

// Configurar accesibilidad cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupAccessibility);
} else {
    setupAccessibility();
}

// Función para anunciar cambios importantes
function announceChange(message) {
    if (window.announceToScreenReader) {
        window.announceToScreenReader(message);
    }
}

// Sobrescribir algunas funciones para incluir anuncios de accesibilidad
// (Solo si UtilityHelper existe)
if (window.UtilityHelper && window.UtilityHelper.showNotification) {
    const originalShowNotification = window.UtilityHelper.showNotification;
    window.UtilityHelper.showNotification = function(title, message, type, icon) {
        originalShowNotification.call(this, title, message, type, icon);
        announceChange(`${title}: ${message}`);
    };
}

console.log('Gestión de Profesores - Sistema inicializado correctamente');
console.log('Versión: 1.0.0');
console.log('Características: Manual, Excel, Gestión, Búsqueda, Validación, Accesibilidad');

// Listo para usar
window.profesoresReady = true;