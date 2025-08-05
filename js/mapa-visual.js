// ✅ SISTEMA DE MAPA VISUAL PARA COMPUTADORAS/MESAS
// Archivo: js/mapa-visual.js

class MapaVisual {
    constructor() {
        this.registrosActivos = [];
        this.vistaActual = 'laboratorio'; // laboratorio, tabla-periodica
        this.filtroActual = 'todas'; // todas, ocupadas, disponibles
        this.initialized = false;
    }

    // ✅ INICIALIZAR EL MAPA VISUAL
    async init() {
        if (this.initialized) return;
        
        try {
            // Esperar a que el sistema principal esté listo
            if (!window.SICARegistro) {
                setTimeout(() => this.init(), 500);
                return;
            }

            await this.crearInterfaz();
            await this.cargarRegistrosActivos();
            this.setupEventListeners();
            this.initialized = true;
            
            console.log('🗺️ Mapa visual inicializado');
        } catch (error) {
            console.error('Error inicializando mapa visual:', error);
        }
    }

    // ✅ CREAR LA INTERFAZ DEL MAPA VISUAL
    async crearInterfaz() {
        const container = document.querySelector('.container');
        if (!container) return;

        // Crear botón para mostrar mapa
        const botonMapa = document.createElement('div');
        botonMapa.className = 'text-center mb-4';
        botonMapa.innerHTML = `
            <button id="btn-mostrar-mapa" class="btn btn-info btn-lg me-3">
                <i class="bi bi-map me-2"></i>Ver Mapa Visual
            </button>
            <button id="btn-actualizar-mapa" class="btn btn-outline-secondary" style="display: none;">
                <i class="bi bi-arrow-clockwise me-2"></i>Actualizar
            </button>
        `;

        // Insertar después del formulario
        const formCard = container.querySelector('.card-modern');
        if (formCard) {
            formCard.parentNode.insertBefore(botonMapa, formCard.nextSibling);
        }

        // Crear container del mapa (inicialmente oculto)
        const mapaContainer = document.createElement('div');
        mapaContainer.id = 'mapa-visual-container';
        mapaContainer.className = 'card-modern mt-4';
        mapaContainer.style.display = 'none';
        mapaContainer.innerHTML = this.generarHTMLMapa();

        botonMapa.parentNode.insertBefore(mapaContainer, botonMapa.nextSibling);
    }

    // ✅ GENERAR HTML DEL MAPA
    generarHTMLMapa() {
        return `
            <div class="card-header d-flex justify-content-between align-items-center">
                <div>
                    <h4 class="mb-0">
                        <i class="bi bi-diagram-3 me-2"></i>
                        Mapa Visual de ${window.SICARegistro.getCurrentSICAConfig().displayName}
                    </h4>
                    <small class="text-muted" id="contador-equipos">Cargando...</small>
                </div>
                <div class="btn-group" role="group">
                    <button type="button" class="btn btn-outline-primary btn-sm" id="vista-laboratorio">
                        <i class="bi bi-grid-3x3-gap me-1"></i>Laboratorio
                    </button>
                    <button type="button" class="btn btn-outline-primary btn-sm" id="vista-tabla-periodica">
                        <i class="bi bi-table me-1"></i>Tabla Periódica
                    </button>
                </div>
            </div>
            <div class="card-body">
                <!-- Controles -->
                <div class="row mb-3">
                    <div class="col-md-6">
                        <div class="btn-group" role="group" aria-label="Filtros">
                            <input type="radio" class="btn-check" name="filtro" id="filtro-todas" value="todas" checked>
                            <label class="btn btn-outline-secondary btn-sm" for="filtro-todas">
                                <i class="bi bi-list me-1"></i>Todas
                            </label>
                            <input type="radio" class="btn-check" name="filtro" id="filtro-ocupadas" value="ocupadas">
                            <label class="btn btn-outline-danger btn-sm" for="filtro-ocupadas">
                                <i class="bi bi-laptop me-1"></i>Ocupadas
                            </label>
                            <input type="radio" class="btn-check" name="filtro" id="filtro-disponibles" value="disponibles">
                            <label class="btn btn-outline-success btn-sm" for="filtro-disponibles">
                                <i class="bi bi-check-circle me-1"></i>Disponibles
                            </label>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="input-group input-group-sm">
                            <span class="input-group-text">
                                <i class="bi bi-search"></i>
                            </span>
                            <input type="text" class="form-control" id="buscar-cuenta" 
                                   placeholder="Buscar por número de cuenta...">
                        </div>
                    </div>
                </div>

                <!-- Leyenda -->
                <div class="alert alert-light p-2 mb-3">
                    <div class="row text-center">
                        <div class="col-3">
                            <span class="badge bg-success me-1">✓</span>Disponible
                        </div>
                        <div class="col-3">
                            <span class="badge bg-danger me-1">●</span>Ocupada
                        </div>
                        <div class="col-3">
                            <span class="badge bg-warning me-1">⚠</span>+2 horas
                        </div>
                        <div class="col-3">
                            <span class="badge bg-secondary me-1">-</span>No disponible
                        </div>
                    </div>
                </div>

                <!-- Grid del Mapa -->
                <div id="mapa-grid" class="mapa-grid">
                    <!-- Se genera dinámicamente -->
                </div>
            </div>
        `;
    }

