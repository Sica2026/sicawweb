// servicio-social.js

class ServicioSocialManager {
    constructor() {
        this.db = null;
        this.auth = null;
        this.storage = null;
        this.currentUser = null;
        this.asesores = [];
        this.servicioSocialData = [];
        this.filteredAsesores = [];
        this.currentAsesor = null;
        this.categoryCounts = {
            'pendientes': 0,
            'ya-registro': 0,
            'en-proceso': 0,
            'sin-creditos': 0,
            'terminado': 0,
            'cancelado': 0
        };
        
        this.init();
    }

    async init() {
        try {
            console.log('🚀 Inicializando ServicioSocialManager...');
            
            // Configurar página
            this.setupPage();
            
            // Verificar autenticación
            await this.checkAuthentication();
            
            // Configurar Firebase
            this.setupFirebase();
            
            // Configurar eventos
            this.setupEventListeners();
            
            // Cargar datos
            await this.loadData();
            
            console.log('✅ ServicioSocialManager inicializado correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando ServicioSocialManager:', error);
            this.showNotification('Error al cargar el sistema', 'error');
        }
    }

    setupPage() {
        if (window.SICAComponents) {
            window.SICAComponents.setPageTitle('Servicio Social - SICA Administrativo');
        } else {
            document.title = 'Servicio Social - SICA Administrativo';
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
                            window.location.href = '../login.html';
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
        if (window.firebaseStorage) this.storage = window.firebaseStorage;
        
        if (!this.db || !this.auth) {
            throw new Error('Firebase no está completamente inicializado');
        }
        
        console.log('🔥 Firebase configurado correctamente');
    }

    setupEventListeners() {
        // Búsqueda
        const searchInput = document.getElementById('searchInput');
        const clearSearch = document.getElementById('clearSearch');
        
        searchInput?.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
            this.updateClearButton(e.target.value);
        });
        
        clearSearch?.addEventListener('click', () => {
            searchInput.value = '';
            this.handleSearch('');
            this.updateClearButton('');
        });

        // Filtros
        document.getElementById('escuelaFilter')?.addEventListener('change', () => {
            this.handleFilter();
        });
        
        document.getElementById('carreraFilter')?.addEventListener('change', () => {
            this.handleFilter();
        });
        
        document.getElementById('resetFilters')?.addEventListener('click', () => {
            this.resetFilters();
        });

        // Acordeón
        document.querySelectorAll('.accordion-header').forEach(header => {
            header.addEventListener('click', () => {
                this.toggleAccordion(header);
            });
        });

        // Modal de asignación
        document.getElementById('confirmarAsignacion')?.addEventListener('click', () => {
            this.confirmarAsignacionEstado();
        });

        // Eventos para selección de estado
        document.querySelectorAll('input[name="estadoAsignacion"]').forEach(radio => {
            radio.addEventListener('change', () => {
                this.handleEstadoSelection();
            });
        });

        document.querySelectorAll('.estado-option').forEach(option => {
            option.addEventListener('click', () => {
                const radio = option.querySelector('input[type="radio"]');
                if (radio) {
                    radio.checked = true;
                    this.handleEstadoSelection();
                }
            });
        });

