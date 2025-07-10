// Configuración de horarios - Ampliado de 7:00 a 21:00
const timeSlots = [
    '07:00 - 07:30',
    '07:30 - 08:00',
    '08:00 - 08:30',
    '08:30 - 09:00',
    '09:00 - 09:30',
    '09:30 - 10:00',
    '10:00 - 10:30',
    '10:30 - 11:00',
    '11:00 - 11:30',
    '11:30 - 12:00',
    '12:00 - 12:30',
    '12:30 - 13:00',
    '13:00 - 13:30',
    '13:30 - 14:00',
    '14:00 - 14:30',
    '14:30 - 15:00',
    '15:00 - 15:30',
    '15:30 - 16:00',
    '16:00 - 16:30',
    '16:30 - 17:00',
    '17:00 - 17:30',
    '17:30 - 18:00',
    '18:00 - 18:30',
    '18:30 - 19:00',
    '19:00 - 19:30',
    '19:30 - 20:00',
    '20:00 - 20:30',
    '20:30 - 21:00'
];

const days = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];

// Estado del horario
let selectedCells = new Set();
let currentColor = '#90EE90';
let selectionMode = 'range'; // 'range' o 'single'
let rangeStart = null;
let rangeEnd = null;
let courses = []; // Array para almacenar los cursos agregados
let lastAsesor = ''; // Guardar último asesor usado
let lastAdministrador = ''; // Guardar último administrador usado
let lastCurso = ''; // Guardar último curso usado

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', function() {
    generateScheduleTable();
    setupEventListeners();
});

function generateScheduleTable() {
    const scheduleBody = document.getElementById('schedule-body');
    scheduleBody.innerHTML = '';

    timeSlots.forEach((timeSlot, index) => {
        const row = document.createElement('tr');
        
        // Celda de tiempo
        const timeCell = document.createElement('td');
        timeCell.textContent = timeSlot;
        timeCell.classList.add('time-slot');
        row.appendChild(timeCell);

        // Celdas para cada día
        days.forEach(day => {
            const dayCell = document.createElement('td');
            dayCell.dataset.day = day;
            dayCell.dataset.time = index;
            dayCell.addEventListener('click', toggleCell);
            row.appendChild(dayCell);
        });

        scheduleBody.appendChild(row);
    });
}

function toggleCell(event) {
    const cell = event.target;
    const cellId = `${cell.dataset.day}-${cell.dataset.time}`;
    
    // Si la celda ya tiene un curso, no permitir selección
    if (cell.classList.contains('course-block')) {
        showStatusMessage('Esta celda ya tiene un curso asignado', 'error');
        return;
    }

    if (selectionMode === 'range') {
        handleRangeSelection(cell, cellId);
    } else {
        handleSingleSelection(cell, cellId);
    }
}

