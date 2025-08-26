// search-filter-manager.js
// Módulo para búsqueda y filtrado de asesores

class SearchFilterManager {
    constructor(core, uiManager) {
        this.core = core;
        this.uiManager = uiManager;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Búsqueda
        const searchInput = document.getElementById('searchInput');
        const clearSearch = document.getElementById('clearSearch');
        
        searchInput?.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
            this.updateClearButton(e.target.value);
        });
        
        clearSearch?.addEventListener('click', () => {
            searchInput.value = '';
            this.handleSearch('');
            this.updateClearButton('');
        });

        // Filtros
        document.getElementById('escuelaFilter')?.addEventListener('change', () => {
            this.handleFilter();
        });
        
        document.getElementById('carreraFilter')?.addEventListener('change', () => {
            this.handleFilter();
        });
        
        document.getElementById('resetFilters')?.addEventListener('click', () => {
            this.resetFilters();
        });

        console.log('🔍 Search & Filter listeners configurados');
    }

    handleSearch(query) {
        if (!query.trim()) {
            this.core.filteredAsesores = [...this.core.asesores];
        } else {
            const searchTerm = query.toLowerCase();
            this.core.filteredAsesores = this.core.asesores.filter(asesor => {
                return (
                    asesor.nombre?.toLowerCase().includes(searchTerm) ||
                    asesor.apellidoPaterno?.toLowerCase().includes(searchTerm) ||
                    asesor.apellidoMaterno?.toLowerCase().includes(searchTerm) ||
                    asesor.numeroCuenta?.toString().includes(searchTerm) ||
                    asesor.escuela?.toLowerCase().includes(searchTerm) ||
                    asesor.carrera?.toLowerCase().includes(searchTerm)
                );
            });
        }
        
        this.applyFilters();
        this.uiManager.renderAsesores();
        this.uiManager.updateStats();
    }

    handleFilter() {
        this.applyFilters();
        this.uiManager.renderAsesores();
        this.uiManager.updateStats();
    }

    applyFilters() {
        const escuelaFilter = document.getElementById('escuelaFilter')?.value;
        const carreraFilter = document.getElementById('carreraFilter')?.value;
        
        let filtered = [...this.core.filteredAsesores];
        
        if (escuelaFilter) {
            filtered = filtered.filter(asesor => asesor.escuela === escuelaFilter);
        }
        
        if (carreraFilter) {
            filtered = filtered.filter(asesor => asesor.carrera === carreraFilter);
        }
        
        this.core.filteredAsesores = filtered;
    }

    resetFilters() {
        document.getElementById('searchInput').value = '';
        document.getElementById('escuelaFilter').value = '';
        document.getElementById('carreraFilter').value = '';
        
        this.core.filteredAsesores = [...this.core.asesores];
        this.uiManager.renderAsesores();
        this.uiManager.updateStats();
        this.updateClearButton('');
    }

    updateClearButton(value) {
        const clearBtn = document.getElementById('clearSearch');
        if (clearBtn) {
            if (value) {
                clearBtn.classList.add('show');
            } else {
                clearBtn.classList.remove('show');
            }
        }
    }
}

window.SearchFilterManager = SearchFilterManager;