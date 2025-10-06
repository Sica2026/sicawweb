/**
 * GESTIÓN DE EXÁMENES DEPARTAMENTALES - MAIN
 * Funcionalidad principal y autenticación
 */

// Estado global de la aplicación
const appState = {
    materias: [],
    maestros: [],
    examenes: [],
    currentEditId: null,
    selectedCurso: null
};

/**
 * Inicialización principal
 */
firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    await setupGestionExamenes();
});

/**
 * Setup principal de la aplicación
 */
async function setupGestionExamenes() {
    try {
        showLoading('Cargando sistema...');
        
        // Cargar datos iniciales
        await Promise.all([
            loadMaterias(),
            loadMaestros(),
            loadExamenes()
        ]);

        // Inicializar componentes
        initializeModeToggle();
        initializeFormHandlers();
        initializeSearchHandlers();
        
        // Agregar primer bloque por defecto
        addExamBlock();
        
        hideLoading();
        
        showNotification(
            'Sistema Listo',
            'Gestión de exámenes departamentales cargada correctamente',
            'success',
            'bi-check-circle-fill'
        );
        
    } catch (error) {
        console.error('Error al inicializar:', error);
        showNotification(
            'Error de Inicialización',
            'No se pudo cargar el sistema correctamente',
            'error',
            'bi-exclamation-triangle-fill'
        );
    }
}

/**
 * Cargar materias desde Firebase
 */
async function loadMaterias() {
    try {
        const snapshot = await db.collection('materias').orderBy('nombre').get();
        appState.materias = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        console.log(`${appState.materias.length} materias cargadas`);
    } catch (error) {
        console.error('Error al cargar materias:', error);
        throw error;
    }
}

/**
 * Cargar maestros desde Firebase
 */
async function loadMaestros() {
    try {
        const snapshot = await db.collection('maestros').orderBy('nombre').get();
        appState.maestros = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        console.log(`${appState.maestros.length} maestros cargados`);
    } catch (error) {
        console.error('Error al cargar maestros:', error);
        throw error;
    }
}

/**
 * Cargar exámenes desde Firebase
 */
async function loadExamenes() {
    try {
        const snapshot = await db.collection('departamentales')
            .orderBy('fechaExamen', 'desc')
            .orderBy('horaInicio')
            .get();
        
        appState.examenes = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        console.log(`${appState.examenes.length} exámenes cargados`);
        updateExamStats();
        renderExamenesList();
    } catch (error) {
        console.error('Error al cargar exámenes:', error);
        throw error;
    }
}

/**
 * Inicializar toggle de modos
 */
function initializeModeToggle() {
    const btnAdd = document.getElementById('btnModeAdd');
    const btnManage = document.getElementById('btnModeManage');
    const addSection = document.getElementById('addSection');
    const manageSection = document.getElementById('manageSection');

    btnAdd.addEventListener('click', () => {
        switchMode('add');
    });

    btnManage.addEventListener('click', () => {
        switchMode('manage');
    });

    function switchMode(mode) {
        if (mode === 'add') {
            btnAdd.classList.add('active');
            btnManage.classList.remove('active');
            addSection.classList.add('active');
            manageSection.classList.remove('active');
            resetForm();
        } else {
            btnManage.classList.add('active');
            btnAdd.classList.remove('active');
            manageSection.classList.add('active');
            addSection.classList.remove('active');
            renderExamenesList();
        }
    }
}

/**
 * Inicializar manejadores del formulario
 */
function initializeFormHandlers() {
    const examForm = document.getElementById('examForm');
    const btnCancelForm = document.getElementById('btnCancelForm');
    const btnAddBlock = document.getElementById('btnAddBlock');

    // Submit del formulario
    examForm.addEventListener('submit', handleFormSubmit);

    // Cancelar formulario
    btnCancelForm.addEventListener('click', () => {
        if (confirm('¿Deseas cancelar? Los cambios no guardados se perderán.')) {
            resetForm();
            showNotification(
                'Cancelado',
                'Formulario reiniciado',
                'info',
                'bi-info-circle-fill'
            );
        }
    });

    // Agregar bloque
    btnAddBlock.addEventListener('click', () => {
        addExamBlock();
    });

    // Autocompletado de curso
    setupCursoAutocomplete();
}

/**
 * Autocompletado de curso
 */
