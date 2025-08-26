// consulta-horarios.js

class ConsultaHorariosManager {
    constructor() {
        this.db = null;
        this.currentTipoBloque = null;
        this.asesores = new Map(); // Cache de asesores
        this.horarios = []; // Cache de horarios actuales
        this.registrosAsistencia = new Map(); // Cache de registros de asistencia
        this.autoRefreshInterval = null; // Para el auto-refresh
        
        this.init();
    }

    async init() {
        try {
            console.log('🚀 Inicializando ConsultaHorariosManager...');
            
            // Configurar página
            this.setupPage();
            
            // Configurar Firebase (sin autenticación para página pública)
            await this.setupFirebase();
            
            // Configurar eventos
            this.setupEventListeners();
            
            // Configurar selectores de hora
            this.setupTimeSelectors();
            
            // Cargar configuración actual
            await this.loadCurrentConfig();
            
            console.log('✅ ConsultaHorariosManager inicializado correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando ConsultaHorariosManager:', error);
            this.showError('Error al cargar el sistema de consulta');
        }
    }

    setupPage() {
        if (window.SICAComponents) {
            window.SICAComponents.setPageTitle('Consulta de Horarios - SICA');
        } else {
            document.title = 'Consulta de Horarios - SICA';
        }
    }

    async setupFirebase() {
        return new Promise((resolve, reject) => {
            const checkFirebase = setInterval(() => {
                if (window.firebaseDB) {
                    clearInterval(checkFirebase);
                    this.db = window.firebaseDB;
                    console.log('🔥 Firebase configurado para consulta pública');
                    resolve();
                }
            }, 100);
            
            setTimeout(() => {
                clearInterval(checkFirebase);
                if (!this.db) {
                    reject(new Error('Firebase no disponible'));
                }
            }, 10000);
        });
    }

    setupEventListeners() {
        // Eventos principales
        document.getElementById('buscarBtn').addEventListener('click', () => this.buscarAsesores());
        document.getElementById('asesorPorIntervaloBtn').addEventListener('click', () => this.openModal());
        document.getElementById('refreshBtn').addEventListener('click', () => this.refreshAsistencia());
        
        // Eventos del modal
        document.getElementById('modalBuscarBtn').addEventListener('click', () => this.buscarEnModal());
        
        // Auto-búsqueda cuando cambian los selectores
        document.getElementById('diaSelect').addEventListener('change', () => this.onFiltersChange());
        document.getElementById('horarioSelect').addEventListener('change', () => this.onFiltersChange());
        
        console.log('🎧 Event listeners configurados');
    }

    setupTimeSelectors() {
        const horarioSelect = document.getElementById('horarioSelect');
        const modalDesdeSelect = document.getElementById('modalDesdeSelect');
        const modalHastaSelect = document.getElementById('modalHastaSelect');
        
        // Generar intervalos de 30 minutos desde 7:00 hasta 21:00 para selector principal
        const intervals = [];
        for (let hour = 7; hour <= 20; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
                const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                const endHour = minute === 30 ? hour + 1 : hour;
                const endMinute = minute === 30 ? 0 : 30;
                const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
                
                if (endHour <= 21) {
                    intervals.push({
                        value: `${startTime}-${endTime}`,
                        display: `${this.formatTimeDisplay(startTime)} - ${this.formatTimeDisplay(endTime)}`
                    });
                }
            }
        }
        
        // Llenar selector principal
        intervals.forEach(interval => {
            const option = new Option(interval.display, interval.value);
            horarioSelect.appendChild(option);
        });
        