        // Modal form
        const form = document.getElementById('servicioSocialForm');
        form?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveServicioSocial();
        });

        // Botón guardar
        document.getElementById('guardarCambios')?.addEventListener('click', () => {
            this.saveServicioSocial();
        });

        // File uploads
        this.setupFileUploads();

        // Horas calculation
        document.getElementById('horasAsesor')?.addEventListener('input', () => {
            this.calculateTotalHoras();
        });
        
        document.getElementById('horasServicioSocial')?.addEventListener('input', () => {
            this.calculateTotalHoras();
        });

        // Document generation
        document.querySelectorAll('[data-doc]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.generateDocument(btn.getAttribute('data-doc'));
            });
        });

        console.log('🎧 Event listeners configurados');

        // Auto-calcular fecha de término
        document.getElementById('fechaInicio')?.addEventListener('change', () => {
            this.autoCalculateFechaTermino();
        });

        // Auto-generar folios cuando se asigna estado
        document.getElementById('estadoTermino')?.addEventListener('change', () => {
            this.autoGenerateFolios();
        });
    }

    setupFileUploads() {
        const fileInputs = ['cartaPresentacion', 'cartaAceptacion', 'cartaTermino', 'reporteSS'];
        
        fileInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('change', (e) => {
                    this.handleFileUpload(e, inputId);
                });
            }
        });
    }

    async loadData() {
        try {
            this.showLoading(true);
            
            console.log('📊 Cargando datos de asesores y servicio social...');
            
            // Cargar asesores
            await this.loadAsesores();
            
            // Cargar datos de servicio social
            await this.loadServicioSocialData();
            
            // Combinar datos
            this.combineData();
            
            // Cargar carreras para el filtro
            this.loadCarrerasFilter();
            
            // Renderizar UI
            this.renderAsesores();
            this.updateStats();
            
            this.showLoading(false);
            
            console.log('✅ Datos cargados exitosamente');
            
        } catch (error) {
            console.error('❌ Error cargando datos:', error);
            this.showNotification('Error al cargar los datos', 'error');
            this.showLoading(false);
        }
    }

    async loadAsesores() {
        if (!this.db) return;
        
        try {
            // Filtrar solo asesores con servicioSocial: true
            const snapshot = await this.db.collection('asesores')
                .where('estado', '==', 'aprobado')
                .where('servicioSocial', '==', true)
                .get();
            
            this.asesores = [];
            snapshot.forEach(doc => {
                this.asesores.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            console.log(`📋 ${this.asesores.length} asesores con servicio social cargados`);
            
        } catch (error) {
            console.error('Error cargando asesores:', error);
            throw error;
        }
    }

    async loadServicioSocialData() {
        if (!this.db) return;
        
        try {
            const snapshot = await this.db.collection('serviciosocial').get();
            
            this.servicioSocialData = [];
            snapshot.forEach(doc => {
                this.servicioSocialData.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            console.log(`📋 ${this.servicioSocialData.length} registros de servicio social cargados`);
            
        } catch (error) {
            console.error('Error cargando servicio social:', error);
            // No es crítico si no hay datos de servicio social
        }
    }

    combineData() {
        this.asesores = this.asesores.map(asesor => {
            const servicioData = this.servicioSocialData.find(ss => ss.asesorId === asesor.id);
            return {
                ...asesor,
                servicioSocial: servicioData || {
                    estadoTermino: null, // null indica que no tiene estado asignado
                    fechaInicio: '',
                    fechaTermino: '',
                    clavePrograma: '',
                    folioAceptacion: '',
                    folioTermino: '',
                    fechaEntregaCarta: '',
                    horasAsesor: 0,
                    horasServicioSocial: 0,
                    totalHoras: 0,
                    cartaPresentacion: null,
                    cartaAceptacion: null,
                    cartaTermino: null,
                    reporteSS: null
                }
            };
        });
        
        this.filteredAsesores = [...this.asesores];
    }

    loadCarrerasFilter() {
        const carreras = [...new Set(this.asesores.map(a => a.carrera).filter(Boolean))];
        const select = document.getElementById('carreraFilter');
        
        if (select) {
            // Limpiar opciones existentes (excepto la primera)
            while (select.children.length > 1) {
                select.removeChild(select.lastChild);
            }
            
            carreras.forEach(carrera => {
                const option = document.createElement('option');
                option.value = carrera;
                option.textContent = carrera;
                select.appendChild(option);
            });
        }
    }

    handleSearch(query) {
        if (!query.trim()) {
            this.filteredAsesores = [...this.asesores];
        } else {
            const searchTerm = query.toLowerCase();
            this.filteredAsesores = this.asesores.filter(asesor => {
                return (
                    asesor.nombre?.toLowerCase().includes(searchTerm) ||
                    asesor.apellidoPaterno?.toLowerCase().includes(searchTerm) ||
                    asesor.apellidoMaterno?.toLowerCase().includes(searchTerm) ||
                    asesor.numeroCuenta?.toString().includes(searchTerm) ||
                    asesor.escuela?.toLowerCase().includes(searchTerm) ||
                    asesor.carrera?.toLowerCase().includes(searchTerm)
                );
            });
        }
        
        this.applyFilters();
        this.renderAsesores();
        this.updateStats();
    }

    handleFilter() {
        this.applyFilters();
        this.renderAsesores();
        this.updateStats();
    }

    applyFilters() {
        const escuelaFilter = document.getElementById('escuelaFilter')?.value;
        const carreraFilter = document.getElementById('carreraFilter')?.value;
        
        let filtered = [...this.filteredAsesores];
        
        if (escuelaFilter) {
            filtered = filtered.filter(asesor => asesor.escuela === escuelaFilter);
        }
        
        if (carreraFilter) {
            filtered = filtered.filter(asesor => asesor.carrera === carreraFilter);
        }
        
        this.filteredAsesores = filtered;
    }

    resetFilters() {
        document.getElementById('searchInput').value = '';
        document.getElementById('escuelaFilter').value = '';
        document.getElementById('carreraFilter').value = '';
        
        this.filteredAsesores = [...this.asesores];
        this.renderAsesores();
        this.updateStats();
        this.updateClearButton('');
    }

    updateClearButton(value) {
        const clearBtn = document.getElementById('clearSearch');
        if (clearBtn) {
            if (value) {
                clearBtn.classList.add('show');
            } else {
                clearBtn.classList.remove('show');
            }
        }
    }

    renderAsesores() {
        // Agrupar por estado, incluyendo pendientes
        const groups = {
            'pendientes': [],
            'ya-registro': [],
            'en-proceso': [],
            'sin-creditos': [],
            'terminado': [],
            'cancelado': []
        };
        
        this.filteredAsesores.forEach(asesor => {
            const estado = asesor.servicioSocial.estadoTermino;
            
            // Si no tiene estado asignado, va a pendientes
            if (!estado || estado === null || estado === undefined) {
                groups['pendientes'].push(asesor);
            } else if (groups[estado]) {
                groups[estado].push(asesor);
            }
        });
        
        // Renderizar cada grupo
        Object.keys(groups).forEach(estado => {
            this.renderGroup(estado, groups[estado]);
        });
        
        // Mostrar/ocultar estados vacíos
        this.toggleEmptyStates();
    }

    renderGroup(estado, asesores) {
        const container = document.querySelector(`#content-${estado} .cards-grid`);
        if (!container) return;
        
        container.innerHTML = '';
        
        asesores.forEach((asesor, index) => {
            const card = this.createAsesorCard(asesor, index);
            container.appendChild(card);
        });
        
        // Actualizar contador
        const countElement = document.getElementById(`count-${estado}`);
        if (countElement) {
            countElement.textContent = `${asesores.length} ${asesores.length === 1 ? 'asesor' : 'asesores'}`;
        }
        
        this.categoryCounts[estado] = asesores.length;
    }

    createAsesorCard(asesor, index) {
        const card = document.createElement('div');
        const isPending = !asesor.servicioSocial.estadoTermino;
        
        card.className = `asesor-card fade-in-up ${isPending ? 'pending-card' : ''}`;
        card.style.animationDelay = `${index * 0.1}s`;
        card.setAttribute('data-asesor-id', asesor.id);
        
        const nombreCompleto = `${asesor.nombre || ''} ${asesor.apellidoPaterno || ''} ${asesor.apellidoMaterno || ''}`.trim();
        const fotoUrl = asesor.fotoUrl || '../image/default-avatar.png';
        const estado = asesor.servicioSocial.estadoTermino;
        
        let cardContent = `
            <img src="${fotoUrl}" alt="${nombreCompleto}" class="card-avatar" 
                 onerror="this.src='../image/default-avatar.png'">
            <h5 class="card-name">${nombreCompleto}</h5>
            <div class="card-cuenta">${asesor.numeroCuenta || 'Sin número'}</div>
            <div class="card-info">
                <div class="card-detail">
                    <i class="bi bi-building"></i>
                    <span>${asesor.escuela || 'Sin escuela'}</span>
                </div>
                <div class="card-detail">
                    <i class="bi bi-mortarboard"></i>
                    <span>${asesor.carrera || 'Sin carrera'}</span>
                </div>
                <div class="card-detail">
                    <i class="bi bi-graph-up"></i>
                    <span>${asesor.avance || 'Sin avance'}</span>
                </div>
        `;
        
        if (isPending) {
            cardContent += `
                </div>
                <div class="pending-badge">Sin Asignar</div>
                <div class="pending-prompt">Clic para asignar estado</div>
            `;
        } else {
            cardContent += `
                ${asesor.servicioSocial.totalHoras > 0 ? `
                <div class="card-detail">
                    <i class="bi bi-clock"></i>
                    <span>${asesor.servicioSocial.totalHoras} horas</span>
                </div>
                ` : ''}
                </div>
                <div class="status-badge status-${estado}">
                    ${this.getEstadoLabel(estado)}
                </div>
            `;
        }
        
        card.innerHTML = cardContent;
        
        // Evento click diferente para pendientes
        card.addEventListener('click', () => {
            if (isPending) {
                this.openAssignmentModal(asesor);
            } else {
                this.openModal(asesor);
            }
        });
        
        // Soporte para teclado
        card.setAttribute('tabindex', '0');
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (isPending) {
                    this.openAssignmentModal(asesor);
                } else {
                    this.openModal(asesor);
                }
            }
        });
        
        return card;
    }

    getEstadoLabel(estado) {
        const labels = {
            'ya-registro': 'Registrado',
            'en-proceso': 'En Proceso',
            'sin-creditos': 'Sin Créditos',
            'terminado': 'Terminado',
            'cancelado': 'Cancelado'
        };
        return labels[estado] || 'Pendiente';
    }

    // ========================================
    // MODAL DE ASIGNACIÓN
    // ========================================

    openAssignmentModal(asesor) {
        this.currentAsesor = asesor;
        this.populateAssignmentModal(asesor);
        
        const modal = new bootstrap.Modal(document.getElementById('asignacionModal'));
        modal.show();
    }

    populateAssignmentModal(asesor) {
        const nombreCompleto = `${asesor.nombre || ''} ${asesor.apellidoPaterno || ''} ${asesor.apellidoMaterno || ''}`.trim();
        
        // Header
        document.getElementById('asignacionFoto').src = asesor.fotoUrl || '../image/default-avatar.png';
        document.getElementById('asignacionFoto').onerror = (e) => e.target.src = '../image/default-avatar.png';
        document.getElementById('asignacionSubtitle').textContent = `${nombreCompleto} • ${asesor.numeroCuenta || 'Sin número'}`;
        
        // Limpiar selección anterior
        document.querySelectorAll('input[name="estadoAsignacion"]').forEach(radio => {
            radio.checked = false;
        });
        
        document.querySelectorAll('.estado-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        // Deshabilitar botón
        document.getElementById('confirmarAsignacion').disabled = true;
    }

    handleEstadoSelection() {
        const selectedRadio = document.querySelector('input[name="estadoAsignacion"]:checked');
        
        // Actualizar estilos visuales
        document.querySelectorAll('.estado-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        if (selectedRadio) {
            const selectedOption = selectedRadio.closest('.estado-option');
            selectedOption.classList.add('selected');
            
            // Habilitar botón
            document.getElementById('confirmarAsignacion').disabled = false;
        } else {
            // Deshabilitar botón
            document.getElementById('confirmarAsignacion').disabled = true;
        }
    }

    async confirmarAsignacionEstado() {
        const selectedRadio = document.querySelector('input[name="estadoAsignacion"]:checked');
        
        if (!selectedRadio || !this.currentAsesor) {
            this.showNotification('Selecciona un estado', 'warning');
            return;
        }
        
        try {
            this.showLoadingModal('Asignando estado...');
            
            const nuevoEstado = selectedRadio.value;
            
            // Crear registro inicial en Firestore
            const servicioData = {
                asesorId: this.currentAsesor.id,
                estadoTermino: nuevoEstado,
                fechaInicio: '',
                fechaTermino: '',
                clavePrograma: '',
                folioAceptacion: '',
                folioTermino: '',
                fechaEntregaCarta: '',
                horasAsesor: 0,
                horasServicioSocial: 0,
                totalHoras: 0,
                cartaPresentacion: null,
                cartaAceptacion: null,
                cartaTermino: null,
                reporteSS: null,
                fechaCreacion: new Date(),
                fechaActualizacion: new Date()
            };
            
            // Guardar en Firestore
            const docRef = this.db.collection('serviciosocial').doc(this.currentAsesor.id);
            await docRef.set(servicioData);
            
            // Actualizar datos locales
            this.currentAsesor.servicioSocial = servicioData;
            
            // Actualizar array local
            const asesorIndex = this.asesores.findIndex(a => a.id === this.currentAsesor.id);
            if (asesorIndex !== -1) {
                this.asesores[asesorIndex].servicioSocial = servicioData;
            }
            
            // Agregar a servicioSocialData
            this.servicioSocialData.push(servicioData);
            
            // Cerrar modal
            bootstrap.Modal.getInstance(document.getElementById('asignacionModal')).hide();
            
            // Rerender
            this.renderAsesores();
            this.updateStats();
            
            this.showNotification(
                'Estado Asignado',
                `${this.currentAsesor.nombre} ha sido clasificado como "${this.getEstadoLabel(nuevoEstado)}"`,
                'success'
            );
            
        } catch (error) {
            console.error('Error asignando estado:', error);
            this.showNotification('Error al asignar estado', 'error');
        } finally {
            this.hideLoadingModal();
        }
    }

    // ========================================
    // MODAL DETALLADO
    // ========================================

    toggleEmptyStates() {
        Object.keys(this.categoryCounts).forEach(estado => {
            const accordion = document.querySelector(`[data-category="${estado}"]`)?.closest('.category-accordion');
            if (accordion) {
                if (this.categoryCounts[estado] === 0) {
                    accordion.style.opacity = '0.5';
                    accordion.style.pointerEvents = 'none';
                } else {
                    accordion.style.opacity = '1';
                    accordion.style.pointerEvents = 'auto';
                }
            }
        });
    }

    toggleAccordion(header) {
        const content = header.nextElementSibling;
        const isActive = header.classList.contains('active');
        
        // Cerrar todos los acordeones
        document.querySelectorAll('.accordion-header').forEach(h => {
            h.classList.remove('active');
            h.nextElementSibling.classList.remove('show');
        });
        
        if (!isActive) {
            header.classList.add('active');
            content.classList.add('show');
        }
    }

    openModal(asesor) {
        this.currentAsesor = asesor;
        this.populateModal(asesor);
        
        const modal = new bootstrap.Modal(document.getElementById('detalleModal'));
        modal.show();
    }

    populateModal(asesor) {
        // Header
        const modalFoto = document.getElementById('modalFoto');
        const modalTitle = document.getElementById('modalTitle');
        const modalSubtitle = document.getElementById('modalSubtitle');
        
        const nombreCompleto = `${asesor.nombre || ''} ${asesor.apellidoPaterno || ''} ${asesor.apellidoMaterno || ''}`.trim();
        
        if (modalFoto) {
            modalFoto.src = asesor.fotoUrl || '../image/default-avatar.png';
            modalFoto.onerror = () => modalFoto.src = '../image/default-avatar.png';
        }
        
        if (modalTitle) {
            modalTitle.textContent = `Servicio Social - ${nombreCompleto}`;
        }
        
        if (modalSubtitle) {
            modalSubtitle.textContent = `${asesor.escuela || ''} • ${asesor.carrera || ''}`;
        }
        
        // Información personal (solo lectura)
        this.setElementValue('nombreCompleto', nombreCompleto);
        this.setElementValue('numeroCuenta', asesor.numeroCuenta || '');
        this.setElementValue('escuela', asesor.escuela || '');
        this.setElementValue('carrera', asesor.carrera || '');
        this.setElementValue('avance', asesor.avance || '');
        
        // Historial académico
        const historialLink = document.getElementById('historialLink');
        if (historialLink) {
            if (asesor.documentos?.downloadURL) {
                historialLink.href = asesor.documentos.downloadURL;
                historialLink.style.display = 'flex';
            } else {
                historialLink.style.display = 'none';
            }
        }
        
        // Datos de servicio social
        const ss = asesor.servicioSocial;
        this.setElementValue('estadoTermino', ss.estadoTermino || '');
        this.setElementValue('fechaInicio', ss.fechaInicio || '');
        this.setElementValue('fechaTermino', ss.fechaTermino || '');
        this.setElementValue('clavePrograma', ss.clavePrograma || '');
        this.setElementValue('folioAceptacion', ss.folioAceptacion || '');
        this.setElementValue('folioTermino', ss.folioTermino || '');
        this.setElementValue('fechaEntregaCarta', ss.fechaEntregaCarta || '');
        this.setElementValue('horasAsesor', ss.horasAsesor || 0);
        this.setElementValue('horasServicioSocial', ss.horasServicioSocial || 0);
        this.setElementValue('totalHoras', ss.totalHoras || 0);
        
        // Archivos
        this.displayFileStatus('cartaPresentacion', ss.cartaPresentacion);
        this.displayFileStatus('cartaAceptacion', ss.cartaAceptacion);
        this.displayFileStatus('cartaTermino', ss.cartaTermino);
        this.displayFileStatus('reporteSS', ss.reporteSS);
    }

    setElementValue(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.value = value;
        }
    }

    displayFileStatus(inputId, fileData) {
        const container = document.getElementById(inputId)?.closest('.file-upload-area');
        if (!container) return;
        
        const display = container.querySelector('.file-upload-display');
        const current = container.querySelector('.file-current');
        
        if (fileData && fileData.url) {
            if (display) display.style.display = 'none';
            if (current) {
                current.style.display = 'flex';
                const fileName = current.querySelector('.file-name');
                if (fileName) {
                    fileName.textContent = fileData.name || 'Archivo cargado';
                }
                
                // Botón para eliminar
                const removeBtn = current.querySelector('.btn-file-remove');
                if (removeBtn) {
                    removeBtn.onclick = () => this.removeFile(inputId);
                }
            }
        } else {
            if (display) display.style.display = 'flex';
            if (current) current.style.display = 'none';
        }
    }

    handleFileUpload(event, inputId) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Validar tipo
        if (file.type !== 'application/pdf') {
            this.showNotification('Solo se permiten archivos PDF', 'warning');
            event.target.value = '';
            return;
        }
        
        // Validar tamaño (máximo 10MB)
        if (file.size > 10 * 1024 * 1024) {
            this.showNotification('El archivo no debe superar los 10MB', 'warning');
            event.target.value = '';
            return;
        }
        
        // Mostrar archivo seleccionado
        const container = event.target.closest('.file-upload-area');
        const display = container.querySelector('.file-upload-display');
        const current = container.querySelector('.file-current');
        
        if (display) display.style.display = 'none';
        if (current) {
            current.style.display = 'flex';
            const fileName = current.querySelector('.file-name');
            if (fileName) {
                fileName.textContent = file.name;
            }
        }
        
        // Guardar referencia del archivo
        if (!this.currentAsesor.servicioSocial.pendingFiles) {
            this.currentAsesor.servicioSocial.pendingFiles = {};
        }
        this.currentAsesor.servicioSocial.pendingFiles[inputId] = file;
    }

    removeFile(inputId) {
        const input = document.getElementById(inputId);
        const container = input?.closest('.file-upload-area');
        if (!container) return;
        
        const display = container.querySelector('.file-upload-display');
        const current = container.querySelector('.file-current');
        
        if (input) input.value = '';
        if (display) display.style.display = 'flex';
        if (current) current.style.display = 'none';
        
        // Marcar para eliminación
        if (!this.currentAsesor.servicioSocial.filesToDelete) {
            this.currentAsesor.servicioSocial.filesToDelete = [];
        }
        this.currentAsesor.servicioSocial.filesToDelete.push(inputId);
        
        // Remover de archivos pendientes
        if (this.currentAsesor.servicioSocial.pendingFiles) {
            delete this.currentAsesor.servicioSocial.pendingFiles[inputId];
        }
    }

    calculateTotalHoras() {
        const horasAsesor = parseFloat(document.getElementById('horasAsesor')?.value) || 0;
        const horasServicio = parseFloat(document.getElementById('horasServicioSocial')?.value) || 0;
        const total = horasAsesor + horasServicio;
        
        const totalElement = document.getElementById('totalHoras');
        if (totalElement) {
            totalElement.value = total;
        }
    }

    autoCalculateFechaTermino() {
        const fechaInicio = document.getElementById('fechaInicio')?.value;
        const fechaTerminoElement = document.getElementById('fechaTermino');
        
        if (fechaInicio && fechaTerminoElement) {
            const inicio = new Date(fechaInicio);
            const termino = new Date(inicio);
            termino.setMonth(termino.getMonth() + 6);
            
            // Formatear fecha para input type="date" (YYYY-MM-DD)
            const year = termino.getFullYear();
            const month = String(termino.getMonth() + 1).padStart(2, '0');
            const day = String(termino.getDate()).padStart(2, '0');
            
            fechaTerminoElement.value = `${year}-${month}-${day}`;
        }
    }

    async autoGenerateFolios() {
        const estado = document.getElementById('estadoTermino')?.value;
        
        // Solo generar folios para estados que los necesitan
        if (estado === 'ya-registro' || estado === 'en-proceso' || estado === 'terminado') {
            await this.generateFolioAceptacion();
        }
        
        if (estado === 'terminado') {
            await this.generateFolioTermino();
        }
    }

    async generateFolioAceptacion() {
        try {
            const folioElement = document.getElementById('folioAceptacion');
            if (folioElement && !folioElement.value) { // Solo si está vacío
                const folio = await this.getNextFolio('foliocartaaceptacion');
                folioElement.value = folio;
            }
        } catch (error) {
            console.error('Error generando folio aceptación:', error);
        }
    }

    async generateFolioTermino() {
        try {
            const folioElement = document.getElementById('folioTermino');
            if (folioElement && !folioElement.value) { // Solo si está vacío
                const folio = await this.getNextFolio('foliocartatermino');
                folioElement.value = folio;
            }
        } catch (error) {
            console.error('Error generando folio término:', error);
        }
    }

    async getNextFolio(tipoFolio) {
        const configRef = this.db.collection('configuracion').doc('qkLlvrqIPsI7HEPKIhyh');
        const currentYear = new Date().getFullYear();
        
        try {
            const doc = await configRef.get();
            const data = doc.data();
            const numeroActual = parseInt(data[tipoFolio]) || 0;
            const siguienteNumero = numeroActual + 1;
            
            // Formato: CI/folio/año
            const folioCompleto = `CI/${siguienteNumero}/${currentYear}`;
            
            // Actualizar el contador en Firestore
            await configRef.update({
                [tipoFolio]: siguienteNumero
            });
            
            return folioCompleto;
            
        } catch (error) {
            console.error('Error obteniendo folio:', error);
            // Fallback: generar folio sin actualizar BD
            return `CI/ERROR/${currentYear}`;
        }
    }

    async saveServicioSocial() {
        if (!this.currentAsesor) return;
        
        try {
            this.showLoadingModal('Guardando información...');
            
            // Recopilar datos del formulario
            const formData = this.getFormData();
            
            // Subir archivos pendientes
            if (this.currentAsesor.servicioSocial.pendingFiles) {
                await this.uploadPendingFiles(formData);
            }
            
            // Eliminar archivos marcados
            if (this.currentAsesor.servicioSocial.filesToDelete) {
                await this.deleteMarkedFiles();
            }
            
            // Guardar en Firestore
            await this.saveToFirestore(formData);
            
            // Actualizar datos locales
            this.updateLocalData(formData);
            
            // Cerrar modal
            const modalInstance = bootstrap.Modal.getInstance(document.getElementById('detalleModal'));
            if (modalInstance) {
                modalInstance.hide();
            }
            
            // Rerender
            this.renderAsesores();
            this.updateStats();
            
            this.showNotification('Información guardada exitosamente', 'success');
            
        } catch (error) {
            console.error('Error guardando:', error);
            this.showNotification('Error al guardar la información', 'error');
        } finally {
            this.hideLoadingModal();
        }
    }

    getFormData() {
        return {
            asesorId: this.currentAsesor.id,
            estadoTermino: document.getElementById('estadoTermino')?.value || '',
            fechaInicio: document.getElementById('fechaInicio')?.value || '',
            fechaTermino: document.getElementById('fechaTermino')?.value || '',
            clavePrograma: document.getElementById('clavePrograma')?.value || '',
            folioAceptacion: document.getElementById('folioAceptacion')?.value || '',
            folioTermino: document.getElementById('folioTermino')?.value || '',
            fechaEntregaCarta: document.getElementById('fechaEntregaCarta')?.value || '',
            horasAsesor: parseFloat(document.getElementById('horasAsesor')?.value) || 0,
            horasServicioSocial: parseFloat(document.getElementById('horasServicioSocial')?.value) || 0,
            totalHoras: parseFloat(document.getElementById('totalHoras')?.value) || 0,
            cartaPresentacion: this.currentAsesor.servicioSocial.cartaPresentacion,
            cartaAceptacion: this.currentAsesor.servicioSocial.cartaAceptacion,
            cartaTermino: this.currentAsesor.servicioSocial.cartaTermino,
            reporteSS: this.currentAsesor.servicioSocial.reporteSS,
            fechaActualizacion: new Date()
        };
    }

    async uploadPendingFiles(formData) {
        const pendingFiles = this.currentAsesor.servicioSocial.pendingFiles;
        
        for (const [fieldName, file] of Object.entries(pendingFiles)) {
            try {
                const fileName = `servicio-social/${this.currentAsesor.id}/${fieldName}_${Date.now()}.pdf`;
                const uploadTask = this.storage.ref(fileName).put(file);
                
                const snapshot = await uploadTask;
                const downloadURL = await snapshot.ref.getDownloadURL();
                
                formData[fieldName] = {
                    name: file.name,
                    url: downloadURL,
                    uploadDate: new Date()
                };
                
            } catch (error) {
                console.error(`Error subiendo ${fieldName}:`, error);
                throw new Error(`Error subiendo ${fieldName}`);
            }
        }
    }

    async deleteMarkedFiles() {
        const filesToDelete = this.currentAsesor.servicioSocial.filesToDelete || [];
        
        for (const fieldName of filesToDelete) {
            try {
                const fileData = this.currentAsesor.servicioSocial[fieldName];
                if (fileData && fileData.url) {
                    const fileRef = this.storage.refFromURL(fileData.url);
                    await fileRef.delete();
                }
            } catch (error) {
                console.error(`Error eliminando archivo ${fieldName}:`, error);
                // No es crítico si falla la eliminación
            }
        }
    }

    async saveToFirestore(formData) {
        const docRef = this.db.collection('serviciosocial').doc(this.currentAsesor.id);
        await docRef.set(formData, { merge: true });
    }

    updateLocalData(formData) {
        // Actualizar en el array local
        const asesorIndex = this.asesores.findIndex(a => a.id === this.currentAsesor.id);
        if (asesorIndex !== -1) {
            this.asesores[asesorIndex].servicioSocial = formData;
        }
        
        // Actualizar en servicioSocialData
        const ssIndex = this.servicioSocialData.findIndex(ss => ss.asesorId === this.currentAsesor.id);
        if (ssIndex !== -1) {
            this.servicioSocialData[ssIndex] = formData;
        } else {
            this.servicioSocialData.push(formData);
        }
        
        // Limpiar archivos pendientes
        delete this.currentAsesor.servicioSocial.pendingFiles;
        delete this.currentAsesor.servicioSocial.filesToDelete;
    }

    generateDocument(docType) {
        if (!this.currentAsesor) return;
        
        console.log(`📄 Generando documento: ${docType}`);
        
        // Mapear tipos de documento a archivos JS
        const docScripts = {
            'carta-termino-fq': 'carta-termino-FQ.js',
            'carta-termino-prepa': 'carta-termino-prepa.js',
            'carta-aceptacion-fq': 'carta-aceptacion-FQ.js',
            'carta-aceptacion-prepa': 'carta-aceptacion-prepa.js',
            'formato-asesor-ss': 'formato-asesor-ss.js',
            'formato-solo-ss': 'formato-solo-ss.js'
        };
        
        const scriptFile = docScripts[docType];
        
        if (scriptFile) {
            this.showNotification(
                'Generando documento...',
                `Preparando ${this.getDocumentName(docType)}`,
                'info',
                'bi-file-earmark-pdf'
            );
            
            // En el futuro, aquí cargarías el script correspondiente
            // loadScript(`../js/documents/${scriptFile}`).then(() => {
            //     // Ejecutar generación del documento
            // });
            
            setTimeout(() => {
                this.showNotification(
                    'Documento preparado',
                    'La funcionalidad de generación estará disponible próximamente',
                    'warning'
                );
            }, 1500);
        } else {
            this.showNotification('Tipo de documento no reconocido', 'error');
        }
    }

    getDocumentName(docType) {
        const names = {
            'carta-termino-fq': 'Carta de Término FQ',
            'carta-termino-prepa': 'Carta de Término Prepa',
            'carta-aceptacion-fq': 'Carta de Aceptación FQ',
            'carta-aceptacion-prepa': 'Carta de Aceptación Prepa',
            'formato-asesor-ss': 'Formato Asesor + SS',
            'formato-solo-ss': 'Formato Solo SS'
        };
        return names[docType] || docType;
    }

    // ========================================
    // ESTADÍSTICAS Y ACTUALIZACIÓN UI
    // ========================================

    updateStats() {
        const totalAsesores = this.asesores.length;
        const pendientes = this.categoryCounts['pendientes'];
        const enProceso = this.categoryCounts['en-proceso'] + this.categoryCounts['ya-registro'];
        const completados = this.categoryCounts['terminado'];
        
        this.animateNumber(document.getElementById('totalAsesores'), totalAsesores);
        this.animateNumber(document.getElementById('enProceso'), enProceso);
        this.animateNumber(document.getElementById('completados'), completados);
        
        // Agregar estadística de pendientes si hay
        if (pendientes > 0) {
            this.addPendingStats(pendientes);
        } else {
            this.removePendingStats();
        }
        
        // Mostrar/ocultar secciones
        const hasResults = this.filteredAsesores.length > 0;
        document.getElementById('accordionContainer').style.display = hasResults ? 'block' : 'none';
        document.getElementById('emptyState').style.display = hasResults ? 'none' : 'block';
    }

    addPendingStats(count) {
        // Buscar si ya existe el stat de pendientes
        let pendingStat = document.querySelector('.stat-item.pending-stat');
        
        if (!pendingStat) {
            // Crear nuevo stat para pendientes
            pendingStat = document.createElement('div');
            pendingStat.className = 'stat-item pending-stat';
            pendingStat.innerHTML = `
                <span class="stat-number" id="pendientesCount">0</span>
                <span class="stat-label">Sin Asignar</span>
            `;
            
            // Insertar después de totalAsesores
            const heroStats = document.querySelector('.hero-stats');
            const firstStat = heroStats?.querySelector('.stat-item');
            if (heroStats && firstStat) {
                if (firstStat.nextSibling) {
                    heroStats.insertBefore(pendingStat, firstStat.nextSibling);
                } else {
                    heroStats.appendChild(pendingStat);
                }
            }
        }
        
        this.animateNumber(document.getElementById('pendientesCount'), count);
    }

    removePendingStats() {
        const pendingStat = document.querySelector('.stat-item.pending-stat');
        if (pendingStat) {
            pendingStat.remove();
        }
    }

    animateNumber(element, targetValue) {
        if (!element) return;
        
        const startValue = parseInt(element.textContent) || 0;
        const duration = 1000;
        const startTime = performance.now();
        
        const updateNumber = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const currentValue = Math.floor(startValue + (targetValue - startValue) * easeProgress);
            
            element.textContent = currentValue;
            
            if (progress < 1) {
                requestAnimationFrame(updateNumber);
            }
        };
        
        requestAnimationFrame(updateNumber);
    }

    // ========================================
    // UTILIDADES UI
    // ========================================

    showLoading(show) {
        const loading = document.getElementById('loadingState');
        const content = document.getElementById('accordionContainer');
        const empty = document.getElementById('emptyState');
        
        if (show) {
            if (loading) loading.style.display = 'block';
            if (content) content.style.display = 'none';
            if (empty) empty.style.display = 'none';
        } else {
            if (loading) loading.style.display = 'none';
        }
    }

    showLoadingModal(message = 'Procesando...') {
        const modal = document.getElementById('loadingModal');
        const messageElement = document.getElementById('loadingMessage');
        
        if (messageElement) {
            messageElement.textContent = message;
        }
        
        if (modal) {
            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();
        }
    }

    hideLoadingModal() {
        const modal = document.getElementById('loadingModal');
        if (modal) {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) {
                bsModal.hide();
            }
        }
    }

    showNotification(title, message = '', type = 'info', icon = null) {
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
                icon || icons[type]
            );
        } else {
            // Fallback básico
            console.log(`${type.toUpperCase()}: ${title} - ${message}`);
        }
    }
}