function setupCursoAutocomplete() {
    const cursoInput = document.getElementById('cursoInput');
    const cursoList = document.getElementById('cursoList');
    const claveInput = document.getElementById('claveInput');

    let selectedIndex = -1;

    cursoInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        
        if (searchTerm.length < 2) {
            cursoList.classList.remove('show');
            return;
        }

        const filtered = appState.materias.filter(materia => 
            materia.nombre.toLowerCase().includes(searchTerm)
        );

        if (filtered.length === 0) {
            cursoList.innerHTML = '<div class="autocomplete-item">No se encontraron resultados</div>';
            cursoList.classList.add('show');
            return;
        }

        cursoList.innerHTML = filtered.map((materia, index) => `
            <div class="autocomplete-item" data-index="${index}" data-id="${materia.id}">
                ${materia.nombre}
                <small style="color: var(--exam-gold); display: block;">${materia.clave}</small>
            </div>
        `).join('');

        cursoList.classList.add('show');
        selectedIndex = -1;

        // Click en item
        cursoList.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', () => {
                const materiaId = item.dataset.id;
                selectCurso(materiaId);
            });
        });
    });

    // Navegación con teclado
    cursoInput.addEventListener('keydown', (e) => {
        const items = cursoList.querySelectorAll('.autocomplete-item');
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
            updateSelection(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, 0);
            updateSelection(items);
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
            e.preventDefault();
            const materiaId = items[selectedIndex].dataset.id;
            selectCurso(materiaId);
        } else if (e.key === 'Escape') {
            cursoList.classList.remove('show');
        }
    });

    function updateSelection(items) {
        items.forEach((item, index) => {
            item.classList.toggle('active', index === selectedIndex);
        });
        if (items[selectedIndex]) {
            items[selectedIndex].scrollIntoView({ block: 'nearest' });
        }
    }

    // Cerrar al hacer click fuera
    document.addEventListener('click', (e) => {
        if (!cursoInput.contains(e.target) && !cursoList.contains(e.target)) {
            cursoList.classList.remove('show');
        }
    });
}

/**
 * Seleccionar curso del autocompletado
 */
function selectCurso(materiaId) {
    const materia = appState.materias.find(m => m.id === materiaId);
    if (!materia) return;

    const cursoInput = document.getElementById('cursoInput');
    const claveInput = document.getElementById('claveInput');
    const cursoList = document.getElementById('cursoList');

    cursoInput.value = materia.nombre;
    claveInput.value = materia.clave || '';
    appState.selectedCurso = materia;
    
    cursoList.classList.remove('show');
}

/**
 * Inicializar manejadores de búsqueda
 */
function initializeSearchHandlers() {
    const searchInput = document.getElementById('searchInput');
    
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        filterExamenes(searchTerm);
    });
}

/**
 * Filtrar exámenes
 */
function filterExamenes(searchTerm) {
    if (!searchTerm) {
        renderExamenesList();
        return;
    }

    const filtered = appState.examenes.filter(examen => {
        const searchableText = [
            examen.curso,
            examen.clave,
            ...examen.bloques.map(b => b.profesor),
            ...examen.bloques.flatMap(b => b.ubicaciones)
        ].join(' ').toLowerCase();

        return searchableText.includes(searchTerm);
    });

    renderExamenesList(filtered);
}

/**
 * Actualizar estadísticas de exámenes
 */
function updateExamStats() {
    const totalExamsEl = document.getElementById('totalExams');
    if (totalExamsEl) {
        totalExamsEl.textContent = appState.examenes.length;
    }
}

/**
 * Resetear formulario
 */
function resetForm() {
    const examForm = document.getElementById('examForm');
    examForm.reset();
    
    appState.selectedCurso = null;
    appState.currentEditId = null;
    
    const blocksContainer = document.getElementById('blocksContainer');
    blocksContainer.innerHTML = '';
    
    addExamBlock();
}

/**
 * Mostrar notificación
 */
function showNotification(title, message, type, icon) {
    if (window.modernNav && window.modernNav.showModernNotification) {
        window.modernNav.showModernNotification(title, message, type, icon);
    } else if (window.SICAComponents && window.SICAComponents.notify) {
        window.SICAComponents.notify(title, message, type, icon);
    } else {
        alert(`${title}: ${message}`);
    }
}

/**
 * Mostrar loading
 */
function showLoading(message = 'Cargando...') {
    // Implementación simple de loading
    console.log('Loading:', message);
}

/**
 * Ocultar loading
 */
function hideLoading() {
    console.log('Loading complete');
}

/**
 * Validar horario
 */
function validateHorario(horaInicio, horaFinal) {
    if (!horaInicio || !horaFinal) {
        return { valid: false, message: 'Debe especificar hora de inicio y final' };
    }

    const [horaI, minI] = horaInicio.split(':').map(Number);
    const [horaF, minF] = horaFinal.split(':').map(Number);

    if (horaI < 13) {
        return { valid: false, message: 'Los exámenes deben ser después de las 13:00' };
    }

    const inicioMinutos = horaI * 60 + minI;
    const finalMinutos = horaF * 60 + minF;

    if (finalMinutos <= inicioMinutos) {
        return { valid: false, message: 'La hora final debe ser posterior a la hora de inicio' };
    }

    return { valid: true };
}

// Exponer funciones globales necesarias
window.appState = appState;
window.showNotification = showNotification;
window.validateHorario = validateHorario;