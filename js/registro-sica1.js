// JavaScript específico para la página de registro SICA 1

// ✅ CONFIGURACIÓN DE RUTAS PARA SUBDIRECTORIOS
const SICA_CONFIG = {
    // Detectar automáticamente si estamos en un subdirectorio
    isInSubdirectory: window.location.pathname.includes('/view/') || window.location.pathname.includes('view/'),
    
    // Rutas base según la ubicación
    get basePath() {
        return this.isInSubdirectory ? '../' : '';
    },
    
    // Rutas específicas
    get indexPath() {
        return this.basePath + 'index.html';
    },
    
    get cssPath() {
        return this.basePath + 'css/';
    },
    
    get jsPath() {
        return this.basePath + 'js/';
    }
};

// Elementos químicos hasta el número 65 (Terbio)
const elementosQuimicos = [
    { numero: 1, nombre: "Hidrógeno", simbolo: "H" },
    { numero: 2, nombre: "Helio", simbolo: "He" },
    { numero: 3, nombre: "Litio", simbolo: "Li" },
    { numero: 4, nombre: "Berilio", simbolo: "Be" },
    { numero: 5, nombre: "Boro", simbolo: "B" },
    { numero: 6, nombre: "Carbono", simbolo: "C" },
    { numero: 7, nombre: "Nitrógeno", simbolo: "N" },
    { numero: 8, nombre: "Oxígeno", simbolo: "O" },
    { numero: 9, nombre: "Flúor", simbolo: "F" },
    { numero: 10, nombre: "Neón", simbolo: "Ne" },
    { numero: 11, nombre: "Sodio", simbolo: "Na" },
    { numero: 12, nombre: "Magnesio", simbolo: "Mg" },
    { numero: 13, nombre: "Aluminio", simbolo: "Al" },
    { numero: 14, nombre: "Silicio", simbolo: "Si" },
    { numero: 15, nombre: "Fósforo", simbolo: "P" },
    { numero: 16, nombre: "Azufre", simbolo: "S" },
    { numero: 17, nombre: "Cloro", simbolo: "Cl" },
    { numero: 18, nombre: "Argón", simbolo: "Ar" },
    { numero: 19, nombre: "Potasio", simbolo: "K" },
    { numero: 20, nombre: "Calcio", simbolo: "Ca" },
    { numero: 21, nombre: "Escandio", simbolo: "Sc" },
    { numero: 22, nombre: "Titanio", simbolo: "Ti" },
    { numero: 23, nombre: "Vanadio", simbolo: "V" },
    { numero: 24, nombre: "Cromo", simbolo: "Cr" },
    { numero: 25, nombre: "Manganeso", simbolo: "Mn" },
    { numero: 26, nombre: "Hierro", simbolo: "Fe" },
    { numero: 27, nombre: "Cobalto", simbolo: "Co" },
    { numero: 28, nombre: "Níquel", simbolo: "Ni" },
    { numero: 29, nombre: "Cobre", simbolo: "Cu" },
    { numero: 30, nombre: "Zinc", simbolo: "Zn" },
    { numero: 31, nombre: "Galio", simbolo: "Ga" },
    { numero: 32, nombre: "Germanio", simbolo: "Ge" },
    { numero: 33, nombre: "Arsénico", simbolo: "As" },
    { numero: 34, nombre: "Selenio", simbolo: "Se" },
    { numero: 35, nombre: "Bromo", simbolo: "Br" },
    { numero: 36, nombre: "Kriptón", simbolo: "Kr" },
    { numero: 37, nombre: "Rubidio", simbolo: "Rb" },
    { numero: 38, nombre: "Estroncio", simbolo: "Sr" },
    { numero: 39, nombre: "Itrio", simbolo: "Y" },
    { numero: 40, nombre: "Zirconio", simbolo: "Zr" },
    { numero: 41, nombre: "Niobio", simbolo: "Nb" },
    { numero: 42, nombre: "Molibdeno", simbolo: "Mo" },
    { numero: 43, nombre: "Tecnecio", simbolo: "Tc" },
    { numero: 44, nombre: "Rutenio", simbolo: "Ru" },
    { numero: 45, nombre: "Rodio", simbolo: "Rh" },
    { numero: 46, nombre: "Paladio", simbolo: "Pd" },
    { numero: 47, nombre: "Plata", simbolo: "Ag" },
    { numero: 48, nombre: "Cadmio", simbolo: "Cd" },
    { numero: 49, nombre: "Indio", simbolo: "In" },
    { numero: 50, nombre: "Estaño", simbolo: "Sn" },
    { numero: 51, nombre: "Antimonio", simbolo: "Sb" },
    { numero: 52, nombre: "Telurio", simbolo: "Te" },
    { numero: 53, nombre: "Yodo", simbolo: "I" },
    { numero: 54, nombre: "Xenón", simbolo: "Xe" },
    { numero: 55, nombre: "Cesio", simbolo: "Cs" },
    { numero: 56, nombre: "Bario", simbolo: "Ba" },
    { numero: 57, nombre: "Lantano", simbolo: "La" },
    { numero: 58, nombre: "Cerio", simbolo: "Ce" },
    { numero: 59, nombre: "Praseodimio", simbolo: "Pr" },
    { numero: 60, nombre: "Neodimio", simbolo: "Nd" },
    { numero: 61, nombre: "Prometio", simbolo: "Pm" },
    { numero: 62, nombre: "Samario", simbolo: "Sm" },
    { numero: 63, nombre: "Europio", simbolo: "Eu" },
    { numero: 64, nombre: "Gadolinio", simbolo: "Gd" },
    { numero: 65, nombre: "Terbio", simbolo: "Tb" }
];

