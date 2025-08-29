// folio-config.js - Módulo de configuración de documentos
class FolioConfig {
    constructor() {
        this.currentData = {};
        this.validators = {};
        this.setupValidators();
    }

    // ================================
    // INICIALIZACIÓN
    // ================================
    init() {
        console.log('⚙️ Inicializando FolioConfig...');
        this.setupEventListeners();
        this.setupFormValidation();
        console.log('✅ FolioConfig inicializado');
    }

    setupEventListeners() {
        // Eventos de cambio en los campos del formulario
        document.addEventListener('input', (e) => {
            if (e.target.matches('#configForm input, #configForm select, #configForm textarea')) {
                this.handleFieldChange(e.target);
            }
        });

        // Validación en tiempo real del folio
        const folioInput = document.getElementById('folioInput');
        if (folioInput) {
            folioInput.addEventListener('input', (e) => this.validateFolio(e.target));
            folioInput.addEventListener('blur', (e) => this.formatFolio(e.target));
        }

        // Botones de zoom en preview
        const btnZoomIn = document.getElementById('btnZoomIn');
        const btnZoomOut = document.getElementById('btnZoomOut');
        
        if (btnZoomIn) {
            btnZoomIn.addEventListener('click', () => this.adjustZoom(1.1));
        }
        
        if (btnZoomOut) {
            btnZoomOut.addEventListener('click', () => this.adjustZoom(0.9));
        }
    }

    setupValidators() {
        this.validators = {
            folio: (value) => {
                if (!value) return 'El folio es requerido';
                if (!/^[A-Z]{2}\/\d{3}\/\d{4}$/.test(value)) {
                    return 'Formato: XX/000/YYYY (ej: CA/001/2025)';
                }
                return null;
            },

            fechaInicio: (value) => {
                if (!value) return 'La fecha de inicio es requerida';
                const fecha = new Date(value);
                if (fecha > new Date()) {
                    return 'La fecha de inicio no puede ser futura';
                }
                return null;
            },

            fechaTermino: (value, formData) => {
                if (!value) return 'La fecha de término es requerida';
                if (formData.fechaInicio && value <= formData.fechaInicio) {
                    return 'La fecha de término debe ser posterior al inicio';
                }
                return null;
            },

            clavePrograma: (value) => {
                if (!value) return 'La clave del programa es requerida';
                if (value.length < 5) return 'Clave muy corta';
                return null;
            },

            numeroCuenta: (value) => {
                if (!value) return 'El número de cuenta es requerido';
                if (!/^\d{8,10}$/.test(value)) {
                    return 'Debe tener entre 8 y 10 dígitos';
                }
                return null;
            }
        };
    }

    // ================================
    // MANEJO DE FORMULARIOS
    // ================================
    handleFieldChange(field) {
        const { name, value } = field;
        
        // Actualizar datos actuales
        this.currentData[name] = value;
        
        // Validar campo
        this.validateField(field);
        
        // Actualizar vista previa si está disponible
        this.debouncePreviewUpdate();
        
        // Calcular fechas automáticamente si es necesario
        if (name === 'fechaInicio') {
            this.calculateFechaTermino();
        }
    }

    validateField(field) {
        const { id, value } = field;
        const validator = this.validators[id];
        
        if (validator) {
            const error = validator(value, this.currentData);
            this.showFieldValidation(field, error);
            return !error;
        }
        
        return true;
    }

    showFieldValidation(field, error) {
        // Remover validación anterior
        field.classList.remove('is-valid', 'is-invalid');
        
        const existingFeedback = field.parentNode.querySelector('.invalid-feedback, .valid-feedback');
        if (existingFeedback) {
            existingFeedback.remove();
        }
        
        if (error) {
            // Mostrar error
            field.classList.add('is-invalid');
            const feedback = document.createElement('div');
            feedback.className = 'invalid-feedback';
            feedback.textContent = error;
            field.parentNode.appendChild(feedback);
        } else if (field.value) {
            // Mostrar éxito
            field.classList.add('is-valid');
            const feedback = document.createElement('div');
            feedback.className = 'valid-feedback';
            feedback.textContent = '✓ Válido';
            field.parentNode.appendChild(feedback);
        }
    }

