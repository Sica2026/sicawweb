// Variables globales
let currentForm = null;
let panelsContainer = null;
let formAsesor = null;
let asesorSeleccionado = null;
let asesoresData = [];

// Inicialización principal
document.addEventListener('DOMContentLoaded', function() {
    initializeSICA();
    initializeAsesores();
});

/**
 * Función principal para inicializar SICA
 */
function initializeSICA() {
    updateCurrentTime();
    setupDarkModeToggle();
    setupNavigationHandlers();
    setupResponsiveHandlers();
    
    // Actualizar la hora cada segundo
    setInterval(updateCurrentTime, 1000);
    
    console.log('SICA - Sistema iniciado correctamente');
}

/**
 * Función principal para inicializar gestión de asesores
 */
function initializeAsesores() {
    initializeElements();
    setupFormEventListeners();
    loadAsesoresData();
    updateCounters();
    addLoadingAnimations();
    
    console.log('Sistema de Asesores - Iniciado correctamente');
}

/**
 * Actualizar la hora actual en el footer
 */
function updateCurrentTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    
    const timeElement = document.getElementById('currentTime');
    if (timeElement) {
        timeElement.textContent = timeString;
    }
}

/**
 * Configurar el toggle de modo oscuro
 */
function setupDarkModeToggle() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    
    if (!darkModeToggle) {
        console.error('No se encontró el elemento darkModeToggle');
        return;
    }
    
    const darkModeIcon = darkModeToggle.querySelector('i');
    
    if (!darkModeIcon) {
        console.error('No se encontró el icono dentro del darkModeToggle');
        return;
    }
    
    // Verificar si hay una preferencia guardada
    const savedTheme = localStorage.getItem('sica-theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateDarkModeIcon(savedTheme === 'dark');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        updateDarkModeIcon(false);
        localStorage.setItem('sica-theme', 'light');
    }
    
    // Manejar click en el toggle
    darkModeToggle.addEventListener('click', function(e) {
        e.preventDefault();
        toggleDarkMode();
    });
    
    function toggleDarkMode() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('sica-theme', newTheme);
        updateDarkModeIcon(newTheme === 'dark');
        
        // Agregar efecto de transición suave
        document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
        setTimeout(() => {
            document.body.style.transition = '';
        }, 300);
        
        console.log('Tema cambiado a: ' + newTheme);
    }
    
    function updateDarkModeIcon(isDark) {
        const darkModeToggle = document.getElementById('darkModeToggle');
        if (!darkModeToggle) return;
        
        const darkModeIcon = darkModeToggle.querySelector('i');
        if (!darkModeIcon) return;
        
        const linkElement = darkModeToggle;
        const textNodes = Array.from(linkElement.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
        
        if (isDark) {
            darkModeIcon.className = 'bi bi-sun me-2';
            if (textNodes.length > 0) {
                textNodes[textNodes.length - 1].textContent = 'Modo Claro';
            } else {
                linkElement.appendChild(document.createTextNode('Modo Claro'));
            }
        } else {
            darkModeIcon.className = 'bi bi-moon me-2';
            if (textNodes.length > 0) {
                textNodes[textNodes.length - 1].textContent = 'Modo Oscuro';
            } else {
                linkElement.appendChild(document.createTextNode('Modo Oscuro'));
            }
        }
    }
}

/**
 * Configurar los manejadores de navegación
 */
