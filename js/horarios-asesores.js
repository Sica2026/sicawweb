// horarios-asesores.js

class HorariosAsesorManager {
    constructor() {
        this.db = null;
        this.auth = null;
        this.currentUser = null;
        this.currentStep = 1;
        this.totalSteps = 3; // Cambiado de 4 a 3
        
        // Configuration state
        this.config = {
            tipoBloque: null,
            asesor: null,
            sala: null,
            posicion: null,
            horarios: []
        };
        
        // Data cache
        this.asesores = [];
        this.existingSchedules = [];
        this.statistics = {};
        
        this.init();
    }

    async init() {
        try {
            console.log('🚀 Inicializando HorariosAsesorManager...');
            
            // Configurar página
            this.setupPage();
            
            // Verificar autenticación
            await this.checkAuthentication();
            
            // Configurar Firebase
            this.setupFirebase();
            
            // Configurar eventos
            this.setupEventListeners();
            
            // Configurar selectores de hora
            this.setupTimeSelectors();
            
            // Cargar datos iniciales
            await this.loadInitialData();
            
            console.log('✅ HorariosAsesorManager inicializado correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando HorariosAsesorManager:', error);
            this.showNotification('Error al cargar el sistema', 'error');
        }
    }

    setupPage() {
        if (window.SICAComponents) {
            window.SICAComponents.setPageTitle('Gestión de Horarios - Panel Administrativo');
        } else {
            document.title = 'Gestión de Horarios - Panel Administrativo';
        }
    }

    async checkAuthentication() {
        return new Promise((resolve, reject) => {
            const checkAuth = setInterval(() => {
                if (window.firebaseAuth) {
                    clearInterval(checkAuth);
                    
                    window.firebaseAuth.onAuthStateChanged((user) => {
                        if (!user) {
                            console.log('❌ Usuario no autenticado, redirigiendo...');
                            window.location.href = 'login.html';
                            return;
                        }
                        
                        this.currentUser = user;
                        console.log('✅ Usuario autenticado:', user.email);
                        resolve(user);
                    });
                }
            }, 100);
            
            setTimeout(() => {
                clearInterval(checkAuth);
                if (!window.firebaseAuth) {
                    reject(new Error('Firebase Auth no disponible'));
                }
            }, 10000);
        });
    }

    setupFirebase() {
        if (window.firebaseDB) this.db = window.firebaseDB;
        if (window.firebaseAuth) this.auth = window.firebaseAuth;
        
        if (!this.db || !this.auth) {
            throw new Error('Firebase no está completamente inicializado');
        }
        
        console.log('🔥 Firebase configurado correctamente');
    }

    setupEventListeners() {
        // Navigation buttons
        document.getElementById('nextBtn').addEventListener('click', () => this.nextStep());
        document.getElementById('prevBtn').addEventListener('click', () => this.prevStep());
        document.getElementById('confirmBtn').addEventListener('click', () => this.showConfirmationModal());
        
        // Step 1: Tipo/Bloque selection
        document.querySelectorAll('#step-1 .option-card').forEach(card => {
            card.addEventListener('click', () => this.selectTipoBloque(card));
        });
        
        // Step 2: Asesor search and selection
        document.getElementById('asesorSearch').addEventListener('input', (e) => this.filterAsesores(e.target.value));
        
        // Step 3: Sala and Posicion selection (now compact)
        document.querySelectorAll('.sala-card-compact').forEach(card => {
            card.addEventListener('click', () => this.selectSala(card));
        });
        
        document.querySelectorAll('.posicion-card-compact').forEach(card => {
            card.addEventListener('click', () => this.selectPosicion(card));
        });
        
        // Step 3: Horario management (now includes location)
        document.getElementById('agregarHorario').addEventListener('click', () => this.addHorario());
        document.getElementById('limpiarTodos').addEventListener('click', () => this.clearAllHorarios());
        
        // Modal events
        document.getElementById('finalConfirmBtn').addEventListener('click', () => this.saveHorarios());
        document.getElementById('confirmDeleteBlock').addEventListener('click', () => this.deleteBlock());
        
        console.log('🎧 Event listeners configurados');
    }

