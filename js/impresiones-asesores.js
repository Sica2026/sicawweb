/* ===================================
   Impresiones Asesores - JavaScript
   Funcionalidad simplificada sin acciones
   =================================== */

// Variables globales
let currentData = [];
let currentPage = 1;
const itemsPerPage = 10;
let currentView = 'table';
let isLoading = false;

// Variable para la base de datos (evitar conflictos con firebase-config.js)
let impresionesDB;

// Inicialización de la página
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    setupEventListeners();
    setupFormValidation();
});

// Inicializar página
function initializePage() {
    // Inicializar conexión a Firebase
    try {
        if (typeof firebase !== 'undefined' && firebase.firestore) {
            impresionesDB = firebase.firestore();
            console.log('Conexión a Firestore establecida correctamente');
        } else {
            throw new Error('Firebase no está disponible');
        }
    } catch (error) {
        console.error('Error al conectar con Firestore:', error);
        showErrorNotification("Error de Configuración", "No se pudo conectar con la base de datos");
        return;
    }
    
    // Configurar el título de la página
    if (typeof SICAComponents !== 'undefined') {
        SICAComponents.setPageTitle("Consulta de Impresiones - SICA");
        
    }
    
    // Inicializar tooltips de Bootstrap
    if (typeof bootstrap !== 'undefined') {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }
    
    // Mostrar notificación de bienvenida
    setTimeout(() => {
        if (typeof SICAComponents !== 'undefined') {
            SICAComponents.notify(
                "Sistema de Consulta", 
                "Ingresa un número de cuenta para consultar las impresiones", 
                "info", 
                "bi-info-circle"
            );
        }
    }, 1000);
}

// Configurar event listeners
function setupEventListeners() {
    const searchForm = document.getElementById('searchForm');
    const numeroCuentaInput = document.getElementById('numeroCuenta');
    
    if (!searchForm || !numeroCuentaInput) {
        console.error('Elementos del formulario no encontrados');
        return;
    }
    
    // Submit del formulario
    searchForm.addEventListener('submit', handleSearch);
    
    // Validación en tiempo real del input
    numeroCuentaInput.addEventListener('input', function(e) {
        // Solo permitir números
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
        
        // Validar en tiempo real
        validateInput(e.target);
    });
    
    // Enter en el input
    numeroCuentaInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSearch(e);
        }
    });
    
    // Autoenfoque en el input
    numeroCuentaInput.focus();
}

// Configurar validación del formulario
function setupFormValidation() {
    const numeroCuentaInput = document.getElementById('numeroCuenta');
    
    if (numeroCuentaInput) {
        // Agregar indicadores visuales
        numeroCuentaInput.addEventListener('blur', function() {
            validateInput(this);
        });
    }
}

// Validar input
function validateInput(input) {
    const value = input.value.trim();
    const isValid = value.length >= 8 && value.length <= 20 && /^\d+$/.test(value);
    
    input.classList.remove('is-valid', 'is-invalid');
    
    if (value.length > 0) {
        if (isValid) {
            input.classList.add('is-valid');
        } else {
            input.classList.add('is-invalid');
        }
    }
    
    return isValid;
}

// Manejar búsqueda
async function handleSearch(event) {
    event.preventDefault();
    
    if (isLoading) return;
    
    const numeroCuentaInput = document.getElementById('numeroCuenta');
    const numeroCuenta = numeroCuentaInput.value.trim();
    
    // Validar entrada
    if (!validateInput(numeroCuentaInput)) {
        showError("Por favor, ingresa un número de cuenta válido (8-20 dígitos).");
        numeroCuentaInput.focus();
        return;
    }
    
    try {
        // Mostrar estado de carga
        showLoading();
        isLoading = true;
        
        // Buscar datos en Firebase
        const data = await searchImpresiones(numeroCuenta);
        
        if (data.length > 0) {
            // Mostrar resultados
            displayResults(data, numeroCuenta);
            showSuccessNotification(`Se encontraron ${data.length} registros para la cuenta ${numeroCuenta}`);
        } else {
            // Mostrar estado vacío
            showEmptyState();
            showWarningNotification(`No se encontraron registros para la cuenta ${numeroCuenta}`);
        }
        
    } catch (error) {
        console.error('Error al buscar datos:', error);
        showErrorState("Error al consultar la base de datos. Por favor, intenta de nuevo.");
        showErrorNotification("Error en la consulta", "No se pudo conectar con la base de datos");
    } finally {
        hideLoading();
        isLoading = false;
    }
}

