// JavaScript para el menú de selección

// ✅ DETECTAR SICA AUTOMÁTICAMENTE DESDE LA URL
function detectSICA() {
    const urlParams = new URLSearchParams(window.location.search);
    const sicaNumber = urlParams.get('sica') || '1';
    return sicaNumber;
}

// ✅ CONFIGURACIÓN DE CADA SICA
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
    
    // ✅ CONFIGURACIÓN ESPECÍFICA DE CADA SICA
    sicaNames: {
        '1': {
            title: 'SICA 1',
            shortName: 'SICA1',
            displayName: 'SICA 1',
            maxElementos: 65,
            subtitle: 'Selecciona el tipo de equipo que deseas registrar'
        },
        '2': {
            title: 'SICA 2',
            shortName: 'SICA2',
            displayName: 'SICA 2',
            maxElementos: 101,
            subtitle: 'Selecciona el tipo de equipo que deseas registrar'
        },
        '3': {
            title: 'SALON INTELIGENTE 1',
            shortName: 'SALON_INTELIGENTE1',
            displayName: 'SALON INTELIGENTE 1',
            maxElementos: 35,
            subtitle: 'Selecciona el tipo de equipo que deseas registrar'
        },
        '4': {
            title: 'SICA 4',
            shortName: 'SICA4',
            displayName: 'SICA 4',
            maxElementos: 45,
            subtitle: 'Selecciona el tipo de equipo que deseas registrar'
        }
    }
};

// Variables globales
let currentSICA = '1';
let currentSICAConfig = null;
let selectedCard = null;

// Inicializar la página
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    setupEventListeners();
    setupAnimations();
});

function initializePage() {
    // ✅ DETECTAR SICA ACTUAL
    currentSICA = detectSICA();
    currentSICAConfig = SICA_CONFIG.sicaNames[currentSICA];
    
    if (!currentSICAConfig) {
        console.error(`SICA ${currentSICA} no configurado`);
        currentSICA = '1';
        currentSICAConfig = SICA_CONFIG.sicaNames['1'];
    }
    
    // ✅ ACTUALIZAR TÍTULOS DINÁMICAMENTE
    updatePageTitles();
    
    // ✅ ACTUALIZAR CONTADOR DE COMPUTADORAS
    updateComputadoraCount();
    
    console.log(`🎯 Menú de selección inicializado para ${currentSICAConfig.displayName}`);
}

function updatePageTitles() {
    // Actualizar título de la página
    document.title = `Selección de Equipo - ${currentSICAConfig.displayName}`;
    
    // Actualizar título principal
    const sicaNameSpan = document.getElementById('sica-name');
    const subtitle = document.getElementById('subtitle');
    
    if (sicaNameSpan) {
        sicaNameSpan.textContent = currentSICAConfig.displayName;
    }
    
    if (subtitle) {
        subtitle.textContent = currentSICAConfig.subtitle;
    }
}

function updateComputadoraCount() {
    const computadoraCount = document.getElementById('computadora-count');
    if (computadoraCount) {
        computadoraCount.textContent = `${currentSICAConfig.maxElementos} equipos`;
    }
}

function setupEventListeners() {
    // Event listeners para las cards
    const selectionCards = document.querySelectorAll('.selection-card');
    
    selectionCards.forEach(card => {
        card.addEventListener('click', () => handleCardSelection(card));
        card.addEventListener('mouseenter', () => handleCardHover(card));
        card.addEventListener('mouseleave', () => handleCardLeave(card));
    });
    
    // Botón de regresar removido por solicitud del usuario
    // const backButton = document.getElementById('backButton');
    // if (backButton) {
    //     backButton.addEventListener('click', () => navigateBack());
    // }
    
    // Keyboard navigation
    document.addEventListener('keydown', handleKeyboardNavigation);
}

function handleCardSelection(card) {
    const type = card.getAttribute('data-type');
    
    // Efecto visual de selección
    addSelectionEffect(card);
    
    // Mostrar overlay temporalmente
    const overlay = card.querySelector('.card-overlay');
    overlay.classList.add('active');
    
    // Navegación con delay para mostrar animación
    setTimeout(() => {
        navigateToEquipment(type);
    }, 800);
}

function handleCardHover(card) {
    // Efectos adicionales al hacer hover
    const icon = card.querySelector('.selection-icon');
    const glow = card.querySelector('.icon-glow');
    
    if (icon) {
        icon.style.transform = 'scale(1.1)';
    }
    
    if (glow) {
        glow.style.opacity = '1';
    }
}

function handleCardLeave(card) {
    // Restaurar efectos al salir del hover
    const icon = card.querySelector('.selection-icon');
    const glow = card.querySelector('.icon-glow');
    
    if (icon) {
        icon.style.transform = 'scale(1)';
    }
    
    if (glow) {
        glow.style.opacity = '0.5';
    }
}

