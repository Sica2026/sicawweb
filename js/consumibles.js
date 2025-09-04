// consumibles.js - Funcionalidad específica para la página de consumibles

class ConsumiblesManager {
    constructor() {
        this.comparativeChart = null;
        this.distributionChart = null;
        this.currentData = {};
        this.historicalData = [];
        this.importData = null;
        this.lecturas = [];
        this.currentSemester = '2026-1';
        this.semanaActual = 8;
        this.semanasConfig = { oficiales: 16, finales: 2, extras: 1, intersemestrales: 5 };
        
        this.init();
    }

    init() {
        this.setupPageComponents();
        this.loadData();
        this.loadLecturas();
        this.setupEventListeners();
        this.initializeCharts();
    }

    setupPageComponents() {
        // Configurar título y breadcrumbs
        if (window.SICAComponents) {
            window.SICAComponents.setPageTitle("Consumibles - SICA");
            window.SICAComponents.addBreadcrumbs([
                { text: "Inicio", link: "../index.html" },
                { text: "Consumibles", active: true }
            ]);
        }
    }

    async loadData() {
        try {
            // Datos mock para demostración - en producción vendrían de Firebase
            this.currentData = {
                "2026-1": {
                    "SICA 1": 12450,
                    "SICA 2": 8320,
                    "SICA 4": 15680,
                    total: 36450
                },
                "2025-2": {
                    "SICA 1": 15200,
                    "SICA 2": 12100,
                    "SICA 4": 18500,
                    total: 45800
                }
            };

            this.historicalData = [
                { semester: "2025-1", sica1: 14800, sica2: 11200, sica4: 17300, total: 43300 },
                { semester: "2024-2", sica1: 16500, sica2: 13400, sica4: 19100, total: 49000 },
                { semester: "2024-1", sica1: 13900, sica2: 10800, sica4: 16200, total: 40900 },
                { semester: "2023-2", sica1: 15600, sica2: 12800, sica4: 18400, total: 46800 }
            ];

        } catch (error) {
            console.error('Error loading data:', error);
            this.showNotification('Error', 'Error al cargar los datos', 'error');
        }
    }

    async loadLecturas() {
        // Datos mock de lecturas semanales
        this.lecturas = [
            { semana: 1, fecha: '2026-01-15', sala: 'SICA 1', acumulado: 850, paginasSemana: 850, toner: 85, notas: '' },
            { semana: 2, fecha: '2026-01-22', sala: 'SICA 1', acumulado: 1770, paginasSemana: 920, toner: 75, notas: '' },
            { semana: 3, fecha: '2026-01-29', sala: 'SICA 1', acumulado: 2550, paginasSemana: 780, toner: 65, notas: 'Cambio de cartucho' },
            { semana: 1, fecha: '2026-01-16', sala: 'SICA 2', acumulado: 620, paginasSemana: 620, toner: 90, notas: '' },
            { semana: 2, fecha: '2026-01-23', sala: 'SICA 2', acumulado: 1250, paginasSemana: 630, toner: 82, notas: '' }
        ];
        this.updateLecturasTable();
    }

