// Reglas SICA - JavaScript específico

// Datos de las reglas extraídos de la imagen
const reglasData = [
    {
        description: "NO portar EN TODO MOMENTO Y A LA VISTA, el gafete que los identifica como parte de SICA.",
        sanction: "REPORTE 0.5 HORAS",
        severity: "medium"
    },
    {
        description: "AMISTADES SIN GAFETE DE VISITANTES (el puntaje es por persona no identificada)",
        sanction: "REPORTE 0.5 HORAS",
        severity: "medium"
    },
    {
        description: "NO estar en su turno. El puntaje es por cada media hora de servicio.",
        sanction: "REPORTE 0.5 HORAS",
        severity: "medium"
    },
    {
        description: "Comer o beber en las áreas de ENTRADA e IMPRESIONES",
        sanction: "REPORTE 0.5 HORAS",
        severity: "medium"
    },
    {
        description: "Escuchar música en las áreas de ENTRADA e IMPRESIONES (con o sin audífonos)",
        sanction: "REPORTE 0.5 HORAS",
        severity: "high"
    },
    {
        description: "Desarrollar algún tipo de juego en las áreas expuestas al público.",
        sanction: "REPORTE 0.5 HORAS",
        severity: "medium"
    },
    {
        description: "Hacer escándalo dentro de las instalaciones de SICA.",
        sanction: "REPORTE 2.0 HORAS",
        severity: "high"
    },
    {
        description: "DPA (Demostración Pública de Afecto p. ej. besos, caricias, etc.)",
        sanction: "REPORTE 0.5 HORAS",
        severity: "medium"
    },
    {
        description: "Usar el teléfono de SICA para llamadas AJENAS a asuntos internos (sin autorización)",
        sanction: "REPORTE 0.5 HORAS",
        severity: "medium"
    },
    {
        description: "Hablar por teléfono celular durante su estancia en entrada e impresiones.",
        sanction: "REPORTE 0.5 HORAS",
        severity: "medium"
    },
    {
        description: "Utilizar dispositivos electrónicos mientras se vigile en un cursor examen.",
        sanction: "REPORTE 0.5 HORAS",
        severity: "medium"
    },
    {
        description: "Dejar basura en cualquier área de SICA.",
        sanction: "REPORTE 0.5 HORAS",
        severity: "medium"
    },
    {
        description: "No estar atendiendo sus actividades en el horario de servicio.",
        sanction: "REPORTE 0.5 HORAS",
        severity: "medium"
    },
    {
        description: "No participar en actividades diseñadas para el beneficio de SICA (estas actividades son únicamente dirigidas por administradores)",
        sanction: "REPORTE 0.5 HORAS",
        severity: "medium"
    },
    {
        description: "Tener visitas en horario de servicio (incluye ex-asesores)",
        sanction: "REPORTE 0.5 HORAS",
        severity: "medium"
    },
    {
        description: "Comportamiento indebido de las visitas.",
        sanction: "REPORTE 0.5 HORAS",
        severity: "medium"
    },
    {
        description: "Visitas NO registradas.",
        sanction: "REPORTE 0.5 HORAS",
        severity: "medium"
    },
    {
        description: "No registrar la hora de salida del(s) visitante(s)",
        sanction: "REPORTE 0.5 HORAS",
        severity: "medium"
    },
    {
        description: "No obedecer las actividades indicadas por el jefe de área y/o administrador y/o preadministrador.",
        sanction: "REPORTE 0.5 HORAS",
        severity: "medium"
    },
    {
        description: "Hacer mal uso de las instalaciones de SICA.",
        sancion: "REPORTE 0.5 HORAS",
        severity: "medium"
    },
    {
        description: "Imprimir sin el registro",
        sanction: "REPORTE 0.5 HORAS",
        severity: "medium"
    },
    {
        description: "Abandono de servicio dejando SOLO o con pocos asesores a cualquier SICA SIN PREVIO AVISO",
        sanction: "REPORTE 2.0 HORAS",
        severity: "high"
    },
    {
        description: "No ser cordial con el usuario o personal que visita las áreas de SICA.",
        sanction: "REPORTE 1.0 HORAS",
        severity: "high"
    },
    {
        description: "Hacer uso de los cubículos NO autorizados para visitas. El puntaje es por cada media hora de estancia.",
        sanction: "REPORTE 2.0 HORAS",
        severity: "high"
    },
    {
        description: "Hacer uso de las pantallas SIN autorización de RENE. El puntaje es por cada media hora de estancia.",
        sanction: "REPORTE 2.0 HORAS",
        severity: "high"
    }
];

