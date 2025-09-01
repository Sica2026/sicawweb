/**
 * =================================================================
 * INCIDENCIAS MANAGER - Incident Reports Processing & Display
 * Archivo: incidencias-manager.js (COMPLETO)
 * =================================================================
 */

class IncidenciasManager {
    constructor(adminCore) {
        this.adminCore = adminCore;
        this.db = adminCore.db;
        this.incidencias = [];
        this.filteredIncidencias = [];
        this.sortConfig = { key: 'fecha', direction: 'desc' };
        this.filters = {
            mes: '',
            motivo: '',
            sala: '',
            reportadoPor: ''
        };
        
        this.config = {
            pageSize: 50,
            maxHoursPerIncident: 24
        };

        this.statistics = {
            totalIncidencias: 0,
            totalHorasAcumuladas: 0,
            promedioHoras: 0,
            byMotivo: new Map(),
            bySala: new Map(),
            byReporter: new Map(),
            byMonth: new Map()
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
        console.log('🚨 IncidenciasManager initialized');
    }

    setupEventListeners() {
        // Filter controls
        const mesFilter = document.getElementById('incidenciasMonthFilter');
        const motivoFilter = document.getElementById('incidenciasMotivoFilter');
        const salaFilter = document.getElementById('incidenciasSalaFilter');
        const reporterFilter = document.getElementById('incidenciasReporterFilter');

        if (mesFilter) {
            mesFilter.addEventListener('change', (e) => {
                this.filters.mes = e.target.value;
                this.applyFilters();
            });
        }

        if (motivoFilter) {
            motivoFilter.addEventListener('change', (e) => {
                this.filters.motivo = e.target.value;
                this.applyFilters();
            });
        }

        if (salaFilter) {
            salaFilter.addEventListener('change', (e) => {
                this.filters.sala = e.target.value;
                this.applyFilters();
            });
        }

        if (reporterFilter) {
            reporterFilter.addEventListener('change', (e) => {
                this.filters.reportadoPor = e.target.value;
                this.applyFilters();
            });
        }

        // Table sorting
        document.addEventListener('click', (e) => {
            if (e.target.closest('.incidencias-sortable')) {
                const sortKey = e.target.closest('.incidencias-sortable').dataset.sort;
                this.sortIncidencias(sortKey);
            }
        });

        // Export button
        const exportBtn = document.getElementById('incidenciasExportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportData();
            });
        }