        // Generar opciones de tiempo individuales para el modal (cada 30 minutos)
        const timeOptions = [];
        for (let hour = 7; hour <= 21; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
                // Evitar 21:30 ya que el último horario debe ser hasta 21:00
                if (hour === 21 && minute === 30) break;
                
                const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                timeOptions.push({
                    value: timeString,
                    display: this.formatTimeDisplay(timeString)
                });
            }
        }
        
        // Llenar selectores del modal
        timeOptions.forEach(time => {
            const optionDesde = new Option(time.display, time.value);
            const optionHasta = new Option(time.display, time.value);
            modalDesdeSelect.appendChild(optionDesde);
            modalHastaSelect.appendChild(optionHasta);
        });
        
        // Configurar comportamiento inteligente: cuando se selecciona "Desde", 
        // sugerir "Hasta" una hora después
        modalDesdeSelect.addEventListener('change', () => {
            const desdeValue = modalDesdeSelect.value;
            if (desdeValue && modalHastaSelect.value === '') {
                const [hours, minutes] = desdeValue.split(':').map(Number);
                let suggestedHour = hours + 1;
                let suggestedMinute = minutes;
                
                // Asegurar que no exceda 21:00
                if (suggestedHour > 21 || (suggestedHour === 21 && suggestedMinute > 0)) {
                    suggestedHour = 21;
                    suggestedMinute = 0;
                }
                
                const suggestedTime = `${suggestedHour.toString().padStart(2, '0')}:${suggestedMinute.toString().padStart(2, '0')}`;
                modalHastaSelect.value = suggestedTime;
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

    async loadCurrentConfig() {
        try {
            this.showLoading('Cargando configuración...');
            
            // Obtener configuración actual
            const configSnapshot = await this.db.collection('configuracion').limit(1).get();
            
            if (!configSnapshot.empty) {
                const configDoc = configSnapshot.docs[0];
                this.currentTipoBloque = configDoc.data().tipoBloque || 'definitivo';
            } else {
                this.currentTipoBloque = 'definitivo'; // Valor por defecto
            }
            
            console.log('📋 Tipo de bloque actual:', this.currentTipoBloque);
            
            // Cargar asesores
            await this.loadAsesores();
            
            this.hideLoading();
            
        } catch (error) {
            console.error('❌ Error cargando configuración:', error);
            this.currentTipoBloque = 'definitivo'; // Fallback
            await this.loadAsesores();
            this.hideLoading();
        }
    }

    async loadAsesores() {
        try {
            const snapshot = await this.db.collection('asesores')
                .where('estado', '==', 'aprobado')
                .get();
            
            this.asesores.clear();
            snapshot.forEach(doc => {
                const data = doc.data();
                this.asesores.set(doc.id, {
                    id: doc.id,
                    nombre: data.nombreHorario,
                    numeroAsesor: data.numeroAsesor,
                    numeroCuenta: data.numeroCuenta, // Agregar este campo
                    foto: data.fotoUrl || data.foto || null, // Usar fotoUrl como campo principal
                    email: data.email
                });
            });
            
            console.log(`✅ ${this.asesores.size} asesores cargados`);
            
        } catch (error) {
            console.error('❌ Error cargando asesores:', error);
            throw error;
        }
    }

    onFiltersChange() {
        const dia = document.getElementById('diaSelect').value;
        const horario = document.getElementById('horarioSelect').value;
        
        if (dia && horario) {
            // Auto-buscar cuando ambos campos estén completos
            setTimeout(() => this.buscarAsesores(), 300);
        } else {
            // Mostrar estado vacío
            this.showEmptyState();
        }
    }

    async buscarAsesores() {
    const dia = document.getElementById('diaSelect').value;
    const horario = document.getElementById('horarioSelect').value;
    
    if (!dia || !horario) {
        this.showNotification('Selecciona día y horario', 'warning');
        return;
    }
    
    try {
        this.showLoading('Buscando asesores disponibles...');
        
        const [horaInicio, horaFinal] = horario.split('-');
        
        // Buscar horarios que coincidan
        const horariosSnapshot = await this.db.collection('horarios')
            .where('tipoBloque', '==', this.currentTipoBloque)
            .where('dias', 'array-contains', dia)
            .get();
        
        // Cargar registros de asistencia del día específico que se está consultando
        await this.loadRegistrosAsistencia(dia);
        
        // Filtrar por horario específico
        const asesoresDisponibles = {
            'SICA-1': [],
            'SICA-2': [],
            'SICA-4': []
        };
        
        horariosSnapshot.forEach(doc => {
            const horarioData = doc.data();
            
            // Verificar si el horario coincide con el rango solicitado
            if (this.horariosCoinciden(horarioData.horaInicio, horarioData.horaFinal, horaInicio, horaFinal)) {
                const asesor = this.asesores.get(horarioData.asesorId);
                if (asesor && asesoresDisponibles[horarioData.sala]) {
                    // Verificar asistencia usando numeroCuenta como prioridad
                    const estaPresente = this.verificarAsistencia(asesor.numeroCuenta);
                    
                    asesoresDisponibles[horarioData.sala].push({
                        ...asesor,
                        posicion: horarioData.posicion,
                        presente: estaPresente,
                        horarioInicio: horarioData.horaInicio,
                        horarioFinal: horarioData.horaFinal
                    });
                }
            }
        });
        
        this.hideLoading();
        this.displayResults(asesoresDisponibles);
        
    } catch (error) {
        console.error('❌ Error buscando asesores:', error);
        this.hideLoading();
        this.showError('Error al buscar asesores');
    }
}

    // Nuevo método para cargar registros de asistencia del día actual
async loadRegistrosAsistencia(diaConsultado) {
    try {
        const diaIngles = this.convertirDiaAIngles(diaConsultado);
        
        console.log('🔄 Iniciando carga de registros de asistencia...');
        console.log('📅 Día consultado:', diaConsultado, '→', diaIngles);
        console.log('📅 Buscando registros que inicien con:', diaIngles);
        
        // Obtener todos los registros y filtrar por el día de la semana
        const snapshot = await this.db.collection('registroasistencia').get();
        
        console.log(`🔍 Encontrados ${snapshot.size} registros totales en la base de datos`);
        
        // Limpiar cache anterior
        this.registrosAsistencia.clear();
        
        // Filtrar registros que coincidan con el día consultado
        let registrosFiltrados = 0;
        let registrosDelDia = [];
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const fecha = data.fecha; // "Mon Jul 27 2025"
            
            // 🔍 DEBUG: Mostrar estructura completa del registro
            console.log('📄 Estructura completa del registro:', {
                id: doc.id,
                data: data
            });
            
            // Extraer el día de la semana (primeras 3 letras)
            if (fecha && fecha.startsWith(diaIngles)) {
                const numeroCuenta = data.numeroCuenta;
                
                // 🔧 CORREGIDO: Leer la estructura correcta
                let tipo = null;
                let hora = null;
                let timestamp = null;
                
                // Verificar si existe el campo 'entrada'
                if (data.entrada) {
                    console.log('✅ Encontrado registro de ENTRADA:', data.entrada);
                    tipo = 'entrada';
                    hora = data.entrada.horaRedondeada || data.entrada.hora;
                    timestamp = data.entrada.timestamp || data.timestamp;
                }
                
                // Verificar si existe el campo 'salida'
                if (data.salida) {
                    console.log('✅ Encontrado registro de SALIDA:', data.salida);
                    tipo = 'salida';
                    hora = data.salida.horaRedondeada || data.salida.hora;
                    timestamp = data.salida.timestamp || data.timestamp;
                }
                
                // Si no hay entrada ni salida, revisar campos directos (estructura antigua)
                if (!tipo && data.tipo) {
                    tipo = data.tipo;
                    hora = data.hora;
                    timestamp = data.timestamp;
                }
                
                console.log('✅ Registro procesado:', {
                    id: doc.id,
                    numeroCuenta: numeroCuenta,
                    nombreAsesor: data.nombreAsesor,
                    tipo: tipo,
                    hora: hora,
                    fecha: data.fecha,
                    timestamp: timestamp
                });
                
                registrosDelDia.push({
                    id: doc.id,
                    numeroCuenta: numeroCuenta,
                    nombreAsesor: data.nombreAsesor,
                    tipo: tipo,
                    hora: hora,
                    fecha: data.fecha,
                    timestamp: timestamp
                });
                
                if (numeroCuenta && tipo) {
                    // Si ya existe un registro para este asesor, mantener solo el más reciente
                    const timestampValue = timestamp || Date.now();
                    
                    if (!this.registrosAsistencia.has(numeroCuenta) || 
                        timestampValue > (this.registrosAsistencia.get(numeroCuenta).timestamp || 0)) {
                        
                        this.registrosAsistencia.set(numeroCuenta, {
                            nombreAsesor: data.nombreAsesor,
                            numeroCuenta: numeroCuenta,
                            tipo: tipo, // "entrada" o "salida"
                            hora: hora,
                            timestamp: timestampValue,
                            fecha: data.fecha
                        });
                        
                        console.log(`💾 Guardado registro para numeroCuenta ${numeroCuenta}: ${tipo} a las ${hora}`);
                        registrosFiltrados++;
                    } else {
                        console.log(`⏭️ Registro más antiguo ignorado para numeroCuenta ${numeroCuenta}`);
                    }
                } else {
                    if (!numeroCuenta) {
                        console.log('⚠️ Registro sin numeroCuenta:', doc.id);
                    }
                    if (!tipo) {
                        console.log('⚠️ Registro sin tipo válido:', doc.id, '- data:', data);
                    }
                }
            } else {
                console.log(`❌ Registro NO coincide con día ${diaIngles}:`, {
                    fecha: fecha,
                    diaExtraido: fecha ? fecha.substring(0, 3) : 'undefined'
                });
            }
        });
        
        console.log(`✅ ${registrosFiltrados} registros de asistencia procesados para ${diaConsultado} (${diaIngles})`);
        console.log('📋 Todos los registros del día encontrados:', registrosDelDia);
        console.log('📋 Registros finales en cache:', Array.from(this.registrosAsistencia.entries()));
        console.log('🔑 numeroCuentas con registros:', Array.from(this.registrosAsistencia.keys()));
        
    } catch (error) {
        console.error('❌ Error cargando registros de asistencia:', error);
    }
}

getFechaDelDiaConsultado(diaConsultado) {
    const dayMap = {
        'lunes': 1,
        'martes': 2,
        'miercoles': 3,
        'jueves': 4,
        'viernes': 5,
        'sabado': 6,
        'domingo': 0
    };
    
    const targetDayNumber = dayMap[diaConsultado];
    const today = new Date();
    const currentDayNumber = today.getDay();
    
    // Calcular cuántos días hay que agregar o restar para llegar al día consultado
    let dayDifference = targetDayNumber - currentDayNumber;
    
    // Crear fecha del día consultado
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + dayDifference);
    
    return targetDate.toDateString(); // Formato: "Mon Jul 28 2025"
}

