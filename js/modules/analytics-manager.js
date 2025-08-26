/**
 * =================================================================
 * ANALYTICS MANAGER - Advanced Analytics & Data Intelligence
 * Archivo: analytics-manager.js (Módulo de análisis avanzado)
 * =================================================================
 */

class AnalyticsManager {
    constructor(adminCore) {
        this.adminCore = adminCore;
        this.db = adminCore.db;
        
        // Data structures for analytics
        this.rawData = {
            reports: [],
            payments: [],
            combined: []
        };
        
        this.processedData = {
            timeSeriesData: new Map(),
            patterns: new Map(),
            correlations: new Map(),
            anomalies: [],
            insights: []
        };
        
        this.chartInstances = new Map();
        this.analysisConfig = {
            analysisWindowDays: 90,
            anomalyThreshold: 2,
            trendSmoothingFactor: 0.3,
            correlationThreshold: 0.7,
            minDataPointsForAnalysis: 10
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
        console.log('📈 AnalyticsManager initialized - Advanced Analysis Ready');
    }

    setupEventListeners() {
        // Analysis type selector
        const analysisTypeSelect = document.getElementById('analysisTypeSelect');
        if (analysisTypeSelect) {
            analysisTypeSelect.addEventListener('change', (e) => {
                this.switchAnalysisType(e.target.value);
            });
        }

        // Time period selector
        const periodSelect = document.getElementById('analysisPeriodSelect');
        if (periodSelect) {
            periodSelect.addEventListener('change', (e) => {
                this.updateAnalysisPeriod(parseInt(e.target.value));
            });
        }

        // Export analytics button
        const exportBtn = document.getElementById('analyticsExportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportAnalytics();
            });
        }

