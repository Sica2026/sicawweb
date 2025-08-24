// PAGREN - Panel de Enlaces UNAM
// JavaScript para gestión de enlaces

class PagrenManager {
    constructor() {
        this.links = [];
        this.filteredLinks = [];
        this.currentCategory = 'all';
        this.searchQuery = '';
        this.editingLink = null;
        this.db = firebase.firestore();
        this.auth = firebase.auth();
        
        // Configuración de colección
        this.collection = 'pagren_links';
        
        // Elementos DOM
        this.elements = {
            linksGrid: document.getElementById('linksGrid'),
            searchInput: document.getElementById('searchInput'),
            categoryFilter: document.getElementById('categoryFilter'),
            clearSearch: document.getElementById('clearSearch'),
            addLinkBtn: document.getElementById('addLinkBtn'),
            saveLinkBtn: document.getElementById('saveLinkBtn'),
            confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
            linkForm: document.getElementById('linkForm'),
            loadingState: document.getElementById('loadingState'),
            emptyState: document.getElementById('emptyState'),
            // Stats
            totalLinks: document.getElementById('totalLinks'),
            totalCategories: document.getElementById('totalCategories'),
            recentLinks: document.getElementById('recentLinks'),
            totalViews: document.getElementById('totalViews')
        };
        
        // Modales
        this.linkModal = new bootstrap.Modal(document.getElementById('linkModal'));
        this.deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
        
        this.init();
    }
    
    async init() {
        try {
            // Configurar página
            this.setupPage();
            
            // Verificar autenticación
            await this.checkAuth();
            
            // Configurar event listeners
            this.setupEventListeners();
            
            // Cargar enlaces
            await this.loadLinks();
            
            // Configurar breadcrumbs
            this.setupBreadcrumbs();
            
            console.log('PAGREN inicializado correctamente');
        } catch (error) {
            console.error('Error al inicializar PAGREN:', error);
            this.showNotification('Error', 'No se pudo inicializar la aplicación', 'error');
        }
    }
    
    setupPage() {
        // Configurar título y estilos
        if (typeof SICAComponents !== 'undefined') {
            SICAComponents.setPageTitle('PAGREN - Panel de Enlaces UNAM');
        }
        
        // Configurar tema
        document.body.setAttribute('data-theme', 'dark');
    }
    
    setupBreadcrumbs() {
        if (typeof SICAComponents !== 'undefined') {
            SICAComponents.addBreadcrumbs([
                { text: "Inicio", link: "../index.html" },
                { text: "Herramientas", link: "#" },
                { text: "PAGREN", active: true }
            ]);
        }
    }
    
    async checkAuth() {
        return new Promise((resolve) => {
            firebase.auth().onAuthStateChanged((user) => {
                if (user) {
                    console.log('Usuario autenticado:', user.email);
                    resolve(user);
                } else {
                    console.log('Usuario no autenticado');
                    this.redirectToLogin();
                }
            });
        });
    }
    
    redirectToLogin() {
        this.showNotification(
            'Acceso Requerido',
            'Debes iniciar sesión para acceder a PAGREN',
            'warning'
        );
        setTimeout(() => {
            window.location.href = '../login.html';
        }, 2000);
    }
    
