// Admin Incidencias - Sistema de Gestión
const gestionIncidencias = {
    db: firebase.firestore(),
    asesores: [],
    incidencias: [],
    incidenciaEditando: null,
    
    // Definición de faltas y sus sanciones (en minutos)
    faltas: {
        "NO portar EN TODO MOMENTO Y A LA VISTA, el gafete que los identifica como parte de SICA.": 30,
        "AMISTADES SIN GAFETE DE VISITANTES (el puntaje es por persona no identificada)": 30,
        "NO estar en su turno. El puntaje es por cada media hora de servicio.": 30,
        "Comer o beber en las áreas de ENTRADA e IMPRESIONES Y/O EN HORARIO DE SERVICIO": 30,
        "Escuchar música en las áreas de ENTRADA e IMPRESIONES (con o sin audífonos)": 30,
        "Desarrollar algún tipo de juego en las áreas expuestas al público.": 30,
        "Hacer escándalo dentro de las instalaciones de SICA.": 120,
        "DPA (Demostración Pública de Afecto p. ej. besos, caricias, etc.)": 30,
        "Hacer uso del teléfono de SICA para llamadas AJENAS a asuntos internos (sin autorización)": 30,
        "Hablar por teléfono celular durante su estancia en entrada o impresiones.": 30,
        "Utilizar dispositivos electrónicos mientras se vigila un curso y/o examen.": 30,
        "Dejar basura en cualquier área de SICA.": 30,
        "Encubrimiento de otro asesor y no levantar los reportes correspondientes durante su horario de servicio.": 30,
        "No estar atendiendo sus actividades en el horario de servicio.": 30,
        "No participar en actividades diseñadas para el beneficio de SICA (estas actividades son únicamente dirigidas por administradores)": 30,
        "Tener visitas en horario de servicio (incluye ex-asesores)": 30,
        "Comportamiento indebido de las visitas.": 30,
        "Visitas NO registradas": 30,
        "No registrar la hora de salida de su(s) visita(s)": 30,
        "No obedecer las actividades indicadas por el jefe de área y/o administrador y/o preadministrador.": 30,
        "Poner reporte no objetivo.": 30,
        "Hacer mal uso de las instalaciones de SICA.": 30,
        "Imprimir sin el registro de un testigo": 30,
        "Abandono de servicio dejando SOLO o con pocos asesores cualquier SICA SIN PREVIO AVISO": 120,
        "No ser cordial con los usuarios y/o personal que visita las áreas de SICA.": 60,
        "Hacer uso de los cubículos NO autorizados para visitas. El puntaje es por cada media hora de estancia.": 120,
        "Hacer uso de las pantallas SIN autorización de RENE. El puntaje es por cada media hora de estancia.": 120
    },

    init() {
        this.setupAuth();
        this.generarHorarios();
        this.cargarMotivos();
        this.setupEventListeners();
        this.setFechaHoy();
    },

    setupAuth() {
        firebase.auth().onAuthStateChanged(async (user) => {
            if (!user) {
                window.location.href = '../view/login.html';
                return;
            }
            await this.cargarAsesores();
            await this.cargarIncidencias();
            this.actualizarEstadisticas();
        });
    },

    async cargarAsesores() {
        try {
            const snapshot = await this.db.collection('asesores').get();
            this.asesores = [];
            snapshot.forEach(doc => {
                this.asesores.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            console.log('Asesores cargados:', this.asesores.length);
        } catch (error) {
            console.error('Error cargando asesores:', error);
            this.mostrarNotificacion('Error', 'Error al cargar asesores', 'error');
        }
    },

    async cargarIncidencias() {
        try {
            const snapshot = await this.db.collection('incidencias')
                .orderBy('fecha', 'desc')
                .get();
            
            this.incidencias = [];
            snapshot.forEach(doc => {
                this.incidencias.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            this.renderizarTabla();
            console.log('Incidencias cargadas:', this.incidencias.length);
        } catch (error) {
            console.error('Error cargando incidencias:', error);
            this.mostrarNotificacion('Error', 'Error al cargar incidencias', 'error');
        }
    },

    generarHorarios() {
        const horaInicio = document.getElementById('horaInicio');
        const horaFinal = document.getElementById('horaFinal');
        
        // Limpiar opciones existentes
        horaInicio.innerHTML = '<option value="">Seleccionar</option>';
        horaFinal.innerHTML = '<option value="">Seleccionar</option>';
        
        // Generar horarios de 7:00 AM a 9:00 PM en bloques de 30 minutos
        for (let hora = 7; hora <= 21; hora++) {
            for (let minuto = 0; minuto < 60; minuto += 30) {
                const horaStr = hora.toString().padStart(2, '0');
                const minutoStr = minuto.toString().padStart(2, '0');
                const timeValue = `${horaStr}:${minutoStr}`;
                const displayTime = `${horaStr}:${minutoStr}`;
                
                horaInicio.innerHTML += `<option value="${timeValue}">${displayTime}</option>`;
                horaFinal.innerHTML += `<option value="${timeValue}">${displayTime}</option>`;
            }
        }
    },

    cargarMotivos() {
        const motivoSelect = document.getElementById('motivoFalta');
        motivoSelect.innerHTML = '<option value="">Seleccionar motivo</option>';
        
        Object.keys(this.faltas).forEach(motivo => {
            motivoSelect.innerHTML += `<option value="${motivo}">${motivo}</option>`;
        });
    },

    setupEventListeners() {
        // Filtro de asesor con sugerencias
        const inputAsesor = document.getElementById('inputAsesor');
        const sugerenciasDiv = document.getElementById('sugerenciasAsesor');
        
        inputAsesor.addEventListener('input', (e) => {
            this.mostrarSugerenciasAsesor(e.target.value);
        });

        inputAsesor.addEventListener('blur', () => {
            setTimeout(() => {
                sugerenciasDiv.style.display = 'none';
            }, 200);
        });

        // Cálculo automático de horas
        document.getElementById('horaInicio').addEventListener('change', this.calcularHoras.bind(this));
        document.getElementById('horaFinal').addEventListener('change', this.calcularHoras.bind(this));
        document.getElementById('motivoFalta').addEventListener('change', this.calcularHoras.bind(this));

        // Modal events
        document.getElementById('nuevaIncidenciaModal').addEventListener('hidden.bs.modal', () => {
            this.limpiarFormulario();
        });
    },

    mostrarSugerenciasAsesor(texto) {
        const sugerenciasDiv = document.getElementById('sugerenciasAsesor');
        
        if (!texto.trim()) {
            sugerenciasDiv.style.display = 'none';
            return;
        }

        const filtrados = this.asesores.filter(asesor => 
            asesor.nombreAsesor.toLowerCase().includes(texto.toLowerCase()) ||
            asesor.numeroCuenta.includes(texto)
        );

        if (filtrados.length === 0) {
            sugerenciasDiv.style.display = 'none';
            return;
        }

        sugerenciasDiv.innerHTML = '';
        filtrados.forEach(asesor => {
            const div = document.createElement('div');
            div.className = 'sugerencia-item';
            div.innerHTML = `
                <span class="nombre">${asesor.nombreAsesor}</span>
                <span class="cuenta">#${asesor.numeroCuenta}</span>
            `;
            div.addEventListener('click', () => {
                document.getElementById('inputAsesor').value = asesor.nombreAsesor;
                document.getElementById('asesorSeleccionado').value = asesor.id;
                sugerenciasDiv.style.display = 'none';
            });
            sugerenciasDiv.appendChild(div);
        });

        sugerenciasDiv.style.display = 'block';
    },

    calcularHoras() {
        const horaInicio = document.getElementById('horaInicio').value;
        const horaFinal = document.getElementById('horaFinal').value;
        const motivo = document.getElementById('motivoFalta').value;
        const horasInput = document.getElementById('horasAcumuladas');

        if (!horaInicio || !horaFinal || !motivo) {
            horasInput.value = '';
            return;
        }

        // Convertir horas a minutos para cálculo
        const [horaI, minI] = horaInicio.split(':').map(Number);
        const [horaF, minF] = horaFinal.split(':').map(Number);
        
        const inicioMinutos = horaI * 60 + minI;
        const finalMinutos = horaF * 60 + minF;
        
        if (finalMinutos <= inicioMinutos) {
            horasInput.value = 'Hora final debe ser mayor';
            return;
        }

        // Calcular duración en bloques de 30 minutos
        const duracionMinutos = finalMinutos - inicioMinutos;
        const bloques = Math.ceil(duracionMinutos / 30);
        
        // Obtener sanción por bloque
        const sancionPorBloque = this.faltas[motivo];
        const totalSancion = bloques * sancionPorBloque;
        
        // Convertir a formato horas:minutos
        const horas = Math.floor(totalSancion / 60);
        const minutos = totalSancion % 60;
        
        horasInput.value = `${horas}h ${minutos}m`;
    },

    setFechaHoy() {
        const hoy = new Date().toISOString().split('T')[0];
        document.getElementById('fecha').value = hoy;
    },

    async guardarIncidencia() {
        const form = document.getElementById('formIncidencia');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const asesorId = document.getElementById('asesorSeleccionado').value;
        if (!asesorId) {
            this.mostrarNotificacion('Error', 'Debe seleccionar un asesor válido', 'error');
            return;
        }

        const btnGuardar = document.querySelector('#nuevaIncidenciaModal .btn-sica');
        const originalText = btnGuardar.innerHTML;
        btnGuardar.classList.add('btn-loading');

        try {
            const asesor = this.asesores.find(a => a.id === asesorId);
            const horasText = document.getElementById('horasAcumuladas').value;
            const totalMinutos = this.convertirHorasAMinutos(horasText);

            const incidenciaData = {
                asesorId: asesorId,
                asesorNombre: asesor.nombreAsesor,
                asesorCuenta: asesor.numeroCuenta,
                sala: document.getElementById('sala').value,
                fecha: document.getElementById('fecha').value,
                horaInicio: document.getElementById('horaInicio').value,
                horaFinal: document.getElementById('horaFinal').value,
                motivoFalta: document.getElementById('motivoFalta').value,
                horasAcumuladas: horasText,
                horasEnMinutos: totalMinutos,
                reportadoPor: document.getElementById('reportadoPor').value,
                fechaCreacion: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (this.incidenciaEditando) {
                await this.db.collection('incidencias')
                    .doc(this.incidenciaEditando)
                    .update(incidenciaData);
                this.mostrarNotificacion('Éxito', 'Incidencia actualizada correctamente', 'success');
            } else {
                await this.db.collection('incidencias').add(incidenciaData);
                this.mostrarNotificacion('Éxito', 'Incidencia registrada correctamente', 'success');
            }

            await this.cargarIncidencias();
            this.actualizarEstadisticas();
            bootstrap.Modal.getInstance(document.getElementById('nuevaIncidenciaModal')).hide();

        } catch (error) {
            console.error('Error guardando incidencia:', error);
            this.mostrarNotificacion('Error', 'Error al guardar la incidencia', 'error');
        } finally {
            btnGuardar.classList.remove('btn-loading');
            btnGuardar.innerHTML = originalText;
        }
    },

    convertirHorasAMinutos(horasText) {
        const match = horasText.match(/(\d+)h\s*(\d+)m/);
        if (match) {
            return parseInt(match[1]) * 60 + parseInt(match[2]);
        }
        return 0;
    },

    convertirMinutosAHoras(minutos) {
        const horas = Math.floor(minutos / 60);
        const mins = minutos % 60;
        return `${horas}h ${mins}m`;
    },

    editarIncidencia(id) {
        const incidencia = this.incidencias.find(i => i.id === id);
        if (!incidencia) return;

        this.incidenciaEditando = id;
        
        // Llenar formulario
        document.getElementById('inputAsesor').value = incidencia.asesorNombre;
        document.getElementById('asesorSeleccionado').value = incidencia.asesorId;
        document.getElementById('sala').value = incidencia.sala;
        document.getElementById('fecha').value = incidencia.fecha;
        document.getElementById('horaInicio').value = incidencia.horaInicio;
        document.getElementById('horaFinal').value = incidencia.horaFinal;
        document.getElementById('motivoFalta').value = incidencia.motivoFalta;
        document.getElementById('horasAcumuladas').value = incidencia.horasAcumuladas;
        document.getElementById('reportadoPor').value = incidencia.reportadoPor;
        
        // Cambiar título del modal
        document.getElementById('modalTitulo').textContent = 'Editar Incidencia';
        document.getElementById('btnTexto').textContent = 'Actualizar Incidencia';
        
        // Mostrar modal
        new bootstrap.Modal(document.getElementById('nuevaIncidenciaModal')).show();
    },

    async eliminarIncidencia(id) {
        if (!confirm('¿Está seguro de eliminar esta incidencia? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            await this.db.collection('incidencias').doc(id).delete();
            this.mostrarNotificacion('Éxito', 'Incidencia eliminada correctamente', 'success');
            await this.cargarIncidencias();
            this.actualizarEstadisticas();
        } catch (error) {
            console.error('Error eliminando incidencia:', error);
            this.mostrarNotificación('Error', 'Error al eliminar la incidencia', 'error');
        }
    },

    renderizarTabla() {
        const tbody = document.getElementById('tablaIncidencias');
        const noResults = document.getElementById('noResults');
        
        if (this.incidencias.length === 0) {
            tbody.innerHTML = '';
            noResults.style.display = 'block';
            return;
        }
        
        noResults.style.display = 'none';
        tbody.innerHTML = '';
        
        this.incidencias.forEach(incidencia => {
            const row = document.createElement('tr');
            const esCritica = incidencia.horasEnMinutos >= 120; // 2 horas o más
            
            row.innerHTML = `
                <td>
                    <strong>${new Date(incidencia.fecha).toLocaleDateString('es-MX')}</strong>
                </td>
                <td>
                    <div>
                        <strong>${incidencia.asesorNombre}</strong>
                        <small class="d-block text-muted">#${incidencia.asesorCuenta}</small>
                    </div>
                </td>
                <td>
                    <span class="badge bg-primary">${incidencia.sala}</span>
                </td>
                <td>
                    <small>${incidencia.horaInicio} - ${incidencia.horaFinal}</small>
                </td>
                <td>
                    <small class="text-truncate d-block" style="max-width: 200px;" title="${incidencia.motivoFalta}">
                        ${incidencia.motivoFalta}
                    </small>
                </td>
                <td>
                    <span class="badge-horas ${esCritica ? 'badge-critica' : ''}">
                        ${incidencia.horasAcumuladas}
                    </span>
                </td>
                <td>
                    <small>${incidencia.reportadoPor}</small>
                </td>
                <td>
                    <button class="btn btn-action btn-edit" onclick="gestionIncidencias.editarIncidencia('${incidencia.id}')" title="Editar">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-action btn-delete" onclick="gestionIncidencias.eliminarIncidencia('${incidencia.id}')" title="Eliminar">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    },

    actualizarEstadisticas() {
        const total = this.incidencias.length;
        const hoy = new Date().toISOString().split('T')[0];
        const incidenciasHoy = this.incidencias.filter(i => i.fecha === hoy).length;
        
        const totalMinutos = this.incidencias.reduce((sum, inc) => sum + (inc.horasEnMinutos || 0), 0);
        const totalHoras = this.convertirMinutosAHoras(totalMinutos);
        
        const criticas = this.incidencias.filter(i => (i.horasEnMinutos || 0) >= 120).length;
        
        document.getElementById('totalIncidencias').textContent = total;
        document.getElementById('incidenciasHoy').textContent = incidenciasHoy;
        document.getElementById('totalHoras').textContent = totalHoras;
        document.getElementById('incidenciasCriticas').textContent = criticas;
    },

    limpiarFormulario() {
        document.getElementById('formIncidencia').reset();
        document.getElementById('asesorSeleccionado').value = '';
        document.getElementById('horasAcumuladas').value = '';
        this.incidenciaEditando = null;
        document.getElementById('modalTitulo').textContent = 'Nueva Incidencia';
        document.getElementById('btnTexto').textContent = 'Guardar Incidencia';
        this.setFechaHoy();
    },

    mostrarNotificacion(titulo, mensaje, tipo) {
        const iconos = {
            success: 'bi-check-circle-fill',
            error: 'bi-x-circle-fill',
            info: 'bi-info-circle-fill',
            warning: 'bi-exclamation-triangle-fill'
        };
        
        if (typeof SICAComponents !== 'undefined') {
            SICAComponents.notify(titulo, mensaje, tipo, iconos[tipo]);
        } else {
            alert(`${titulo}: ${mensaje}`);
        }
    }
};

// Funciones globales para filtros
function aplicarFiltros() {
    // Implementar lógica de filtros
    console.log('Aplicando filtros...');
}

function limpiarFiltros() {
    document.getElementById('filtroAsesor').value = '';
    document.getElementById('filtroSala').value = '';
    document.getElementById('filtroFechaDesde').value = '';
    document.getElementById('filtroFechaHasta').value = '';
    gestionIncidencias.renderizarTabla();
}

function guardarIncidencia() {
    gestionIncidencias.guardarIncidencia();
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    gestionIncidencias.init();
});