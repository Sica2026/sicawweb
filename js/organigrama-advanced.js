// ===== ORGANIGRAMA ADVANCED FUNCTIONALITY =====

// Variables avanzadas
let isAdvancedUser = false;
let selectedColor = '';
let currentAsesorForDetail = null;
let contextMenuTarget = null;
let asesorColors = {}; // Almacenar colores asignados
let asesorEvaluations = {}; // Almacenar evaluaciones

// Usuarios con permisos avanzados
const ADVANCED_USERS = [
    'rodriguezeliud539@gmail.com',
    'renex@unam.mx',
    'ronald@quimica.unam.mx',
    'chenitzialeon@gmail.com'
];

// Esperar a que se cargue el script base
let baseScriptLoaded = false;
let advancedInitialized = false;

// Verificar si las variables del script base están disponibles
function checkBaseScriptReady() {
    return typeof asesores !== 'undefined' && 
           typeof organigramaData !== 'undefined' && 
           typeof currentUser !== 'undefined';
}

// Inicialización avanzada con verificación
function initializeAdvancedFeatures() {
    if (!checkBaseScriptReady()) {
        console.log('Esperando script base...');
        setTimeout(initializeAdvancedFeatures, 200);
        return;
    }
    
    if (advancedInitialized) return;
    advancedInitialized = true;
    
    console.log('Inicializando características avanzadas...');
    checkAdvancedUser();
    setupAdvancedEventListeners();
    loadAdvancedData();
}

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initializeAdvancedFeatures, 800);
});

// También intentar inicializar cuando se detecte que el script base está listo
function waitForBaseScript() {
    if (checkBaseScriptReady()) {
        initializeAdvancedFeatures();
    } else {
        setTimeout(waitForBaseScript, 100);
    }
}

// Iniciar verificación
setTimeout(waitForBaseScript, 500);

// Verificar si el usuario tiene permisos avanzados
function checkAdvancedUser() {
    firebase.auth().onAuthStateChanged((user) => {
        if (user && ADVANCED_USERS.includes(user.email)) {
            isAdvancedUser = true;
            enableAdvancedMode();
        } else {
            isAdvancedUser = false;
            disableAdvancedMode();
        }
    });
}

// Habilitar modo avanzado
function enableAdvancedMode() {
    console.log('Modo avanzado habilitado');
    
    // Mostrar paleta de colores
    const colorPalette = document.getElementById('color-palette');
    if (colorPalette) {
        colorPalette.style.display = 'block';
    }
    
    // Agregar clase al body
    document.body.classList.add('advanced-mode');
    
    // Mostrar indicador de usuario avanzado
    showAdvancedUserIndicator();
    
    // Actualizar event listeners
    updateCardEventListeners();
}

// Deshabilitar modo avanzado
function disableAdvancedMode() {
    const colorPalette = document.getElementById('color-palette');
    if (colorPalette) {
        colorPalette.style.display = 'none';
    }
    
    document.body.classList.remove('advanced-mode');
    hideAdvancedUserIndicator();
}

// Mostrar indicador de usuario avanzado
function showAdvancedUserIndicator() {
    const existingIndicator = document.querySelector('.advanced-user-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }
    
    const indicator = document.createElement('div');
    indicator.className = 'advanced-user-indicator';
    indicator.innerHTML = '<i class="bi bi-star-fill me-1"></i>Usuario Avanzado';
    document.body.appendChild(indicator);
}

// Ocultar indicador de usuario avanzado
function hideAdvancedUserIndicator() {
    const indicator = document.querySelector('.advanced-user-indicator');
    if (indicator) {
        indicator.remove();
    }
}

// Configurar event listeners avanzados
function setupAdvancedEventListeners() {
    // Event listeners para paleta de colores
    document.addEventListener('click', function(e) {
        if (e.target.closest('.color-option')) {
            selectColor(e.target.closest('.color-option'));
        }
        
        // Cerrar menú contextual al hacer clic fuera
        if (!e.target.closest('.context-menu')) {
            hideContextMenu();
        }
    });
    
    // Event listener para calificación por estrellas
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('star')) {
            setRating(parseInt(e.target.dataset.rating));
        }
    });
    
    // NO prevenir el menú contextual del navegador globalmente
    // Solo agregarlo específicamente a las tarjetas cuando sea necesario
}

// Actualizar event listeners de tarjetas
function updateCardEventListeners() {
    if (!isAdvancedUser) return;
    
    const asesorCards = document.querySelectorAll('.asesor-card:not(.empty-card)');
    asesorCards.forEach(card => {
        // NO remover los event listeners existentes, solo agregar los nuevos
        card.addEventListener('contextmenu', handleCardRightClick, true);
        
        // Solo agregar el event listener de clic si no es para drag and drop
        if (!card.draggable) {
            card.addEventListener('click', handleAdvancedCardClick, true);
        }
    });
}

