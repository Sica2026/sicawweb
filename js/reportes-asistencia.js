/* =================================================================
   REPORTES DE ASESORES - SISTEMA DUAL
   Reportes de Asistencia + Pago de Horas
   ================================================================= */

class ReportesManager {
    constructor() {
        this.currentUser = null;
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
            // Inicializar Firebase
            this.db = firebase.firestore();
            
            // Configurar eventos
            this.setupEventListeners();
            
            // Verificar autenticación existente
            this.checkExistingAuth();
            
            console.log('✅ ReportesManager inicializado correctamente');
        } catch (error) {
            console.error('❌ Error inicializando ReportesManager:', error);
            this.showNotification('Error', 'Error al inicializar el sistema', 'error');
        }
    }

    setupEventListeners() {
        // Formulario de autenticación
        const authForm = document.getElementById('authForm');
        const numeroCuentaInput = document.getElementById('numeroCuentaInput');
        const authBtn = document.getElementById('authBtn');
        
        if (authForm) {
            authForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.authenticateUser();
            });
        }

        // Input de número de cuenta con validación
        if (numeroCuentaInput) {
            numeroCuentaInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
                const isValid = e.target.value.length === 9;
                authBtn.disabled = !isValid;
                authBtn.classList.toggle('disabled', !isValid);
            });

            numeroCuentaInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && e.target.value.length === 9) {
                    this.authenticateUser();
                }
            });
        }

        // Botón de logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }
        
        const cambiarUsuarioBtn = document.querySelector('.btn-logout');
        if (cambiarUsuarioBtn && cambiarUsuarioBtn !== logoutBtn) {
            cambiarUsuarioBtn.addEventListener('click', () => {
                this.logout();
            });
        }

        // View Switcher
        const reportesViewBtn = document.getElementById('reportesViewBtn');
        const pagoViewBtn = document.getElementById('pagoViewBtn');
        
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

        // Filtros para reportes
        const mesFilter = document.getElementById('mesFilter');
        const estadoFilter = document.getElementById('estadoFilter');
        const tipoBloqueFilter = document.getElementById('tipoBloqueFilter');
        
        if (mesFilter) {
            mesFilter.addEventListener('change', () => {
                this.applyFilters();
            });
        }
        
        if (estadoFilter) {
            estadoFilter.addEventListener('change', () => {
                this.applyFilters();
            });
        }
        
        if (tipoBloqueFilter) {
            tipoBloqueFilter.addEventListener('change', () => {
                this.applyFilters();
            });
        }

        // Filtros para pago de horas
        const mesPagoFilter = document.getElementById('mesPagoFilter');
        const salaFilter = document.getElementById('salaFilter');
        
        if (mesPagoFilter) {
            mesPagoFilter.addEventListener('change', () => {
                this.applyPagoFilters();
            });
        }
        
        if (salaFilter) {
            salaFilter.addEventListener('change', () => {
                this.applyPagoFilters();
            });
        }

        // Botones de acción - Reportes
        const refreshBtn = document.getElementById('refreshBtn');
        const exportBtn = document.getElementById('exportBtn');
        
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadReportes();
            });
        }
        
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportReportes();
            });
        }

        // Botones de acción - Pago
        const refreshPagoBtn = document.getElementById('refreshPagoBtn');
        const exportPagoBtn = document.getElementById('exportPagoBtn');
        
        if (refreshPagoBtn) {
            refreshPagoBtn.addEventListener('click', () => {
                this.loadPagoHoras();
            });
        }
        
        if (exportPagoBtn) {
            exportPagoBtn.addEventListener('click', () => {
                this.exportPagoHoras();
            });
        }

        // Sorting de tablas
        this.setupSorting();
    }

    setupSorting() {
        // Configurar sorting para ambas tablas
        document.addEventListener('click', (e) => {
            if (e.target.closest('.sortable')) {
                const sortKey = e.target.closest('.sortable').dataset.sort;
                this.sortData(sortKey);
            }
        });
    }

    switchView(viewType) {
        this.currentView = viewType;
        
        // Actualizar botones
        const reportesBtn = document.getElementById('reportesViewBtn');
        const pagoBtn = document.getElementById('pagoViewBtn');
        const reportesView = document.getElementById('reportesView');
        const pagoView = document.getElementById('pagoView');
        
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
        
        // Actualizar título de página
        document.title = viewType === 'reportes' ? 
            'Reportes de Asistencia - SICA' : 
            'Pago de Horas - SICA';
    }

    checkExistingAuth() {
        const savedUser = localStorage.getItem('reportes_user');
        if (savedUser) {
            try {
                this.currentUser = JSON.parse(savedUser);
                this.showReportsSection();
                this.loadAllData();
            } catch (error) {
                console.error('Error al recuperar usuario guardado:', error);
                localStorage.removeItem('reportes_user');
            }
        }
    }

    async authenticateUser() {
        const numeroCuentaInput = document.getElementById('numeroCuentaInput');
        const authBtn = document.getElementById('authBtn');
        const numeroCuenta = numeroCuentaInput.value.trim();

        if (numeroCuenta.length !== 9) {
            this.showNotification('Error', 'El número de cuenta debe tener 9 dígitos', 'error');
            return;
        }

        authBtn.classList.add('loading');
        authBtn.disabled = true;

        try {
            // Verificar en ambas colecciones
            const reportesSnapshot = await this.db.collection('reportesasesores')
                .where('numeroCuenta', '==', numeroCuenta)
                .limit(1)
                .get();

            const pagoSnapshot = await this.db.collection('pago_horas')
                .where('numeroCuenta', '==', numeroCuenta)
                .limit(1)
                .get();

            if (reportesSnapshot.empty && pagoSnapshot.empty) {
                throw new Error('No se encontraron datos para este número de cuenta');
            }

            // Obtener nombre del asesor
            let nombreAsesor = 'Asesor';
            if (!reportesSnapshot.empty) {
                nombreAsesor = reportesSnapshot.docs[0].data().nombreAsesor || 'Asesor';
            } else if (!pagoSnapshot.empty) {
                nombreAsesor = pagoSnapshot.docs[0].data().nombreAsesor || 'Asesor';
            }

            this.currentUser = {
                numeroCuenta,
                nombreAsesor,
                authenticatedAt: new Date().toISOString()
            };

            localStorage.setItem('reportes_user', JSON.stringify(this.currentUser));
            this.showReportsSection();
            this.loadAllData();

            this.showNotification(
                'Acceso autorizado', 
                `Bienvenido ${nombreAsesor}`, 
                'success',
                'bi-check-circle-fill'
            );

        } catch (error) {
            console.error('Error en autenticación:', error);
            this.showNotification(
                'Error de acceso', 
                error.message || 'No se pudo verificar el número de cuenta', 
                'error',
                'bi-exclamation-triangle-fill'
            );
        } finally {
            authBtn.classList.remove('loading');
            authBtn.disabled = false;
        }
    }

    showReportsSection() {
        const authSection = document.getElementById('authSection');
        const reportsSection = document.getElementById('reportsSection');
        
        const userName = document.getElementById('userName');
        const userAccount = document.getElementById('userAccount');
        
        if (userName && this.currentUser) {
            userName.textContent = this.currentUser.nombreAsesor;
        }
        
        if (userAccount && this.currentUser) {
            userAccount.textContent = this.currentUser.numeroCuenta;
        }

        if (authSection) {
            authSection.style.opacity = '0';
            authSection.style.transform = 'translateY(-20px)';
            
            setTimeout(() => {
                authSection.style.display = 'none';
                reportsSection.style.display = 'block';
                reportsSection.classList.add('animate-fade-in');
            }, 300);
        }
    }

    async loadAllData() {
        await Promise.all([
            this.loadReportes(),
            this.loadPagoHoras()
        ]);
        this.updateStats();
    }

    async loadReportes() {
        if (!this.currentUser) return;

        const loadingState = document.getElementById('loadingState');
        const emptyState = document.getElementById('emptyState');
        const reportsTableBody = document.getElementById('reportsTableBody');

        if (loadingState) loadingState.style.display = 'block';
        if (emptyState) emptyState.style.display = 'none';
        if (reportsTableBody) reportsTableBody.innerHTML = '';

        try {
            const reportesSnapshot = await this.db.collection('reportesasesores')
                .where('numeroCuenta', '==', this.currentUser.numeroCuenta)
                .orderBy('fecha', 'desc')
                .get();

            this.reportes = reportesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            this.filteredReportes = [...this.reportes];
            this.applyFilters();

            if (loadingState) loadingState.style.display = 'none';
            console.log(`📊 Cargados ${this.reportes.length} reportes`);

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
        if (!this.currentUser) return;

        const loadingPagoState = document.getElementById('loadingPagoState');
        const emptyPagoState = document.getElementById('emptyPagoState');
        const pagoTableBody = document.getElementById('pagoTableBody');

        if (loadingPagoState) loadingPagoState.style.display = 'block';
        if (emptyPagoState) emptyPagoState.style.display = 'none';
        if (pagoTableBody) pagoTableBody.innerHTML = '';

        try {
            const pagoSnapshot = await this.db.collection('pago_horas')
                .where('numeroCuenta', '==', this.currentUser.numeroCuenta)
                .orderBy('fecha', 'desc')
                .get();

            this.pagoHoras = pagoSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            this.filteredPagos = [...this.pagoHoras];
            this.applyPagoFilters();

            if (loadingPagoState) loadingPagoState.style.display = 'none';
            console.log(`💰 Cargados ${this.pagoHoras.length} pagos de horas`);

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

    updateStats() {
        // Calcular estadísticas
        const horasTrabajadas = this.calcularHorasTotales();
        const adeudoHoras = this.calcularAdeudoHoras();
        const totalPagoHoras = this.calcularTotalPagoHoras();
        const diasTrabajados = this.reportes.filter(r => r.estado === 'presente').length;

        // Actualizar UI
        const horasTrabajadasEl = document.getElementById('horasTrabajadas');
        const horasAdeudoEl = document.getElementById('horasAdeudo');
        const totalPagoHorasEl = document.getElementById('totalPagoHoras');
        const diasTrabajadosEl = document.getElementById('diasTrabajados');

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
                // Para días ausentes, usar tiempoTrabajado (ej: "-3h 0m")
                if (reporte.tiempoTrabajado) {
                    const tiempoString = reporte.tiempoTrabajado.replace('-', '');
                    const tiempo = this.parseTimeString(tiempoString);
                    totalAdeudoMinutos += tiempo.total;
                }
            } else if (reporte.estado === 'presente' || reporte.estado === 'tardanza') {
                // Para días presentes y tardanzas, calcular diferencia
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

    applyFilters() {
        const mesFilter = document.getElementById('mesFilter');
        const estadoFilter = document.getElementById('estadoFilter');
        const tipoBloqueFilter = document.getElementById('tipoBloqueFilter');
        
        let filtered = [...this.reportes];

        if (mesFilter && mesFilter.value) {
            const [year, month] = mesFilter.value.split('-');
            filtered = filtered.filter(reporte => {
                const [reporteYear, reporteMonth] = reporte.fecha.split('-');
                return reporteYear === year && reporteMonth === month;
            });
        }

        if (estadoFilter && estadoFilter.value) {
            filtered = filtered.filter(reporte => 
                reporte.estado === estadoFilter.value
            );
        }

        if (tipoBloqueFilter && tipoBloqueFilter.value) {
            filtered = filtered.filter(reporte => 
                reporte.tipoBloque && reporte.tipoBloque.toLowerCase().includes(tipoBloqueFilter.value)
            );
        }

        this.filteredReportes = filtered;
        this.renderReportsTable();
    }

    applyPagoFilters() {
        const mesPagoFilter = document.getElementById('mesPagoFilter');
        const salaFilter = document.getElementById('salaFilter');
        
        let filtered = [...this.pagoHoras];

        if (mesPagoFilter && mesPagoFilter.value) {
            const [year, month] = mesPagoFilter.value.split('-');
            filtered = filtered.filter(pago => {
                const [pagoYear, pagoMonth] = pago.fecha.split('-');
                return pagoYear === year && pagoMonth === month;
            });
        }

        if (salaFilter && salaFilter.value) {
            filtered = filtered.filter(pago => 
                pago.sala === salaFilter.value
            );
        }

        this.filteredPagos = filtered;
        this.renderPagoTable();
    }

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
                    header.style.background = 'var(--report-gold)';
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
        const reportsTableBody = document.getElementById('reportsTableBody');
        const emptyState = document.getElementById('emptyState');
        const totalReportesEl = document.getElementById('totalReportes');
        const discrepanciasAlert = document.getElementById('discrepanciasAlert');
        const discrepanciasCount = document.getElementById('discrepanciasCount');

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
        const pagoTableBody = document.getElementById('pagoTableBody');
        const emptyPagoState = document.getElementById('emptyPagoState');
        const totalPagosEl = document.getElementById('totalPagos');

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

    // Detectar discrepancias entre horario programado y real
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
            'Fecha',
            'Tipo Bloque',
            'Horario Programado Inicio',
            'Horario Programado Final',
            'Entrada Real',
            'Salida Real',
            'Horas Válidas',
            'Estado',
            'Observaciones',
            'Discrepancia Entrada',
            'Discrepancia Salida',
            'Discrepancia Horas'
        ];

        const csvData = this.filteredReportes.map(reporte => {
            const entradaDiscrepancia = this.tieneDiscrepancia(reporte.entrada, reporte.horarioProgramadoInicio);
            const salidaDiscrepancia = this.tieneDiscrepancia(reporte.salida, reporte.horarioProgramadoFinal);
            const horasDiscrepancia = this.parseTimeString(reporte.horasValidas || '0h 0m').total < 
                                      this.parseTimeString(reporte.horasProgramadas || '0h 0m').total;

            return [
                reporte.fecha,
                reporte.tipoBloque || '',
                reporte.horarioProgramadoInicio || '',
                reporte.horarioProgramadoFinal || '',
                reporte.entrada || '',
                reporte.salida || '',
                reporte.horasValidas || '',
                reporte.estado,
                reporte.observaciones || '',
                entradaDiscrepancia ? 'SÍ' : 'NO',
                salidaDiscrepancia ? 'SÍ' : 'NO',
                horasDiscrepancia ? 'SÍ' : 'NO'
            ];
        });

        this.generateCSV(csvData, headers, `reportes_asistencia_${this.currentUser.numeroCuenta}`);
    }

    exportPagoHoras() {
        if (this.filteredPagos.length === 0) {
            this.showNotification('Sin datos', 'No hay pagos para exportar', 'warning');
            return;
        }

        const headers = [
            'Fecha',
            'Sala',
            'Hora Inicio',
            'Hora Fin',
            'Total Horas',
            'Autorizado Por',
            'Nombre Asesor',
            'Número Cuenta'
        ];

        const csvData = this.filteredPagos.map(pago => [
            pago.fecha,
            pago.sala || '',
            pago.horaInicio || '',
            pago.horaFin || '',
            pago.totalHoras || 0,
            pago.quienAutorizo || '',
            pago.nombreAsesor || '',
            pago.numeroCuenta || ''
        ]);

        this.generateCSV(csvData, headers, `pago_horas_${this.currentUser.numeroCuenta}`);
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
            
            this.showNotification(
                'Exportación exitosa', 
                'Los datos se han exportado correctamente', 
                'success',
                'bi-download'
            );
        }
    }

    logout() {
        this.currentUser = null;
        this.reportes = [];
        this.pagoHoras = [];
        this.filteredReportes = [];
        this.filteredPagos = [];
        localStorage.removeItem('reportes_user');

        // Resetear formulario
        const numeroCuentaInput = document.getElementById('numeroCuentaInput');
        const authBtn = document.getElementById('authBtn');
        if (numeroCuentaInput) {
            numeroCuentaInput.value = '';
        }
        if (authBtn) {
            authBtn.disabled = true;
            authBtn.classList.add('disabled');
        }

        // Limpiar estadísticas
        this.clearStats();

        // Limpiar tablas
        const reportsTableBody = document.getElementById('reportsTableBody');
        const pagoTableBody = document.getElementById('pagoTableBody');
        if (reportsTableBody) reportsTableBody.innerHTML = '';
        if (pagoTableBody) pagoTableBody.innerHTML = '';

        // Resetear filtros
        this.resetFilters();

        // Volver a vista de reportes por defecto
        this.switchView('reportes');

        // Mostrar sección de auth
        const authSection = document.getElementById('authSection');
        const reportsSection = document.getElementById('reportsSection');
        
        if (reportsSection && authSection) {
            reportsSection.style.transition = 'all 0.3s ease';
            reportsSection.style.opacity = '0';
            reportsSection.style.transform = 'translateY(-20px)';
            
            setTimeout(() => {
                reportsSection.style.display = 'none';
                authSection.style.display = 'flex';
                authSection.style.opacity = '0';
                authSection.style.transform = 'translateY(20px)';
                
                setTimeout(() => {
                    authSection.style.transition = 'all 0.3s ease';
                    authSection.style.opacity = '1';
                    authSection.style.transform = 'translateY(0)';
                    
                    setTimeout(() => {
                        if (numeroCuentaInput) {
                            numeroCuentaInput.focus();
                        }
                    }, 350);
                }, 50);
            }, 300);
        }

        this.showNotification('Sesión cerrada', 'Ingresa otro número de cuenta', 'info', 'bi-box-arrow-right');
    }

    resetFilters() {
        const filters = [
            'mesFilter', 'estadoFilter', 'tipoBloqueFilter',
            'mesPagoFilter', 'salaFilter'
        ];
        
        filters.forEach(filterId => {
            const filter = document.getElementById(filterId);
            if (filter) filter.value = '';
        });
    }

    clearStats() {
        const statElements = [
            'horasTrabajadas', 'horasAdeudo', 'totalPagoHoras', 
            'diasTrabajados', 'totalReportes', 'totalPagos'
        ];
        
        statElements.forEach(statId => {
            const element = document.getElementById(statId);
            if (element) {
                element.textContent = statId.includes('total') ? '0' : '0h';
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

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    if (typeof firebase !== 'undefined') {
        window.reportesManager = new ReportesManager();
        console.log('Sistema de Reportes Dual inicializado');
    } else {
        console.error('Firebase no disponible');
        
        setTimeout(() => {
            if (typeof firebase !== 'undefined') {
                window.reportesManager = new ReportesManager();
                console.log('Sistema de Reportes Dual inicializado (retry)');
            } else {
                alert('Error: No se pudo conectar con la base de datos. Por favor, recarga la página.');
            }
        }, 2000);
    }
});

// Cleanup al cerrar la página
window.addEventListener('beforeunload', () => {
    if (window.reportesManager) {
        console.log('Limpiando recursos del sistema dual');
    }
});

// Exportar para uso global
window.ReportesManager = ReportesManager;