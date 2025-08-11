// ===== ORGANIGRAMA INTERACTIVO =====

// Variables globales
let currentUser = null;
let isAdmin = false;
let asesores = [];
let organigramaData = {
    rows: 3,
    cols: 4,
    positions: {}
};
let draggedElement = null;
let currentPosition = null;

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initializeOrganigrama, 500);
});

// Función principal de inicialización
async function initializeOrganigrama() {
    try {
        showLoading(true);
        
        if (!waitForElements()) {
            console.log('Esperando elementos del DOM...');
            setTimeout(initializeOrganigrama, 200);
            return;
        }
        
        SICAComponents.setPageTitle("Organigrama Interactivo - SICA");
        await checkAuthStatus();
        await loadAsesores();
        await loadOrganigramaData();
        
        renderOrganigrama();
        updateStats();
        setupEventListeners();
        
        showLoading(false);
        
        SICAComponents.notify(
            "Organigrama Cargado",
            "La estructura organizacional se ha cargado correctamente.",
            "success",
            "bi-diagram-3-fill"
        );
        
    } catch (error) {
        console.error('Error inicializando organigrama:', error);
        showError('Error al cargar el organigrama');
        showLoading(false);
    }
}

function waitForElements() {
    const requiredElements = [
        'admin-controls', 'organigrama-grid', 'loading-indicator',
        'dimensiones', 'total-asesores', 'estado'
    ];
    
    for (const id of requiredElements) {
        if (!document.getElementById(id)) {
            console.log(`Elemento faltante: ${id}`);
            return false;
        }
    }
    return true;
}

async function checkAuthStatus() {
    return new Promise((resolve) => {
        firebase.auth().onAuthStateChanged(async (user) => {
            currentUser = user;
            isAdmin = !!user;
            
            const adminControls = document.getElementById('admin-controls');
            const estadoElement = document.getElementById('estado');
            
            if (adminControls && estadoElement) {
                if (isAdmin) {
                    adminControls.style.display = 'block';
                    estadoElement.textContent = 'Administrador';
                    const statIcon = estadoElement.parentElement.querySelector('.stat-icon');
                    if (statIcon) statIcon.className = 'stat-icon bg-success';
                } else {
                    adminControls.style.display = 'none';
                    estadoElement.textContent = 'Solo Lectura';
                    const statIcon = estadoElement.parentElement.querySelector('.stat-icon');
                    if (statIcon) statIcon.className = 'stat-icon bg-info';
                }
            }
            resolve();
        });
    });
}

async function loadAsesores() {
    try {
        const snapshot = await firebase.firestore().collection('asesores').get();
        asesores = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        console.log(`Cargados ${asesores.length} asesores`);
    } catch (error) {
        console.error('Error cargando asesores:', error);
        asesores = [];
    }
}

async function loadOrganigramaData() {
    try {
        const doc = await firebase.firestore().collection('configuracion').doc('organigrama').get();
        
        if (doc.exists) {
            const data = doc.data();
            organigramaData = {
                rows: data.rows || 3,
                cols: data.cols || 4,
                positions: data.positions || {}
            };
        }
        console.log('Configuración del organigrama:', organigramaData);
    } catch (error) {
        console.error('Error cargando configuración:', error);
    }
}

function renderOrganigrama() {
    const grid = document.getElementById('organigrama-grid');
    if (!grid) {
        console.error('Grid element not found');
        return;
    }
    
    grid.innerHTML = '';
    grid.style.gridTemplateColumns = `repeat(${organigramaData.cols}, 140px)`;
    grid.style.gridTemplateRows = `repeat(${organigramaData.rows}, 160px)`;
    
    for (let row = 0; row < organigramaData.rows; row++) {
        for (let col = 0; col < organigramaData.cols; col++) {
            const position = `${row}-${col}`;
            const asesorId = organigramaData.positions[position];
            const asesor = asesores.find(a => a.id === asesorId);
            
            const card = createAsesorCard(asesor, row, col);
            grid.appendChild(card);
        }
    }
}

