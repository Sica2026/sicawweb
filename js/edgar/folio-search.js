// folio-search.js - Módulo de búsqueda de asesores
class FolioSearch {
    constructor() {
        this.db = firebase.firestore();
        this.searchInput = null;
        this.searchResults = null;
        this.searchTimeout = null;
        this.lastQuery = '';
        this.selectedAsesor = null;
        this.documentOptions = this.getDocumentOptions();
    }

    // ================================
    // INICIALIZACIÓN
    // ================================
    init() {
        console.log('🔍 Inicializando FolioSearch...');
        this.setupElements();
        this.setupEventListeners();
        console.log('✅ FolioSearch inicializado');
    }

    setupElements() {
        this.searchInput = document.getElementById('searchAsesor');
        this.searchResults = document.getElementById('searchResults');
        this.searchLoading = document.getElementById('searchLoading');
    }

    setupEventListeners() {
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => this.handleSearchInput(e));
            this.searchInput.addEventListener('focus', () => this.handleSearchFocus());
            this.searchInput.addEventListener('blur', () => this.handleSearchBlur());
        }

        // Cerrar resultados cuando se hace clic fuera
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                this.hideSearchResults();
            }
        });
    }

    // ================================
    // MANEJO DE BÚSQUEDA
    // ================================
    handleSearchInput(event) {
        const query = event.target.value.trim();
        
        // Limpiar timeout anterior
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        // Si la query está vacía, ocultar resultados
        if (!query) {
            this.hideSearchResults();
            return;
        }
        
        // Evitar búsquedas repetidas
        if (query === this.lastQuery) {
            return;
        }
        
        this.lastQuery = query;
        
        // Debounce la búsqueda
        this.searchTimeout = setTimeout(() => {
            this.performSearch(query);
        }, 300);
    }

    handleSearchFocus() {
        if (this.searchInput.value.trim() && this.searchResults.children.length > 0) {
            this.showSearchResults();
        }
    }

    handleSearchBlur() {
        // Delay para permitir clicks en los resultados
        setTimeout(() => {
            // Solo ocultar si no hay hover en los resultados
            if (!this.searchResults.matches(':hover')) {
                this.hideSearchResults();
            }
        }, 200);
    }

    async performSearch(query) {
        try {
            this.showSearchLoading(true);
            
            // Convertir query a minúsculas para búsqueda insensible a mayúsculas
            const queryLower = query.toLowerCase();
            
            // Buscar en la colección asesores
            const asesoresRef = this.db.collection('asesores');
            const snapshot = await asesoresRef
                .where('servicioSocial', '==', true)
                .get();
            
            const results = [];
            
            snapshot.forEach(doc => {
                const data = doc.data();
                const nombreLower = (data.nombreAsesor || '').toLowerCase();
                
                // Filtrar por nombre que contenga la query
                if (nombreLower.includes(queryLower)) {
                    results.push({
                        id: doc.id,
                        ...data
                    });
                }
            });
            
            // Ordenar resultados por relevancia (coincidencia exacta primero)
            results.sort((a, b) => {
                const aName = (a.nombreAsesor || '').toLowerCase();
                const bName = (b.nombreAsesor || '').toLowerCase();
                
                const aExact = aName.startsWith(queryLower) ? 0 : 1;
                const bExact = bName.startsWith(queryLower) ? 0 : 1;
                
                if (aExact !== bExact) return aExact - bExact;
                return aName.localeCompare(bName);
            });
            
            this.renderSearchResults(results, query);
            
        } catch (error) {
            console.error('❌ Error en búsqueda:', error);
            this.renderSearchError();
        } finally {
            this.showSearchLoading(false);
        }
    }

    // ================================
    // RENDERIZADO DE RESULTADOS
    // ================================
    renderSearchResults(results, query) {
        if (results.length === 0) {
            this.renderNoResults(query);
            return;
        }
        
        // Limitar resultados mostrados
        const limitedResults = results.slice(0, 8);
        
        this.searchResults.innerHTML = limitedResults.map(asesor => `
            <div class="search-result-item" data-asesor-id="${asesor.id}">
                <div class="result-avatar">
                    ${this.getInitials(asesor.nombreAsesor)}
                </div>
                <div class="result-info">
                    <h5>${this.highlightText(asesor.nombreAsesor, query)}</h5>
                    <p>${asesor.carrera || 'Sin carrera especificada'}</p>
                </div>
                <div class="result-actions">
                    <i class="bi bi-chevron-right text-muted"></i>
                </div>
            </div>
        `).join('');
        
        this.showSearchResults();
        this.attachResultListeners();
    }

    renderNoResults(query) {
        this.searchResults.innerHTML = `
            <div class="search-no-results">
                <div class="text-center py-4">
                    <i class="bi bi-search text-muted" style="font-size: 2rem;"></i>
                    <p class="text-muted mt-2">No se encontraron asesores con "<strong>${query}</strong>"</p>
                    <small class="text-muted">Verifica que el asesor tenga servicio social activo</small>
                </div>
            </div>
        `;
        this.showSearchResults();
    }

    renderSearchError() {
        this.searchResults.innerHTML = `
            <div class="search-error">
                <div class="text-center py-4">
                    <i class="bi bi-exclamation-triangle text-warning" style="font-size: 2rem;"></i>
                    <p class="text-muted mt-2">Error en la búsqueda</p>
                    <button class="btn btn-sm btn-outline-primary" onclick="window.folioSearch.performSearch('${this.lastQuery}')">
                        <i class="bi bi-arrow-clockwise"></i> Reintentar
                    </button>
                </div>
            </div>
        `;
        this.showSearchResults();
    }

    attachResultListeners() {
        const resultItems = this.searchResults.querySelectorAll('.search-result-item');
        
        resultItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const asesorId = item.dataset.asesorId;
                this.selectAsesor(asesorId);
            });
            
            // Efectos hover
            item.addEventListener('mouseenter', () => {
                item.style.transform = 'translateX(5px)';
            });
            
            item.addEventListener('mouseleave', () => {
                item.style.transform = 'translateX(0)';
            });
        });
    }

    // ================================
    // SELECCIÓN DE ASESOR
    // ================================
    async selectAsesor(asesorId) {
        try {
            // Obtener datos completos del asesor
            const asesorDoc = await this.db.collection('asesores').doc(asesorId).get();
            
            if (!asesorDoc.exists) {
                throw new Error('Asesor no encontrado');
            }
            
            const asesorData = { id: asesorId, ...asesorDoc.data() };
            
            // Limpiar búsqueda
            this.clearSearch();
            
            // Mostrar modal de selección de documento
            this.showDocumentModal(asesorData);
            
        } catch (error) {
            console.error('❌ Error seleccionando asesor:', error);
            this.showNotification('Error', 'No se pudo cargar la información del asesor', 'error');
        }
    }

    showDocumentModal(asesorData) {
        const modal = document.getElementById('documentModal');
        const modalTitle = modal.querySelector('.modal-title');
        const documentOptions = document.getElementById('documentOptions');
        
        modalTitle.innerHTML = `
            <i class="bi bi-file-text"></i>
            Documentos para ${asesorData.nombreAsesor}
        `;
        
        documentOptions.innerHTML = this.renderDocumentOptions();
        
        // Mostrar modal
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
        
        // Guardar referencia al asesor seleccionado
        this.selectedAsesor = asesorData;
        
        // Configurar listeners para las opciones
        this.attachDocumentOptionListeners();
    }

    renderDocumentOptions() {
        return Object.entries(this.documentOptions).map(([category, options]) => `
            <div class="document-category">
                <h6 class="text-uppercase text-muted mb-3">
                    <i class="bi bi-${this.getCategoryIcon(category)}"></i>
                    ${this.getCategoryTitle(category)}
                </h6>
                <div class="row">
                    ${options.map(option => `
                        <div class="col-md-6 mb-3">
                            <div class="document-option" data-doc-type="${option.type}" data-doc-category="${category}">
                                <i class="bi bi-${option.icon}"></i>
                                <h5>${option.title}</h5>
                                <p>${option.description}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    attachDocumentOptionListeners() {
        const options = document.querySelectorAll('.document-option');
        
        options.forEach(option => {
            option.addEventListener('click', () => {
                const docType = option.dataset.docType;
                const docCategory = option.dataset.docCategory;
                
                this.selectDocumentType(docType, docCategory);
            });
        });
    }

    selectDocumentType(docType, docCategory) {
        // Cerrar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('documentModal'));
        modal.hide();
        
        // Encontrar configuración del documento
        const docConfig = this.documentOptions[docCategory].find(opt => opt.type === docType);
        
        if (docConfig && this.selectedAsesor) {
            // Mostrar vista de configuración
            window.folioManager.showConfigView(this.selectedAsesor, {
                ...docConfig,
                category: docCategory
            });
        }
    }

    // ================================
    // CONFIGURACIÓN DE DOCUMENTOS
    // ================================
    getDocumentOptions() {
        return {
            aceptacion: [
                {
                    type: 'carta-aceptacion-fq',
                    title: 'Carta de Aceptación FQ',
                    description: 'Para alumnos de Facultad de Química',
                    icon: 'file-earmark-check'
                },
                {
                    type: 'carta-aceptacion-prepa',
                    title: 'Carta de Aceptación Prepa',
                    description: 'Para alumnos de Preparatoria',
                    icon: 'file-earmark-plus'
                }
            ],
            termino: [
                {
                    type: 'carta-termino-fq',
                    title: 'Carta de Término FQ',
                    description: 'Para alumnos de Facultad de Química',
                    icon: 'file-earmark-check-fill'
                },
                {
                    type: 'carta-termino-prepa',
                    title: 'Carta de Término Prepa',
                    description: 'Para alumnos de Preparatoria',
                    icon: 'file-earmark-x'
                }
            ],
            evaluacion: [
                {
                    type: 'evaluacion',
                    title: 'Evaluación',
                    description: 'Evaluación de desempeño',
                    icon: 'clipboard-check'
                }
            ]
        };
    }

    getCategoryIcon(category) {
        const icons = {
            aceptacion: 'file-plus',
            termino: 'file-check',
            evaluacion: 'clipboard-data'
        };
        return icons[category] || 'file-text';
    }

    getCategoryTitle(category) {
        const titles = {
            aceptacion: 'Cartas de Aceptación',
            termino: 'Cartas de Término',
            evaluacion: 'Evaluaciones'
        };
        return titles[category] || 'Documentos';
    }

    // ================================
    // UTILIDADES DE UI
    // ================================
    showSearchResults() {
        this.searchResults.style.display = 'block';
        this.searchResults.classList.add('fade-in');
    }

    hideSearchResults() {
        this.searchResults.style.display = 'none';
        this.searchResults.classList.remove('fade-in');
    }

    showSearchLoading(show) {
        if (this.searchLoading) {
            this.searchLoading.style.display = show ? 'block' : 'none';
        }
    }

    clearSearch() {
        this.searchInput.value = '';
        this.lastQuery = '';
        this.hideSearchResults();
        this.searchResults.innerHTML = '';
    }

    // ================================
    // UTILIDADES DE TEXTO
    // ================================
    getInitials(name) {
        if (!name) return '?';
        
        const names = name.trim().split(' ');
        if (names.length === 1) {
            return names[0].substring(0, 2).toUpperCase();
        }
        
        return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }

    highlightText(text, query) {
        if (!query) return text;
        
        const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    showNotification(title, message, type) {
        if (window.folioManager) {
            window.folioManager.showNotification(title, message, type);
        }
    }

    // ================================
    // MÉTODOS ADICIONALES
    // ================================
    resetSearch() {
        this.clearSearch();
        this.selectedAsesor = null;
        this.lastQuery = '';
        
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
    }

    getSearchStats() {
        return {
            lastQuery: this.lastQuery,
            hasResults: this.searchResults && this.searchResults.children.length > 0,
            isLoading: this.searchLoading && this.searchLoading.style.display === 'block',
            selectedAsesor: this.selectedAsesor
        };
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Esperar a que folioManager esté disponible
    const initSearch = () => {
        if (window.folioManager) {
            window.folioSearch = new FolioSearch();
            window.folioSearch.init();
        } else {
            setTimeout(initSearch, 100);
        }
    };
    
    setTimeout(initSearch, 500);
});

// Exportar para uso global
window.FolioSearch = FolioSearch;