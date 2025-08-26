/**
 * =================================================================
 * REPORTS MANAGER - Attendance Reports Processing & Display
 * Archivo: reports-manager.js
 * =================================================================
 */

class ReportsManager {
    constructor(adminCore) {
        this.adminCore = adminCore;
        this.db = adminCore.db;
        this.reports = [];
        this.filteredReports = [];
        this.sortConfig = { key: 'fecha', direction: 'desc' };
        this.filters = {
            mes: '',
            estado: '',
            tipoBloque: ''
        };
        
        this.config = {
            toleranciaMinutos: 15,
            pageSize: 50,
            discrepanciaThreshold: 10
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
        console.log('📋 ReportsManager initialized');
    }

    setupEventListeners() {
        // Filter controls
        const mesFilter = document.getElementById('reportsMonthFilter');
        const estadoFilter = document.getElementById('reportsStatusFilter');
        const tipoFilter = document.getElementById('reportsTypeFilter');

        if (mesFilter) {
            mesFilter.addEventListener('change', (e) => {
                this.filters.mes = e.target.value;
                this.applyFilters();
            });
        }

        if (estadoFilter) {
            estadoFilter.addEventListener('change', (e) => {
                this.filters.estado = e.target.value;
                this.applyFilters();
            });
        }

        if (tipoFilter) {
            tipoFilter.addEventListener('change', (e) => {
                this.filters.tipoBloque = e.target.value;
                this.applyFilters();
            });
        }

        // Table sorting
        document.addEventListener('click', (e) => {
            if (e.target.closest('.reports-sortable')) {
                const sortKey = e.target.closest('.reports-sortable').dataset.sort;
                this.sortReports(sortKey);
            }
        });

        // Export button
        const exportBtn = document.getElementById('reportsExportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportData();
            });
        }
    }

    /**
     * Load reports data for current advisor
     */
    async loadData() {
        const currentAdvisor = this.adminCore.getCurrentAdvisor();
        if (!currentAdvisor) return;

        try {
            this.showLoadingState(true);

            // Check cache
            const cacheKey = `reports_${currentAdvisor.numeroCuenta}`;
            if (this.adminCore.isCacheValid(cacheKey, 300000)) { // 5 minutes
                const cached = this.adminCore.cache.get(cacheKey);
                this.reports = cached.data;
                this.processReportsData();
                return;
            }

            // Load from database
            const reportsSnapshot = await this.db.collection('reportesasesores')
                .where('numeroCuenta', '==', currentAdvisor.numeroCuenta)
                .orderBy('fecha', 'desc')
                .get();

            this.reports = reportsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: this.parseDate(doc.data().fecha)
            }));

            // Cache the data
            this.adminCore.cache.set(cacheKey, {
                data: this.reports,
                timestamp: Date.now()
            });

            this.processReportsData();
            
            console.log(`📊 Loaded ${this.reports.length} reports`);

        } catch (error) {
            console.error('Error loading reports:', error);
            this.showErrorState();
        } finally {
            this.showLoadingState(false);
        }
    }

    /**
     * Process and analyze reports data
     */
    processReportsData() {
        // Analyze discrepancies
        this.analyzeDiscrepancies();
        
        // Apply current filters
        this.applyFilters();
        
        // Update UI counts
        this.updateReportsCounts();
        
        // Render the table
        this.renderReportsTable();
        
        // Update filter options
        this.updateFilterOptions();
    }

    /**
     * Analyze time discrepancies in reports
     */
    analyzeDiscrepancies() {
        let discrepancyCount = 0;
        
        this.reports.forEach(report => {
            report.hasEntryDiscrepancy = this.hasTimeDiscrepancy(
                report.entrada, 
                report.horarioProgramadoInicio
            );
            
            report.hasExitDiscrepancy = this.hasTimeDiscrepancy(
                report.salida, 
                report.horarioProgramadoFinal
            );

            report.hasHoursDiscrepancy = this.hasHoursDiscrepancy(
                report.horasValidas,
                report.horasProgramadas
            );

            if (report.hasEntryDiscrepancy || report.hasExitDiscrepancy || report.hasHoursDiscrepancy) {
                discrepancyCount++;
            }
        });

        // Update discrepancies alert
        this.updateDiscrepanciesAlert(discrepancyCount);
    }

    /**
     * Apply current filters to reports
     */
    applyFilters() {
        this.filteredReports = this.reports.filter(report => {
            // Month filter
            if (this.filters.mes && !report.fecha.startsWith(this.filters.mes)) {
                return false;
            }

            // Status filter
            if (this.filters.estado && report.estado !== this.filters.estado) {
                return false;
            }

            // Block type filter
            if (this.filters.tipoBloque && report.tipoBloque !== this.filters.tipoBloque) {
                return false;
            }

            return true;
        });

        this.renderReportsTable();
        this.updateReportsCounts();
    }

    /**
     * Sort reports by specified key
     */
    sortReports(key) {
        if (this.sortConfig.key === key) {
            this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortConfig.key = key;
            this.sortConfig.direction = 'asc';
        }

        this.filteredReports.sort((a, b) => {
            let aVal = a[key];
            let bVal = b[key];

            // Handle different data types
            if (key === 'fecha') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            } else if (key === 'horasValidas') {
                aVal = this.parseTimeToMinutes(aVal || '0h 0m');
                bVal = this.parseTimeToMinutes(bVal || '0h 0m');
            } else if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = (bVal || '').toLowerCase();
            }

            let result = 0;
            if (aVal < bVal) result = -1;
            else if (aVal > bVal) result = 1;

            return this.sortConfig.direction === 'desc' ? -result : result;
        });

        this.renderReportsTable();
        this.updateSortIcons();
    }

    /**
     * Render the reports table
     */
    renderReportsTable() {
        const container = document.getElementById('reportsContainer');
        if (!container) return;

        if (this.filteredReports.length === 0) {
            this.renderEmptyState(container);
            return;
        }

        const tableHTML = `
            <div class="reports-table-wrapper">
                <div class="reports-controls">
                    ${this.renderFiltersHTML()}
                </div>
                
                <div class="table-responsive">
                    <table class="table reports-table">
                        <thead>
                            ${this.renderTableHeaderHTML()}
                        </thead>
                        <tbody>
                            ${this.renderTableBodyHTML()}
                        </tbody>
                    </table>
                </div>
                
                ${this.renderDiscrepanciesAlert()}
            </div>
        `;

        container.innerHTML = tableHTML;
        this.attachTableEventListeners();
    }

    /**
     * Render filters controls HTML
     */
    renderFiltersHTML() {
        return `
            <div class="filters-row">
                <div class="filter-group">
                    <label for="reportsMonthFilter">Mes:</label>
                    <select id="reportsMonthFilter" class="form-select">
                        <option value="">Todos los meses</option>
                        ${this.getMonthOptions()}
                    </select>
                </div>
                
                <div class="filter-group">
                    <label for="reportsStatusFilter">Estado:</label>
                    <select id="reportsStatusFilter" class="form-select">
                        <option value="">Todos los estados</option>
                        <option value="presente">Presente</option>
                        <option value="ausente">Ausente</option>
                        <option value="tardanza">Tardanza</option>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label for="reportsTypeFilter">Tipo de Bloque:</label>
                    <select id="reportsTypeFilter" class="form-select">
                        <option value="">Todos los tipos</option>
                        ${this.getBlockTypeOptions()}
                    </select>
                </div>
                
                <div class="filter-actions">
                    <button id="reportsExportBtn" class="btn btn-primary">
                        <i class="bi bi-download"></i>
                        Exportar
                    </button>
                    <button id="reportsClearFiltersBtn" class="btn btn-outline-secondary">
                        Limpiar Filtros
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render table header HTML
     */
    renderTableHeaderHTML() {
        return `
            <tr>
                <th class="reports-sortable" data-sort="fecha">
                    <div class="th-content">
                        <i class="bi bi-calendar3"></i>
                        Fecha
                        <i class="bi bi-arrow-up-down sort-icon"></i>
                    </div>
                </th>
                <th class="reports-sortable" data-sort="tipoBloque">
                    <div class="th-content">
                        <i class="bi bi-clock-history"></i>
                        Bloque
                        <i class="bi bi-arrow-up-down sort-icon"></i>
                    </div>
                </th>
                <th colspan="2" class="horario-header programado-header">
                    <i class="bi bi-alarm"></i> Horario Programado
                </th>
                <th colspan="2" class="horario-header registro-header">
                    <i class="bi bi-person-check"></i> Registro Real
                </th>
                <th class="reports-sortable" data-sort="horasValidas">
                    <div class="th-content">
                        <i class="bi bi-check-circle"></i>
                        H. Válidas
                        <i class="bi bi-arrow-up-down sort-icon"></i>
                    </div>
                </th>
                <th class="reports-sortable" data-sort="estado">
                    <div class="th-content">
                        <i class="bi bi-check-circle"></i>
                        Estado
                        <i class="bi bi-arrow-up-down sort-icon"></i>
                    </div>
                </th>
                <th>
                    <div class="th-content">
                        <i class="bi bi-chat-text"></i>
                        Observaciones
                    </div>
                </th>
            </tr>
            <tr class="sub-header">
                <th></th>
                <th></th>
                <th class="sub-column">Inicio</th>
                <th class="sub-column">Fin</th>
                <th class="sub-column registro-sub">Entrada</th>
                <th class="sub-column registro-sub">Salida</th>
                <th></th>
                <th></th>
                <th></th>
            </tr>
        `;
    }

    /**
     * Render table body HTML
     */
    renderTableBodyHTML() {
        return this.filteredReports.map((report, index) => `
            <tr class="report-row" style="animation-delay: ${index * 50}ms">
                <td class="date-cell">
                    ${this.formatDate(report.fecha)}
                </td>
                <td class="tipo-bloque-cell">
                    <span class="${this.getTipoBloqueClass(report.tipoBloque)}">
                        ${report.tipoBloque || '--'}
                    </span>
                </td>
                <td class="horario-programado">
                    ${this.formatTime(report.horarioProgramadoInicio)}
                </td>
                <td class="horario-programado">
                    ${this.formatTime(report.horarioProgramadoFinal)}
                </td>
                <td class="horario-real ${report.hasEntryDiscrepancy ? 'horario-discrepancia' : 'horario-ok'}">
                    ${this.formatTime(report.entrada)}
                    ${report.hasEntryDiscrepancy ? '<span class="discrepancia-indicator"></span>' : ''}
                </td>
                <td class="horario-real ${report.hasExitDiscrepancy ? 'horario-discrepancia' : 'horario-ok'}">
                    ${this.formatTime(report.salida)}
                    ${report.hasExitDiscrepancy ? '<span class="discrepancia-indicator"></span>' : ''}
                </td>
                <td class="horas-validas ${this.getHorasValidasClass(report)}">
                    ${report.horasValidas || '--'}
                    ${report.hasHoursDiscrepancy ? '<span class="discrepancia-indicator"></span>' : ''}
                </td>
                <td class="estado-cell">
                    <span class="status-badge ${report.estado}">
                        <i class="${this.getStatusIcon(report.estado)}"></i>
                        ${this.capitalizeFirst(report.estado)}
                    </span>
                </td>
                <td class="observaciones-cell" title="${report.observaciones || 'Sin observaciones'}">
                    ${this.truncateText(report.observaciones || 'Sin observaciones', 50)}
                </td>
            </tr>
        `).join('');
    }

    /**
     * Render discrepancies alert
     */
    renderDiscrepanciesAlert() {
        const discrepancies = this.filteredReports.filter(r => 
            r.hasEntryDiscrepancy || r.hasExitDiscrepancy || r.hasHoursDiscrepancy
        ).length;

        if (discrepancies === 0) return '';

        return `
            <div class="discrepancias-alert">
                <div class="alert-icon">
                    <i class="bi bi-exclamation-triangle-fill"></i>
                </div>
                <div class="alert-content">
                    <h4>Discrepancias Detectadas</h4>
                    <p>Se encontraron <strong>${discrepancies}</strong> registros con diferencias entre horario programado y registrado.</p>
                </div>
                <button class="alert-action" onclick="this.parentElement.style.display='none'">
                    <i class="bi bi-x"></i>
                </button>
            </div>
        `;
    }

    /**
     * Export reports data
     */
    async exportData() {
        const currentAdvisor = this.adminCore.getCurrentAdvisor();
        if (!currentAdvisor || this.filteredReports.length === 0) {
            this.adminCore.showNotification('Sin datos', 'No hay reportes para exportar', 'warning');
            return;
        }

        const headers = [
            'Asesor', 'Número Cuenta', 'Fecha', 'Tipo Bloque',
            'Horario Programado Inicio', 'Horario Programado Final',
            'Entrada Real', 'Salida Real', 'Horas Válidas', 'Estado',
            'Observaciones', 'Discrepancia Entrada', 'Discrepancia Salida', 'Discrepancia Horas'
        ];

        const csvData = this.filteredReports.map(report => [
            currentAdvisor.nombreAsesor,
            currentAdvisor.numeroCuenta,
            report.fecha,
            report.tipoBloque || '',
            report.horarioProgramadoInicio || '',
            report.horarioProgramadoFinal || '',
            report.entrada || '',
            report.salida || '',
            report.horasValidas || '',
            report.estado || '',
            report.observaciones || '',
            report.hasEntryDiscrepancy ? 'SÍ' : 'NO',
            report.hasExitDiscrepancy ? 'SÍ' : 'NO',
            report.hasHoursDiscrepancy ? 'SÍ' : 'NO'
        ]);

        this.adminCore.generateCSV(
            [headers, ...csvData], 
            `reportes_${currentAdvisor.numeroCuenta}`
        );
    }

    /**
     * Utility methods
     */
    hasTimeDiscrepancy(actualTime, expectedTime, tolerance = 15) {
        if (!actualTime || !expectedTime) return false;
        
        const actualMinutes = this.timeToMinutes(actualTime);
        const expectedMinutes = this.timeToMinutes(expectedTime);
        
        return Math.abs(actualMinutes - expectedMinutes) > tolerance;
    }

    hasHoursDiscrepancy(validHours, programmedHours) {
        const validMinutes = this.parseTimeToMinutes(validHours || '0h 0m');
        const programmedMinutes = this.parseTimeToMinutes(programmedHours || '0h 0m');
        
        return validMinutes < programmedMinutes - this.config.discrepanciaThreshold;
    }

    parseDate(dateStr) {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
    }

    formatDate(dateStr) {
        try {
            const date = this.parseDate(dateStr);
            return date.toLocaleDateString('es-MX', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        } catch (error) {
            return dateStr;
        }
    }

    formatTime(timeStr) {
        if (!timeStr) return '<span class="text-muted">--:--</span>';
        return timeStr;
    }

    parseTimeToMinutes(timeStr) {
        if (!timeStr) return 0;
        
        const horasMatch = timeStr.match(/(\d+)h/);
        const minutosMatch = timeStr.match(/(\d+)m/);
        
        const horas = horasMatch ? parseInt(horasMatch[1]) : 0;
        const minutos = minutosMatch ? parseInt(minutosMatch[1]) : 0;
        
        return (horas * 60) + minutos;
    }

    timeToMinutes(timeStr) {
        if (!timeStr) return 0;
        const [hours, minutes] = timeStr.split(':').map(Number);
        return (hours * 60) + (minutes || 0);
    }

    getTipoBloqueClass(tipoBloque) {
        if (!tipoBloque) return '';
        
        const tipo = tipoBloque.toLowerCase();
        if (tipo.includes('provisional-a')) return 'bloque-provisional-a';
        if (tipo.includes('provisional-b')) return 'bloque-provisional-b';
        if (tipo.includes('definitivo')) return 'bloque-definitivo';
        return 'bloque-general';
    }

    getHorasValidasClass(report) {
        const validMinutes = this.parseTimeToMinutes(report.horasValidas || '0h 0m');
        const programmedMinutes = this.parseTimeToMinutes(report.horasProgramadas || '0h 0m');
        
        if (validMinutes === programmedMinutes) return 'horas-completas';
        if (validMinutes < programmedMinutes) return 'horas-incompletas';
        return 'horas-extra';
    }

    getStatusIcon(estado) {
        switch (estado) {
            case 'presente': return 'bi-check-circle-fill';
            case 'ausente': return 'bi-x-circle-fill';
            case 'tardanza': return 'bi-exclamation-triangle-fill';
            default: return 'bi-question-circle-fill';
        }
    }

    capitalizeFirst(str) {
        return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
    }

    truncateText(text, maxLength) {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    getMonthOptions() {
        const months = new Set();
        this.reports.forEach(report => {
            if (report.fecha) {
                const monthKey = report.fecha.substring(0, 7);
                months.add(monthKey);
            }
        });
        
        return Array.from(months).sort().reverse().map(month => {
            const [year, monthNum] = month.split('-');
            const monthName = new Date(year, monthNum - 1).toLocaleDateString('es-MX', { 
                month: 'long', year: 'numeric' 
            });
            return `<option value="${month}">${monthName}</option>`;
        }).join('');
    }

    getBlockTypeOptions() {
        const types = new Set();
        this.reports.forEach(report => {
            if (report.tipoBloque) {
                types.add(report.tipoBloque);
            }
        });
        
        return Array.from(types).sort().map(type => 
            `<option value="${type}">${type}</option>`
        ).join('');
    }

    updateReportsCounts() {
        const reportsCount = document.getElementById('reportsCount');
        if (reportsCount) {
            reportsCount.textContent = this.filteredReports.length;
        }
    }

    updateDiscrepanciesAlert(count) {
        // This would update a global discrepancies counter
        console.log(`Found ${count} discrepancies`);
    }

    updateSortIcons() {
        const sortableHeaders = document.querySelectorAll('.reports-sortable');
        sortableHeaders.forEach(header => {
            const icon = header.querySelector('.sort-icon');
            if (icon) {
                if (header.dataset.sort === this.sortConfig.key) {
                    icon.className = this.sortConfig.direction === 'asc' 
                        ? 'bi bi-arrow-up sort-icon'
                        : 'bi bi-arrow-down sort-icon';
                    header.classList.add('sorted');
                } else {
                    icon.className = 'bi bi-arrow-up-down sort-icon';
                    header.classList.remove('sorted');
                }
            }
        });
    }

    updateFilterOptions() {
        // Re-attach event listeners after DOM update
        setTimeout(() => {
            this.setupEventListeners();
        }, 100);
    }

    attachTableEventListeners() {
        // Clear filters button
        const clearBtn = document.getElementById('reportsClearFiltersBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearFilters();
            });
        }
    }

    clearFilters() {
        this.filters = { mes: '', estado: '', tipoBloque: '' };
        this.applyFilters();
        
        // Reset filter controls
        const mesFilter = document.getElementById('reportsMonthFilter');
        const estadoFilter = document.getElementById('reportsStatusFilter');
        const tipoFilter = document.getElementById('reportsTypeFilter');
        
        if (mesFilter) mesFilter.value = '';
        if (estadoFilter) estadoFilter.value = '';
        if (tipoFilter) tipoFilter.value = '';
    }

    showLoadingState(show) {
        const container = document.getElementById('reportsContainer');
        if (!container) return;

        if (show) {
            container.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <p>Cargando reportes...</p>
                </div>
            `;
        }
    }

    showErrorState() {
        const container = document.getElementById('reportsContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="error-state">
                <div class="error-icon">
                    <i class="bi bi-exclamation-triangle"></i>
                </div>
                <h3>Error al cargar reportes</h3>
                <p>No se pudieron cargar los datos de asistencia</p>
                <button class="btn btn-primary" onclick="window.adminApp.getModule('reports').loadData()">
                    Reintentar
                </button>
            </div>
        `;
    }

    renderEmptyState(container) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="bi bi-inbox"></i>
                </div>
                <h3>No hay reportes</h3>
                <p>No se encontraron reportes de asistencia para los filtros seleccionados.</p>
            </div>
        `;
    }

    clearData() {
        this.reports = [];
        this.filteredReports = [];
        this.filters = { mes: '', estado: '', tipoBloque: '' };
        
        const container = document.getElementById('reportsContainer');
        if (container) {
            container.innerHTML = '';
        }
    }

    cleanup() {
        this.clearData();
    }
}

// Export for global access
window.ReportsManager = ReportsManager;