function handleRangeSelection(cell, cellId) {
    if (!rangeStart) {
        // Primer click - establecer inicio del rango
        rangeStart = {
            cell: cell,
            day: cell.dataset.day,
            time: parseInt(cell.dataset.time),
            id: cellId
        };
        
        // Limpiar cualquier selección previa pero NO limpiar rangeStart
        document.querySelectorAll('.selected, .range-start, .range-end').forEach(c => {
            if (!c.classList.contains('course-block')) {
                c.classList.remove('selected', 'range-start', 'range-end');
            }
        });
        selectedCells.clear();
        
        cell.classList.add('range-start');
        cell.classList.add('selected');
        selectedCells.add(cellId);
        showStatusMessage('Ahora selecciona la celda final del rango en el mismo día', 'info');
        
    } else if (rangeStart.day === cell.dataset.day) {
        // Segundo click en el mismo día - establecer fin del rango
        const startTime = rangeStart.time;
        const endTime = parseInt(cell.dataset.time);
        
        if (endTime >= startTime) {
            rangeEnd = {
                cell: cell,
                day: cell.dataset.day,
                time: endTime,
                id: cellId
            };
            
            // Limpiar selección previa
            document.querySelectorAll('.selected, .range-start, .range-end').forEach(c => {
                if (!c.classList.contains('course-block')) {
                    c.classList.remove('selected', 'range-start', 'range-end');
                }
            });
            selectedCells.clear();
            
            // Seleccionar rango completo
            for (let i = startTime; i <= endTime; i++) {
                const rangeCellId = `${rangeStart.day}-${i}`;
                const rangeCell = document.querySelector(`[data-day="${rangeStart.day}"][data-time="${i}"]`);
                if (rangeCell && !rangeCell.classList.contains('course-block')) {
                    selectedCells.add(rangeCellId);
                    rangeCell.classList.add('selected');
                }
            }
            
            // Marcar inicio y fin visualmente
            rangeStart.cell.classList.add('range-start');
            if (endTime > startTime) {
                cell.classList.add('range-end');
            }
            
            // Calcular horas correctamente (cada celda = 30 minutos)
            const totalSlots = endTime - startTime + 1;
            const totalMinutes = totalSlots * 30;
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            
            let timeText;
            if (hours > 0 && minutes > 0) {
                timeText = `${hours}h ${minutes}min`;
            } else if (hours > 0) {
                timeText = `${hours}h`;
            } else {
                timeText = `${minutes}min`;
            }
            
            const startTimeText = timeSlots[startTime].split(' - ')[0];
            const endTimeText = timeSlots[endTime].split(' - ')[1];
            showStatusMessage(`Rango seleccionado: ${startTimeText} a ${endTimeText} (${timeText})`, 'success');
            
        } else {
            showStatusMessage('La hora final debe ser igual o posterior a la inicial', 'error');
            // Mantener la selección inicial para que pueda intentar de nuevo
        }
    } else {
        // Click en diferente día - reiniciar selección
        document.querySelectorAll('.selected, .range-start, .range-end').forEach(c => {
            if (!c.classList.contains('course-block')) {
                c.classList.remove('selected', 'range-start', 'range-end');
            }
        });
        selectedCells.clear();
        
        rangeStart = {
            cell: cell,
            day: cell.dataset.day,
            time: parseInt(cell.dataset.time),
            id: cellId
        };
        cell.classList.add('range-start');
        cell.classList.add('selected');
        selectedCells.add(cellId);
        showStatusMessage('Selecciona la celda final del rango en el mismo día', 'info');
    }
}

function handleSingleSelection(cell, cellId) {
    if (selectedCells.has(cellId)) {
        selectedCells.delete(cellId);
        cell.classList.remove('selected');
        cell.style.backgroundColor = '';
    } else {
        selectedCells.add(cellId);
        cell.classList.add('selected');
        cell.style.backgroundColor = currentColor;
    }
}

function setupEventListeners() {
    // Cambio de color
    const colorInput = document.getElementById('color');
    colorInput.addEventListener('change', function() {
        currentColor = this.value;
        updateSelectedCellsColor();
    });

    // Actualizar rango de fechas
    const fechaInicio = document.getElementById('fecha-inicio');
    const fechaFin = document.getElementById('fecha-fin');
    
    fechaInicio.addEventListener('change', updateDateRange);
    fechaFin.addEventListener('change', updateDateRange);

    // Selector de nombre del curso
    const nombreCurso = document.getElementById('nombre-curso');
    nombreCurso.addEventListener('change', function() {
        const cursoPersonalizado = document.getElementById('curso-personalizado');
        const edificioField = document.getElementById('edificio');
        const salonField = document.getElementById('salon');
        const edificioLabel = document.querySelector('label[for="edificio"]');
        const salonLabel = document.querySelector('label[for="salon"]');
        
        if (this.value === 'Otro') {
            cursoPersonalizado.style.display = 'block';
        } else {
            cursoPersonalizado.style.display = 'none';
        }
        
        // Manejar campos para SICA
        if (this.value === 'SICA') {
            // Deshabilitar edificio y salón para SICA
            edificioField.disabled = true;
            salonField.disabled = true;
            edificioField.value = '';
            salonField.value = '';
            edificioField.placeholder = 'No aplica para SICA';
            salonField.placeholder = 'No aplica para SICA';
            edificioLabel.classList.add('disabled');
            salonLabel.classList.add('disabled');
        } else {
            // Habilitar campos para otros cursos
            edificioField.disabled = false;
            salonField.disabled = false;
            edificioField.placeholder = 'Edificio';
            salonField.placeholder = 'Salón';
            edificioLabel.classList.remove('disabled');
            salonLabel.classList.remove('disabled');
        }
        
        updateSicaCounter();
    });

    // Botón agregar curso
    const btnAgregar = document.getElementById('btn-agregar');
    btnAgregar.addEventListener('click', addCourse);

    // Botón limpiar horario (cambio de funcionalidad)
    const btnLimpiar = document.getElementById('btn-limpiar');
    btnLimpiar.addEventListener('click', clearEntireSchedule);

    // Botón generar PDF
    const btnGenerar = document.getElementById('btn-generar');
    btnGenerar.addEventListener('click', generatePDF);

    // Validar campos requeridos
    const requiredFields = ['horario', 'nombre-curso', 'nombre-asesor', 'asesor', 'edificio', 'salon'];
    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', validateForm);
            field.addEventListener('change', validateForm);
        }
    });

    // Campo personalizado también requiere validación
    const customField = document.getElementById('nombre-curso-custom');
    customField.addEventListener('input', validateForm);

    // Limpiar selección con doble click
    document.addEventListener('dblclick', function(e) {
        if (e.target.classList.contains('course-block') || e.target.closest('.course-block')) {
            const targetCell = e.target.classList.contains('course-block') ? e.target : e.target.closest('.course-block');
            removeCourse(targetCell);
        }
    });
}

