// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar funcionalidades
    initializeApp();
});

/**
 * Función principal para inicializar todas las funcionalidades
 */
function initializeApp() {
    updateCurrentTime();
    setupDarkModeToggle();
    setupNavigationHandlers();
    setupNewsCardAnimations();
    setupResponsiveHandlers();
    
    // Actualizar la hora cada segundo
    setInterval(updateCurrentTime, 1000);
    
    console.log('SICA - Sistema iniciado correctamente');
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
    
    // Verificar que el elemento existe
    if (!darkModeToggle) {
        console.error('No se encontró el elemento darkModeToggle');
        return;
    }
    
    const darkModeIcon = darkModeToggle.querySelector('i');
    
    // Verificar que el icono existe
    if (!darkModeIcon) {
        console.error('No se encontró el icono dentro del darkModeToggle');
        return;
    }
    
    // Verificar si hay una preferencia guardada
    const savedTheme = localStorage.getItem('sica-theme');
    if (savedTheme) {
        // Solo aplicar si hay una preferencia específica guardada
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateDarkModeIcon(savedTheme === 'dark');
    } else {
        // Por defecto usar modo claro, sin detectar preferencia del sistema
        document.documentElement.setAttribute('data-theme', 'light');
        updateDarkModeIcon(false);
        // Guardar la preferencia por defecto
        localStorage.setItem('sica-theme', 'light');
    }
    
    // Manejar click en el toggle
    darkModeToggle.addEventListener('click', function(e) {
        e.preventDefault();
        toggleDarkMode();
    });
    
    /**
     * Alternar entre modo oscuro y claro
     */
    function toggleDarkMode() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        // Usar clave específica para evitar conflictos con otras apps
        localStorage.setItem('sica-theme', newTheme);
        updateDarkModeIcon(newTheme === 'dark');
        
        // Agregar efecto de transición suave
        document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
        setTimeout(() => {
            document.body.style.transition = '';
        }, 300);
        
        // Log para debug (opcional)
        console.log(`Tema cambiado a: ${newTheme}`);
    }
    
    /**
     * Actualizar el icono del modo oscuro
     */
    function updateDarkModeIcon(isDark) {
        const darkModeToggle = document.getElementById('darkModeToggle');
        if (!darkModeToggle) return;
        
        const darkModeIcon = darkModeToggle.querySelector('i');
        if (!darkModeIcon) return;
        
        // Buscar el texto del enlace de manera más segura
        const linkElement = darkModeToggle;
        const textNodes = Array.from(linkElement.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
        
        if (isDark) {
            darkModeIcon.className = 'bi bi-sun me-2';
            // Actualizar texto de manera segura
            if (textNodes.length > 0) {
                textNodes[textNodes.length - 1].textContent = 'Modo Claro';
            } else {
                // Si no hay nodos de texto, crear uno
                linkElement.appendChild(document.createTextNode('Modo Claro'));
            }
        } else {
            darkModeIcon.className = 'bi bi-moon me-2';
            // Actualizar texto de manera segura
            if (textNodes.length > 0) {
                textNodes[textNodes.length - 1].textContent = 'Modo Oscuro';
            } else {
                // Si no hay nodos de texto, crear uno
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
            // Aquí se podría cargar contenido dinámico o redirigir
            break;
        case 'lista':
            showNotification('Pase de Lista', 'Accediendo al sistema de asistencia...', 'info');
            // Aquí se podría abrir modal o redirigir
            break;
        case 'ingreso':
            showNotification('Ingreso', 'Redirigiendo al sistema de ingreso...', 'success');
            // Aquí se podría redirigir al login
            break;
        default:
            console.log('Sección no reconocida:', section);
    }
}

/**
 * Mostrar notificación toast
 */
function showNotification(title, message, type = 'info') {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show notification-toast`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    `;
    
    notification.innerHTML = `
        <strong>${title}</strong><br>${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

/**
 * Configurar animaciones para las cards de noticias
 */
function setupNewsCardAnimations() {
    const newsCards = document.querySelectorAll('.news-card');
    
    // Intersection Observer para animaciones al scroll
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '50px'
    });
    
    newsCards.forEach(card => {
        // Establecer estado inicial
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        
        observer.observe(card);
        
        // Agregar efecto hover mejorado
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
}

/**
 * Configurar manejadores para diseño responsivo
 */
function setupResponsiveHandlers() {
    // Manejar cambios de tamaño de ventana
    window.addEventListener('resize', handleWindowResize);
    
    // Configuración inicial
    handleWindowResize();
}

/**
 * Manejar cambios de tamaño de ventana
 */
function handleWindowResize() {
    const width = window.innerWidth;
    
    // Ajustar comportamiento según el tamaño de pantalla
    if (width < 768) {
        // Móvil - colapsar navbar automáticamente después de hacer clic
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

/**
 * Utilidades adicionales
 */
const Utils = {
    /**
     * Formatear fecha en español
     */
    formatDate: function(date) {
        return new Intl.DateTimeFormat('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(date);
    },
    
    /**
     * Validar email
     */
    validateEmail: function(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },
    
    /**
     * Debounce para optimizar eventos
     */
    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    /**
     * Smooth scroll hacia un elemento
     */
    smoothScrollTo: function(element) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    },
    
    /**
     * Generar ID único
     */
    generateId: function() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
};

/**
 * Manejo de errores global
 */
window.addEventListener('error', function(e) {
    console.error('Error en la aplicación:', e.error);
    // Aquí se podría enviar el error a un servicio de logging
});

/**
 * Manejo de errores de promesas no capturadas
 */
window.addEventListener('unhandledrejection', function(e) {
    console.error('Promise rechazada no manejada:', e.reason);
    e.preventDefault();
});

/**
 * Funciones adicionales para futuras mejoras
 */

/**
 * Cargar datos dinámicos de noticias
 */
function loadNewsData() {
    // Esta función se puede usar para cargar noticias desde una API
    // Por ahora retorna datos estáticos como ejemplo
    return new Promise((resolve) => {
        setTimeout(() => {
            const newsData = [
                {
                    id: 1,
                    title: 'Nuevos Horarios de Servicio',
                    description: 'Se han actualizado los horarios de atención de la sala de cómputo para el semestre actual.',
                    date: '2025-07-05',
                    icon: 'bi-calendar-event',
                    category: 'horario'
                },
                {
                    id: 2,
                    title: 'Actualización de Software',
                    description: 'Todos los equipos han sido actualizados con las últimas versiones de software académico.',
                    date: '2025-07-03',
                    icon: 'bi-pc-display',
                    category: 'sistema'
                }
                // Más noticias...
            ];
            resolve(newsData);
        }, 1000);
    });
}

/**
 * Filtrar noticias por categoría
 */
function filterNews(category) {
    const newsCards = document.querySelectorAll('.news-card');
    
    newsCards.forEach(card => {
        const cardCategory = card.getAttribute('data-category');
        if (category === 'all' || cardCategory === category) {
            card.style.display = 'block';
            card.style.animation = 'fadeIn 0.5s ease forwards';
        } else {
            card.style.display = 'none';
        }
    });
}

/**
 * Configurar búsqueda en tiempo real
 */
function setupSearchFunctionality() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        const debouncedSearch = Utils.debounce(performSearch, 300);
        searchInput.addEventListener('input', debouncedSearch);
    }
}

/**
 * Realizar búsqueda en las noticias
 */
function performSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    const newsCards = document.querySelectorAll('.news-card');
    
    newsCards.forEach(card => {
        const title = card.querySelector('.news-title').textContent.toLowerCase();
        const description = card.querySelector('.news-description').textContent.toLowerCase();
        
        if (title.includes(searchTerm) || description.includes(searchTerm)) {
            card.style.display = 'block';
            highlightSearchTerm(card, searchTerm);
        } else {
            card.style.display = 'none';
        }
    });
}

/**
 * Resaltar términos de búsqueda
 */
function highlightSearchTerm(card, term) {
    if (!term) return;
    
    const title = card.querySelector('.news-title');
    const description = card.querySelector('.news-description');
    
    [title, description].forEach(element => {
        const originalText = element.textContent;
        const highlightedText = originalText.replace(
            new RegExp(term, 'gi'),
            `<mark class="highlight">    /**
     * Debounce para optimizar eventos
     */
    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later,</mark>`
        );
        element.innerHTML = highlightedText;
    });
}

/**
 * Configurar shortcuts de teclado
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + K para abrir búsqueda
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.focus();
            }
        }
        
        // Ctrl/Cmd + D para toggle de modo oscuro
        if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
            e.preventDefault();
            document.getElementById('darkModeToggle').click();
        }
    });
}

/**
 * Configurar lazy loading para imágenes
 */
function setupLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');
    
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    imageObserver.unobserve(img);
                }
            });
        });
        
        images.forEach(img => imageObserver.observe(img));
    } else {
        // Fallback para navegadores sin soporte
        images.forEach(img => {
            img.src = img.dataset.src;
        });
    }
}

/**
 * Configurar PWA (Progressive Web App) básico
 */
function setupPWA() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('Service Worker registrado:', registration);
            })
            .catch(error => {
                console.log('Error al registrar Service Worker:', error);
            });
    }
}

/**
 * Configurar notificaciones push (opcional)
 */
function setupPushNotifications() {
    if ('Notification' in window) {
        // Solicitar permiso para notificaciones
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                console.log('Permisos de notificación concedidos');
            }
        });
    }
}

/**
 * Inicializar funcionalidades adicionales cuando sea necesario
 */
function initializeAdvancedFeatures() {
    setupSearchFunctionality();
    setupKeyboardShortcuts();
    setupLazyLoading();
    
    // Características opcionales
    if (window.location.protocol === 'https:') {
        setupPWA();
        setupPushNotifications();
    }
}

// Llamar a las funciones adicionales después de la inicialización básica
setTimeout(initializeAdvancedFeatures, 1000);

// Exportar funciones para uso global si es necesario
window.SICAApp = {
    Utils,
    showNotification,
    filterNews,
    loadNewsData,
    performSearch
};