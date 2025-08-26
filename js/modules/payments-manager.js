/**
 * =================================================================
 * PAYMENTS MANAGER - Payment Hours Processing & Display
 * Archivo: payments-manager.js
 * =================================================================
 */

class PaymentsManager {
    constructor(adminCore) {
        this.adminCore = adminCore;
        this.db = adminCore.db;
        this.payments = [];
        this.filteredPayments = [];
        this.sortConfig = { key: 'fecha', direction: 'desc' };
        this.filters = {
            mes: '',
            sala: '',
            autorizadoPor: ''
        };
        
        this.config = {
            pageSize: 50,
            maxHoursPerDay: 12,
            minHoursForPayment: 0.5
        };

        this.statistics = {
            totalHours: 0,
            totalPayments: 0,
            averageHours: 0,
            byMonth: new Map(),
            bySala: new Map(),
            byAuthorizer: new Map()
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
        console.log('💰 PaymentsManager initialized');
    }

    setupEventListeners() {
        // Filter controls
        const mesFilter = document.getElementById('paymentsMonthFilter');
        const salaFilter = document.getElementById('paymentsSalaFilter');
        const authorizerFilter = document.getElementById('paymentsAuthorizerFilter');

        if (mesFilter) {
            mesFilter.addEventListener('change', (e) => {
                this.filters.mes = e.target.value;
                this.applyFilters();
            });
        }

        if (salaFilter) {
            salaFilter.addEventListener('change', (e) => {
                this.filters.sala = e.target.value;
                this.applyFilters();
            });
        }

        if (authorizerFilter) {
            authorizerFilter.addEventListener('change', (e) => {
                this.filters.autorizadoPor = e.target.value;
                this.applyFilters();
            });
        }

        // Table sorting
        document.addEventListener('click', (e) => {
            if (e.target.closest('.payments-sortable')) {
                const sortKey = e.target.closest('.payments-sortable').dataset.sort;
                this.sortPayments(sortKey);
            }
        });

        // Export button
        const exportBtn = document.getElementById('paymentsExportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportData();
            });
        }