// Variables globales
let currentFilter = 'all';
let searchTerm = '';

// Inicialización cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
});

function initializePage() {
    // Configurar título y breadcrumbs usando componentes SICA

    // Renderizar las reglas
    renderRules();
    
    // Agregar efectos de animación
    addScrollAnimations();
    
    // Configurar filtros si existen
    setupFilters();

    // Mostrar notificación de bienvenida
    setTimeout(() => {
        SICAComponents.notify(
            "Reglas de Servicio", 
            "Revisa todas las normativas para un mejor servicio", 
            "info", 
            "bi-info-circle"
        );
    }, 1000);
}

function renderRules() {
    const rulesGrid = document.getElementById('rulesGrid');
    if (!rulesGrid) return;

    rulesGrid.innerHTML = '';
    
    // Filtrar reglas según criterios actuales
    const filteredRules = filterRules();
    
    filteredRules.forEach((regla, index) => {
        const ruleCard = createRuleCard(regla, index);
        rulesGrid.appendChild(ruleCard);
    });

    // Si no hay reglas filtradas
    if (filteredRules.length === 0) {
        rulesGrid.innerHTML = `
            <div class="col-12 text-center p-5">
                <i class="bi bi-search display-1 text-muted"></i>
                <h3 class="mt-3 text-muted">No se encontraron reglas</h3>
                <p class="text-muted">Intenta modificar los filtros de búsqueda</p>
            </div>
        `;
    }
}

function createRuleCard(regla, index) {
    const card = document.createElement('div');
    card.className = `rule-card ${regla.severity}-severity`;
    card.style.animationDelay = `${index * 0.1}s`;
    
    // Determinar color de la insignia según severidad
    let badgeClass = '';
    let badgeText = '';
    switch(regla.severity) {
        case 'high':
            badgeClass = 'severity-high';
            badgeText = 'Alta';
            break;
        case 'medium':
            badgeClass = 'severity-medium';
            badgeText = 'Media';
            break;
        case 'low':
            badgeClass = 'severity-low';
            badgeText = 'Baja';
            break;
    }
    
    card.innerHTML = `
        <div class="severity-badge ${badgeClass}">${badgeText}</div>
        <div class="rule-description">
            ${regla.description}
        </div>
        <div class="rule-sanction">
            <i class="bi bi-clock-fill me-2"></i>
            ${regla.sanction}
        </div>
    `;
    
    return card;
}