// ========================================
// UTILIDADES ADICIONALES
// ========================================

// Intersection Observer para animaciones en scroll
function setupScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    // Observar acordeones
    document.querySelectorAll('.category-accordion').forEach(accordion => {
        observer.observe(accordion);
    });
}

// Función para cargar scripts dinámicamente (para documentos)
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Función para formatear fechas
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Función para validar formularios
function validateForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return false;
    
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            field.classList.add('is-invalid');
            isValid = false;
        } else {
            field.classList.remove('is-invalid');
        }
    });
    
    return isValid;
}

// Función para exportar datos (futura implementación)
function exportData(format = 'excel') {
    console.log(`📊 Exportando datos en formato: ${format}`);
    
    if (window.servicioSocialManager) {
        const data = window.servicioSocialManager.asesores;
        
        // Aquí implementarías la exportación
        console.log('Datos para exportar:', data);
        
        window.servicioSocialManager.showNotification(
            'Exportación preparada',
            'La funcionalidad de exportación estará disponible próximamente',
            'info'
        );
    }
}

// Atajos de teclado
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K para enfocar búsqueda
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }
    
    // Escape para cerrar modales
    if (e.key === 'Escape') {
        const modal = document.querySelector('.modal.show');
        if (modal) {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) {
                bsModal.hide();
            }
        }
    }
    
    // Ctrl/Cmd + S para guardar (si hay modal abierto)
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        const modal = document.getElementById('detalleModal');
        if (modal && modal.classList.contains('show')) {
            e.preventDefault();
            if (window.servicioSocialManager) {
                window.servicioSocialManager.saveServicioSocial();
            }
        }
    }
});

