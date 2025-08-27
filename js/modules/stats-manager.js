/**
 * =================================================================
 * STATS MANAGER - Advanced Statistics & Analytics Engine
 * Archivo: stats-manager.js (Core para futuras expansiones)
 * =================================================================
 */

class StatsManager {
    constructor(adminCore) {
        this.adminCore = adminCore;
        this.db = adminCore.db;
        
        // Current stats data
        this.currentStats = {
            horasTrabajadas: 0,
            horasPendientes: 0,
            horasPagadas: 0,
            diasTrabajados: 0,
            promedioDiario: 0,
            eficiencia: 0,
            tendencias: {},
            comparativoMensual: []
        };

        // Analytics data structures
        this.timeSeriesData = new Map();
        this.aggregatedData = new Map();
        this.comparisonData = new Map();
        
        // Configuration
        this.config = {
            toleranciaMinutos: 15,
            horasMinimaDia: 6,
            diasHabilesMes: 22,
            updateInterval: 300000, // 5 minutes
            cacheTimeout: 600000    // 10 minutes
        };

        this.init();
    }

    init() {
        console.log('📊 StatsManager initialized - Advanced Analytics Ready');
    }

    /**
     * Load comprehensive advisor statistics
     */
    async loadAdvisorStats(numeroCuenta) {
        if (!numeroCuenta) return;

        try {
            // Check cache first
            const cacheKey = `stats_${numeroCuenta}`;
            if (this.adminCore.isCacheValid(cacheKey, this.config.cacheTimeout)) {
                const cached = this.adminCore.cache.get(cacheKey);
                this.currentStats = cached.data;
                this.renderStatsCards();
                return;
            }

            // Load data in parallel
            const [reportsData, paymentsData, servicioSocialData] = await Promise.all([
                this.loadReportsData(numeroCuenta),
                this.loadPaymentsData(numeroCuenta),
                this.loadServicioSocialHours(numeroCuenta)
            ]);

            // Calculate comprehensive statistics
            await this.calculateAdvancedStats(reportsData, paymentsData);
            
            // Add service social data to stats
            this.currentStats.servicioSocial = servicioSocialData;
            
            // Cache the results
            this.adminCore.cache.set(cacheKey, {
                data: { ...this.currentStats },
                timestamp: Date.now()
            });

            // Render the stats cards
            this.renderStatsCards();

            console.log(`Stats calculated for advisor ${numeroCuenta}`);

        } catch (error) {
            console.error('Error loading advisor stats:', error);
            this.renderErrorState();
        }
    }