function addSelectionEffect(card) {
    // Efecto de onda al seleccionar
    const ripple = document.createElement('div');
    ripple.className = 'selection-ripple';
    ripple.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0;
        height: 0;
        background: radial-gradient(circle, rgba(255,255,255,0.4), transparent);
        border-radius: 50%;
        transform: translate(-50%, -50%);
        animation: rippleEffect 0.8s ease-out;
        pointer-events: none;
        z-index: 5;
    `;
    
    card.appendChild(ripple);
    
    // Agregar CSS de animación si no existe
    if (!document.querySelector('#ripple-animation')) {
        const style = document.createElement('style');
        style.id = 'ripple-animation';
        style.textContent = `
            @keyframes rippleEffect {
                to {
                    width: 300px;
                    height: 300px;
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Remover el efecto después de la animación
    setTimeout(() => {
        ripple.remove();
    }, 800);
    
    // Efecto de scale en la card
    card.style.transform = 'scale(0.98)';
    setTimeout(() => {
        card.style.transform = '';
    }, 200);
}

function navigateToEquipment(type) {
    const currentPath = window.location.pathname;
    const isInViewFolder = currentPath.includes('/view/') || currentPath.includes('view/');
    
    let targetPage;
    
    if (type === 'computadora') {
        // Navegar a registro de computadoras
        if (isInViewFolder) {
            targetPage = `registro-sica.html?sica=${currentSICA}&tipo=computadora`;
        } else {
            targetPage = `view/registro-sica.html?sica=${currentSICA}&tipo=computadora`;
        }
    } else if (type === 'mesa') {
        // Navegar a registro de mesas
        if (isInViewFolder) {
            targetPage = `registro-sica.html?sica=${currentSICA}&tipo=mesa`;
        } else {
            targetPage = `view/registro-sica.html?sica=${currentSICA}&tipo=mesa`;
        }
    }
    
    console.log(`🎯 Navegando a: ${targetPage}`);
    
    // Mostrar notificación
    if (window.modernNav && window.modernNav.showModernNotification) {
        window.modernNav.showModernNotification(
            `${type === 'computadora' ? 'Computadora' : 'Mesa'} Seleccionada`,
            `Accediendo al registro de ${type}s...`,
            'success',
            type === 'computadora' ? 'bi-laptop' : 'bi-table'
        );
    }
    
    // Navegar
    window.location.href = targetPage;
}

function navigateBack() {
    // Efecto en el botón
    const backButton = document.getElementById('backButton');
    if (backButton) {
        backButton.style.transform = 'scale(0.95)';
        setTimeout(() => {
            backButton.style.transform = '';
        }, 150);
    }
    
    // Mostrar notificación
    if (window.modernNav && window.modernNav.showModernNotification) {
        window.modernNav.showModernNotification(
            'Regresando al Inicio',
            'Volviendo al menú principal...',
            'info',
            'bi-house-fill'
        );
    }
    
    // Navegar después de un pequeño delay
    setTimeout(() => {
        window.location.href = SICA_CONFIG.indexPath;
    }, 500);
}

function handleKeyboardNavigation(e) {
    // Navegación con teclado
    if (e.key === 'Escape') {
        navigateBack();
    } else if (e.key === '1') {
        const computadoraCard = document.querySelector('[data-type="computadora"]');
        if (computadoraCard) {
            handleCardSelection(computadoraCard);
        }
    } else if (e.key === '2') {
        const mesaCard = document.querySelector('[data-type="mesa"]');
        if (mesaCard) {
            handleCardSelection(mesaCard);
        }
    }
}

function setupAnimations() {
    // Animaciones de entrada
    const cards = document.querySelectorAll('.selection-card');
    
    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.2}s`;
    });
    
    // Animación del título
    const title = document.getElementById('main-title');
    if (title) {
        title.style.animation = 'fadeInUp 0.8s ease-out';
    }
    
    // Animación del subtítulo
    const subtitle = document.getElementById('subtitle');
    if (subtitle) {
        subtitle.style.animation = 'fadeInUp 0.8s ease-out 0.2s both';
    }
    
    // Botón de regresar removido - sin animación
    
    // Agregar CSS de animaciones si no existe
    if (!document.querySelector('#entrance-animations')) {
        const style = document.createElement('style');
        style.id = 'entrance-animations';
        style.textContent = `
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
        `;
        document.head.appendChild(style);
    }
}

// ✅ ARREGLAR NAVEGACIÓN DEL BOTÓN INICIO PARA MENU-SELECCION
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (window.modernNav) {
            window.modernNav.navigateToHome = function() {
                window.location.href = '../index.html';
                
                this.showModernNotification(
                    'Navegando al Inicio',
                    'Regresando a la página principal...',
                    'info',
                    'bi-house-fill'
                );
            };
        }
    }, 1500); // Esperar más tiempo para asegurar que se cargue
});

// Exportar funciones para uso global
window.MenuSeleccion = {
    getCurrentSICA: () => currentSICA,
    getCurrentSICAConfig: () => currentSICAConfig,
    navigateToEquipment,
    navigateBack
};