// ========================================
// INICIALIZACIÓN
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando página de Servicio Social...');
    
    // Verificar que Firebase esté disponible
    const checkFirebase = setInterval(() => {
        if (window.firebase && window.firebaseDB && window.firebaseAuth) {
            clearInterval(checkFirebase);
            
            // Inicializar el manager
            window.servicioSocialManager = new ServicioSocialManager();
            
            // Configurar animaciones
            setupScrollAnimations();
            
            console.log('✅ Sistema de Servicio Social inicializado');
        }
    }, 100);
    
    // Timeout de seguridad
    setTimeout(() => {
        clearInterval(checkFirebase);
        if (!window.servicioSocialManager) {
            console.error('❌ No se pudo inicializar el sistema');
            
            // Mostrar mensaje de error
            const mainContent = document.getElementById('main-content');
            if (mainContent) {
                mainContent.innerHTML = `
                    <div class="container">
                        <div class="alert alert-danger text-center mt-5">
                            <div class="mb-3">
                                <i class="bi bi-exclamation-triangle-fill" style="font-size: 3rem;"></i>
                            </div>
                            <h4><strong>Error de Conexión</strong></h4>
                            <p>No se pudo conectar con la base de datos. Verifique su conexión a internet y que Firebase esté configurado correctamente.</p>
                            <div class="mt-4">
                                <button class="btn btn-outline-danger me-2" onclick="location.reload()">
                                    <i class="bi bi-arrow-clockwise me-1"></i>Recargar Página
                                </button>
                                <a href="../admin/" class="btn btn-secondary">
                                    <i class="bi bi-house me-1"></i>Volver al Inicio
                                </a>
                            </div>
                        </div>
                    </div>
                `;
            }
        }
    }, 10000);
});

