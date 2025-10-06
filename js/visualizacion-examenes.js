/**
 * VISUALIZACIÓN DE EXÁMENES DEPARTAMENTALES
 * Página pública sin autenticación
 */

// Estado de la aplicación
const viewState = {
    examenes: [],
    fechas: [],
    fechaSeleccionada: null,
    examenesDelDia: [],
    searchTerm: ''
};

// Mapa de colores por sala
const salaColors = {
    'SICA 1': '#3b5998',
    'SICA 2': '#1976d2',
    'SICA 3': '#8b5cf6',
    'SICA 4': '#e91e63',
    'Salón Inteligente 1': '#ff9800',
    'Salón Inteligente 2': '#f57c00'
};

/**
 * Inicialización
 */
document.addEventListener('DOMContentLoaded', async () => {
    try {
        showLoading();
        await loadExamenes();
        initializeControls();
        hideLoading();
    } catch (error) {
        console.error('Error al inicializar:', error);
        showError('No se pudieron cargar los exámenes');
    }
});

/**
 * Cargar exámenes desde Firestore
 */
async function loadExamenes() {
    try {
        const snapshot = await db.collection('departamentales')
            .orderBy('fechaExamen', 'desc')
            .get();
        
        viewState.examenes = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // Extraer fechas únicas
        const fechasSet = new Set();
        viewState.examenes.forEach(examen => {
            if (examen.fechaExamen) {
                fechasSet.add(examen.fechaExamen);
            }
        });
        
        viewState.fechas = Array.from(fechasSet).sort().reverse();
        
        // Poblar selector de fechas
        populateFechaSelector();
        
        // Seleccionar la primera fecha disponible
        if (viewState.fechas.length > 0) {
            viewState.fechaSeleccionada = viewState.fechas[0];
            document.getElementById('fechaSelector').value = viewState.fechaSeleccionada;
            filterExamenesByFecha();
            renderCalendar();
        } else {
            showEmptyState('No hay exámenes programados');
        }
        
    } catch (error) {
        console.error('Error al cargar exámenes:', error);
        throw error;
    }
}

/**
 * Poblar selector de fechas
 */
