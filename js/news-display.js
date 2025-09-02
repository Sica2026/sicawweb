// News Display - Versión Simplificada que funciona siempre

class NewsDisplay {
    constructor() {
        this.newsCollection = 'noticias';
        this.maxNewsToShow = 6;
        this.init();
    }

    async init() {
        console.log('🚀 Iniciando News Display Simplificado...');
        
        // Buscar contenedor
        const newsContainer = this.findNewsContainer();
        if (!newsContainer) {
            console.error('❌ No se encontró contenedor de noticias');
            return;
        }

        // Intentar cargar desde Firebase con timeout
        const firebaseLoaded = await this.tryFirebaseWithTimeout(3000);
        
        if (firebaseLoaded) {
            console.log('✅ Cargando desde Firebase');
            await this.loadFromFirebase(newsContainer);
        } else {
            console.log('⚠️ Usando noticias por defecto');
            this.showDefaultNews(newsContainer);
        }
    }

    async tryFirebaseWithTimeout(timeout) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            
            const checkFirebase = () => {
                if (typeof firebase !== 'undefined' && 
                    firebase.firestore && 
                    firebase.app) {
                    try {
                        // Intentar acceder a la configuración
                        const app = firebase.app();
                        if (app && app.options && app.options.projectId) {
                            console.log('✅ Firebase configurado correctamente');
                            resolve(true);
                            return;
                        }
                    } catch (error) {
                        console.log('⚠️ Firebase no configurado correctamente:', error.message);
                    }
                }
                
                // Check timeout
                if (Date.now() - startTime > timeout) {
                    console.log('⏰ Timeout esperando Firebase');
                    resolve(false);
                } else {
                    setTimeout(checkFirebase, 500);
                }
            };
            
