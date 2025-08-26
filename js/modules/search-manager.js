/**
 * =================================================================
 * SEARCH MANAGER - Advisor Search & Selection Logic
 * Archivo: search-manager.js
 * =================================================================
 */

class SearchManager {
    constructor(adminCore) {
        this.adminCore = adminCore;
        this.db = adminCore.db;
        this.asesores = [];
        this.filteredAsesores = [];
        this.searchTimeout = null;
        this.isSearching = false;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadAsesoresList();
        console.log('🔍 SearchManager initialized');
    }

    setupEventListeners() {
        const searchInput = document.getElementById('advisorSearch');
        const searchClear = document.getElementById('searchClear');
        
        if (searchInput) {
            // Input event for live search
            searchInput.addEventListener('input', (e) => {
                this.handleSearchInput(e.target.value);
            });

            // Focus events
            searchInput.addEventListener('focus', () => {
                this.showQuickStats();
                if (searchInput.value.trim()) {
                    this.showSearchResults(true);
                }
            });

            // Keyboard navigation
            searchInput.addEventListener('keydown', (e) => {
                this.handleKeyboardNavigation(e);
            });
        }

        if (searchClear) {
            searchClear.addEventListener('click', () => {
                this.clearSearch();
            });
        }

        // Click outside to close results
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                this.showSearchResults(false);
            }
        });
    }

    /**
     * Load all advisors from database
     */
async loadAsesoresList(forceReload = false) {
    try {
        this.setSearchLoading(true);

        // Check cache first (skip if force reload)
        const cacheKey = 'all_asesores';
        if (!forceReload && this.adminCore.isCacheValid(cacheKey, 600000)) { // 10 minutes cache
            const cached = this.adminCore.cache.get(cacheKey);
            if (cached && cached.data && cached.data.length > 0) {
                this.asesores = cached.data;
                this.filteredAsesores = [...this.asesores];
                this.setSearchLoading(false);
                this.updateQuickStats();
                console.log(`📋 Loaded ${this.asesores.length} asesores from cache`);
                return;
            }
        }

        console.log('🔄 Loading asesores from database...');

        // Clear existing data
        this.asesores = [];
        this.filteredAsesores = [];

        // Load from database with error handling
        let asesorasSnapshot;
        try {
            asesorasSnapshot = await this.db.collection('asesores')
                .orderBy('nombreAsesor', 'asc')
                .get();
        } catch (dbError) {
            console.error('Database query error:', dbError);
            
            // Try alternative query without orderBy in case of index issues
            try {
                console.log('Retrying without orderBy...');
                asesorasSnapshot = await this.db.collection('asesores').get();
            } catch (fallbackError) {
                console.error('Fallback query also failed:', fallbackError);
                throw fallbackError;
            }
        }

        if (asesorasSnapshot.empty) {
            console.warn('No asesores found in database');
            this.showEmptyState();
            this.setSearchLoading(false);
            return;
        }

        // Process documents
        this.asesores = asesorasSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                searchableText: this.createSearchableText(data)
            };
        });

        // Sort manually if database didn't sort
        this.asesores.sort((a, b) => {
            const nameA = (a.nombreAsesor || '').toLowerCase();
            const nameB = (b.nombreAsesor || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });

            this.asesores = asesorasSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                searchableText: this.createSearchableText(data),
                // Agregar el campo servicioSocial
                isServicioSocial: data.servicioSocial === true
            };
        });

        this.filteredAsesores = [...this.asesores];

        // Cache the data
        this.adminCore.cache.set(cacheKey, {
            data: this.asesores,
            timestamp: Date.now()
        });

        this.setSearchLoading(false);
        this.updateQuickStats();
        
        console.log(`✅ Loaded ${this.asesores.length} asesores from database`);

    } catch (error) {
        console.error('❌ Error loading asesores:', error);
        this.setSearchLoading(false);
        
        // Show user-friendly error message
        this.showErrorState();
        
        if (this.adminCore && typeof this.adminCore.handleError === 'function') {
            this.adminCore.handleError('Error de carga', 'No se pudo cargar la lista de asesores. Verifique su conexión.');
        }
    }
}

