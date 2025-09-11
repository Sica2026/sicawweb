/* ============================================
   REGLAMENTO DE PAGO DE HORAS - JAVASCRIPT
   Funcionalidades interactivas y animaciones
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
    initializeReglamentoPage();
});

function initializeReglamentoPage() {
    // Configurar página con componentes SICA
    setupPageComponents();
    
    // Inicializar animaciones
    initializeAnimations();
    
    // Configurar interactividad
    setupInteractivity();
    
    // Configurar efectos de scroll
    setupScrollEffects();
    
    // Configurar funcionalidades adicionales
    setupAdditionalFeatures();
}

/* ============================================
   CONFIGURACIÓN DE COMPONENTES SICA
   ============================================ */

function setupPageComponents() {
    // Configurar título de página
    if (window.SICAComponents) {
        SICAComponents.setPageTitle("Reglamento de Pago de Horas - SICA");

    }
}

/* ============================================
   ANIMACIONES INICIALES
   ============================================ */

function initializeAnimations() {
    // Animar cards con delay escalonado
    const ruleCards = document.querySelectorAll('.rule-card');
    ruleCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });
    
    // Animar números con efecto de conteo
    animateRuleNumbers();
    
    // Inicializar efectos de partículas en el hero
    initializeHeroParticles();
}

function animateRuleNumbers() {
    const ruleNumbers = document.querySelectorAll('.rule-number');
    
    ruleNumbers.forEach((number, index) => {
        const finalValue = parseInt(number.textContent);
        let currentValue = 0;
        const increment = finalValue / 20;
        const duration = 1000;
        const interval = duration / 20;
        
        number.textContent = '0';
        
        setTimeout(() => {
            const counter = setInterval(() => {
                currentValue += increment;
                if (currentValue >= finalValue) {
                    currentValue = finalValue;
                    clearInterval(counter);
                }
                number.textContent = Math.floor(currentValue);
            }, interval);
        }, index * 200);
    });
}

function initializeHeroParticles() {
    const heroSection = document.querySelector('.hero-section');
    if (!heroSection) return;
    
    // Crear partículas flotantes
    for (let i = 0; i < 20; i++) {
        createFloatingParticle(heroSection);
    }
}

function createFloatingParticle(container) {
    const particle = document.createElement('div');
    particle.className = 'floating-particle';
    particle.style.cssText = `
        position: absolute;
        width: 4px;
        height: 4px;
        background: rgba(255, 184, 0, 0.6);
        border-radius: 50%;
        pointer-events: none;
        animation: float ${5 + Math.random() * 5}s linear infinite;
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        opacity: ${0.3 + Math.random() * 0.7};
    `;
    
    container.appendChild(particle);
    
    // Remover partícula después de la animación
    setTimeout(() => {
        if (particle.parentNode) {
            particle.parentNode.removeChild(particle);
        }
    }, 10000);
}

/* ============================================
   INTERACTIVIDAD
   ============================================ */

function setupInteractivity() {
    // Efectos hover avanzados para las cards
    setupAdvancedCardHovers();
    
    // Modal de información detallada
    setupRuleModals();
    
    // Botón de contacto
    setupContactButton();
    
    // Efectos de sonido (si están disponibles)
    setupSoundEffects();
}