        // Summary toggle
        const summaryToggle = document.getElementById('paymentsSummaryToggle');
        if (summaryToggle) {
            summaryToggle.addEventListener('change', (e) => {
                this.toggleSummaryView(e.target.checked);
            });
        }
    }

    /**
     * Load payments data for current advisor
     */
    async loadData() {
        const currentAdvisor = this.adminCore.getCurrentAdvisor();
        if (!currentAdvisor) return;

        try {
            this.showLoadingState(true);

            // Check cache
            const cacheKey = `payments_${currentAdvisor.numeroCuenta}`;
            if (this.adminCore.isCacheValid(cacheKey, 300000)) { // 5 minutes
                const cached = this.adminCore.cache.get(cacheKey);
                this.payments = cached.data;
                this.processPaymentsData();
                return;
            }

            // Load from database
            const paymentsSnapshot = await this.db.collection('pago_horas')
                .where('numeroCuenta', '==', currentAdvisor.numeroCuenta)
                .orderBy('fecha', 'desc')
                .get();

            this.payments = paymentsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: this.parseDate(doc.data().fecha)
            }));

            // Cache the data
            this.adminCore.cache.set(cacheKey, {
                data: this.payments,
                timestamp: Date.now()
            });

            this.processPaymentsData();
            
            console.log(`💰 Loaded ${this.payments.length} payments`);

        } catch (error) {
            console.error('Error loading payments:', error);
            this.showErrorState();
        } finally {
            this.showLoadingState(false);
        }
    }

    /**
     * Process and analyze payments data
     */
    processPaymentsData() {
        // Calculate statistics
        this.calculateStatistics();
        
        // Apply current filters
        this.applyFilters();
        
        // Update UI counts
        this.updatePaymentsCounts();
        
        // Render the interface
        this.renderPaymentsInterface();
        
        // Update filter options
        this.updateFilterOptions();
    }

    /**
     * Calculate payment statistics
     */
    calculateStatistics() {
        this.statistics.totalPayments = this.payments.length;
        this.statistics.totalHours = this.payments.reduce((sum, payment) => 
            sum + (payment.totalHoras || 0), 0);
        this.statistics.averageHours = this.statistics.totalPayments > 0 ? 
            this.statistics.totalHours / this.statistics.totalPayments : 0;

        // Group by month
        this.statistics.byMonth.clear();
        this.statistics.bySala.clear();
        this.statistics.byAuthorizer.clear();

        this.payments.forEach(payment => {
            const monthKey = payment.fecha ? payment.fecha.substring(0, 7) : 'unknown';
            const sala = payment.sala || 'Sin especificar';
            const authorizer = payment.quienAutorizo || 'Sin especificar';

            // By month
            const monthData = this.statistics.byMonth.get(monthKey) || { count: 0, hours: 0 };
            monthData.count++;
            monthData.hours += payment.totalHoras || 0;
            this.statistics.byMonth.set(monthKey, monthData);

            // By sala
            const salaData = this.statistics.bySala.get(sala) || { count: 0, hours: 0 };
            salaData.count++;
            salaData.hours += payment.totalHoras || 0;
            this.statistics.bySala.set(sala, salaData);

            // By authorizer
            const authData = this.statistics.byAuthorizer.get(authorizer) || { count: 0, hours: 0 };
            authData.count++;
            authData.hours += payment.totalHoras || 0;
            this.statistics.byAuthorizer.set(authorizer, authData);
        });
    }

    /**
     * Apply current filters to payments
     */
    applyFilters() {
        this.filteredPayments = this.payments.filter(payment => {
            // Month filter
            if (this.filters.mes && !payment.fecha.startsWith(this.filters.mes)) {
                return false;
            }

            // Sala filter
            if (this.filters.sala && payment.sala !== this.filters.sala) {
                return false;
            }

            // Authorizer filter
            if (this.filters.autorizadoPor && payment.quienAutorizo !== this.filters.autorizadoPor) {
                return false;
            }

            return true;
        });

        this.renderPaymentsTable();
        this.updatePaymentsCounts();
        this.updateFilteredStatistics();
    }

    /**
     * Sort payments by specified key
     */
    sortPayments(key) {
        if (this.sortConfig.key === key) {
            this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortConfig.key = key;
            this.sortConfig.direction = 'asc';
        }

        this.filteredPayments.sort((a, b) => {
            let aVal = a[key];
            let bVal = b[key];

            // Handle different data types
            if (key === 'fecha') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            } else if (key === 'totalHoras') {
                aVal = parseFloat(aVal || 0);
                bVal = parseFloat(bVal || 0);
            } else if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = (bVal || '').toLowerCase();
            }

            let result = 0;
            if (aVal < bVal) result = -1;
            else if (aVal > bVal) result = 1;

            return this.sortConfig.direction === 'desc' ? -result : result;
        });

        this.renderPaymentsTable();
        this.updateSortIcons();
    }

    /**
     * Render the complete payments interface
     */
    renderPaymentsInterface() {
        const container = document.getElementById('paymentsContainer');
        if (!container) return;

        const interfaceHTML = `
            <div class="payments-interface">
                ${this.renderStatisticsPanel()}
                ${this.renderControlsPanel()}
                ${this.filteredPayments.length > 0 ? this.renderPaymentsTableWrapper() : this.renderEmptyState()}
            </div>
        `;

        container.innerHTML = interfaceHTML;
        this.attachEventListeners();
    }

    /**
     * Render statistics panel
     */
    renderStatisticsPanel() {
        return `
            <div class="payments-stats-panel stats-panel">
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="bi bi-cash-stack"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value">${this.statistics.totalPayments}</div>
                            <div class="stat-label">Total Pagos</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="bi bi-clock"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value">${this.roundToDecimal(this.statistics.totalHours, 1)}h</div>
                            <div class="stat-label">Total Horas</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="bi bi-bar-chart"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value">${this.roundToDecimal(this.statistics.averageHours, 1)}h</div>
                            <div class="stat-label">Promedio por Pago</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="bi bi-calendar-month"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value">${this.statistics.byMonth.size}</div>
                            <div class="stat-label">Meses Activos</div>
                        </div>
                    </div>
                </div>
                
                <div class="breakdown-toggle">
                    <label class="toggle-label">
                        <input type="checkbox" id="paymentsSummaryToggle">
                        <span>Ver resumen detallado</span>
                    </label>
                </div>
                
                <div class="detailed-breakdown" id="detailedBreakdown" style="display: none;">
                    ${this.renderDetailedBreakdown()}
                </div>
            </div>
        `;
    }

    /**
     * Render detailed breakdown
     */
    renderDetailedBreakdown() {
        return `
            <div class="breakdown-sections">
                <div class="breakdown-section">
                    <h4>Por Mes</h4>
                    <div class="breakdown-list">
                        ${Array.from(this.statistics.byMonth.entries())
                            .sort(([a], [b]) => b.localeCompare(a))
                            .map(([month, data]) => `
                                <div class="breakdown-item">
                                    <span class="breakdown-label">${this.formatMonth(month)}</span>
                                    <span class="breakdown-value">${data.count} pagos (${this.roundToDecimal(data.hours, 1)}h)</span>
                                </div>
                            `).join('')}
                    </div>
                </div>
                
                <div class="breakdown-section">
                    <h4>Por Sala</h4>
                    <div class="breakdown-list">
                        ${Array.from(this.statistics.bySala.entries())
                            .sort(([, a], [, b]) => b.hours - a.hours)
                            .map(([sala, data]) => `
                                <div class="breakdown-item">
                                    <span class="breakdown-label">${sala}</span>
                                    <span class="breakdown-value">${data.count} pagos (${this.roundToDecimal(data.hours, 1)}h)</span>
                                </div>
                            `).join('')}
                    </div>
                </div>
                
                <div class="breakdown-section">
                    <h4>Por Autorizador</h4>
                    <div class="breakdown-list">
                        ${Array.from(this.statistics.byAuthorizer.entries())
                            .sort(([, a], [, b]) => b.count - a.count)
                            .map(([auth, data]) => `
                                <div class="breakdown-item">
                                    <span class="breakdown-label">${auth}</span>
                                    <span class="breakdown-value">${data.count} autorizaciones (${this.roundToDecimal(data.hours, 1)}h)</span>
                                </div>
                            `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render controls panel
     */
    renderControlsPanel() {
        return `
            <div class="payments-controls">
                <div class="filters-row">
                    <div class="filter-group">
                        <label for="paymentsMonthFilter">Mes:</label>
                        <select id="paymentsMonthFilter" class="form-select">
                            <option value="">Todos los meses</option>
                            ${this.getMonthOptions()}
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <label for="paymentsSalaFilter">Sala:</label>
                        <select id="paymentsSalaFilter" class="form-select">
                            <option value="">Todas las salas</option>
                            ${this.getSalaOptions()}
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <label for="paymentsAuthorizerFilter">Autorizado por:</label>
                        <select id="paymentsAuthorizerFilter" class="form-select">
                            <option value="">Todos</option>
                            ${this.getAuthorizerOptions()}
                        </select>
                    </div>
                    
                    <div class="filter-actions">
                        <button id="paymentsExportBtn" class="btn btn-primary">
                            <i class="bi bi-download"></i>
                            Exportar
                        </button>
                        <button id="paymentsClearFiltersBtn" class="btn btn-outline-secondary">
                            Limpiar Filtros
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render payments table wrapper
     */
    renderPaymentsTableWrapper() {
        return `
            <div class="payments-table-wrapper table-wrapper">
                <div class="table-header">
                    <h3>
                        <i class="bi bi-cash-coin"></i>
                        Historial de Pago de Horas
                    </h3>
                    <div class="table-count">
                        <span id="paymentsDisplayCount">${this.filteredPayments.length}</span> pagos
                    </div>
                </div>
                
                <div class="table-responsive">
                    <table class="table payments-table">
                        <thead>
                            <tr>
                                <th class="payments-sortable" data-sort="fecha">
                                    <div class="th-content">
                                        <i class="bi bi-calendar3"></i>
                                        Fecha
                                        <i class="bi bi-arrow-up-down sort-icon"></i>
                                    </div>
                                </th>
                                <th class="payments-sortable" data-sort="sala">
                                    <div class="th-content">
                                        <i class="bi bi-building"></i>
                                        Sala
                                        <i class="bi bi-arrow-up-down sort-icon"></i>
                                    </div>
                                </th>
                                <th colspan="2" class="horario-header">
                                    <i class="bi bi-clock"></i> Rango de Horas
                                </th>
                                <th class="payments-sortable" data-sort="totalHoras">
                                    <div class="th-content">
                                        <i class="bi bi-stopwatch"></i>
                                        Total Horas
                                        <i class="bi bi-arrow-up-down sort-icon"></i>
                                    </div>
                                </th>
                                <th class="payments-sortable" data-sort="quienAutorizo">
                                    <div class="th-content">
                                        <i class="bi bi-person-check"></i>
                                        Autorizado por
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
                                <th></th>
                                <th></th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.renderPaymentsTableBody()}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    /**
     * Render payments table body
     */
    renderPaymentsTableBody() {
        return this.filteredPayments.map((payment, index) => `
            <tr class="payment-row" style="animation-delay: ${index * 50}ms">
                <td class="date-cell">
                    ${this.formatDate(payment.fecha)}
                </td>
                <td class="sala-cell">
                    <span class="sala-badge">
                        ${payment.sala || '--'}
                    </span>
                </td>
                <td class="time-cell">
                    ${this.formatTime(payment.horaInicio)}
                </td>
                <td class="time-cell">
                    ${this.formatTime(payment.horaFin)}
                </td>
                <td class="total-hours-cell">
                    <span class="hours-badge ${this.getHoursClass(payment.totalHoras)}">
                        ${payment.totalHoras || 0}h
                    </span>
                </td>
                <td class="authorizer-cell">
                    ${payment.quienAutorizo || 'No especificado'}
                </td>
                <td class="observations-cell" title="${payment.observaciones || 'Sin observaciones'}">
                    ${this.truncateText(payment.observaciones || 'Sin observaciones', 40)}
                </td>
            </tr>
        `).join('');
    }

    /**
     * Render payments table (called when filtering/sorting)
     */
    renderPaymentsTable() {
        const tableWrapper = document.querySelector('.payments-table-wrapper');
        if (!tableWrapper) return;

        if (this.filteredPayments.length === 0) {
            const container = document.getElementById('paymentsContainer');
            if (container) {
                // Replace table with empty state
                const existingInterface = container.querySelector('.payments-interface');
                if (existingInterface) {
                    const statsPanel = existingInterface.querySelector('.payments-stats-panel');
                    const controlsPanel = existingInterface.querySelector('.payments-controls');
                    
                    existingInterface.innerHTML = '';
                    if (statsPanel) existingInterface.appendChild(statsPanel);
                    if (controlsPanel) existingInterface.appendChild(controlsPanel);
                    existingInterface.insertAdjacentHTML('beforeend', this.renderEmptyState());
                }
            }
            return;
        }

        // Update table body
        const tbody = tableWrapper.querySelector('tbody');
        if (tbody) {
            tbody.innerHTML = this.renderPaymentsTableBody();
        }

        // Update count
        const countElement = document.getElementById('paymentsDisplayCount');
        if (countElement) {
            countElement.textContent = this.filteredPayments.length;
        }
    }

    /**
     * Export payments data
     */
    async exportData() {
        const currentAdvisor = this.adminCore.getCurrentAdvisor();
        if (!currentAdvisor || this.filteredPayments.length === 0) {
            this.adminCore.showNotification('Sin datos', 'No hay pagos para exportar', 'warning');
            return;
        }

        const headers = [
            'Asesor', 'Número Cuenta', 'Fecha', 'Sala', 
            'Hora Inicio', 'Hora Fin', 'Total Horas', 
            'Autorizado Por', 'Observaciones'
        ];

        const csvData = this.filteredPayments.map(payment => [
            currentAdvisor.nombreAsesor,
            currentAdvisor.numeroCuenta,
            payment.fecha,
            payment.sala || '',
            payment.horaInicio || '',
            payment.horaFin || '',
            payment.totalHoras || 0,
            payment.quienAutorizo || '',
            payment.observaciones || ''
        ]);

        // Add summary row
        const totalHours = this.filteredPayments.reduce((sum, p) => sum + (p.totalHoras || 0), 0);
        csvData.push(['', '', '', '', '', 'TOTAL:', totalHours, '', '']);

        this.adminCore.generateCSV(
            [headers, ...csvData], 
            `pagos_horas_${currentAdvisor.numeroCuenta}`
        );
    }

    /**
     * Toggle summary view
     */
    toggleSummaryView(show) {
        const breakdown = document.getElementById('detailedBreakdown');
        if (breakdown) {
            breakdown.style.display = show ? 'block' : 'none';
        }
    }

    /**
     * Utility methods
     */
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

    formatMonth(monthStr) {
        const [year, month] = monthStr.split('-');
        const date = new Date(year, month - 1);
        return date.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
    }

    getHoursClass(hours) {
        const h = parseFloat(hours || 0);
        if (h >= 8) return 'hours-full';
        if (h >= 4) return 'hours-partial';
        return 'hours-minimal';
    }

    truncateText(text, maxLength) {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    roundToDecimal(value, decimals) {
        return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
    }

    getMonthOptions() {
        const months = new Set();
        this.payments.forEach(payment => {
            if (payment.fecha) {
                const monthKey = payment.fecha.substring(0, 7);
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

    getSalaOptions() {
        const salas = new Set();
        this.payments.forEach(payment => {
            if (payment.sala) {
                salas.add(payment.sala);
            }
        });
        
        return Array.from(salas).sort().map(sala => 
            `<option value="${sala}">${sala}</option>`
        ).join('');
    }

    getAuthorizerOptions() {
        const authorizers = new Set();
        this.payments.forEach(payment => {
            if (payment.quienAutorizo) {
                authorizers.add(payment.quienAutorizo);
            }
        });
        
        return Array.from(authorizers).sort().map(auth => 
            `<option value="${auth}">${auth}</option>`
        ).join('');
    }

    updatePaymentsCounts() {
        const paymentsCount = document.getElementById('paymentsCount');
        if (paymentsCount) {
            paymentsCount.textContent = this.filteredPayments.length;
        }
    }

    updateFilteredStatistics() {
        // Update statistics panel with filtered data if needed
        // This could show filtered totals in real-time
    }

    updateSortIcons() {
        const sortableHeaders = document.querySelectorAll('.payments-sortable');
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
        setTimeout(() => {
            this.setupEventListeners();
        }, 100);
    }

    attachEventListeners() {
        // Clear filters button
        const clearBtn = document.getElementById('paymentsClearFiltersBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearFilters();
            });
        }

        // Re-attach other event listeners
        this.setupEventListeners();
    }

    clearFilters() {
        this.filters = { mes: '', sala: '', autorizadoPor: '' };
        this.applyFilters();
        
        // Reset filter controls
        const mesFilter = document.getElementById('paymentsMonthFilter');
        const salaFilter = document.getElementById('paymentsSalaFilter');
        const authFilter = document.getElementById('paymentsAuthorizerFilter');
        
        if (mesFilter) mesFilter.value = '';
        if (salaFilter) salaFilter.value = '';
        if (authFilter) authFilter.value = '';
    }

    showLoadingState(show) {
        const container = document.getElementById('paymentsContainer');
        if (!container) return;

        if (show) {
            container.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <p>Cargando pagos...</p>
                </div>
            `;
        }
    }

    showErrorState() {
        const container = document.getElementById('paymentsContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="error-state">
                <div class="error-icon">
                    <i class="bi bi-exclamation-triangle"></i>
                </div>
                <h3>Error al cargar pagos</h3>
                <p>No se pudieron cargar los datos de pago de horas</p>
                <button class="btn btn-primary" onclick="window.adminApp.getModule('payments').loadData()">
                    Reintentar
                </button>
            </div>
        `;
    }

    renderEmptyState() {
        return `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="bi bi-cash-coin"></i>
                </div>
                <h3>No hay pagos registrados</h3>
                <p>No se encontraron registros de pago de horas para los filtros seleccionados.</p>
            </div>
        `;
    }

    clearData() {
        this.payments = [];
        this.filteredPayments = [];
        this.filters = { mes: '', sala: '', autorizadoPor: '' };
        this.statistics = {
            totalHours: 0,
            totalPayments: 0,
            averageHours: 0,
            byMonth: new Map(),
            bySala: new Map(),
            byAuthorizer: new Map()
        };
        
        const container = document.getElementById('paymentsContainer');
        if (container) {
            container.innerHTML = '';
        }
    }

    cleanup() {
        this.clearData();
    }
}

// Export for global access
window.PaymentsManager = PaymentsManager;