function createAsesorCard(asesor, row, col) {
    const position = `${row}-${col}`;
    const card = document.createElement('div');
    
    if (asesor) {
        card.className = 'asesor-card fade-in-up';
        card.innerHTML = `
            <img src="${asesor.fotoUrl || '../image/default-avatar.png'}" 
                 alt="${asesor.nombreHorario}" 
                 class="asesor-foto"
                 onerror="this.src='../image/default-avatar.png'">
            <div class="asesor-nombre">${asesor.nombreHorario}</div>
            ${isAdmin ? '<div class="position-indicator"></div>' : ''}
        `;
        
        if (isAdmin) {
            card.draggable = true;
            card.addEventListener('dragstart', handleDragStart);
            card.addEventListener('dragend', handleDragEnd);
            card.addEventListener('click', () => showAsesorOptions(position));
        }
    } else {
        card.className = 'asesor-card empty-card fade-in-up';
        card.innerHTML = `
            <i class="bi bi-plus-circle-fill"></i>
            <div class="asesor-nombre">Agregar Asesor</div>
        `;
        
        if (isAdmin) {
            card.addEventListener('click', () => showAsesorOptions(position));
        }
    }
    
    card.dataset.position = position;
    card.dataset.row = row;
    card.dataset.col = col;
    
    if (isAdmin) {
        card.addEventListener('dragover', handleDragOver);
        card.addEventListener('drop', handleDrop);
    }
    
    card.style.animationDelay = `${(row * organigramaData.cols + col) * 0.1}s`;
    return card;
}

// === DRAG AND DROP ===
function handleDragStart(e) {
    if (!isAdmin) return;
    draggedElement = e.target;
    currentPosition = e.target.dataset.position;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
}

function handleDragEnd(e) {
    if (!isAdmin) return;
    e.target.classList.remove('dragging');
    document.querySelectorAll('.drop-zone').forEach(el => {
        el.classList.remove('drop-zone', 'drag-over');
    });
}

function handleDragOver(e) {
    if (!isAdmin || !draggedElement) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const target = e.currentTarget;
    if (target !== draggedElement) {
        target.classList.add('drop-zone');
        target.addEventListener('mouseenter', () => target.classList.add('drag-over'));
        target.addEventListener('mouseleave', () => target.classList.remove('drag-over'));
    }
}

function handleDrop(e) {
    if (!isAdmin || !draggedElement) return;
    e.preventDefault();
    const target = e.currentTarget;
    const targetPosition = target.dataset.position;
    
    if (currentPosition !== targetPosition) {
        swapPositions(currentPosition, targetPosition);
    }
    
    target.classList.remove('drop-zone', 'drag-over');
    draggedElement = null;
    currentPosition = null;
}

function swapPositions(pos1, pos2) {
    const asesor1 = organigramaData.positions[pos1];
    const asesor2 = organigramaData.positions[pos2];
    
    if (asesor1) {
        organigramaData.positions[pos2] = asesor1;
    } else {
        delete organigramaData.positions[pos2];
    }
    
    if (asesor2) {
        organigramaData.positions[pos1] = asesor2;
    } else {
        delete organigramaData.positions[pos1];
    }
    
    renderOrganigrama();
    updateStats();
    
    SICAComponents.notify(
        "Posiciones Intercambiadas",
        "Los asesores han sido reubicados exitosamente.",
        "info",
        "bi-arrow-left-right"
    );
}

// === GESTIÓN DE ASESORES ===
function showAsesorOptions(position) {
    if (!isAdmin) return;
    currentPosition = position;
    const modal = new bootstrap.Modal(document.getElementById('asesorModal'));
    loadAsesorOptions();
    modal.show();
}