function setupNavigationHandlers() {
    const navLinks = document.querySelectorAll('.nav-link[data-section]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            handleNavigation(this.getAttribute('data-section'));
            
            // Actualizar estado activo
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

/**
 * Manejar la navegación entre secciones
 */
function handleNavigation(section) {
    switch(section) {
        case 'horario':
            showNotification('Sección de Horario', 'Consultando horarios disponibles...', 'info');
            break;
        case 'lista':
            showNotification('Pase de Lista', 'Accediendo al sistema de asistencia...', 'info');
            break;
        case 'asesores':
            showNotification('Gestión de Asesores', 'Sistema de gestión de asesores activo', 'success');
            break;
        case 'ingreso':
            showNotification('Ingreso', 'Redirigiendo al sistema de ingreso...', 'success');
            break;
        default:
            console.log('Sección no reconocida:', section);
    }
}

/**
 * Mostrar notificación toast
 */
function showNotification(title, message, type) {
    if (type === undefined) type = 'info';
    
    const notification = document.createElement('div');
    notification.className = 'alert alert-' + type + ' alert-dismissible fade show notification-toast';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
        max-width: 500px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        border-radius: 10px;
    `;
    
    const icon = type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle';
    
    notification.innerHTML = `
        <i class="fas fa-${icon} me-2"></i>
        <strong>${title}</strong><br>${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

/**
 * Configurar manejadores para diseño responsivo
 */
function setupResponsiveHandlers() {
    window.addEventListener('resize', handleWindowResize);
    handleWindowResize();
}

/**
 * Manejar cambios de tamaño de ventana
 */
function handleWindowResize() {
    const width = window.innerWidth;
    
    if (width < 768) {
        const navbarCollapse = document.querySelector('.navbar-collapse');
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (navbarCollapse.classList.contains('show')) {
                    const bsCollapse = new bootstrap.Collapse(navbarCollapse);
                    bsCollapse.hide();
                }
            });
        });
    }
}

// ===============================
// FUNCIONES DE GESTIÓN DE ASESORES
// ===============================

/**
 * Inicializar elementos del DOM para asesores
 */
function initializeElements() {
    panelsContainer = document.getElementById('panelsContainer');
    formAsesor = document.getElementById('formAsesor');
}

/**
 * Configurar event listeners del formulario
 */
function setupFormEventListeners() {
    const asesorForm = document.getElementById('asesorForm');
    if (asesorForm) {
        asesorForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleAsesorSubmit();
        });
    }

    // Validación en tiempo real
    const inputs = document.querySelectorAll('.form-control');
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            if (this.value.trim()) {
                validateField(this);
            }
        });
        
        input.addEventListener('input', function() {
            if (this.classList.contains('is-invalid')) {
                validateField(this);
            }
        });
        
        input.addEventListener('focus', function() {
            if (this.classList.contains('is-invalid')) {
                this.classList.remove('is-invalid');
            }
        });
    });
    
    // Validación para radio buttons
    const radioButtons = document.querySelectorAll('input[type="radio"]');
    radioButtons.forEach(radio => {
        radio.addEventListener('change', function() {
            const name = this.name;
            const radios = document.querySelectorAll('input[name="' + name + '"]');
            radios.forEach(r => {
                r.classList.remove('is-invalid');
                r.classList.add('is-valid');
            });
        });
    });
}

/**
 * Función para abrir formulario con animación
 */
function openForm(type) {
    if (currentForm) return;

    currentForm = type;
    const panelAsesor = document.getElementById('panelAsesor');
    
    // Animar salida del panel
    panelAsesor.style.transform = 'translateX(-100%)';
    panelAsesor.style.opacity = '0';
    
    setTimeout(() => {
        panelsContainer.classList.add('d-none');
        formAsesor.classList.remove('d-none');
        formAsesor.classList.add('form-reveal');
    }, 500);
}

/**
 * Función para cerrar formulario
 */
function closeForm() {
    if (!currentForm) return;

    formAsesor.style.opacity = '0';
    formAsesor.style.transform = 'translateY(-30px)';
    
    setTimeout(() => {
        formAsesor.classList.add('d-none');
        formAsesor.classList.remove('form-reveal');
        formAsesor.style.opacity = '';
        formAsesor.style.transform = '';
        
        // Resetear panel
        const panelAsesor = document.getElementById('panelAsesor');
        panelAsesor.style.transform = '';
        panelAsesor.style.opacity = '';
        
        // Mostrar panel
        panelsContainer.classList.remove('d-none');
        
        // Resetear formulario y estado
        document.getElementById('asesorForm').reset();
        resetFormState();
        
        currentForm = null;
        asesorSeleccionado = null;
    }, 300);
}

/**
 * Función para resetear estado del formulario
 */
function resetFormState() {
    const btnDarBaja = document.getElementById('btnDarBaja');
    const btnExAsesor = document.getElementById('btnExAsesor');
    
    if (btnDarBaja) btnDarBaja.classList.add('d-none');
    if (btnExAsesor) btnExAsesor.classList.add('d-none');
    
    clearValidationStates();
    
    // Resetear imagen preview
    const preview = document.getElementById('imagePreview');
    if (preview) {
        preview.innerHTML = '<span class="text-muted"><i class="fas fa-camera fa-2x"></i><br>Vista previa</span>';
        preview.classList.remove('has-image');
    }
    
    // Ocultar campos condicionales
    const fechaContainer = document.getElementById('fechaServicioContainer');
    const becaDescripcion = document.getElementById('becaDistintaDescripcion');
    
    if (fechaContainer) fechaContainer.style.display = 'none';
    if (becaDescripcion) becaDescripcion.style.display = 'none';
}