// Manejar clic en tarjeta (modo avanzado)
function handleAdvancedCardClick(e) {
    if (!isAdvancedUser) return;
    
    // Solo manejar si hay un color seleccionado
    if (selectedColor !== null && selectedColor !== '') {
        e.stopPropagation();
        e.preventDefault();
        applyColorToCard(e.currentTarget);
        return;
    }
    
    // Si no hay color seleccionado, permitir comportamiento normal
    // No hacer nada para permitir drag and drop y otras funciones
}

// Manejar clic derecho en tarjeta
function handleCardRightClick(e) {
    if (!isAdvancedUser) return;
    
    e.preventDefault();
    e.stopPropagation();
    showContextMenu(e, e.currentTarget);
}

// Mostrar menú contextual
function showContextMenu(e, target) {
    contextMenuTarget = target;
    const contextMenu = document.getElementById('context-menu');
    
    if (contextMenu) {
        // Obtener posición relativa al viewport
        const rect = target.getBoundingClientRect();
        
        // Posicionar el menú cerca de la tarjeta, no en la posición del mouse
        let x = rect.right + 10; // A la derecha de la tarjeta
        let y = rect.top; // A la altura del top de la tarjeta
        
        // Ajustar si se sale de la pantalla horizontalmente
        if (x + 150 > window.innerWidth) {
            x = rect.left - 160; // A la izquierda de la tarjeta
        }
        
        // Ajustar si se sale de la pantalla verticalmente
        if (y + 80 > window.innerHeight) {
            y = window.innerHeight - 90;
        }
        
        // Asegurar que no salga por arriba o por la izquierda
        x = Math.max(10, x);
        y = Math.max(10, y);
        
        contextMenu.style.display = 'block';
        contextMenu.style.position = 'fixed';
        contextMenu.style.left = x + 'px';
        contextMenu.style.top = y + 'px';
        contextMenu.style.zIndex = '10000';
    }
}

// Ocultar menú contextual
function hideContextMenu() {
    const contextMenu = document.getElementById('context-menu');
    if (contextMenu) {
        contextMenu.style.display = 'none';
    }
    contextMenuTarget = null;
}