function filterRules() {
    let filtered = [...reglasData];
    
    // Filtrar por severidad
    if (currentFilter !== 'all') {
        filtered = filtered.filter(regla => regla.severity === currentFilter);
    }
    
    // Filtrar por término de búsqueda
    if (searchTerm.trim() !== '') {
        filtered = filtered.filter(regla => 
            regla.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
    
    return filtered;
}

function setupFilters() {
    // Crear barra de filtros si no existe
    const rulesContainer = document.querySelector('.rules-container');
    if (!rulesContainer) return;
    
    const filtersHTML = `
        <div class="filters-section mb-4">
            <div class="row align-items-center">
                <div class="col-md-6">
                    <div class="filter-buttons">
                        <button class="btn btn-sica-outline active" onclick="filterBySeverity('all')">
                            <i class="bi bi-list"></i> Todas
                        </button>
                        <button class="btn btn-sica-outline" onclick="filterBySeverity('high')">
                            <i class="bi bi-exclamation-triangle"></i> Alta
                        </button>
                        <button class="btn btn-sica-outline" onclick="filterBySeverity('medium')">
                            <i class="bi bi-dash-circle"></i> Media
                        </button>
                        <button class="btn btn-sica-outline" onclick="filterBySeverity('low')">
                            <i class="bi bi-check-circle"></i> Baja
                        </button>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="search-box">
                        <div class="input-group">
                            <input type="text" class="form-control form-control-sica" 
                                   placeholder="Buscar reglas..." id="searchInput">
                            <button class="btn btn-sica" onclick="clearSearch()">
                                <i class="bi bi-x-lg"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    rulesContainer.insertAdjacentHTML('afterbegin', filtersHTML);
    
    // Configurar evento de búsqueda
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            searchTerm = this.value;
            renderRules();
        });
    }
}

function filterBySeverity(severity) {
    currentFilter = severity;
    
    // Actualizar botones activos
    document.querySelectorAll('.filter-buttons .btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    renderRules();
}

function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
        searchTerm = '';
        renderRules();
    }
}

function addScrollAnimations() {
    // Observer para animaciones al hacer scroll
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.style.animationPlayState = 'running';
            }
        });
    }, {
        threshold: 0.1
    });
    
    // Observar las tarjetas de reglas
    setTimeout(() => {
        document.querySelectorAll('.rule-card').forEach(card => {
            observer.observe(card);
        });
    }, 100);
}

function showContactInfo() {
    // Mostrar información de contacto usando el sistema de notificaciones
    SICAComponents.notify(
        "Contacto Administrativo", 
        "Dirígete a la oficina principal o contacta a tu administrador para resolver cualquier duda sobre las reglas de servicio.", 
        "info", 
        "bi-person-badge"
    );
}

// Función para mostrar estadísticas de reglas
function showRuleStats() {
    const totalRules = reglasData.length;
    const highSeverity = reglasData.filter(r => r.severity === 'high').length;
    const mediumSeverity = reglasData.filter(r => r.severity === 'medium').length;
    const lowSeverity = reglasData.filter(r => r.severity === 'low').length;
    
    const statsModal = `
        <div class="modal fade" id="statsModal" tabindex="-1" aria-labelledby="statsModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title" id="statsModalLabel">
                            <i class="bi bi-bar-chart-fill me-2"></i>
                            Estadísticas de Reglas
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row text-center">
                            <div class="col-6 col-md-3 mb-3">
                                <div class="stat-card">
                                    <div class="stat-number text-primary">${totalRules}</div>
                                    <div class="stat-label">Total</div>
                                </div>
                            </div>
                            <div class="col-6 col-md-3 mb-3">
                                <div class="stat-card">
                                    <div class="stat-number text-danger">${highSeverity}</div>
                                    <div class="stat-label">Alta</div>
                                </div>
                            </div>
                            <div class="col-6 col-md-3 mb-3">
                                <div class="stat-card">
                                    <div class="stat-number text-warning">${mediumSeverity}</div>
                                    <div class="stat-label">Media</div>
                                </div>
                            </div>
                            <div class="col-6 col-md-3 mb-3">
                                <div class="stat-card">
                                    <div class="stat-number text-success">${lowSeverity}</div>
                                    <div class="stat-label">Baja</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Agregar modal al DOM si no existe
    if (!document.getElementById('statsModal')) {
        document.body.insertAdjacentHTML('beforeend', statsModal);
    }
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('statsModal'));
    modal.show();
}

// Función para exportar reglas (simulada)
function exportRules() {
    try {
        const rulesText = reglasData.map((regla, index) => 
            `${index + 1}. ${regla.description}\n   Sanción: ${regla.sanction}\n   Severidad: ${getSeverityText(regla.severity)}\n`
        ).join('\n');
        
        const blob = new Blob([rulesText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'reglas-sica.txt';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        SICAComponents.notify(
            "Exportación Exitosa", 
            "Las reglas se han exportado correctamente", 
            "success", 
            "bi-download"
        );
    } catch (error) {
        SICAComponents.notify(
            "Error de Exportación", 
            "No se pudo exportar el archivo", 
            "error", 
            "bi-exclamation-triangle"
        );
    }
}

function getSeverityText(severity) {
    switch(severity) {
        case 'high': return 'Alta';
        case 'medium': return 'Media';
        case 'low': return 'Baja';
        default: return 'Sin definir';
    }
}

// Función para agregar botón de estadísticas
function addStatsButton() {
    const heroSection = document.querySelector('.hero-section');
    if (heroSection) {
        const statsButton = document.createElement('button');
        statsButton.className = 'btn btn-outline-light btn-lg mt-3';
        statsButton.onclick = showRuleStats;
        statsButton.innerHTML = '<i class="bi bi-bar-chart me-2"></i>Ver Estadísticas';
        
        const heroContent = heroSection.querySelector('.hero-content');
        if (heroContent) {
            heroContent.appendChild(statsButton);
        }
    }
}

// Función para manejar el modo oscuro específico de la página
function handleDarkMode() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    
    // Ajustar colores específicos para modo oscuro
    if (isDark) {
        document.documentElement.style.setProperty('--hero-gradient', 'linear-gradient(135deg, #1a2347 0%, #0d1425 50%, #8b7a47 100%)');
    } else {
        document.documentElement.style.setProperty('--hero-gradient', 'linear-gradient(135deg, #202c56 0%, #1a2347 50%, #ac965a 100%)');
    }
}

// Event listeners adicionales
window.addEventListener('load', function() {
    // Agregar botón de estadísticas después de que se cargue completamente
    setTimeout(() => {
        addStatsButton();
    }, 500);
    
    // Manejar cambios de tema
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
                handleDarkMode();
            }
        });
    });
    
    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
    });
    
    handleDarkMode();
});