/**
 * Función para mostrar/ocultar fecha de servicio social
 */
function toggleFechaServicio() {
    const servicioSocialSi = document.getElementById('servicioSocialSi');
    const fechaContainer = document.getElementById('fechaServicioContainer');
    
    if (!servicioSocialSi || !fechaContainer) return;
    
    if (servicioSocialSi.checked) {
        fechaContainer.style.display = 'block';
        fechaContainer.classList.add('conditional-field');
    } else {
        fechaContainer.classList.add('conditional-field-hide');
        setTimeout(() => {
            fechaContainer.style.display = 'none';
            fechaContainer.classList.remove('conditional-field-hide');
        }, 300);
    }
}

/**
 * Función para mostrar/ocultar descripción de beca distinta
 */
function toggleBecaDistinta() {
    const becaDistintaSi = document.getElementById('becaDistintaSi');
    const descripcionField = document.getElementById('becaDistintaDescripcion');
    
    if (!becaDistintaSi || !descripcionField) return;
    
    if (becaDistintaSi.checked) {
        descripcionField.style.display = 'block';
        descripcionField.classList.add('conditional-field');
        descripcionField.setAttribute('required', 'true');
    } else {
        descripcionField.classList.add('conditional-field-hide');
        descripcionField.removeAttribute('required');
        setTimeout(() => {
            descripcionField.style.display = 'none';
            descripcionField.classList.remove('conditional-field-hide');
            descripcionField.value = '';
        }, 300);
    }
}

/**
 * Función para previsualizar imagen
 */
function previewImage(input) {
    const preview = document.getElementById('imagePreview');
    if (!preview) return;
    
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            preview.innerHTML = '<img src="' + e.target.result + '" alt="Preview de foto">';
            preview.classList.add('has-image');
        };
        
        reader.readAsDataURL(input.files[0]);
    } else {
        preview.innerHTML = '<span class="text-muted"><i class="fas fa-camera fa-2x"></i><br>Vista previa</span>';
        preview.classList.remove('has-image');
    }
}

/**
 * Función para limpiar formulario completamente
 */
function limpiarFormulario() {
    // Mostrar confirmación antes de limpiar
    showConfirmationModal(
        'Limpiar Formulario',
        '¿Está seguro de limpiar todos los campos del formulario? Esta acción no se puede deshacer.',
        'warning',
        () => {
            // Limpiar todos los campos del formulario
            document.getElementById('asesorForm').reset();
            
            // Limpiar estados de validación
            clearValidationStates();
            
            // Resetear preview de imagen
            const preview = document.getElementById('imagePreview');
            if (preview) {
                preview.innerHTML = '<span class="text-muted"><i class="fas fa-camera fa-2x"></i><br>Vista previa</span>';
                preview.classList.remove('has-image');
            }
            
            // Ocultar campos condicionales
            const fechaContainer = document.getElementById('fechaServicioContainer');
            const becaDescripcion = document.getElementById('becaDistintaDescripcion');
            
            if (fechaContainer) fechaContainer.style.display = 'none';
            if (becaDescripcion) becaDescripcion.style.display = 'none';
            
            // Ocultar botones de acción de búsqueda
            const btnDarBaja = document.getElementById('btnDarBaja');
            const btnExAsesor = document.getElementById('btnExAsesor');
            
            if (btnDarBaja) btnDarBaja.classList.add('d-none');
            if (btnExAsesor) btnExAsesor.classList.add('d-none');
            
            // Limpiar variables globales
            asesorSeleccionado = null;
            
            // Agregar efecto visual de limpieza
            const formSections = document.querySelectorAll('.form-section');
            formSections.forEach((section, index) => {
                setTimeout(() => {
                    section.style.backgroundColor = '#f0f8ff';
                    setTimeout(() => {
                        section.style.backgroundColor = '';
                    }, 300);
                }, index * 100);
            });
            
            showNotification('Formulario limpiado', 'Todos los campos han sido limpiados exitosamente', 'success');
        }
    );
}