// Seleccionar color
function selectColor(colorOption) {
    if (!isAdvancedUser) return;
    
    // Remover selección anterior
    document.querySelectorAll('.color-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    // Seleccionar nuevo color
    colorOption.classList.add('selected');
    selectedColor = colorOption.dataset.color;
    
    // Verificar que SICAComponents esté disponible
    if (typeof SICAComponents !== 'undefined') {
        SICAComponents.notify(
            "Color Seleccionado",
            selectedColor ? "Haz clic en una tarjeta para aplicar el color" : "Modo normal activado",
            "info",
            "bi-palette-fill"
        );
    }
}

// Aplicar color a tarjeta
function applyColorToCard(card) {
    if (!isAdvancedUser) return;
    
    const position = card.dataset.position;
    
    // Verificar que organigramaData esté disponible
    if (typeof organigramaData === 'undefined' || !organigramaData.positions) {
        console.error('organigramaData no está disponible');
        return;
    }
    
    const asesorId = organigramaData.positions[position];
    
    if (asesorId) {
        if (selectedColor) {
            // Aplicar color
            asesorColors[asesorId] = selectedColor;
            card.classList.add('colored');
            card.style.setProperty('--card-color', selectedColor);
            
            // Convertir hex a RGB para efectos
            const rgb = hexToRgb(selectedColor);
            if (rgb) {
                card.style.setProperty('--card-color-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
            }
            
            // Agregar indicador de color
            addColorIndicator(card, selectedColor);
            
        } else {
            // Remover color
            delete asesorColors[asesorId];
            card.classList.remove('colored');
            card.style.removeProperty('--card-color');
            card.style.removeProperty('--card-color-rgb');
            removeColorIndicator(card);
        }
        
        // Guardar colores
        saveAdvancedData();
        
        // Verificar que SICAComponents esté disponible
        if (typeof SICAComponents !== 'undefined') {
            SICAComponents.notify(
                "Color Aplicado",
                selectedColor ? "Color asignado exitosamente" : "Color removido",
                "success",
                "bi-check-circle-fill"
            );
        }
    }
}

// Agregar indicador de color
function addColorIndicator(card, color) {
    removeColorIndicator(card); // Remover existente
    
    const indicator = document.createElement('div');
    indicator.className = 'color-indicator';
    indicator.style.backgroundColor = color;
    card.appendChild(indicator);
}

// Remover indicador de color
function removeColorIndicator(card) {
    const existing = card.querySelector('.color-indicator');
    if (existing) {
        existing.remove();
    }
}

// Convertir hex a RGB
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

// === FUNCIONES DEL MENÚ CONTEXTUAL ===

// Modificar asesor (función existente)
function modifyAsesor() {
    hideContextMenu();
    if (contextMenuTarget) {
        const position = contextMenuTarget.dataset.position;
        
        // Verificar que la función showAsesorOptions esté disponible
        if (typeof window.showAsesorOptions === 'function') {
            window.showAsesorOptions(position);
        } else {
            console.error('Función showAsesorOptions no está disponible');
        }
    }
}

// Ver detalle del asesor
function viewAsesorDetail() {
    hideContextMenu();
    if (contextMenuTarget) {
        const position = contextMenuTarget.dataset.position;
        
        // Verificar que las variables estén disponibles
        if (typeof organigramaData === 'undefined' || typeof asesores === 'undefined') {
            console.error('Variables del organigrama no disponibles');
            return;
        }
        
        const asesorId = organigramaData.positions[position];
        const asesor = asesores.find(a => a.id === asesorId);
        
        if (asesor) {
            currentAsesorForDetail = asesor;
            showAsesorDetailModal(asesor);
        }
    }
}

// === MODAL DE DETALLES ===

// Mostrar modal de detalles
function showAsesorDetailModal(asesor) {
    const modal = new bootstrap.Modal(document.getElementById('asesorDetailModal'));
    
    // Poblar información básica
    document.getElementById('detail-foto').src = asesor.fotoUrl || '../image/default-avatar.png';
    document.getElementById('detail-foto').alt = asesor.nombreHorario;
    document.getElementById('detail-nombre').textContent = asesor.nombreHorario;
    
    // Poblar campos de la base de datos
    populateField('detail-procedencia', asesor.procedencia);
    populateField('detail-administrador', asesor.administrador);
    populateField('detail-semestre', asesor.semestreConsecutivo);
    populateField('detail-tiene-beca', asesor.tieneBeca);
    populateField('detail-tipo-beca', asesor.tipoBeca);
    
    // Cargar evaluación existente
    loadAsesorEvaluation(asesor.id);
    
    modal.show();
}

// Poblar campo con validación de nulos/vacíos
function populateField(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        if (value && value.toString().trim() !== '') {
            element.textContent = value;
            element.classList.remove('empty');
        } else {
            element.textContent = 'Sin información';
            element.classList.add('empty');
        }
    }
}

// === SISTEMA DE CALIFICACIÓN ===

// Establecer calificación
function setRating(rating) {
    const stars = document.querySelectorAll('.star');
    const ratingText = document.getElementById('current-rating');
    
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('active');
            star.classList.remove('bi-star');
            star.classList.add('bi-star-fill');
        } else {
            star.classList.remove('active');
            star.classList.remove('bi-star-fill');
            star.classList.add('bi-star');
        }
    });
    
    const ratingLabels = {
        1: 'Muy malo (1/5)',
        2: 'Malo (2/5)',
        3: 'Regular (3/5)',
        4: 'Bueno (4/5)',
        5: 'Excelente (5/5)'
    };
    
    ratingText.textContent = ratingLabels[rating] || 'Sin calificar';
    ratingText.dataset.rating = rating;
}

// Cargar evaluación del asesor
function loadAsesorEvaluation(asesorId) {
    const evaluation = asesorEvaluations[asesorId];
    
    if (evaluation) {
        // Cargar calificación
        if (evaluation.rating) {
            setRating(evaluation.rating);
        } else {
            setRating(0);
        }
        
        // Cargar comentarios
        const comentariosEl = document.getElementById('detail-comentarios');
        if (comentariosEl) {
            comentariosEl.value = evaluation.comentarios || '';
        }
    } else {
        // Sin evaluación previa
        setRating(0);
        const comentariosEl = document.getElementById('detail-comentarios');
        if (comentariosEl) {
            comentariosEl.value = '';
        }
    }
}