        // Summary toggle
        const summaryToggle = document.getElementById('incidenciasSummaryToggle');
        if (summaryToggle) {
            summaryToggle.addEventListener('change', (e) => {
                this.toggleSummaryView(e.target.checked);
            });
        }
    }

    /**
     * Load incidencias data for current advisor
     */
    async loadData() {
        const currentAdvisor = this.adminCore.getCurrentAdvisor();
        if (!currentAdvisor) return;

        try {
            this.showLoadingState(true);

            // Check cache
            const cacheKey = `incidencias_${currentAdvisor.numeroCuenta}`;
            if (this.adminCore.isCacheValid(cacheKey, 300000)) { // 5 minutes
                const cached = this.adminCore.cache.get(cacheKey);
                this.incidencias = cached.data;
                this.processIncidenciasData();
                return;
            }

            // Load from database
            const incidenciasSnapshot = await this.db.collection('incidencias')
                .where('asesorCuenta', '==', currentAdvisor.numeroCuenta)
                .orderBy('fecha', 'desc')
                .get();

            this.incidencias = incidenciasSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: this.parseDate(doc.data().fecha)
            }));

            // Cache the data
            this.adminCore.cache.set(cacheKey, {
                data: this.incidencias,
                timestamp: Date.now()
            });

            this.processIncidenciasData();
            
            console.log(`🚨 Loaded ${this.incidencias.length} incidencias`);

        } catch (error) {
            console.error('Error loading incidencias:', error);
            this.showErrorState();
        } finally {
            this.showLoadingState(false);
        }
    }

    /**
     * Process and analyze incidencias data
     */
    processIncidenciasData() {
        // Calculate statistics
        this.calculateStatistics();
        
        // Apply current filters
        this.applyFilters();
        
        // Update UI counts
        this.updateIncidenciasCounts();
        
        // Render the interface
        this.renderIncidenciasInterface();
        
        // Update filter options
        this.updateFilterOptions();
    }

    parseHorasAcumuladas(horasStr) {
        if (!horasStr) return 0;
        
        // Si es un número, asumimos que son horas
        if (!isNaN(horasStr)) {
            return parseFloat(horasStr);
        }
        
        // Formato "4h 0m" o similar
        const horasMatch = horasStr.match(/(\d+)h/);
        const minutosMatch = horasStr.match(/(\d+)m/);
        
        const horas = horasMatch ? parseInt(horasMatch[1]) : 0;
        const minutos = minutosMatch ? parseInt(minutosMatch[1]) : 0;
        
        return horas + (minutos / 60);
    }

    /**
     * Calculate incidencias statistics
     */
    calculateStatistics() {
        this.statistics.totalIncidencias = this.incidencias.length;
        
        // CORREGIDO: Usar horasEnMinutos en lugar de horasAcumuladas
        this.statistics.totalHorasAcumuladas = this.incidencias.reduce((sum, incidencia) => {
            // Priorizar horasEnMinutos si existe, sino convertir horasAcumuladas
            const horas = incidencia.horasEnMinutos ? 
                incidencia.horasEnMinutos / 60 : 
                this.parseHorasAcumuladas(incidencia.horasAcumuladas);
            return sum + horas;
        }, 0);
        
        this.statistics.promedioHoras = this.statistics.totalIncidencias > 0 ? 
            this.statistics.totalHorasAcumuladas / this.statistics.totalIncidencias : 0;

        // Clear existing maps
        this.statistics.byMotivo.clear();
        this.statistics.bySala.clear();
        this.statistics.byReporter.clear();
        this.statistics.byMonth.clear();

        // Group by different criteria
        this.incidencias.forEach(incidencia => {
            const monthKey = incidencia.fecha ? incidencia.fecha.substring(0, 7) : 'unknown';
            const motivo = incidencia.motivoFalta || 'Sin especificar';
            const sala = incidencia.sala || 'Sin especificar';
            const reporter = incidencia.reportadoPor || 'Sin especificar';
            
            // CORREGIDO: Calcular horas correctamente para estadísticas
            const horas = incidencia.horasEnMinutos ? 
                incidencia.horasEnMinutos / 60 : 
                this.parseHorasAcumuladas(incidencia.horasAcumuladas);

            // By month
            const monthData = this.statistics.byMonth.get(monthKey) || { count: 0, hours: 0 };
            monthData.count++;
            monthData.hours += horas;
            this.statistics.byMonth.set(monthKey, monthData);

            // By motivo
            const motivoData = this.statistics.byMotivo.get(motivo) || { count: 0, hours: 0 };
            motivoData.count++;
            motivoData.hours += horas;
            this.statistics.byMotivo.set(motivo, motivoData);

            // By sala
            const salaData = this.statistics.bySala.get(sala) || { count: 0, hours: 0 };
            salaData.count++;
            salaData.hours += horas;
            this.statistics.bySala.set(sala, salaData);

            // By reporter
            const reporterData = this.statistics.byReporter.get(reporter) || { count: 0, hours: 0 };
            reporterData.count++;
            reporterData.hours += horas;
            this.statistics.byReporter.set(reporter, reporterData);
        });
    }
    /**
     * Apply current filters to incidencias
     */
    applyFilters() {
        this.filteredIncidencias = this.incidencias.filter(incidencia => {
            // Month filter
            if (this.filters.mes && !incidencia.fecha.startsWith(this.filters.mes)) {
                return false;
            }

            // Motivo filter
            if (this.filters.motivo && incidencia.motivoFalta !== this.filters.motivo) {
                return false;
            }

            // Sala filter
            if (this.filters.sala && incidencia.sala !== this.filters.sala) {
                return false;
            }

            // Reporter filter
            if (this.filters.reportadoPor && incidencia.reportadoPor !== this.filters.reportadoPor) {
                return false;
            }

            return true;
        });

        this.renderIncidenciasTable();
        this.updateIncidenciasCounts();
        this.updateFilteredStatistics();
    }

    /**
     * Sort incidencias by specified key
     */
    sortIncidencias(key) {
        if (this.sortConfig.key === key) {
            this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortConfig.key = key;
            this.sortConfig.direction = 'asc';
        }

        this.filteredIncidencias.sort((a, b) => {
            let aVal = a[key];
            let bVal = b[key];

            // Handle different data types
            if (key === 'fecha') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            } else if (key === 'horasAcumuladas') {
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

        this.renderIncidenciasTable();
        this.updateSortIcons();
    }

    /**
     * Render the complete incidencias interface
     */
    renderIncidenciasInterface() {
        const container = document.getElementById('incidenciasContainer');
        if (!container) return;

        const interfaceHTML = `
            <div class="incidencias-interface">
                ${this.renderStatisticsPanel()}
                ${this.renderControlsPanel()}
                ${this.filteredIncidencias.length > 0 ? this.renderIncidenciasTableWrapper() : this.renderEmptyState()}
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
            <div class="incidencias-stats-panel stats-panel">
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="bi bi-exclamation-triangle-fill"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value">${this.statistics.totalIncidencias}</div>
                            <div class="stat-label">Total Incidencias</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="bi bi-clock-fill"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value">${this.roundToDecimal(this.statistics.totalHorasAcumuladas, 1)}h</div>
                            <div class="stat-label">Total Horas</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="bi bi-bar-chart-fill"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value">${this.roundToDecimal(this.statistics.promedioHoras, 1)}h</div>
                            <div class="stat-label">Promedio por Incidencia</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="bi bi-calendar-month-fill"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value">${this.statistics.byMonth.size}</div>
                            <div class="stat-label">Meses con Incidencias</div>
                        </div>
                    </div>
                </div>
                
                <div class="breakdown-toggle">
                    <label class="toggle-label">
                        <input type="checkbox" id="incidenciasSummaryToggle">
                        <span>Ver resumen detallado</span>
                    </label>
                </div>
                
                <div class="detailed-breakdown" id="incidenciasDetailedBreakdown" style="display: none;">
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
                    <h4>Por Motivo</h4>
                    <div class="breakdown-list">
                        ${Array.from(this.statistics.byMotivo.entries())
                            .sort(([, a], [, b]) => b.count - a.count)
                            .map(([motivo, data]) => `
                                <div class="breakdown-item">
                                    <span class="breakdown-label">${motivo}</span>
                                    <span class="breakdown-value">${data.count} incidencias (${this.roundToDecimal(data.hours, 1)}h)</span>
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
                                    <span class="breakdown-value">${data.count} incidencias (${this.roundToDecimal(data.hours, 1)}h)</span>
                                </div>
                            `).join('')}
                    </div>
                </div>
                
                <div class="breakdown-section">
                    <h4>Por Reportado Por</h4>
                    <div class="breakdown-list">
                        ${Array.from(this.statistics.byReporter.entries())
                            .sort(([, a], [, b]) => b.count - a.count)
                            .map(([reporter, data]) => `
                                <div class="breakdown-item">
                                    <span class="breakdown-label">${reporter}</span>
                                    <span class="breakdown-value">${data.count} reportes (${this.roundToDecimal(data.hours, 1)}h)</span>
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
            <div class="incidencias-controls">
                <div class="filters-row">
                    <div class="filter-group">
                        <label for="incidenciasMonthFilter">Mes:</label>
                        <select id="incidenciasMonthFilter" class="form-select">
                            <option value="">Todos los meses</option>
                            ${this.getMonthOptions()}
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <label for="incidenciasMotivoFilter">Motivo:</label>
                        <select id="incidenciasMotivoFilter" class="form-select">
                            <option value="">Todos los motivos</option>
                            ${this.getMotivoOptions()}
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <label for="incidenciasSalaFilter">Sala:</label>
                        <select id="incidenciasSalaFilter" class="form-select">
                            <option value="">Todas las salas</option>
                            ${this.getSalaOptions()}
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <label for="incidenciasReporterFilter">Reportado por:</label>
                        <select id="incidenciasReporterFilter" class="form-select">
                            <option value="">Todos</option>
                            ${this.getReporterOptions()}
                        </select>
                    </div>
                    
                    <div class="filter-actions">
                        <button id="incidenciasExportBtn" class="btn btn-primary">
                            <i class="bi bi-download"></i>
                            Exportar
                        </button>
                        <button id="incidenciasClearFiltersBtn" class="btn btn-outline-secondary">
                            Limpiar Filtros
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render incidencias table wrapper
     */
    renderIncidenciasTableWrapper() {
        return `
            <div class="incidencias-table-wrapper table-wrapper">
                <div class="table-header">
                    <h3>
                        <i class="bi bi-exclamation-triangle"></i>
                        Historial de Incidencias
                    </h3>
                    <div class="table-count">
                        <span id="incidenciasDisplayCount">${this.filteredIncidencias.length}</span> incidencias
                    </div>
                </div>
                
                <div class="table-responsive">
                    <table class="table incidencias-table">
                        <thead>
                            <tr>
                                <th class="incidencias-sortable" data-sort="fecha">
                                    <div class="th-content">
                                        <i class="bi bi-calendar3"></i>
                                        Fecha
                                        <i class="bi bi-arrow-up-down sort-icon"></i>
                                    </div>
                                </th>
                                <th class="incidencias-sortable" data-sort="sala">
                                    <div class="th-content">
                                        <i class="bi bi-building"></i>
                                        Sala
                                        <i class="bi bi-arrow-up-down sort-icon"></i>
                                    </div>
                                </th>
                                <th colspan="2" class="horario-header">
                                    <i class="bi bi-clock"></i> Rango de Horas
                                </th>
                                <th class="incidencias-sortable" data-sort="horasAcumuladas">
                                    <div class="th-content">
                                        <i class="bi bi-stopwatch"></i>
                                        Horas Acumuladas
                                        <i class="bi bi-arrow-up-down sort-icon"></i>
                                    </div>
                                </th>
                                <th class="incidencias-sortable" data-sort="motivoFalta">
                                    <div class="th-content">
                                        <i class="bi bi-exclamation-circle"></i>
                                        Motivo
                                        <i class="bi bi-arrow-up-down sort-icon"></i>
                                    </div>
                                </th>
                                <th class="incidencias-sortable" data-sort="reportadoPor">
                                    <div class="th-content">
                                        <i class="bi bi-person-badge"></i>
                                        Reportado Por
                                        <i class="bi bi-arrow-up-down sort-icon"></i>
                                    </div>
                                </th>
                            </tr>
                            <tr class="sub-header">
                                <th></th>
                                <th></th>
                                <th class="sub-column">Inicio</th>
                                <th class="sub-column">Final</th>
                                <th></th>
                                <th></th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.renderIncidenciasTableBody()}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    /**
     * Render incidencias table body
     */
    renderIncidenciasTableBody() {
        return this.filteredIncidencias.map((incidencia, index) => {
            // CORREGIDO: Mostrar horas usando el método más confiable
            const horasDisplay = incidencia.horasEnMinutos ? 
                this.roundToDecimal(incidencia.horasEnMinutos / 60, 1) : 
                (incidencia.horasAcumuladas || 0);
                
            return `
                <tr class="incidencia-row" style="animation-delay: ${index * 50}ms">
                    <td class="date-cell">
                        ${this.formatDate(incidencia.fecha)}
                    </td>
                    <td class="sala-cell">
                        <span class="sala-badge">
                            ${incidencia.sala || '--'}
                        </span>
                    </td>
                    <td class="time-cell">
                        ${this.formatTime(incidencia.horaInicio)}
                    </td>
                    <td class="time-cell">
                        ${this.formatTime(incidencia.horaFinal)}
                    </td>
                    <td class="horas-acumuladas-cell">
                        <span class="hours-badge ${this.getHorasClass(horasDisplay)}">
                            ${horasDisplay}h
                        </span>
                    </td>
                    <td class="motivo-cell">
                        <span class="motivo-badge ${this.getMotivoClass(incidencia.motivoFalta)}">
                            ${incidencia.motivoFalta || 'Sin especificar'}
                        </span>
                    </td>
                    <td class="reporter-cell">
                        ${incidencia.reportadoPor || 'No especificado'}
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Render incidencias table (called when filtering/sorting)
     */
    renderIncidenciasTable() {
        const tableWrapper = document.querySelector('.incidencias-table-wrapper');
        if (!tableWrapper) return;

        if (this.filteredIncidencias.length === 0) {
            const container = document.getElementById('incidenciasContainer');
            if (container) {
                // Replace table with empty state
                const existingInterface = container.querySelector('.incidencias-interface');
                if (existingInterface) {
                    const statsPanel = existingInterface.querySelector('.incidencias-stats-panel');
                    const controlsPanel = existingInterface.querySelector('.incidencias-controls');
                    
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
            tbody.innerHTML = this.renderIncidenciasTableBody();
        }

        // Update count
        const countElement = document.getElementById('incidenciasDisplayCount');
        if (countElement) {
            countElement.textContent = this.filteredIncidencias.length;
        }
    }

    /**
     * Export incidencias data
     */
    async exportData() {
        const currentAdvisor = this.adminCore.getCurrentAdvisor();
        if (!currentAdvisor || this.filteredIncidencias.length === 0) {
            this.adminCore.showNotification('Sin datos', 'No hay incidencias para exportar', 'warning');
            return;
        }

        const headers = [
            'Asesor', 'Número Cuenta', 'Fecha', 'Sala', 
            'Hora Inicio', 'Hora Final', 'Horas Acumuladas', 
            'Motivo Falta', 'Reportado Por'
        ];

        const csvData = this.filteredIncidencias.map(incidencia => {
            // CORREGIDO: Usar el valor más confiable para exportación
            const horasExport = incidencia.horasEnMinutos ? 
                this.roundToDecimal(incidencia.horasEnMinutos / 60, 1) : 
                (incidencia.horasAcumuladas || 0);
                
            return [
                currentAdvisor.nombreAsesor,
                currentAdvisor.numeroCuenta,
                incidencia.fecha,
                incidencia.sala || '',
                incidencia.horaInicio || '',
                incidencia.horaFinal || '',
                horasExport,
                incidencia.motivoFalta || '',
                incidencia.reportadoPor || ''
            ];
        });

        // Add summary row - CORREGIDO
        const totalHoras = this.filteredIncidencias.reduce((sum, incidencia) => {
            const horas = incidencia.horasEnMinutos ? 
                incidencia.horasEnMinutos / 60 : 
                this.parseHorasAcumuladas(incidencia.horasAcumuladas);
            return sum + horas;
        }, 0);
        
        csvData.push(['', '', '', '', '', 'TOTAL:', this.roundToDecimal(totalHoras, 1), '', '']);

        this.adminCore.generateCSV(
            [headers, ...csvData], 
            `incidencias_${currentAdvisor.numeroCuenta}`
        );
    }

    /**
     * Toggle summary view
     */
    toggleSummaryView(show) {
        const breakdown = document.getElementById('incidenciasDetailedBreakdown');
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

    getHorasClass(horas) {
        const h = parseFloat(horas || 0);
        if (h >= 8) return 'hours-critical';
        if (h >= 4) return 'hours-warning';
        return 'hours-minor';
    }

    getMotivoClass(motivo) {
        if (!motivo) return 'motivo-unknown';
        
        const motivoLower = motivo.toLowerCase();
        if (motivoLower.includes('enfermedad') || motivoLower.includes('médico')) return 'motivo-medical';
        if (motivoLower.includes('personal') || motivoLower.includes('familiar')) return 'motivo-personal';
        if (motivoLower.includes('justificada') || motivoLower.includes('permiso')) return 'motivo-justified';
        if (motivoLower.includes('injustificada')) return 'motivo-unjustified';
        return 'motivo-other';
    }

    roundToDecimal(value, decimals) {
        return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
    }

    getMonthOptions() {
        const months = new Set();
        this.incidencias.forEach(incidencia => {
            if (incidencia.fecha) {
                const monthKey = incidencia.fecha.substring(0, 7);
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

    getMotivoOptions() {
        const motivos = new Set();
        this.incidencias.forEach(incidencia => {
            if (incidencia.motivoFalta) {
                motivos.add(incidencia.motivoFalta);
            }
        });
        
        return Array.from(motivos).sort().map(motivo => 
            `<option value="${motivo}">${motivo}</option>`
        ).join('');
    }

    getSalaOptions() {
        const salas = new Set();
        this.incidencias.forEach(incidencia => {
            if (incidencia.sala) {
                salas.add(incidencia.sala);
            }
        });
        
        return Array.from(salas).sort().map(sala => 
            `<option value="${sala}">${sala}</option>`
        ).join('');
    }

    getReporterOptions() {
        const reporters = new Set();
        this.incidencias.forEach(incidencia => {
            if (incidencia.reportadoPor) {
                reporters.add(incidencia.reportadoPor);
            }
        });
        
        return Array.from(reporters).sort().map(reporter => 
            `<option value="${reporter}">${reporter}</option>`
        ).join('');
    }

    updateIncidenciasCounts() {
        const incidenciasCount = document.getElementById('incidenciasCount');
        if (incidenciasCount) {
            incidenciasCount.textContent = this.filteredIncidencias.length;
        }
    }

    updateFilteredStatistics() {
        // Update statistics panel with filtered data if needed
        // This could show filtered totals in real-time
    }

    updateSortIcons() {
        const sortableHeaders = document.querySelectorAll('.incidencias-sortable');
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

    attachEventListeners() {
        // Clear filters button
        const clearBtn = document.getElementById('incidenciasClearFiltersBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearFilters();
            });
        }

        // Re-attach other event listeners
        this.setupEventListeners();
    }

    clearFilters() {
        this.filters = { mes: '', motivo: '', sala: '', reportadoPor: '' };
        this.applyFilters();
        
        // Reset filter controls
        const mesFilter = document.getElementById('incidenciasMonthFilter');
        const motivoFilter = document.getElementById('incidenciasMotivoFilter');
        const salaFilter = document.getElementById('incidenciasSalaFilter');
        const reporterFilter = document.getElementById('incidenciasReporterFilter');
        
        if (mesFilter) mesFilter.value = '';
        if (motivoFilter) motivoFilter.value = '';
        if (salaFilter) salaFilter.value = '';
        if (reporterFilter) reporterFilter.value = '';
    }

    showLoadingState(show) {
        const container = document.getElementById('incidenciasContainer');
        if (!container) return;

        if (show) {
            container.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <p>Cargando incidencias...</p>
                </div>
            `;
        }
    }

    showErrorState() {
        const container = document.getElementById('incidenciasContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="error-state">
                <div class="error-icon">
                    <i class="bi bi-exclamation-triangle"></i>
                </div>
                <h3>Error al cargar incidencias</h3>
                <p>No se pudieron cargar los datos de incidencias</p>
                <button class="btn btn-primary" onclick="window.adminApp.getModule('incidencias').loadData()">
                    Reintentar
                </button>
            </div>
        `;
    }

    renderEmptyState() {
        return `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="bi bi-exclamation-triangle"></i>
                </div>
                <h3>No hay incidencias registradas</h3>
                <p>No se encontraron incidencias para los filtros seleccionados.</p>
            </div>
        `;
    }

    /**
     * Get statistics for overview dashboard
     */
    getStatisticsForOverview() {
        return {
            totalIncidencias: this.statistics.totalIncidencias,
            totalHorasAcumuladas: this.statistics.totalHorasAcumuladas,
            promedioHoras: this.statistics.promedioHoras,
            incidenciasRecientes: this.getRecentIncidencias(7), // Last 7 days
            motivoMasComun: this.getMostCommonMotivo(),
            tendenciaUltimoMes: this.getMonthlyTrend()
        };
    }

    /**
     * Get recent incidencias for activity feed
     */
    getRecentIncidencias(days = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        return this.incidencias
            .filter(incidencia => this.parseDate(incidencia.fecha) >= cutoffDate)
            .slice(0, 5)
            .map(incidencia => ({
                fecha: incidencia.fecha,
                motivo: incidencia.motivoFalta || 'Sin especificar',
                horas: incidencia.horasAcumuladas || 0,
                sala: incidencia.sala || 'Sin especificar'
            }));
    }

    /**
     * Get most common motivo
     */
    getMostCommonMotivo() {
        if (this.statistics.byMotivo.size === 0) return 'N/A';
        
        let mostCommon = { motivo: 'N/A', count: 0 };
        this.statistics.byMotivo.forEach((data, motivo) => {
            if (data.count > mostCommon.count) {
                mostCommon = { motivo, count: data.count };
            }
        });
        
        return mostCommon.motivo;
    }

    /**
     * Get monthly trend
     */
    getMonthlyTrend() {
        const currentMonth = new Date().toISOString().substring(0, 7);
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const lastMonthKey = lastMonth.toISOString().substring(0, 7);
        
        const currentCount = this.statistics.byMonth.get(currentMonth)?.count || 0;
        const lastCount = this.statistics.byMonth.get(lastMonthKey)?.count || 0;
        
        if (lastCount === 0) return 'stable';
        
        const change = ((currentCount - lastCount) / lastCount) * 100;
        if (change > 10) return 'increasing';
        if (change < -10) return 'decreasing';
        return 'stable';
    }

    clearData() {
        this.incidencias = [];
        this.filteredIncidencias = [];
        this.filters = { mes: '', motivo: '', sala: '', reportadoPor: '' };
        this.statistics = {
            totalIncidencias: 0,
            totalHorasAcumuladas: 0,
            promedioHoras: 0,
            byMotivo: new Map(),
            bySala: new Map(),
            byReporter: new Map(),
            byMonth: new Map()
        };
        
        const container = document.getElementById('incidenciasContainer');
        if (container) {
            container.innerHTML = '';
        }
    }

    cleanup() {
        this.clearData();
    }
}

// Export for global access
window.IncidenciasManager = IncidenciasManager;