/**
 * Función para pre-llenar formulario de asesor
 */
function preLlenarAsesor() {
    const campos = {
        asesorNombre: 'María González López',
        horasSemana: '20',
        nombre: 'María',
        apellidoPaterno: 'González',
        apellidoMaterno: 'López',
        sexo: 'femenino',
        fechaNacimiento: '1998-05-15',
        estadoCivil: 'soltero',
        nacionalidad: 'Mexicana',
        curp: 'GOLM980515MDFNPR03',
        correoElectronico: 'maria.gonzalez@universidad.edu.mx',
        telefonoCasa: '55-1234-5678',
        telefonoCelular: '55-9876-5432',
        calle: 'Av. Universidad 123',
        colonia: 'Ciudad Universitaria',
        municipio: 'Coyoacán',
        entidadFederativa: 'Ciudad de México',
        escuela: 'Universidad Nacional Autónoma de México',
        carrera: 'Licenciatura en Psicología',
        semestreCursando: '6',
        porcentajeCreditos: '75',
        promedio: '8.7',
        numeroCuenta: '318045789',
        procedencia: 'Ciudad de México',
        metodoInscripcion: 'primera_opcion',
        fechaInicioSS: '2024-01-15',
        administrador: 'Lic. Carlos Rodríguez',
        tipoBeca: 'pronabes'
    };
    
    // Llenar campos de texto
    Object.entries(campos).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element && value !== undefined && value !== null) {
            element.value = value;
            
            // Agregar efecto visual
            element.style.backgroundColor = '#e8f5e8';
            setTimeout(() => {
                element.style.backgroundColor = '';
            }, 1000);
            
            // Validar campo
            validateField(element);
        }
    });
    
    // Marcar radio buttons
    const servicioSi = document.getElementById('servicioSocialSi');
    const articuloNo = document.getElementById('articulo22No');
    const becaNo = document.getElementById('becaDistintaNo');
    
    if (servicioSi) servicioSi.checked = true;
    if (articuloNo) articuloNo.checked = true;
    if (becaNo) becaNo.checked = true;
    
    // Mostrar campos condicionales
    toggleFechaServicio();
    toggleBecaDistinta();
    
    showNotification('Pre-llenado exitoso', 'Formulario completado con datos de ejemplo', 'success');
}

/**
 * Función para buscar asesor
 */
function buscarAsesor() {
    const nombre = document.getElementById('asesorNombre');
    if (!nombre) return;
    
    const nombreValue = nombre.value.trim();
    
    if (!nombreValue) {
        showSearchModal();
        return;
    }
    
    // Buscar en datos almacenados
    const asesorEncontrado = asesoresData.find(asesor => 
        (asesor.nombre && asesor.nombre.toLowerCase().includes(nombreValue.toLowerCase())) ||
        (asesor.asesorNombre && asesor.asesorNombre.toLowerCase().includes(nombreValue.toLowerCase()))
    );
    
    if (asesorEncontrado) {
        fillFormFields(asesorEncontrado);
        asesorSeleccionado = asesorEncontrado;
        
        // Mostrar botones de acción
        const btnDarBaja = document.getElementById('btnDarBaja');
        const btnExAsesor = document.getElementById('btnExAsesor');
        
        if (btnDarBaja) btnDarBaja.classList.remove('d-none');
        if (btnExAsesor) btnExAsesor.classList.remove('d-none');
        
        showNotification('Asesor encontrado', 'Datos cargados correctamente', 'success');
    } else {
        showNotification('No encontrado', 'No se encontró el asesor especificado', 'warning');
    }
}

/**
 * Función para mostrar modal de búsqueda
 */