function addCourse() {
    if (!validateForm()) {
        return;
    }

    if (selectedCells.size === 0) {
        showStatusMessage('Selecciona al menos una celda para el curso', 'error');
        return;
    }

    // Obtener nombre del curso (normal o personalizado)
    let nombreCurso;
    const tipoNombre = document.getElementById('nombre-curso').value;
    if (tipoNombre === 'Otro') {
        nombreCurso = document.getElementById('nombre-curso-custom').value.trim();
        if (!nombreCurso) {
            showStatusMessage('Ingresa el nombre personalizado del curso', 'error');
            return;
        }
    } else {
        nombreCurso = tipoNombre;
    }

    const courseData = {
        id: Date.now(), // ID único
        nombre: nombreCurso,
        edificio: nombreCurso === 'SICA' ? 'N/A' : document.getElementById('edificio').value,
        salon: nombreCurso === 'SICA' ? 'N/A' : document.getElementById('salon').value,
        nombreAsesor: document.getElementById('nombre-asesor').value,
        administrador: document.getElementById('asesor').value,
        color: currentColor,
        cells: Array.from(selectedCells),
        day: rangeStart ? rangeStart.day : Array.from(selectedCells)[0].split('-')[0],
        startTime: rangeStart ? rangeStart.time : parseInt(Array.from(selectedCells)[0].split('-')[1]),
        endTime: rangeEnd ? rangeEnd.time : parseInt(Array.from(selectedCells)[selectedCells.size - 1].split('-')[1]),
        totalMinutes: selectedCells.size * 30, // Cada celda = 30 minutos
        hours: selectedCells.size * 30 // En minutos para cálculos
    };

    // Guardar valores para uso futuro
    lastAsesor = document.getElementById('nombre-asesor').value;
    lastAdministrador = document.getElementById('asesor').value;
    lastCurso = tipoNombre;

    // Agregar curso al array
    courses.push(courseData);

    // Mostrar curso en la tabla
    displayCourseInTable(courseData);

    // Limpiar selección y formulario (pero mantener valores guardados)
    clearSelection();
    document.getElementById('nombre-curso').value = lastCurso;
    document.getElementById('nombre-curso-custom').value = '';
    // Mantener los valores de asesor y administrador
    document.getElementById('nombre-asesor').value = lastAsesor;
    document.getElementById('asesor').value = lastAdministrador;
    document.getElementById('curso-personalizado').style.display = lastCurso === 'Otro' ? 'block' : 'none';
    
    // Rehabilitar campos si estaban deshabilitados
    const edificioField = document.getElementById('edificio');
    const salonField = document.getElementById('salon');
    const edificioLabel = document.querySelector('label[for="edificio"]');
    const salonLabel = document.querySelector('label[for="salon"]');
    
    edificioField.disabled = false;
    salonField.disabled = false;
    edificioField.placeholder = 'Edificio';
    salonField.placeholder = 'Salón';
    edificioLabel.classList.remove('disabled');
    salonLabel.classList.remove('disabled');
    
    // Calcular tiempo para el mensaje
    const totalMinutes = courseData.totalMinutes;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    let timeText;
    if (hours > 0 && minutes > 0) {
        timeText = `${hours}h ${minutes}min`;
    } else if (hours > 0) {
        timeText = `${hours}h`;
    } else {
        timeText = `${minutes}min`;
    }
    
    showStatusMessage(`Curso "${courseData.nombre}" agregado exitosamente (${timeText})`, 'success');
    
    // Actualizar contador SICA si es necesario
    if (nombreCurso === 'SICA') {
        updateSicaCounter();
    }
}