convertirDiaAIngles(diaEspanol) {
    const mapaDias = {
        'lunes': 'Mon',
        'martes': 'Tue', 
        'miercoles': 'Wed',
        'jueves': 'Thu',
        'viernes': 'Fri',
        'sabado': 'Sat',
        'domingo': 'Sun'
    };
    return mapaDias[diaEspanol];
}

    // Verificar si un asesor está presente basado en su último registro
    verificarAsistencia(numeroCuenta) {
        if (!numeroCuenta) {
            console.log('⚠️ No se proporcionó numeroCuenta para verificar asistencia');
            return false;
        }
        
        const registro = this.registrosAsistencia.get(numeroCuenta);
        if (!registro) {
            console.log(`⚠️ No se encontró registro de asistencia para numeroCuenta: ${numeroCuenta}`);
            return false;
        }
        
        console.log(`✅ Registro encontrado para ${numeroCuenta}:`, registro);
        
        // Consideramos presente si su último registro es "entrada"
        // y fue hecho el día actual
        const estaPresente = registro.tipo === 'entrada';
        console.log(`📊 Asesor ${numeroCuenta} está ${estaPresente ? 'PRESENTE' : 'AUSENTE'} (último registro: ${registro.tipo})`);
        
        return estaPresente;
    }

    displayResults(asesoresDisponibles) {
        // Actualizar estadísticas con información de asistencia
        this.updateStatsWithAttendance(asesoresDisponibles);
        
        // Mostrar secciones
        document.getElementById('statsPanel').style.display = 'block';
        document.getElementById('salasSection').style.display = 'block';
        document.getElementById('emptyState').style.display = 'none';
        document.getElementById('noResultsState').style.display = 'none';
        
        // Renderizar asesores por sala
        this.renderSala('sica1', 'SICA-1', asesoresDisponibles['SICA-1']);
        this.renderSala('sica2', 'SICA-2', asesoresDisponibles['SICA-2']);
        this.renderSala('sica4', 'SICA-4', asesoresDisponibles['SICA-4']);
        
        // Verificar si hay resultados
        const totalAsesores = Object.values(asesoresDisponibles).reduce((sum, arr) => sum + arr.length, 0);
        if (totalAsesores === 0) {
            document.getElementById('salasSection').style.display = 'none';
            document.getElementById('noResultsState').style.display = 'block';
        }
    }

    updateStats(asesoresDisponibles) {
        const totalAsesores = this.asesores.size;
        
        // Calcular disponibles por sala
        const sica1Count = asesoresDisponibles['SICA-1'].length;
        const sica2Count = asesoresDisponibles['SICA-2'].length;
        const sica4Count = asesoresDisponibles['SICA-4'].length;
        
        // Actualizar contadores
        document.getElementById('sica1Count').textContent = `${sica1Count}/${Math.ceil(totalAsesores/3)}`;
        document.getElementById('sica2Count').textContent = `${sica2Count}/${Math.ceil(totalAsesores/3)}`;
        document.getElementById('sica4Count').textContent = `${sica4Count}/${Math.ceil(totalAsesores/3)}`;
        
        // Actualizar badges del acordeón
        document.getElementById('sica1CountBadge').textContent = `${sica1Count} asesores`;
        document.getElementById('sica2CountBadge').textContent = `${sica2Count} asesores`;
        document.getElementById('sica4CountBadge').textContent = `${sica4Count} asesores`;
    }

    horariosCoinciden(inicioHorario, finalHorario, inicioBusqueda, finalBusqueda) {
        // Convertir a minutos para facilitar comparación
        const toMinutes = (time) => {
            const [h, m] = time.split(':').map(Number);
            return h * 60 + m;
        };
        
        const inicioH = toMinutes(inicioHorario);
        const finalH = toMinutes(finalHorario);
        const inicioB = toMinutes(inicioBusqueda);
        const finalB = toMinutes(finalBusqueda);
        
        // Verificar si hay superposición
        return inicioH <= inicioB && finalH >= finalB;
    }

    renderSala(salaId, salaNombre, asesores) {
        const container = document.getElementById(`${salaId}Asesores`);
        
        if (asesores.length === 0) {
            container.innerHTML = `
                <div class="text-center p-4">
                    <i class="bi bi-person-x text-muted" style="font-size: 2rem;"></i>
                    <p class="text-muted mt-2">No hay asesores disponibles en ${salaNombre}</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = asesores.map(asesor => {
            // Determinar estado de asistencia
            const estadoClass = asesor.presente ? 'asesor-presente' : 'asesor-ausente';
            const estadoIcon = asesor.presente ? 'bi-check-circle-fill' : 'bi-x-circle-fill';
            const estadoText = asesor.presente ? 'Presente' : 'Ausente';
            
            return `
                <div class="asesor-card ${estadoClass} fade-in">
                    <div class="asesor-status">
                        <i class="bi ${estadoIcon}"></i>
                        <span>${estadoText}</span>
                    </div>
                    <div class="asesor-avatar">
                        ${asesor.foto ? 
                            `<img src="${asesor.foto}" alt="${asesor.nombre}" 
                                  onerror="this.style.display='none'; this.parentNode.querySelector('.avatar-fallback').style.display='flex';"
                                  onload="this.parentNode.querySelector('.avatar-fallback').style.display='none';">
                             <div class="avatar-fallback" style="display:none; width:100%; height:100%; align-items:center; justify-content:center; background: linear-gradient(135deg, #2563eb, #3b82f6); border-radius:50%; color:white; font-weight:700; position:absolute; top:0; left:0;">${this.getInitials(asesor.nombre)}</div>` :
                            `<div class="avatar-fallback" style="width:100%; height:100%; align-items:center; justify-content:center; background: linear-gradient(135deg, #2563eb, #3b82f6); border-radius:50%; color:white; font-weight:700; display:flex;">${this.getInitials(asesor.nombre)}</div>`
                        }
                    </div>
                    <div class="asesor-info">
                        <div class="asesor-name">${asesor.nombre}</div>
                        <div class="asesor-number">#${asesor.numeroAsesor}</div>
                        <div class="asesor-schedule">
                            <small class="text-muted">
                                <i class="bi bi-clock me-1"></i>
                                ${this.formatTimeDisplay(asesor.horarioInicio)} - ${this.formatTimeDisplay(asesor.horarioFinal)}
                            </small>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    getInitials(name) {
        return name.split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .substring(0, 2);
    }

    showEmptyState() {
        document.getElementById('statsPanel').style.display = 'none';
        document.getElementById('salasSection').style.display = 'none';
        document.getElementById('emptyState').style.display = 'block';
        document.getElementById('noResultsState').style.display = 'none';
    }

    // ========================================
    // MODAL FUNCTIONALITY
    // ========================================

    openModal() {
        const modal = new bootstrap.Modal(document.getElementById('asesorPorIntervaloModal'));
        modal.show();
    }

    async buscarEnModal() {
    const dia = document.getElementById('modalDiaSelect').value;
    const desde = document.getElementById('modalDesdeSelect').value;
    const hasta = document.getElementById('modalHastaSelect').value;
    
    if (!dia || !desde || !hasta) {
        this.showNotification('Selecciona día, hora de inicio y hora final', 'warning');
        return;
    }
    
    // Validar que "hasta" sea mayor que "desde"
    if (desde >= hasta) {
        this.showNotification('La hora final debe ser mayor que la hora de inicio', 'warning');
        return;
    }
    
    try {
        this.showModalLoading();
        
        // Buscar horarios que coincidan con el día
        const horariosSnapshot = await this.db.collection('horarios')
            .where('tipoBloque', '==', this.currentTipoBloque)
            .where('dias', 'array-contains', dia)
            .get();
        
        // Cargar registros de asistencia del día específico que se está consultando
        await this.loadRegistrosAsistencia(dia);
        
        // Filtrar por rango de tiempo específico
        const asesoresDisponibles = {
            'SICA-1': [],
            'SICA-2': [],
            'SICA-4': []
        };
        
        horariosSnapshot.forEach(doc => {
            const horarioData = doc.data();
            
            // Verificar si el horario del asesor se superpone con el rango solicitado
            if (this.horariosSeSuperponen(
                horarioData.horaInicio, 
                horarioData.horaFinal, 
                desde, 
                hasta
            )) {
                const asesor = this.asesores.get(horarioData.asesorId);
                if (asesor && asesoresDisponibles[horarioData.sala]) {
                    // Verificar asistencia usando numeroCuenta como prioridad
                    const estaPresente = this.verificarAsistencia(asesor.numeroCuenta);
                    
                    // Evitar duplicados si un asesor tiene múltiples horarios que coinciden
                    const yaExiste = asesoresDisponibles[horarioData.sala].some(a => a.id === asesor.id);
                    if (!yaExiste) {
                        asesoresDisponibles[horarioData.sala].push({
                            ...asesor,
                            posicion: horarioData.posicion,
                            horarioInicio: horarioData.horaInicio,
                            horarioFinal: horarioData.horaFinal,
                            presente: estaPresente
                        });
                    }
                }
            }
        });
        
        this.hideModalLoading();
        this.displayModalResults(asesoresDisponibles, desde, hasta);
        
    } catch (error) {
        console.error('❌ Error buscando en modal:', error);
        this.hideModalLoading();
        this.showError('Error al buscar asesores');
    }
}

    // Nuevo método para verificar si dos rangos de horarios se superponen
    horariosSeSuperponen(inicioAsesor, finalAsesor, inicioBusqueda, finalBusqueda) {
        // Convertir a minutos para facilitar comparación
        const toMinutes = (time) => {
            const [h, m] = time.split(':').map(Number);
            return h * 60 + m;
        };
        
        const inicioA = toMinutes(inicioAsesor);
        const finalA = toMinutes(finalAsesor);
        const inicioB = toMinutes(inicioBusqueda);
        const finalB = toMinutes(finalBusqueda);
        
        // Verificar si hay superposición: los rangos se superponen si el inicio de uno 
        // es menor que el final del otro y viceversa
        return inicioA < finalB && finalA > inicioB;
    }

    displayModalResults(asesoresDisponibles, desde = null, hasta = null) {
        // Actualizar contadores
        document.getElementById('modalSica1Count').textContent = asesoresDisponibles['SICA-1'].length;
        document.getElementById('modalSica2Count').textContent = asesoresDisponibles['SICA-2'].length;
        document.getElementById('modalSica4Count').textContent = asesoresDisponibles['SICA-4'].length;
        
        // Renderizar resultados
        this.renderModalSala('modalSica1Asesores', asesoresDisponibles['SICA-1'], desde, hasta);
        this.renderModalSala('modalSica2Asesores', asesoresDisponibles['SICA-2'], desde, hasta);
        this.renderModalSala('modalSica4Asesores', asesoresDisponibles['SICA-4'], desde, hasta);
        
        // Mostrar/ocultar secciones
        const totalAsesores = Object.values(asesoresDisponibles).reduce((sum, arr) => sum + arr.length, 0);
        
        if (totalAsesores > 0) {
            document.getElementById('modalResults').style.display = 'block';
            document.getElementById('modalEmptyState').style.display = 'none';
            document.getElementById('modalNoResults').style.display = 'none';
        } else {
            document.getElementById('modalResults').style.display = 'none';
            document.getElementById('modalEmptyState').style.display = 'none';
            document.getElementById('modalNoResults').style.display = 'block';
        }
    }

    renderModalSala(containerId, asesores, desde = null, hasta = null) {
        const container = document.getElementById(containerId);
        
        if (asesores.length === 0) {
            container.innerHTML = `
                <div class="text-center p-3">
                    <i class="bi bi-person-x text-muted"></i>
                    <small class="text-muted">Sin asesores</small>
                </div>
            `;
            return;
        }
        
        container.innerHTML = asesores.map(asesor => {
            // Mostrar información adicional del horario y estado de asistencia
            const estadoClass = asesor.presente ? 'modal-asesor-presente' : 'modal-asesor-ausente';
            const estadoIcon = asesor.presente ? 'bi-check-circle-fill' : 'bi-x-circle-fill';
            
            const horarioInfo = (desde && hasta) ? 
                `<div class="modal-asesor-schedule">
                    <small class="text-muted">
                        <i class="bi bi-clock me-1"></i>
                        ${this.formatTimeDisplay(asesor.horarioInicio || desde)} - ${this.formatTimeDisplay(asesor.horarioFinal || hasta)}
                    </small>
                </div>` : '';
            
            return `
                <div class="modal-asesor-card ${estadoClass} slide-in">
                    <div class="modal-asesor-status">
                        <i class="bi ${estadoIcon}"></i>
                    </div>
                    <div class="modal-asesor-avatar">
                        ${asesor.foto ? 
                            `<img src="${asesor.foto}" alt="${asesor.nombre}" 
                                  onerror="this.style.display='none'; this.parentNode.querySelector('.avatar-fallback').style.display='flex';"
                                  onload="this.parentNode.querySelector('.avatar-fallback').style.display='none';">
                             <div class="avatar-fallback" style="display:none; width:100%; height:100%; align-items:center; justify-content:center; background: linear-gradient(135deg, #2563eb, #3b82f6); border-radius:50%; color:white; font-weight:600; position:absolute; top:0; left:0;">${this.getInitials(asesor.nombre)}</div>` :
                            `<div class="avatar-fallback" style="width:100%; height:100%; align-items:center; justify-content:center; background: linear-gradient(135deg, #2563eb, #3b82f6); border-radius:50%; color:white; font-weight:600; display:flex;">${this.getInitials(asesor.nombre)}</div>`
                        }
                    </div>
                    <div class="modal-asesor-name">${asesor.nombre}</div>
                    <div class="modal-asesor-number">#${asesor.numeroAsesor}</div>
                    ${horarioInfo}
                </div>
            `;
        }).join('');
    }

    showModalLoading() {
        const btn = document.getElementById('modalBuscarBtn');
        btn.classList.add('btn-loading');
        btn.disabled = true;
    }

    hideModalLoading() {
        const btn = document.getElementById('modalBuscarBtn');
        btn.classList.remove('btn-loading');
        btn.disabled = false;
    }

    // ========================================
    // UTILITY METHODS
    // ========================================

    showLoading(message = 'Cargando...') {
    const modal = document.getElementById('loadingModal');
    const messageElement = document.getElementById('loadingMessage');
    
    if (modal && messageElement) {
        messageElement.textContent = message;
        
        // Cerrar cualquier instancia anterior antes de abrir
        const existingInstance = bootstrap.Modal.getInstance(modal);
        if (existingInstance) {
            existingInstance.hide();
        }
        
        // Crear nueva instancia y mostrar
        setTimeout(() => {
            const bsModal = new bootstrap.Modal(modal, {
                backdrop: 'static',
                keyboard: false
            });
            bsModal.show();
            
            // Guardar referencia para poder cerrar después
            this.currentLoadingModal = bsModal;
        }, 100);
    }
    
    // Agregar estado de loading al botón principal
    const btn = document.getElementById('buscarBtn');
    if (btn) {
        btn.classList.add('btn-loading');
        btn.disabled = true;
    }
}

hideLoading() {
    console.log('🔄 Intentando cerrar modal de loading...');
    
    const modal = document.getElementById('loadingModal');
    if (modal) {
        // Método 1: Usar la referencia guardada
        if (this.currentLoadingModal) {
            try {
                this.currentLoadingModal.hide();
                this.currentLoadingModal = null;
                console.log('✅ Modal cerrado usando referencia guardada');
            } catch (error) {
                console.log('⚠️ Error con referencia guardada, intentando alternativas...');
            }
        }
        
        // Método 2: Buscar instancia existente
        const existingInstance = bootstrap.Modal.getInstance(modal);
        if (existingInstance) {
            try {
                existingInstance.hide();
                console.log('✅ Modal cerrado usando instancia existente');
            } catch (error) {
                console.log('⚠️ Error con instancia existente');
            }
        }
        
        // Método 3: Forzar cierre manual (fallback)
        setTimeout(() => {
            modal.style.display = 'none';
            modal.classList.remove('show');
            modal.setAttribute('aria-hidden', 'true');
            modal.removeAttribute('aria-modal', 'role');
            
            // Remover backdrop
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.remove();
            }
            
            // Restaurar body
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
            
            console.log('✅ Modal cerrado forzadamente');
        }, 500);
    }
    
    // Remover estado de loading del botón principal
    const btn = document.getElementById('buscarBtn');
    if (btn) {
        btn.classList.remove('btn-loading');
        btn.disabled = false;
    }
}


    showNotification(message, type = 'info') {
        // Crear notificación simple sin dependencias externas
        const notification = document.createElement('div');
        notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            min-width: 300px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        `;
        
        const iconMap = {
            success: 'bi-check-circle-fill',
            error: 'bi-x-circle-fill',
            warning: 'bi-exclamation-triangle-fill',
            info: 'bi-info-circle-fill'
        };
        
        notification.innerHTML = `
            <i class="bi ${iconMap[type]} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    showError(message) {
        this.showNotification(message, 'error');
        
        // Mostrar estado de error en la interfaz
        document.getElementById('statsPanel').style.display = 'none';
        document.getElementById('salasSection').style.display = 'none';
        document.getElementById('emptyState').style.display = 'none';
        document.getElementById('noResultsState').style.display = 'block';
        
        // Cambiar mensaje del estado de error
        const noResultsState = document.getElementById('noResultsState');
        const icon = noResultsState.querySelector('i');
        const title = noResultsState.querySelector('h3');
        const description = noResultsState.querySelector('p');
        
        icon.className = 'bi bi-exclamation-triangle';
        title.textContent = 'Error del Sistema';
        description.textContent = 'No se pudo cargar la información. Intenta nuevamente.';
    }

    // Métodos de utilidad para el manejo de fechas y horarios
    getCurrentDay() {
        const days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
        const today = new Date().getDay();
        return days[today];
    }

    getCurrentTimeSlot() {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        
        // Redondear al intervalo de 30 minutos más cercano
        let startMinutes = minutes < 30 ? 0 : 30;
        let startHour = hours;
        
        // Si pasamos de las 9 PM, no hay horarios disponibles
        if (startHour >= 21) {
            return null;
        }
        
        const startTime = `${startHour.toString().padStart(2, '0')}:${startMinutes.toString().padStart(2, '0')}`;
        
        let endMinutes = startMinutes + 30;
        let endHour = startHour;
        
        if (endMinutes >= 60) {
            endMinutes = 0;
            endHour++;
        }
        
        const endTime = `${endHour.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
        
        return `${startTime}-${endTime}`;
    }

    // Método para pre-seleccionar día y horario actual
    preSelectCurrentTime() {
        const currentDay = this.getCurrentDay();
        const currentSlot = this.getCurrentTimeSlot();
        
        // Solo pre-seleccionar si es día laborable y hay horario disponible
        const workDays = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];
        
        if (workDays.includes(currentDay) && currentSlot) {
            document.getElementById('diaSelect').value = currentDay;
            document.getElementById('horarioSelect').value = currentSlot;
            
            // Auto-buscar después de un pequeño delay
            setTimeout(() => {
                this.buscarAsesores();
            }, 1000);
        }
    }

    // Método para refrescar datos cada cierto tiempo
    setupAutoRefresh() {
        // Limpiar interval anterior si existe
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }
        
        // Configurar auto-refresh cada 20 minutos (1200000 ms)
        this.autoRefreshInterval = setInterval(async () => {
            const dia = document.getElementById('diaSelect').value;
            const horario = document.getElementById('horarioSelect').value;
            
            if (dia && horario) {
                console.log('🔄 Auto-refrescando datos de asistencia...');
                
                // Mostrar indicador
                this.showAutoRefreshIndicator();
                
                try {
                    // Solo recargar registros de asistencia y actualizar vista
                    await this.loadRegistrosAsistencia();
                    
                    // Re-ejecutar búsqueda actual para actualizar estados
                    await this.buscarAsesores();
                    
                    console.log('✅ Auto-refresh completado');
                    
                } catch (error) {
                    console.error('❌ Error en auto-refresh:', error);
                }
                
                // Ocultar indicador
                this.hideAutoRefreshIndicator();
            }
        }, 20 * 60 * 1000); // 20 minutos
        
        console.log('🔄 Auto-refresh configurado cada 20 minutos');
    }

    // Método para refrescamento manual
    async refreshAsistencia() {
        const dia = document.getElementById('diaSelect').value;
        const horario = document.getElementById('horarioSelect').value;
        
        if (!dia || !horario) {
            this.showNotification('Selecciona día y horario para actualizar', 'warning');
            return;
        }
        
        try {
            this.showLoading('Actualizando asistencia...');
            
            await this.loadRegistrosAsistencia();
            await this.buscarAsesores();
            
            this.hideLoading();
            this.showNotification('Asistencia actualizada', 'success');
            
        } catch (error) {
            console.error('❌ Error refrescando asistencia:', error);
            this.hideLoading();
            this.showNotification('Error al actualizar', 'error');
        }
    }

    // Indicadores visuales para auto-refresh
    showAutoRefreshIndicator() {
        const indicator = document.getElementById('autoRefreshIndicator');
        if (indicator) {
            indicator.classList.add('show');
        }
    }

    hideAutoRefreshIndicator() {
        const indicator = document.getElementById('autoRefreshIndicator');
        if (indicator) {
            setTimeout(() => {
                indicator.classList.remove('show');
            }, 2000); // Mostrar por 2 segundos
        }
    }

    // Método para mostrar estadísticas de asistencia
    updateStatsWithAttendance(asesoresDisponibles) {
        const totalAsesores = this.asesores.size;
        
        // Calcular disponibles y presentes por sala
        Object.keys(asesoresDisponibles).forEach(sala => {
            const asesoresSala = asesoresDisponibles[sala];
            const presentes = asesoresSala.filter(a => a.presente).length;
            const total = asesoresSala.length;
            
            // Actualizar contadores con información de asistencia
            const salaKey = sala.toLowerCase().replace('-', '');
            const countElement = document.getElementById(`${salaKey}Count`);
            const badgeElement = document.getElementById(`${salaKey}CountBadge`);
            
            if (countElement) {
                countElement.innerHTML = `${presentes}/${total} <small class="text-muted">presentes</small>`;
            }
            
            if (badgeElement) {
                badgeElement.textContent = `${total} asesores (${presentes} presentes)`;
            }
        });
    }

    // Método para estadísticas básicas (sin exponer datos sensibles)
    logUsageStats() {
        const usage = {
            timestamp: new Date().toISOString(),
            page: 'consulta-horarios',
            tipoBloque: this.currentTipoBloque,
            totalAsesores: this.asesores.size
        };
        
        console.log('📊 Estadísticas de uso:', usage);
        
        // Aquí podrías enviar estadísticas anónimas si es necesario
        // pero sin exponer información sensible de usuarios
    }
}

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    // Esperar a que Firebase esté disponible
    const checkFirebase = setInterval(() => {
        if (window.firebaseDB) {
            clearInterval(checkFirebase);
            
            // Inicializar el manager
            window.consultaManager = new ConsultaHorariosManager();
            
            // Configurar auto-refresh
            setTimeout(() => {
                if (window.consultaManager) {
                    window.consultaManager.setupAutoRefresh();
                }
            }, 3000);
            
            // Pre-seleccionar horario actual si es apropiado
            setTimeout(() => {
                if (window.consultaManager) {
                    window.consultaManager.preSelectCurrentTime();
                }
            }, 2000);
            
            console.log('🚀 Sistema de consulta de horarios cargado');
        }
    }, 100);
    
    // Timeout de seguridad
    setTimeout(() => {
        clearInterval(checkFirebase);
        if (!window.consultaManager) {
            console.error('❌ No se pudo inicializar el sistema de consulta');
            
            // Mostrar mensaje de error amigable
            const mainContent = document.getElementById('main-content');
            if (mainContent) {
                mainContent.innerHTML = `
                    <div class="container">
                        <div class="alert alert-warning text-center">
                            <i class="bi bi-exclamation-triangle-fill me-2"></i>
                            <h4>Sistema Temporalmente No Disponible</h4>
                            <p>El sistema de consulta de horarios no está disponible en este momento. 
                               Por favor, intenta más tarde o contacta al área de sistemas.</p>
                            <button class="btn btn-outline-primary mt-3" onclick="location.reload()">
                                <i class="bi bi-arrow-clockwise me-1"></i>Intentar Nuevamente
                            </button>
                        </div>
                    </div>
                `;
            }
        }
    }, 15000); // Tiempo más largo para conexiones lentas
});

// Manejar errores globales de manera amigable
window.addEventListener('error', (event) => {
    console.error('❌ Error global en consulta-horarios:', event.error);
    
    // No mostrar errores técnicos al usuario final
    // Solo log interno para debugging
});

// Manejar errores de conexión
window.addEventListener('online', () => {
    console.log('🌐 Conexión restaurada');
    if (window.consultaManager) {
        window.consultaManager.showNotification('Conexión restaurada', 'success');
    }
});

window.addEventListener('offline', () => {
    console.log('📵 Sin conexión');
    if (window.consultaManager) {
        window.consultaManager.showNotification('Sin conexión a internet', 'warning');
    }
});

// Exportar para uso global (si es necesario)
window.ConsultaHorariosManager = ConsultaHorariosManager;