    // ✅ CARGAR REGISTROS ACTIVOS DESDE FIRESTORE
    async cargarRegistrosActivos() {
        try {
            if (!window.firebaseDB) {
                throw new Error('Firebase no disponible');
            }

            const query = await window.firebaseDB.collection("registros")
                .where("sica", "==", window.SICARegistro.getCurrentSICAConfig().shortName)
                .where("estado", "==", "activo")
                .get();

            this.registrosActivos = [];
            query.forEach(doc => {
                this.registrosActivos.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            console.log(`📊 ${this.registrosActivos.length} registros activos cargados`);
            this.actualizarMapa();
        } catch (error) {
            console.error('Error cargando registros activos:', error);
        }
    }

    // ✅ ACTUALIZAR EL MAPA VISUAL
    actualizarMapa() {
        const grid = document.getElementById('mapa-grid');
        if (!grid) return;

        const currentTipo = window.SICARegistro.getCurrentTipo();
        const config = window.SICARegistro.getCurrentSICAConfig();
        
        let elementos;
        if (currentTipo === 'computadora') {
            elementos = window.SICARegistro.getElementosQuimicos()
                .filter(el => el.numero <= config.maxElementos);
        } else {
            elementos = window.SICARegistro.getMesas();
        }

        // Aplicar filtro
        elementos = this.aplicarFiltro(elementos);

        // Generar grid según la vista
        if (this.vistaActual === 'laboratorio') {
            grid.innerHTML = this.generarVistaLaboratorio(elementos);
        } else {
            grid.innerHTML = this.generarVistaTablaPeriodica(elementos);
        }

        // Actualizar contador
        this.actualizarContador();
    }

    // ✅ APLICAR FILTRO A LOS ELEMENTOS
    aplicarFiltro(elementos) {
        if (this.filtroActual === 'todas') {
            return elementos;
        }

        return elementos.filter(elemento => {
            const estaOcupada = this.estaElementoOcupado(elemento);
            
            if (this.filtroActual === 'ocupadas') {
                return estaOcupada;
            } else if (this.filtroActual === 'disponibles') {
                return !estaOcupada;
            }
            
            return true;
        });
    }

    // ✅ VERIFICAR SI UN ELEMENTO ESTÁ OCUPADO
    estaElementoOcupado(elemento) {
        const currentTipo = window.SICARegistro.getCurrentTipo();
        let nombreElemento;
        
        if (currentTipo === 'computadora') {
            nombreElemento = `${elemento.numero} ${elemento.nombre} ${elemento.simbolo}`;
        } else {
            nombreElemento = `Mesa ${elemento.numero} ${elemento.nombre} ${elemento.codigo}`;
        }

        return this.registrosActivos.some(registro => 
            registro.nombreElemento === nombreElemento
        );
    }

    // ✅ OBTENER REGISTRO ACTIVO DE UN ELEMENTO
    getRegistroElemento(elemento) {
        const currentTipo = window.SICARegistro.getCurrentTipo();
        let nombreElemento;
        
        if (currentTipo === 'computadora') {
            nombreElemento = `${elemento.numero} ${elemento.nombre} ${elemento.simbolo}`;
        } else {
            nombreElemento = `Mesa ${elemento.numero} ${elemento.nombre} ${elemento.codigo}`;
        }

        return this.registrosActivos.find(registro => 
            registro.nombreElemento === nombreElemento
        );
    }

    // ✅ GENERAR VISTA DE LABORATORIO (GRID COMPACTO)
    generarVistaLaboratorio(elementos) {
        let html = '<div class="lab-grid">';
        
        // Organizar en filas de 10 elementos
        for (let i = 0; i < elementos.length; i += 10) {
            html += '<div class="lab-row">';
            
            for (let j = i; j < Math.min(i + 10, elementos.length); j++) {
                const elemento = elementos[j];
                const registro = this.getRegistroElemento(elemento);
                const estaOcupada = !!registro;
                
                let estadoClass = 'elemento-disponible';
                let estadoIcon = '✓';
                let badgeClass = 'bg-success';
                let infoExtra = '';
                
                if (estaOcupada) {
                    const tiempoTranscurrido = this.calcularTiempoTranscurrido(registro.fechaEntrada);
                    estadoClass = tiempoTranscurrido > 120 ? 'elemento-alerta' : 'elemento-ocupado';
                    estadoIcon = tiempoTranscurrido > 120 ? '⚠' : '●';
                    badgeClass = tiempoTranscurrido > 120 ? 'bg-warning' : 'bg-danger';
                    infoExtra = `
                        <small class="cuenta-info">${registro.numeroCuenta}</small>
                        <small class="tiempo-info">${this.formatearTiempo(tiempoTranscurrido)}</small>
                    `;
                }

                const currentTipo = window.SICARegistro.getCurrentTipo();
                const simbolo = currentTipo === 'computadora' ? elemento.simbolo : elemento.codigo;
                const numero = elemento.numero;

                html += `
                    <div class="elemento-card ${estadoClass}" 
                         data-numero="${numero}" 
                         data-ocupada="${estaOcupada}"
                         title="${elemento.nombre}">
                        <div class="elemento-header">
                            <span class="elemento-numero">${numero}</span>
                            <span class="badge ${badgeClass} elemento-estado">${estadoIcon}</span>
                        </div>
                        <div class="elemento-simbolo">${simbolo}</div>
                        <div class="elemento-nombre">${elemento.nombre}</div>
                        ${infoExtra}
                    </div>
                `;
            }
            
            html += '</div>';
        }
        
        html += '</div>';
        return html;
    }

    // ✅ GENERAR VISTA DE TABLA PERIÓDICA (PARA COMPUTADORAS)
    generarVistaTablaPeriodica(elementos) {
        if (window.SICARegistro.getCurrentTipo() !== 'computadora') {
            return this.generarVistaLaboratorio(elementos);
        }

        // Estructura simplificada de tabla periódica
        const estructura = [
            [1, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 2],
            [3, 4, null, null, null, null, null, null, null, null, null, null, 5, 6, 7, 8, 9, 10],
            [11, 12, null, null, null, null, null, null, null, null, null, null, 13, 14, 15, 16, 17, 18],
            [19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36],
            [37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54],
            [55, 56, 57, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86],
            [87, 88, 89, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]
        ];

        let html = '<div class="tabla-periodica">';
        
        estructura.forEach((fila, filaIndex) => {
            html += '<div class="tabla-fila">';
            
            fila.forEach((numeroElemento, colIndex) => {
                if (numeroElemento === null) {
                    html += '<div class="elemento-vacio"></div>';
                    return;
                }

                const elemento = elementos.find(el => el.numero === numeroElemento);
                if (!elemento) {
                    html += '<div class="elemento-no-disponible"></div>';
                    return;
                }

                const registro = this.getRegistroElemento(elemento);
                const estaOcupada = !!registro;
                
                let estadoClass = 'elemento-disponible';
                let estadoIcon = '✓';
                let badgeClass = 'bg-success';
                let infoExtra = '';
                
                if (estaOcupada) {
                    const tiempoTranscurrido = this.calcularTiempoTranscurrido(registro.fechaEntrada);
                    estadoClass = tiempoTranscurrido > 120 ? 'elemento-alerta' : 'elemento-ocupado';
                    estadoIcon = tiempoTranscurrido > 120 ? '⚠' : '●';
                    badgeClass = tiempoTranscurrido > 120 ? 'bg-warning' : 'bg-danger';
                    infoExtra = `<small class="cuenta-info">${registro.numeroCuenta}</small>`;
                }

                html += `
                    <div class="elemento-card ${estadoClass}" 
                         data-numero="${elemento.numero}" 
                         data-ocupada="${estaOcupada}"
                         title="${elemento.nombre}">
                        <div class="elemento-header">
                            <span class="elemento-numero">${elemento.numero}</span>
                            <span class="badge ${badgeClass} elemento-estado">${estadoIcon}</span>
                        </div>
                        <div class="elemento-simbolo">${elemento.simbolo}</div>
                        ${infoExtra}
                    </div>
                `;
            });
            
            html += '</div>';
        });
        
        html += '</div>';
        return html;
    }

    // ✅ CALCULAR TIEMPO TRANSCURRIDO EN MINUTOS
    calcularTiempoTranscurrido(fechaEntrada) {
        if (!fechaEntrada) return 0;
        
        const entrada = fechaEntrada.seconds ? new Date(fechaEntrada.seconds * 1000) : new Date(fechaEntrada);
        const ahora = new Date();
        return Math.floor((ahora - entrada) / (1000 * 60));
    }

    // ✅ FORMATEAR TIEMPO PARA MOSTRAR
    formatearTiempo(minutos) {
        if (minutos < 60) {
            return `${minutos}m`;
        }
        const horas = Math.floor(minutos / 60);
        const mins = minutos % 60;
        return `${horas}h ${mins}m`;
    }

    // ✅ ACTUALIZAR CONTADOR
    actualizarContador() {
        const contador = document.getElementById('contador-equipos');
        if (!contador) return;

        const total = window.SICARegistro.getCurrentSICAConfig().maxElementos;
        const ocupadas = this.registrosActivos.length;
        const disponibles = total - ocupadas;

        contador.textContent = `${ocupadas}/${total} equipos ocupados • ${disponibles} disponibles`;
    }

    // ✅ CONFIGURAR EVENT LISTENERS
    setupEventListeners() {
        // Botón mostrar mapa
        const btnMostrar = document.getElementById('btn-mostrar-mapa');
        const btnActualizar = document.getElementById('btn-actualizar-mapa');
        const mapaContainer = document.getElementById('mapa-visual-container');

        if (btnMostrar) {
            btnMostrar.addEventListener('click', () => {
                const isVisible = mapaContainer.style.display !== 'none';
                
                if (isVisible) {
                    mapaContainer.style.display = 'none';
                    btnMostrar.innerHTML = '<i class="bi bi-map me-2"></i>Ver Mapa Visual';
                    btnActualizar.style.display = 'none';
                } else {
                    mapaContainer.style.display = 'block';
                    btnMostrar.innerHTML = '<i class="bi bi-eye-slash me-2"></i>Ocultar Mapa';
                    btnActualizar.style.display = 'inline-block';
                    this.cargarRegistrosActivos();
                }
            });
        }

        // Botón actualizar
        if (btnActualizar) {
            btnActualizar.addEventListener('click', () => {
                this.cargarRegistrosActivos();
            });
        }

        // Event listener para cambios de vista (delegación de eventos)
        document.addEventListener('click', (e) => {
            // Cambio de vista
            if (e.target.id === 'vista-laboratorio') {
                this.cambiarVista('laboratorio');
            } else if (e.target.id === 'vista-tabla-periodica') {
                this.cambiarVista('tabla-periodica');
            }

            // Click en elemento del mapa
            if (e.target.closest('.elemento-card')) {
                this.handleElementoClick(e.target.closest('.elemento-card'));
            }
        });

        // Event listener para filtros (delegación de eventos)
        document.addEventListener('change', (e) => {
            if (e.target.name === 'filtro') {
                this.filtroActual = e.target.value;
                this.actualizarMapa();
            }
        });

        // Búsqueda por cuenta
        document.addEventListener('input', (e) => {
            if (e.target.id === 'buscar-cuenta') {
                this.buscarPorCuenta(e.target.value);
            }
        });
    }

    // ✅ CAMBIAR VISTA DEL MAPA
    cambiarVista(nuevaVista) {
        this.vistaActual = nuevaVista;
        
        // Actualizar botones activos
        document.getElementById('vista-laboratorio').classList.toggle('active', nuevaVista === 'laboratorio');
        document.getElementById('vista-tabla-periodica').classList.toggle('active', nuevaVista === 'tabla-periodica');
        
        this.actualizarMapa();
    }

    // ✅ MANEJAR CLICK EN ELEMENTO
    async handleElementoClick(elementoCard) {
        const numero = parseInt(elementoCard.dataset.numero);
        const estaOcupada = elementoCard.dataset.ocupada === 'true';
        
        const currentTipo = window.SICARegistro.getCurrentTipo();
        let elemento;
        
        if (currentTipo === 'computadora') {
            elemento = window.SICARegistro.getElementosQuimicos().find(el => el.numero === numero);
        } else {
            elemento = window.SICARegistro.getMesas().find(m => m.numero === numero);
        }

        if (!elemento) return;

        if (estaOcupada) {
            // Registrar salida
            await this.procesarSalidaRapida(elemento);
        } else {
            // Preseleccionar para entrada
            this.preseleccionarParaEntrada(elemento);
        }
    }

    // ✅ PROCESAR SALIDA RÁPIDA DESDE EL MAPA
    async procesarSalidaRapida(elemento) {
        const registro = this.getRegistroElemento(elemento);
        if (!registro) return;

        const confirmacion = await this.mostrarConfirmacionSalida(elemento, registro);
        if (!confirmacion) return;

        try {
            // Usar las funciones del sistema principal
            await window.SICARegistro.procesarSalida(registro.id, registro);
            
            // Actualizar mapa
            await this.cargarRegistrosActivos();
            
            // Mostrar notificación
            if (window.SICAComponents && window.SICAComponents.notify) {
                window.SICAComponents.notify(
                    "✅ Salida Registrada",
                    `Salida registrada para ${elemento.nombre} desde el mapa visual`,
                    "success",
                    "bi-check-circle-fill"
                );
            }
            
        } catch (error) {
            console.error('Error en salida rápida:', error);
            if (window.SICAComponents && window.SICAComponents.notify) {
                window.SICAComponents.notify(
                    "❌ Error",
                    "Error al registrar la salida",
                    "error",
                    "bi-exclamation-triangle-fill"
                );
            }
        }
    }

    // ✅ MOSTRAR CONFIRMACIÓN DE SALIDA
    async mostrarConfirmacionSalida(elemento, registro) {
        const tiempoTranscurrido = this.calcularTiempoTranscurrido(registro.fechaEntrada);
        const tiempoFormateado = this.formatearTiempo(tiempoTranscurrido);
        
        const currentTipo = window.SICARegistro.getCurrentTipo();
        const tipoTexto = currentTipo === 'computadora' ? 'equipo' : 'mesa';

        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal fade';
            modal.innerHTML = `
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-box-arrow-right me-2"></i>
                                Confirmar Salida
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="text-center mb-3">
                                <div class="elemento-preview ${tiempoTranscurrido > 120 ? 'elemento-alerta' : 'elemento-ocupado'}">
                                    <div class="elemento-numero">${elemento.numero}</div>
                                    <div class="elemento-simbolo">${currentTipo === 'computadora' ? elemento.simbolo : elemento.codigo}</div>
                                </div>
                            </div>
                            <p><strong>¿Registrar salida del ${tipoTexto}?</strong></p>
                            <ul class="list-unstyled">
                                <li><i class="bi bi-pc-display me-2"></i><strong>${tipoTexto.charAt(0).toUpperCase() + tipoTexto.slice(1)}:</strong> ${elemento.nombre}</li>
                                <li><i class="bi bi-person me-2"></i><strong>Cuenta:</strong> ${registro.numeroCuenta}</li>
                                <li><i class="bi bi-clock me-2"></i><strong>Tiempo de uso:</strong> ${tiempoFormateado}</li>
                            </ul>
                            ${tiempoTranscurrido > 120 ? '<div class="alert alert-warning"><i class="bi bi-exclamation-triangle me-2"></i>Este préstamo lleva más de 2 horas activo.</div>' : ''}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-warning" id="confirmar-salida">
                                <i class="bi bi-box-arrow-right me-2"></i>Registrar Salida
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const bootstrapModal = new bootstrap.Modal(modal);
            bootstrapModal.show();

            // Event listeners
            modal.querySelector('#confirmar-salida').addEventListener('click', () => {
                resolve(true);
                bootstrapModal.hide();
            });

            modal.addEventListener('hidden.bs.modal', () => {
                document.body.removeChild(modal);
                resolve(false);
            });
        });
    }

    // ✅ PRESELECCIONAR ELEMENTO PARA ENTRADA
    preseleccionarParaEntrada(elemento) {
        const equipoSelect = document.getElementById('equipoSelect');
        if (equipoSelect) {
            equipoSelect.value = elemento.numero;
            equipoSelect.dispatchEvent(new Event('change'));
            
            // Scroll al formulario
            document.getElementById('registroForm').scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
            
            // Highlight temporal
            equipoSelect.classList.add('highlight-selection');
            setTimeout(() => {
                equipoSelect.classList.remove('highlight-selection');
            }, 2000);

            // Mostrar notificación
            if (window.SICAComponents && window.SICAComponents.notify) {
                window.SICAComponents.notify(
                    "💡 Elemento Preseleccionado",
                    `${elemento.nombre} ha sido seleccionado en el formulario`,
                    "info",
                    "bi-cursor-fill"
                );
            }
        }
    }

    // ✅ BUSCAR POR NÚMERO DE CUENTA
    buscarPorCuenta(query) {
        if (!query.trim()) {
            // Limpiar highlighting
            document.querySelectorAll('.elemento-card.highlight-search').forEach(el => {
                el.classList.remove('highlight-search');
            });
            return;
        }

        const elementos = document.querySelectorAll('.elemento-card');
        let encontrados = 0;

        elementos.forEach(elemento => {
            const cuentaInfo = elemento.querySelector('.cuenta-info');
            elemento.classList.remove('highlight-search');
            
            if (cuentaInfo && cuentaInfo.textContent.includes(query)) {
                elemento.classList.add('highlight-search');
                encontrados++;
                
                // Scroll al primer resultado
                if (encontrados === 1) {
                    elemento.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center' 
                    });
                }
            }
        });

        // Mostrar mensaje si no se encontraron resultados
        if (query.length >= 3 && encontrados === 0) {
            if (window.SICAComponents && window.SICAComponents.notify) {
                window.SICAComponents.notify(
                    "🔍 Sin Resultados",
                    `No se encontraron equipos con la cuenta "${query}"`,
                    "info",
                    "bi-search"
                );
            }
        }
    }
}

// ✅ ESTILOS CSS PARA EL MAPA VISUAL
function inyectarEstilosMapa() {
    if (document.getElementById('mapa-visual-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'mapa-visual-styles';
    styles.textContent = `
        /* Estilos del Mapa Visual */
        .lab-grid, .tabla-periodica {
            display: flex;
            flex-direction: column;
            gap: 8px;
            max-width: 100%;
            overflow-x: auto;
        }

        .lab-row, .tabla-fila {
            display: flex;
            gap: 8px;
            justify-content: center;
            flex-wrap: wrap;
        }

        .elemento-card {
            min-width: 80px;
            min-height: 80px;
            border: 2px solid #dee2e6;
            border-radius: 8px;
            padding: 6px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            font-size: 0.75rem;
        }

        .elemento-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .elemento-disponible {
            background: linear-gradient(135deg, #d1f2d1, #a8e6a8);
            border-color: #28a745;
        }

        .elemento-ocupado {
            background: linear-gradient(135deg, #f8d7da, #f5c6cb);
            border-color: #dc3545;
        }

        .elemento-alerta {
            background: linear-gradient(135deg, #fff3cd, #ffeaa7);
            border-color: #ffc107;
            animation: pulse-warning 2s infinite;
        }

        .elemento-no-disponible {
            background: #f8f9fa;
            border-color: #6c757d;
            opacity: 0.5;
            cursor: not-allowed;
        }

        .elemento-vacio {
            min-width: 80px;
            min-height: 80px;
        }

        .elemento-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 4px;
        }

        .elemento-numero {
            font-size: 0.7rem;
            font-weight: bold;
            color: #495057;
        }

        .elemento-simbolo {
            font-size: 1.2rem;
            font-weight: bold;
            color: #212529;
            margin: 2px 0;
        }

        .elemento-nombre {
            font-size: 0.6rem;
            color: #6c757d;
            line-height: 1.1;
            margin-bottom: 4px;
        }

        .elemento-estado {
            font-size: 0.7rem;
            padding: 2px 4px;
        }

        .cuenta-info {
            display: block;
            font-weight: bold;
            color: #212529;
            background: rgba(255,255,255,0.8);
            padding: 1px 4px;
            border-radius: 3px;
            margin: 1px 0;
        }

        .tiempo-info {
            display: block;
            color: #6c757d;
            font-size: 0.6rem;
        }

        .highlight-search {
            border-color: #007bff !important;
            box-shadow: 0 0 0 3px rgba(0,123,255,0.25);
            transform: scale(1.05);
        }

        .highlight-selection {
            border-color: #28a745 !important;
            box-shadow: 0 0 0 3px rgba(40,167,69,0.25);
        }

        .elemento-preview {
            width: 60px;
            height: 60px;
            border-radius: 8px;
            display: inline-flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            margin: 0 auto;
        }

        .elemento-preview .elemento-numero {
            font-size: 0.8rem;
        }

        .elemento-preview .elemento-simbolo {
            font-size: 1.1rem;
        }

        @keyframes pulse-warning {
            0%, 100% { 
                box-shadow: 0 0 0 0 rgba(255, 193, 7, 0.4);
            }
            50% { 
                box-shadow: 0 0 0 10px rgba(255, 193, 7, 0);
            }
        }

        /* Responsive */
        @media (max-width: 768px) {
            .elemento-card {
                min-width: 60px;
                min-height: 60px;
                font-size: 0.65rem;
            }
            
            .elemento-simbolo {
                font-size: 1rem;
            }
            
            .lab-row, .tabla-fila {
                gap: 4px;
            }
        }

        @media (max-width: 576px) {
            .elemento-card {
                min-width: 50px;
                min-height: 50px;
                font-size: 0.6rem;
                padding: 3px;
            }
            
            .elemento-simbolo {
                font-size: 0.9rem;
            }
        }
    `;

    document.head.appendChild(styles);
}

// ✅ INICIALIZAR EL SISTEMA CUANDO EL DOM ESTÉ LISTO
document.addEventListener('DOMContentLoaded', function() {
    // Esperar a que el sistema principal esté cargado
    setTimeout(() => {
        if (window.SICARegistro) {
            inyectarEstilosMapa();
            const mapaVisual = new MapaVisual();
            window.SICAMapaVisual = mapaVisual;
            mapaVisual.init();
        }
    }, 1000);
});

// ✅ EXPORTAR PARA USO GLOBAL
window.MapaVisual = MapaVisual;