// Buscar impresiones en Firebase
async function searchImpresiones(numeroCuenta) {
    try {
        // Verificar que la conexión esté disponible
        if (!impresionesDB) {
            throw new Error('No hay conexión con la base de datos');
        }
        
        const query = await impresionesDB.collection('impresionesasesores')
            .where('numeroCuenta', '==', numeroCuenta)
            .orderBy('fechaRegistro', 'desc')
            .get();
        
        const data = [];
        query.forEach(doc => {
            const docData = doc.data();
            data.push({
                id: doc.id,
                ...docData,
                // Convertir timestamp a fecha legible si es necesario
                fechaFormateada: formatDate(docData.fechaRegistro)
            });
        });
        
        return data;
        
    } catch (error) {
        console.error('Error en la consulta Firebase:', error);
        throw error;
    }
}

// Formatear fecha
function formatDate(fechaRegistro) {
    try {
        let fecha;
        
        if (fechaRegistro && fechaRegistro.toDate) {
            // Es un Timestamp de Firebase
            fecha = fechaRegistro.toDate();
        } else if (fechaRegistro instanceof Date) {
            fecha = fechaRegistro;
        } else if (typeof fechaRegistro === 'string') {
            fecha = new Date(fechaRegistro);
        } else {
            return 'Fecha no disponible';
        }
        
        return fecha.toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        console.error('Error al formatear fecha:', error);
        return 'Fecha inválida';
    }
}

// Mostrar estado de carga
function showLoading() {
    hideAllStates();
    const loadingState = document.getElementById('loadingState');
    if (loadingState) {
        loadingState.classList.remove('d-none');
    }
    
    const btnBuscar = document.getElementById('btnBuscar');
    if (btnBuscar) {
        btnBuscar.classList.add('loading');
        btnBuscar.disabled = true;
    }
}

// Ocultar estado de carga
function hideLoading() {
    const loadingState = document.getElementById('loadingState');
    if (loadingState) {
        loadingState.classList.add('d-none');
    }
    
    const btnBuscar = document.getElementById('btnBuscar');
    if (btnBuscar) {
        btnBuscar.classList.remove('loading');
        btnBuscar.disabled = false;
    }
}

// Mostrar resultados
function displayResults(data, numeroCuenta) {
    hideAllStates();
    
    currentData = data;
    
    // OCULTAR la sección de búsqueda cuando hay resultados
    const searchSection = document.querySelector('.search-section');
    if (searchSection) {
        searchSection.classList.add('d-none');
    }
    
    // Obtener información del primer registro para mostrar datos del asesor
    const primerRegistro = data[0];
    updateAsesorInfo(primerRegistro);
    
    // Calcular estadísticas
    const totalImpresiones = data.reduce((sum, record) => sum + (record.numeroImpresiones || 0), 0);
    const limiteMaximo = 300;
    const impresionesRestantes = Math.max(0, limiteMaximo - totalImpresiones);
    const porcentajeUsado = Math.min(100, (totalImpresiones / limiteMaximo) * 100);
    
    // Actualizar tarjetas de estadísticas
    updateStatsCards(totalImpresiones, impresionesRestantes, data.length, porcentajeUsado);
    
    // Mostrar tabla/cards
    updateDataDisplay();
    
    // Mostrar sección de resultados con animación
    const resultsSection = document.getElementById('resultsSection');
    if (resultsSection) {
        resultsSection.classList.remove('d-none');
        resultsSection.classList.add('fade-in-up');
        
        // Scroll suave hacia los resultados
        setTimeout(() => {
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
    }
}

// Actualizar información del asesor
function updateAsesorInfo(registro) {
    const nombreAsesor = document.getElementById('nombreAsesor');
    const cuentaAsesor = document.getElementById('cuentaAsesor');
    
    if (nombreAsesor) {
        nombreAsesor.textContent = registro.nombreAsesor || 'Asesor no especificado';
    }
    if (cuentaAsesor) {
        cuentaAsesor.textContent = `Cuenta: ${registro.numeroCuenta || 'N/A'}`;
    }
}

// Actualizar tarjetas de estadísticas
function updateStatsCards(total, restantes, registros, porcentaje) {
    // Animación de contador para el total de impresiones
    animateCounter('totalImpresiones', 0, total, 1000);
    
    // Animación de contador para impresiones restantes
    animateCounter('impresionesRestantes', 300, restantes, 1000);
    
    // Número de registros
    animateCounter('registrosEncontrados', 0, registros, 800);
    
    // Actualizar barra de progreso
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        const porcentajeRestante = Math.max(0, 100 - porcentaje);
        
        setTimeout(() => {
            progressBar.style.width = porcentajeRestante + '%';
            
            // Cambiar color según el porcentaje usado
            progressBar.className = 'progress-bar';
            if (porcentaje > 80) {
                progressBar.classList.add('bg-danger');
            } else if (porcentaje > 60) {
                progressBar.classList.add('bg-warning');
            } else {
                progressBar.classList.add('bg-success');
            }
        }, 500);
    }
}

// Animar contador
function animateCounter(elementId, start, end, duration) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            current = end;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current).toLocaleString();
    }, 16);
}

