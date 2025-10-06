// admin-mas-pagination.js

class PaginationManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 4; // 4 tarjetas por página
        this.allOptions = [];
        this.filteredOptions = [];
        
        this.init();
    }

    init() {
        this.setupPagination();
        this.setupSearch();
        this.updatePagination();
        console.log('✅ PaginationManager inicializado');
    }

    setupPagination() {
        // Obtener todas las páginas
        const pages = document.querySelectorAll('.options-page');
        
        // Generar navegación de paginación
        this.renderPaginationControls(pages.length);
        
        // Event listeners para los botones de paginación
        document.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.getAttribute('data-page');
                
                if (page === 'prev') {
                    this.goToPreviousPage();
                } else if (page === 'next') {
                    this.goToNextPage();
                } else {
                    this.goToPage(parseInt(page));
                }
            });
        });
    }

    renderPaginationControls(totalPages) {
        const paginationNav = document.getElementById('paginationNav');
        if (!paginationNav) return;
        
        let html = '';
        
        // Botón Anterior
        html += `
            <li class="page-item" id="prevPage">
                <a class="page-link" href="#" data-page="prev">
                    <i class="bi bi-chevron-left"></i>
                </a>
            </li>
        `;
        
        // Números de página
        for (let i = 1; i <= totalPages; i++) {
            html += `
                <li class="page-item ${i === 1 ? 'active' : ''}" data-page-item="${i}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }
        
        // Botón Siguiente
        html += `
            <li class="page-item" id="nextPage">
                <a class="page-link" href="#" data-page="next">
                    <i class="bi bi-chevron-right"></i>
                </a>
            </li>
        `;
        
        paginationNav.innerHTML = html;
    }

    goToPage(pageNumber) {
        const pages = document.querySelectorAll('.options-page');
        const pageItems = document.querySelectorAll('[data-page-item]');
        
        if (pageNumber < 1 || pageNumber > pages.length) return;
        
        // Ocultar todas las páginas
        pages.forEach(page => page.classList.remove('active'));
        
        // Mostrar la página seleccionada
        const targetPage = document.querySelector(`.options-page[data-page="${pageNumber}"]`);
        if (targetPage) {
            targetPage.classList.add('active');
        }
        
        // Actualizar estado activo en paginación
        pageItems.forEach(item => item.classList.remove('active'));
        const activeItem = document.querySelector(`[data-page-item="${pageNumber}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
        
        // Actualizar página actual
        this.currentPage = pageNumber;
        
        // Actualizar estado de botones prev/next
        this.updatePrevNextButtons(pages.length);
        
        // Scroll suave al inicio de las opciones
        document.querySelector('.options-container')?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }

    goToPreviousPage() {
        if (this.currentPage > 1) {
            this.goToPage(this.currentPage - 1);
        }
    }

    goToNextPage() {
        const totalPages = document.querySelectorAll('.options-page').length;
        if (this.currentPage < totalPages) {
            this.goToPage(this.currentPage + 1);
        }
    }

    updatePrevNextButtons(totalPages) {
        const prevButton = document.getElementById('prevPage');
        const nextButton = document.getElementById('nextPage');
        
        if (prevButton) {
            if (this.currentPage === 1) {
                prevButton.classList.add('disabled');
            } else {
                prevButton.classList.remove('disabled');
            }
        }
        
        if (nextButton) {
            if (this.currentPage === totalPages) {
                nextButton.classList.add('disabled');
            } else {
                nextButton.classList.remove('disabled');
            }
        }
    }

    setupSearch() {
        const searchInput = document.getElementById('searchOptions');
        if (!searchInput) return;
        
        // Debounce para mejor rendimiento
        let searchTimeout;
        
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.performSearch(e.target.value);
            }, 300);
        });
    }

    performSearch(query) {
        const normalizedQuery = this.normalizeString(query);
        
        // Obtener todas las tarjetas de opciones
        const allCards = document.querySelectorAll('.option-card');
        let visibleCount = 0;
        
        if (normalizedQuery.length === 0) {
            // Mostrar todas las opciones
            document.querySelectorAll('.options-page').forEach(page => {
                page.style.display = '';
            });
            
            allCards.forEach(card => {
                const col = card.closest('.col-xl-6, .col-lg-6, .col-md-6');
                if (col) {
                    col.style.display = '';
                    card.classList.remove('search-highlight');
                }
            });
            
            // Restaurar paginación
            document.querySelector('.pagination-controls').style.display = '';
            this.goToPage(1);
            visibleCount = allCards.length;
            
        } else {
            // Ocultar paginación durante búsqueda
            document.querySelector('.pagination-controls').style.display = 'none';
            
            // Mostrar todas las páginas para la búsqueda
            document.querySelectorAll('.options-page').forEach(page => {
                page.classList.add('active');
            });
            
            // Filtrar tarjetas
            allCards.forEach(card => {
                const col = card.closest('.col-xl-6, .col-lg-6, .col-md-6');
                const keywords = col?.getAttribute('data-keywords') || '';
                const title = card.querySelector('h3')?.textContent || '';
                const description = card.querySelector('.card-header p')?.textContent || '';
                
                const searchText = this.normalizeString(`${keywords} ${title} ${description}`);
                
                if (searchText.includes(normalizedQuery)) {
                    if (col) {
                        col.style.display = '';
                        card.classList.add('search-highlight');
                    }
                    visibleCount++;
                } else {
                    if (col) {
                        col.style.display = 'none';
                        card.classList.remove('search-highlight');
                    }
                }
            });
            
            // Mostrar mensaje si no hay resultados
            this.showNoResults(visibleCount === 0);
        }
        
        // Actualizar contador de resultados
        this.updateResultsCount(visibleCount);
    }

    normalizeString(str) {
        return str.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, ""); // Remover acentos
    }

    updateResultsCount(count) {
        const resultsCount = document.getElementById('resultsCount');
        if (resultsCount) {
            resultsCount.textContent = `${count} ${count === 1 ? 'opción' : 'opciones'}`;
        }
    }

    showNoResults(show) {
        let noResultsDiv = document.querySelector('.no-results');
        
        if (show) {
            if (!noResultsDiv) {
                noResultsDiv = document.createElement('div');
                noResultsDiv.className = 'no-results';
                noResultsDiv.innerHTML = `
                    <i class="bi bi-search"></i>
                    <h3>No se encontraron resultados</h3>
                    <p>Intenta con otros términos de búsqueda</p>
                `;
                document.querySelector('.options-container').appendChild(noResultsDiv);
            }
            noResultsDiv.style.display = 'block';
        } else {
            if (noResultsDiv) {
                noResultsDiv.style.display = 'none';
            }
        }
    }

    updatePagination() {
        const totalPages = document.querySelectorAll('.options-page').length;
        this.updatePrevNextButtons(totalPages);
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Esperar a que AdminMasManager esté inicializado
    const checkInit = setInterval(() => {
        if (window.adminMasManager) {
            clearInterval(checkInit);
            window.paginationManager = new PaginationManager();
            console.log('📄 Sistema de paginación y búsqueda activo');
        }
    }, 100);
});

// Exportar
window.PaginationManager = PaginationManager;