function displayCourseInTable(courseData) {
    // Ordenar las celdas por índice de tiempo para mostrar correctamente
    const sortedCells = courseData.cells.sort((a, b) => {
        const timeA = parseInt(a.split('-')[1]);
        const timeB = parseInt(b.split('-')[1]);
        return timeA - timeB;
    });
    
    const totalCells = sortedCells.length;
    
    sortedCells.forEach((cellId, index) => {
        const [day, time] = cellId.split('-');
        const cell = document.querySelector(`[data-day="${day}"][data-time="${time}"]`);
        
        if (cell) {
            cell.classList.remove('selected', 'range-start', 'range-end');
            cell.classList.add('course-block');
            cell.style.backgroundColor = courseData.color;
            cell.dataset.courseId = courseData.id;
            cell.dataset.cells = totalCells;
            
            // Aplicar clases según posición en el bloque
            if (totalCells === 1) {
                cell.classList.add('course-single', 'course-main');
            } else if (index === 0) {
                cell.classList.add('course-start', 'course-main');
            } else if (index === totalCells - 1) {
                cell.classList.add('course-end');
            } else {
                cell.classList.add('course-middle');
            }
            
            // Solo mostrar contenido en la primera celda (principal)
            if (index === 0) {
                const totalMinutes = courseData.totalMinutes;
                const hours = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;
                
                let timeText;
                if (hours > 0 && minutes > 0) {
                    timeText = `${hours}h ${minutes}m`;
                } else if (hours > 0) {
                    timeText = `${hours}h`;
                } else {
                    timeText = `${minutes}m`;
                }
                
                // Crear el contenedor que abarcará todo el bloque
                let displayInfo;
                if (courseData.nombre === 'SICA') {
                    // Para SICA no mostrar edificio/salón
                    displayInfo = courseData.nombreAsesor ? 
                        `${courseData.nombreAsesor}<br>${timeText}` : 
                        timeText;
                } else {
                    // Para otros cursos mostrar edificio-salón
                    displayInfo = `${courseData.edificio} - ${courseData.salon}<br>${timeText}`;
                }
                
                cell.innerHTML = `
                    <div class="course-block-container">
                        <div class="course-name">${courseData.nombre}</div>
                        <div class="course-details">
                            ${displayInfo}
                        </div>
                    </div>
                `;
                
                // Ajustar la altura del contenedor según el número de celdas
                const container = cell.querySelector('.course-block-container');
                if (container) {
                    container.style.height = `${totalCells * 100}%`;
                    container.style.zIndex = '10';
                }
            } else {
                // Celdas secundarias están vacías pero mantienen el color
                cell.innerHTML = '';
            }
        }
    });
}

function removeCourse(cell) {
    const courseId = parseInt(cell.dataset.courseId);
    const courseIndex = courses.findIndex(course => course.id === courseId);
    
    if (courseIndex !== -1) {
        const course = courses[courseIndex];
        const wasSica = course.nombre === 'SICA';
        
        // Confirmar eliminación
        if (confirm(`¿Eliminar el curso "${course.nombre}"?`)) {
            // Limpiar todas las celdas del curso
            course.cells.forEach(cellId => {
                const [day, time] = cellId.split('-');
                const courseCell = document.querySelector(`[data-day="${day}"][data-time="${time}"]`);
                if (courseCell) {
                    courseCell.classList.remove('course-block', 'course-main', 'course-start', 'course-middle', 'course-end', 'course-single');
                    courseCell.style.backgroundColor = '';
                    courseCell.innerHTML = '';
                    delete courseCell.dataset.courseId;
                    delete courseCell.dataset.cells;
                }
            });
            
            // Eliminar del array
            courses.splice(courseIndex, 1);
            showStatusMessage(`Curso "${course.nombre}" eliminado`, 'info');
            
            // Actualizar contador SICA si era un curso SICA
            if (wasSica) {
                updateSicaCounter();
            }
        }
    }
}