function loadAsesorOptions() {
    const container = document.getElementById('asesores-list');
    if (!container) {
        console.error('Asesores list container not found');
        return;
    }
    
    container.innerHTML = '';
    
    if (organigramaData.positions[currentPosition]) {
        const removeOption = document.createElement('div');
        removeOption.className = 'col-md-6 col-lg-4';
        removeOption.innerHTML = `
            <div class="asesor-option border-danger" onclick="removeAsesor('${currentPosition}')">
                <i class="bi bi-trash-fill text-danger" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                <div><strong>Quitar Asesor</strong></div>
                <small class="text-muted">Dejar posición vacía</small>
            </div>
        `;
        container.appendChild(removeOption);
    }
    
    asesores.forEach(asesor => {
        const isAssigned = Object.values(organigramaData.positions).includes(asesor.id);
        const option = document.createElement('div');
        option.className = 'col-md-6 col-lg-4';
        
        option.innerHTML = `
            <div class="asesor-option ${isAssigned ? 'opacity-50' : ''}" 
                 onclick="${!isAssigned ? `assignAsesor('${asesor.id}')` : ''}">
                <img src="${asesor.fotoUrl || '../image/default-avatar.png'}" 
                     alt="${asesor.nombreHorario}"
                     onerror="this.src='../image/default-avatar.png'">
                <div><strong>${asesor.nombreHorario}</strong></div>
                ${isAssigned ? '<small class="text-warning"><br>Ya asignado</small>' : ''}
            </div>
        `;
        container.appendChild(option);
    });
}

function assignAsesor(asesorId) {
    organigramaData.positions[currentPosition] = asesorId;
    bootstrap.Modal.getInstance(document.getElementById('asesorModal')).hide();
    renderOrganigrama();
    updateStats();
    
    const asesor = asesores.find(a => a.id === asesorId);
    SICAComponents.notify(
        "Asesor Asignado",
        `${asesor.nombreHorario} ha sido asignado exitosamente.`,
        "success",
        "bi-person-check-fill"
    );
}

function removeAsesor(position) {
    delete organigramaData.positions[position];
    bootstrap.Modal.getInstance(document.getElementById('asesorModal')).hide();
    renderOrganigrama();
    updateStats();
    
    SICAComponents.notify(
        "Asesor Removido",
        "El asesor ha sido removido de esta posición.",
        "warning",
        "bi-person-dash-fill"
    );
}

// === GESTIÓN DE ESTRUCTURA ===
function addRow() {
    if (!isAdmin) return;
    organigramaData.rows++;
    renderOrganigrama();
    updateStats();
    
    SICAComponents.notify(
        "Fila Agregada",
        `Nueva fila agregada. Dimensiones: ${organigramaData.rows} x ${organigramaData.cols}`,
        "success",
        "bi-plus-circle-fill"
    );
}

function addColumn() {
    if (!isAdmin) return;
    organigramaData.cols++;
    renderOrganigrama();
    updateStats();
    
    SICAComponents.notify(
        "Columna Agregada",
        `Nueva columna agregada. Dimensiones: ${organigramaData.rows} x ${organigramaData.cols}`,
        "success",
        "bi-plus-square-fill"
    );
}

function removeRow() {
    if (!isAdmin || organigramaData.rows <= 1) return;
    
    const lastRow = organigramaData.rows - 1;
    let hasAsesores = false;
    
    for (let col = 0; col < organigramaData.cols; col++) {
        const position = `${lastRow}-${col}`;
        if (organigramaData.positions[position]) {
            hasAsesores = true;
            delete organigramaData.positions[position];
        }
    }
    
    organigramaData.rows--;
    renderOrganigrama();
    updateStats();
    
    const message = hasAsesores 
        ? "Fila removida. Los asesores han sido desasignados."
        : "Fila removida exitosamente.";
    
    SICAComponents.notify(
        "Fila Removida",
        message,
        hasAsesores ? "warning" : "info",
        "bi-dash-circle-fill"
    );
}