    setupEventListeners() {
        // Búsqueda
        this.elements.searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.filterLinks();
        });
        
        this.elements.clearSearch.addEventListener('click', () => {
            this.elements.searchInput.value = '';
            this.searchQuery = '';
            this.filterLinks();
        });
        
        // Filtro de categoría
        this.elements.categoryFilter.addEventListener('change', (e) => {
            this.currentCategory = e.target.value || 'all';
            this.updateTabButtons();
            this.filterLinks();
        });
        
        // Pestañas de categorías
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = e.currentTarget.dataset.category;
                this.currentCategory = category;
                this.elements.categoryFilter.value = category === 'all' ? '' : category;
                this.updateTabButtons();
                this.filterLinks();
            });
        });
        
        // Botones principales
        this.elements.addLinkBtn.addEventListener('click', () => {
            this.openLinkModal();
        });
        
        this.elements.saveLinkBtn.addEventListener('click', () => {
            this.saveLink();
        });
        
        this.elements.confirmDeleteBtn.addEventListener('click', () => {
            this.deleteLink();
        });
        
        // Formulario
        this.elements.linkForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveLink();
        });
        
        // Atajos de teclado
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                this.elements.searchInput.focus();
            } else if (e.key === 'Escape') {
                this.linkModal.hide();
                this.deleteModal.hide();
            } else if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                this.openLinkModal();
            }
        });
    }
    
    async loadLinks() {
        try {
            this.showLoading(true);
            
            const snapshot = await this.db.collection(this.collection)
                .orderBy('createdAt', 'desc')
                .get();
            
            this.links = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date(),
                updatedAt: doc.data().updatedAt?.toDate() || new Date()
            }));
            
            console.log(`Cargados ${this.links.length} enlaces`);
            this.filterLinks();
            this.updateStatistics();
            
        } catch (error) {
            console.error('Error al cargar enlaces:', error);
            this.showNotification('Error', 'No se pudieron cargar los enlaces', 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    filterLinks() {
        this.filteredLinks = this.links.filter(link => {
            const matchesCategory = this.currentCategory === 'all' || link.category === this.currentCategory;
            const matchesSearch = !this.searchQuery || 
                link.title.toLowerCase().includes(this.searchQuery) ||
                link.url.toLowerCase().includes(this.searchQuery) ||
                link.category.toLowerCase().includes(this.searchQuery) ||
                (link.description && link.description.toLowerCase().includes(this.searchQuery));
            
            return matchesCategory && matchesSearch;
        });
        
        this.renderLinks();
    }
    
    renderLinks() {
        const container = this.elements.linksGrid;
        
        if (this.filteredLinks.length === 0) {
            this.showEmptyState();
            return;
        }
        
        const linksHTML = `
            <div class="links-container">
                ${this.filteredLinks.map(link => this.renderLinkCard(link)).join('')}
            </div>
        `;
        
        container.innerHTML = linksHTML;
        
        // Configurar event listeners para las tarjetas
        this.setupLinkCardListeners();
    }
    
    renderLinkCard(link) {
        const formattedDate = this.formatDate(link.createdAt);
        const iconClass = link.icon || 'bi-link-45deg';
        
        return `
            <div class="link-card" data-link-id="${link.id}">
                <div class="link-header">
                    <div class="link-icon">
                        <i class="${iconClass}"></i>
                    </div>
                    <div class="link-actions">
                        <button class="btn btn-action btn-edit" title="Editar enlace">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-action btn-delete" title="Eliminar enlace">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
                
                <h3 class="link-title">${this.escapeHtml(link.title)}</h3>
                <p class="link-url">${this.escapeHtml(link.url)}</p>
                
                <div class="link-category">
                    ${this.getCategoryIcon(link.category)} ${link.category}
                </div>
                
                ${link.description ? `
                    <p class="link-description">${this.escapeHtml(link.description)}</p>
                ` : ''}
                
                <div class="link-meta">
                    <span class="link-views">
                        <i class="bi bi-eye"></i>
                        ${link.views || 0}
                    </span>
                    <span class="link-date">${formattedDate}</span>
                </div>
            </div>
        `;
    }
    
    setupLinkCardListeners() {
        // Clicks en tarjetas para abrir enlaces
        document.querySelectorAll('.link-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // No abrir si se hizo click en botones de acción
                if (e.target.closest('.btn-action')) {
                    return;
                }
                
                const linkId = card.dataset.linkId;
                this.openLink(linkId);
            });
        });
        
        // Botones de editar
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const linkId = e.target.closest('.link-card').dataset.linkId;
                this.editLink(linkId);
            });
        });
        
        // Botones de eliminar
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const linkId = e.target.closest('.link-card').dataset.linkId;
                this.confirmDeleteLink(linkId);
            });
        });
    }
    
    async openLink(linkId) {
        try {
            const link = this.links.find(l => l.id === linkId);
            if (!link) return;
            
            // Incrementar contador de vistas
            await this.incrementViews(linkId);
            
            // Abrir enlace en nueva pestaña
            window.open(link.url, '_blank', 'noopener,noreferrer');
            
            // Mostrar notificación
            this.showNotification(
                'Enlace Abierto',
                `Abriendo: ${link.title}`,
                'info',
                2000
            );
            
        } catch (error) {
            console.error('Error al abrir enlace:', error);
            this.showNotification('Error', 'No se pudo abrir el enlace', 'error');
        }
    }
    
    async incrementViews(linkId) {
        try {
            await this.db.collection(this.collection).doc(linkId).update({
                views: firebase.firestore.FieldValue.increment(1),
                lastViewed: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Actualizar en memoria
            const link = this.links.find(l => l.id === linkId);
            if (link) {
                link.views = (link.views || 0) + 1;
                this.updateStatistics();
            }
            
        } catch (error) {
            console.error('Error al incrementar vistas:', error);
        }
    }
    
    openLinkModal(linkData = null) {
        this.editingLink = linkData;
        
        // Limpiar formulario
        this.elements.linkForm.reset();
        this.elements.linkForm.classList.remove('was-validated');
        
        // Configurar modal
        const modalTitle = document.getElementById('linkModalLabel');
        const modalIcon = modalTitle.querySelector('i');
        
        if (linkData) {
            modalTitle.innerHTML = '<i class="bi bi-pencil me-2"></i>Editar Enlace';
            this.populateForm(linkData);
        } else {
            modalTitle.innerHTML = '<i class="bi bi-plus-circle me-2"></i>Agregar Enlace';
        }
        
        this.linkModal.show();
        
        // Focus en primer campo
        setTimeout(() => {
            document.getElementById('linkTitle').focus();
        }, 150);
    }
    
    populateForm(linkData) {
        document.getElementById('linkTitle').value = linkData.title || '';
        document.getElementById('linkUrl').value = linkData.url || '';
        document.getElementById('linkCategory').value = linkData.category || '';
        document.getElementById('linkIcon').value = linkData.icon || 'bi-link-45deg';
        document.getElementById('linkDescription').value = linkData.description || '';
    }
    
    async saveLink() {
        try {
            // Validar formulario
            if (!this.validateForm()) {
                return;
            }
            
            // Obtener datos del formulario
            const formData = this.getFormData();
            
            // Mostrar loading en botón
            const saveBtn = this.elements.saveLinkBtn;
            const originalText = saveBtn.innerHTML;
            saveBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Guardando...';
            saveBtn.disabled = true;
            
            let result;
            
            if (this.editingLink) {
                // Actualizar enlace existente
                const updateData = {
                    ...formData,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                await this.db.collection(this.collection).doc(this.editingLink.id).update(updateData);
                
                // Actualizar en memoria
                const index = this.links.findIndex(l => l.id === this.editingLink.id);
                if (index !== -1) {
                    this.links[index] = { ...this.links[index], ...updateData, updatedAt: new Date() };
                }
                
                this.showNotification('Éxito', 'Enlace actualizado correctamente', 'success');
            } else {
                // Crear nuevo enlace
                const newLinkData = {
                    ...formData,
                    views: 0,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    userId: firebase.auth().currentUser?.uid
                };
                
                result = await this.db.collection(this.collection).add(newLinkData);
                
                // Agregar a memoria
                this.links.unshift({
                    id: result.id,
                    ...newLinkData,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                
                this.showNotification('Éxito', 'Enlace creado correctamente', 'success');
            }
            
            // Actualizar vista
            this.filterLinks();
            this.updateStatistics();
            
            // Cerrar modal
            this.linkModal.hide();
            
        } catch (error) {
            console.error('Error al guardar enlace:', error);
            this.showNotification('Error', 'No se pudo guardar el enlace', 'error');
        } finally {
            // Restaurar botón
            const saveBtn = this.elements.saveLinkBtn;
            saveBtn.innerHTML = '<i class="bi bi-save me-2"></i>Guardar Enlace';
            saveBtn.disabled = false;
        }
    }
    
    validateForm() {
        const form = this.elements.linkForm;
        let isValid = true;
        
        // Limpiar errores previos
        form.querySelectorAll('.form-control').forEach(input => {
            input.classList.remove('is-invalid');
        });
        
        // Validar título
        const title = document.getElementById('linkTitle');
        if (!title.value.trim()) {
            title.classList.add('is-invalid');
            isValid = false;
        }
        
        // Validar URL
        const url = document.getElementById('linkUrl');
        if (!url.value.trim() || !this.isValidUrl(url.value.trim())) {
            url.classList.add('is-invalid');
            isValid = false;
        }
        
        // Validar categoría
        const category = document.getElementById('linkCategory');
        if (!category.value.trim()) {
            category.classList.add('is-invalid');
            isValid = false;
        }
        
        form.classList.add('was-validated');
        return isValid;
    }
    
    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }
    
    getFormData() {
        return {
            title: document.getElementById('linkTitle').value.trim(),
            url: document.getElementById('linkUrl').value.trim(),
            category: document.getElementById('linkCategory').value.trim(),
            icon: document.getElementById('linkIcon').value.trim() || 'bi-link-45deg',
            description: document.getElementById('linkDescription').value.trim()
        };
    }
    
    editLink(linkId) {
        const link = this.links.find(l => l.id === linkId);
        if (!link) return;
        
        this.openLinkModal(link);
    }
    
    confirmDeleteLink(linkId) {
        const link = this.links.find(l => l.id === linkId);
        if (!link) return;
        
        this.editingLink = link;
        
        // Mostrar preview del enlace a eliminar
        const preview = document.getElementById('deleteLinkPreview');
        preview.innerHTML = `
            <div class="delete-link-preview">
                <div class="link-title">${this.escapeHtml(link.title)}</div>
                <div class="link-url">${this.escapeHtml(link.url)}</div>
            </div>
        `;
        
        this.deleteModal.show();
    }
    
    async deleteLink() {
        try {
            if (!this.editingLink) return;
            
            // Mostrar loading
            const deleteBtn = this.elements.confirmDeleteBtn;
            const originalText = deleteBtn.innerHTML;
            deleteBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Eliminando...';
            deleteBtn.disabled = true;
            
            // Eliminar de Firestore
            await this.db.collection(this.collection).doc(this.editingLink.id).delete();
            
            // Eliminar de memoria
            this.links = this.links.filter(l => l.id !== this.editingLink.id);
            
            // Actualizar vista
            this.filterLinks();
            this.updateStatistics();
            
            this.showNotification('Éxito', 'Enlace eliminado correctamente', 'success');
            
            // Cerrar modal
            this.deleteModal.hide();
            
        } catch (error) {
            console.error('Error al eliminar enlace:', error);
            this.showNotification('Error', 'No se pudo eliminar el enlace', 'error');
        } finally {
            // Restaurar botón
            const deleteBtn = this.elements.confirmDeleteBtn;
            deleteBtn.innerHTML = '<i class="bi bi-trash me-2"></i>Eliminar';
            deleteBtn.disabled = false;
            this.editingLink = null;
        }
    }
    
    updateTabButtons() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.category === this.currentCategory) {
                btn.classList.add('active');
            }
        });
    }
    
    updateStatistics() {
        const totalLinks = this.links.length;
        const categories = [...new Set(this.links.map(l => l.category))].length;
        const recentLinks = this.links.filter(l => {
            const diffTime = Math.abs(new Date() - l.createdAt);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays <= 7;
        }).length;
        const totalViews = this.links.reduce((sum, link) => sum + (link.views || 0), 0);
        
        // Animar números
        this.animateNumber(this.elements.totalLinks, totalLinks);
        this.animateNumber(this.elements.totalCategories, categories);
        this.animateNumber(this.elements.recentLinks, recentLinks);
        this.animateNumber(this.elements.totalViews, totalViews);
    }
    
    animateNumber(element, targetValue, duration = 1000) {
        const startValue = parseInt(element.textContent) || 0;
        const increment = (targetValue - startValue) / (duration / 16);
        let currentValue = startValue;
        
        const timer = setInterval(() => {
            currentValue += increment;
            if (
                (increment > 0 && currentValue >= targetValue) ||
                (increment < 0 && currentValue <= targetValue)
            ) {
                currentValue = targetValue;
                clearInterval(timer);
            }
            element.textContent = Math.floor(currentValue);
        }, 16);
    }
    
    showLoading(show) {
        const loadingState = this.elements.loadingState;
        const emptyState = this.elements.emptyState;
        
        if (show) {
            loadingState.style.display = 'block';
            emptyState.style.display = 'none';
        } else {
            loadingState.style.display = 'none';
        }
    }
    
    showEmptyState() {
        const container = this.elements.linksGrid;
        const emptyState = this.elements.emptyState;
        
        if (this.searchQuery || this.currentCategory !== 'all') {
            // Estado de "sin resultados"
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="bi bi-search"></i>
                    </div>
                    <h3>Sin resultados</h3>
                    <p>No se encontraron enlaces que coincidan con tu búsqueda</p>
                    <button class="btn btn-unam-gold" onclick="pagrenManager.clearFilters()">
                        <i class="bi bi-arrow-clockwise me-2"></i>
                        Limpiar filtros
                    </button>
                </div>
            `;
        } else {
            // Estado vacío inicial
            emptyState.style.display = 'block';
        }
    }
    
    clearFilters() {
        this.elements.searchInput.value = '';
        this.elements.categoryFilter.value = '';
        this.searchQuery = '';
        this.currentCategory = 'all';
        this.updateTabButtons();
        this.filterLinks();
    }
    
    getCategoryIcon(category) {
        const icons = {
            'Trabajo': '<i class="bi bi-briefcase"></i>',
            'Documentos': '<i class="bi bi-file-earmark-text"></i>',
            'Proveedores': '<i class="bi bi-truck"></i>',
            'SICA': '<i class="bi bi-award"></i>',
            'Académico': '<i class="bi bi-book"></i>',
            'Personal': '<i class="bi bi-person"></i>',
            'Centro de Informática': '<i class="bi bi-cpu"></i>'
        };
        return icons[category] || '<i class="bi bi-tag"></i>';
    }
    
    formatDate(date) {
        if (!date) return 'Fecha desconocida';
        
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
            return 'Ayer';
        } else if (diffDays <= 7) {
            return `Hace ${diffDays} días`;
        } else if (diffDays <= 30) {
            const weeks = Math.floor(diffDays / 7);
            return `Hace ${weeks} semana${weeks > 1 ? 's' : ''}`;
        } else {
            return date.toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    showNotification(title, message, type = 'info', duration = 4000) {
        // Usar sistema de notificaciones del componente base si está disponible
        if (typeof SICAComponents !== 'undefined') {
            const icons = {
                success: 'bi-check-circle-fill',
                error: 'bi-exclamation-triangle-fill',
                warning: 'bi-exclamation-triangle-fill',
                info: 'bi-info-circle-fill'
            };
            
            SICAComponents.notify(title, message, type, icons[type]);
        } else {
            // Fallback a console
            console.log(`${type.toUpperCase()}: ${title} - ${message}`);
        }
    }
    
    // Métodos de utilidad
    exportLinks() {
        try {
            const exportData = {
                exportDate: new Date().toISOString(),
                totalLinks: this.links.length,
                links: this.links.map(link => ({
                    title: link.title,
                    url: link.url,
                    category: link.category,
                    description: link.description,
                    icon: link.icon,
                    views: link.views || 0,
                    createdAt: link.createdAt.toISOString(),
                    updatedAt: link.updatedAt.toISOString()
                }))
            };
            
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `pagren_enlaces_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            this.showNotification('Éxito', 'Enlaces exportados correctamente', 'success');
            
        } catch (error) {
            console.error('Error al exportar enlaces:', error);
            this.showNotification('Error', 'No se pudieron exportar los enlaces', 'error');
        }
    }
    
    async importLinks(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (!data.links || !Array.isArray(data.links)) {
                throw new Error('Formato de archivo inválido');
            }
            
            let importedCount = 0;
            const batch = this.db.batch();
            
            for (const linkData of data.links) {
                // Validar datos mínimos
                if (!linkData.title || !linkData.url || !linkData.category) {
                    continue;
                }
                
                // Verificar si ya existe
                const existing = this.links.find(l => 
                    l.title === linkData.title && l.url === linkData.url
                );
                
                if (existing) {
                    continue;
                }
                
                // Crear nuevo documento
                const docRef = this.db.collection(this.collection).doc();
                const newLinkData = {
                    title: linkData.title,
                    url: linkData.url,
                    category: linkData.category,
                    description: linkData.description || '',
                    icon: linkData.icon || 'bi-link-45deg',
                    views: 0,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    userId: firebase.auth().currentUser?.uid
                };
                
                batch.set(docRef, newLinkData);
                importedCount++;
            }
            
            if (importedCount > 0) {
                await batch.commit();
                await this.loadLinks();
                this.showNotification(
                    'Éxito', 
                    `${importedCount} enlaces importados correctamente`, 
                    'success'
                );
            } else {
                this.showNotification(
                    'Información', 
                    'No se encontraron enlaces nuevos para importar', 
                    'info'
                );
            }
            
        } catch (error) {
            console.error('Error al importar enlaces:', error);
            this.showNotification('Error', 'No se pudieron importar los enlaces', 'error');
        }
    }
    
    // Método para agregar enlaces de ejemplo (solo para desarrollo)
    async addSampleLinks() {
        const sampleLinks = [
            {
                title: 'Sistema de Evaluación SICA',
                url: 'http://informatica.fquim.unam.mx/sicas/evaluacion/',
                category: 'SICA',
                description: 'Sistema de evaluación para SICA',
                icon: 'bi-award'
            },
            {
                title: 'Portal UNAM',
                url: 'https://www.unam.mx',
                category: 'Académico',
                description: 'Portal principal de la Universidad Nacional Autónoma de México',
                icon: 'bi-building'
            },
            {
                title: 'Facultad de Química',
                url: 'http://www.fquim.unam.mx',
                category: 'Académico',
                description: 'Página oficial de la Facultad de Química',
                icon: 'bi-mortarboard'
            },
            {
                title: 'Sistema de Compras',
                url: 'http://compras.unam.mx',
                category: 'Proveedores',
                description: 'Sistema de compras y proveedores UNAM',
                icon: 'bi-cart'
            },
            {
                title: 'Centro de Informática',
                url: 'http://informatica.fquim.unam.mx',
                category: 'Centro de Informática',
                description: 'Centro de Informática de la Facultad de Química',
                icon: 'bi-pc-display'
            }
        ];
        
        for (const linkData of sampleLinks) {
            try {
                await this.db.collection(this.collection).add({
                    ...linkData,
                    views: Math.floor(Math.random() * 50),
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    userId: firebase.auth().currentUser?.uid
                });
            } catch (error) {
                console.error('Error al agregar enlace de ejemplo:', error);
            }
        }
        
        await this.loadLinks();
        this.showNotification('Éxito', 'Enlaces de ejemplo agregados', 'success');
    }
    
    // Búsqueda avanzada
    performAdvancedSearch(query) {
        const terms = query.toLowerCase().split(' ').filter(term => term.length > 0);
        
        return this.links.filter(link => {
            const searchText = `
                ${link.title} 
                ${link.url} 
                ${link.category} 
                ${link.description || ''}
            `.toLowerCase();
            
            return terms.every(term => searchText.includes(term));
        });
    }
    
    // Ordenamiento de enlaces
    sortLinks(criteria = 'createdAt', order = 'desc') {
        this.filteredLinks.sort((a, b) => {
            let valueA, valueB;
            
            switch (criteria) {
                case 'title':
                    valueA = a.title.toLowerCase();
                    valueB = b.title.toLowerCase();
                    break;
                case 'category':
                    valueA = a.category.toLowerCase();
                    valueB = b.category.toLowerCase();
                    break;
                case 'views':
                    valueA = a.views || 0;
                    valueB = b.views || 0;
                    break;
                case 'createdAt':
                default:
                    valueA = a.createdAt;
                    valueB = b.createdAt;
                    break;
            }
            
            if (order === 'asc') {
                return valueA > valueB ? 1 : -1;
            } else {
                return valueA < valueB ? 1 : -1;
            }
        });
        
        this.renderLinks();
    }
    
    // Gestión de favoritos
    async toggleFavorite(linkId) {
        try {
            const link = this.links.find(l => l.id === linkId);
            if (!link) return;
            
            const newFavoriteStatus = !link.isFavorite;
            
            await this.db.collection(this.collection).doc(linkId).update({
                isFavorite: newFavoriteStatus,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Actualizar en memoria
            link.isFavorite = newFavoriteStatus;
            
            this.showNotification(
                newFavoriteStatus ? 'Favorito Agregado' : 'Favorito Removido',
                `${link.title} ${newFavoriteStatus ? 'agregado a' : 'removido de'} favoritos`,
                'success'
            );
            
            this.filterLinks();
            
        } catch (error) {
            console.error('Error al cambiar favorito:', error);
            this.showNotification('Error', 'No se pudo cambiar el estado de favorito', 'error');
        }
    }
    
    // Búsqueda por voz (experimental)
    startVoiceSearch() {
        if (!('webkitSpeechRecognition' in window)) {
            this.showNotification('No Soportado', 'La búsqueda por voz no está disponible', 'warning');
            return;
        }
        
        const recognition = new webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'es-MX';
        
        recognition.onstart = () => {
            this.showNotification('Escuchando...', 'Habla ahora para buscar', 'info');
        };
        
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            this.elements.searchInput.value = transcript;
            this.searchQuery = transcript.toLowerCase();
            this.filterLinks();
            this.showNotification('Búsqueda por Voz', `Buscando: ${transcript}`, 'success');
        };
        
        recognition.onerror = (event) => {
            this.showNotification('Error', 'No se pudo reconocer la voz', 'error');
        };
        
        recognition.start();
    }
    
    // Análisis de enlaces
    analyzeLinks() {
        const analysis = {
            totalLinks: this.links.length,
            categoriesDistribution: {},
            mostViewed: null,
            leastViewed: null,
            averageViews: 0,
            recentActivity: 0,
            brokenLinks: 0
        };
        
        // Distribución por categorías
        this.links.forEach(link => {
            analysis.categoriesDistribution[link.category] = 
                (analysis.categoriesDistribution[link.category] || 0) + 1;
        });
        
        // Estadísticas de vistas
        if (this.links.length > 0) {
            const viewsArray = this.links.map(l => l.views || 0);
            analysis.averageViews = viewsArray.reduce((a, b) => a + b, 0) / viewsArray.length;
            
            const maxViews = Math.max(...viewsArray);
            const minViews = Math.min(...viewsArray);
            
            analysis.mostViewed = this.links.find(l => (l.views || 0) === maxViews);
            analysis.leastViewed = this.links.find(l => (l.views || 0) === minViews);
        }
        
        // Actividad reciente (últimos 7 días)
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        analysis.recentActivity = this.links.filter(l => l.createdAt > weekAgo).length;
        
        return analysis;
    }
    
    // Backup automático
    async createBackup() {
        try {
            const backup = {
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                totalLinks: this.links.length,
                links: this.links.map(link => ({
                    ...link,
                    createdAt: link.createdAt.toISOString(),
                    updatedAt: link.updatedAt.toISOString()
                }))
            };
            
            // Guardar en Firestore
            await this.db.collection('pagren_backups').add({
                ...backup,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                userId: firebase.auth().currentUser?.uid
            });
            
            this.showNotification('Backup Creado', 'Respaldo guardado exitosamente', 'success');
            
            return backup;
            
        } catch (error) {
            console.error('Error al crear backup:', error);
            this.showNotification('Error', 'No se pudo crear el backup', 'error');
            throw error;
        }
    }
    
    // Restaurar desde backup
    async restoreFromBackup(backupId) {
        try {
            const backupDoc = await this.db.collection('pagren_backups').doc(backupId).get();
            
            if (!backupDoc.exists) {
                throw new Error('Backup no encontrado');
            }
            
            const backupData = backupDoc.data();
            const batch = this.db.batch();
            
            // Eliminar enlaces existentes
            const existingLinks = await this.db.collection(this.collection).get();
            existingLinks.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            // Restaurar enlaces del backup
            backupData.links.forEach(linkData => {
                const docRef = this.db.collection(this.collection).doc();
                const restoredLink = {
                    ...linkData,
                    createdAt: firebase.firestore.Timestamp.fromDate(new Date(linkData.createdAt)),
                    updatedAt: firebase.firestore.Timestamp.fromDate(new Date(linkData.updatedAt)),
                    userId: firebase.auth().currentUser?.uid
                };
                delete restoredLink.id; // Eliminar ID anterior
                batch.set(docRef, restoredLink);
            });
            
            await batch.commit();
            await this.loadLinks();
            
            this.showNotification(
                'Restauración Completa', 
                `${backupData.links.length} enlaces restaurados exitosamente`, 
                'success'
            );
            
        } catch (error) {
            console.error('Error al restaurar backup:', error);
            this.showNotification('Error', 'No se pudo restaurar el backup', 'error');
        }
    }
    
    // Limpiar caché
    clearCache() {
        if ('caches' in window) {
            caches.keys().then(cacheNames => {
                cacheNames.forEach(cacheName => {
                    caches.delete(cacheName);
                });
            });
        }
        
        // Limpiar localStorage si existe
        if (typeof Storage !== 'undefined') {
            localStorage.removeItem('pagren_cache');
            localStorage.removeItem('pagren_settings');
        }
        
        this.showNotification('Caché Limpiado', 'El caché ha sido eliminado', 'success');
    }
    
    // Configuración de tema
    toggleTheme() {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.body.setAttribute('data-theme', newTheme);
        
        // Guardar preferencia
        if (typeof Storage !== 'undefined') {
            localStorage.setItem('pagren_theme', newTheme);
        }
        
        this.showNotification(
            'Tema Cambiado', 
            `Tema ${newTheme === 'dark' ? 'oscuro' : 'claro'} activado`, 
            'success'
        );
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.pagrenManager = new PagrenManager();
});

