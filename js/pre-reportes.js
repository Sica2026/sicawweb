// prereportes.js - JavaScript específico para la página de pre-reportes

// Configuración de faltas y sanciones
const FALTAS_SANCIONES = {
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
};

// Variables globales
let asesoresData = [];
let selectedAsesor = null;
let selectedReportadoPor = null;

// Inicialización cuando el DOM está listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando página de pre-reportes...');
    
    // Configurar título de página
    if (window.SICAComponents) {
        window.SICAComponents.setPageTitle("Pre-reportes de Incidencias - SICA");
    }
    
    // Inicializar componentes
    initializeForm();
    loadAsesores();
    setupEventListeners();
    populateTimeSelects();
    populateMotivosSelect();
    setDefaultDate();
});

// Inicializar formulario
function initializeForm() {
    console.log('Inicializando formulario...');
    
    // Limpiar formulario
    document.getElementById('prereportForm').reset();
    
    // Ocultar resumen de sanción
    const summaryElement = document.getElementById('sanctionSummary');
    if (summaryElement) {
        summaryElement.style.display = 'none';
    }
}

// Cargar asesores desde Firestore
async function loadAsesores() {
    try {
        console.log('Cargando asesores desde Firestore...');
        showLoading(true);
        
        const asesoresCollection = firebase.firestore().collection('asesores');
        const snapshot = await asesoresCollection.get();
        
        asesoresData = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.nombreAsesor && data.numeroCuenta) {
                asesoresData.push({
                    id: doc.id,
                    nombre: data.nombreAsesor,
                    cuenta: data.numeroCuenta
                });
            }
        });
        
        console.log(`Cargados ${asesoresData.length} asesores`);
        showLoading(false);
        
    } catch (error) {
        console.error('Error al cargar asesores:', error);
        showLoading(false);
        showNotification('Error', 'No se pudieron cargar los asesores', 'error');
    }
}

// Configurar event listeners
function setupEventListeners() {
    // Autocompletado para asesor
    const asesorInput = document.getElementById('asesor');
    const asesorSuggestions = document.getElementById('asesorSuggestions');
    
    asesorInput.addEventListener('input', function() {
        handleAutocomplete(this.value, asesorSuggestions, 'asesor');
    });
    
    asesorInput.addEventListener('blur', function() {
        setTimeout(() => {
            asesorSuggestions.style.display = 'none';
        }, 200);
    });
    
    // Autocompletado para reportado por
    const reportadoPorInput = document.getElementById('reportadoPor');
    const reportadoPorSuggestions = document.getElementById('reportadoPorSuggestions');
    
    reportadoPorInput.addEventListener('input', function() {
        handleAutocomplete(this.value, reportadoPorSuggestions, 'reportadoPor');
    });
    
    reportadoPorInput.addEventListener('blur', function() {
        setTimeout(() => {
            reportadoPorSuggestions.style.display = 'none';
        }, 200);
    });
    
    // Calcular sanción cuando cambien los campos relevantes
    document.getElementById('horaInicio').addEventListener('change', calculateSanction);
    document.getElementById('horaFinal').addEventListener('change', calculateSanction);
    document.getElementById('motivoFalta').addEventListener('change', calculateSanction);
    
    // Envío del formulario
    document.getElementById('prereportForm').addEventListener('submit', handleSubmit);
    
    // Botón cancelar
    document.getElementById('cancelBtn').addEventListener('click', function() {
        if (confirm('¿Estás seguro de que deseas cancelar? Se perderán todos los datos ingresados.')) {
            window.location.reload();
        }
    });
}

// Manejar autocompletado
function handleAutocomplete(searchTerm, suggestionsContainer, fieldType) {
    if (searchTerm.length < 2) {
        suggestionsContainer.style.display = 'none';
        return;
    }
    
    const filteredAsesores = asesoresData.filter(asesor => 
        asesor.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asesor.cuenta.includes(searchTerm)
    );
    
    if (filteredAsesores.length === 0) {
        suggestionsContainer.style.display = 'none';
        return;
    }
    
    suggestionsContainer.innerHTML = '';
    filteredAsesores.slice(0, 5).forEach(asesor => {
        const suggestionItem = document.createElement('div');
        suggestionItem.className = 'suggestion-item';
        suggestionItem.innerHTML = `
            <span class="suggestion-name">${asesor.nombre}</span>
            <span class="suggestion-account">${asesor.cuenta}</span>
        `;
        
        suggestionItem.addEventListener('click', function() {
            if (fieldType === 'asesor') {
                selectedAsesor = asesor;
                document.getElementById('asesor').value = asesor.nombre;
            } else {
                selectedReportadoPor = asesor;
                document.getElementById('reportadoPor').value = asesor.nombre;
            }
            suggestionsContainer.style.display = 'none';
        });
        
        suggestionsContainer.appendChild(suggestionItem);
    });
    
    suggestionsContainer.style.display = 'block';
}