// Inicializar la página
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    setupEventListeners();
    loadElementsIntoSelect();
    // trackPageView(); // Removido - no se necesita estadísticas
});

function initializePage() {
    // Configurar título usando las funciones de la plantilla
    if (window.SICAComponents) {
        SICAComponents.setPageTitle("Registro de Préstamos SICA 1");
        // SICAComponents.addBreadcrumbs() - Removido por solicitud del usuario
    }
}

function setupEventListeners() {
    const form = document.getElementById('registroForm');
    const numeroCuenta = document.getElementById('numeroCuenta');
    const equipoSelect = document.getElementById('equipoSelect');

    // Manejar envío del formulario
    form.addEventListener('submit', handleFormSubmit);

    // Validación en tiempo real
    numeroCuenta.addEventListener('input', validateNumeroCuenta);
    equipoSelect.addEventListener('change', validateEquipoSelect);

    // Limpiar errores al enfocar
    numeroCuenta.addEventListener('focus', () => clearFieldError(numeroCuenta));
    equipoSelect.addEventListener('focus', () => clearFieldError(equipoSelect));
}

function loadElementsIntoSelect() {
    const equipoSelect = document.getElementById('equipoSelect');
    
    elementosQuimicos.forEach(elemento => {
        const option = document.createElement('option');
        option.value = elemento.numero;
        option.textContent = `${elemento.numero} - ${elemento.nombre} (${elemento.simbolo})`;
        equipoSelect.appendChild(option);
    });
}

function handleFormSubmit(e) {
    e.preventDefault();
    
    const submitButton = e.target.querySelector('button[type="submit"]');
    const hideLoading = showLoading(submitButton);
    
    if (validateForm()) {
        // Simular envío
        setTimeout(() => {
            hideLoading();
            showSuccess();
            resetForm();
        }, 2000);
    } else {
        hideLoading();
    }
}

function validateForm() {
    const numeroCuenta = document.getElementById('numeroCuenta');
    const equipoSelect = document.getElementById('equipoSelect');
    let isValid = true;

    // Validar número de cuenta
    if (!validateNumeroCuenta()) {
        isValid = false;
    }

    // Validar selección de equipo
    if (!validateEquipoSelect()) {
        isValid = false;
    }

    return isValid;
}

function validateNumeroCuenta() {
    const numeroCuenta = document.getElementById('numeroCuenta');
    const value = numeroCuenta.value.trim();
    
    if (!value) {
        showFieldError(numeroCuenta, 'El número de cuenta es requerido');
        return false;
    }
    
    if (value.length < 8) {
        showFieldError(numeroCuenta, 'El número de cuenta debe tener al menos 8 caracteres');
        return false;
    }
    
    if (!/^\d+$/.test(value)) {
        showFieldError(numeroCuenta, 'El número de cuenta solo debe contener números');
        return false;
    }
    
    clearFieldError(numeroCuenta);
    return true;
}

function validateEquipoSelect() {
    const equipoSelect = document.getElementById('equipoSelect');
    
    if (!equipoSelect.value) {
        showFieldError(equipoSelect, 'Debe seleccionar un equipo');
        return false;
    }
    
    clearFieldError(equipoSelect);
    return true;
}

function showFieldError(field, message) {
    // Limpiar errores previos
    clearFieldError(field);
    
    field.classList.add('is-invalid');
    
    const feedback = document.createElement('div');
    feedback.className = 'invalid-feedback';
    feedback.textContent = message;
    field.parentNode.appendChild(feedback);
}