// Nueva función para limpiar todo el horario
function clearEntireSchedule() {
    if (courses.length === 0) {
        showStatusMessage('El horario ya está vacío', 'info');
        return;
    }
    
    if (confirm('¿Estás seguro de que quieres limpiar todo el horario? Esta acción no se puede deshacer.')) {
        // Limpiar todas las celdas de todos los cursos
        courses.forEach(course => {
            course.cells.forEach(cellId => {
                const [day, time] = cellId.split('-');
                const courseCell = document.querySelector(`[data-day="${day}"][data-time="${time}"]`);
                if (courseCell) {
                    courseCell.classList.remove('course-block', 'course-main', 'course-start', 'course-middle', 'course-end', 'course-single');
                    courseCell.style.backgroundColor = '';
                    courseCell.innerHTML = '';
                    delete courseCell.dataset.courseId;
                    delete courseCell.dataset.cells;
                }
            });
        });
        
        // Limpiar array de cursos
        courses.length = 0;
        
        // Limpiar selección actual
        clearSelection();
        
        // Resetear formulario
        document.getElementById('nombre-curso').value = '';
        document.getElementById('nombre-curso-custom').value = '';
        document.getElementById('nombre-asesor').value = '';
        document.getElementById('curso-personalizado').style.display = 'none';
        
        // Rehabilitar campos edificio y salón
        const edificioField = document.getElementById('edificio');
        const salonField = document.getElementById('salon');
        const edificioLabel = document.querySelector('label[for="edificio"]');
        const salonLabel = document.querySelector('label[for="salon"]');
        
        edificioField.disabled = false;
        salonField.disabled = false;
        edificioField.value = '';
        salonField.value = '';
        edificioField.placeholder = 'Edificio';
        salonField.placeholder = 'Salón';
        edificioLabel.classList.remove('disabled');
        salonLabel.classList.remove('disabled');
        
        showStatusMessage('Horario completamente limpiado', 'success');
        
        // Actualizar contador SICA
        updateSicaCounter();
    }
}

// Función para actualizar el contador de horas SICA
function updateSicaCounter() {
    const sicaCourses = courses.filter(course => course.nombre === 'SICA');
    const totalSicaMinutes = sicaCourses.reduce((total, course) => total + course.totalMinutes, 0);
    
    const hours = Math.floor(totalSicaMinutes / 60);
    const minutes = totalSicaMinutes % 60;
    
    let timeText;
    if (hours > 0 && minutes > 0) {
        timeText = `${hours}h ${minutes}m`;
    } else if (hours > 0) {
        timeText = `${hours}h`;
    } else if (minutes > 0) {
        timeText = `${minutes}m`;
    } else {
        timeText = '0h 0m';
    }
    
    const sicaHoursElement = document.getElementById('sica-hours');
    if (sicaHoursElement) {
        sicaHoursElement.textContent = timeText;
    }
}