// Poblar selects de tiempo
function populateTimeSelects() {
    const horaInicioSelect = document.getElementById('horaInicio');
    const horaFinalSelect = document.getElementById('horaFinal');
    
    // Generar horarios de 7:00 AM a 9:00 PM en bloques de 30 minutos
    const startHour = 7;
    const endHour = 21;
    
    for (let hour = startHour; hour <= endHour; hour++) {
        // Hora en punto
        const hourString = hour.toString().padStart(2, '0');
        const timeValue1 = `${hourString}:00`;
        const timeLabel1 = `${hourString}:00`;
        
        const option1 = new Option(timeLabel1, timeValue1);
        horaInicioSelect.appendChild(option1.cloneNode(true));
        horaFinalSelect.appendChild(option1);
        
        // Media hora (excepto para la última hora)
        if (hour < endHour) {
            const timeValue2 = `${hourString}:30`;
            const timeLabel2 = `${hourString}:30`;
            
            const option2 = new Option(timeLabel2, timeValue2);
            horaInicioSelect.appendChild(option2.cloneNode(true));
            horaFinalSelect.appendChild(option2);
        }
    }
}

// Poblar select de motivos
function populateMotivosSelect() {
    const motivoSelect = document.getElementById('motivoFalta');
    
    Object.keys(FALTAS_SANCIONES).forEach(falta => {
        const option = new Option(falta, falta);
        motivoSelect.appendChild(option);
    });
}

// Establecer fecha por defecto (hoy)
function setDefaultDate() {
    const fechaInput = document.getElementById('fecha');
    const today = new Date().toISOString().split('T')[0];
    fechaInput.value = today;
}

// Calcular sanción
function calculateSanction() {
    const horaInicio = document.getElementById('horaInicio').value;
    const horaFinal = document.getElementById('horaFinal').value;
    const motivoFalta = document.getElementById('motivoFalta').value;
    
    if (!horaInicio || !horaFinal || !motivoFalta) {
        document.getElementById('sanctionSummary').style.display = 'none';
        return;
    }
    
    // Convertir horas a minutos
    const inicioMinutos = timeToMinutes(horaInicio);
    const finalMinutos = timeToMinutes(horaFinal);
    
    if (finalMinutos <= inicioMinutos) {
        showNotification('Error', 'La hora final debe ser posterior a la hora de inicio', 'warning');
        document.getElementById('sanctionSummary').style.display = 'none';
        return;
    }
    
    // Calcular tiempo total en minutos
    const tiempoTotalMinutos = finalMinutos - inicioMinutos;
    
    // Calcular bloques de 30 minutos
    const bloques = Math.ceil(tiempoTotalMinutos / 30);
    
    // Obtener sanción por bloque
    const sancionPorBloque = FALTAS_SANCIONES[motivoFalta];
    
    // Calcular sanción total
    const sancionTotalMinutos = bloques * sancionPorBloque;
    
    // Mostrar resumen
    updateSanctionSummary(tiempoTotalMinutos, sancionPorBloque, sancionTotalMinutos);
}

// Convertir tiempo HH:MM a minutos
function timeToMinutes(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
}

// Convertir minutos a formato HH:MM
function minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
}

// Actualizar resumen de sanción
function updateSanctionSummary(tiempoTotal, sancionBloque, sancionTotal) {
    document.getElementById('tiempoTotal').textContent = `${tiempoTotal} min`;
    document.getElementById('sancionBloque').textContent = `${sancionBloque} min`;
    document.getElementById('acumuladoTotal').textContent = minutesToTime(sancionTotal);
    
    document.getElementById('sanctionSummary').style.display = 'block';
}

// Manejar envío del formulario
async function handleSubmit(event) {
    event.preventDefault();
    
    if (!validateForm()) {
        return;
    }
    
    try {
        showLoading(true);
        
        const formData = collectFormData();
        await saveIncidencia(formData);
        
        showNotification('Éxito', 'Pre-reporte registrado correctamente', 'success');
        setTimeout(() => {
            window.location.reload();
        }, 2000);
        
    } catch (error) {
        console.error('Error al guardar incidencia:', error);
        showNotification('Error', 'No se pudo registrar el pre-reporte', 'error');
    } finally {
        showLoading(false);
    }
}