function setupAdvancedCardHovers() {
    const ruleCards = document.querySelectorAll('.rule-card');
    
    ruleCards.forEach(card => {
        // Efecto de seguimiento del mouse
        card.addEventListener('mousemove', function(e) {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = (y - centerY) / 10;
            const rotateY = (centerX - x) / 10;
            
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-10px) scale(1.02)`;
        });
        
        card.addEventListener('mouseleave', function() {
            card.style.transform = '';
        });
        
        // Efecto de click con ripple
        card.addEventListener('click', function(e) {
            createRippleEffect(e, card);
        });
    });
}

function createRippleEffect(event, element) {
    const circle = document.createElement('span');
    const diameter = Math.max(element.clientWidth, element.clientHeight);
    const radius = diameter / 2;
    
    const rect = element.getBoundingClientRect();
    circle.style.width = circle.style.height = diameter + 'px';
    circle.style.left = event.clientX - rect.left - radius + 'px';
    circle.style.top = event.clientY - rect.top - radius + 'px';
    circle.classList.add('ripple');
    
    const rippleCSS = `
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 184, 0, 0.3);
        transform: scale(0);
        animation: ripple 0.6s linear;
        pointer-events: none;
        z-index: 1000;
    `;
    circle.style.cssText = rippleCSS;
    
    // Agregar animación CSS dinámicamente
    if (!document.querySelector('#ripple-animation')) {
        const style = document.createElement('style');
        style.id = 'ripple-animation';
        style.textContent = `
            @keyframes ripple {
                to {
                    transform: scale(4);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    const ripple = element.querySelector('.ripple');
    if (ripple) {
        ripple.remove();
    }
    
    element.appendChild(circle);
    
    setTimeout(() => {
        circle.remove();
    }, 600);
}

function setupRuleModals() {
    // Crear modal dinámico para información adicional
    const modalHTML = `
        <div class="modal fade" id="ruleModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content border-0 shadow-lg" style="border-radius: 20px; background: linear-gradient(135deg, #003f7f 0%, #1a5a9e 100%);">
                    <div class="modal-header border-0 text-white">
                        <h5 class="modal-title" id="ruleModalTitle"></h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body text-white" id="ruleModalBody">
                    </div>
                    <div class="modal-footer border-0">
                        <button type="button" class="btn btn-warning" data-bs-dismiss="modal">Entendido</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Configurar información adicional para cada regla
    const ruleDetails = {
        1: {
            title: "Autorización Previa - Detalles",
            content: `
                <p><strong>Canales de comunicación aceptados:</strong></p>
                <ul>
                    <li>Consulta presencial con el administrador</li>
                    <li>Mensaje directo vía WhatsApp</li>
                </ul>
                <p><strong>Información a proporcionar:</strong></p>
                <ul>
                    <li>Fecha y horario deseado</li>
                    <li>Motivo del pago de horas</li>
                    <li>SICA de preferencia</li>
                </ul>
            `
        },
        2: {
            title: "Ubicación Autorizada - Detalles",
            content: `
                <p><strong>¿Por qué es importante?</strong></p>
                <ul>
                    <li>Distribución equitativa de personal</li>
                    <li>Cobertura adecuada en todos los SICA</li>
                    <li>Optimización de recursos</li>
                </ul>
                <p><strong>Recuerda:</strong> No puedes cambiar de SICA sin autorización previa.</p>
            `
        },
        3: {
            title: "Cumplimiento de Actividades - Detalles",
            content: `
                <p><strong>Actividades principales:</strong></p>
                <ul>
                    <li>Atención en entrada</li>
                    <li>Servicio de impresiones</li>
                    <li>Preparación de salas</li>
                    <li>Apoyo en exámenes</li>
                    <li>Mantenimiento básico</li>
                </ul>
                <p><strong>Nota:</strong> Aunque estés pagando horas, sigues siendo parte del equipo activo.</p>
            `
        },
        4: {
            title: "Apoyo Inmediato - Detalles",
            content: `
                <p><strong>Áreas críticas de apoyo:</strong></p>
                <ul>
                    <li>Entrada principal (alta demanda)</li>
                    <li>Área de impresiones (períodos pico)</li>
                    <li>Salas de examen</li>
                    <li>Eventos especiales</li>
                </ul>
                <p><strong>Flexibilidad:</strong> Mantente atento a las necesidades del momento.</p>
            `
        },
        5: {
            title: "Sin Autorización = Sin Validez - Detalles",
            content: `
                <p><strong>Consecuencias:</strong></p>
                <ul>
                    <li>Las horas trabajadas no serán contabilizadas</li>
                    <li>No se computarán como pago de deuda</li>
                    <li>No contarán para adelanto de horas</li>
                </ul>
                <p><strong>Importante:</strong> Siempre confirma la autorización antes de presentarte.</p>
            `
        },
        6: {
            title: "Anuncio en Grupo - Detalles",
            content: `
                <p><strong>Información a incluir en el anuncio:</strong></p>
                <ul>
                    <li>Nombre del asesor</li>
                    <li>Horario de trabajo</li>
                    <li>SICA asignado</li>
                    <li>Administrador que autorizó</li>
                    <li>Tipo de pago (deuda/adelanto)</li>
                </ul>
                <p><strong>Verificación:</strong> Confirma que tus horas fueron registradas correctamente.</p>
            `
        },
        7: {
            title: "Modificaciones de Horario - Detalles",
            content: `
                <p><strong>Situaciones que requieren autorización:</strong></p>
                <ul>
                    <li>Salida temprana</li>
                    <li>Llegada tardía</li>
                    <li>Cambio de turno</li>
                    <li>Ausencia temporal</li>
                </ul>
                <p><strong>Procedimiento:</strong> Contactar al administrador ANTES de realizar el cambio.</p>
            `
        },
                // Agregar estas entradas al objeto ruleDetails:
        8: {
            title: "Requisito de Asistencia - Detalles",
            content: `
                <p><strong>Límite de inasistencias:</strong></p>
                <ul>
                    <li>Máximo 2 inasistencias consecutivas permitidas</li>
                    <li>La tercera inasistencia consecutiva anula el derecho</li>
                    <li>Se reinicia el conteo después de una asistencia</li>
                </ul>
                <p><strong>Importante:</strong> Las inasistencias deben ser <em>consecutivas</em> para aplicar esta regla.</p>
                <p><strong>Recomendación:</strong> Mantén un registro de tu asistencia para evitar superar el límite.</p>
            `
        },
        9: {
            title: "Penalización por Inasistencias - Detalles",
            content: `
                <p><strong>Aplicación de la penalización:</strong></p>
                <ul>
                    <li>Se activa automáticamente tras 3 inasistencias consecutivas</li>
                    <li>Duración: 4 días calendario completos</li>
                    <li>Durante estos días NO puedes pagar horas</li>
                    <li>La penalización es inapelable</li>
                </ul>
                <p><strong>Reinicio:</strong> Después de los 4 días, puedes solicitar nuevamente el pago de horas.</p>
                <p><strong>Prevención:</strong> Comunica tus ausencias con anticipación cuando sea posible.</p>
            `
        },
        10: {
            title: "Exclusión del Cálculo - Detalles",
            content: `
                <p><strong>Diferenciación importante:</strong></p>
                <ul>
                    <li><strong>Asistencia regular:</strong> Cuenta para el cálculo de inasistencias</li>
                    <li><strong>Pago de horas:</strong> NO cuenta como asistencia regular</li>
                </ul>
                <p><strong>Implicaciones:</strong></p>
                <ul>
                    <li>Los días de pago de horas no interrumpen el conteo de inasistencias consecutivas</li>
                    <li>Solo la asistencia en horario oficial cuenta para romper la secuencia</li>
                </ul>
                <p><strong>Ejemplo:</strong> Si faltas lunes y martes, pagar horas el miércoles no interrumpe el conteo. Si faltas el jueves, ya serían 3 inasistencias consecutivas.</p>
            `
        }
    }; 
    
    // Agregar listeners a las cards
    document.querySelectorAll('.rule-card').forEach(card => {
        card.addEventListener('dblclick', function() {
            const ruleNumber = this.getAttribute('data-rule');
            const ruleInfo = ruleDetails[ruleNumber];
            
            if (ruleInfo) {
                document.getElementById('ruleModalTitle').textContent = ruleInfo.title;
                document.getElementById('ruleModalBody').innerHTML = ruleInfo.content;
                
                const modal = new bootstrap.Modal(document.getElementById('ruleModal'));
                modal.show();
            }
        });
    });
}

function setupContactButton() {
    const contactButton = document.querySelector('.contact-section .btn');
    if (contactButton) {
        contactButton.addEventListener('click', function() {
            // Simular contacto con administrador
            if (window.SICAComponents) {
                window.SICAComponents.notify(
                    "Contacto Solicitado",
                    "Se ha notificado a los administradores de tu solicitud de contacto.",
                    "info",
                    "bi-person-badge"
                );
            }
            
            // Efecto visual en el botón
            this.innerHTML = '<i class="bi bi-check-circle-fill me-2"></i>Notificación Enviada';
            this.classList.remove('btn-sica');
            this.classList.add('btn-success');
            
            setTimeout(() => {
                this.innerHTML = '<i class="bi bi-person-badge-fill me-2"></i>Contactar Administrador';
                this.classList.remove('btn-success');
                this.classList.add('btn-sica');
            }, 3000);
        });
    }
}

function setupSoundEffects() {
    // Verificar si hay soporte para sonidos
    if (window.modernNav && window.modernNav.soundEnabled) {
        // Sonido para hover en cards
        document.querySelectorAll('.rule-card').forEach(card => {
            card.addEventListener('mouseenter', () => {
                playHoverSound();
            });
        });
        
        // Sonido para clicks
        document.querySelectorAll('.rule-card, .btn').forEach(element => {
            element.addEventListener('click', () => {
                playClickSound();
            });
        });
    }
}

function playHoverSound() {
    // Implementar sonido de hover si está disponible
    if (window.modernNav && typeof window.modernNav.playSound === 'function') {
        window.modernNav.playSound('hover');
    }
}

function playClickSound() {
    // Implementar sonido de click si está disponible
    if (window.modernNav && typeof window.modernNav.playSound === 'function') {
        window.modernNav.playSound('click');
    }
}

/* ============================================
   EFECTOS DE SCROLL
   ============================================ */

function setupScrollEffects() {
    // Observador de intersección para animaciones en scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                
                // Efecto especial para cards de reglas
                if (entry.target.classList.contains('rule-card')) {
                    const number = entry.target.querySelector('.rule-number');
                    if (number) {
                        number.style.animation = 'pulse 1s ease-in-out';
                    }
                }
            }
        });
    }, observerOptions);
    
    // Observar elementos
    document.querySelectorAll('.rule-card, .intro-card, .important-notice, .contact-section').forEach(el => {
        observer.observe(el);
    });
    
    // Parallax suave para el hero
    setupParallaxEffect();
}

function setupParallaxEffect() {
    const hero = document.querySelector('.hero-section');
    if (!hero) return;
    
    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.5;
        
        hero.style.transform = `translateY(${rate}px)`;
    });
}

/* ============================================
   FUNCIONALIDADES ADICIONALES
   ============================================ */

function setupAdditionalFeatures() {
    // Tooltip informativo
    setupTooltips();
    
    // Modo de lectura
    setupReadingMode();
    
    // Compartir página
    setupShareFunctionality();
    
    // Búsqueda rápida
    setupQuickSearch();
}

function setupTooltips() {
    // Agregar tooltips a iconos
    document.querySelectorAll('.rule-icon i, .intro-icon i, .notice-icon i').forEach(icon => {
        const tooltipText = getTooltipText(icon.className);
        if (tooltipText) {
            icon.setAttribute('title', tooltipText);
            icon.setAttribute('data-bs-toggle', 'tooltip');
        }
    });
    
    // Inicializar tooltips de Bootstrap
    if (typeof bootstrap !== 'undefined') {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }
}

function getTooltipText(iconClass) {
    const tooltips = {
        'bi-person-check-fill': 'Autorización requerida',
        'bi-geo-alt-fill': 'Ubicación específica',
        'bi-list-task': 'Actividades a realizar',
        'bi-eye-fill': 'Mantente atento',
        'bi-x-circle-fill': 'Requisito obligatorio',
        'bi-chat-dots-fill': 'Comunicación grupal',
        'bi-calendar-event': 'Gestión de horarios'
    };
    
    for (const [className, text] of Object.entries(tooltips)) {
        if (iconClass.includes(className)) {
            return text;
        }
    }
    return null;
}

function setupReadingMode() {
    // Crear botón de modo lectura
    const readingButton = document.createElement('button');
    readingButton.innerHTML = '<i class="bi bi-book"></i> Modo Lectura';
    readingButton.className = 'btn btn-outline-secondary position-fixed';
    readingButton.style.cssText = `
        bottom: 20px;
        right: 20px;
        z-index: 1050;
        border-radius: 50px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    `;
    
    readingButton.addEventListener('click', toggleReadingMode);
    document.body.appendChild(readingButton);
}

function toggleReadingMode() {
    const body = document.body;
    const isReadingMode = body.classList.contains('reading-mode');
    
    if (isReadingMode) {
        body.classList.remove('reading-mode');
        document.querySelector('.btn[onclick*="toggleReadingMode"]').innerHTML = 
            '<i class="bi bi-book"></i> Modo Lectura';
    } else {
        body.classList.add('reading-mode');
        document.querySelector('.btn[onclick*="toggleReadingMode"]').innerHTML = 
            '<i class="bi bi-book-fill"></i> Salir Modo Lectura';
    }
    
    // Agregar estilos de modo lectura
    if (!document.querySelector('#reading-mode-styles')) {
        const styles = document.createElement('style');
        styles.id = 'reading-mode-styles';
        styles.textContent = `
            .reading-mode {
                filter: sepia(0.1) contrast(1.2);
            }
            .reading-mode .rule-card {
                box-shadow: none !important;
                border: 1px solid #ddd !important;
            }
            .reading-mode .hero-section::before {
                opacity: 0.3 !important;
            }
        `;
        document.head.appendChild(styles);
    }
}

function setupShareFunctionality() {
    // Crear botón de compartir
    const shareButton = document.createElement('button');
    shareButton.innerHTML = '<i class="bi bi-share"></i>';
    shareButton.className = 'btn btn-primary position-fixed rounded-circle';
    shareButton.style.cssText = `
        bottom: 80px;
        right: 20px;
        z-index: 1050;
        width: 50px;
        height: 50px;
        box-shadow: 0 4px 15px rgba(0,63,127,0.3);
    `;
    
    shareButton.addEventListener('click', function() {
        if (navigator.share) {
            navigator.share({
                title: 'Reglamento de Pago de Horas - SICA',
                text: 'Consulta el reglamento oficial para el pago de horas de asesores SICA',
                url: window.location.href
            });
        } else {
            // Fallback: copiar URL al clipboard
            navigator.clipboard.writeText(window.location.href).then(() => {
                if (window.SICAComponents) {
                    window.SICAComponents.notify(
                        "Enlace Copiado",
                        "El enlace ha sido copiado al portapapeles",
                        "success",
                        "bi-clipboard-check"
                    );
                }
            });
        }
    });
    
    document.body.appendChild(shareButton);
}

function setupQuickSearch() {
    // Crear barra de búsqueda rápida
    const searchContainer = document.createElement('div');
    searchContainer.className = 'position-fixed';
    searchContainer.style.cssText = `
        top: 100px;
        right: 20px;
        z-index: 1050;
        width: 300px;
        display: none;
    `;
    
    searchContainer.innerHTML = `
        <div class="input-group">
            <input type="text" class="form-control" id="quickSearch" placeholder="Buscar en reglamento...">
            <button class="btn btn-outline-secondary" type="button" id="clearSearch">
                <i class="bi bi-x"></i>
            </button>
        </div>
        <div id="searchResults" class="bg-white border rounded mt-2 p-2" style="display: none;"></div>
    `;
    
    document.body.appendChild(searchContainer);
    
    // Configurar búsqueda con Ctrl+F
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'f') {
            e.preventDefault();
            searchContainer.style.display = 'block';
            document.getElementById('quickSearch').focus();
        }
        
        if (e.key === 'Escape') {
            searchContainer.style.display = 'none';
        }
    });
    
    // Implementar búsqueda en tiempo real
    document.getElementById('quickSearch').addEventListener('input', performQuickSearch);
    document.getElementById('clearSearch').addEventListener('click', clearQuickSearch);
}

function performQuickSearch() {
    const query = document.getElementById('quickSearch').value.toLowerCase();
    const results = document.getElementById('searchResults');
    
    if (query.length < 2) {
        results.style.display = 'none';
        return;
    }
    
    const searchableContent = document.querySelectorAll('.rule-content p, .intro-content p, .notice-content p');
    const matches = [];
    
    searchableContent.forEach((element, index) => {
        const text = element.textContent.toLowerCase();
        if (text.includes(query)) {
            const card = element.closest('.rule-card, .intro-card, .important-notice');
            const title = card ? (card.querySelector('h4, h3')?.textContent || `Resultado ${index + 1}`) : `Resultado ${index + 1}`;
            
            matches.push({
                title: title,
                element: element,
                card: card
            });
        }
    });
    
    if (matches.length > 0) {
        results.innerHTML = matches.map(match => 
            `<div class="search-result p-2 border-bottom cursor-pointer hover:bg-light" data-target="${matches.indexOf(match)}">
                <strong>${match.title}</strong>
            </div>`
        ).join('');
        
        results.style.display = 'block';
        
        // Agregar listeners para ir a resultados
        results.querySelectorAll('.search-result').forEach((result, index) => {
            result.addEventListener('click', () => {
                matches[index].card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                matches[index].card.style.animation = 'highlight 2s ease-out';
                clearQuickSearch();
            });
        });
    } else {
        results.innerHTML = '<div class="p-2 text-muted">No se encontraron resultados</div>';
        results.style.display = 'block';
    }
}

function clearQuickSearch() {
    document.getElementById('quickSearch').value = '';
    document.getElementById('searchResults').style.display = 'none';
    document.querySelector('.position-fixed:has(#quickSearch)').style.display = 'none';
}

/* ============================================
   UTILIDADES
   ============================================ */

// Agregar estilos CSS adicionales dinámicamente
function addDynamicStyles() {
    const additionalStyles = `
        @keyframes highlight {
            0% { background: rgba(255, 184, 0, 0.3); }
            100% { background: transparent; }
        }
        
        @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            33% { transform: translateY(-10px) rotate(120deg); }
            66% { transform: translateY(10px) rotate(240deg); }
        }
        
        .animate-in {
            animation: fadeInUp 0.8s ease-out;
        }
        
        .cursor-pointer {
            cursor: pointer;
        }
        
        .hover\\:bg-light:hover {
            background-color: #f8f9fa !important;
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = additionalStyles;
    document.head.appendChild(styleSheet);
}

// Inicializar estilos dinámicos
addDynamicStyles();

// Exportar funciones para uso externo
window.ReglamentoPage = {
    initializeReglamentoPage,
    toggleReadingMode,
    performQuickSearch,
    clearQuickSearch
};