function removeColumn() {
    if (!isAdmin || organigramaData.cols <= 1) return;
    
    const lastCol = organigramaData.cols - 1;
    let hasAsesores = false;
    
    for (let row = 0; row < organigramaData.rows; row++) {
        const position = `${row}-${lastCol}`;
        if (organigramaData.positions[position]) {
            hasAsesores = true;
            delete organigramaData.positions[position];
        }
    }
    
    organigramaData.cols--;
    renderOrganigrama();
    updateStats();
    
    const message = hasAsesores 
        ? "Columna removida. Los asesores han sido desasignados."
        : "Columna removida exitosamente.";
    
    SICAComponents.notify(
        "Columna Removida",
        message,
        hasAsesores ? "warning" : "info",
        "bi-dash-square-fill"
    );
}

// === GUARDAR Y RESTABLECER ===
async function saveChanges() {
    if (!isAdmin) return;
    
    try {
        showLoading(true, "Guardando cambios...");
        
        await firebase.firestore().collection('configuracion').doc('organigrama').set({
            rows: organigramaData.rows,
            cols: organigramaData.cols,
            positions: organigramaData.positions,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: currentUser.uid
        });
        
        showLoading(false);
        
        SICAComponents.notify(
            "Cambios Guardados",
            "La configuración del organigrama ha sido guardada exitosamente.",
            "success",
            "bi-save-fill"
        );
        
    } catch (error) {
        console.error('Error guardando cambios:', error);
        showLoading(false);
        showError('Error al guardar los cambios');
    }
}

async function resetOrganigrama() {
    if (!isAdmin) return;
    
    if (!confirm('¿Estás seguro de restablecer el organigrama? Se perderán todos los cambios no guardados.')) {
        return;
    }
    
    try {
        showLoading(true, "Restableciendo...");
        await loadOrganigramaData();
        renderOrganigrama();
        updateStats();
        showLoading(false);
        
        SICAComponents.notify(
            "Organigrama Restablecido",
            "Se ha restaurado la configuración guardada.",
            "info",
            "bi-arrow-clockwise"
        );
        
    } catch (error) {
        console.error('Error restableciendo:', error);
        showLoading(false);
        showError('Error al restablecer el organigrama');
    }
}

// === UTILIDADES ===
function updateStats() {
    const dimensionesEl = document.getElementById('dimensiones');
    const asesoresEl = document.getElementById('total-asesores');
    
    if (dimensionesEl) {
        dimensionesEl.textContent = `${organigramaData.rows} x ${organigramaData.cols}`;
    }
    
    if (asesoresEl) {
        const totalAsesores = Object.keys(organigramaData.positions).length;
        asesoresEl.textContent = totalAsesores;
    }
}

function setupEventListeners() {
    if (isAdmin) {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 's':
                        e.preventDefault();
                        saveChanges();
                        break;
                    case 'r':
                        e.preventDefault();
                        resetOrganigrama();
                        break;
                }
            }
        });
    }
    
    window.addEventListener('resize', debounce(() => {
        renderOrganigrama();
    }, 250));
}

// === FUNCIONES DE INTERFAZ ===
function showLoading(show, message = "Cargando...") {
    const loadingEl = document.getElementById('loading-indicator');
    const mainContent = document.querySelector('.organigrama-container');
    
    if (loadingEl) {
        if (show) {
            loadingEl.style.display = 'block';
            const messageEl = loadingEl.querySelector('p');
            if (messageEl) {
                messageEl.textContent = message;
            }
            if (mainContent) mainContent.style.opacity = '0.5';
        } else {
            loadingEl.style.display = 'none';
            if (mainContent) mainContent.style.opacity = '1';
        }
    }
}

function showError(message) {
    SICAComponents.notify(
        "Error",
        message,
        "error",
        "bi-exclamation-triangle-fill"
    );
}

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

// === FUNCIONES GLOBALES PARA HTML ===
window.addRow = addRow;
window.addColumn = addColumn;
window.removeRow = removeRow;
window.removeColumn = removeColumn;
window.saveChanges = saveChanges;
window.resetOrganigrama = resetOrganigrama;
window.assignAsesor = assignAsesor;
window.removeAsesor = removeAsesor;