        // Refresh analytics button
        const refreshBtn = document.getElementById('analyticsRefreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshAnalytics();
            });
        }
    }

    /**
     * Load and process analytics data
     */
    async loadData() {
        const currentAdvisor = this.adminCore.getCurrentAdvisor();
        if (!currentAdvisor) return;

        try {
            this.showLoadingState(true);

            await this.loadRawData(currentAdvisor.numeroCuenta);
            await this.processDataForAnalytics();
            await this.generateInsights();
            this.renderAnalyticsInterface();

            console.log('📊 Analytics data processed and ready');

        } catch (error) {
            console.error('Error loading analytics:', error);
            this.showErrorState();
        } finally {
            this.showLoadingState(false);
        }
    }

    /**
     * Load raw data from multiple sources
     */
    async loadRawData(numeroCuenta) {
        // Load reports data
        const reportsSnapshot = await this.db.collection('reportesasesores')
            .where('numeroCuenta', '==', numeroCuenta)
            .orderBy('fecha', 'desc')
            .limit(200)
            .get();

        this.rawData.reports = reportsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: this.parseDate(doc.data().fecha),
            type: 'report'
        }));

        // Load payments data
        const paymentsSnapshot = await this.db.collection('pago_horas')
            .where('numeroCuenta', '==', numeroCuenta)
            .orderBy('fecha', 'desc')
            .limit(100)
            .get();

        this.rawData.payments = paymentsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: this.parseDate(doc.data().fecha),
            type: 'payment'
        }));

        this.rawData.combined = [...this.rawData.reports, ...this.rawData.payments]
            .sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * Process raw data into analytics-ready format
     */
    async processDataForAnalytics() {
        this.createTimeSeriesData();
        this.detectPatterns();
        this.findCorrelations();
        this.detectAnomalies();
        this.calculateAdvancedMetrics();
    }

    /**
     * Create time series data for various metrics
     */
    createTimeSeriesData() {
        const dailyMetrics = new Map();

        this.rawData.reports.forEach(report => {
            const dayKey = report.fecha;

            if (!dailyMetrics.has(dayKey)) {
                dailyMetrics.set(dayKey, {
                    date: dayKey,
                    horasTrabajadas: 0,
                    diasTrabajados: 0,
                    tardanzas: 0,
                    ausencias: 0,
                    eficiencia: 0,
                    puntualidad: 100
                });
            }

            const dailyData = dailyMetrics.get(dayKey);
            
            if (report.estado === 'presente') {
                dailyData.horasTrabajadas += this.parseTimeToMinutes(report.horasValidas || '0h 0m') / 60;
                dailyData.diasTrabajados = 1;
            } else if (report.estado === 'tardanza') {
                dailyData.tardanzas += 1;
                dailyData.horasTrabajadas += this.parseTimeToMinutes(report.horasValidas || '0h 0m') / 60;
                dailyData.diasTrabajados = 1;
                dailyData.puntualidad = Math.max(0, dailyData.puntualidad - 25);
            } else if (report.estado === 'ausente') {
                dailyData.ausencias += 1;
            }

            if (report.entrada && report.horarioProgramadoInicio) {
                const delay = this.calculateDelay(report.entrada, report.horarioProgramadoInicio);
                if (delay > 15) {
                    dailyData.puntualidad = Math.max(0, dailyData.puntualidad - 15);
                }
            }
        });

        // Calculate efficiency
        dailyMetrics.forEach((data) => {
            if (data.diasTrabajados > 0) {
                data.eficiencia = Math.min(100, (data.horasTrabajadas / 8) * 100);
            }
        });

        this.processedData.timeSeriesData.set('daily', Array.from(dailyMetrics.values()));
        this.processedData.timeSeriesData.set('weekly', this.aggregateToWeekly(dailyMetrics));
        this.processedData.timeSeriesData.set('monthly', this.aggregateToMonthly(dailyMetrics));
    }

    /**
     * Detect patterns in the data
     */
    detectPatterns() {
        const patterns = new Map();
        const dailyData = this.processedData.timeSeriesData.get('daily') || [];

        if (dailyData.length < this.analysisConfig.minDataPointsForAnalysis) return;

        // Weekly patterns
        const dayOfWeekData = new Array(7).fill(0).map(() => ({ total: 0, count: 0, avg: 0 }));
        dailyData.forEach(data => {
            const date = new Date(data.date);
            const dayOfWeek = date.getDay();
            if (data.diasTrabajados > 0) {
                dayOfWeekData[dayOfWeek].total += data.horasTrabajadas;
                dayOfWeekData[dayOfWeek].count += 1;
            }
        });

        dayOfWeekData.forEach((data) => {
            data.avg = data.count > 0 ? data.total / data.count : 0;
        });

        patterns.set('weeklyPattern', {
            type: 'weekly',
            data: dayOfWeekData,
            insight: this.analyzeWeeklyPattern(dayOfWeekData)
        });

        // Trend analysis
        const hoursData = dailyData.filter(d => d.diasTrabajados > 0).map(d => d.horasTrabajadas);
        const trendAnalysis = this.calculateTrend(hoursData);
        patterns.set('hoursWorkedTrend', {
            type: 'trend',
            metric: 'horasTrabajadas',
            trend: trendAnalysis.trend,
            strength: trendAnalysis.strength,
            insight: this.interpretTrend('Horas Trabajadas', trendAnalysis)
        });

        const efficiencyData = dailyData.filter(d => d.diasTrabajados > 0).map(d => d.eficiencia);
        const efficiencyTrend = this.calculateTrend(efficiencyData);
        patterns.set('efficiencyTrend', {
            type: 'trend',
            metric: 'eficiencia',
            trend: efficiencyTrend.trend,
            strength: efficiencyTrend.strength,
            insight: this.interpretTrend('Eficiencia', efficiencyTrend)
        });

        this.processedData.patterns = patterns;
    }

    /**
     * Find correlations between different metrics
     */
    findCorrelations() {
        const correlations = new Map();
        const dailyData = this.processedData.timeSeriesData.get('daily') || [];
        const workingDays = dailyData.filter(d => d.diasTrabajados > 0);

        if (workingDays.length < this.analysisConfig.minDataPointsForAnalysis) return;

        const hoursWorked = workingDays.map(d => d.horasTrabajadas);
        const efficiency = workingDays.map(d => d.eficiencia);
        const punctuality = workingDays.map(d => d.puntualidad);

        // Hours vs Efficiency correlation
        const hoursEfficiencyCorr = this.calculateCorrelation(hoursWorked, efficiency);
        if (Math.abs(hoursEfficiencyCorr) > this.analysisConfig.correlationThreshold) {
            correlations.set('hoursEfficiency', {
                metrics: ['Horas Trabajadas', 'Eficiencia'],
                correlation: hoursEfficiencyCorr,
                strength: this.interpretCorrelationStrength(hoursEfficiencyCorr),
                insight: this.interpretCorrelation('horas trabajadas', 'eficiencia', hoursEfficiencyCorr)
            });
        }

        // Punctuality vs Hours correlation
        const punctualityHoursCorr = this.calculateCorrelation(punctuality, hoursWorked);
        if (Math.abs(punctualityHoursCorr) > this.analysisConfig.correlationThreshold) {
            correlations.set('punctualityHours', {
                metrics: ['Puntualidad', 'Horas Trabajadas'],
                correlation: punctualityHoursCorr,
                strength: this.interpretCorrelationStrength(punctualityHoursCorr),
                insight: this.interpretCorrelation('puntualidad', 'horas trabajadas', punctualityHoursCorr)
            });
        }

        this.processedData.correlations = correlations;
    }

    /**
     * Detect anomalies in the data
     */
    detectAnomalies() {
        const anomalies = [];
        const dailyData = this.processedData.timeSeriesData.get('daily') || [];
        const workingDays = dailyData.filter(d => d.diasTrabajados > 0);

        if (workingDays.length < this.analysisConfig.minDataPointsForAnalysis) return;

        // Hours worked anomalies
        const hoursWorked = workingDays.map(d => d.horasTrabajadas);
        const hoursStats = this.calculateStatistics(hoursWorked);
        
        workingDays.forEach((data) => {
            const zScore = Math.abs((data.horasTrabajadas - hoursStats.mean) / hoursStats.stdDev);
            
            if (zScore > this.analysisConfig.anomalyThreshold) {
                anomalies.push({
                    date: data.date,
                    metric: 'horasTrabajadas',
                    value: data.horasTrabajadas,
                    expected: hoursStats.mean,
                    severity: this.getAnomalySeverity(zScore),
                    type: data.horasTrabajadas > hoursStats.mean ? 'high' : 'low',
                    insight: this.interpretAnomaly('horas trabajadas', data.horasTrabajadas, hoursStats.mean, zScore)
                });
            }
        });

        // Efficiency anomalies
        const efficiency = workingDays.map(d => d.eficiencia);
        const efficiencyStats = this.calculateStatistics(efficiency);
        
        workingDays.forEach((data) => {
            const zScore = Math.abs((data.eficiencia - efficiencyStats.mean) / efficiencyStats.stdDev);
            
            if (zScore > this.analysisConfig.anomalyThreshold) {
                anomalies.push({
                    date: data.date,
                    metric: 'eficiencia',
                    value: data.eficiencia,
                    expected: efficiencyStats.mean,
                    severity: this.getAnomalySeverity(zScore),
                    type: data.eficiencia > efficiencyStats.mean ? 'high' : 'low',
                    insight: this.interpretAnomaly('eficiencia', data.eficiencia, efficiencyStats.mean, zScore)
                });
            }
        });

        this.processedData.anomalies = anomalies;
    }

    /**
     * Calculate advanced performance metrics
     */
    calculateAdvancedMetrics() {
        const dailyData = this.processedData.timeSeriesData.get('daily') || [];
        const workingDays = dailyData.filter(d => d.diasTrabajados > 0);
        
        if (workingDays.length === 0) return;

        const metrics = {
            consistency: this.calculateConsistency(workingDays),
            productivity: this.calculateProductivity(workingDays),
            reliability: this.calculateReliability(workingDays),
            improvement: this.calculateImprovement(workingDays)
        };

        this.processedData.advancedMetrics = metrics;
    }

    /**
     * Generate insights from processed data
     */
    async generateInsights() {
        const insights = [];
        
        // Pattern insights
        this.processedData.patterns.forEach((pattern) => {
            if (pattern.insight) {
                insights.push({
                    type: 'pattern',
                    category: pattern.type,
                    title: pattern.insight.title,
                    description: pattern.insight.description,
                    severity: pattern.insight.severity || 'info',
                    actionable: pattern.insight.actionable || false
                });
            }
        });

        // Correlation insights
        this.processedData.correlations.forEach((correlation) => {
            insights.push({
                type: 'correlation',
                category: 'relationship',
                title: `Correlación ${correlation.strength}`,
                description: correlation.insight,
                severity: 'info',
                actionable: true
            });
        });

        // Anomaly insights (recent ones)
        const recentAnomalies = this.processedData.anomalies
            .filter(a => this.isRecentDate(a.date, 30))
            .slice(0, 5);

        recentAnomalies.forEach(anomaly => {
            insights.push({
                type: 'anomaly',
                category: anomaly.type,
                title: `Anomalía en ${anomaly.metric}`,
                description: anomaly.insight,
                severity: anomaly.severity,
                actionable: true,
                date: anomaly.date
            });
        });

        // Performance insights
        const performanceInsight = this.generatePerformanceInsight();
        if (performanceInsight) {
            insights.push(performanceInsight);
        }

        this.processedData.insights = insights.sort((a, b) => {
            const severityOrder = { critical: 3, warning: 2, info: 1 };
            return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
        });
    }

    /**
     * Render the complete analytics interface
     */
    renderAnalyticsInterface() {
        const container = document.getElementById('analyticsContainer');
        if (!container) return;

        const interfaceHTML = `
            <div class="analytics-interface">
                ${this.renderAnalyticsControls()}
                ${this.renderInsightsPanel()}
                ${this.renderChartsSection()}
                ${this.renderAnomaliesSection()}
            </div>
        `;

        container.innerHTML = interfaceHTML;
        this.attachAnalyticsEventListeners();
        this.renderCharts();
    }

    /**
     * Render analytics controls
     */
    renderAnalyticsControls() {
        return `
            <div class="analytics-controls">
                <div class="control-row filters-row">
                    <div class="control-group filter-group">
                        <label for="analysisTypeSelect">Tipo de Análisis:</label>
                        <select id="analysisTypeSelect" class="form-select">
                            <option value="overview">Vista General</option>
                            <option value="trends">Análisis de Tendencias</option>
                            <option value="patterns">Patrones de Comportamiento</option>
                            <option value="performance">Análisis de Rendimiento</option>
                        </select>
                    </div>
                    
                    <div class="control-group filter-group">
                        <label for="analysisPeriodSelect">Período:</label>
                        <select id="analysisPeriodSelect" class="form-select">
                            <option value="30">Últimos 30 días</option>
                            <option value="60">Últimos 60 días</option>
                            <option value="90" selected>Últimos 90 días</option>
                            <option value="180">Últimos 6 meses</option>
                        </select>
                    </div>
                    
                    <div class="filter-actions">
                        <button id="analyticsRefreshBtn" class="btn btn-primary">
                            <i class="bi bi-arrow-clockwise"></i>
                            Actualizar
                        </button>
                        <button id="analyticsExportBtn" class="btn btn-outline-primary">
                            <i class="bi bi-download"></i>
                            Exportar Análisis
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render insights panel
     */
    renderInsightsPanel() {
        if (!this.processedData.insights || this.processedData.insights.length === 0) {
            return `
                <div class="insights-panel card-base">
                    <div class="card-header">
                        <h3 class="card-title">
                            <i class="bi bi-lightbulb"></i>
                            Insights Inteligentes
                        </h3>
                    </div>
                    <div class="no-insights empty-state">
                        <div class="empty-icon">
                            <i class="bi bi-lightbulb"></i>
                        </div>
                        <h3>Generando Insights</h3>
                        <p>Necesitamos más datos para generar insights significativos.</p>
                    </div>
                </div>
            `;
        }

        return `
            <div class="insights-panel card-base">
                <div class="card-header">
                    <h3 class="card-title">
                        <i class="bi bi-lightbulb"></i>
                        Insights Inteligentes
                        <span class="insights-count table-count">${this.processedData.insights.length}</span>
                    </h3>
                </div>
                
                <div class="insights-grid">
                    ${this.processedData.insights.slice(0, 6).map(insight => `
                        <div class="insight-card ${insight.severity}">
                            <div class="insight-header">
                                <div class="insight-icon">
                                    ${this.getInsightIcon(insight.type, insight.severity)}
                                </div>
                                <div class="insight-meta">
                                    <span class="insight-type">${insight.category}</span>
                                    ${insight.date ? `<span class="insight-date">${this.formatDate(insight.date)}</span>` : ''}
                                </div>
                            </div>
                            <div class="insight-content">
                                <h4>${insight.title}</h4>
                                <p>${insight.description}</p>
                                ${insight.actionable ? '<div class="insight-badge">Accionable</div>' : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Render charts section
     */
    renderChartsSection() {
        return `
            <div class="charts-section card-base">
                <div class="card-header">
                    <h3 class="card-title">
                        <i class="bi bi-bar-chart-line"></i>
                        Visualizaciones
                    </h3>
                </div>
                
                <div class="charts-grid">
                    <div class="chart-container">
                        <div class="chart-header">
                            <h4>Tendencia de Horas Trabajadas</h4>
                        </div>
                        <div class="chart-placeholder" id="hoursChart">
                            <i class="bi bi-graph-up"></i>
                            <p>Gráfico de tendencias listo para integración</p>
                        </div>
                    </div>
                    
                    <div class="chart-container">
                        <div class="chart-header">
                            <h4>Patrón Semanal</h4>
                        </div>
                        <div class="chart-placeholder" id="weeklyChart">
                            <i class="bi bi-calendar-week"></i>
                            <p>Patrón de días de la semana</p>
                        </div>
                    </div>
                    
                    <div class="chart-container">
                        <div class="chart-header">
                            <h4>Análisis de Eficiencia</h4>
                        </div>
                        <div class="chart-placeholder" id="efficiencyChart">
                            <i class="bi bi-speedometer2"></i>
                            <p>Métricas de rendimiento</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render anomalies section
     */
    renderAnomaliesSection() {
        if (!this.processedData.anomalies || this.processedData.anomalies.length === 0) {
            return '';
        }

        return `
            <div class="anomalies-section card-base">
                <div class="card-header">
                    <h3 class="card-title">
                        <i class="bi bi-exclamation-triangle"></i>
                        Anomalías Detectadas
                        <span class="table-count">${this.processedData.anomalies.length}</span>
                    </h3>
                </div>
                
                <div class="anomalies-list">
                    ${this.processedData.anomalies.slice(0, 5).map(anomaly => `
                        <div class="anomaly-item ${anomaly.severity}">
                            <div class="anomaly-date">${this.formatDate(anomaly.date)}</div>
                            <div class="anomaly-content">
                                <h4>${anomaly.metric}</h4>
                                <p>Valor: ${this.roundToDecimal(anomaly.value, 2)} (Esperado: ${this.roundToDecimal(anomaly.expected, 2)})</p>
                                <p>${anomaly.insight}</p>
                            </div>
                            <div class="anomaly-type ${anomaly.type}">
                                ${anomaly.type === 'high' ? '↗️' : '↘️'}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Utility and calculation methods
     */
    calculateCorrelation(x, y) {
        const n = Math.min(x.length, y.length);
        if (n < 2) return 0;

        const meanX = x.slice(0, n).reduce((a, b) => a + b) / n;
        const meanY = y.slice(0, n).reduce((a, b) => a + b) / n;

        let numerator = 0;
        let sumXSquared = 0;
        let sumYSquared = 0;

        for (let i = 0; i < n; i++) {
            const deltaX = x[i] - meanX;
            const deltaY = y[i] - meanY;
            numerator += deltaX * deltaY;
            sumXSquared += deltaX * deltaX;
            sumYSquared += deltaY * deltaY;
        }

        const denominator = Math.sqrt(sumXSquared * sumYSquared);
        return denominator === 0 ? 0 : numerator / denominator;
    }

    calculateTrend(data) {
        if (data.length < 3) return { trend: 'stable', strength: 0 };

        const n = data.length;
        const x = Array.from({ length: n }, (_, i) => i);
        const correlation = this.calculateCorrelation(x, data);
        
        return {
            trend: correlation > 0.1 ? 'increasing' : correlation < -0.1 ? 'decreasing' : 'stable',
            strength: Math.abs(correlation)
        };
    }

    calculateStatistics(data) {
        if (data.length === 0) return { mean: 0, stdDev: 0, min: 0, max: 0 };

        const mean = data.reduce((a, b) => a + b) / data.length;
        const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / data.length;
        const stdDev = Math.sqrt(variance);

        return {
            mean,
            stdDev,
            min: Math.min(...data),
            max: Math.max(...data)
        };
    }

    // More utility methods
    parseDate(dateStr) {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
    }

    parseTimeToMinutes(timeStr) {
        if (!timeStr) return 0;
        const horasMatch = timeStr.match(/(\d+)h/);
        const minutosMatch = timeStr.match(/(\d+)m/);
        const horas = horasMatch ? parseInt(horasMatch[1]) : 0;
        const minutos = minutosMatch ? parseInt(minutosMatch[1]) : 0;
        return (horas * 60) + minutos;
    }

    formatDate(dateStr) {
        try {
            const date = this.parseDate(dateStr);
            return date.toLocaleDateString('es-MX', {
                day: '2-digit',
                month: 'short'
            });
        } catch {
            return dateStr;
        }
    }

    roundToDecimal(value, decimals) {
        return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
    }

    getInsightIcon(type, severity) {
        const icons = {
            pattern: 'bi-graph-up-arrow',
            correlation: 'bi-diagram-3',
            anomaly: 'bi-exclamation-triangle',
            performance: 'bi-speedometer2'
        };
        return `<i class="bi ${icons[type] || 'bi-info-circle'}"></i>`;
    }

    // Placeholder implementations for complex analysis methods
    analyzeWeeklyPattern(data) {
        const bestDay = data.reduce((max, current, index) => 
            current.avg > data[max].avg ? index : max, 0);
        
        const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        
        return {
            title: "Patrón semanal identificado",
            description: `El mejor rendimiento se observa los ${dayNames[bestDay]}`,
            severity: 'info',
            actionable: true
        };
    }

    interpretTrend(metric, trend) {
        return {
            title: `Tendencia ${trend.trend} en ${metric}`,
            description: `Se observa una tendencia ${trend.trend} con fuerza ${Math.round(trend.strength * 100)}%`,
            severity: trend.strength > 0.7 ? 'warning' : 'info',
            actionable: trend.strength > 0.5
        };
    }

    interpretCorrelation(metric1, metric2, correlation) {
        const strength = Math.abs(correlation);
        const direction = correlation > 0 ? 'positiva' : 'negativa';
        return `Existe una correlación ${direction} fuerte entre ${metric1} y ${metric2} (${Math.round(strength * 100)}%)`;
    }

    interpretCorrelationStrength(correlation) {
        const abs = Math.abs(correlation);
        if (abs > 0.8) return 'muy fuerte';
        if (abs > 0.6) return 'fuerte';
        if (abs > 0.4) return 'moderada';
        return 'débil';
    }

    interpretAnomaly(metric, value, expected, zScore) {
        const deviation = ((value - expected) / expected * 100).toFixed(1);
        return `${metric} mostró un valor ${value > expected ? 'superior' : 'inferior'} al esperado en ${Math.abs(deviation)}%`;
    }

    getAnomalySeverity(zScore) {
        if (zScore > 3) return 'critical';
        if (zScore > 2.5) return 'warning';
        return 'info';
    }

    calculateDelay(actualTime, expectedTime) {
        const actual = this.timeToMinutes(actualTime);
        const expected = this.timeToMinutes(expectedTime);
        return actual - expected;
    }

    timeToMinutes(timeStr) {
        if (!timeStr) return 0;
        const [hours, minutes] = timeStr.split(':').map(Number);
        return (hours * 60) + (minutes || 0);
    }

    calculateConsistency(workingDays) {
        const hours = workingDays.map(d => d.horasTrabajadas);
        if (hours.length < 2) return 100;

        const stats = this.calculateStatistics(hours);
        const cv = stats.stdDev / stats.mean;
        return Math.max(0, 100 - (cv * 100));
    }

    calculateProductivity(workingDays) {
        const totalHours = workingDays.reduce((sum, d) => sum + d.horasTrabajadas, 0);
        const expectedHours = workingDays.length * 8;
        return expectedHours > 0 ? (totalHours / expectedHours) * 100 : 0;
    }

    calculateReliability(workingDays) {
        const punctualDays = workingDays.filter(d => d.puntualidad >= 90).length;
        return workingDays.length > 0 ? (punctualDays / workingDays.length) * 100 : 0;
    }

    calculateImprovement(workingDays) {
        if (workingDays.length < 10) return 0;
        
        const mid = Math.floor(workingDays.length / 2);
        const firstHalf = workingDays.slice(0, mid);
        const secondHalf = workingDays.slice(mid);
        
        const firstAvg = firstHalf.reduce((sum, d) => sum + d.eficiencia, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, d) => sum + d.eficiencia, 0) / secondHalf.length;
        
        return ((secondAvg - firstAvg) / firstAvg) * 100;
    }

    generatePerformanceInsight() {
        const metrics = this.processedData.advancedMetrics;
        if (!metrics) return null;

        if (metrics.consistency > 80 && metrics.productivity > 90) {
            return {
                type: 'performance',
                category: 'excellence',
                title: 'Rendimiento Excelente',
                description: 'El asesor mantiene alta consistencia y productividad',
                severity: 'info',
                actionable: false
            };
        }

        if (metrics.consistency < 60) {
            return {
                type: 'performance',
                category: 'improvement',
                title: 'Inconsistencia Detectada',
                description: 'Se observan variaciones significativas en el rendimiento diario',
                severity: 'warning',
                actionable: true
            };
        }

        return null;
    }

    isRecentDate(dateStr, days) {
        const date = this.parseDate(dateStr);
        const now = new Date();
        const diffTime = now - date;
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        return diffDays <= days;
    }

    aggregateToWeekly(dailyMetrics) {
        const weeklyData = new Map();
        
        dailyMetrics.forEach((data, date) => {
            const dateObj = this.parseDate(date);
            const weekKey = this.getWeekKey(dateObj);
            
            if (!weeklyData.has(weekKey)) {
                weeklyData.set(weekKey, {
                    week: weekKey,
                    horasTrabajadas: 0,
                    diasTrabajados: 0,
                    tardanzas: 0,
                    ausencias: 0,
                    eficiencia: 0,
                    puntualidad: 0
                });
            }
            
            const weekData = weeklyData.get(weekKey);
            weekData.horasTrabajadas += data.horasTrabajadas;
            weekData.diasTrabajados += data.diasTrabajados;
            weekData.tardanzas += data.tardanzas;
            weekData.ausencias += data.ausencias;
        });
        
        // Calculate averages
        weeklyData.forEach(data => {
            if (data.diasTrabajados > 0) {
                data.eficiencia = (data.horasTrabajadas / (data.diasTrabajados * 8)) * 100;
                data.puntualidad = Math.max(0, 100 - (data.tardanzas * 20));
            }
        });
        
        return Array.from(weeklyData.values());
    }

    aggregateToMonthly(dailyMetrics) {
        const monthlyData = new Map();
        
        dailyMetrics.forEach((data, date) => {
            const monthKey = date.substring(0, 7);
            
            if (!monthlyData.has(monthKey)) {
                monthlyData.set(monthKey, {
                    month: monthKey,
                    horasTrabajadas: 0,
                    diasTrabajados: 0,
                    tardanzas: 0,
                    ausencias: 0,
                    eficiencia: 0,
                    puntualidad: 0
                });
            }
            
            const monthData = monthlyData.get(monthKey);
            monthData.horasTrabajadas += data.horasTrabajadas;
            monthData.diasTrabajados += data.diasTrabajados;
            monthData.tardanzas += data.tardanzas;
            monthData.ausencias += data.ausencias;
        });
        
        // Calculate averages
        monthlyData.forEach(data => {
            if (data.diasTrabajados > 0) {
                data.eficiencia = (data.horasTrabajadas / (data.diasTrabajados * 8)) * 100;
                data.puntualidad = Math.max(0, 100 - (data.tardanzas * 15));
            }
        });
        
        return Array.from(monthlyData.values());
    }

    getWeekKey(date) {
        const year = date.getFullYear();
        const week = this.getWeekNumber(date);
        return `${year}-W${week.toString().padStart(2, '0')}`;
    }

    getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    // Interface interaction methods
    switchAnalysisType(type) {
        // Switch between different analysis views
        console.log(`Switching to analysis type: ${type}`);
        // Implementation for different analysis views would go here
    }

    updateAnalysisPeriod(days) {
        this.analysisConfig.analysisWindowDays = days;
        this.loadData(); // Reload with new period
    }

    refreshAnalytics() {
        // Clear cache and reload
        const currentAdvisor = this.adminCore.getCurrentAdvisor();
        if (currentAdvisor) {
            const cacheKey = `analytics_${currentAdvisor.numeroCuenta}`;
            this.adminCore.cache.delete(cacheKey);
            this.loadData();
        }
    }

    renderCharts() {
        // Placeholder for chart rendering
        // Would integrate with Chart.js, D3.js, or similar library
        console.log('Charts ready for integration with visualization library');
    }

    attachAnalyticsEventListeners() {
        // Re-attach event listeners after DOM update
        setTimeout(() => {
            this.setupEventListeners();
        }, 100);
    }

    exportAnalytics() {
        const currentAdvisor = this.adminCore.getCurrentAdvisor();
        if (!currentAdvisor) return;

        const exportData = {
            advisor: {
                name: currentAdvisor.nombreAsesor,
                account: currentAdvisor.numeroCuenta
            },
            analysisDate: new Date().toISOString(),
            insights: this.processedData.insights,
            anomalies: this.processedData.anomalies,
            patterns: Array.from(this.processedData.patterns.entries()),
            correlations: Array.from(this.processedData.correlations.entries())
        };

        // Convert insights to CSV format
        const csvData = [
            ['Tipo', 'Categoría', 'Título', 'Descripción', 'Severidad', 'Fecha'],
            ...this.processedData.insights.map(insight => [
                insight.type,
                insight.category,
                insight.title,
                insight.description,
                insight.severity,
                insight.date || ''
            ])
        ];

        this.adminCore.generateCSV(csvData, `analytics_${currentAdvisor.numeroCuenta}`);
    }

    showLoadingState(show) {
        const container = document.getElementById('analyticsContainer');
        if (!container) return;

        if (show) {
            container.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <p>Procesando análisis avanzado...</p>
                </div>
            `;
        }
    }

    showErrorState() {
        const container = document.getElementById('analyticsContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="error-state">
                <div class="error-icon">
                    <i class="bi bi-exclamation-triangle"></i>
                </div>
                <h3>Error en análisis</h3>
                <p>No se pudo procesar el análisis avanzado</p>
                <button class="btn btn-primary" onclick="window.adminApp.getModule('analytics').loadData()">
                    Reintentar
                </button>
            </div>
        `;
    }

    clearData() {
        this.rawData = { reports: [], payments: [], combined: [] };
        this.processedData = {
            timeSeriesData: new Map(),
            patterns: new Map(),
            correlations: new Map(),
            anomalies: [],
            insights: []
        };
        
        // Clear any chart instances
        this.chartInstances.forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.chartInstances.clear();

        const container = document.getElementById('analyticsContainer');
        if (container) {
            container.innerHTML = '';
        }
    }

    cleanup() {
        this.clearData();
    }
}

// Export for global access
window.AnalyticsManager = AnalyticsManager;