// event-manager.js
// Módulo para gestión de eventos y navegación

class EventManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.setupGlobalEvents();
    }

    setupGlobalEvents() {
        // Acordeones
        document.querySelectorAll('.accordion-header').forEach(header => {
            header.addEventListener('click', () => {
                this.toggleAccordion(header);
            });
        });

        // Atajos de teclado
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Errores globales
        this.setupErrorHandlers();

        console.log('🎮 Event manager configurado');
    }

    toggleAccordion(header) {
        const content = header.nextElementSibling;
        const isActive = header.classList.contains('active');
        
        // Cerrar todos los acordeones
        document.querySelectorAll('.accordion-header').forEach(h => {
            h.classList.remove('active');
            h.nextElementSibling.classList.remove('show');
        });
        
        if (!isActive) {
            header.classList.add('active');
            content.classList.add('show');
        }
    }

    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + K para enfocar búsqueda
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }
        
        // Escape para cerrar modales
        if (e.key === 'Escape') {
            const modal = document.querySelector('.modal.show');
            if (modal) {
                const bsModal = bootstrap.Modal.getInstance(modal);
                if (bsModal) {
                    bsModal.hide();
                }
            }
        }
        
        // Ctrl/Cmd + S para guardar (si hay modal abierto)
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            const modal = document.getElementById('detalleModal');
            if (modal && modal.classList.contains('show')) {
                e.preventDefault();
                if (window.detailModal) {
                    window.detailModal.saveServicioSocial();
                }
            }
        }
    }

    setupErrorHandlers() {
        // Manejar errores globales
        window.addEventListener('error', (event) => {
            console.error('Error global en servicio-social:', event.error);
            
            if (window.servicioSocialCore) {
                window.servicioSocialCore.showNotification(
                    'Error del Sistema',
                    'Se produjo un error inesperado. Recargue la página si persiste.',
                    'error'
                );
            }
        });

        // Manejar errores de promesas no capturadas
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Promise rejection no manejada:', event.reason);
            
            if (window.servicioSocialCore) {
                window.servicioSocialCore.showNotification(
                    'Error de Conexión',
                    'Problema de conectividad. Verifique su conexión.',
                    'warning'
                );
            }
        });

        // Limpiar recursos al descargar página
        window.addEventListener('beforeunload', () => {
            console.log('Limpiando recursos...');
            if (window.servicioSocialCore) {
                // Cancelar uploads en progreso, etc.
            }
        });
    }
}

// Intersection Observer para animaciones
function setupScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    document.querySelectorAll('.category-accordion').forEach(accordion => {
        observer.observe(accordion);
    });
}

// Funciones auxiliares
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function validateForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return false;
    
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            field.classList.add('is-invalid');
            isValid = false;
        } else {
            field.classList.remove('is-invalid');
        }
    });
    
    return isValid;
}

function exportData(format = 'excel') {
    console.log(`Exportando datos en formato: ${format}`);
    
    if (window.servicioSocialCore) {
        const data = window.servicioSocialCore.asesores;
        console.log('Datos para exportar:', data);
        
        window.servicioSocialCore.showNotification(
            'Exportación preparada',
            'La funcionalidad de exportación estará disponible próximamente',
            'info'
        );
    }
}

window.EventManager = EventManager;
window.setupScrollAnimations = setupScrollAnimations;
window.formatDate = formatDate;
window.validateForm = validateForm;
window.exportData = exportData;