// Manejar errores globales
window.addEventListener('error', (event) => {
    console.error('❌ Error global en servicio-social:', event.error);
    
    if (window.servicioSocialManager) {
        window.servicioSocialManager.showNotification(
            'Error del Sistema',
            'Se produjo un error inesperado. Recargue la página si persiste.',
            'error'
        );
    }
});

// Manejar errores de promesas no capturadas
window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Promise rejection no manejada:', event.reason);
    
    if (window.servicioSocialManager) {
        window.servicioSocialManager.showNotification(
            'Error de Conexión',
            'Problema de conectividad. Verifique su conexión.',
            'warning'
        );
    }
});

// Función para limpiar listeners al descargar la página
window.addEventListener('beforeunload', () => {
    // Limpiar cualquier recurso si es necesario
    if (window.servicioSocialManager) {
        // Cancelar uploads en progreso, etc.
        console.log('🧹 Limpiando recursos...');
    }
});

// ========================================
// FUNCIONES AUXILIARES PARA DEBUGGING
// ========================================

// Función para debugging (solo en desarrollo)
window.debugSS = {
    manager: () => window.servicioSocialManager,
    asesores: () => window.servicioSocialManager?.asesores || [],
    filteredAsesores: () => window.servicioSocialManager?.filteredAsesores || [],
    counts: () => window.servicioSocialManager?.categoryCounts || {},
    currentAsesor: () => window.servicioSocialManager?.currentAsesor || null,
    exportData: () => exportData(),
    testNotification: (type = 'info') => {
        if (window.servicioSocialManager) {
            window.servicioSocialManager.showNotification(
                'Notificación de Prueba',
                `Esta es una notificación de tipo ${type}`,
                type
            );
        }
    }
};

// Exportar para uso global
window.ServicioSocialManager = ServicioSocialManager;
window.exportData = exportData;
window.loadScript = loadScript;
window.formatDate = formatDate;
window.validateForm = validateForm;