    validateAllFields() {
        const form = document.getElementById('configForm');
        if (!form) return true;
        
        const fields = form.querySelectorAll('input, select, textarea');
        let isValid = true;
        
        fields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });
        
        // Validar folio también
        const folioInput = document.getElementById('folioInput');
        if (folioInput && !this.validateField(folioInput)) {
            isValid = false;
        }
        
        return isValid;
    }

    // ================================
    // MANEJO DE FOLIOS
    // ================================
    validateFolio(input) {
        const value = input.value.toUpperCase();
        const error = this.validators.folio(value);
        
        this.showFieldValidation(input, error);
        
        // Mostrar sugerencias si hay error
        if (error && value) {
            this.showFolioSuggestions(input, value);
        } else {
            this.hideFolioSuggestions(input);
        }
        
        return !error;
    }

    formatFolio(input) {
        let value = input.value.toUpperCase().replace(/[^A-Z0-9\/]/g, '');
        
        // Auto-formatear mientras escribe
        if (value.length >= 2 && !value.includes('/')) {
            value = value.substring(0, 2) + '/' + value.substring(2);
        }
        
        if (value.length >= 6 && value.split('/').length === 2) {
            const parts = value.split('/');
            if (parts[1].length >= 3) {
                value = parts[0] + '/' + parts[1].substring(0, 3) + '/' + parts[1].substring(3);
            }
        }
        
        input.value = value;
        this.validateFolio(input);
    }

    showFolioSuggestions(input, value) {
        this.hideFolioSuggestions(input);
        
        const suggestions = this.generateFolioSuggestions(value);
        if (suggestions.length === 0) return;
        
        const suggestionsList = document.createElement('div');
        suggestionsList.className = 'folio-suggestions mt-2';
        suggestionsList.innerHTML = `
            <div class="border rounded p-2 bg-light">
                <small class="text-muted d-block mb-1">Sugerencias:</small>
                ${suggestions.map(suggestion => `
                    <button type="button" 
                            class="btn btn-sm btn-outline-primary me-1 mb-1 folio-suggestion"
                            data-folio="${suggestion}">
                        ${suggestion}
                    </button>
                `).join('')}
            </div>
        `;
        
        input.parentNode.appendChild(suggestionsList);
        
        // Agregar listeners para las sugerencias
        suggestionsList.querySelectorAll('.folio-suggestion').forEach(btn => {
            btn.addEventListener('click', () => {
                input.value = btn.dataset.folio;
                this.validateFolio(input);
                this.hideFolioSuggestions(input);
            });
        });
    }

    hideFolioSuggestions(input) {
        const existing = input.parentNode.querySelector('.folio-suggestions');
        if (existing) {
            existing.remove();
        }
    }

    generateFolioSuggestions(value) {
        const suggestions = [];
        const year = new Date().getFullYear();
        
        // Si solo tiene letras, sugerir formato completo - solo CI ahora
        if (/^[A-Z]{1,2}$/.test(value)) {
            if ('CI'.startsWith(value) || value.length === 2) {
                suggestions.push(`CI/001/${year}`);
            }
        }
        
        // Si tiene formato parcial, completar
        if (/^[A-Z]{2}\/\d{1,3}$/.test(value)) {
            const parts = value.split('/');
            const num = parts[1].padStart(3, '0');
            suggestions.push(`${parts[0]}/${num}/${year}`);
        }
        
        return suggestions.slice(0, 3);
    }

    // ================================
    // CÁLCULOS AUTOMÁTICOS
    // ================================
    calculateFechaTermino() {
        const fechaInicioInput = document.getElementById('fechaInicio');
        const fechaTerminoInput = document.getElementById('fechaTermino');
        
        if (!fechaInicioInput?.value || fechaTerminoInput?.value) return;
        
        // Evitar problemas de zona horaria
        const [year, month, day] = fechaInicioInput.value.split('-');
        const fechaInicio = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        
        // Agregar 6 meses por defecto
        const fechaTermino = new Date(fechaInicio);
        fechaTermino.setMonth(fechaTermino.getMonth() + 6);
        
        // Convertir de vuelta a formato YYYY-MM-DD
        const year2 = fechaTermino.getFullYear();
        const month2 = String(fechaTermino.getMonth() + 1).padStart(2, '0');
        const day2 = String(fechaTermino.getDate()).padStart(2, '0');
        
        fechaTerminoInput.value = `${year2}-${month2}-${day2}`;
        
        // Mostrar notificación
        this.showFieldNotification(fechaTerminoInput, 'Fecha calculada automáticamente (6 meses)', 'info');
    }

    showFieldNotification(field, message, type = 'info') {
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = `field-notification alert alert-${type} alert-dismissible fade show mt-1`;
        notification.style.fontSize = '0.8rem';
        notification.style.padding = '0.5rem';
        notification.innerHTML = `
            <i class="bi bi-info-circle me-1"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" style="font-size: 0.7rem;"></button>
        `;
        
        // Insertar después del campo
        field.parentNode.insertBefore(notification, field.nextSibling);
        
        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    // ================================
    // VISTA PREVIA
    // ================================
    debouncePreviewUpdate() {
        if (this.previewTimeout) {
            clearTimeout(this.previewTimeout);
        }
        
        this.previewTimeout = setTimeout(() => {
            this.updatePreview();
        }, 500);
    }

    updatePreview() {
        if (window.documentPreview && window.folioManager?.currentDocType) {
            const formData = this.collectFormData();
            window.documentPreview.updatePreview(window.folioManager.currentDocType, formData);
        }
    }

    collectFormData() {
        const data = {};
        
        // Recopilar datos del formulario de configuración
        const form = document.getElementById('configForm');
        if (form) {
            const inputs = form.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                data[input.id] = input.value;
            });
        }
        
        // Agregar folio
        const folioInput = document.getElementById('folioInput');
        if (folioInput) {
            data.folio = folioInput.value;
        }
        
        return data;
    }

    adjustZoom(factor) {
        const previewDocument = document.getElementById('previewDocument');
        const zoomLevel = document.getElementById('zoomLevel');
        
        if (!previewDocument || !zoomLevel) {
            console.log('Elementos de zoom no encontrados, saltando ajuste');
            return;
        }
        
        try {
            const currentZoom = parseFloat(previewDocument.style.transform.replace(/scale\(([^)]+)\)/, '$1') || 1);
            const newZoom = Math.max(0.5, Math.min(2.0, currentZoom * factor));
            
            previewDocument.style.transform = `scale(${newZoom})`;
            previewDocument.style.transformOrigin = 'top left';
            
            zoomLevel.textContent = `${Math.round(newZoom * 100)}%`;
            
            // Ajustar scroll container si es necesario
            const previewContainer = document.querySelector('.preview-container');
            if (previewContainer) {
                previewContainer.style.overflow = newZoom > 1 ? 'auto' : 'hidden';
            }
        } catch (error) {
            console.log('Error ajustando zoom:', error);
        }
    }

    // ================================
    // VALIDACIÓN AVANZADA
    // ================================
    setupFormValidation() {
        // Validación personalizada para fechas
        this.setupDateValidation();
        
        // Validación de clave de programa
        this.setupProgramValidation();
        
        // Validación de nombres
        this.setupNameValidation();
    }

    setupDateValidation() {
        const fechaInputs = document.querySelectorAll('input[type="date"]');
        
        fechaInputs.forEach(input => {
            input.addEventListener('change', () => {
                this.validateDateRange(input);
            });
        });
    }

    validateDateRange(input) {
        // Evitar problemas de zona horaria
        const [year, month, day] = input.value.split('-');
        const value = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalizar hora para comparación
        
        const maxDate = new Date(today);
        maxDate.setFullYear(today.getFullYear() + 1);
        
        let error = null;
        
        if (input.id === 'fechaInicio' && value > today) {
            error = 'La fecha de inicio no puede ser futura';
        } else if (value > maxDate) {
            error = 'La fecha no puede ser mayor a un año';
        }
        
        this.showFieldValidation(input, error);
    }

    setupProgramValidation() {
        const claveInput = document.getElementById('clavePrograma');
        
        if (claveInput) {
            claveInput.addEventListener('input', () => {
                claveInput.value = claveInput.value.toUpperCase();
            });
        }
    }

    setupNameValidation() {
        const nombreInputs = document.querySelectorAll('#nombreAsesor');
        
        nombreInputs.forEach(input => {
            input.addEventListener('input', () => {
                // Capitalizar nombres
                input.value = this.capitalizeNames(input.value);
            });
        });
    }

    capitalizeNames(name) {
        return name.toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    // ================================
    // UTILIDADES
    // ================================
    resetForm() {
        const form = document.getElementById('configForm');
        if (form) {
            form.reset();
            
            // Limpiar validaciones
            const fields = form.querySelectorAll('.is-valid, .is-invalid');
            fields.forEach(field => {
                field.classList.remove('is-valid', 'is-invalid');
            });
            
            // Limpiar feedback
            const feedback = form.querySelectorAll('.invalid-feedback, .valid-feedback');
            feedback.forEach(fb => fb.remove());
        }
        
        // Limpiar folio completamente
        this.resetFolioField();
        
        // Resetear zoom
        this.adjustZoom(1);
        
        // Limpiar datos
        this.currentData = {};
    }

    resetFolioField() {
        const folioInput = document.getElementById('folioInput');
        if (folioInput) {
            folioInput.value = '';
            folioInput.classList.remove('is-valid', 'is-invalid', 'border-success', 'border-info', 'border-warning', 'border-danger');
            
            // Remover todos los tipos de feedback
            const feedbacks = folioInput.parentNode.querySelectorAll('.invalid-feedback, .valid-feedback, .folio-suggestions');
            feedbacks.forEach(fb => fb.remove());
            
            // Remover cualquier notificación de campo
            const notifications = folioInput.parentNode.querySelectorAll('.field-notification');
            notifications.forEach(notif => notif.remove());
        }
    }

    exportFormData() {
        return {
            ...this.collectFormData(),
            timestamp: new Date().toISOString(),
            valid: this.validateAllFields()
        };
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Esperar a que otros módulos estén disponibles
    const initConfig = () => {
        if (window.folioManager) {
            window.folioConfig = new FolioConfig();
            window.folioConfig.init();
        } else {
            setTimeout(initConfig, 100);
        }
    };
    
    setTimeout(initConfig, 800);
});

// Exportar para uso global
window.FolioConfig = FolioConfig;