// Guardar evaluación del asesor
async function saveAsesorEvaluation() {
    if (!currentAsesorForDetail) return;
    
    const ratingEl = document.getElementById('current-rating');
    const comentariosEl = document.getElementById('detail-comentarios');
    
    if (!ratingEl || !comentariosEl) {
        console.error('Elementos del modal no encontrados');
        return;
    }
    
    const rating = parseInt(ratingEl.dataset.rating) || 0;
    const comentarios = comentariosEl.value.trim();
    
    // Guardar localmente
    asesorEvaluations[currentAsesorForDetail.id] = {
        rating: rating,
        comentarios: comentarios,
        evaluatedBy: currentUser ? currentUser.email : 'usuario',
        evaluatedAt: new Date().toISOString()
    };
    
    try {
        // Guardar en Firebase
        await saveAdvancedData();
        
        // Cerrar modal
        const modalElement = document.getElementById('asesorDetailModal');
        if (modalElement) {
            const modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (modalInstance) {
                modalInstance.hide();
            }
        }
        
        // Verificar que SICAComponents esté disponible
        if (typeof SICAComponents !== 'undefined') {
            SICAComponents.notify(
                "Evaluación Guardada",
                `Evaluación de ${currentAsesorForDetail.nombreHorario} guardada exitosamente.`,
                "success",
                "bi-check-circle-fill"
            );
        }
        
    } catch (error) {
        console.error('Error guardando evaluación:', error);
        if (typeof showError !== 'undefined') {
            showError('Error al guardar la evaluación');
        }
    }
}

// === PERSISTENCIA DE DATOS AVANZADOS ===

// Cargar datos avanzados
async function loadAdvancedData() {
    if (!isAdvancedUser) return;
    
    try {
        const doc = await firebase.firestore()
            .collection('configuracion')
            .doc('organigrama-advanced')
            .get();
        
        if (doc.exists) {
            const data = doc.data();
            asesorColors = data.colors || {};
            asesorEvaluations = data.evaluations || {};
            
            // Aplicar colores cargados
            applyLoadedColors();
        }
        
    } catch (error) {
        console.error('Error cargando datos avanzados:', error);
    }
}

// Guardar datos avanzados
async function saveAdvancedData() {
    if (!isAdvancedUser) return;
    
    try {
        await firebase.firestore()
            .collection('configuracion')
            .doc('organigrama-advanced')
            .set({
                colors: asesorColors,
                evaluations: asesorEvaluations,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: currentUser.email
            });
            
    } catch (error) {
        console.error('Error guardando datos avanzados:', error);
        throw error;
    }
}

// Aplicar colores cargados
function applyLoadedColors() {
    Object.entries(asesorColors).forEach(([asesorId, color]) => {
        const allCards = document.querySelectorAll('.asesor-card:not(.empty-card)');
        
        allCards.forEach(card => {
            const position = card.dataset.position;
            
            // Verificar que organigramaData esté disponible
            if (typeof organigramaData === 'undefined' || !organigramaData.positions) {
                return;
            }
            
            const currentAsesorId = organigramaData.positions[position];
            
            if (currentAsesorId === asesorId) {
                card.classList.add('colored');
                card.style.setProperty('--card-color', color);
                
                const rgb = hexToRgb(color);
                if (rgb) {
                    card.style.setProperty('--card-color-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
                }
                
                addColorIndicator(card, color);
            }
        });
    });
}

// === OVERRIDE DE FUNCIONES EXISTENTES ===

// Override de la función de renderizado para incluir colores
function renderOrganigramaAdvanced() {
    // Verificar que la función original esté disponible
    if (typeof window.renderOriginal === 'function') {
        window.renderOriginal();
    } else if (typeof renderOrganigrama === 'function') {
        renderOrganigrama();
    }
    
    // Aplicar colores después del renderizado
    if (isAdvancedUser) {
        setTimeout(() => {
            applyLoadedColors();
            updateCardEventListeners();
        }, 200);
    }
}

// Función para sobrescribir el renderizado original cuando esté disponible
function setupRenderOverride() {
    // Solo hacer override si somos usuario avanzado
    if (!isAdvancedUser) {
        setTimeout(setupRenderOverride, 500);
        return;
    }
    
    if (typeof window.renderOrganigrama === 'function' && !window.renderOriginal) {
        // Guardar la función original
        window.renderOriginal = window.renderOrganigrama;
        // Reemplazar con la versión avanzada
        window.renderOrganigrama = renderOrganigramaAdvanced;
        console.log('Override de renderOrganigrama configurado para usuario avanzado');
    } else if (typeof window.renderOrganigrama !== 'function') {
        // Si aún no está disponible, esperar
        setTimeout(setupRenderOverride, 300);
    }
}

// Configurar override después de verificar usuario
setTimeout(setupRenderOverride, 1500);

// === FUNCIONES GLOBALES ===
window.modifyAsesor = modifyAsesor;
window.viewAsesorDetail = viewAsesorDetail;
window.saveAsesorEvaluation = saveAsesorEvaluation;