// Función para generar PDF con captura de imagen
function generatePDF() {
    if (courses.length === 0) {
        showStatusMessage('No hay cursos para generar PDF. Agrega al menos un curso.', 'error');
        return;
    }
    
    // Mostrar mensaje de generación
    showStatusMessage('Generando PDF...', 'info');
    
    // Obtener datos del formulario
    const tipoHorario = document.getElementById('horario').value || 'No especificado';
    const nombreAsesor = lastAsesor || 'No especificado';
    const administrador = lastAdministrador || 'No especificado';
    const fechaActual = new Date().toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    
    // Obtener rango de fechas
    const fechaInicio = document.getElementById('fecha-inicio').value;
    const fechaFin = document.getElementById('fecha-fin').value;
    let fechaValidacion = 'No especificado';
    
    if (fechaInicio && fechaFin) {
        const inicio = new Date(fechaInicio);
        const fin = new Date(fechaFin);
        const formatoFecha = { day: 'numeric', month: 'long', year: 'numeric' };
        fechaValidacion = `Del ${inicio.toLocaleDateString('es-ES', formatoFecha)} al ${fin.toLocaleDateString('es-ES', formatoFecha)}`;
    }
    
    // Calcular horas SICA
    const sicaCourses = courses.filter(course => course.nombre === 'SICA');
    const totalSicaMinutes = sicaCourses.reduce((total, course) => total + course.totalMinutes, 0);
    const sicaHours = Math.floor(totalSicaMinutes / 60);
    const sicaMinutes = totalSicaMinutes % 60;
    
    let sicaTimeText;
    if (sicaHours > 0 && sicaMinutes > 0) {
        sicaTimeText = `${sicaHours}h ${sicaMinutes}m`;
    } else if (sicaHours > 0) {
        sicaTimeText = `${sicaHours}h`;
    } else if (sicaMinutes > 0) {
        sicaTimeText = `${sicaMinutes}m`;
    } else {
        sicaTimeText = '0h 0m';
    }
    
    // Capturar la tabla como imagen
    const tableElement = document.querySelector('.schedule-table');
    
    html2canvas(tableElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: tableElement.offsetWidth,
        height: tableElement.offsetHeight
    }).then(function(canvas) {
        try {
            // Crear nuevo PDF
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            // Dimensiones de la página A4
            const pageWidth = 210;
            const pageHeight = 297;
            const margin = 15;
            const contentWidth = pageWidth - (2 * margin);
            
            // Dibujar marco de la página
            pdf.setLineWidth(0.5);
            pdf.rect(margin - 5, margin - 5, contentWidth + 10, pageHeight - (2 * margin) + 10);
            
            let currentY = margin + 5; // Espacio extra por el marco
            
            // Marca de agua (imagen)
            // Nota: Aquí se podría agregar una imagen como marca de agua
            // pdf.addImage(watermarkImage, 'PNG', 50, 100, 100, 100, undefined, 'FAST');
            
            // Título principal
            pdf.setFontSize(18);
            pdf.setFont(undefined, 'bold');
            pdf.text(`HORARIO: ${tipoHorario.toUpperCase()}`, pageWidth / 2, currentY, { align: 'center' });
            currentY += 15;
            
            // Sección de información
            pdf.setFontSize(10);
            pdf.setFont(undefined, 'normal');
            
            const infoStartY = currentY;
            
            // Columna izquierda
            pdf.setFont(undefined, 'bold');
            pdf.text('Nombre del Asesor:', margin, currentY);
            pdf.setFont(undefined, 'normal');
            pdf.text(nombreAsesor, margin + 35, currentY);
            currentY += 7;
            
            pdf.setFont(undefined, 'bold');
            pdf.text('Administrador:', margin, currentY);
            pdf.setFont(undefined, 'normal');
            pdf.text(administrador, margin + 35, currentY);
            currentY += 7;
            
            pdf.setFont(undefined, 'bold');
            pdf.text('Fecha de validación:', margin, currentY);
            pdf.setFont(undefined, 'normal');
            // Aquí va el rango de fechas (del... al...)
            const fechaValidacionCorta = fechaValidacion.length > 45 ? 
                fechaValidacion.substring(0, 42) + '...' : fechaValidacion;
            pdf.text(fechaValidacionCorta, margin + 35, currentY);
            currentY += 7;
            
            pdf.setFont(undefined, 'bold');
            pdf.text('Administrador:', margin, currentY);
            pdf.setFont(undefined, 'normal');
            pdf.text(administrador, margin + 35, currentY);
            
            // Columna derecha - ajustada más a la izquierda
            currentY = infoStartY;
            const rightColumnX = pageWidth / 2 - 5; // Movido más a la izquierda
            
            pdf.setFont(undefined, 'bold');
            pdf.text('Fecha de realización:', rightColumnX, currentY);
            pdf.setFont(undefined, 'normal');
            // Aquí va la fecha actual
            pdf.text(fechaActual, rightColumnX + 35, currentY);
            currentY += 7;
            
            pdf.setFont(undefined, 'bold');
            pdf.text('Horas de SICA:', rightColumnX, currentY);
            pdf.setFont(undefined, 'bold');
            pdf.setTextColor(217, 119, 6); // Color naranja
            pdf.text(sicaTimeText, rightColumnX + 25, currentY);
            
            // Subrayar las horas SICA
            const sicaTextWidth = pdf.getTextWidth(sicaTimeText);
            pdf.line(rightColumnX + 25, currentY + 1, rightColumnX + 25 + sicaTextWidth, currentY + 1);
            
            pdf.setTextColor(0, 0, 0); // Volver a negro
            
            currentY += 15;
            
            // Calcular dimensiones para la imagen de la tabla
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = contentWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            // Verificar si la imagen cabe en el espacio restante (dejando espacio para firma)
            const remainingHeight = pageHeight - currentY - margin - 20; // 20mm para firma
            let finalImgHeight = imgHeight;
            let finalImgWidth = imgWidth;
            
            if (imgHeight > remainingHeight) {
                // Escalar la imagen para que quepa
                finalImgHeight = remainingHeight;
                finalImgWidth = (canvas.width * finalImgHeight) / canvas.height;
            }
            
            // Centrar la imagen si es más pequeña que el ancho disponible
            const imgX = finalImgWidth < contentWidth ? 
                (pageWidth - finalImgWidth) / 2 : margin;
            
            // Agregar la imagen de la tabla
            pdf.addImage(imgData, 'PNG', imgX, currentY, finalImgWidth, finalImgHeight);
            
            // Línea de firma al final - más pequeña
            const firmaY = pageHeight - margin - 10;
            pdf.setFontSize(12);
            pdf.setFont(undefined, 'normal');
            
            // Línea para la firma (más pequeña)
            const firmaLineStart = pageWidth / 2 - 30; // 60mm de largo total (30mm a cada lado del centro)
            const firmaLineEnd = pageWidth / 2 + 30;
            pdf.line(firmaLineStart, firmaY - 5, firmaLineEnd, firmaY - 5);
            
            // Texto "Firma"
            pdf.text('Firma', pageWidth / 2, firmaY, { align: 'center' });
            
            // Generar nombre del archivo: NombreAsesor_TipoHorario.pdf
            const nombreLimpio = nombreAsesor.replace(/[^a-zA-Z0-9]/g, '_');
            const tipoLimpio = tipoHorario.replace(/[^a-zA-Z0-9]/g, '_');
            const fileName = `${nombreLimpio}_${tipoLimpio}.pdf`;
            
            // Guardar el PDF
            pdf.save(fileName);
            
            showStatusMessage('PDF generado exitosamente', 'success');
            
        } catch (error) {
            console.error('Error al generar PDF:', error);
            showStatusMessage('Error al generar el PDF', 'error');
        }
    }).catch(function(error) {
        console.error('Error al capturar la imagen:', error);
        showStatusMessage('Error al capturar la tabla', 'error');
    });
}

