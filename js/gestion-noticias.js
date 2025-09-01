// Gestión de Noticias - JavaScript

class GestionNoticias {
    constructor() {
        this.newsCollection = 'noticias';
        this.currentEditId = null;
        this.newsData = [];
        this.filteredNews = [];
        
        // Referencias DOM
        this.newsContainer = document.getElementById('newsContainer');
        this.searchInput = document.getElementById('searchInput');
        this.statusFilter = document.getElementById('statusFilter');
        this.categoryFilter = document.getElementById('categoryFilter');
        this.newsForm = document.getElementById('newsForm');
        this.newsModal = new bootstrap.Modal(document.getElementById('newsModal'));
        this.deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
        
        // Stats elements
        this.totalNewsEl = document.getElementById('total-news');
        this.publishedNewsEl = document.getElementById('published-news');
        this.draftNewsEl = document.getElementById('draft-news');
        this.recentNewsEl = document.getElementById('recent-news');
        
        // Bind methods
        this.init = this.init.bind(this);
        this.loadNews = this.loadNews.bind(this);
        this.renderNews = this.renderNews.bind(this);
        this.handleSearch = this.handleSearch.bind(this);
        this.handleFilter = this.handleFilter.bind(this);
        this.saveNews = this.saveNews.bind(this);
        this.editNews = this.editNews.bind(this);
        this.deleteNews = this.deleteNews.bind(this);
        
        this.init();
    }

    async init() {
        try {
            // Setup event listeners
            this.setupEventListeners();
            
            // Load initial data
            await this.loadNews();
            
            // Update stats
            this.updateStats();
            
            console.log('Gestión de Noticias initialized successfully');
        } catch (error) {
            console.error('Error initializing Gestión de Noticias:', error);
            this.showNotification('Error', 'Error al inicializar la aplicación', 'error');
        }
    }

    setupEventListeners() {
        // Search and filters
        this.searchInput?.addEventListener('input', this.handleSearch);
        this.statusFilter?.addEventListener('change', this.handleFilter);
        this.categoryFilter?.addEventListener('change', this.handleFilter);

        // Form submission
        document.getElementById('saveNewsBtn')?.addEventListener('click', this.saveNews);

        // Modal events
        document.getElementById('newsModal')?.addEventListener('hidden.bs.modal', () => {
            this.resetForm();
            this.currentEditId = null;
            document.getElementById('modalTitle').textContent = 'Nueva Noticia';
        });

        // Delete confirmation
        document.getElementById('confirmDeleteBtn')?.addEventListener('click', () => {
            if (this.currentDeleteId) {
                this.confirmDelete(this.currentDeleteId);
            }
        });

        // Real-time form validation
        document.getElementById('newsTitle')?.addEventListener('input', this.validateForm);
        document.getElementById('newsCategory')?.addEventListener('change', this.validateForm);
        document.getElementById('newsDescription')?.addEventListener('input', this.validateForm);
    }

    async loadNews() {
        try {
            this.showLoading(true);
            
            const querySnapshot = await firebase.firestore()
                .collection(this.newsCollection)
                .orderBy('createdAt', 'desc')
                .get();
            
            this.newsData = [];
            querySnapshot.forEach(doc => {
                const data = doc.data();
                this.newsData.push({
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate() || new Date(),
                    updatedAt: data.updatedAt?.toDate() || new Date()
                });
            });
            
            this.filteredNews = [...this.newsData];
            this.renderNews();
            this.updateStats();
            
        } catch (error) {
            console.error('Error loading news:', error);
            this.showError('Error al cargar las noticias');
        } finally {
            this.showLoading(false);
        }
    }