// Función para copiar regla al portapapeles
function copyRuleToClipboard(ruleIndex) {
    const regla = reglasData[ruleIndex];
    const text = `${regla.description}\nSanción: ${regla.sanction}`;
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            SICAComponents.notify(
                "Copiado", 
                "Regla copiada al portapapeles", 
                "success", 
                "bi-clipboard-check"
            );
        });
    }
}

// Mejorar la función createRuleCard para incluir más funcionalidad
function createRuleCardEnhanced(regla, index) {
    const card = document.createElement('div');
    card.className = `rule-card ${regla.severity}-severity`;
    card.style.animationDelay = `${index * 0.1}s`;
    
    let badgeClass = '';
    let badgeText = '';
    let badgeIcon = '';
    
    switch(regla.severity) {
        case 'high':
            badgeClass = 'severity-high';
            badgeText = 'Alta';
            badgeIcon = 'bi-exclamation-triangle-fill';
            break;
        case 'medium':
            badgeClass = 'severity-medium';
            badgeText = 'Media';
            badgeIcon = 'bi-dash-circle-fill';
            break;
        case 'low':
            badgeClass = 'severity-low';
            badgeText = 'Baja';
            badgeIcon = 'bi-check-circle-fill';
            break;
    }
    
    card.innerHTML = `
        <div class="d-flex justify-content-between align-items-start mb-3">
            <div class="severity-badge ${badgeClass}">
                <i class="${badgeIcon} me-1"></i>${badgeText}
            </div>
            <div class="dropdown">
                <button class="btn btn-sm btn-outline-secondary" type="button" data-bs-toggle="dropdown">
                    <i class="bi bi-three-dots-vertical"></i>
                </button>
                <ul class="dropdown-menu">
                    <li><a class="dropdown-item" href="#" onclick="copyRuleToClipboard(${index})">
                        <i class="bi bi-clipboard me-2"></i>Copiar
                    </a></li>
                </ul>
            </div>
        </div>
        <div class="rule-description">
            ${regla.description}
        </div>
        <div class="rule-sanction">
            <i class="bi bi-clock-fill me-2"></i>
            ${regla.sanction}
        </div>
    `;
    
    return card;
}

// Exportar funciones globales para uso en HTML
window.filterBySeverity = filterBySeverity;
window.clearSearch = clearSearch;
window.showContactInfo = showContactInfo;
window.showRuleStats = showRuleStats;
window.exportRules = exportRules;
window.copyRuleToClipboard = copyRuleToClipboard;