function showSearchModal() {
    const modalHTML = `
        <div class="modal fade" id="searchModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header" style="background: linear-gradient(135deg, var(--primary-blue), var(--light-blue)); color: white;">
                        <h5 class="modal-title"><i class="fas fa-search me-2"></i>Buscar Asesor</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <input type="text" class="form-control" id="searchInput" placeholder="Escriba el nombre del asesor...">
                        </div>
                        <div id="searchResults"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    const modal = new bootstrap.Modal(document.getElementById('searchModal'));
    modal.show();
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const term = this.value.toLowerCase();
            const results = asesoresData.filter(asesor => 
                (asesor.nombre && asesor.nombre.toLowerCase().includes(term)) ||
                (asesor.asesorNombre && asesor.asesorNombre.toLowerCase().includes(term)) ||
                (asesor.correoElectronico && asesor.correoElectronico.toLowerCase().includes(term))
            );
            
            displaySearchResults(results);
        });
    }
    
    document.getElementById('searchModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

/**
 * Función para mostrar resultados de búsqueda
 */
function displaySearchResults(results) {
    const container = document.getElementById('searchResults');
    if (!container) return;
    
    if (results.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">No se encontraron resultados</p>';
        return;
    }
    
    const resultsHTML = results.map(asesor => `
        <div class="card mb-2 search-result-card" onclick="selectAsesor('${asesor.id}')" style="cursor: pointer;">
            <div class="card-body p-3">
                <h6 class="card-title mb-1">${asesor.asesorNombre || asesor.nombre || 'Sin nombre'}</h6>
                <p class="card-text small text-muted mb-1">${asesor.correoElectronico || 'Sin email'}</p>
                <p class="card-text small">
                    <span class="badge bg-primary">${asesor.carrera || 'Sin carrera'}</span>
                    <span class="badge bg-success">${asesor.servicioSocial === 'si' ? 'Servicio Social' : 'Regular'}</span>
                </p>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = resultsHTML;
}

/**
 * Función para seleccionar asesor desde búsqueda
 */
function selectAsesor(id) {
    const asesor = asesoresData.find(a => a.id === id);
    if (asesor) {
        fillFormFields(asesor);
        asesorSeleccionado = asesor;
        
        // Mostrar botones de acción
        const btnDarBaja = document.getElementById('btnDarBaja');
        const btnExAsesor = document.getElementById('btnExAsesor');
        
        if (btnDarBaja) btnDarBaja.classList.remove('d-none');
        if (btnExAsesor) btnExAsesor.classList.remove('d-none');
        
        // Cerrar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('searchModal'));
        if (modal) modal.hide();
        
        showNotification('Asesor seleccionado', 'Datos cargados en el formulario', 'success');
    }
}

/**
 * Función para dar de baja
 */
function darDeBaja() {
    if (!asesorSeleccionado) {
        showNotification('Error', 'Debe buscar y seleccionar un asesor primero', 'warning');
        return;
    }
    
    showConfirmationModal(
        'Dar de Baja Asesor',
        '¿Está seguro de dar de baja al asesor ' + (asesorSeleccionado.asesorNombre || asesorSeleccionado.nombre) + '?',
        'warning',
        () => {
            asesorSeleccionado.activo = false;
            asesorSeleccionado.fechaBaja = new Date().toISOString();
            
            updateAsesorInStorage(asesorSeleccionado);
            updateCounters();
            
            showNotification('Éxito', 'Asesor dado de baja exitosamente', 'success');
            resetFormState();
        }
    );
}

/**
 * Función para enviar a ex-asesor
 */
function enviarExAsesor() {
    if (!asesorSeleccionado) {
        showNotification('Error', 'Debe buscar y seleccionar un asesor primero', 'warning');
        return;
    }
    
    showConfirmationModal(
        'Enviar a Ex-Asesor',
        '¿Está seguro de enviar al asesor ' + (asesorSeleccionado.asesorNombre || asesorSeleccionado.nombre) + ' a la categoría de Ex-Asesor?',
        'danger',
        () => {
            asesorSeleccionado.exAsesor = true;
            asesorSeleccionado.activo = false;
            asesorSeleccionado.fechaExAsesor = new Date().toISOString();
            
            updateAsesorInStorage(asesorSeleccionado);
            updateCounters();
            
            showNotification('Éxito', 'Asesor enviado a Ex-Asesor exitosamente', 'success');
            resetFormState();
        }
    );
}

/**
 * Función para mostrar modal de confirmación
 */