            checkFirebase();
        });
    }

    async loadFromFirebase(container) {
        try {
            this.showLoading(container);

            const snapshot = await firebase.firestore()
                .collection(this.newsCollection)
                .where('estado', '==', 'publicada')
                .where('visibilidad', '==', 'publica')
                .orderBy('fechaCreacion', 'desc')
                .limit(this.maxNewsToShow)
                .get();

            const noticias = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                noticias.push({
                    id: doc.id,
                    ...data,
                    fechaCreacion: data.fechaCreacion?.toDate() || new Date()
                });
            });

            if (noticias.length > 0) {
                console.log(`✅ Cargadas ${noticias.length} noticias desde Firebase`);
                this.displayNews(container, noticias);
            } else {
                console.log('⚠️ No hay noticias publicadas, mostrando por defecto');
                this.showDefaultNews(container);
            }

        } catch (error) {
            console.error('❌ Error cargando desde Firebase:', error);
            this.showDefaultNews(container);
        }
    }

    findNewsContainer() {
        const selectors = [
            '#dynamic-news-container',
            '.news-section .row.g-4',
            '.news-section .row:last-child'
        ];

        for (const selector of selectors) {
            const container = document.querySelector(selector);
            if (container) {
                console.log(`📍 Contenedor encontrado: ${selector}`);
                return container;
            }
        }

        return null;
    }

    showLoading(container) {
        container.innerHTML = `
            <div class="col-12">
                <div class="text-center py-4">
                    <div class="spinner-border text-primary mb-3" role="status">
                        <span class="visually-hidden">Cargando...</span>
                    </div>
                    <p class="text-muted">Cargando noticias desde Firebase...</p>
                </div>
            </div>
        `;
    }

    displayNews(container, noticias) {
        const newsHTML = noticias.map(noticia => this.createNewsCard(noticia)).join('');
        container.innerHTML = newsHTML;

        // Añadir animaciones
        const cards = container.querySelectorAll('.news-card');
        cards.forEach((card, index) => {
            setTimeout(() => {
                card.classList.add('fade-in');
            }, index * 150);
        });
    }

    createNewsCard(noticia) {
        const fecha = this.formatDate(noticia.fechaCreacion);
        const icono = noticia.imagenUrl || 'bi-newspaper';
        const titulo = this.escapeHtml(noticia.titulo);
        const resumen = this.escapeHtml(noticia.resumen);
        const prioridad = noticia.prioridad || 'normal';
        
        // Clases y badges de prioridad
        let priorityClass = '';
        let priorityBadge = '';
        
        if (prioridad === 'urgente') {
            priorityClass = 'border-danger';
            priorityBadge = '<span class="badge bg-danger position-absolute top-0 end-0 m-2">Urgente</span>';
        } else if (prioridad === 'importante') {
            priorityClass = 'border-warning';
            priorityBadge = '<span class="badge bg-warning position-absolute top-0 end-0 m-2">Importante</span>';
        }

        // Click handler
        let clickHandler = '';
        if (noticia.liga) {
            clickHandler = `onclick="window.open('${noticia.liga}', '_blank')" style="cursor: pointer;"`;
        } else if (noticia.contenido && noticia.contenido !== 'CADA NOTICIA') {
            clickHandler = `onclick="newsDisplay.showFullNews('${noticia.id}')" style="cursor: pointer;"`;
        }

        return `
            <div class="col-lg-4 col-md-6">
                <div class="news-card card h-100 ${priorityClass}" data-id="${noticia.id}" ${clickHandler}>
                    ${priorityBadge}
                    <div class="card-header bg-primary text-white position-relative">
                        <div class="news-header-content">
                            <div class="d-flex align-items-center mb-2">
                                <i class="bi ${icono} me-2 fs-4"></i>
                                <h5 class="card-title text-white mb-0 flex-grow-1">${titulo}</h5>
                            </div>
                            <small class="news-date position-absolute bottom-0 end-0 m-2 opacity-75">${fecha}</small>
                        </div>
                    </div>
                    <div class="card-body">
                        <p class="card-text">${resumen}</p>
                        ${(noticia.contenido && noticia.contenido !== 'CADA NOTICIA') || noticia.liga ? 
                            '<small class="text-muted"><i class="bi bi-arrow-right me-1"></i>Click para más información</small>' : 
                            ''
                        }
                    </div>
                </div>
            </div>
        `;
    }

    showDefaultNews(container) {
        console.log('📰 Mostrando noticias por defecto');
        
        const defaultNews = [
            {
                icono: 'bi-calendar-event',
                fecha: '5 Sep 2025',
                titulo: 'Nuevos Horarios de Servicio',
                resumen: 'Se han actualizado los horarios de atención de la sala de cómputo para el semestre actual.'
            },
            {
                icono: 'bi-pc-display', 
                fecha: '3 Sep 2025',
                titulo: 'Actualización de Software',
                resumen: 'Todos los equipos han sido actualizados con las últimas versiones de software académico.'
            },
            {
                icono: 'bi-shield-check',
                fecha: '1 Sep 2025', 
                titulo: 'Medidas de Seguridad',
                resumen: 'Recordatorio sobre las medidas de seguridad e higiene vigentes en la sala.'
            },
            {
                icono: 'bi-book',
                fecha: '28 Ago 2025',
                titulo: 'Recursos Académicos',
                resumen: 'Nuevos recursos digitales disponibles para apoyo académico de los estudiantes.'
            },
            {
                icono: 'bi-tools',
                fecha: '25 Ago 2025',
                titulo: 'Mantenimiento Programado',
                resumen: 'Información sobre las fechas de mantenimiento preventivo de los equipos.'
            },
            {
                icono: 'bi-people',
                fecha: '22 Ago 2025',
                titulo: 'Capacitación Disponible',
                resumen: 'Sesiones de capacitación gratuitas para el uso de software especializado.'
            }
        ];

        const newsHTML = defaultNews.map(news => `
            <div class="col-lg-4 col-md-6">
                <div class="news-card card h-100 fade-in">
                    <div class="card-header bg-primary text-white position-relative">
                        <div class="news-header-content">
                            <div class="d-flex align-items-center mb-2">
                                <i class="bi ${news.icono} me-2 fs-4"></i>
                                <h5 class="card-title text-white mb-0 flex-grow-1">${news.titulo}</h5>
                            </div>
                            <small class="news-date position-absolute bottom-0 end-0 m-2 opacity-75">${news.fecha}</small>
                        </div>
                    </div>
                    <div class="card-body">
                        <p class="card-text">${news.resumen}</p>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = newsHTML;
    }

    showFullNews(newsId) {
        if (typeof firebase === 'undefined') return;

        firebase.firestore()
            .collection(this.newsCollection)
            .doc(newsId)
            .get()
            .then(doc => {
                if (doc.exists) {
                    const noticia = doc.data();
                    this.displayFullNewsModal(noticia);
                }
            })
            .catch(error => {
                console.error('Error cargando noticia completa:', error);
            });
    }

    displayFullNewsModal(noticia) {
        let modal = document.getElementById('fullNewsModal');
        if (!modal) {
            modal = this.createFullNewsModal();
            document.body.appendChild(modal);
        }

        const modalTitle = modal.querySelector('.modal-title');
        const modalBody = modal.querySelector('.modal-body');

        modalTitle.innerHTML = `<i class="bi ${noticia.imagenUrl || 'bi-newspaper'} me-2"></i>${this.escapeHtml(noticia.titulo)}`;
        modalBody.innerHTML = `
            <div class="mb-3">
                <small class="text-muted">
                    <i class="bi bi-calendar me-1"></i>${this.formatDate(noticia.fechaCreacion?.toDate ? noticia.fechaCreacion.toDate() : new Date())}
                    ${noticia.autor ? ` | <i class="bi bi-person me-1"></i>${this.escapeHtml(noticia.autor)}` : ''}
                </small>
            </div>
            <div class="news-full-content">
                <p class="lead">${this.escapeHtml(noticia.resumen)}</p>
                ${noticia.contenido && noticia.contenido !== 'CADA NOTICIA' ? 
                    `<hr><div class="mt-3">${this.formatContent(noticia.contenido)}</div>` : 
                    ''
                }
            </div>
        `;

        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
    }

    createFullNewsModal() {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'fullNewsModal';
        modal.tabIndex = -1;
        modal.innerHTML = `
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title"></h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body"></div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <i class="bi bi-x-circle me-2"></i>Cerrar
                        </button>
                    </div>
                </div>
            </div>
        `;
        return modal;
    }

    formatDate(date) {
        if (!date) return 'Sin fecha';
        const options = { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
        };
        return date.toLocaleDateString('es-ES', options);
    }

    formatContent(content) {
        return content
            .split('\n\n')
            .map(paragraph => `<p>${this.escapeHtml(paragraph.trim())}</p>`)
            .join('');
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;', '<': '&lt;', '>': '&gt;',
            '"': '&quot;', "'": '&#039;'
        };
        return text ? text.replace(/[&<>"']/g, m => map[m]) : '';
    }

    // Método público para refrescar
    async refresh() {
        await this.init();
    }
}

// Estilos mejorados
const newsStyles = `
<style>
.news-card {
    transition: all 0.3s ease;
    border: none;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    border-radius: 15px;
    overflow: hidden;
}

.news-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 25px rgba(0, 56, 117, 0.15);
}

.news-card[onclick] {
    cursor: pointer;
}

.news-card .card-header {
    background: linear-gradient(135deg, #003875 0%, #0056b3 100%) !important;
    border: none;
    padding: 1rem;
    position: relative;
    min-height: 80px;
}

.news-header-content {
    width: 100%;
    height: 100%;
    position: relative;
}

.news-card .card-title {
    font-size: 1rem;
    font-weight: 600;
    line-height: 1.3;
    margin: 0;
    color: white !important;
    flex-grow: 1;
    padding-right: 60px; /* Espacio para la fecha */
}

.news-date {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.85) !important;
    font-weight: 500;
    white-space: nowrap;
}

.border-danger {
    border-left: 5px solid #dc3545 !important;
}

.border-warning {
    border-left: 5px solid #ffc107 !important;
}

.fade-in {
    animation: fadeInUp 0.6s ease-out;
}

@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .news-card .card-title {
        font-size: 0.9rem;
        padding-right: 50px;
    }
    
    .news-date {
        font-size: 0.7rem;
    }
    
    .news-card .card-header {
        min-height: 70px;
        padding: 0.75rem;
    }
}

/* Dark mode support */
[data-theme="dark"] .news-card {
    background: #1a1a1a;
    border: 1px solid #333;
}

[data-theme="dark"] .news-card .card-body {
    background: #1a1a1a;
    color: #e0e0e0;
}
</style>
`;

// Inicialización robusta
function initNewsDisplay() {
    console.log('📰 Preparando News Display...');
    
    // Agregar estilos
    if (!document.querySelector('#news-display-styles')) {
        const styleDiv = document.createElement('div');
        styleDiv.id = 'news-display-styles';
        styleDiv.innerHTML = newsStyles;
        document.head.appendChild(styleDiv);
    }
    
    // Crear instancia
    window.newsDisplay = new NewsDisplay();
}

// Múltiples formas de inicialización
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNewsDisplay);
} else if (document.readyState === 'interactive' || document.readyState === 'complete') {
    setTimeout(initNewsDisplay, 500);
}

// Export
if (typeof window !== 'undefined') {
    window.NewsDisplay = NewsDisplay;
    window.initNewsDisplay = initNewsDisplay;
}