// Actualizar visualización de datos
function updateDataDisplay() {
    if (currentView === 'table') {
        updateTableView();
    } else {
        updateCardsView();
    }
    updatePagination();
}

// Actualizar vista de tabla
function updateTableView() {
    const tableBody = document.getElementById('tableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, currentData.length);
    
    for (let i = startIndex; i < endIndex; i++) {
        const record = currentData[i];
        const row = createTableRow(record, i + 1);
        tableBody.appendChild(row);
    }
}

// Crear fila de tabla (SIN timestamp, SIN acciones)
function createTableRow(record, index) {
    const row = document.createElement('tr');
    row.className = 'slide-in-right';
    row.style.animationDelay = `${(index % itemsPerPage) * 0.1}s`;
    
    row.innerHTML = `
        <td>
            <span class="badge bg-primary rounded-pill">${index}</span>
        </td>
        <td>
            <div class="d-flex align-items-center">
                <i class="bi bi-calendar3 me-2 text-primary"></i>
                <div class="fw-bold">${record.fechaFormateada}</div>
            </div>
        </td>
        <td>
            <div class="d-flex align-items-center">
                <i class="bi bi-printer-fill me-2 text-success"></i>
                <span class="fw-bold fs-5 text-success">${record.numeroImpresiones || 0}</span>
            </div>
        </td>
    `;
    
    return row;
}

// Actualizar vista de cards
function updateCardsView() {
    const cardsContainer = document.getElementById('cardsContainer');
    if (!cardsContainer) return;
    
    cardsContainer.innerHTML = '';
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, currentData.length);
    
    for (let i = startIndex; i < endIndex; i++) {
        const record = currentData[i];
        const card = createRecordCard(record, i + 1);
        cardsContainer.appendChild(card);
    }
}

// Crear card de registro (SIN timestamp, SIN acciones)
function createRecordCard(record, index) {
    const card = document.createElement('div');
    card.className = 'record-card fade-in-up';
    card.style.animationDelay = `${(index % itemsPerPage) * 0.1}s`;
    
    card.innerHTML = `
        <div class="record-header">
            <div class="record-number">${index}</div>
            <div class="record-date">${record.fechaFormateada}</div>
        </div>
        <div class="record-body">
            <div class="record-item">
                <span class="record-label">
                    <i class="bi bi-printer me-1"></i>Impresiones
                </span>
                <span class="record-value">${record.numeroImpresiones || 0}</span>
            </div>
            <div class="record-item">
                <span class="record-label">
                    <i class="bi bi-person me-1"></i>Asesor
                </span>
                <span class="record-value">${record.nombreAsesor || 'N/A'}</span>
            </div>
            <div class="record-item">
                <span class="record-label">
                    <i class="bi bi-hash me-1"></i>Cuenta
                </span>
                <span class="record-value">${record.numeroCuenta || 'N/A'}</span>
            </div>
        </div>
    `;
    
    return card;
}