    updateLecturasTable() {
        const tbody = document.getElementById('lecturasTableBody');
        const lecturasOrdenadas = this.lecturas.sort((a, b) => 
            a.semana - b.semana || a.sala.localeCompare(b.sala)
        );

        tbody.innerHTML = lecturasOrdenadas.map(lectura => {
            const estado = this.getEstadoLectura(lectura);
            return `
                <tr class="lectura-row ${estado.class}">
                    <td><strong>${lectura.semana}</strong></td>
                    <td>${new Date(lectura.fecha).toLocaleDateString()}</td>
                    <td><span class="badge bg-secondary">${lectura.sala}</span></td>
                    <td>${lectura.acumulado.toLocaleString()}</td>
                    <td><strong>${lectura.paginasSemana.toLocaleString()}</strong></td>
                    <td>
                        <div class="progress" style="height: 20px; width: 60px;">
                            <div class="progress-bar ${this.getTonerColor(lectura.toner)}" 
                                 style="width: ${lectura.toner}%">${lectura.toner}%</div>
                        </div>
                    </td>
                    <td><span class="badge estado-badge ${estado.badge}">${estado.text}</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary btn-accion" 
                                onclick="consumiblesManager.editLectura(${lectura.semana}, '${lectura.sala}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    getEstadoLectura(lectura) {
        if (lectura.toner <= 20) return { class: 'pendiente', badge: 'bg-warning', text: 'Tóner Bajo' };
        if (lectura.toner <= 10) return { class: 'pendiente', badge: 'bg-danger', text: 'Crítico' };
        return { class: 'completada', badge: 'bg-success', text: 'Normal' };
    }

    getTonerColor(nivel) {
        if (nivel <= 10) return 'bg-danger';
        if (nivel <= 20) return 'bg-warning';
        return 'bg-success';
    }

    openLecturaModal() {
        const semanaInput = document.getElementById('semanaInput');
        const fechaInput = document.getElementById('fechaInput');
        
        // Calcular próxima semana
        const proximaSemana = Math.max(...this.lecturas.map(l => l.semana), 0) + 1;
        semanaInput.value = Math.min(proximaSemana, 24);
        
        // Fecha actual
        fechaInput.value = new Date().toISOString().split('T')[0];
    }

    calcularPaginasSemana() {
        const salaSelect = document.getElementById('salaSelect');
        const acumuladoInput = document.getElementById('acumuladoInput');
        const calculoPreview = document.getElementById('calculoPreview');
        const paginasCalculadas = document.getElementById('paginasCalculadas');

        if (!salaSelect.value || !acumuladoInput.value) {
            calculoPreview.style.display = 'none';
            return;
        }

        const sala = salaSelect.value;
        const acumuladoActual = parseInt(acumuladoInput.value);
        
        // Buscar última lectura de la misma sala
        const ultimaLectura = this.lecturas
            .filter(l => l.sala === sala)
            .sort((a, b) => b.semana - a.semana)[0];

        const paginasSemana = ultimaLectura ? acumuladoActual - ultimaLectura.acumulado : acumuladoActual;
        
        paginasCalculadas.textContent = Math.max(0, paginasSemana).toLocaleString();
        calculoPreview.style.display = 'block';
    }

    async guardarLectura() {
        const form = document.getElementById('lecturaForm');
        const formData = new FormData(form);
        
        const lectura = {
            semana: parseInt(document.getElementById('semanaInput').value),
            fecha: document.getElementById('fechaInput').value,
            sala: document.getElementById('salaSelect').value,
            acumulado: parseInt(document.getElementById('acumuladoInput').value),
            toner: parseInt(document.getElementById('tonerInput').value),
            notas: document.getElementById('notasInput').value
        };

        // Calcular páginas de la semana
        const ultimaLectura = this.lecturas
            .filter(l => l.sala === lectura.sala)
            .sort((a, b) => b.semana - a.semana)[0];
        
        lectura.paginasSemana = ultimaLectura ? 
            Math.max(0, lectura.acumulado - ultimaLectura.acumulado) : 
            lectura.acumulado;

        // Guardar (simulado)
        this.lecturas.push(lectura);
        this.updateLecturasTable();
        this.updateCurrentData();

        // Cerrar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('lecturaModal'));
        modal.hide();

        this.showNotification('Éxito', 'Lectura guardada correctamente', 'success');
    }

    editLectura(semana, sala) {
        const lectura = this.lecturas.find(l => l.semana === semana && l.sala === sala);
        if (!lectura) return;

        // Llenar formulario con datos existentes
        document.getElementById('semanaInput').value = lectura.semana;
        document.getElementById('fechaInput').value = lectura.fecha;
        document.getElementById('salaSelect').value = lectura.sala;
        document.getElementById('acumuladoInput').value = lectura.acumulado;
        document.getElementById('tonerInput').value = lectura.toner;
        document.getElementById('notasInput').value = lectura.notas;

        // Mostrar modal
        const modal = new bootstrap.Modal(document.getElementById('lecturaModal'));
        modal.show();
    }

    updateCurrentData() {
        // Recalcular totales por sala basado en lecturas
        const totales = this.lecturas.reduce((acc, lectura) => {
            if (!acc[lectura.sala]) acc[lectura.sala] = 0;
            acc[lectura.sala] += lectura.paginasSemana;
            return acc;
        }, {});

        this.currentData[this.currentSemester] = {
            'SICA 1': totales['SICA 1'] || 0,
            'SICA 2': totales['SICA 2'] || 0,
            'SICA 4': totales['SICA 4'] || 0,
            total: Object.values(totales).reduce((a, b) => a + b, 0)
        };

        this.updateUI();
    }

    setupEventListeners() {
        // Botones principales
        document.getElementById('btn-exportar').addEventListener('click', () => this.exportData());
        document.getElementById('btn-nueva-lectura').addEventListener('click', () => this.openLecturaModal());
        
        // Gráficas
        document.getElementById('distributionSemester').addEventListener('change', (e) => {
            this.updateDistributionChart(e.target.value);
        });

        // Modales
        document.getElementById('historicoModal').addEventListener('show.bs.modal', () => this.loadHistoricalData());
        
        // Lecturas
        this.setupLecturaListeners();
        this.setupImportListeners();
    }

    setupLecturaListeners() {
        const form = document.getElementById('lecturaForm');
        const acumuladoInput = document.getElementById('acumuladoInput');
        const salaSelect = document.getElementById('salaSelect');
        const btnGuardar = document.getElementById('btnGuardarLectura');

        // Calcular páginas automáticamente
        [acumuladoInput, salaSelect].forEach(el => {
            el.addEventListener('input', () => this.calcularPaginasSemana());
        });

        // Guardar lectura
        btnGuardar.addEventListener('click', () => this.guardarLectura());

        // Reset modal on close
        document.getElementById('lecturaModal').addEventListener('hidden.bs.modal', () => {
            form.reset();
            document.getElementById('calculoPreview').style.display = 'none';
        });
    }

    setupImportListeners() {
        const fileInput = document.getElementById('fileInput');
        const semesterInput = document.getElementById('semesterInput');
        const btnPreview = document.getElementById('btnPreview');
        const btnConfirmImport = document.getElementById('btnConfirmImport');

        fileInput.addEventListener('change', () => {
            this.validateImportForm();
        });

        semesterInput.addEventListener('input', () => {
            this.validateImportForm();
        });

        btnPreview.addEventListener('click', () => {
            this.showImportPreview();
        });

        btnConfirmImport.addEventListener('click', () => {
            this.confirmImport();
        });
    }

    validateImportForm() {
        const fileInput = document.getElementById('fileInput');
        const semesterInput = document.getElementById('semesterInput');
        const btnPreview = document.getElementById('btnPreview');
        
        const hasFile = fileInput.files.length > 0;
        const hasValidSemester = /^\d{4}-[12]$/.test(semesterInput.value);
        
        btnPreview.disabled = !(hasFile && hasValidSemester);
    }

    async showImportPreview() {
        const fileInput = document.getElementById('fileInput');
        const file = fileInput.files[0];
        
        if (!file) return;

        try {
            const data = await this.readExcelFile(file);
            this.importData = data;
            
            this.displayImportPreview(data);
            
            // Switch to step 2
            document.getElementById('importStep1').style.display = 'none';
            document.getElementById('importStep2').style.display = 'block';
            document.getElementById('btnPreview').style.display = 'none';
            document.getElementById('btnConfirmImport').style.display = 'inline-block';
            
        } catch (error) {
            console.error('Error reading file:', error);
            this.showNotification('Error', 'Error al leer el archivo', 'error');
        }
    }

    readExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const workbook = XLSX.read(e.target.result, { type: 'binary' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('Error reading file'));
            reader.readAsBinaryString(file);
        });
    }

    displayImportPreview(data) {
        const thead = document.getElementById('previewTableHead');
        const tbody = document.getElementById('previewTableBody');
        
        if (data.length === 0) return;
        
        // Headers
        const headers = data[0];
        thead.innerHTML = `<tr>${headers.map(h => `<th>${h || ''}</th>`).join('')}</tr>`;
        
        // Data rows (first 10 for preview)
        const rows = data.slice(1, 11);
        tbody.innerHTML = rows.map(row => 
            `<tr>${headers.map((_, i) => `<td>${row[i] || ''}</td>`).join('')}</tr>`
        ).join('');
        
        if (data.length > 11) {
            tbody.innerHTML += `<tr><td colspan="${headers.length}" class="text-center text-muted">... y ${data.length - 11} filas más</td></tr>`;
        }
    }

    async confirmImport() {
        const semesterInput = document.getElementById('semesterInput');
        const semester = semesterInput.value;
        
        if (!this.importData || !semester) return;
        
        try {
            // Simular importación - en producción guardaría en Firebase
            await this.simulateImport(this.importData, semester);
            
            this.showNotification('Éxito', `Datos importados correctamente para ${semester}`, 'success');
            
            // Reset modal
            this.resetImportModal();
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('importarModal'));
            modal.hide();
            
            // Reload data
            await this.loadData();
            
        } catch (error) {
            console.error('Error importing data:', error);
            this.showNotification('Error', 'Error al importar los datos', 'error');
        }
    }

    simulateImport(data, semester) {
        return new Promise((resolve) => {
            // Simular delay de importación
            setTimeout(() => {
                console.log(`Importing data for semester ${semester}:`, data);
                resolve();
            }, 2000);
        });
    }

    resetImportModal() {
        document.getElementById('fileInput').value = '';
        document.getElementById('semesterInput').value = '';
        document.getElementById('importStep1').style.display = 'block';
        document.getElementById('importStep2').style.display = 'none';
        document.getElementById('btnPreview').style.display = 'inline-block';
        document.getElementById('btnConfirmImport').style.display = 'none';
        document.getElementById('btnPreview').disabled = true;
        this.importData = null;
    }

    updateUI() {
        this.updateComparativeChart();
        this.updateDistributionChart('2026-1');
    }

    initializeCharts() {
        // Configurar Chart.js defaults
        Chart.defaults.font.family = 'system-ui, -apple-system, sans-serif';
        Chart.defaults.color = '#6c757d';
    }

    updateComparativeChart() {
        const ctx = document.getElementById('comparativeChart').getContext('2d');
        
        if (this.comparativeChart) {
            this.comparativeChart.destroy();
        }

        const data = {
            labels: ['2025-2', '2026-1'],
            datasets: [{
                label: 'Total de Impresiones',
                data: [45800, 36450],
                backgroundColor: [
                    'rgba(108, 117, 125, 0.8)',
                    'rgba(32, 44, 86, 0.8)'
                ],
                borderColor: [
                    'rgb(108, 117, 125)',
                    'rgb(32, 44, 86)'
                ],
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false
            }]
        };

        this.comparativeChart = new Chart(ctx, {
            type: 'bar',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        callbacks: {
                            label: function(context) {
                                return `${context.parsed.y.toLocaleString()} páginas`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString();
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }

    updateDistributionChart(semester) {
        const ctx = document.getElementById('distributionChart').getContext('2d');
        
        if (this.distributionChart) {
            this.distributionChart.destroy();
        }

        const semesterData = this.currentData[semester];
        if (!semesterData) return;

        const data = {
            labels: ['SICA 1', 'SICA 2', 'SICA 4'],
            datasets: [{
                data: [
                    semesterData['SICA 1'],
                    semesterData['SICA 2'],
                    semesterData['SICA 4']
                ],
                backgroundColor: [
                    '#3498db',
                    '#e74c3c',
                    '#f39c12'
                ],
                borderColor: '#fff',
                borderWidth: 3
            }]
        };

        this.distributionChart = new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return `${context.label}: ${context.parsed.toLocaleString()} (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '60%',
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        });

        // Update summary
        this.updateDistributionSummary(semester);
    }

    updateDistributionSummary(semester) {
        const semesterData = this.currentData[semester];
        if (!semesterData) return;

        const total = semesterData.total;
        const summaryItems = document.querySelectorAll('.summary-item');
        
        const rooms = ['SICA 1', 'SICA 2', 'SICA 4'];
        const colors = ['sica1-color', 'sica2-color', 'sica4-color'];
        
        summaryItems.forEach((item, index) => {
            if (index < 3) {
                const value = semesterData[rooms[index]];
                const percentage = ((value / total) * 100).toFixed(1);
                
                const valueSpan = item.querySelector('.summary-value');
                const percentSpan = item.querySelector('.summary-percent');
                
                valueSpan.textContent = value.toLocaleString();
                valueSpan.className = `summary-value ${colors[index]}`;
                percentSpan.textContent = `(${percentage}%)`;
            }
        });
    }

    loadHistoricalData() {
        const tbody = document.getElementById('historicoTableBody');
        
        // Simulate loading
        setTimeout(() => {
            tbody.innerHTML = this.historicalData.map(item => `
                <tr>
                    <td><strong>${item.semester}</strong></td>
                    <td class="sica1-color">${item.sica1.toLocaleString()}</td>
                    <td class="sica2-color">${item.sica2.toLocaleString()}</td>
                    <td class="sica4-color">${item.sica4.toLocaleString()}</td>
                    <td><strong>${item.total.toLocaleString()}</strong></td>
                    <td>
                        <button class="btn btn-sm btn-sica-outline" onclick="consumiblesManager.exportSemester('${item.semester}')">
                            <i class="bi bi-download"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        }, 1000);
    }

    exportData() {
        const btn = document.getElementById('btn-exportar');
        const originalText = btn.innerHTML;
        
        btn.classList.add('btn-loading');
        btn.disabled = true;
        
        setTimeout(() => {
            this.generateExcelExport();
            
            btn.classList.remove('btn-loading');
            btn.innerHTML = originalText;
            btn.disabled = false;
            
            this.showNotification('Éxito', 'Archivo exportado correctamente', 'success');
        }, 2000);
    }

    exportSemester(semester) {
        console.log(`Exporting semester: ${semester}`);
        this.showNotification('Exportando', `Generando archivo para ${semester}`, 'info');
        
        setTimeout(() => {
            this.showNotification('Éxito', `Archivo de ${semester} exportado`, 'success');
        }, 1500);
    }

    generateExcelExport() {
        // En producción, esto generaría un archivo Excel real
        const wb = XLSX.utils.book_new();
        
        // Hoja de resumen
        const summaryData = [
            ['Semestre', 'SICA 1', 'SICA 2', 'SICA 4', 'Total'],
            ['2026-1', 12450, 8320, 15680, 36450],
            ['2025-2', 15200, 12100, 18500, 45800]
        ];
        
        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, summarySheet, 'Resumen');
        
        // Hoja de detalle (ejemplo)
        const detailData = [
            ['Semana', 'Fecha', 'Sala', 'Páginas Semana', 'Acumulado', 'Nivel Tóner', 'Responsable', 'Notas'],
            [1, '2026-01-15', 'SICA 1', 850, 850, '85%', 'Juan Pérez', ''],
            [2, '2026-01-22', 'SICA 1', 920, 1770, '75%', 'Juan Pérez', ''],
            [3, '2026-01-29', 'SICA 1', 780, 2550, '65%', 'Juan Pérez', 'Cambio de cartucho']
        ];
        
        const detailSheet = XLSX.utils.aoa_to_sheet(detailData);
        XLSX.utils.book_append_sheet(wb, detailSheet, 'Detalle 2026-1');
        
        // En un navegador real, esto descargaría el archivo
        console.log('Excel file generated:', wb);
    }

    showNotification(title, message, type = 'info', icon = '') {
        if (window.SICAComponents && window.SICAComponents.notify) {
            const icons = {
                success: 'bi-check-circle-fill',
                error: 'bi-exclamation-triangle-fill',
                warning: 'bi-exclamation-triangle',
                info: 'bi-info-circle-fill'
            };
            
            window.SICAComponents.notify(title, message, type, icon || icons[type]);
        } else {
            // Fallback notification
            console.log(`${type.toUpperCase()}: ${title} - ${message}`);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.consumiblesManager = new ConsumiblesManager();
});

// Export for global access
window.ConsumiblesManager = ConsumiblesManager;