function validateForm() {
    const tipoNombre = document.getElementById('nombre-curso').value;
    const horario = document.getElementById('horario').value;
    const nombreAsesor = document.getElementById('nombre-asesor').value.trim();
    const administrador = document.getElementById('asesor').value;
    let nombreCurso;
    
    // Validar horario (obligatorio)
    if (!horario) {
        showStatusMessage('El horario es requerido', 'error');
        return false;
    }
    
    // Validar nombre del curso
    if (tipoNombre === 'Otro') {
        nombreCurso = document.getElementById('nombre-curso-custom').value.trim();
        if (!nombreCurso) {
            showStatusMessage('Ingresa el nombre personalizado del curso', 'error');
            return false;
        }
    } else if (!tipoNombre) {
        showStatusMessage('Selecciona el nombre del curso', 'error');
        return false;
    }
    
    // Validar nombre del asesor (obligatorio)
    if (!nombreAsesor) {
        showStatusMessage('El nombre del asesor es requerido', 'error');
        return false;
    }
    
    // Validar administrador (obligatorio)
    if (!administrador) {
        showStatusMessage('El administrador es requerido', 'error');
        return false;
    }
    
    // Para SICA no validar edificio y salón
    if (tipoNombre !== 'SICA') {
        const edificio = document.getElementById('edificio').value.trim();
        const salon = document.getElementById('salon').value.trim();
        
        if (!edificio) {
            showStatusMessage('El edificio es requerido', 'error');
            return false;
        }
        
        if (!salon) {
            showStatusMessage('El salón es requerido', 'error');
            return false;
        }
    }
    
    return true;
}

function clearSelection() {
    selectedCells.clear();
    rangeStart = null;
    rangeEnd = null;
    
    const selectedElements = document.querySelectorAll('.selected, .range-start, .range-end');
    selectedElements.forEach(cell => {
        if (!cell.classList.contains('course-block')) {
            cell.classList.remove('selected', 'range-start', 'range-end');
            cell.style.backgroundColor = '';
        }
    });
    
    hideStatusMessage();
}

function showStatusMessage(message, type) {
    // Remover mensaje anterior
    const existingMessage = document.querySelector('.status-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Crear nuevo mensaje
    const statusDiv = document.createElement('div');
    statusDiv.className = `status-message status-${type}`;
    statusDiv.textContent = message;
    
    // Agregar después del grupo de botones
    const buttonGroup = document.querySelector('.button-group');
    buttonGroup.parentNode.insertBefore(statusDiv, buttonGroup.nextSibling);
    
    // Auto-ocultar después de 5 segundos para mensajes de éxito e info
    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            if (statusDiv.parentNode) {
                statusDiv.remove();
            }
        }, 5000);
    }
}