function clearFieldError(field) {
    field.classList.remove('is-invalid');
    
    const feedback = field.parentNode.querySelector('.invalid-feedback');
    if (feedback) {
        feedback.remove();
    }
}

function showLoading(button) {
    const originalText = button.innerHTML;
    button.classList.add('btn-loading');
    button.disabled = true;
    
    return function() {
        button.classList.remove('btn-loading');
        button.innerHTML = originalText;
        button.disabled = false;
    };
}

function showSuccess() {
    const numeroCuenta = document.getElementById('numeroCuenta').value;
    const equipoNumero = document.getElementById('equipoSelect').value;
    const elemento = elementosQuimicos.find(el => el.numero == equipoNumero);
    
    const message = `Registro exitoso para la cuenta ${numeroCuenta} con el equipo ${equipoNumero} - ${elemento.nombre} (${elemento.simbolo})`;
    
    // Usar sistema de notificaciones de la plantilla si está disponible
    if (window.SICAComponents && window.SICAComponents.notify) {
        window.SICAComponents.notify(
            "¡Registro Exitoso!",
            message,
            "success",
            "bi-check-circle-fill"
        );
    } else {
        // Fallback: crear alerta personalizada
        showAlert(message, 'success');
    }
}

function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert-sica alert-sica-${type}`;
    alertDiv.innerHTML = `
        <i class="bi bi-${type === 'success' ? 'check-circle-fill' : 'exclamation-triangle-fill'} me-2"></i>
        ${message}
    `;
    
    const form = document.getElementById('registroForm');
    form.insertBefore(alertDiv, form.firstChild);
    
    // Remover alerta después de 5 segundos
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

function resetForm() {
    document.getElementById('registroForm').reset();
    
    // Limpiar cualquier error que pueda quedar
    const fields = document.querySelectorAll('.is-invalid');
    fields.forEach(field => clearFieldError(field));
}

// Función para buscar elementos por nombre o símbolo
function searchElement(query) {
    const results = elementosQuimicos.filter(elemento => 
        elemento.nombre.toLowerCase().includes(query.toLowerCase()) ||
        elemento.simbolo.toLowerCase().includes(query.toLowerCase())
    );
    
    return results;
}

// Función para obtener información del elemento seleccionado
function getSelectedElementInfo() {
    const equipoSelect = document.getElementById('equipoSelect');
    const selectedValue = equipoSelect.value;
    
    if (selectedValue) {
        return elementosQuimicos.find(elemento => elemento.numero == selectedValue);
    }
    
    return null;
}

// Exportar funciones para uso global
window.SICARegistro = {
    searchElement,
    getSelectedElementInfo,
    validateForm,
    resetForm
};

// ✅ SOLUCIÓN: Sobrescribir la función de navegación al inicio
// para que funcione correctamente desde la carpeta view
if (window.SICAModern) {
    // Sobrescribir el método goHome para páginas en subdirectorios
    const originalGoHome = window.SICAModern.goHome;
    window.SICAModern.goHome = function() {
        // Detectar si estamos en un subdirectorio
        const currentPath = window.location.pathname;
        const isInSubdirectory = currentPath.includes('/view/') || currentPath.includes('view/');
        
        if (isInSubdirectory) {
            // Si estamos en view/, ir un nivel arriba
            window.location.href = SICA_CONFIG.indexPath;
        } else {
            // Si no, usar la función original
            if (originalGoHome) {
                originalGoHome();
            } else {
                window.location.href = 'index.html';
            }
        }
        
        // Mostrar notificación si está disponible
        if (window.modernNav && window.modernNav.showModernNotification) {
            window.modernNav.showModernNotification(
                'Navegando al Inicio',
                'Regresando a la página principal...',
                'info',
                'bi-house-fill'
            );
        }
    };
}

// También sobrescribir la función del navigation.js si está disponible
document.addEventListener('DOMContentLoaded', function() {
    // Esperar a que se cargue el sistema de navegación
    setTimeout(() => {
        if (window.modernNav && window.modernNav.navigateToHome) {
            // Sobrescribir el método navigateToHome del objeto modernNav
            window.modernNav.navigateToHome = function() {
                const currentPath = window.location.pathname;
                const isInSubdirectory = currentPath.includes('/view/') || currentPath.includes('view/');
                
                if (isInSubdirectory) {
                    window.location.href = SICA_CONFIG.indexPath;
                } else {
                    window.location.href = 'index.html';
                }
                
                this.showModernNotification(
                    'Navegando al Inicio',
                    'Regresando a la página principal...',
                    'info',
                    'bi-house-fill'
                );
            };
        }
    }, 1000);
});