    /**
     * Load reports data with advanced filtering
     */
    async loadReportsData(numeroCuenta) {
        const reportsSnapshot = await this.db.collection('reportesasesores')
            .where('numeroCuenta', '==', numeroCuenta)
            .orderBy('fecha', 'desc')
            .get();

        return reportsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: this.parseDate(doc.data().fecha)
        }));
    }

    /**
     * Load payments data
     */
    async loadPaymentsData(numeroCuenta) {
        const paymentsSnapshot = await this.db.collection('pago_horas')
            .where('numeroCuenta', '==', numeroCuenta)
            .orderBy('fecha', 'desc')
            .get();

        return paymentsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: this.parseDate(doc.data().fecha)
        }));
    }

    /**
     * Calculate advanced statistics with multiple metrics
     */
    async calculateAdvancedStats(reportsData, paymentsData) {
        // Basic calculations
        this.currentStats.horasTrabajadas = this.calculateTotalHours(reportsData);
        this.currentStats.horasPendientes = this.calculatePendingHoursImproved(reportsData);
        this.currentStats.horasPagadas = this.calculatePaidHours(paymentsData);
        this.currentStats.diasTrabajados = this.calculateWorkingDays(reportsData);

        // Advanced metrics
        this.currentStats.promedioDiario = this.calculateDailyAverage(reportsData);
        this.currentStats.eficiencia = this.calculateEfficiency(reportsData);
        this.currentStats.puntualidad = this.calculatePunctuality(reportsData);
        this.currentStats.consistencia = this.calculateConsistency(reportsData);

        // Time series analysis
        this.currentStats.tendencias = this.analyzeTrends(reportsData);
        this.currentStats.comparativoMensual = this.calculateMonthlyComparison(reportsData);
        this.currentStats.proyecciones = this.calculateProjections(reportsData);

        // Performance indicators
        this.currentStats.kpis = this.calculateKPIs(reportsData, paymentsData);
        
        // Quality metrics
        this.currentStats.calidad = this.calculateQualityMetrics(reportsData);
    }

    /**
     * Calculate total working hours with validation
     */
    calculateTotalHours(reportsData) {
        let totalMinutes = 0;
        
        reportsData.forEach(report => {
            if (report.estado === 'presente' && report.horasValidas) {
                const minutes = this.parseTimeToMinutes(report.horasValidas);
                if (minutes > 0 && minutes <= 720) { // Max 12 hours per day
                    totalMinutes += minutes;
                }
            }
        });

        return this.roundToDecimal(totalMinutes / 60, 2);
    }

    /**
     * Parse time string to minutes with improved handling
     */
    parseTimeToMinutes(timeStr) {
        if (!timeStr) return 0;
        
        // Si es un número simple, asumimos que son horas
        if (!isNaN(timeStr)) {
            return parseFloat(timeStr) * 60;
        }
        
        // Formato "Xh Ym"
        const horasMatch = timeStr.match(/(\d+(?:\.\d+)?)h/);
        const minutosMatch = timeStr.match(/(\d+)m/);
        
        const horas = horasMatch ? parseFloat(horasMatch[1]) : 0;
        const minutos = minutosMatch ? parseInt(minutosMatch[1]) : 0;
        
        return (horas * 60) + minutos;
    }

    /**
     * Calculate expected hours for a report
     */
    calculateExpectedHours(report) {
        // Para ausentes, usar tiempoTrabajado (valor negativo que indica lo que debe)
        if (report.estado === 'ausente' && report.tiempoTrabajado) {
            // tiempoTrabajado viene como "-1h 30m", quitamos el signo negativo
            const debtTime = report.tiempoTrabajado.replace('-', '');
            return this.parseTimeToMinutes(debtTime);
        }
        
        // Si ya existe horasProgramadas, usarla
        if (report.horasProgramadas) {
            return this.parseTimeToMinutes(report.horasProgramadas);
        }
        
        // Si no, calcular desde horarios programados
        if (report.horarioProgramadoInicio && report.horarioProgramadoFinal) {
            const inicioMinutes = this.timeToMinutes(report.horarioProgramadoInicio);
            const finMinutes = this.timeToMinutes(report.horarioProgramadoFinal);
            
            let totalMinutes = finMinutes - inicioMinutes;
            
            // Si pasa de medianoche, ajustar
            if (totalMinutes < 0) {
                totalMinutes += 24 * 60;
            }
            
            return totalMinutes;
        }
        
        // Valor por defecto si no hay datos
        return 8 * 60; // 8 horas por defecto
    }

    /**
     * Calculate pending/owed hours with improved logic
     */
    calculatePendingHoursImproved(reportsData) {
        let pendingMinutes = 0;

        reportsData.forEach(report => {
            const expectedMinutes = this.calculateExpectedHours(report);
            
            if (report.estado === 'ausente') {
                // Día completo ausente
                pendingMinutes += expectedMinutes;
                
            } else if (report.estado === 'presente' || report.estado === 'tardanza') {
                // Calcular la diferencia real
                const validMinutes = this.parseTimeToMinutes(report.horasValidas || '0h 0m');
                const shortfall = expectedMinutes - validMinutes;
                
                // Solo contar diferencias significativas
                if (shortfall > this.config.toleranciaMinutos) {
                    pendingMinutes += shortfall;
                }
            }
        });

        return this.roundToDecimal(pendingMinutes / 60, 2);
    }

    /**
     * Calculate paid hours
     */
    calculatePaidHours(paymentsData) {
        return paymentsData.reduce((total, payment) => {
            return total + (payment.totalHoras || 0);
        }, 0);
    }

    /**
     * Calculate working days with presence validation
     */
    calculateWorkingDays(reportsData) {
        const workingDays = new Set();
        
        reportsData.forEach(report => {
            if (report.estado === 'presente') {
                workingDays.add(report.fecha);
            }
        });

        return workingDays.size;
    }

    /**
     * Calculate daily average hours
     */
    calculateDailyAverage(reportsData) {
        const workingDays = this.calculateWorkingDays(reportsData);
        const totalHours = this.calculateTotalHours(reportsData);
        
        return workingDays > 0 ? this.roundToDecimal(totalHours / workingDays, 2) : 0;
    }

    /**
     * Calculate efficiency score (0-100%)
     */
    calculateEfficiency(reportsData) {
        let totalExpected = 0;
        let totalActual = 0;

        reportsData.forEach(report => {
            if (report.estado !== 'ausente') {
                const expected = this.calculateExpectedHours(report);
                const actual = this.parseTimeToMinutes(report.horasValidas || '0h 0m');
                
                totalExpected += expected;
                totalActual += actual;
            }
        });

        const efficiency = totalExpected > 0 ? (totalActual / totalExpected) * 100 : 0;
        return Math.min(100, this.roundToDecimal(efficiency, 1));
    }

    /**
     * Calculate punctuality score
     */
    calculatePunctuality(reportsData) {
        let totalDays = 0;
        let punctualDays = 0;

        reportsData.forEach(report => {
            if (report.estado === 'presente' || report.estado === 'tardanza') {
                totalDays++;
                
                if (report.entrada && report.horarioProgramadoInicio) {
                    const expectedMinutes = this.timeToMinutes(report.horarioProgramadoInicio);
                    const actualMinutes = this.timeToMinutes(report.entrada);
                    
                    if (actualMinutes <= expectedMinutes + this.config.toleranciaMinutos) {
                        punctualDays++;
                    }
                }
            }
        });

        return totalDays > 0 ? this.roundToDecimal((punctualDays / totalDays) * 100, 1) : 0;
    }

    /**
     * Calculate consistency score (variance in daily hours)
     */
    calculateConsistency(reportsData) {
        const dailyHours = [];
        const dailyData = new Map();

        // Group by day
        reportsData.forEach(report => {
            if (report.estado === 'presente' && report.horasValidas) {
                const hours = this.parseTimeToMinutes(report.horasValidas) / 60;
                dailyData.set(report.fecha, (dailyData.get(report.fecha) || 0) + hours);
            }
        });

        // Calculate variance
        const hours = Array.from(dailyData.values());
        if (hours.length < 2) return 100;

        const mean = hours.reduce((sum, h) => sum + h, 0) / hours.length;
        const variance = hours.reduce((sum, h) => sum + Math.pow(h - mean, 2), 0) / hours.length;
        const stdDev = Math.sqrt(variance);

        // Convert to consistency score (lower variance = higher consistency)
        const consistencyScore = Math.max(0, 100 - (stdDev * 20));
        return this.roundToDecimal(consistencyScore, 1);
    }

    /**
     * Analyze trends over time periods
     */
    analyzeTrends(reportsData) {
        const trends = {
            ultima_semana: this.calculatePeriodTrend(reportsData, 7),
            ultimo_mes: this.calculatePeriodTrend(reportsData, 30),
            ultimos_3_meses: this.calculatePeriodTrend(reportsData, 90)
        };

        return trends;
    }

    /**
     * Calculate trend for specific period
     */
    calculatePeriodTrend(reportsData, days) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const periodData = reportsData.filter(report => 
            this.parseDate(report.fecha) >= cutoffDate
        );

        const totalHours = this.calculateTotalHours(periodData);
        const workingDays = this.calculateWorkingDays(periodData);
        const efficiency = this.calculateEfficiency(periodData);

        // Calculate trend direction
        const firstHalf = periodData.slice(Math.floor(periodData.length / 2));
        const secondHalf = periodData.slice(0, Math.floor(periodData.length / 2));
        
        const firstHalfAvg = this.calculateDailyAverage(firstHalf);
        const secondHalfAvg = this.calculateDailyAverage(secondHalf);
        
        let trend = 'stable';
        const difference = secondHalfAvg - firstHalfAvg;
        
        if (Math.abs(difference) > 0.5) {
            trend = difference > 0 ? 'increasing' : 'decreasing';
        }

        return {
            totalHoras: totalHours,
            diasTrabajados: workingDays,
            promedioDiario: workingDays > 0 ? this.roundToDecimal(totalHours / workingDays, 2) : 0,
            eficiencia: efficiency,
            tendencia: trend,
            cambio: this.roundToDecimal(difference, 2)
        };
    }

    /**
     * Calculate monthly comparison
     */
    calculateMonthlyComparison(reportsData) {
        const monthlyData = new Map();

        reportsData.forEach(report => {
            const date = this.parseDate(report.fecha);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthlyData.has(monthKey)) {
                monthlyData.set(monthKey, []);
            }
            
            monthlyData.get(monthKey).push(report);
        });

        const comparison = Array.from(monthlyData.entries())
            .map(([month, reports]) => ({
                mes: month,
                horasTrabajadas: this.calculateTotalHours(reports),
                diasTrabajados: this.calculateWorkingDays(reports),
                promedioDiario: this.calculateDailyAverage(reports),
                eficiencia: this.calculateEfficiency(reports),
                puntualidad: this.calculatePunctuality(reports)
            }))
            .sort((a, b) => b.mes.localeCompare(a.mes))
            .slice(0, 6); // Last 6 months

        return comparison;
    }

    /**
     * Calculate future projections based on trends
     */
    calculateProjections(reportsData) {
        if (reportsData.length < 10) return null; // Need minimum data

        const recentData = reportsData.slice(0, 30); // Last 30 entries
        const avgDailyHours = this.calculateDailyAverage(recentData);
        const workingDaysPerMonth = this.config.diasHabilesMes;

        return {
            horasProyectadasMes: this.roundToDecimal(avgDailyHours * workingDaysPerMonth, 1),
            diasRequeridosCompletar: Math.ceil((this.currentStats.horasPendientes / avgDailyHours) || 0),
            fechaEstimadaCompleto: this.calculateCompletionDate(this.currentStats.horasPendientes, avgDailyHours)
        };
    }

    /**
     * Calculate Key Performance Indicators
     */
    calculateKPIs(reportsData, paymentsData) {
        const totalReports = reportsData.length;
        const presentDays = reportsData.filter(r => r.estado === 'presente').length;
        const lateDays = reportsData.filter(r => r.estado === 'tardanza').length;
        const absentDays = reportsData.filter(r => r.estado === 'ausente').length;

        return {
            asistencia: totalReports > 0 ? this.roundToDecimal((presentDays / totalReports) * 100, 1) : 0,
            puntualidad: this.currentStats.puntualidad,
            eficiencia: this.currentStats.eficiencia,
            consistencia: this.currentStats.consistencia,
            cumplimiento: this.calculateCompliance(reportsData),
            productividad: this.calculateProductivity(reportsData, paymentsData)
        };
    }

    /**
     * Calculate quality metrics
     */
    calculateQualityMetrics(reportsData) {
        let discrepancies = 0;
        let totalComparisons = 0;

        reportsData.forEach(report => {
            if (report.estado === 'presente') {
                // Check entry time discrepancy
                if (report.entrada && report.horarioProgramadoInicio) {
                    totalComparisons++;
                    if (this.hasTimeDiscrepancy(report.entrada, report.horarioProgramadoInicio)) {
                        discrepancies++;
                    }
                }

                // Check exit time discrepancy
                if (report.salida && report.horarioProgramadoFinal) {
                    totalComparisons++;
                    if (this.hasTimeDiscrepancy(report.salida, report.horarioProgramadoFinal)) {
                        discrepancies++;
                    }
                }
            }
        });

        return {
            precision: totalComparisons > 0 ? 
                this.roundToDecimal(((totalComparisons - discrepancies) / totalComparisons) * 100, 1) : 100,
            discrepancias: discrepancies,
            confiabilidad: this.calculateDataReliability(reportsData)
        };
    }

    /**
     * Render statistics cards in the UI
     */
    renderStatsCards() {
        const container = document.getElementById('statsContainer');
        if (!container) return;

        const stats = this.currentStats;
        const currentAdvisor = this.adminCore.getCurrentAdvisor();
        
        // Verificar si el asesor actual tiene servicio social
        const showServicioSocial = currentAdvisor && 
            this.adminCore.modules.search && 
            this.adminCore.modules.search.asesores.find(
                asesor => asesor.numeroCuenta === currentAdvisor.numeroCuenta && asesor.isServicioSocial
            );

        let cardsHTML = `
            ${this.createStatCard('hours-worked', 'Horas Trabajadas', stats.horasTrabajadas, 'h', 'bi-clock-fill', stats.tendencias?.ultimo_mes?.tendencia)}
            ${this.createStatCard('hours-pending', 'Horas Pendientes', stats.horasPendientes, 'h', 'bi-exclamation-triangle-fill', 'stable')}
            ${this.createStatCard('hours-paid', 'Horas Pagadas', stats.horasPagadas, 'h', 'bi-cash-coin', 'stable')}
        `;
        
        // Agregar panel de Servicio Social condicionalmente
        if (showServicioSocial && stats.servicioSocial) {
            cardsHTML += this.createStatCard(
                'servicio-social', 
                'Horas de SS', 
                stats.servicioSocial.ajustesHoras, 
                'h', 
                'bi-mortarboard-fill', 
                'stable'
            );
        }
        
        cardsHTML += `
            ${this.createStatCard('performance', 'Eficiencia', stats.eficiencia, '%', 'bi-speedometer2', 'stable')}
            ${this.createStatCard('attendance', 'Días Trabajados', stats.diasTrabajados, '', 'bi-calendar-event-fill', stats.tendencias?.ultimo_mes?.tendencia)}
        `;

        container.innerHTML = cardsHTML;

        // Animate values
        this.animateStatValues();
    }

    /**
     * Create individual stat card HTML
     */
    createStatCard(type, label, value, unit, icon, trend) {
        const trendClass = trend === 'increasing' ? 'positive' : trend === 'decreasing' ? 'negative' : 'neutral';
        const trendIcon = trend === 'increasing' ? 'bi-arrow-up' : trend === 'decreasing' ? 'bi-arrow-down' : 'bi-dash';
        
        // Clase CSS específica para Servicio Social
        const cardClass = type === 'servicio-social' ? 'servicio-social' : type;
        
        return `
            <div class="stat-card ${cardClass}">
                <div class="stat-header">
                    <div class="stat-icon">
                        <i class="${icon}"></i>
                    </div>
                    <div class="stat-menu">
                        <button class="stat-menu-btn">
                            <i class="bi bi-three-dots"></i>
                        </button>
                    </div>
                </div>
                
                <div class="stat-value-section">
                    <div class="stat-value" data-value="${value}">
                        0<span class="stat-unit">${unit}</span>
                    </div>
                    <div class="stat-label">${label}</div>
                </div>
                
                <div class="stat-change ${trendClass}">
                    <i class="${trendIcon}"></i>
                    <span>${trend === 'stable' ? 'Sin cambios' : trend === 'increasing' ? 'En aumento' : 'En descenso'}</span>
                </div>
                
                <div class="stat-progress">
                    <div class="stat-progress-bar" style="width: ${this.calculateProgressWidth(type, value)}%"></div>
                </div>
                
                <div class="stat-chart">
                    <div class="stat-chart-placeholder">
                        Gráfica ${label}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Animate stat values with smooth counting
     */
    animateStatValues() {
        const statValues = document.querySelectorAll('.stat-value[data-value]');
        
        statValues.forEach(element => {
            const targetValue = parseFloat(element.dataset.value);
            const unit = element.querySelector('.stat-unit')?.textContent || '';
            
            this.animateCountUp(element, 0, targetValue, 1500, unit);
        });
    }

    /**
     * Count-up animation for numbers
     */
    animateCountUp(element, start, end, duration, unit) {
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = start + (end - start) * easeOut;
            
            const displayValue = unit === '%' ? 
                Math.round(current) : 
                this.roundToDecimal(current, 1);
            
            element.innerHTML = `${displayValue}<span class="stat-unit">${unit}</span>`;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    /**
     * Calculate progress bar width based on type and value
     */
    calculateProgressWidth(type, value) {
        switch (type) {
            case 'performance':
                return Math.min(100, value);
            case 'hours-worked':
                return Math.min(100, (value / 160) * 100);
            case 'hours-pending':
                return Math.min(100, (value / 40) * 100);
            case 'servicio-social':
                return Math.min(100, (value / 480) * 100);
            case 'attendance':
                return Math.min(100, (value / this.config.diasHabilesMes) * 100);
            default:
                return Math.min(100, (value / 100) * 100);
        }
    }

    /**
     * Utility methods
     */
    parseDate(dateStr) {
        if (!dateStr) return new Date();
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
    }

    timeToMinutes(timeStr) {
        if (!timeStr) return 0;
        const [hours, minutes] = timeStr.split(':').map(Number);
        return (hours * 60) + (minutes || 0);
    }

    hasTimeDiscrepancy(actual, expected, tolerance = 15) {
        const actualMinutes = this.timeToMinutes(actual);
        const expectedMinutes = this.timeToMinutes(expected);
        return Math.abs(actualMinutes - expectedMinutes) > tolerance;
    }

    calculateCompliance(reportsData) {
        const totalDays = reportsData.length;
        const compliantDays = reportsData.filter(report => {
            return report.estado === 'presente' && 
                   !this.hasTimeDiscrepancy(report.entrada, report.horarioProgramadoInicio) &&
                   !this.hasTimeDiscrepancy(report.salida, report.horarioProgramadoFinal);
        }).length;
        
        return totalDays > 0 ? this.roundToDecimal((compliantDays / totalDays) * 100, 1) : 0;
    }

    calculateProductivity(reportsData, paymentsData) {
        const totalWorkedHours = this.calculateTotalHours(reportsData);
        const totalPaidHours = this.calculatePaidHours(paymentsData);
        
        return totalPaidHours > 0 ? this.roundToDecimal((totalWorkedHours / totalPaidHours) * 100, 1) : 0;
    }

    calculateDataReliability(reportsData) {
        const totalReports = reportsData.length;
        const completeReports = reportsData.filter(report => 
            report.fecha && report.estado && 
            (report.estado === 'ausente' || (report.entrada && report.salida))
        ).length;
        
        return totalReports > 0 ? this.roundToDecimal((completeReports / totalReports) * 100, 1) : 0;
    }

    calculateCompletionDate(pendingHours, avgDailyHours) {
        if (avgDailyHours <= 0) return null;
        
        const daysNeeded = Math.ceil(pendingHours / avgDailyHours);
        const completionDate = new Date();
        completionDate.setDate(completionDate.getDate() + daysNeeded);
        
        return completionDate.toLocaleDateString('es-MX');
    }

    roundToDecimal(value, decimals) {
        return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
    }

    /**
     * Render error state
     */
    renderErrorState() {
        const container = document.getElementById('statsContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="stats-empty">
                <div class="stats-empty-icon">
                    <i class="bi bi-exclamation-triangle"></i>
                </div>
                <h4>Error al cargar estadísticas</h4>
                <p>No se pudieron calcular las métricas del asesor</p>
            </div>
        `;
    }

    /**
     * Get current stats for export
     */
    getCurrentStats() {
        return { ...this.currentStats };
    }

    /**
     * Clear all data
     */
    clearData() {
        this.currentStats = {
            horasTrabajadas: 0,
            horasPendientes: 0,
            horasPagadas: 0,
            diasTrabajados: 0,
            promedioDiario: 0,
            eficiencia: 0,
            tendencias: {},
            comparativoMensual: []
        };

        this.timeSeriesData.clear();
        this.aggregatedData.clear();
        this.comparisonData.clear();
        
        const container = document.getElementById('statsContainer');
        if (container) {
            container.innerHTML = '';
        }
    }

    /**
     * Load servicio social hours data
     */
    async loadServicioSocialHours(numeroCuenta) {
        try {
            const asesorId = `asesor_${numeroCuenta}`;
            
            const servicioSocialSnapshot = await this.db.collection('serviciosocial')
                .where('asesorId', '==', asesorId)
                .limit(1)
                .get();
            
            if (!servicioSocialSnapshot.empty) {
                const doc = servicioSocialSnapshot.docs[0];
                const data = doc.data();
                return {
                    ajustesHoras: data.ajustesHoras || 0,
                    hasData: true
                };
            }
            
            return {
                ajustesHoras: 0,
                hasData: false
            };
            
        } catch (error) {
            console.error('Error loading servicio social hours:', error);
            return {
                ajustesHoras: 0,
                hasData: false
            };
        }
    }

    /**
     * Export stats data
     */
    exportData() {
        const statsData = [
            ['Métrica', 'Valor', 'Unidad'],
            ['Horas Trabajadas', this.currentStats.horasTrabajadas, 'horas'],
            ['Horas Pendientes', this.currentStats.horasPendientes, 'horas'],
            ['Horas Pagadas', this.currentStats.horasPagadas, 'horas'],
            ['Días Trabajados', this.currentStats.diasTrabajados, 'días'],
            ['Promedio Diario', this.currentStats.promedioDiario, 'horas/día'],
            ['Eficiencia', this.currentStats.eficiencia, '%'],
            ['Puntualidad', this.currentStats.puntualidad || 0, '%'],
            ['Consistencia', this.currentStats.consistencia || 0, '%']
        ];

        return this.adminCore.generateCSV(statsData, 'estadisticas_detalladas');
    }

    /**
     * Get time series data for charts (future expansion)
     */
    getTimeSeriesData(metric, period = 30) {
        // This will be expanded for chart integration
        return this.timeSeriesData.get(`${metric}_${period}`) || [];
    }

    /**
     * Get comparison data for benchmarking (future expansion)
     */
    getComparisonData(metric) {
        return this.comparisonData.get(metric) || {};
    }

    /**
     * Advanced analytics method (ready for expansion)
     */
    async performAdvancedAnalysis(numeroCuenta) {
        // Placeholder for ML/AI analytics
        // Future features: anomaly detection, predictive modeling, pattern recognition
        console.log('Advanced analytics ready for implementation');
        return {
            anomalies: [],
            predictions: {},
            patterns: {},
            recommendations: []
        };
    }

    /**
     * Real-time metrics update (future WebSocket integration)
     */
    enableRealTimeUpdates() {
        // Placeholder for real-time data streaming
        console.log('Real-time updates ready for WebSocket integration');
    }

    /**
     * Cleanup method
     */
    cleanup() {
        this.clearData();
        
        // Clear any intervals or timeouts
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

// Export for global access
window.StatsManager = StatsManager;