    setupTimeSelectors() {
        const horaInicio = document.getElementById('horaInicio');
        const horaFinal = document.getElementById('horaFinal');
        
        // Generate time options (7:00 AM to 9:00 PM in 30-minute intervals)
        const timeOptions = [];
        for (let hour = 7; hour <= 21; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
                const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                const displayTime = this.formatTimeDisplay(timeString);
                timeOptions.push({ value: timeString, display: displayTime });
            }
        }
        
        // Populate selectors
        timeOptions.forEach(option => {
            const optionInicio = new Option(option.display, option.value);
            const optionFinal = new Option(option.display, option.value);
            horaInicio.appendChild(optionInicio);
            horaFinal.appendChild(optionFinal);
        });
        
        // Set default final time when inicio changes
        horaInicio.addEventListener('change', () => {
            const inicioIndex = horaInicio.selectedIndex;
            if (inicioIndex >= 0 && inicioIndex < horaFinal.options.length - 1) {
                horaFinal.selectedIndex = inicioIndex + 1;
            }
        });
    }

    formatTimeDisplay(timeString) {
        const [hours, minutes] = timeString.split(':');
        const hour24 = parseInt(hours);
        const isPM = hour24 >= 12;
        const hour12 = hour24 > 12 ? hour24 - 12 : hour24 === 0 ? 12 : hour24;
        return `${hour12}:${minutes} ${isPM ? 'PM' : 'AM'}`;
    }

    async loadInitialData() {
        try {
            // Mostrar indicador ligero en lugar de modal
            this.showNotification('Cargando datos del sistema...', 'info');
            
            // Load asesores
            await this.loadAsesores();
            
            // Load statistics
            await this.loadStatistics();
            
            this.showNotification('Sistema listo para usar', 'success');
            
        } catch (error) {
            console.error('❌ Error cargando datos iniciales:', error);
            this.showNotification('Error cargando datos', 'error');
        }
    }

    async loadAsesores() {
        try {
            const snapshot = await this.db.collection('asesores')
                .where('estado', '==', 'aprobado')
                .orderBy('nombreHorario')
                .get();
            
            this.asesores = [];
            snapshot.forEach(doc => {
                this.asesores.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            this.renderAsesores();
            console.log(`✅ ${this.asesores.length} asesores cargados`);
            
        } catch (error) {
            console.error('❌ Error cargando asesores:', error);
            throw error;
        }
    }

    renderAsesores(filteredAsesores = null) {
        const grid = document.getElementById('asesoresGrid');
        const asesores = filteredAsesores || this.asesores;
        
        if (asesores.length === 0) {
            grid.innerHTML = `
                <div class="text-center p-4">
                    <i class="bi bi-person-x text-muted" style="font-size: 3rem;"></i>
                    <p class="text-muted mt-2">No se encontraron asesores</p>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = asesores.map(asesor => `
            <div class="asesor-card" data-asesor-id="${asesor.id}">
                <div class="asesor-avatar">
                    ${this.getInitials(asesor.nombreHorario || 'Sin Nombre')}
                </div>
                <div class="asesor-info">
                    <h6>${asesor.nombreHorario || 'Sin nombre'}</h6>
                    <p>${asesor.numeroCuenta || 'Sin número de cuenta'}</p>
                    <small class="text-muted">${asesor.email || 'Sin email'}</small>
                </div>
            </div>
        `).join('');
        
        // Add click events
        grid.querySelectorAll('.asesor-card').forEach(card => {
            card.addEventListener('click', () => this.selectAsesor(card));
        });
    }

    filterAsesores(searchTerm) {
        const filtered = this.asesores.filter(asesor => 
            (asesor.nombreHorario && asesor.nombreHorario.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (asesor.email && asesor.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (asesor.numeroCuenta && asesor.numeroCuenta.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        this.renderAsesores(filtered);
    }

    getInitials(name) {
        return name.split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .substring(0, 2);
    }

    async loadStatistics() {
        try {
            const blocks = ['provisional-a', 'provisional-b', 'definitivo', 'bloque-1', 'bloque-2', 'extraordinarios'];
            const totalAsesores = this.asesores.length;
            
            for (const block of blocks) {
                const snapshot = await this.db.collection('horarios')
                    .where('tipoBloque', '==', block)
                    .get();
                
                const uniqueAsesores = new Set();
                snapshot.forEach(doc => {
                    uniqueAsesores.add(doc.data().asesorId);
                });
                
                this.statistics[block] = {
                    total: totalAsesores,
                    assigned: uniqueAsesores.size,
                    missing: totalAsesores - uniqueAsesores.size,
                    percentage: totalAsesores > 0 ? (uniqueAsesores.size / totalAsesores) * 100 : 0
                };
            }
            
            this.renderStatistics();
            
        } catch (error) {
            console.error('❌ Error cargando estadísticas:', error);
        }
    }

    renderStatistics() {
        const grid = document.getElementById('statisticsGrid');
        const blocks = [
            { key: 'provisional-a', name: 'Provisional A', icon: 'bi-calendar-check' },
            { key: 'provisional-b', name: 'Provisional B', icon: 'bi-calendar-plus' },
            { key: 'definitivo', name: 'Definitivo', icon: 'bi-calendar-event' },
            { key: 'bloque-1', name: 'Bloque 1', icon: 'bi-1-square' },
            { key: 'bloque-2', name: 'Bloque 2', icon: 'bi-2-square' },
            { key: 'extraordinarios', name: 'Extraordinarios', icon: 'bi-star-fill' }
        ];
        
        grid.innerHTML = blocks.map(block => {
            const stats = this.statistics[block.key] || { total: 0, assigned: 0, percentage: 0 };
            return `
                <div class="col-lg-4 col-md-6">
                    <div class="stat-block-card" data-block="${block.key}">
                        <div class="stat-icon">
                            <i class="${block.icon}"></i>
                        </div>
                        <div class="stat-number">${stats.assigned}/${stats.total}</div>
                        <div class="stat-label">${block.name}</div>
                        <div class="stat-progress">
                            <div class="stat-progress-bar" style="width: ${stats.percentage}%"></div>
                        </div>
                        <div class="stat-actions">
                            <button class="btn btn-sm btn-outline-primary" onclick="horariosManager.showMissingAdvisors('${block.key}')">
                                <i class="bi bi-eye me-1"></i>Ver Faltantes
                            </button>
                            <button class="btn btn-sm btn-outline-info" onclick="horariosManager.openTablaMode('${block.key}')">
                                <i class="bi bi-table me-1"></i>Modo Tabla
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="horariosManager.confirmDeleteBlock('${block.key}')">
                                <i class="bi bi-trash me-1"></i>Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // ========================================
    // STEP NAVIGATION
    // ========================================
    async loadExistingSchedulesInBackground() {
        try {
            console.log('🔄 === INICIO CARGA BACKGROUND ===');
            console.log('📋 Tipo Bloque:', this.config.tipoBloque);
            console.log('👤 Asesor ID:', this.config.asesor?.id);
            
            // Validaciones rápidas
            if (!this.config.tipoBloque || !this.config.asesor?.id || !this.db) {
                console.warn('⚠️ Datos insuficientes para cargar horarios existentes');
                this.showNotification('Listo para agregar horarios nuevos', 'info');
                return;
            }
            
            // Timeout corto para no hacer esperar al usuario
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error('TIMEOUT: Carga en background cancelada después de 5 segundos'));
                }, 5000); // Solo 5 segundos máximo
            });
            
            console.log('🔍 Iniciando consulta background...');
            const startTime = Date.now();
            
            const queryPromise = this.db.collection('horarios')
                .where('tipoBloque', '==', this.config.tipoBloque)
                .where('asesorId', '==', this.config.asesor.id)
                .get();
            
            const snapshot = await Promise.race([queryPromise, timeoutPromise]);
            
            const duration = Date.now() - startTime;
            console.log(`⏱️ Consulta background completada en ${duration}ms`);
            console.log('📊 Horarios encontrados:', snapshot.size);
            
            if (snapshot.size > 0) {
                this.existingSchedules = [];
                snapshot.forEach((doc, index) => {
                    console.log(`📄 Horario ${index + 1}:`, doc.id);
                    this.existingSchedules.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                
                // Actualizar la interfaz con los horarios encontrados
                this.config.horarios = [...this.existingSchedules];
                this.renderHorarios();
                this.updateHoursCounter();
                
                this.showNotification(
                    `✅ Se encontraron ${this.existingSchedules.length} horarios existentes`, 
                    'success'
                );
            } else {
                console.log('ℹ️ No se encontraron horarios existentes');
                this.showNotification('Sin horarios previos. Puedes agregar nuevos horarios.', 'info');
            }
            
            console.log('✅ === FIN CARGA BACKGROUND EXITOSA ===');
            
        } catch (error) {
            console.warn('⚠️ === ERROR EN CARGA BACKGROUND ===');
            console.warn('⚠️ Error:', error.message);
            
            // Mensajes suaves, sin alarmar al usuario
            if (error.message.includes('TIMEOUT')) {
                console.log('⏱️ Timeout en carga background - continuando normalmente');
                this.showNotification('Listo para configurar horarios', 'info');
            } else if (error.message.includes('indexes')) {
                console.log('📊 Problema de índices - continuando sin horarios existentes');
                this.showNotification('Listo para agregar nuevos horarios', 'info');
            } else {
                console.log('🔄 Error general en carga - continuando normalmente');
                this.showNotification('Puedes agregar horarios nuevos', 'info');
            }
            
            // La interfaz ya está lista para usar, no hay problema
            console.log('✅ Interfaz lista para usar sin horarios existentes');
        }
    }

    nextStep() {
        if (!this.validateCurrentStep()) {
            return;
        }

        if (this.currentStep < this.totalSteps) {
            this.currentStep++;
            this.updateStepDisplay();
            
            // Load existing schedules when reaching step 3 (final step)
            if (this.currentStep === 3) {
                // ✅ CAMBIO: No bloquear la interfaz
                this.initializeStep3();
            }
        }
    }

    initializeStep3() {
        console.log('🚀 Inicializando paso 3 (no bloqueante)...');
        
        // Mostrar interfaz inmediatamente (sin horarios)
        this.config.horarios = [];
        this.renderHorarios();
        this.updateHoursCounter();
        
        // Mostrar mensaje informativo pequeño
        this.showNotification('Revisando horarios existentes...', 'info');
        
        // Cargar horarios existentes en background (no bloqueante)
        this.loadExistingSchedulesInBackground();
    }

    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateStepDisplay();
        }
    }

    validateCurrentStep() {
        switch (this.currentStep) {
            case 1:
                if (!this.config.tipoBloque) {
                    this.showNotification('Selecciona un tipo/bloque de horario', 'warning');
                    return false;
                }
                break;
            case 2:
                if (!this.config.asesor) {
                    this.showNotification('Selecciona un asesor', 'warning');
                    return false;
                }
                break;
            case 3:
                // En el paso 3 no validamos porque el usuario puede estar agregando horarios
                break;
        }
        return true;
    }

    updateStepDisplay() {
        // Update step indicators
        document.querySelectorAll('.step-item').forEach((item, index) => {
            const stepNumber = index + 1;
            item.classList.remove('active', 'completed');
            
            if (stepNumber === this.currentStep) {
                item.classList.add('active');
            } else if (stepNumber < this.currentStep) {
                item.classList.add('completed');
            }
        });

        // Update step lines
        document.querySelectorAll('.step-line').forEach((line, index) => {
            line.classList.toggle('active', index < this.currentStep - 1);
        });

        // Show/hide step content
        document.querySelectorAll('.step-content').forEach((content, index) => {
            content.classList.toggle('active', index + 1 === this.currentStep);
        });

        // Update navigation buttons
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const confirmBtn = document.getElementById('confirmBtn');

        prevBtn.style.display = this.currentStep > 1 ? 'block' : 'none';
        nextBtn.style.display = this.currentStep < this.totalSteps ? 'block' : 'none';
        confirmBtn.style.display = this.currentStep === this.totalSteps ? 'block' : 'none';
    }

    // ========================================
    // STEP 1: TIPO/BLOQUE SELECTION
    // ========================================

    selectTipoBloque(card) {
        // Remove previous selections
        document.querySelectorAll('#step-1 .option-card').forEach(c => c.classList.remove('selected'));
        
        // Select current card
        card.classList.add('selected');
        this.config.tipoBloque = card.getAttribute('data-value');
        
        this.showNotification(`Tipo/Bloque seleccionado: ${card.querySelector('h5').textContent}`, 'success');
        
        console.log('📋 Tipo/Bloque seleccionado:', this.config.tipoBloque);
    }

    // ========================================
    // STEP 2: ASESOR SELECTION
    // ========================================

    selectAsesor(card) {
        // Remove previous selections
        document.querySelectorAll('.asesor-card').forEach(c => c.classList.remove('selected'));
        
        // Select current card
        card.classList.add('selected');
        const asesorId = card.getAttribute('data-asesor-id');
        this.config.asesor = this.asesores.find(a => a.id === asesorId);
        
        this.showNotification(`Asesor seleccionado: ${this.config.asesor.nombreHorario}`, 'success');
        
        console.log('👤 Asesor seleccionado:', this.config.asesor);
    }
    
    // ========================================
    // STEP 3: CONFIGURACIÓN COMPLETA
    // ========================================

    selectSala(card) {
        document.querySelectorAll('.sala-card-compact').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.config.sala = card.getAttribute('data-sala');
        
        this.showNotification(`Sala seleccionada: ${this.config.sala}`, 'success');
        console.log('🏢 Sala seleccionada:', this.config.sala);
    }

    selectPosicion(card) {
        document.querySelectorAll('.posicion-card-compact').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.config.posicion = card.getAttribute('data-posicion');
        
        this.showNotification(`Posición seleccionada: ${this.config.posicion}`, 'success');
        console.log('📍 Posición seleccionada:', this.config.posicion);
    }

    async loadExistingSchedules() {
        // Delegar completamente al método no bloqueante
        await this.loadExistingSchedulesInBackground();
    }

    addHorario() {
        // Validate that location is selected
        if (!this.config.sala || !this.config.posicion) {
            this.showNotification('Selecciona sala y posición primero', 'warning');
            return;
        }
        
        const diasSeleccionados = this.getSelectedDays();
        const horaInicio = document.getElementById('horaInicio').value;
        const horaFinal = document.getElementById('horaFinal').value;
        
        if (diasSeleccionados.length === 0) {
            this.showNotification('Selecciona al menos un día de la semana', 'warning');
            return;
        }
        
        if (!horaInicio || !horaFinal) {
            this.showNotification('Selecciona hora de inicio y final', 'warning');
            return;
        }
        
        if (horaInicio >= horaFinal) {
            this.showNotification('La hora de inicio debe ser menor que la hora final', 'warning');
            return;
        }
        
        // Calculate hours
        const hours = this.calculateHours(horaInicio, horaFinal);
        
        // Create horario object
        const nuevoHorario = {
            id: `temp_${Date.now()}`,
            tipoBloque: this.config.tipoBloque,
            asesorId: this.config.asesor.id,
            nombreHorario: this.config.asesor.nombreHorario,
            numeroCuenta: this.config.asesor.numeroCuenta || null,
            sala: this.config.sala,
            posicion: this.config.posicion,
            dias: diasSeleccionados,
            horaInicio: horaInicio,
            horaFinal: horaFinal,
            horas: hours,
            fechaCreacion: new Date(),
            isNew: true
        };
        
        this.config.horarios.push(nuevoHorario);
        this.renderHorarios();
        this.updateHoursCounter();
        this.clearHorarioForm();
        
        this.showNotification(`Horario agregado: ${hours} horas`, 'success');
    }

    getSelectedDays() {
        const dias = [];
        ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'].forEach(dia => {
            if (document.getElementById(dia).checked) {
                dias.push(dia);
            }
        });
        return dias;
    }

    calculateHours(inicio, final) {
        const [inicioHour, inicioMin] = inicio.split(':').map(Number);
        const [finalHour, finalMin] = final.split(':').map(Number);
        
        const inicioMinutes = inicioHour * 60 + inicioMin;
        const finalMinutes = finalHour * 60 + finalMin;
        
        return (finalMinutes - inicioMinutes) / 60;
    }

    renderHorarios() {
        const list = document.getElementById('horariosList');
        
        if (this.config.horarios.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-calendar-x"></i>
                    <p>No hay horarios configurados</p>
                    <small>Selecciona ubicación, días y horarios para comenzar</small>
                </div>
            `;
            return;
        }
        
        list.innerHTML = this.config.horarios.map((horario, index) => `
            <div class="horario-item" data-index="${index}">
                <div class="horario-info">
                    <h6>${this.formatDays(horario.dias)} • ${this.formatTimeDisplay(horario.horaInicio)} - ${this.formatTimeDisplay(horario.horaFinal)}</h6>
                    <p>${horario.sala} • ${this.capitalizeFirst(horario.posicion)} • ${horario.horas}h × ${horario.dias.length} días = ${(horario.horas * horario.dias.length).toFixed(1)}h total</p>
                </div>
                <div class="horario-actions">
                    <span class="horario-badge">${(horario.horas * horario.dias.length).toFixed(1)}h</span>
                    <button class="btn-remove" onclick="horariosManager.removeHorario(${index})" title="Eliminar horario">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    removeHorario(index) {
        const horario = this.config.horarios[index];
        this.config.horarios.splice(index, 1);
        this.renderHorarios();
        this.updateHoursCounter();
        
        this.showNotification(`Horario eliminado: ${horario.horas} horas`, 'warning');
    }

    clearAllHorarios() {
        if (this.config.horarios.length === 0) {
            this.showNotification('No hay horarios para limpiar', 'info');
            return;
        }
        
        const confirmed = confirm('¿Estás seguro de que deseas eliminar todos los horarios?');
        if (confirmed) {
            this.config.horarios = [];
            this.renderHorarios();
            this.updateHoursCounter();
            this.showNotification('Todos los horarios han sido eliminados', 'warning');
        }
    }

    updateHoursCounter() {
        const totalHours = this.config.horarios.reduce((total, horario) => {
            return total + (horario.horas * horario.dias.length);
        }, 0);
        
        document.getElementById('totalHours').textContent = totalHours.toFixed(1);
    }

    clearHorarioForm() {
        // Clear day checkboxes
        ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'].forEach(dia => {
            document.getElementById(dia).checked = false;
        });
        
        // Reset time selectors
        document.getElementById('horaInicio').selectedIndex = 0;
        document.getElementById('horaFinal').selectedIndex = 1;
    }

    formatDays(dias) {
        const dayNames = {
            lunes: 'L',
            martes: 'M',
            miercoles: 'X',
            jueves: 'J',
            viernes: 'V'
        };
        return dias.map(dia => dayNames[dia]).join(', ');
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // ========================================
    // CONFIRMATION AND SAVING
    // ========================================

    showConfirmationModal() {
        if (this.config.horarios.length === 0) {
            this.showNotification('Agrega al menos un horario antes de confirmar', 'warning');
            return;
        }
        
        if (!this.config.sala || !this.config.posicion) {
            this.showNotification('Selecciona sala y posición antes de confirmar', 'warning');
            return;
        }
        
        this.renderConfirmationSummary();
        const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
        modal.show();
    }

    renderConfirmationSummary() {
        const summary = document.getElementById('confirmationSummary');
        const totalHours = this.config.horarios.reduce((total, horario) => {
            return total + (horario.horas * horario.dias.length);
        }, 0);
        
        const newHorarios = this.config.horarios.filter(h => h.isNew);
        const existingHorarios = this.config.horarios.filter(h => !h.isNew);
        
        summary.innerHTML = `
            <div class="summary-item">
                <span class="summary-label">Asesor:</span>
                <span class="summary-value">${this.config.asesor.nombreHorario}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Número de Cuenta:</span>
                <span class="summary-value">${this.config.asesor.numeroCuenta || 'No especificado'}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Tipo/Bloque:</span>
                <span class="summary-value">${this.config.tipoBloque}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Ubicación:</span>
                <span class="summary-value">${this.config.sala} - ${this.capitalizeFirst(this.config.posicion)}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Horarios Existentes:</span>
                <span class="summary-value">${existingHorarios.length}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Horarios Nuevos:</span>
                <span class="summary-value">${newHorarios.length}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Total de Horas:</span>
                <span class="summary-value">${totalHours.toFixed(1)} horas</span>
            </div>
        `;
    }

    async saveHorarios() {
        try {
            // Mostrar notificación en lugar de modal
            this.showNotification('Guardando horarios...', 'info');
            
            // Deshabilitar botón para evitar doble click
            const confirmBtn = document.getElementById('finalConfirmBtn');
            const originalText = confirmBtn.innerHTML;
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Guardando...';
            
            const batch = this.db.batch();
            const newHorarios = this.config.horarios.filter(h => h.isNew);
            
            // Delete existing schedules for this asesor and tipoBloque
            const existingSnapshot = await this.db.collection('horarios')
                .where('tipoBloque', '==', this.config.tipoBloque)
                .where('asesorId', '==', this.config.asesor.id)
                .get();
            
            existingSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            // Add new schedules
            this.config.horarios.forEach(horario => {
                const docRef = this.db.collection('horarios').doc();
                const horarioData = {
                    tipoBloque: horario.tipoBloque,
                    asesorId: horario.asesorId,
                    nombreHorario: horario.nombreHorario,
                    numeroCuenta: horario.numeroCuenta,
                    sala: horario.sala,
                    posicion: horario.posicion,
                    dias: horario.dias,
                    horaInicio: horario.horaInicio,
                    horaFinal: horario.horaFinal,
                    horas: horario.horas,
                    fechaCreacion: new Date(),
                    fechaModificacion: new Date(),
                    creadoPor: this.currentUser.email
                };
                batch.set(docRef, horarioData);
            });
            
            await batch.commit();
            
            // Restaurar botón
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = originalText;
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('confirmModal'));
            modal.hide();
            
            this.showNotification('Horarios guardados exitosamente', 'success');
            
            // Reset form
            this.resetForm();
            
            // Reload statistics
            await this.loadStatistics();
            
        } catch (error) {
            console.error('❌ Error guardando horarios:', error);
            
            // Restaurar botón en caso de error
            const confirmBtn = document.getElementById('finalConfirmBtn');
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i class="bi bi-save me-2"></i>Guardar Horarios';
            
            this.showNotification('Error al guardar horarios', 'error');
        }
    }

    resetForm() {
        this.config = {
            tipoBloque: null,
            asesor: null,
            sala: null,
            posicion: null,
            horarios: []
        };
        
        this.currentStep = 1;
        this.updateStepDisplay();
        
        // Clear selections
        document.querySelectorAll('.option-card, .asesor-card, .sala-card-compact, .posicion-card-compact').forEach(card => {
            card.classList.remove('selected');
        });
        
        this.clearHorarioForm();
        this.renderHorarios();
        this.updateHoursCounter();
        
        document.getElementById('asesorSearch').value = '';
        this.renderAsesores();
    }

    // ========================================
    // STATISTICS AND MISSING ADVISORS
    // ========================================

    async showMissingAdvisors(blockType) {
        try {
            // Mostrar notificación ligera en lugar de modal de carga
            this.showNotification('Cargando asesores faltantes...', 'info');
            
            const snapshot = await this.db.collection('horarios')
                .where('tipoBloque', '==', blockType)
                .get();
            
            const assignedAsesorIds = new Set();
            snapshot.forEach(doc => {
                assignedAsesorIds.add(doc.data().asesorId);
            });
            
            const missingAsesores = this.asesores.filter(asesor => 
                !assignedAsesorIds.has(asesor.id)
            );
            
            this.renderMissingAdvisors(missingAsesores, blockType);
            
            const modal = new bootstrap.Modal(document.getElementById('missingAdvisorsModal'));
            modal.show();
            
            this.showNotification('Datos cargados correctamente', 'success');
            
        } catch (error) {
            console.error('❌ Error cargando asesores faltantes:', error);
            this.showNotification('Error cargando datos', 'error');
        }
    }

    renderMissingAdvisors(missingAsesores, blockType) {
        const list = document.getElementById('missingAdvisorsList');
        const modalTitle = document.querySelector('#missingAdvisorsModal .modal-title');
        
        modalTitle.innerHTML = `<i class="bi bi-person-x me-2"></i>Asesores Sin Horario - ${blockType}`;
        
        if (missingAsesores.length === 0) {
            list.innerHTML = `
                <div class="text-center p-4">
                    <i class="bi bi-check-circle text-success" style="font-size: 3rem;"></i>
                    <p class="text-success mt-2">Todos los asesores tienen horarios asignados</p>
                </div>
            `;
            return;
        }
        
        list.innerHTML = missingAsesores.map(asesor => `
            <div class="missing-advisor-item">
                <div class="missing-advisor-avatar">
                    ${this.getInitials(asesor.nombreHorario || 'Sin Nombre')}
                </div>
                <div class="missing-advisor-info">
                    <h6>${asesor.nombreHorario || 'Sin nombre'}</h6>
                    <p>${asesor.numeroCuenta || 'Sin número de cuenta'}</p>
                    <small class="text-muted">${asesor.email || 'Sin email'}</small>
                </div>
            </div>
        `).join('');
    }

    confirmDeleteBlock(blockType) {
        document.getElementById('blockToDelete').textContent = blockType;
        const modal = new bootstrap.Modal(document.getElementById('deleteBlockModal'));
        modal.show();
        
        // Store block type for deletion
        this.blockToDelete = blockType;
    }

    async deleteBlock() {
        try {
            // Mostrar notificación en lugar de modal
            this.showNotification('Eliminando horarios del bloque...', 'info');
            
            // Deshabilitar botón
            const deleteBtn = document.getElementById('confirmDeleteBlock');
            const originalText = deleteBtn.innerHTML;
            deleteBtn.disabled = true;
            deleteBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Eliminando...';
            
            const snapshot = await this.db.collection('horarios')
                .where('tipoBloque', '==', this.blockToDelete)
                .get();
            
            const batch = this.db.batch();
            snapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            await batch.commit();
            
            // Restaurar botón
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = originalText;
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('deleteBlockModal'));
            modal.hide();
            
            this.showNotification(`Bloque ${this.blockToDelete} eliminado exitosamente`, 'success');
            
            // Reload statistics
            await this.loadStatistics();
            
        } catch (error) {
            console.error('❌ Error eliminando bloque:', error);
            
            // Restaurar botón en caso de error
            const deleteBtn = document.getElementById('confirmDeleteBlock');
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = '<i class="bi bi-trash me-2"></i>Eliminar Bloque';
            
            this.showNotification('Error al eliminar bloque', 'error');
        }
    }

    // ========================================
    // UTILITY METHODS (SIN MODALES DE CARGA)
    // ========================================

    showNotification(title, type = 'info', message = '') {
        if (window.modernNav && window.modernNav.showModernNotification) {
            const icons = {
                success: 'bi-check-circle-fill',
                error: 'bi-x-circle-fill',
                warning: 'bi-exclamation-triangle-fill',
                info: 'bi-info-circle-fill'
            };
            
            window.modernNav.showModernNotification(
                title,
                message,
                type,
                icons[type]
            );
        } else {
            console.log(`${type.toUpperCase()}: ${title} - ${message}`);
        }
    }

    openTablaMode(blockType) {
        // Construir la URL con el parámetro del tipo de bloque
        const url = `tabla-horarios.html?tipo=${encodeURIComponent(blockType)}`;
        
        // Abrir en nueva pestaña
        window.open(url, '_blank');
        
        this.showNotification(`Abriendo modo tabla para ${blockType}`, 'info');
    }
}

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    const checkFirebase = setInterval(() => {
        if (window.firebase && window.firebaseDB && window.firebaseAuth) {
            clearInterval(checkFirebase);
            
            window.horariosManager = new HorariosAsesorManager();
            
            console.log('🚀 Sistema de gestión de horarios cargado');
        }
    }, 100);
    
    setTimeout(() => {
        clearInterval(checkFirebase);
        if (!window.horariosManager) {
            console.error('❌ No se pudo inicializar el sistema');
            
            const mainContent = document.getElementById('main-content');
            if (mainContent) {
                mainContent.innerHTML = `
                    <div class="container">
                        <div class="alert alert-danger text-center">
                            <i class="bi bi-exclamation-triangle-fill me-2"></i>
                            <strong>Error de Sistema</strong><br>
                            No se pudo conectar con la base de datos. Verifique su conexión.
                            <div class="mt-3">
                                <button class="btn btn-outline-danger" onclick="location.reload()">
                                    <i class="bi bi-arrow-clockwise me-1"></i>Recargar
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }
        }
    }, 10000);
});

// Handle global errors
window.addEventListener('error', (event) => {
    console.error('❌ Error global en horarios-asesores:', event.error);
    
    if (window.horariosManager) {
        window.horariosManager.showNotification(
            'Error del Sistema',
            'error',
            'Se produjo un error inesperado. Recargue la página si persiste.'
        );
    }
});

// Export for global use
window.HorariosAsesorManager = HorariosAsesorManager;