// Validar formulario
function validateForm() {
    const errors = [];
    
    // Validar asesor
    if (!selectedAsesor) {
        errors.push('Debe seleccionar un asesor válido');
        highlightField('asesor');
    }
    
    // Validar sala
    if (!document.getElementById('sala').value) {
        errors.push('Debe seleccionar una sala');
        highlightField('sala');
    }
    
    // Validar fecha
    if (!document.getElementById('fecha').value) {
        errors.push('Debe seleccionar una fecha');
        highlightField('fecha');
    }
    
    // Validar horas
    if (!document.getElementById('horaInicio').value) {
        errors.push('Debe seleccionar hora de inicio');
        highlightField('horaInicio');
    }
    
    if (!document.getElementById('horaFinal').value) {
        errors.push('Debe seleccionar hora final');
        highlightField('horaFinal');
    }
    
    // Validar motivo
    if (!document.getElementById('motivoFalta').value) {
        errors.push('Debe seleccionar un motivo de falta');
        highlightField('motivoFalta');
    }
    
    // Validar quien reporta
    if (!selectedReportadoPor) {
        errors.push('Debe seleccionar quien levanta la falta');
        highlightField('reportadoPor');
    }
    
    if (errors.length > 0) {
        showNotification('Formulario incompleto', errors.join('<br>'), 'warning');
        return false;
    }
    
    return true;
}

// Resaltar campo con error
function highlightField(fieldId) {
    const field = document.getElementById(fieldId);
    field.style.borderColor = '#dc3545';
    field.style.boxShadow = '0 0 0 3px rgba(220, 53, 69, 0.1)';
    
    setTimeout(() => {
        field.style.borderColor = '';
        field.style.boxShadow = '';
    }, 3000);
}

// Recopilar datos del formulario
function collectFormData() {
    const horaInicio = document.getElementById('horaInicio').value;
    const horaFinal = document.getElementById('horaFinal').value;
    const motivoFalta = document.getElementById('motivoFalta').value;
    
    // Calcular horas acumuladas
    const inicioMinutos = timeToMinutes(horaInicio);
    const finalMinutos = timeToMinutes(horaFinal);
    const tiempoTotalMinutos = finalMinutos - inicioMinutos;
    const bloques = Math.ceil(tiempoTotalMinutos / 30);
    const sancionPorBloque = FALTAS_SANCIONES[motivoFalta];
    const horasAcumuladas = bloques * sancionPorBloque;
    
    return {
        asesorCuenta: selectedAsesor.cuenta,
        asesorId: selectedAsesor.id,
        asesorNombre: selectedAsesor.nombre,
        sala: document.getElementById('sala').value,
        fecha: document.getElementById('fecha').value,
        horaInicio: horaInicio,
        horaFinal: horaFinal,
        horasEnMinutos: tiempoTotalMinutos,
        motivoFalta: motivoFalta,
        horasAcumuladas: minutesToTime(horasAcumuladas),
        reportadoPor: selectedReportadoPor.nombre,
        reportadoPorCuenta: selectedReportadoPor.cuenta,
        reportadoPorId: selectedReportadoPor.id,
        fechaCreacion: firebase.firestore.Timestamp.now(),
        estado: 'preautorizado'
    };
}

// Guardar incidencia en Firestore
async function saveIncidencia(data) {
    const db = firebase.firestore();
    await db.collection('incidencias').add(data);
}

// Mostrar/ocultar loading
function showLoading(show) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.style.display = show ? 'flex' : 'none';
}

// Mostrar notificación
function showNotification(title, message, type = 'info') {
    // Verificar si existe el sistema de notificaciones moderno
    if (window.modernNav && window.modernNav.showModernNotification) {
        const iconMap = {
            success: 'bi-check-circle-fill',
            error: 'bi-x-circle-fill',
            warning: 'bi-exclamation-triangle-fill',
            info: 'bi-info-circle-fill'
        };
        
        window.modernNav.showModernNotification(
            title,
            message,
            type,
            iconMap[type] || 'bi-info-circle-fill'
        );
    } else {
        // Fallback a alert simple
        alert(`${title}: ${message.replace(/<br>/g, '\n')}`);
    }
}

// Función de utilidad para debugging
function debugFormData() {
    console.log('Estado actual del formulario:');
    console.log('Asesor seleccionado:', selectedAsesor);
    console.log('Reportado por:', selectedReportadoPor);
    console.log('Datos de asesores cargados:', asesoresData.length);
}