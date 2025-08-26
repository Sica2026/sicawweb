/* =================================================================
   ADMIN REPORTES - UX MEJORADA
   ================================================================= */

class AdminReportesManager {
    constructor() {
        this.currentAdvisor = null;
        this.asesores = [];
        this.filteredAsesores = [];
        this.reportes = [];
        this.pagoHoras = [];
        this.filteredReportes = [];
        this.filteredPagos = [];
        this.db = null;
        this.sortConfig = { key: 'fecha', direction: 'desc' };
        this.currentView = 'reportes';
        
        this.init();
    }

    async init() {
        try {
            this.db = firebase.firestore();
            this.setupEventListeners();
            await this.loadAsesoresList();
            
            console.log('✅ AdminReportesManager inicializado correctamente');
        } catch (error) {
            console.error('❌ Error inicializando AdminReportesManager:', error);
            this.showNotification('Error', 'Error al inicializar el sistema de administración', 'error');
        }
    }

    async loadAsesoresList() {
        const searchInput = document.getElementById('advisorSearch');
        const resultsContainer = document.getElementById('searchResults');
        
        if (!searchInput || !resultsContainer) return;

        try {
            // Mostrar loading
            this.showSearchLoading(true);

            // Obtener asesores desde Firestore
            const asesorasSnapshot = await this.db.collection('asesores')
                .orderBy('nombreAsesor', 'asc')
                .get();

            if (asesorasSnapshot.empty) {
                this.showEmptySearch();
                this.showNotification('Sin datos', 'No se encontraron asesores en la base de datos', 'warning');
                return;
            }

            // Procesar datos
            this.asesores = asesorasSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            this.filteredAsesores = [...this.asesores];
            this.showSearchLoading(false);
            
            console.log(`📋 Cargados ${this.asesores.length} asesores`);

        } catch (error) {
            console.error('Error cargando asesores:', error);
            this.showSearchLoading(false);
            this.showNotification('Error', 'No se pudo cargar la lista de asesores', 'error');
        }
    }

    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('advisorSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterAsesores(e.target.value);
            });

            searchInput.addEventListener('focus', () => {
                this.showSearchResults(true);
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.advisor-search-container')) {
                    this.showSearchResults(false);
                }
            });
        }

        // Botón para cambiar asesor
        const changeAdvisorBtn = document.getElementById('changeAdvisorBtn');
        if (changeAdvisorBtn) {
            changeAdvisorBtn.addEventListener('click', () => {
                this.changeAdvisor();
            });
        }

        // View Switcher
        const reportesViewBtn = document.getElementById('adminReportesViewBtn');
        const pagoViewBtn = document.getElementById('adminPagoViewBtn');
        
        if (reportesViewBtn) {
            reportesViewBtn.addEventListener('click', () => {
                this.switchView('reportes');
            });
        }
        
        if (pagoViewBtn) {
            pagoViewBtn.addEventListener('click', () => {
                this.switchView('pago');
            });
        }

        // Resto de eventos... (mantener los mismos filtros y botones)
        this.setupOtherEvents();
    }

    setupOtherEvents() {
        // Filtros para reportes
        const adminMesFilter = document.getElementById('adminMesFilter');
        const adminEstadoFilter = document.getElementById('adminEstadoFilter');
        
        if (adminMesFilter) {
            adminMesFilter.addEventListener('change', () => {
                this.applyFilters();
            });
        }
        
        if (adminEstadoFilter) {
            adminEstadoFilter.addEventListener('change', () => {
                this.applyFilters();
            });
        }

        // Filtros para pago de horas
        const adminMesPagoFilter = document.getElementById('adminMesPagoFilter');
        const adminSalaFilter = document.getElementById('adminSalaFilter');
        
        if (adminMesPagoFilter) {
            adminMesPagoFilter.addEventListener('change', () => {
                this.applyPagoFilters();
            });
        }
        
        if (adminSalaFilter) {
            adminSalaFilter.addEventListener('change', () => {
                this.applyPagoFilters();
            });
        }

        // Botones de acción - Reportes
        const adminRefreshBtn = document.getElementById('adminRefreshBtn');
        const adminExportBtn = document.getElementById('adminExportBtn');
        
        if (adminRefreshBtn) {
            adminRefreshBtn.addEventListener('click', () => {
                this.loadReportes();
            });
        }
        
        if (adminExportBtn) {
            adminExportBtn.addEventListener('click', () => {
                this.exportReportes();
            });
        }

        // Botones de acción - Pago
        const adminRefreshPagoBtn = document.getElementById('adminRefreshPagoBtn');
        const adminExportPagoBtn = document.getElementById('adminExportPagoBtn');
        
        if (adminRefreshPagoBtn) {
            adminRefreshPagoBtn.addEventListener('click', () => {
                this.loadPagoHoras();
            });
        }
        
        if (adminExportPagoBtn) {
            adminExportPagoBtn.addEventListener('click', () => {
                this.exportPagoHoras();
            });
        }

        // Sorting de tablas
        this.setupSorting();
    }

    setupSorting() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('.sortable')) {
                const sortKey = e.target.closest('.sortable').dataset.sort;
                this.sortData(sortKey);
            }
        });
    }

    filterAsesores(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        
        if (term === '') {
            this.filteredAsesores = [...this.asesores];
        } else {
            this.filteredAsesores = this.asesores.filter(asesor => {
                const nombre = asesor.nombreAsesor?.toLowerCase() || '';
                const cuenta = asesor.numeroCuenta?.toLowerCase() || '';
                return nombre.includes(term) || cuenta.includes(term);
            });
        }

        this.renderSearchResults();
    }

    renderSearchResults() {
        const resultsContainer = document.getElementById('searchResults');
        if (!resultsContainer) return;

        if (this.filteredAsesores.length === 0) {
            resultsContainer.innerHTML = `
                <div class="search-result-item no-results">
                    <div class="result-icon">
                        <i class="bi bi-search"></i>
                    </div>
                    <div class="result-content">
                        <div class="result-name">No se encontraron asesores</div>
                        <div class="result-account">Intenta con otro término de búsqueda</div>
                    </div>
                </div>
            `;
            return;
        }

        const resultsHTML = this.filteredAsesores.map(asesor => `
            <div class="search-result-item" 
                 data-numero-cuenta="${asesor.numeroCuenta}" 
                 data-nombre="${asesor.nombreAsesor}">
                <div class="result-avatar">
                    ${asesor.nombreAsesor.charAt(0).toUpperCase()}
                </div>
                <div class="result-content">
                    <div class="result-name">${asesor.nombreAsesor}</div>
                    <div class="result-account">${asesor.numeroCuenta}</div>
                </div>
                <div class="result-action">
                    <i class="bi bi-chevron-right"></i>
                </div>
            </div>
        `).join('');

        resultsContainer.innerHTML = resultsHTML;

        // Agregar eventos a los resultados
        resultsContainer.querySelectorAll('.search-result-item:not(.no-results)').forEach(item => {
            item.addEventListener('click', () => {
                const numeroCuenta = item.dataset.numeroCuenta;
                const nombreAsesor = item.dataset.nombre;
                this.selectAdvisorFromSearch(numeroCuenta, nombreAsesor);
            });
        });
    }

    selectAdvisorFromSearch(numeroCuenta, nombreAsesor) {
        // Actualizar el input
        const searchInput = document.getElementById('advisorSearch');
        if (searchInput) {
            searchInput.value = `${nombreAsesor} (${numeroCuenta})`;
        }

        // Ocultar resultados
        this.showSearchResults(false);

        // Seleccionar asesor
        this.currentAdvisor = {
            numeroCuenta,
            nombreAsesor,
            selectedAt: new Date().toISOString()
        };

        this.showReportsSection();
        this.loadAllData();

        this.showNotification(
            'Asesor seleccionado', 
            `Visualizando datos de ${nombreAsesor}`, 
            'success',
            'bi-check-circle-fill'
        );
    }

    showSearchResults(show) {
        const resultsContainer = document.getElementById('searchResults');
        const searchContainer = document.querySelector('.advisor-search-container');
        
        if (resultsContainer) {
            resultsContainer.style.display = show ? 'block' : 'none';
        }
        
        if (searchContainer) {
            searchContainer.classList.toggle('search-active', show);
        }
    }

    showSearchLoading(loading) {
        const resultsContainer = document.getElementById('searchResults');
        if (!resultsContainer) return;

        if (loading) {
            resultsContainer.innerHTML = `
                <div class="search-loading">
                    <div class="loading-spinner-small"></div>
                    <span>Cargando asesores...</span>
                </div>
            `;
            resultsContainer.style.display = 'block';
        }
    }

    showEmptySearch() {
        const resultsContainer = document.getElementById('searchResults');
        if (!resultsContainer) return;

        resultsContainer.innerHTML = `
            <div class="search-result-item no-results">
                <div class="result-icon">
                    <i class="bi bi-exclamation-circle"></i>
                </div>
                <div class="result-content">
                    <div class="result-name">No hay asesores disponibles</div>
                    <div class="result-account">No se encontraron datos en el sistema</div>
                </div>
            </div>
        `;
        resultsContainer.style.display = 'block';
    }

    showReportsSection() {
        const adminAuthSection = document.getElementById('adminAuthSection');
        const adminReportsSection = document.getElementById('adminReportsSection');
        
        const selectedAdvisorName = document.getElementById('selectedAdvisorName');
        const selectedAdvisorAccount = document.getElementById('selectedAdvisorAccount');
        
        if (selectedAdvisorName && this.currentAdvisor) {
            selectedAdvisorName.textContent = this.currentAdvisor.nombreAsesor;
        }
        
        if (selectedAdvisorAccount && this.currentAdvisor) {
            selectedAdvisorAccount.textContent = this.currentAdvisor.numeroCuenta;
        }

        if (adminAuthSection && adminReportsSection) {
            // Asegurar que ambas secciones existen
            adminAuthSection.style.opacity = '0';
            adminAuthSection.style.transform = 'translateY(-20px)';
            
            setTimeout(() => {
                adminAuthSection.style.display = 'none';
                adminReportsSection.style.display = 'block';
                adminReportsSection.style.opacity = '1';
                adminReportsSection.style.transform = 'translateY(0)';
                adminReportsSection.classList.add('animate-fade-in');
            }, 300);
        }
    }

    changeAdvisor() {
        // Limpiar datos
        this.currentAdvisor = null;
        this.reportes = [];
        this.pagoHoras = [];
        this.filteredReportes = [];
        this.filteredPagos = [];

        // Limpiar search input
        const searchInput = document.getElementById('advisorSearch');
        if (searchInput) {
            searchInput.value = '';
            searchInput.focus();
        }

        // Limpiar estadísticas
        this.clearStats();

        // Limpiar tablas
        const adminReportsTableBody = document.getElementById('adminReportsTableBody');
        const adminPagoTableBody = document.getElementById('adminPagoTableBody');
        if (adminReportsTableBody) adminReportsTableBody.innerHTML = '';
        if (adminPagoTableBody) adminPagoTableBody.innerHTML = '';

        // Resetear filtros
        this.resetFilters();

        // Volver a vista de reportes por defecto
        this.switchView('reportes');

        // Mostrar sección de selección - CORREGIDO
        const adminAuthSection = document.getElementById('adminAuthSection');
        const adminReportsSection = document.getElementById('adminReportsSection');
        
        if (adminReportsSection && adminAuthSection) {
            // Primero ocultar la sección de reportes
            adminReportsSection.style.transition = 'all 0.3s ease';
            adminReportsSection.style.opacity = '0';
            adminReportsSection.style.transform = 'translateY(-20px)';
            
            setTimeout(() => {
                // Ocultar reportes y mostrar auth
                adminReportsSection.style.display = 'none';
                adminAuthSection.style.display = 'block';
                adminAuthSection.style.opacity = '0';
                adminAuthSection.style.transform = 'translateY(20px)';
                
                // Animar entrada de auth section
                requestAnimationFrame(() => {
                    adminAuthSection.style.transition = 'all 0.3s ease';
                    adminAuthSection.style.opacity = '1';
                    adminAuthSection.style.transform = 'translateY(0)';
                });
            }, 300);
        }

        // Reset de la lista de asesores filtrados
        this.filteredAsesores = [...this.asesores];
        this.showSearchResults(false);

        this.showNotification('Selección cambiada', 'Busca otro asesor para continuar', 'info');
    }

    switchView(viewType) {
        this.currentView = viewType;
        
        const reportesBtn = document.getElementById('adminReportesViewBtn');
        const pagoBtn = document.getElementById('adminPagoViewBtn');
        const reportesView = document.getElementById('adminReportesView');
        const pagoView = document.getElementById('adminPagoView');
        
        if (viewType === 'reportes') {
            reportesBtn?.classList.add('active');
            pagoBtn?.classList.remove('active');
            if (reportesView) reportesView.style.display = 'block';
            if (pagoView) pagoView.style.display = 'none';
        } else {
            pagoBtn?.classList.add('active');
            reportesBtn?.classList.remove('active');
            if (pagoView) pagoView.style.display = 'block';
            if (reportesView) reportesView.style.display = 'none';
        }
    }

    // RESTO DE FUNCIONES IGUAL QUE ANTES
    async loadAllData() {
        await Promise.all([
            this.loadReportes(),
            this.loadPagoHoras()
        ]);
        this.updateStats();
    }

    async loadReportes() {
        if (!this.currentAdvisor) return;

        const loadingState = document.getElementById('adminLoadingState');
        const emptyState = document.getElementById('adminEmptyState');
        const reportsTableBody = document.getElementById('adminReportsTableBody');

        if (loadingState) loadingState.style.display = 'block';
        if (emptyState) emptyState.style.display = 'none';
        if (reportsTableBody) reportsTableBody.innerHTML = '';

        try {
            const reportesSnapshot = await this.db.collection('reportesasesores')
                .where('numeroCuenta', '==', this.currentAdvisor.numeroCuenta)
                .orderBy('fecha', 'desc')
                .get();

            this.reportes = reportesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            this.filteredReportes = [...this.reportes];
            this.applyFilters();

            if (loadingState) loadingState.style.display = 'none';
            console.log(`📊 Cargados ${this.reportes.length} reportes para ${this.currentAdvisor.nombreAsesor}`);

        } catch (error) {
            console.error('Error cargando reportes:', error);
            if (loadingState) loadingState.style.display = 'none';
            if (emptyState) {
                emptyState.style.display = 'block';
                emptyState.querySelector('h3').textContent = 'Error al cargar';
                emptyState.querySelector('p').textContent = 'No se pudieron cargar los reportes.';
            }
        }
    }

    async loadPagoHoras() {
        if (!this.currentAdvisor) return;

        const loadingPagoState = document.getElementById('adminLoadingPagoState');
        const emptyPagoState = document.getElementById('adminEmptyPagoState');
        const pagoTableBody = document.getElementById('adminPagoTableBody');

        if (loadingPagoState) loadingPagoState.style.display = 'block';
        if (emptyPagoState) emptyPagoState.style.display = 'none';
        if (pagoTableBody) pagoTableBody.innerHTML = '';

        try {
            const pagoSnapshot = await this.db.collection('pago_horas')
                .where('numeroCuenta', '==', this.currentAdvisor.numeroCuenta)
                .orderBy('fecha', 'desc')
                .get();

            this.pagoHoras = pagoSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            this.filteredPagos = [...this.pagoHoras];
            this.applyPagoFilters();

            if (loadingPagoState) loadingPagoState.style.display = 'none';
            console.log(`💰 Cargados ${this.pagoHoras.length} pagos de horas para ${this.currentAdvisor.nombreAsesor}`);

        } catch (error) {
            console.error('Error cargando pago de horas:', error);
            if (loadingPagoState) loadingPagoState.style.display = 'none';
            if (emptyPagoState) {
                emptyPagoState.style.display = 'block';
                emptyPagoState.querySelector('h3').textContent = 'Error al cargar';
                emptyPagoState.querySelector('p').textContent = 'No se pudieron cargar los pagos.';
            }
        }
    }

    // Resto de métodos igual que antes (updateStats, calcular, render, export, etc.)
    updateStats() {
        const horasTrabajadas = this.calcularHorasTotales();
        const adeudoHoras = this.calcularAdeudoHoras();
        const totalPagoHoras = this.calcularTotalPagoHoras();
        const diasTrabajados = this.reportes.filter(r => r.estado === 'presente').length;

        const horasTrabajadasEl = document.getElementById('adminHorasTrabajadas');
        const horasAdeudoEl = document.getElementById('adminHorasAdeudo');
        const totalPagoHorasEl = document.getElementById('adminTotalPagoHoras');
        const diasTrabajadosEl = document.getElementById('adminDiasTrabajados');

        if (horasTrabajadasEl) {
            this.animateValue(horasTrabajadasEl, 0, horasTrabajadas, 1000, 'h');
        }

        if (horasAdeudoEl) {
            this.animateValue(horasAdeudoEl, 0, adeudoHoras, 1000, 'h');
        }

        if (totalPagoHorasEl) {
            this.animateValue(totalPagoHorasEl, 0, totalPagoHoras, 1000, 'h');
        }

        if (diasTrabajadosEl) {
            this.animateValue(diasTrabajadosEl, 0, diasTrabajados, 800);
        }
    }

    calcularHorasTotales() {
        let totalMinutos = 0;

        this.reportes.forEach(reporte => {
            if (reporte.horasValidas && reporte.estado === 'presente') {
                const tiempo = this.parseTimeString(reporte.horasValidas);
                totalMinutos += tiempo.total;
            }
        });

        return Math.round(totalMinutos / 60 * 100) / 100;
    }

    calcularAdeudoHoras() {
        let totalAdeudoMinutos = 0;

        this.reportes.forEach((reporte) => {
            if (reporte.estado === 'ausente') {
                if (reporte.tiempoTrabajado) {
                    const tiempoString = reporte.tiempoTrabajado.replace('-', '');
                    const tiempo = this.parseTimeString(tiempoString);
                    totalAdeudoMinutos += tiempo.total;
                }
            } else if (reporte.estado === 'presente' || reporte.estado === 'tardanza') {
                const horasProgramadas = this.parseTimeString(reporte.horasProgramadas || '0h 0m');
                const horasValidas = this.parseTimeString(reporte.horasValidas || '0h 0m');
                
                const diferencia = horasProgramadas.total - horasValidas.total;
                
                if (diferencia > 0) {
                    totalAdeudoMinutos += diferencia;
                }
            }
        });

        return Math.round(totalAdeudoMinutos / 60 * 100) / 100;
    }

    calcularTotalPagoHoras() {
        let totalHoras = 0;

        this.pagoHoras.forEach(pago => {
            if (pago.totalHoras && typeof pago.totalHoras === 'number') {
                totalHoras += pago.totalHoras;
            }
        });

        return Math.round(totalHoras * 100) / 100;
    }

    parseTimeString(timeStr) {
        if (!timeStr) return { horas: 0, minutos: 0, total: 0 };
        
        const horasMatch = timeStr.match(/(\d+)h/);
        const minutosMatch = timeStr.match(/(\d+)m/);
        
        const horas = horasMatch ? parseInt(horasMatch[1]) : 0;
        const minutos = minutosMatch ? parseInt(minutosMatch[1]) : 0;
        
        return {
            horas,
            minutos,
            total: (horas * 60) + minutos
        };
    }

    animateValue(element, start, end, duration, suffix = '') {
        if (!element) return;

        const range = end - start;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const easeOutCubic = 1 - Math.pow(1 - progress, 3);
            const current = start + (range * easeOutCubic);
            
            element.textContent = Math.round(current) + suffix;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.textContent = end + suffix;
            }
        };

        requestAnimationFrame(animate);
    }

    // Todos los demás métodos de filtros, rendering, export, etc. igual que antes
    applyFilters() {
        const adminMesFilter = document.getElementById('adminMesFilter');
        const adminEstadoFilter = document.getElementById('adminEstadoFilter');
        
        let filtered = [...this.reportes];

        if (adminMesFilter && adminMesFilter.value) {
            const [year, month] = adminMesFilter.value.split('-');
            filtered = filtered.filter(reporte => {
                const [reporteYear, reporteMonth] = reporte.fecha.split('-');
                return reporteYear === year && reporteMonth === month;
            });
        }

        if (adminEstadoFilter && adminEstadoFilter.value) {
            filtered = filtered.filter(reporte => 
                reporte.estado === adminEstadoFilter.value
            );
        }

        this.filteredReportes = filtered;
        this.renderReportsTable();
    }

    applyPagoFilters() {
        const adminMesPagoFilter = document.getElementById('adminMesPagoFilter');
        const adminSalaFilter = document.getElementById('adminSalaFilter');
        
        let filtered = [...this.pagoHoras];

        if (adminMesPagoFilter && adminMesPagoFilter.value) {
            const [year, month] = adminMesPagoFilter.value.split('-');
            filtered = filtered.filter(pago => {
                const [pagoYear, pagoMonth] = pago.fecha.split('-');
                return pagoYear === year && pagoMonth === month;
            });
        }

        if (adminSalaFilter && adminSalaFilter.value) {
            filtered = filtered.filter(pago => 
                pago.sala === adminSalaFilter.value
            );
        }

        this.filteredPagos = filtered;
        this.renderPagoTable();
    }

    // Incluir todos los métodos restantes que funcionan bien...
    sortData(key) {
        if (this.sortConfig.key === key) {
            this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortConfig.key = key;
            this.sortConfig.direction = 'asc';
        }

        if (this.currentView === 'reportes') {
            this.sortReportes(key);
        } else {
            this.sortPagos(key);
        }

        this.updateSortIcons();
    }

    sortReportes(key) {
        this.filteredReportes.sort((a, b) => {
            let aVal = a[key];
            let bVal = b[key];

            if (key === 'fecha') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            }
            
            if (key === 'horasValidas') {
                aVal = this.parseTimeString(aVal || '0h 0m').total;
                bVal = this.parseTimeString(bVal || '0h 0m').total;
            }

            if (aVal < bVal) return this.sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return this.sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        this.renderReportsTable();
    }

    sortPagos(key) {
        this.filteredPagos.sort((a, b) => {
            let aVal = a[key];
            let bVal = b[key];

            if (key === 'fecha') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            }

            if (aVal < bVal) return this.sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return this.sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        this.renderPagoTable();
    }

    updateSortIcons() {
        const sortableHeaders = document.querySelectorAll('.sortable');
        sortableHeaders.forEach(header => {
            const icon = header.querySelector('.sort-icon');
            if (icon) {
                if (header.dataset.sort === this.sortConfig.key) {
                    icon.className = this.sortConfig.direction === 'asc' 
                        ? 'bi bi-arrow-up sort-icon'
                        : 'bi bi-arrow-down sort-icon';
                    header.style.background = 'var(--admin-accent)';
                    header.style.color = 'white';
                } else {
                    icon.className = 'bi bi-arrow-up-down sort-icon';
                    header.style.background = '';
                    header.style.color = '';
                }
            }
        });
    }

    renderReportsTable() {
        const reportsTableBody = document.getElementById('adminReportsTableBody');
        const emptyState = document.getElementById('adminEmptyState');
        const totalReportesEl = document.getElementById('adminTotalReportes');
        const discrepanciasAlert = document.getElementById('adminDiscrepanciasAlert');
        const discrepanciasCount = document.getElementById('adminDiscrepanciasCount');

        if (!reportsTableBody) return;

        if (totalReportesEl) {
            totalReportesEl.textContent = this.filteredReportes.length;
        }

        if (this.filteredReportes.length === 0) {
            reportsTableBody.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            if (discrepanciasAlert) discrepanciasAlert.style.display = 'none';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        let discrepancias = 0;

        const rows = this.filteredReportes.map((reporte, index) => {
            const [year, month, day] = reporte.fecha.split('-');
            const fecha = new Date(year, month - 1, day).toLocaleDateString('es-MX', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });

            const entradaDiscrepancia = this.tieneDiscrepancia(reporte.entrada, reporte.horarioProgramadoInicio);
            const salidaDiscrepancia = this.tieneDiscrepancia(reporte.salida, reporte.horarioProgramadoFinal);
            const horasDiscrepancia = this.parseTimeString(reporte.horasValidas || '0h 0m').total < 
                                      this.parseTimeString(reporte.horasProgramadas || '0h 0m').total;

            if (entradaDiscrepancia || salidaDiscrepancia || horasDiscrepancia) {
                discrepancias++;
            }

            const tipoBloque = this.getTipoBloqueClass(reporte.tipoBloque);
            const statusClass = `status-${reporte.estado}`;
            const statusIcon = this.getStatusIcon(reporte.estado);

            return `
                <tr style="animation-delay: ${index * 0.1}s">
                    <td class="date-cell">${fecha}</td>
                    <td class="tipo-bloque-cell">
                        <span class="${tipoBloque}">${reporte.tipoBloque || '--'}</span>
                    </td>
                    <td class="horario-programado">${this.formatTime(reporte.horarioProgramadoInicio)}</td>
                    <td class="horario-programado">${this.formatTime(reporte.horarioProgramadoFinal)}</td>
                    <td class="horario-real ${entradaDiscrepancia ? 'horario-discrepancia' : 'horario-ok'}">
                        ${this.formatTime(reporte.entrada)}
                        ${entradaDiscrepancia ? '<div class="discrepancia-badge"></div>' : ''}
                    </td>
                    <td class="horario-real ${salidaDiscrepancia ? 'horario-discrepancia' : 'horario-ok'}">
                        ${this.formatTime(reporte.salida)}
                        ${salidaDiscrepancia ? '<div class="discrepancia-badge"></div>' : ''}
                    </td>
                    <td class="horas-validas ${this.getHorasValidasClass(reporte)}">
                        ${reporte.horasValidas || '--'}
                        ${horasDiscrepancia ? '<div class="discrepancia-badge"></div>' : ''}
                    </td>
                    <td>
                        <span class="status-badge ${statusClass}">
                            <i class="${statusIcon}"></i>
                            ${reporte.estado}
                        </span>
                    </td>
                    <td class="observations-cell" title="${reporte.observaciones || 'Sin observaciones'}">
                        ${reporte.observaciones || 'Sin observaciones'}
                    </td>
                </tr>
            `;
        }).join('');

        reportsTableBody.innerHTML = rows;

        if (discrepanciasAlert && discrepanciasCount) {
            if (discrepancias > 0) {
                discrepanciasCount.textContent = discrepancias;
                discrepanciasAlert.style.display = 'flex';
            } else {
                discrepanciasAlert.style.display = 'none';
            }
        }
    }

    renderPagoTable() {
        const pagoTableBody = document.getElementById('adminPagoTableBody');
        const emptyPagoState = document.getElementById('adminEmptyPagoState');
        const totalPagosEl = document.getElementById('adminTotalPagos');

        if (!pagoTableBody) return;

        if (totalPagosEl) {
            totalPagosEl.textContent = this.filteredPagos.length;
        }

        if (this.filteredPagos.length === 0) {
            pagoTableBody.innerHTML = '';
            if (emptyPagoState) emptyPagoState.style.display = 'block';
            return;
        }

        if (emptyPagoState) emptyPagoState.style.display = 'none';

        const rows = this.filteredPagos.map((pago, index) => {
            const [year, month, day] = pago.fecha.split('-');
            const fecha = new Date(year, month - 1, day).toLocaleDateString('es-MX', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });

            return `
                <tr style="animation-delay: ${index * 0.1}s">
                    <td class="date-cell">${fecha}</td>
                    <td class="sala-cell">${pago.sala || '--'}</td>
                    <td class="time-cell">${this.formatTime(pago.horaInicio)}</td>
                    <td class="time-cell">${this.formatTime(pago.horaFin)}</td>
                    <td class="total-horas-cell">${pago.totalHoras || 0}h</td>
                    <td class="autorizado-cell">${pago.quienAutorizo || '--'}</td>
                </tr>
            `;
        }).join('');

        pagoTableBody.innerHTML = rows;
    }

    // Utilidades
    tieneDiscrepancia(horarioReal, horarioProgramado, toleranciaMinutos = 15) {
        if (!horarioReal || !horarioProgramado) return false;
        
        const real = this.timeToMinutes(horarioReal);
        const programado = this.timeToMinutes(horarioProgramado);
        
        return Math.abs(real - programado) > toleranciaMinutos;
    }

    timeToMinutes(timeStr) {
        if (!timeStr) return 0;
        const [hours, minutes] = timeStr.split(':').map(Number);
        return (hours * 60) + minutes;
    }

    formatTime(timeStr) {
        if (!timeStr) return '<span class="text-muted">--:--</span>';
        
        const [hours, minutes] = timeStr.split(':');
        return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
    }

    getTipoBloqueClass(tipoBloque) {
        if (!tipoBloque) return '';
        
        const tipo = tipoBloque.toLowerCase();
        if (tipo.includes('provisional-a')) return 'bloque-provisional-a';
        if (tipo.includes('provisional-b')) return 'bloque-provisional-b';
        if (tipo.includes('definitivo')) return 'bloque-definitivo';
        return '';
    }

    getHorasValidasClass(reporte) {
        const horasValidas = this.parseTimeString(reporte.horasValidas || '0h 0m');
        const horasProgramadas = this.parseTimeString(reporte.horasProgramadas || '0h 0m');
        
        if (horasValidas.total === horasProgramadas.total) {
            return 'horas-completas';
        } else if (horasValidas.total < horasProgramadas.total) {
            return 'horas-incompletas';
        } else {
            return 'horas-fraude';
        }
    }

    getStatusIcon(estado) {
        switch (estado) {
            case 'presente': return 'bi-check-circle-fill';
            case 'ausente': return 'bi-x-circle-fill';
            case 'tardanza': return 'bi-exclamation-triangle-fill';
            default: return 'bi-question-circle-fill';
        }
    }

    exportReportes() {
        if (this.filteredReportes.length === 0) {
            this.showNotification('Sin datos', 'No hay reportes para exportar', 'warning');
            return;
        }

        const headers = [
            'Asesor', 'Número Cuenta', 'Fecha', 'Tipo Bloque',
            'Horario Programado Inicio', 'Horario Programado Final',
            'Entrada Real', 'Salida Real', 'Horas Válidas', 'Estado',
            'Observaciones', 'Discrepancia Entrada', 'Discrepancia Salida', 'Discrepancia Horas'
        ];

        const csvData = this.filteredReportes.map(reporte => {
            const entradaDiscrepancia = this.tieneDiscrepancia(reporte.entrada, reporte.horarioProgramadoInicio);
            const salidaDiscrepancia = this.tieneDiscrepancia(reporte.salida, reporte.horarioProgramadoFinal);
            const horasDiscrepancia = this.parseTimeString(reporte.horasValidas || '0h 0m').total < 
                                      this.parseTimeString(reporte.horasProgramadas || '0h 0m').total;

            return [
                this.currentAdvisor.nombreAsesor, this.currentAdvisor.numeroCuenta,
                reporte.fecha, reporte.tipoBloque || '',
                reporte.horarioProgramadoInicio || '', reporte.horarioProgramadoFinal || '',
                reporte.entrada || '', reporte.salida || '',
                reporte.horasValidas || '', reporte.estado, reporte.observaciones || '',
                entradaDiscrepancia ? 'SÍ' : 'NO',
                salidaDiscrepancia ? 'SÍ' : 'NO',
                horasDiscrepancia ? 'SÍ' : 'NO'
            ];
        });

        this.generateCSV(csvData, headers, `admin_reportes_${this.currentAdvisor.numeroCuenta}`);
    }

    exportPagoHoras() {
        if (this.filteredPagos.length === 0) {
            this.showNotification('Sin datos', 'No hay pagos para exportar', 'warning');
            return;
        }

        const headers = ['Asesor', 'Número Cuenta', 'Fecha', 'Sala', 'Hora Inicio', 'Hora Fin', 'Total Horas', 'Autorizado Por'];

        const csvData = this.filteredPagos.map(pago => [
            this.currentAdvisor.nombreAsesor, this.currentAdvisor.numeroCuenta,
            pago.fecha, pago.sala || '', pago.horaInicio || '', pago.horaFin || '',
            pago.totalHoras || 0, pago.quienAutorizo || ''
        ]);

        this.generateCSV(csvData, headers, `admin_pago_horas_${this.currentAdvisor.numeroCuenta}`);
    }

    generateCSV(data, headers, filename) {
        const csvContent = [
            headers.join(','),
            ...data.map(row => 
                row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showNotification('Exportación exitosa', 'Los datos se han exportado correctamente', 'success', 'bi-download');
        }
    }

    resetFilters() {
        const filters = ['adminMesFilter', 'adminEstadoFilter', 'adminMesPagoFilter', 'adminSalaFilter'];
        filters.forEach(filterId => {
            const filter = document.getElementById(filterId);
            if (filter) filter.value = '';
        });
    }

    clearStats() {
        const statElements = ['adminHorasTrabajadas', 'adminHorasAdeudo', 'adminTotalPagoHoras', 'adminDiasTrabajados', 'adminTotalReportes', 'adminTotalPagos'];
        statElements.forEach(statId => {
            const element = document.getElementById(statId);
            if (element) {
                element.textContent = statId.includes('Total') ? '0' : '0h';
            }
        });
    }

    showNotification(title, message, type = 'info', icon = 'bi-info-circle') {
        if (window.modernNav && typeof window.modernNav.showModernNotification === 'function') {
            window.modernNav.showModernNotification(title, message, type, icon);
        } else {
            console.log(`${type.toUpperCase()}: ${title} - ${message}`);
        }
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    if (typeof firebase !== 'undefined') {
        window.adminReportesManager = new AdminReportesManager();
        console.log('Sistema Admin de Reportes inicializado');
    } else {
        console.error('Firebase no disponible');
        setTimeout(() => {
            if (typeof firebase !== 'undefined') {
                window.adminReportesManager = new AdminReportesManager();
                console.log('Sistema Admin de Reportes inicializado (retry)');
            } else {
                alert('Error: No se pudo conectar con la base de datos. Por favor, recarga la página.');
            }
        }, 2000);
    }
});

window.addEventListener('beforeunload', () => {
    if (window.adminReportesManager) {
        console.log('Limpiando recursos del sistema admin');
    }
});

window.AdminReportesManager = AdminReportesManager;