showErrorState() {
    const resultsContainer = document.getElementById('searchResults');
    if (!resultsContainer) return;

    resultsContainer.innerHTML = `
        <div class="search-error-state">
            <div class="result-icon error-icon">
                <i class="bi bi-exclamation-triangle"></i>
            </div>
            <div class="result-content">
                <div class="result-name">Error al cargar asesores</div>
                <div class="result-account">
                    Verifique su conexión a internet
                </div>
                <button class="retry-btn" onclick="window.adminApp?.getModule('search')?.loadAsesoresList(true)">
                    <i class="bi bi-arrow-clockwise"></i>
                    Reintentar
                </button>
            </div>
        </div>
    `;
    resultsContainer.style.display = 'block';
}
    /**
     * Create searchable text for advisor
     */
    createSearchableText(asesorData) {
        const fields = [
            asesorData.nombreAsesor || '',
            asesorData.numeroCuenta || '',
            asesorData.email || '',
            asesorData.telefono || ''
        ];
        return fields.join(' ').toLowerCase();
    }

    /**
     * Handle search input with debouncing
     */
    handleSearchInput(searchTerm) {
        const searchClear = document.getElementById('searchClear');
        
        // Show/hide clear button
        if (searchClear) {
            searchClear.style.display = searchTerm.trim() ? 'flex' : 'none';
        }

        // Clear previous timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        // Debounce search
        this.searchTimeout = setTimeout(() => {
            this.performSearch(searchTerm);
        }, 300);
    }

    /**
     * Perform the actual search
     */
    performSearch(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        
        if (term === '') {
            this.filteredAsesores = [...this.asesores];
            this.showSearchResults(false);
            this.showQuickStats();
            return;
        }

        if (term.length < 2) {
            this.filteredAsesores = [];
            this.renderSearchResults();
            return;
        }

        this.isSearching = true;
        
        // Advanced search logic
        this.filteredAsesores = this.asesores.filter(asesor => {
            // Exact match gets highest priority
            if (asesor.numeroCuenta?.toLowerCase() === term) return true;
            if (asesor.nombreAsesor?.toLowerCase() === term) return true;
            
            // Partial matches
            return asesor.searchableText.includes(term) ||
                   this.fuzzyMatch(asesor.nombreAsesor, term) ||
                   this.fuzzyMatch(asesor.numeroCuenta, term);
        });

        // Sort results by relevance
        this.filteredAsesores.sort((a, b) => {
            return this.calculateRelevanceScore(b, term) - this.calculateRelevanceScore(a, term);
        });

        this.renderSearchResults();
        this.showSearchResults(true);
        this.isSearching = false;
    }

    /**
     * Fuzzy matching algorithm
     */
    fuzzyMatch(text, pattern) {
        if (!text || !pattern) return false;
        
        text = text.toLowerCase();
        pattern = pattern.toLowerCase();
        
        let patternIndex = 0;
        let textIndex = 0;
        
        while (textIndex < text.length && patternIndex < pattern.length) {
            if (text[textIndex] === pattern[patternIndex]) {
                patternIndex++;
            }
            textIndex++;
        }
        
        return patternIndex === pattern.length;
    }

    /**
     * Calculate relevance score for search results
     */
    calculateRelevanceScore(asesor, term) {
        let score = 0;
        const nombre = asesor.nombreAsesor?.toLowerCase() || '';
        const cuenta = asesor.numeroCuenta?.toLowerCase() || '';
        
        // Exact matches get highest score
        if (cuenta === term) score += 100;
        if (nombre === term) score += 90;
        
        // Starts with gets high score
        if (cuenta.startsWith(term)) score += 80;
        if (nombre.startsWith(term)) score += 70;
        
        // Contains gets medium score
        if (cuenta.includes(term)) score += 60;
        if (nombre.includes(term)) score += 50;
        
        // Word boundary matches
        const nameWords = nombre.split(' ');
        nameWords.forEach(word => {
            if (word.startsWith(term)) score += 40;
        });
        
        return score;
    }

    /**
     * Render search results
     */
    renderSearchResults() {
        const resultsContainer = document.getElementById('searchResults');
        if (!resultsContainer) return;

        if (this.filteredAsesores.length === 0) {
            this.renderNoResults(resultsContainer);
            return;
        }

        const resultsHTML = this.filteredAsesores.slice(0, 10).map(asesor => `
            <div class="result-item" 
                 data-numero-cuenta="${asesor.numeroCuenta}" 
                 data-nombre="${asesor.nombreAsesor}"
                 tabindex="0">
                <div class="result-avatar">
                    ${this.getInitials(asesor.nombreAsesor)}
                </div>
                <div class="result-content">
                    <div class="result-name">${this.highlightMatch(asesor.nombreAsesor)}</div>
                    <div class="result-account">${this.highlightMatch(asesor.numeroCuenta)}</div>
                    <div class="result-meta">
                        <span class="result-status ${this.getAdvisorStatus(asesor)}">
                            ${this.getAdvisorStatus(asesor)}
                        </span>
                    </div>
                </div>
                <div class="result-action">
                    <i class="bi bi-arrow-right"></i>
                </div>
            </div>
        `).join('');

        resultsContainer.innerHTML = resultsHTML;

        // Add click events to results
        resultsContainer.querySelectorAll('.result-item').forEach(item => {
            item.addEventListener('click', () => {
                this.selectAdvisor(item);
            });
            
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.selectAdvisor(item);
                }
            });
        });
    }

    /**
     * Render no results state
     */
    renderNoResults(container) {
        const searchInput = document.getElementById('advisorSearch');
        const searchTerm = searchInput?.value || '';
        
        container.innerHTML = `
            <div class="result-item no-results">
                <div class="result-icon">
                    <i class="bi bi-search"></i>
                </div>
                <div class="result-content">
                    <div class="result-name">No se encontraron asesores</div>
                    <div class="result-account">
                        ${searchTerm ? `No hay coincidencias para "${searchTerm}"` : 'Intenta con otro término'}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Handle keyboard navigation in search results
     */
    handleKeyboardNavigation(event) {
        const results = document.querySelectorAll('.result-item:not(.no-results)');
        const currentFocus = document.activeElement;
        
        let currentIndex = Array.from(results).indexOf(currentFocus);
        
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                currentIndex = Math.min(currentIndex + 1, results.length - 1);
                if (results[currentIndex]) {
                    results[currentIndex].focus();
                }
                break;
                
            case 'ArrowUp':
                event.preventDefault();
                if (currentIndex <= 0) {
                    document.getElementById('advisorSearch')?.focus();
                } else {
                    currentIndex = Math.max(currentIndex - 1, 0);
                    if (results[currentIndex]) {
                        results[currentIndex].focus();
                    }
                }
                break;
                
            case 'Escape':
                event.preventDefault();
                this.showSearchResults(false);
                document.getElementById('advisorSearch')?.blur();
                break;
        }
    }

    /**
     * Select an advisor
     */
    async selectAdvisor(item) {
        const numeroCuenta = item.dataset.numeroCuenta;
        const nombreAsesor = item.dataset.nombre;
        
        if (!numeroCuenta || !nombreAsesor) return;

        const searchInput = document.getElementById('advisorSearch');
        if (searchInput) {
            searchInput.value = `${nombreAsesor} (${numeroCuenta})`;
        }

        this.showSearchResults(false);

        const advisorData = {
            numeroCuenta,
            nombreAsesor,
            selectedAt: new Date().toISOString()
        };

        await this.adminCore.setCurrentAdvisor(advisorData);
        
        this.adminCore.showNotification(
            'Asesor seleccionado', 
            `Visualizando datos de ${nombreAsesor}`, 
            'success'
        );
    }

    /**
     * Clear search
     */
    clearSearch() {
        const searchInput = document.getElementById('advisorSearch');
        const searchClear = document.getElementById('searchClear');
        
        if (searchInput) {
            searchInput.value = '';
            searchInput.focus();
        }
        
        if (searchClear) {
            searchClear.style.display = 'none';
        }

        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        this.filteredAsesores = [...this.asesores];
        this.showSearchResults(false);
        this.showQuickStats();
    }

    /**
     * Show/hide search results dropdown
     */
    showSearchResults(show) {
        const resultsContainer = document.getElementById('searchResults');
        const searchContainer = document.querySelector('.search-container');
        
        if (resultsContainer) {
            if (show) {
                resultsContainer.style.display = 'block';
                resultsContainer.classList.add('active');
            } else {
                resultsContainer.classList.remove('active');
                setTimeout(() => {
                    if (!resultsContainer.classList.contains('active')) {
                        resultsContainer.style.display = 'none';
                    }
                }, 300);
            }
        }
        
        if (searchContainer) {
            searchContainer.classList.toggle('search-active', show);
        }
    }

    /**
     * Show/hide quick stats
     */
    showQuickStats() {
        const quickStats = document.getElementById('quickStats');
        if (!quickStats) return;

        if (this.asesores.length > 0) {
            quickStats.style.display = 'block';
            this.updateQuickStats();
        } else {
            quickStats.style.display = 'none';
        }
    }

    /**
     * Update quick stats
     */
    updateQuickStats() {
        const totalAsesores = document.getElementById('totalAsesores');
        const recentActivity = document.getElementById('recentActivity');
        
        if (totalAsesores) {
            totalAsesores.textContent = this.asesores.length;
        }

        if (recentActivity) {
            // Calculate estimated active advisors today (30% of total)
            const activeToday = Math.floor(this.asesores.length * 0.3);
            recentActivity.textContent = activeToday;
        }
    }

    /**
     * Set search loading state
     */
    setSearchLoading(isLoading) {
        const resultsContainer = document.getElementById('searchResults');
        if (!resultsContainer) return;

        if (isLoading) {
            resultsContainer.innerHTML = `
                <div class="search-loading">
                    <div class="search-loading-spinner"></div>
                    <span>Cargando asesores...</span>
                </div>
            `;
            resultsContainer.style.display = 'block';
        }
    }

    /**
     * Show empty state
     */
    showEmptyState() {
        const resultsContainer = document.getElementById('searchResults');
        if (!resultsContainer) return;

        resultsContainer.innerHTML = `
            <div class="search-empty-state">
                <div class="search-empty-icon">
                    <i class="bi bi-exclamation-circle"></i>
                </div>
                <h3>No hay asesores disponibles</h3>
                <p>No se encontraron datos en el sistema</p>
            </div>
        `;
        resultsContainer.style.display = 'block';
    }

    /**
     * Utility methods
     */
    getInitials(name) {
        if (!name) return '--';
        return name.split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }

    highlightMatch(text) {
        const searchInput = document.getElementById('advisorSearch');
        const searchTerm = searchInput?.value.toLowerCase().trim();
        
        if (!searchTerm || !text || searchTerm.length < 2) return text;

        // Escape special regex characters and create highlight regex
        const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedTerm})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    getAdvisorStatus(asesor) {
        // Placeholder logic - would be based on real activity data
        const isActive = Math.random() > 0.3;
        return isActive ? 'active' : 'inactive';
    }

    /**
     * Clear all data
     */
clearData() {
    console.log('🧹 Clearing SearchManager data...');
    
    this.asesores = [];
    this.filteredAsesores = [];
    
    const searchInput = document.getElementById('advisorSearch');
    const resultsContainer = document.getElementById('searchResults');
    const quickStats = document.getElementById('quickStats');
    const searchClear = document.getElementById('searchClear');
    
    if (searchInput) {
        searchInput.value = '';
        searchInput.blur(); // Remove focus
    }
    
    if (searchClear) {
        searchClear.style.display = 'none';
    }
    
    if (resultsContainer) {
        resultsContainer.innerHTML = '';
        resultsContainer.style.display = 'none';
        resultsContainer.classList.remove('active');
    }
    
    if (quickStats) {
        quickStats.style.display = 'none';
    }
    
    this.showSearchResults(false);
    
    // Clear any existing timeouts
    if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = null;
    }
    
    console.log('✅ SearchManager data cleared');
}

    /**
     * Get filtered advisors
     */
    getFilteredAdvisors() {
        return this.filteredAsesores;
    }

    /**
     * Get all advisors
     */
    getAllAdvisors() {
        return this.asesores;
    }

    /**
     * Cleanup method
     */
    cleanup() {
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        this.clearData();
    }
}

// Export for global access
window.SearchManager = SearchManager;