function showConfirmationModal(title, message, type, onConfirm) {
    const modalHTML = `
        <div class="modal fade" id="confirmModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-${type} text-white">
                        <h5 class="modal-title">${title}</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-${type}" id="confirmBtn">Confirmar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
    modal.show();
    
    const confirmBtn = document.getElementById('confirmBtn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', function() {
            onConfirm();
            modal.hide();
        });
    }
    
    document.getElementById('confirmModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

/**
 * Función para llenar campos del formulario
 */
function fillFormFields(campos) {
    // Llenar campos de texto
    Object.entries(campos).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element && value !== undefined && value !== null) {
            element.value = value;
            
            // Agregar efecto visual
            element.style.backgroundColor = '#e8f5e8';
            setTimeout(() => {
                element.style.backgroundColor = '';
            }, 1000);
            
            // Validar campo
            validateField(element);
        }
    });
    
    // Manejar radio buttons
    if (campos.servicioSocial) {
        const servicioRadio = document.getElementById(campos.servicioSocial === 'si' ? 'servicioSocialSi' : 'servicioSocialNo');
        if (servicioRadio) {
            servicioRadio.checked = true;
            toggleFechaServicio();
        }
    }
    
    if (campos.articulo22) {
        const articuloRadio = document.getElementById(campos.articulo22 === 'si' ? 'articulo22Si' : 'articulo22No');
        if (articuloRadio) {
            articuloRadio.checked = true;
        }
    }
    
    if (campos.becaDistinta) {
        const becaRadio = document.getElementById(campos.becaDistinta === 'si' ? 'becaDistintaSi' : 'becaDistintaNo');
        if (becaRadio) {
            becaRadio.checked = true;
            toggleBecaDistinta();
        }
    }
}

/**
 * Función para manejar envío del formulario
 */
function handleAsesorSubmit() {
    const formData = collectFormData();
    
    if (validateForm(formData)) {
        // Agregar loading state
        const submitBtn = document.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.classList.add('btn-loading');
        }
        
        setTimeout(() => {
            if (asesorSeleccionado) {
                // Actualizar asesor existente
                Object.assign(asesorSeleccionado, formData);
                updateAsesorInStorage(asesorSeleccionado);
                showNotification('Éxito', 'Asesor actualizado exitosamente', 'success');
            } else {
                // Crear nuevo asesor
                const nuevoAsesor = {
                    id: generateId(),
                    ...formData,
                    fechaRegistro: new Date().toISOString(),
                    activo: true,
                    exAsesor: false
                };
                
                saveAsesorToStorage(nuevoAsesor);
                showNotification('Éxito', 'Asesor registrado exitosamente', 'success');
            }
            
            updateCounters();
            
            if (submitBtn) {
                submitBtn.classList.remove('btn-loading');
            }
            
            setTimeout(() => {
                closeForm();
            }, 1500);
        }, 2000);
    }
}

/**
 * Función para recopilar datos del formulario
 */
function collectFormData() {
    const campos = [
        'asesorNombre', 'horasSemana', 'nombre', 'apellidoPaterno', 'apellidoMaterno',
        'sexo', 'fechaNacimiento', 'estadoCivil', 'nacionalidad', 'curp',
        'correoElectronico', 'telefonoCasa', 'telefonoCelular', 'calle', 'colonia',
        'municipio', 'entidadFederativa', 'escuela', 'carrera', 'semestreCursando',
        'porcentajeCreditos', 'promedio', 'numeroCuenta', 'procedencia',
        'metodoInscripcion', 'fechaInicioSS', 'administrador',
        'tipoBeca', 'becaDistintaDescripcion'
    ];
    
    const data = {};
    
    // Recopilar campos de texto
    campos.forEach(campo => {
        const element = document.getElementById(campo);
        if (element) {
            data[campo] = element.value.trim();
        }
    });
    
    // Recopilar radio buttons
    const servicioSocial = document.querySelector('input[name="servicioSocial"]:checked');
    data.servicioSocial = servicioSocial ? servicioSocial.value : '';
    
    const articulo22 = document.querySelector('input[name="articulo22"]:checked');
    data.articulo22 = articulo22 ? articulo22.value : '';
    
    const becaDistinta = document.querySelector('input[name="becaDistinta"]:checked');
    data.becaDistinta = becaDistinta ? becaDistinta.value : '';
    
    // Manejar archivo de foto
    const fotoFile = document.getElementById('foto');
    if (fotoFile && fotoFile.files[0]) {
        data.foto = fotoFile.files[0].name;
        data.fotoSize = fotoFile.files[0].size;
        data.fotoType = fotoFile.files[0].type;
    }
    
    return data;
}

/**
 * Función para validar formulario completo
 */
function validateForm(data) {
    const errors = [];
    
    // Campos requeridos básicos
    const requiredFields = {
        asesorNombre: 'Nombre del asesor',
        nombre: 'Nombre',
        apellidoPaterno: 'Apellido paterno',
        sexo: 'Sexo',
        fechaNacimiento: 'Fecha de nacimiento',
        curp: 'CURP',
        correoElectronico: 'Correo electrónico',
        telefonoCelular: 'Teléfono celular',
        escuela: 'Escuela',
        carrera: 'Carrera'
    };
    
    Object.entries(requiredFields).forEach(([field, label]) => {
        if (!data[field]) {
            errors.push(label + ' es requerido');
            const element = document.getElementById(field);
            if (element) {
                element.classList.add('is-invalid');
                if (errors.length === 1) element.focus();
            }
        }
    });
    
    // Validaciones específicas
    if (data.correoElectronico && !isValidEmail(data.correoElectronico)) {
        errors.push('El correo electrónico no es válido');
    }
    
    if (data.curp && !isValidCURP(data.curp)) {
        errors.push('El CURP no es válido (debe tener 18 caracteres)');
    }
    
    if (data.promedio && (parseFloat(data.promedio) < 0 || parseFloat(data.promedio) > 10)) {
        errors.push('El promedio debe estar entre 0 y 10');
    }
    
    if (data.porcentajeCreditos && (parseInt(data.porcentajeCreditos) < 0 || parseInt(data.porcentajeCreditos) > 100)) {
        errors.push('El porcentaje de créditos debe estar entre 0 y 100');
    }
    
    if (data.horasSemana && (parseInt(data.horasSemana) < 0 || parseInt(data.horasSemana) > 168)) {
        errors.push('Las horas por semana deben estar entre 0 y 168');
    }
    
    // Validación condicional: si servicio social es "sí", fecha es requerida
    if (data.servicioSocial === 'si' && !data.fechaInicioSS) {
        errors.push('La fecha de inicio del servicio social es requerida');
    }
    
    // Validación condicional: si beca distinta es "sí", descripción es requerida
    if (data.becaDistinta === 'si' && !data.becaDistintaDescripcion) {
        errors.push('Debe especificar el tipo de beca distinta');
    }
    
    if (errors.length > 0) {
        showNotification('Errores en el formulario', errors.join(', '), 'error');
        
        const firstError = document.querySelector('.is-invalid');
        if (firstError) {
            firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        return false;
    }
    
    return true;
}

/**
 * Función para validar campo individual
 */
function validateField(element) {
    const value = element.value.trim();
    const isRequired = element.hasAttribute('required');
    
    element.classList.remove('is-valid', 'is-invalid');
    
    if (isRequired && !value) {
        element.classList.add('is-invalid');
        return false;
    } else if (value) {
        if (element.type === 'email' && !isValidEmail(value)) {
            element.classList.add('is-invalid');
            return false;
        } else if (element.id === 'curp' && !isValidCURP(value)) {
            element.classList.add('is-invalid');
            return false;
        } else if (element.type === 'number') {
            const num = parseFloat(value);
            const min = parseFloat(element.min);
            const max = parseFloat(element.max);
            
            if ((!isNaN(min) && num < min) || (!isNaN(max) && num > max)) {
                element.classList.add('is-invalid');
                return false;
            }
        }
        
        element.classList.add('is-valid');
        return true;
    }
    
    return true;
}

/**
 * Función para limpiar estados de validación
 */
function clearValidationStates() {
    const inputs = document.querySelectorAll('.form-control');
    inputs.forEach(input => {
        input.classList.remove('is-valid', 'is-invalid');
    });
}

/**
 * Funciones de validación
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidCURP(curp) {
    const curpRegex = /^[A-Z]{4}[0-9]{6}[HM]{1}[A-Z]{2}[BCDFGHJKLMNPQRSTVWXYZ]{3}[0-9A-Z]{2}$/;
    return curpRegex.test(curp);
}

/**
 * Función para generar ID único
 */
function generateId() {
    return 'asesor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Funciones de almacenamiento
 */
function saveAsesorToStorage(asesor) {
    asesoresData.push(asesor);
    localStorage.setItem('sica-asesoresData', JSON.stringify(asesoresData));
}

function updateAsesorInStorage(asesor) {
    const index = asesoresData.findIndex(a => a.id === asesor.id);
    if (index !== -1) {
        asesoresData[index] = asesor;
        localStorage.setItem('sica-asesoresData', JSON.stringify(asesoresData));
    }
}

function loadAsesoresData() {
    const stored = localStorage.getItem('sica-asesoresData');
    asesoresData = stored ? JSON.parse(stored) : [];
}

/**
 * Función para actualizar contadores
 */
function updateCounters() {
    const stats = {
        totalAsesores: asesoresData.length,
        asesorActivos: asesoresData.filter(a => a.activo && !a.exAsesor).length,
        servicioSocial: asesoresData.filter(a => a.servicioSocial === 'si' && a.activo).length,
        exAsesores: asesoresData.filter(a => a.exAsesor).length
    };
    
    animateCounter('totalAsesores', stats.totalAsesores);
    animateCounter('asesorActivos', stats.asesorActivos);
    animateCounter('servicioSocial', stats.servicioSocial);
    animateCounter('exAsesores', stats.exAsesores);
}

/**
 * Función para animar contadores
 */
function animateCounter(elementId, targetValue) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const currentValue = parseInt(element.textContent) || 0;
    const increment = targetValue > currentValue ? 1 : -1;
    const duration = 1000;
    const steps = Math.abs(targetValue - currentValue);
    
    if (steps === 0) return;
    
    const stepTime = duration / steps;
    let current = currentValue;
    
    const timer = setInterval(() => {
        current += increment;
        element.textContent = current;
        
        if (current === targetValue) {
            clearInterval(timer);
            element.style.transform = 'scale(1.1)';
            element.style.color = 'var(--primary-gold)';
            
            setTimeout(() => {
                element.style.transform = 'scale(1)';
                element.style.color = '';
            }, 300);
        }
    }, stepTime);
}

/**
 * Función para agregar animaciones de carga
 */
function addLoadingAnimations() {
    const elements = document.querySelectorAll('.news-card, .panel-card');
    elements.forEach((element, index) => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            element.style.transition = 'all 0.6s ease';
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

// ===============================
// EVENT LISTENERS GLOBALES
// ===============================

// Manejar tecla Escape para cerrar formularios
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && currentForm) {
        closeForm();
    }
    
    // Shortcuts adicionales
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        const darkModeToggle = document.getElementById('darkModeToggle');
        if (darkModeToggle) darkModeToggle.click();
    }
});

// Manejo de errores global
window.addEventListener('error', function(e) {
    console.error('Error en la aplicación:', e.error);
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('Promise rechazada no manejada:', e.reason);
    e.preventDefault();
});

// ===============================
// UTILIDADES ADICIONALES
// ===============================

/**
 * Utilidades generales
 */
const Utils = {
    formatDate: function(date) {
        return new Intl.DateTimeFormat('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(date);
    },
    
    validateEmail: function(email) {
        return isValidEmail(email);
    },
    
    debounce: function(func, wait) {
        let timeout;
        return function executedFunction() {
            const args = arguments;
            const later = () => {
                clearTimeout(timeout);
                func.apply(this, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    smoothScrollTo: function(element) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    },
    
    generateId: function() {
        return generateId();
    }
};

/**
 * Configurar shortcuts de teclado adicionales
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + N para nuevo asesor
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            if (!currentForm) {
                openForm('asesor');
            }
        }
        
        // Ctrl/Cmd + F para buscar
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            if (currentForm) {
                buscarAsesor();
            }
        }
    });
}

/**
 * Inicializar funcionalidades avanzadas
 */
function initializeAdvancedFeatures() {
    setupKeyboardShortcuts();
}

// Llamar a las funciones adicionales después de la inicialización
setTimeout(initializeAdvancedFeatures, 1000);

// Exportar funciones para uso global
window.SICAApp = {
    Utils: Utils,
    showNotification: showNotification,
    openForm: openForm,
    closeForm: closeForm,
    preLlenarAsesor: preLlenarAsesor,
    buscarAsesor: buscarAsesor,
    darDeBaja: darDeBaja,
    enviarExAsesor: enviarExAsesor
};

// Log de inicialización completa
console.log('SICA - Sistema completo iniciado:', {
    version: '2.0',
    features: ['Modo Oscuro', 'Gestión de Asesores', 'Formularios Dinámicos', 'Validación en Tiempo Real'],
    timestamp: new Date().toISOString()
});