// Funciones globales para compatibilidad
window.exportPagrenLinks = () => {
    if (window.pagrenManager) {
        window.pagrenManager.exportLinks();
    }
};

window.importPagrenLinks = (file) => {
    if (window.pagrenManager) {
        window.pagrenManager.importLinks(file);
    }
};

window.addSamplePagrenLinks = () => {
    if (window.pagrenManager) {
        window.pagrenManager.addSampleLinks();
    }
};

window.analyzePagrenLinks = () => {
    if (window.pagrenManager) {
        const analysis = window.pagrenManager.analyzeLinks();
        console.table(analysis.categoriesDistribution);
        return analysis;
    }
};

// Función de utilidad para manejar errores
window.addEventListener('unhandledrejection', (event) => {
    console.error('Error no manejado:', event.reason);
    if (window.pagrenManager) {
        window.pagrenManager.showNotification(
            'Error',
            'Se produjo un error inesperado',
            'error'
        );
    }
});

// Service Worker para caché (opcional)
/*
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(registration => {
            console.log('Service Worker registrado:', registration);
        })
        .catch(error => {
            console.log('Error al registrar Service Worker:', error);
        });
}
*/

// Configuración de PWA
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.deferredPrompt = e;
    console.log('PAGREN puede instalarse como PWA');
});

// Detectar cambios de conectividad
window.addEventListener('online', () => {
    if (window.pagrenManager) {
        window.pagrenManager.showNotification(
            'Conectado', 
            'Conexión a internet restaurada', 
            'success'
        );
    }
});

window.addEventListener('offline', () => {
    if (window.pagrenManager) {
        window.pagrenManager.showNotification(
            'Sin Conexión', 
            'Trabajando en modo offline', 
            'warning'
        );
    }
});

// Manejar visibilidad de página
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && window.pagrenManager) {
        // Recargar datos cuando la página vuelve a ser visible
        window.pagrenManager.loadLinks();
    }
});

// Exportar para uso en otros módulos (si se usa con módulos ES6)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PagrenManager;
}

// Finalización del archivo - Todo el código está completo