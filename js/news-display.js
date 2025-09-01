// News Display for Index Page - JavaScript

class NewsDisplay {
    constructor() {
        this.newsCollection = 'noticias';
        this.maxNewsToShow = 6; // Máximo número de noticias a mostrar
        this.init();
    }

    async init() {
        try {
            await this.loadAndDisplayNews();
        } catch (error) {
            console.error('Error loading news:', error);
            this.showErrorState();
        }
    }

    async loadAndDisplayNews() {
        try {
            // Show loading state
            this.showLoadingState();

            // Get published news ordered by date
            const querySnapshot = await firebase.firestore()
                .collection(this.newsCollection)
                .where('status', '==', 'published')
                .orderBy('createdAt', 'desc')
                .limit(this.maxNewsToShow)
                .get();

            const newsData = [];
            querySnapshot.forEach(doc => {
                const data = doc.data();
                newsData.push({
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate() || new Date()
                });
            });

            if (newsData.length > 0) {
                this.displayNews(newsData);
            } else {
                this.showEmptyState();
            }

        } catch (error) {
            console.error('Error fetching news:', error);
            this.showErrorState();
        }
    }

    displayNews(newsData) {
        const newsContainer = document.querySelector('.news-section .row.g-4');
        if (!newsContainer) return;

        // Clear existing content except the title row
        const titleRow = newsContainer.parentElement.querySelector('.row').innerHTML;
        newsContainer.innerHTML = '';

        // Generate news cards HTML
        const newsHTML = newsData.map(news => this.createNewsCard(news)).join('');
        newsContainer.innerHTML = newsHTML;

        // Add animation to cards
        const newsCards = newsContainer.querySelectorAll('.news-card');
        newsCards.forEach((card, index) => {
            setTimeout(() => {
                card.classList.add('fade-in');
            }, index * 150);
        });
    }