    renderNews() {
        if (!this.newsContainer) return;

        if (this.filteredNews.length === 0) {
            this.newsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-newspaper"></i>
                    <h5>No hay noticias</h5>
                    <p>No se encontraron noticias con los filtros aplicados.</p>
                </div>
            `;
            return;
        }

        const newsHTML = this.filteredNews.map(news => this.createNewsHTML(news)).join('');
        this.newsContainer.innerHTML = newsHTML;

        // Add animation
        const newsItems = this.newsContainer.querySelectorAll('.news-item');
        newsItems.forEach((item, index) => {
            setTimeout(() => {
                item.classList.add('fade-in');
            }, index * 100);
        });
    }

    createNewsHTML(news) {
        const formattedDate = this.formatDate(news.createdAt);
        const statusBadge = this.getStatusBadge(news.status);
        const priorityBadge = news.priority !== 'normal' ? this.getPriorityBadge(news.priority) : '';
        const categoryBadge = this.getCategoryBadge(news.category);

        return `
            <div class="news-item" data-id="${news.id}">
                <div class="news-meta">
                    <div class="news-icon">
                        <i class="bi ${news.icon || 'bi-newspaper'}"></i>
                    </div>
                    <div class="news-date">${formattedDate}</div>
                </div>
                
                <h6 class="news-title">${this.escapeHtml(news.title)}</h6>
                <p class="news-description">${this.escapeHtml(news.description)}</p>
                
                <div class="news-badges">
                    ${statusBadge}
                    ${priorityBadge}
                    ${categoryBadge}
                </div>
                
                <div class="news-actions">
                    <button class="btn-action" onclick="gestionNoticias.editNews('${news.id}')" title="Editar">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn-action" onclick="gestionNoticias.toggleStatus('${news.id}')" title="Cambiar estado">
                        <i class="bi ${news.status === 'published' ? 'bi-eye-slash' : 'bi-eye'}"></i>
                    </button>
                    <button class="btn-action" onclick="gestionNoticias.duplicateNews('${news.id}')" title="Duplicar">
                        <i class="bi bi-files"></i>
                    </button>
                    <button class="btn-action btn-danger" onclick="gestionNoticias.deleteNews('${news.id}')" title="Eliminar">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    getStatusBadge(status) {
        const badges = {
            'published': '<span class="news-badge badge-published">Publicado</span>',
            'draft': '<span class="news-badge badge-draft">Borrador</span>'
        };
        return badges[status] || '';
    }

    getPriorityBadge(priority) {
        const badges = {
            'high': '<span class="news-badge badge-high">Alta prioridad</span>',
            'urgent': '<span class="news-badge badge-urgent">Urgente</span>'
        };
        return badges[priority] || '';
    }

    getCategoryBadge(category) {
        const categories = {
            'general': 'General',
            'actualizacion': 'Actualización',
            'mantenimiento': 'Mantenimiento',
            'evento': 'Evento'
        };
        return `<span class="news-badge" style="background: rgba(32, 44, 86, 0.1); color: var(--primary-blue); border: 1px solid rgba(32, 44, 86, 0.3);">${categories[category] || category}</span>`;
    }

    handleSearch() {
        const searchTerm = this.searchInput?.value.toLowerCase() || '';
        this.applyFilters(searchTerm);
    }

    handleFilter() {
        const searchTerm = this.searchInput?.value.toLowerCase() || '';
        this.applyFilters(searchTerm);
    }

    applyFilters(searchTerm = '') {
        const statusFilter = this.statusFilter?.value || '';
        const categoryFilter = this.categoryFilter?.value || '';

        this.filteredNews = this.newsData.filter(news => {
            const matchesSearch = !searchTerm || 
                news.title.toLowerCase().includes(searchTerm) ||
                news.description.toLowerCase().includes(searchTerm);
            
            const matchesStatus = !statusFilter || news.status === statusFilter;
            const matchesCategory = !categoryFilter || news.category === categoryFilter;

            return matchesSearch && matchesStatus && matchesCategory;
        });

        this.renderNews();
    }

    async saveNews() {
        try {
            if (!this.validateForm()) return;

            const formData = this.getFormData();
            const saveButton = document.getElementById('saveNewsBtn');
            
            this.setButtonLoading(saveButton, true);

            if (this.currentEditId) {
                // Update existing news
                await firebase.firestore()
                    .collection(this.newsCollection)
                    .doc(this.currentEditId)
                    .update({
                        ...formData,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                
                this.showNotification('Éxito', 'Noticia actualizada correctamente', 'success');
            } else {
                // Create new news
                await firebase.firestore()
                    .collection(this.newsCollection)
                    .add({
                        ...formData,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                
                this.showNotification('Éxito', 'Noticia creada correctamente', 'success');
            }

            this.newsModal.hide();
            await this.loadNews();

        } catch (error) {
            console.error('Error saving news:', error);
            this.showNotification('Error', 'Error al guardar la noticia', 'error');
        } finally {
            this.setButtonLoading(document.getElementById('saveNewsBtn'), false);
        }
    }

    async editNews(id) {
        try {
            const news = this.newsData.find(n => n.id === id);
            if (!news) return;

            this.currentEditId = id;
            
            // Fill form with news data
            document.getElementById('newsTitle').value = news.title || '';
            document.getElementById('newsCategory').value = news.category || '';
            document.getElementById('newsIcon').value = news.icon || 'bi-newspaper';
            document.getElementById('newsDescription').value = news.description || '';
            document.getElementById('newsContent').value = news.content || '';
            document.getElementById('newsStatus').value = news.status || 'draft';
            document.getElementById('newsPriority').value = news.priority || 'normal';

            // Update modal title
            document.getElementById('modalTitle').textContent = 'Editar Noticia';
            
            this.newsModal.show();

        } catch (error) {
            console.error('Error editing news:', error);
            this.showNotification('Error', 'Error al cargar la noticia para editar', 'error');
        }
    }

    deleteNews(id) {
        const news = this.newsData.find(n => n.id === id);
        if (!news) return;

        this.currentDeleteId = id;
        
        // Fill delete modal with news info
        document.getElementById('deleteNewsTitle').textContent = news.title;
        document.getElementById('deleteNewsDate').textContent = this.formatDate(news.createdAt);
        
        this.deleteModal.show();
    }

    async confirmDelete(id) {
        try {
            await firebase.firestore()
                .collection(this.newsCollection)
                .doc(id)
                .delete();
            
            this.showNotification('Éxito', 'Noticia eliminada correctamente', 'success');
            this.deleteModal.hide();
            await this.loadNews();

        } catch (error) {
            console.error('Error deleting news:', error);
            this.showNotification('Error', 'Error al eliminar la noticia', 'error');
        }
    }

    async toggleStatus(id) {
        try {
            const news = this.newsData.find(n => n.id === id);
            if (!news) return;

            const newStatus = news.status === 'published' ? 'draft' : 'published';
            
            await firebase.firestore()
                .collection(this.newsCollection)
                .doc(id)
                .update({
                    status: newStatus,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

            this.showNotification('Éxito', `Noticia ${newStatus === 'published' ? 'publicada' : 'guardada como borrador'}`, 'success');
            await this.loadNews();

        } catch (error) {
            console.error('Error toggling status:', error);
            this.showNotification('Error', 'Error al cambiar el estado', 'error');
        }
    }

    async duplicateNews(id) {
        try {
            const news = this.newsData.find(n => n.id === id);
            if (!news) return;

            const duplicatedNews = {
                ...news,
                title: `${news.title} (Copia)`,
                status: 'draft'
            };

            // Remove id and timestamps
            delete duplicatedNews.id;
            delete duplicatedNews.createdAt;
            delete duplicatedNews.updatedAt;

            await firebase.firestore()
                .collection(this.newsCollection)
                .add({
                    ...duplicatedNews,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

            this.showNotification('Éxito', 'Noticia duplicada correctamente', 'success');
            await this.loadNews();

        } catch (error) {
            console.error('Error duplicating news:', error);
            this.showNotification('Error', 'Error al duplicar la noticia', 'error');
        }
    }

    getFormData() {
        return {
            title: document.getElementById('newsTitle').value.trim(),
            category: document.getElementById('newsCategory').value,
            icon: document.getElementById('newsIcon').value,
            description: document.getElementById('newsDescription').value.trim(),
            content: document.getElementById('newsContent').value.trim(),
            status: document.getElementById('newsStatus').value,
            priority: document.getElementById('newsPriority').value
        };
    }

    validateForm() {
        const title = document.getElementById('newsTitle').value.trim();
        const category = document.getElementById('newsCategory').value;
        const description = document.getElementById('newsDescription').value.trim();
        
        const isValid = title && category && description;
        
        // Enable/disable save button
        const saveButton = document.getElementById('saveNewsBtn');
        if (saveButton) {
            saveButton.disabled = !isValid;
        }

        return isValid;
    }

    resetForm() {
        if (this.newsForm) {
            this.newsForm.reset();
        }
        
        // Reset validation states
        document.querySelectorAll('.is-invalid').forEach(el => {
            el.classList.remove('is-invalid');
        });
        
        document.querySelectorAll('.invalid-feedback').forEach(el => {
            el.remove();
        });

        // Enable save button
        const saveButton = document.getElementById('saveNewsBtn');
        if (saveButton) {
            saveButton.disabled = false;
        }
    }

    updateStats() {
        const total = this.newsData.length;
        const published = this.newsData.filter(n => n.status === 'published').length;
        const drafts = this.newsData.filter(n => n.status === 'draft').length;
        
        // Recent news (last 7 days)
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const recent = this.newsData.filter(n => n.createdAt > weekAgo).length;

        // Animate counters
        this.animateCounter(this.totalNewsEl, total);
        this.animateCounter(this.publishedNewsEl, published);
        this.animateCounter(this.draftNewsEl, drafts);
        this.animateCounter(this.recentNewsEl, recent);
    }

    animateCounter(element, targetValue) {
        if (!element) return;
        
        const currentValue = parseInt(element.textContent) || 0;
        const increment = targetValue > currentValue ? 1 : -1;
        const duration = 1000;
        const steps = Math.abs(targetValue - currentValue);
        const stepTime = duration / steps;

        let current = currentValue;
        
        const timer = setInterval(() => {
            current += increment;
            element.textContent = current;
            
            if (current === targetValue) {
                clearInterval(timer);
            }
        }, stepTime);
    }

    showLoading(show) {
        const loadingState = document.getElementById('loadingState');
        if (loadingState) {
            loadingState.style.display = show ? 'block' : 'none';
        }
        
        if (!show && this.newsContainer) {
            this.newsContainer.style.display = 'block';
        }
    }

    showError(message) {
        if (this.newsContainer) {
            this.newsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-exclamation-triangle text-danger"></i>
                    <h5>Error</h5>
                    <p>${message}</p>
                    <button class="btn btn-sica mt-3" onclick="gestionNoticias.loadNews()">
                        <i class="bi bi-arrow-clockwise me-2"></i>Reintentar
                    </button>
                </div>
            `;
        }
    }

    setButtonLoading(button, loading) {
        if (!button) return;
        
        if (loading) {
            button.disabled = true;
            button.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Guardando...';
        } else {
            button.disabled = false;
            button.innerHTML = '<i class="bi bi-check-circle me-2"></i>Guardar Noticia';
        }
    }

    showNotification(title, message, type = 'info') {
        // Use the modern notification system from navigation.js
        if (window.modernNav && window.modernNav.showModernNotification) {
            const icons = {
                success: 'bi-check-circle-fill',
                error: 'bi-exclamation-triangle-fill',
                warning: 'bi-exclamation-circle-fill',
                info: 'bi-info-circle-fill'
            };
            
            window.modernNav.showModernNotification(title, message, type, icons[type]);
        } else {
            // Fallback notification
            alert(`${title}: ${message}`);
        }
    }

    formatDate(date) {
        if (!date) return '';
        
        const options = {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        
        return date.toLocaleDateString('es-ES', options);
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
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Authentication check
    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = '../view/login.html';
            return;
        }
        
        // Initialize the news management system
        window.gestionNoticias = new GestionNoticias();
    });
});

// Export for global access
if (typeof window !== 'undefined') {
    window.GestionNoticias = GestionNoticias;
}