function populateFechaSelector() {
    const selector = document.getElementById('fechaSelector');
    
    if (viewState.fechas.length === 0) {
        selector.innerHTML = '<option value="">No hay fechas disponibles</option>';
        return;
    }
    
    selector.innerHTML = viewState.fechas.map(fecha => {
        const fechaObj = new Date(fecha + 'T00:00:00');
        const fechaFormateada = fechaObj.toLocaleDateString('es-MX', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        return `<option value="${fecha}">${fechaFormateada}</option>`;
    }).join('');
}

/**
 * Filtrar exámenes por fecha seleccionada
 */
function filterExamenesByFecha() {
    if (!viewState.fechaSeleccionada) {
        viewState.examenesDelDia = [];
        return;
    }
    
    viewState.examenesDelDia = viewState.examenes.filter(examen => 
        examen.fechaExamen === viewState.fechaSeleccionada
    );
}

/**
 * Renderizar calendario
 */
function renderCalendar() {
    const calendarGrid = document.getElementById('calendarGrid');
    
    if (viewState.examenesDelDia.length === 0) {
        showEmptyState('No hay exámenes para esta fecha');
        return;
    }
    
    // Determinar rango de horas
    let minHora = 24;
    let maxHora = 0;
    
    viewState.examenesDelDia.forEach(examen => {
        const [horaI] = examen.horaInicio.split(':').map(Number);
        const [horaF] = examen.horaFinal.split(':').map(Number);
        minHora = Math.min(minHora, horaI);
        maxHora = Math.max(maxHora, horaF);
    });
    
    // Generar slots de hora
    const horas = [];
    for (let h = minHora; h <= maxHora; h++) {
        horas.push(h);
    }
    
    // Calcular número de filas para el grid (cada hora = 1 fila)
    const numFilas = horas.length;
    
    // Construir grid con CSS Grid
    calendarGrid.style.gridTemplateRows = `repeat(${numFilas}, minmax(80px, auto))`;
    
    let gridHTML = '';
    
    // Primero, agregar todas las columnas de tiempo
    horas.forEach((hora, index) => {
        const horaStr = `${hora.toString().padStart(2, '0')}:00`;
        gridHTML += `
            <div class="time-slot" style="grid-row: ${index + 1}; grid-column: 1;">${horaStr}</div>
        `;
    });
    
    // Ahora, agregar los slots de eventos vacíos
    horas.forEach((hora, index) => {
        gridHTML += `
            <div class="events-slot" style="grid-row: ${index + 1}; grid-column: 2;" data-hora="${hora}"></div>
        `;
    });
    
    calendarGrid.innerHTML = gridHTML;
    
    // Ahora agregar los bloques de exámenes con posicionamiento absoluto
    renderExamBlocksWithSpan(horas, minHora);
    
    // Agregar event listeners a los bloques
    attachBlockListeners();
}

/**
 * Crear wrapper si no existe
 */
function createWrapper(slotEl) {
    const wrapper = document.createElement('div');
    wrapper.className = 'events-wrapper';
    slotEl.appendChild(wrapper);
    return wrapper;
}

/**
 * Renderizar bloques de exámenes con span de múltiples filas
 */
function renderExamBlocksWithSpan(horas, minHora) {
    // Aplicar filtro de búsqueda
    let filtered = viewState.examenesDelDia;
    if (viewState.searchTerm) {
        filtered = viewState.examenesDelDia.filter(examen => {
            const searchIn = [
                examen.curso,
                examen.clave,
                ...examen.bloques.map(b => b.profesor)
            ].join(' ').toLowerCase();
            
            return searchIn.includes(viewState.searchTerm.toLowerCase());
        });
    }
    
    // Agrupar bloques por hora de inicio para organizarlos en columnas
    const bloquesPorHora = {};
    
    filtered.forEach(examen => {
        examen.bloques.forEach(bloque => {
            bloque.ubicaciones.forEach(sala => {
                const [horaI] = examen.horaInicio.split(':').map(Number);
                
                if (!bloquesPorHora[horaI]) {
                    bloquesPorHora[horaI] = [];
                }
                
                bloquesPorHora[horaI].push({
                    examen,
                    bloque,
                    sala
                });
            });
        });
    });
    
    // Renderizar bloques en sus respectivos slots
    Object.keys(bloquesPorHora).forEach(horaInicio => {
        const hora = parseInt(horaInicio);
        const slotEl = document.querySelector(`.events-slot[data-hora="${hora}"]`);
        
        if (slotEl) {
            const wrapper = slotEl.querySelector('.events-wrapper') || createWrapper(slotEl);
            
            // Limpiar wrapper
            wrapper.innerHTML = '';
            
            bloquesPorHora[hora].forEach(({examen, bloque, sala}) => {
                const [horaI] = examen.horaInicio.split(':').map(Number);
                const [horaF] = examen.horaFinal.split(':').map(Number);
                const duracionHoras = horaF - horaI;
                
                // Calcular altura total que debe ocupar el bloque
                // Cada slot tiene 81px (80px + 1px border)
                const alturaTotal = (duracionHoras * 81) - 1;
                
                const blockHTML = createExamBlockAbsolute(examen, bloque, sala, alturaTotal);
                wrapper.insertAdjacentHTML('beforeend', blockHTML);
            });
        }
    });
}

/**
 * Crear bloque de examen con altura absoluta
 */
function createExamBlockAbsolute(examen, bloque, sala, altura) {
    const salaKey = sala.trim();
    
    return `
        <div class="exam-block" 
             data-exam-id="${examen.id}" 
             data-block="${JSON.stringify(bloque).replace(/"/g, '&quot;')}"
             data-exam="${JSON.stringify(examen).replace(/"/g, '&quot;')}"
             data-sala="${salaKey}"
             style="height: ${altura}px; min-height: ${altura}px;">
            <div>
                <div class="exam-block-title">${examen.curso}</div>
                <div class="exam-block-clave">${examen.clave}</div>
            </div>
            <div class="exam-block-time">
                <i class="bi bi-clock"></i>
                ${examen.horaInicio} - ${examen.horaFinal}
            </div>
        </div>
    `;
}

/**
 * Adjuntar event listeners a los bloques
 */
function attachBlockListeners() {
    const blocks = document.querySelectorAll('.exam-block');
    
    blocks.forEach(block => {
        block.addEventListener('click', () => {
            const examData = JSON.parse(block.dataset.exam.replace(/&quot;/g, '"'));
            const blockData = JSON.parse(block.dataset.block.replace(/&quot;/g, '"'));
            const sala = block.dataset.sala;
            
            showTooltip(examData, blockData, sala);
        });
    });
}

/**
 * Mostrar tooltip con información del examen
 */
function showTooltip(exam, block, sala) {
    const tooltip = document.getElementById('examTooltip');
    const content = document.getElementById('tooltipContent');
    
    const fechaFormateada = new Date(exam.fechaExamen + 'T00:00:00').toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    content.innerHTML = `
        <div class="tooltip-header">
            <div class="tooltip-course-name">${exam.curso}</div>
            <div class="tooltip-clave">Clave: ${exam.clave}</div>
        </div>
        
        <div class="tooltip-section">
            <div class="tooltip-section-title">
                <i class="bi bi-calendar-event"></i>
                Información General
            </div>
            <div class="tooltip-info-item">
                <i class="bi bi-calendar3"></i>
                <span>${fechaFormateada}</span>
            </div>
            <div class="tooltip-info-item">
                <i class="bi bi-clock"></i>
                <span>${exam.horaInicio} - ${exam.horaFinal}</span>
            </div>
        </div>
        
        <div class="tooltip-section">
            <div class="tooltip-section-title">
                <i class="bi bi-person-badge"></i>
                Profesor
            </div>
            <div class="tooltip-info-item">
                <i class="bi bi-person"></i>
                <span>${block.profesor}</span>
            </div>
        </div>
        
        <div class="tooltip-section">
            <div class="tooltip-section-title">
                <i class="bi bi-geo-alt"></i>
                Ubicación
            </div>
            <div>
                <span class="tooltip-sala-badge">${sala}</span>
            </div>
        </div>
        
        ${block.notas ? `
        <div class="tooltip-section">
            <div class="tooltip-section-title">
                <i class="bi bi-sticky"></i>
                Notas
            </div>
            <div class="tooltip-notes">${block.notas}</div>
        </div>
        ` : ''}
        
        ${block.archivoUrl ? `
        <div class="tooltip-section">
            <div class="tooltip-section-title">
                <i class="bi bi-paperclip"></i>
                Archivo Adjunto
            </div>
            <a href="${block.archivoUrl}" target="_blank" class="tooltip-file-link">
                <i class="bi bi-download"></i>
                ${block.archivoNombre || 'Descargar archivo'}
            </a>
        </div>
        ` : ''}
    `;
    
    tooltip.classList.add('show');
}

/**
 * Cerrar tooltip
 */
function closeTooltip() {
    const tooltip = document.getElementById('examTooltip');
    tooltip.classList.remove('show');
}

/**
 * Inicializar controles
 */
function initializeControls() {
    // Selector de fecha
    const fechaSelector = document.getElementById('fechaSelector');
    fechaSelector.addEventListener('change', (e) => {
        viewState.fechaSeleccionada = e.target.value;
        filterExamenesByFecha();
        renderCalendar();
    });
    
    // Buscador
    const searchInput = document.getElementById('searchInput');
    const btnClearSearch = document.getElementById('btnClearSearch');
    
    searchInput.addEventListener('input', (e) => {
        viewState.searchTerm = e.target.value.trim();
        
        if (viewState.searchTerm) {
            btnClearSearch.classList.add('show');
        } else {
            btnClearSearch.classList.remove('show');
        }
        
        renderCalendar();
    });
    
    btnClearSearch.addEventListener('click', () => {
        searchInput.value = '';
        viewState.searchTerm = '';
        btnClearSearch.classList.remove('show');
        renderCalendar();
    });
    
    // Cerrar tooltip
    const tooltipClose = document.getElementById('tooltipClose');
    tooltipClose.addEventListener('click', closeTooltip);
    
    // Cerrar tooltip al hacer click fuera
    document.addEventListener('click', (e) => {
        const tooltip = document.getElementById('examTooltip');
        if (tooltip.classList.contains('show') && 
            !tooltip.contains(e.target) && 
            !e.target.closest('.exam-block')) {
            closeTooltip();
        }
    });
    
    // Cerrar tooltip con ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeTooltip();
        }
    });
}

/**
 * Mostrar loading
 */
function showLoading() {
    const calendarGrid = document.getElementById('calendarGrid');
    calendarGrid.innerHTML = `
        <div class="loading-state" style="grid-column: 1 / -1;">
            <div class="spinner"></div>
            <p>Cargando calendario...</p>
        </div>
    `;
}

/**
 * Ocultar loading
 */
function hideLoading() {
    // Se ocultará automáticamente al renderizar el calendario
}

/**
 * Mostrar estado vacío
 */
function showEmptyState(message) {
    const calendarGrid = document.getElementById('calendarGrid');
    calendarGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
            <i class="bi bi-calendar-x"></i>
            <h3>${message}</h3>
            <p>Selecciona otra fecha o verifica que haya exámenes registrados</p>
        </div>
    `;
}

/**
 * Mostrar error
 */
function showError(message) {
    const calendarGrid = document.getElementById('calendarGrid');
    calendarGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
            <i class="bi bi-exclamation-triangle" style="color: #e91e63;"></i>
            <h3>Error</h3>
            <p>${message}</p>
        </div>
    `;
}