// Actualizar paginación
function updatePagination() {
    const totalPages = Math.ceil(currentData.length / itemsPerPage);
    const pagination = document.getElementById('pagination');
    
    if (!pagination) return;
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // Botón anterior
    paginationHTML += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage - 1})" aria-label="Anterior">
                <i class="bi bi-chevron-left"></i>
            </a>
        </li>
    `;
    
    // Páginas numeradas
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            paginationHTML += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
                </li>
            `;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            paginationHTML += `
                <li class="page-item disabled">
                    <span class="page-link">...</span>
                </li>
            `;
        }
    }
    
    // Botón siguiente
    paginationHTML += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage + 1})" aria-label="Siguiente">
                <i class="bi bi-chevron-right"></i>
            </a>
        </li>
    `;
    
    pagination.innerHTML = paginationHTML;
}

// Cambiar página
function changePage(page) {
    const totalPages = Math.ceil(currentData.length / itemsPerPage);
    
    if (page < 1 || page > totalPages || page === currentPage) {
        return;
    }
    
    currentPage = page;
    updateDataDisplay();
    
    // Scroll suave hacia la tabla
    const resultsSection = document.getElementById('resultsSection');
    if (resultsSection) {
        resultsSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }
}

// Cambiar vista (tabla/cards)
function toggleView(view) {
    if (view === currentView) return;
    
    currentView = view;
    
    const tableView = document.getElementById('tableView');
    const cardsView = document.getElementById('cardsView');
    const buttons = document.querySelectorAll('.table-controls .btn');
    
    // Actualizar botones activos
    buttons.forEach(btn => btn.classList.remove('active'));
    
    if (view === 'table') {
        if (tableView) tableView.classList.remove('d-none');
        if (cardsView) cardsView.classList.add('d-none');
        if (buttons[0]) buttons[0].classList.add('active');
    } else {
        if (tableView) tableView.classList.add('d-none');
        if (cardsView) cardsView.classList.remove('d-none');
        if (buttons[1]) buttons[1].classList.add('active');
    }
    
    updateDataDisplay();
}

// Mostrar estado vacío
function showEmptyState() {
    hideAllStates();
    
    // MOSTRAR la sección de búsqueda cuando no hay resultados
    const searchSection = document.querySelector('.search-section');
    if (searchSection) {
        searchSection.classList.remove('d-none');
    }
    
    const emptyState = document.getElementById('emptyState');
    if (emptyState) {
        emptyState.classList.remove('d-none');
    }
}

// Mostrar estado de error
function showErrorState(message = "Ha ocurrido un error al consultar los datos.") {
    hideAllStates();
    
    // MOSTRAR la sección de búsqueda cuando hay error
    const searchSection = document.querySelector('.search-section');
    if (searchSection) {
        searchSection.classList.remove('d-none');
    }
    
    const errorMessage = document.getElementById('errorMessage');
    const errorState = document.getElementById('errorState');
    
    if (errorMessage) {
        errorMessage.textContent = message;
    }
    if (errorState) {
        errorState.classList.remove('d-none');
    }
}

// Ocultar todos los estados
function hideAllStates() {
    const states = ['loadingState', 'resultsSection', 'emptyState', 'errorState'];
    states.forEach(stateId => {
        const element = document.getElementById(stateId);
        if (element) {
            element.classList.add('d-none');
        }
    });
}

// Reiniciar búsqueda
function resetSearch() {
    hideAllStates();
    
    // MOSTRAR la sección de búsqueda cuando se resetea
    const searchSection = document.querySelector('.search-section');
    if (searchSection) {
        searchSection.classList.remove('d-none');
    }
    
    const numeroCuenta = document.getElementById('numeroCuenta');
    if (numeroCuenta) {
        numeroCuenta.value = '';
        numeroCuenta.classList.remove('is-valid', 'is-invalid');
        numeroCuenta.focus();
    }
    currentData = [];
    currentPage = 1;
}

// Nueva consulta - función simplificada sin confirmación
function nuevaConsulta() {
    // Animación de salida para los resultados
    const resultsSection = document.getElementById('resultsSection');
    if (resultsSection && !resultsSection.classList.contains('d-none')) {
        resultsSection.style.opacity = '0';
        resultsSection.style.transform = 'translateY(-20px)';
        
        setTimeout(() => {
            resetSearch();
            
            // Scroll suave hacia el formulario de búsqueda
            const searchSection = document.querySelector('.search-section');
            if (searchSection) {
                searchSection.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
            }
            
            // Restaurar estilos
            setTimeout(() => {
                resultsSection.style.opacity = '';
                resultsSection.style.transform = '';
            }, 100);
            
        }, 300);
    } else {
        // Si no hay resultados visibles, simplemente resetear
        resetSearch();
    }
}

// Funciones de notificación
function showSuccessNotification(message) {
    if (typeof SICAComponents !== 'undefined') {
        SICAComponents.notify("Éxito", message, "success", "bi-check-circle-fill");
    } else {
        console.log("Éxito:", message);
        alert("Éxito: " + message);
    }
}

function showErrorNotification(title, message) {
    if (typeof SICAComponents !== 'undefined') {
        SICAComponents.notify(title, message, "error", "bi-exclamation-triangle-fill");
    } else {
        console.error(title + ":", message);
        alert(title + ": " + message);
    }
}

function showWarningNotification(message) {
    if (typeof SICAComponents !== 'undefined') {
        SICAComponents.notify("Atención", message, "warning", "bi-exclamation-triangle-fill");
    } else {
        console.warn("Atención:", message);
        alert("Atención: " + message);
    }
}

function showInfoNotification(message) {
    if (typeof SICAComponents !== 'undefined') {
        SICAComponents.notify("Información", message, "info", "bi-info-circle-fill");
    } else {
        console.info("Información:", message);
        alert("Información: " + message);
    }
}

function showError(message) {
    showErrorNotification("Error de Validación", message);
}

// Funciones de utilidad
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

// Manejo de errores global
window.addEventListener('error', function(event) {
    console.error('Error global:', event.error);
    showErrorNotification("Error del Sistema", "Ha ocurrido un error inesperado");
});

// Manejo de promesas rechazadas
window.addEventListener('unhandledrejection', function(event) {
    console.error('Promesa rechazada:', event.reason);
    showErrorNotification("Error de Conexión", "Error en la comunicación con el servidor");
});

// Funciones adicionales para mejorar la experiencia
function refreshData() {
    const numeroCuentaInput = document.getElementById('numeroCuenta');
    if (!numeroCuentaInput) return;
    
    const numeroCuenta = numeroCuentaInput.value.trim();
    
    if (numeroCuenta && validateInput(numeroCuentaInput)) {
        handleSearch({ preventDefault: () => {} });
    }
}

// Atajos de teclado
document.addEventListener('keydown', function(event) {
    // Ctrl + Enter para buscar
    if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault();
        const searchButton = document.getElementById('btnBuscar');
        if (searchButton && !searchButton.disabled) {
            searchButton.click();
        }
    }
    
    // Escape para limpiar/resetear
    if (event.key === 'Escape') {
        nuevaConsulta();
    }
    
    // F5 para actualizar datos
    if (event.key === 'F5' && currentData.length > 0) {
        event.preventDefault();
        refreshData();
    }
});

// Verificar dependencias al cargar
function checkDependencies() {
    const dependencies = {
        firebase: typeof firebase !== 'undefined',
        firestore: typeof firebase !== 'undefined' && firebase.firestore,
        bootstrap: typeof bootstrap !== 'undefined',
        sicaComponents: typeof SICAComponents !== 'undefined'
    };
    
    console.log('Estado de dependencias:', dependencies);
    
    if (!dependencies.firebase) {
        console.error('Firebase no está cargado. Verifica que firebase-config.js esté incluido.');
        showErrorNotification("Error de Configuración", "Firebase no está disponible");
        return false;
    }
    
    if (!dependencies.firestore) {
        console.error('Firestore no está disponible. Verifica la configuración de Firebase.');
        showErrorNotification("Error de Configuración", "Firestore no está configurado");
        return false;
    }
    
    if (!dependencies.sicaComponents) {
        console.warn('SICAComponents no está disponible. Algunas funcionalidades pueden no funcionar.');
    }
    
    if (!dependencies.bootstrap) {
        console.warn('Bootstrap JS no está disponible. Los modales pueden no funcionar.');
    }
    
    return true;
}

// Inicialización final
setTimeout(() => {
    if (checkDependencies()) {
        console.log('Sistema de consulta de impresiones inicializado correctamente');
        // Verificar elementos del DOM
        const requiredElements = [
            'searchForm', 'numeroCuenta', 'btnBuscar', 
            'loadingState', 'resultsSection', 'emptyState', 'errorState'
        ];
        
        const missingElements = requiredElements.filter(id => !document.getElementById(id));
        
        if (missingElements.length > 0) {
            console.warn('Elementos faltantes en el DOM:', missingElements);
        }
    }
}, 1000);