    createNewsCard(news) {
        const formattedDate = this.formatDate(news.createdAt);
        const icon = news.icon || 'bi-newspaper';
        const title = this.escapeHtml(news.title);
        const description = this.escapeHtml(news.description);
        const priority = news.priority || 'normal';
        
        // Add priority indicator
        const priorityClass = priority === 'urgent' ? 'news-card-urgent' : 
                             priority === 'high' ? 'news-card-high' : '';

        return `
            <div class="col-lg-4 col-md-6">
                <div class="news-card card-modern ${priorityClass}" data-id="${news.id}">
                    <div class="news-header">
                        <i class="bi ${icon} news-icon"></i>
                        <div class="news-date">${formattedDate}</div>
                        ${priority === 'urgent' ? '<span class="priority-badge urgent">Urgente</span>' : ''}
                        ${priority === 'high' ? '<span class="priority-badge high">Prioritario</span>' : ''}
                    </div>
                    <div class="news-body">
                        <h5 class="news-title">${title}</h5>
                        <p class="news-description">${description}</p>
                        ${news.content ? `<a href="#" class="news-link" onclick="newsDisplay.showFullNews('${news.id}')">Leer más</a>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    showFullNews(newsId) {
        // Find the news item
        const querySnapshot = firebase.firestore()
            .collection(this.newsCollection)
            .doc(newsId)
            .get()
            .then(doc => {
                if (doc.exists) {
                    const news = doc.data();
                    this.displayFullNewsModal(news);
                }
            })
            .catch(error => {
                console.error('Error fetching full news:', error);
            });
    }

    displayFullNewsModal(news) {
        // Create modal if it doesn't exist
        let modal = document.getElementById('fullNewsModal');
        if (!modal) {
            modal = this.createFullNewsModal();
            document.body.appendChild(modal);
        }

        // Fill modal content
        const modalTitle = modal.querySelector('.modal-title');
        const modalBody = modal.querySelector('.modal-body');
        const modalDate = modal.querySelector('.news-modal-date');

        modalTitle.innerHTML = `<i class="bi ${news.icon || 'bi-newspaper'} me-2"></i>${this.escapeHtml(news.title)}`;
        modalDate.textContent = this.formatDate(news.createdAt?.toDate() || new Date());
        modalBody.innerHTML = `
            <div class="news-full-content">
                <p class="lead">${this.escapeHtml(news.description)}</p>
                ${news.content ? `<div class="news-content mt-4">${this.formatContent(news.content)}</div>` : ''}
            </div>
        `;

        // Show modal
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
    }

    createFullNewsModal() {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'fullNewsModal';
        modal.tabIndex = -1;
        modal.innerHTML = `
            <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                <div class="modal-content modal-modern">
                    <div class="modal-header">
                        <h5 class="modal-title"></h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="news-modal-date text-muted mb-3"></div>
                        <!-- Content will be inserted here -->
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
                            <i class="bi bi-x-circle me-2"></i>Cerrar
                        </button>
                    </div>
                </div>
            </div>
        `;
        return modal;
    }

    showLoadingState() {
        const newsContainer = document.querySelector('.news-section .row.g-4');
        if (!newsContainer) return;

        newsContainer.innerHTML = `
            <div class="col-12">
                <div class="text-center py-5">
                    <div class="spinner-border text-primary mb-3" role="status">
                        <span class="visually-hidden">Cargando...</span>
                    </div>
                    <p class="text-muted">Cargando noticias...</p>
                </div>
            </div>
        `;
    }

    showEmptyState() {
        const newsContainer = document.querySelector('.news-section .row.g-4');
        if (!newsContainer) return;

        newsContainer.innerHTML = `
            <div class="col-12">
                <div class="text-center py-5">
                    <i class="bi bi-newspaper display-1 text-muted mb-3"></i>
                    <h4 class="text-muted">No hay noticias disponibles</h4>
                    <p class="text-muted">Aún no se han publicado noticias. Vuelve pronto para ver las últimas actualizaciones.</p>
                </div>
            </div>
        `;
    }

    showErrorState() {
        const newsContainer = document.querySelector('.news-section .row.g-4');
        if (!newsContainer) return;

        newsContainer.innerHTML = `
            <div class="col-12">
                <div class="text-center py-5">
                    <i class="bi bi-exclamation-triangle display-1 text-warning mb-3"></i>
                    <h4 class="text-muted">Error al cargar noticias</h4>
                    <p class="text-muted">No se pudieron cargar las noticias. Por favor, intenta recargar la página.</p>
                    <button class="btn btn-sica mt-3" onclick="newsDisplay.loadAndDisplayNews()">
                        <i class="bi bi-arrow-clockwise me-2"></i>Reintentar
                    </button>
                </div>
            </div>
        `;
    }

    formatDate(date) {
        if (!date) return '';
        
        const options = {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        };
        
        return date.toLocaleDateString('es-ES', options);
    }

    formatContent(content) {
        // Simple content formatting - convert line breaks to paragraphs
        return content
            .split('\n\n')
            .map(paragraph => `<p>${this.escapeHtml(paragraph.trim())}</p>`)
            .join('');
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    // Method to refresh news (can be called from other parts of the app)
    async refresh() {
        await this.loadAndDisplayNews();
    }
}

// Additional CSS for news display enhancements
const additionalStyles = `
    <style>
    /* Priority indicators */
    .news-card-urgent {
        border-left: 4px solid #dc3545 !important;
        animation: pulse-urgent 2s infinite;
    }
    
    .news-card-high {
        border-left: 4px solid #ffc107 !important;
    }
    
    @keyframes pulse-urgent {
        0%, 100% { box-shadow: 0 8px 25px rgba(220, 53, 69, 0.15); }
        50% { box-shadow: 0 8px 25px rgba(220, 53, 69, 0.25); }
    }
    
    .priority-badge {
        position: absolute;
        top: 10px;
        right: 10px;
        padding: 0.25rem 0.5rem;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    .priority-badge.urgent {
        background: rgba(220, 53, 69, 0.1);
        color: #dc3545;
        border: 1px solid rgba(220, 53, 69, 0.3);
    }
    
    .priority-badge.high {
        background: rgba(255, 193, 7, 0.1);
        color: #ffc107;
        border: 1px solid rgba(255, 193, 7, 0.3);
    }
    
    /* Enhanced news cards */
    .news-card {
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
    }
    
    .news-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, rgba(172, 150, 90, 0.1) 0%, transparent 100%);
        opacity: 0;
        transition: opacity 0.4s ease;
    }
    
    .news-card:hover::before {
        opacity: 1;
    }
    
    .news-card:hover {
        transform: translateY(-8px) scale(1.02);
        box-shadow: 0 20px 40px rgba(32, 44, 86, 0.15);
    }
    
    .news-header {
        position: relative;
        z-index: 2;
    }
    
    .news-body {
        position: relative;
        z-index: 2;
    }
    
    /* Animation classes */
    .fade-in {
        animation: fadeInUp 0.6s ease-out forwards;
        opacity: 0;
        transform: translateY(30px);
    }
    
    @keyframes fadeInUp {
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    /* Modal enhancements */
    .modal-modern .news-full-content {
        line-height: 1.7;
    }
    
    .modal-modern .news-content p {
        margin-bottom: 1rem;
    }
    
    .news-modal-date {
        font-size: 0.9rem;
        font-weight: 500;
        border-bottom: 1px solid var(--border-color);
        padding-bottom: 0.75rem;
    }
    
    /* Dark mode support */
    [data-theme="dark"] .news-card-urgent {
        border-left-color: #ff6b7a !important;
    }
    
    [data-theme="dark"] .news-card-high {
        border-left-color: #ffda6a !important;
    }
    
    [data-theme="dark"] .priority-badge.urgent {
        background: rgba(255, 107, 122, 0.15);
        color: #ff6b7a;
        border-color: rgba(255, 107, 122, 0.3);
    }
    
    [data-theme="dark"] .priority-badge.high {
        background: rgba(255, 218, 106, 0.15);
        color: #ffda6a;
        border-color: rgba(255, 218, 106, 0.3);
    }
    </style>
`;

// Initialize when DOM is loaded and Firebase is available
document.addEventListener('DOMContentLoaded', () => {
    // Add additional styles
    document.head.insertAdjacentHTML('beforeend', additionalStyles);
    
    // Check if Firebase is loaded
    const initNewsDisplay = () => {
        if (typeof firebase !== 'undefined' && firebase.firestore) {
            window.newsDisplay = new NewsDisplay();
        } else {
            // If Firebase is not loaded yet, wait a bit and try again
            setTimeout(initNewsDisplay, 1000);
        }
    };
    
    initNewsDisplay();
});

// Auto-refresh news every 5 minutes (optional)
setInterval(() => {
    if (window.newsDisplay && typeof window.newsDisplay.refresh === 'function') {
        window.newsDisplay.refresh();
    }
}, 5 * 60 * 1000); // 5 minutes

// Export for global access
if (typeof window !== 'undefined') {
    window.NewsDisplay = NewsDisplay;
}