function hideStatusMessage() {
    const existingMessage = document.querySelector('.status-message');
    if (existingMessage) {
        existingMessage.remove();
    }
}

function updateSelectedCellsColor() {
    const selectedElements = document.querySelectorAll('.selected');
    selectedElements.forEach(cell => {
        cell.style.backgroundColor = currentColor;
    });
}

function updateDateRange() {
    const fechaInicio = document.getElementById('fecha-inicio').value;
    const fechaFin = document.getElementById('fecha-fin').value;
    
    if (fechaInicio && fechaFin) {
        const inicio = new Date(fechaInicio);
        const fin = new Date(fechaFin);
        
        const formatoFecha = { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        };
        
        const fechaInicioFormateada = inicio.toLocaleDateString('es-ES', formatoFecha);
        const fechaFinFormateada = fin.toLocaleDateString('es-ES', formatoFecha);
        
        const dateRangeElement = document.querySelector('.date-range span');
        dateRangeElement.textContent = `Del ${fechaInicioFormateada} al ${fechaFinFormateada}`;
    }
}

function clearAllSelections() {
    clearSelection();
}

// Funciones adicionales para exportar/importar horarios
function exportSchedule() {
    const formData = {
        horario: document.getElementById('horario').value,
        grupo: document.getElementById('grupo').value,
        edificio: document.getElementById('edificio').value,
        salon: document.getElementById('salon').value,
        asesor: document.getElementById('asesor').value,
        administrador: document.getElementById('administrador').value,
        fechaInicio: document.getElementById('fecha-inicio').value,
        fechaFin: document.getElementById('fecha-fin').value,
        color: document.getElementById('color').value,
        selectedCells: Array.from(selectedCells)
    };
    
    return JSON.stringify(formData, null, 2);
}

function importSchedule(jsonData) {
    try {
        const data = JSON.parse(jsonData);
        
        // Cargar datos del formulario
        document.getElementById('horario').value = data.horario || '';
        document.getElementById('grupo').value = data.grupo || '';
        document.getElementById('edificio').value = data.edificio || '';
        document.getElementById('salon').value = data.salon || '';
        document.getElementById('asesor').value = data.asesor || '';
        document.getElementById('administrador').value = data.administrador || '';
        document.getElementById('fecha-inicio').value = data.fechaInicio || '';
        document.getElementById('fecha-fin').value = data.fechaFin || '';
        document.getElementById('color').value = data.color || '#90EE90';
        
        // Actualizar color actual
        currentColor = data.color || '#90EE90';
        
        // Limpiar selecciones actuales
        clearAllSelections();
        
        // Cargar celdas seleccionadas
        if (data.selectedCells) {
            data.selectedCells.forEach(cellId => {
                const [day, time] = cellId.split('-');
                const cell = document.querySelector(`[data-day="${day}"][data-time="${time}"]`);
                if (cell) {
                    selectedCells.add(cellId);
                    cell.classList.add('selected');
                    cell.style.backgroundColor = currentColor;
                }
            });
        }
        
        // Actualizar rango de fechas
        updateDateRange();
        
    } catch (error) {
        console.error('Error al importar horario:', error);
        alert('Error al importar el horario. Verifique el formato del archivo.');
    }
}

// Agregar botones de exportar/importar (opcional)
function addExportImportButtons() {
    const formSection = document.querySelector('.form-section');
    
    const exportBtn = document.createElement('button');
    exportBtn.textContent = 'Exportar Horario';
    exportBtn.style.marginTop = '10px';
    exportBtn.style.marginRight = '10px';
    exportBtn.addEventListener('click', function() {
        const data = exportSchedule();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'horario.json';
        a.click();
        URL.revokeObjectURL(url);
    });
    
    const importBtn = document.createElement('button');
    importBtn.textContent = 'Importar Horario';
    importBtn.style.marginTop = '10px';
    importBtn.addEventListener('click', function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    importSchedule(e.target.result);
                };
                reader.readAsText(file);
            }
        });
        input.click();
    });
    
    formSection.appendChild(exportBtn);
    formSection.appendChild(importBtn);
}

// Llamar a esta función si quieres agregar los botones de exportar/importar
// addExportImportButtons();