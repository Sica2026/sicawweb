// ===== CONFIGURACIÓN DE HORARIOS =====
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

// ===== ESTADO DEL HORARIO =====
let selectedCells = new Set();
let currentColor = '#90EE90';
let selectionMode = 'range';
let rangeStart = null;
let rangeEnd = null;
let courses = [];
let lastAsesor = '';
let lastAdministrador = '';
let lastCurso = '';

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    generateScheduleTable();
    setupEventListeners();
    setupDarkModeToggle(); // Agregar funcionalidad de modo oscuro
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
});

// ===== FUNCIONALIDAD DE MODO OSCURO =====
function setupDarkModeToggle() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    
    if (!darkModeToggle) {
        console.error('No se encontró el elemento darkModeToggle');
        return;
    }
    
    const darkModeIcon = darkModeToggle.querySelector('i');
    
    if (!darkModeIcon) {
        console.error('No se encontró el icono dentro del darkModeToggle');
        return;
    }
    
    // Verificar si hay una preferencia guardada
    const savedTheme = localStorage.getItem('sica-theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateDarkModeIcon(savedTheme === 'dark');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        updateDarkModeIcon(false);
        localStorage.setItem('sica-theme', 'light');
    }
    
    // Manejar click en el toggle
    darkModeToggle.addEventListener('click', function(e) {
        e.preventDefault();
        toggleDarkMode();
    });
    
    function toggleDarkMode() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('sica-theme', newTheme);
        updateDarkModeIcon(newTheme === 'dark');
        
        // Agregar efecto de transición suave
        document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
        setTimeout(() => {
            document.body.style.transition = '';
        }, 300);
        
        console.log(`Tema cambiado a: ${newTheme}`);
    }
    
    function updateDarkModeIcon(isDark) {
        const darkModeToggle = document.getElementById('darkModeToggle');
        if (!darkModeToggle) return;
        
        const darkModeIcon = darkModeToggle.querySelector('i');
        if (!darkModeIcon) return;
        
        // Buscar el texto del enlace
        const linkElement = darkModeToggle;
        const textNodes = Array.from(linkElement.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
        
        if (isDark) {
            darkModeIcon.className = 'bi bi-sun me-2';
            if (textNodes.length > 0) {
                textNodes[textNodes.length - 1].textContent = 'Modo Claro';
            } else {
                linkElement.appendChild(document.createTextNode('Modo Claro'));
            }
        } else {
            darkModeIcon.className = 'bi bi-moon me-2';
            if (textNodes.length > 0) {
                textNodes[textNodes.length - 1].textContent = 'Modo Oscuro';
            } else {
                linkElement.appendChild(document.createTextNode('Modo Oscuro'));
            }
        }
    }
}

// ===== RELOJ EN TIEMPO REAL =====
function updateCurrentTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    const timeElement = document.getElementById('currentTime');
    if (timeElement) {
        timeElement.textContent = timeString;
    }
}

// ===== GENERACIÓN DE LA TABLA =====
function generateScheduleTable() {
    const scheduleBody = document.getElementById('schedule-body');
    scheduleBody.innerHTML = '';

    timeSlots.forEach((timeSlot, index) => {
        const row = document.createElement('tr');
        
        const timeCell = document.createElement('td');
        timeCell.textContent = timeSlot;
        timeCell.classList.add('time-slot');
        row.appendChild(timeCell);

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

// ===== MANEJO DE SELECCIÓN DE CELDAS =====
function toggleCell(event) {
    const cell = event.target;
    const cellId = `${cell.dataset.day}-${cell.dataset.time}`;
    
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
        rangeStart = {
            cell: cell,
            day: cell.dataset.day,
            time: parseInt(cell.dataset.time),
            id: cellId
        };
        
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
        const startTime = rangeStart.time;
        const endTime = parseInt(cell.dataset.time);
        
        if (endTime >= startTime) {
            rangeEnd = {
                cell: cell,
                day: cell.dataset.day,
                time: endTime,
                id: cellId
            };
            
            document.querySelectorAll('.selected, .range-start, .range-end').forEach(c => {
                if (!c.classList.contains('course-block')) {
                    c.classList.remove('selected', 'range-start', 'range-end');
                }
            });
            selectedCells.clear();
            
            for (let i = startTime; i <= endTime; i++) {
                const rangeCellId = `${rangeStart.day}-${i}`;
                const rangeCell = document.querySelector(`[data-day="${rangeStart.day}"][data-time="${i}"]`);
                if (rangeCell && !rangeCell.classList.contains('course-block')) {
                    selectedCells.add(rangeCellId);
                    rangeCell.classList.add('selected');
                }
            }
            
            rangeStart.cell.classList.add('range-start');
            if (endTime > startTime) {
                cell.classList.add('range-end');
            }
            
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
        }
    } else {
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

// ===== CONFIGURACIÓN DE EVENT LISTENERS =====
function setupEventListeners() {
    const colorInput = document.getElementById('color');
    colorInput.addEventListener('change', function() {
        currentColor = this.value;
        updateSelectedCellsColor();
    });

    const fechaInicio = document.getElementById('fecha-inicio');
    const fechaFin = document.getElementById('fecha-fin');
    
    fechaInicio.addEventListener('change', updateDateRange);
    fechaFin.addEventListener('change', updateDateRange);

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
        
        if (this.value === 'SICA') {
            edificioField.disabled = true;
            salonField.disabled = true;
            edificioField.value = '';
            salonField.value = '';
            edificioField.placeholder = 'No aplica para SICA';
            salonField.placeholder = 'No aplica para SICA';
            edificioLabel.classList.add('disabled');
            salonLabel.classList.add('disabled');
        } else {
            edificioField.disabled = false;
            salonField.disabled = false;
            edificioField.placeholder = 'Edificio';
            salonField.placeholder = 'Salón';
            edificioLabel.classList.remove('disabled');
            salonLabel.classList.remove('disabled');
        }
        
        updateSicaCounter();
    });

    const btnAgregar = document.getElementById('btn-agregar');
    btnAgregar.addEventListener('click', addCourse);

    const btnLimpiar = document.getElementById('btn-limpiar');
    btnLimpiar.addEventListener('click', clearEntireSchedule);

    const btnGenerar = document.getElementById('btn-generar');
    btnGenerar.addEventListener('click', generatePDF);

    const requiredFields = ['horario', 'nombre-curso', 'nombre-asesor', 'asesor', 'edificio', 'salon'];
    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', validateForm);
            field.addEventListener('change', validateForm);
        }
    });

    const customField = document.getElementById('nombre-curso-custom');
    customField.addEventListener('input', validateForm);

    document.addEventListener('dblclick', function(e) {
        if (e.target.classList.contains('course-block') || e.target.closest('.course-block')) {
            const targetCell = e.target.classList.contains('course-block') ? e.target : e.target.closest('.course-block');
            removeCourse(targetCell);
        }
    });
}

// ===== AGREGAR CURSO =====
function addCourse() {
    if (!validateForm()) {
        return;
    }

    if (selectedCells.size === 0) {
        showStatusMessage('Selecciona al menos una celda para el curso', 'error');
        return;
    }

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
        id: Date.now(),
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
        totalMinutes: selectedCells.size * 30,
        hours: selectedCells.size * 30
    };

    lastAsesor = document.getElementById('nombre-asesor').value;
    lastAdministrador = document.getElementById('asesor').value;
    lastCurso = tipoNombre;

    courses.push(courseData);
    displayCourseInTable(courseData);

    clearSelection();
    document.getElementById('nombre-curso').value = lastCurso;
    document.getElementById('nombre-curso-custom').value = '';
    document.getElementById('nombre-asesor').value = lastAsesor;
    document.getElementById('asesor').value = lastAdministrador;
    document.getElementById('curso-personalizado').style.display = lastCurso === 'Otro' ? 'block' : 'none';

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
    
    if (nombreCurso === 'SICA') {
        updateSicaCounter();
    }
}

// ===== MOSTRAR CURSO EN LA TABLA =====
function displayCourseInTable(courseData) {
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
            
            if (totalCells === 1) {
                cell.classList.add('course-single', 'course-main');
            } else if (index === 0) {
                cell.classList.add('course-start', 'course-main');
            } else if (index === totalCells - 1) {
                cell.classList.add('course-end');
            } else {
                cell.classList.add('course-middle');
            }
            
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
                
                let displayInfo;
                if (courseData.nombre === 'SICA') {
                    displayInfo = courseData.nombreAsesor ? 
                        `${courseData.nombreAsesor}<br>${timeText}` : 
                        timeText;
                } else {
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
                
                const container = cell.querySelector('.course-block-container');
                if (container) {
                    container.style.height = `${totalCells * 100}%`;
                    container.style.zIndex = '10';
                }
            } else {
                cell.innerHTML = '';
            }
        }
    });
}

// ===== ELIMINAR CURSO =====
function removeCourse(cell) {
    const courseId = parseInt(cell.dataset.courseId);
    const courseIndex = courses.findIndex(course => course.id === courseId);
    
    if (courseIndex !== -1) {
        const course = courses[courseIndex];
        const wasSica = course.nombre === 'SICA';
        
        if (confirm(`¿Eliminar el curso "${course.nombre}"?`)) {
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
            
            courses.splice(courseIndex, 1);
            showStatusMessage(`Curso "${course.nombre}" eliminado`, 'info');
            
            if (wasSica) {
                updateSicaCounter();
            }
        }
    }
}

// ===== LIMPIAR TODO EL HORARIO =====
function clearEntireSchedule() {
    if (courses.length === 0) {
        showStatusMessage('El horario ya está vacío', 'info');
        return;
    }
    
    if (confirm('¿Estás seguro de que quieres limpiar todo el horario? Esta acción no se puede deshacer.')) {
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
        
        courses.length = 0;
        clearSelection();
        
        document.getElementById('nombre-curso').value = '';
        document.getElementById('nombre-curso-custom').value = '';
        document.getElementById('nombre-asesor').value = '';
        document.getElementById('curso-personalizado').style.display = 'none';
        
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
        updateSicaCounter();
    }
}

// ===== VALIDACIÓN DE FORMULARIO =====
function validateForm() {
    const tipoNombre = document.getElementById('nombre-curso').value;
    const horario = document.getElementById('horario').value;
    const nombreAsesor = document.getElementById('nombre-asesor').value.trim();
    const administrador = document.getElementById('asesor').value;
    let nombreCurso;
    
    if (!horario) {
        showStatusMessage('El horario es requerido', 'error');
        return false;
    }
    
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
    
    if (!nombreAsesor) {
        showStatusMessage('El nombre del asesor es requerido', 'error');
        return false;
    }
    
    if (!administrador) {
        showStatusMessage('El administrador es requerido', 'error');
        return false;
    }
    
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

// ===== FUNCIONES AUXILIARES =====
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

// ===== GENERACIÓN DE PDF =====
function generatePDF() {
    if (courses.length === 0) {
        showStatusMessage('No hay cursos para generar PDF. Agrega al menos un curso.', 'error');
        return;
    }
    
    showStatusMessage('Generando PDF...', 'info');
    
    const tipoHorario = document.getElementById('horario').value || 'No especificado';
    const nombreAsesor = lastAsesor || 'No especificado';
    const administrador = lastAdministrador || 'No especificado';
    const fechaActual = new Date().toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    
    const fechaInicio = document.getElementById('fecha-inicio').value;
    const fechaFin = document.getElementById('fecha-fin').value;
    let fechaValidacion = 'No especificado';
    
    if (fechaInicio && fechaFin) {
        const inicio = new Date(fechaInicio);
        const fin = new Date(fechaFin);
        const formatoFecha = { day: 'numeric', month: 'long', year: 'numeric' };
        fechaValidacion = `Del ${inicio.toLocaleDateString('es-ES', formatoFecha)} al ${fin.toLocaleDateString('es-ES', formatoFecha)}`;
    }
    
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
    
    const tableElement = document.querySelector('.schedule-table');
    
    html2canvas(tableElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: tableElement.offsetWidth,
        height: tableElement.offsetHeight
    }).then(function(canvas) {
        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            const pageWidth = 210;
            const pageHeight = 297;
            const margin = 15;
            const contentWidth = pageWidth - (2 * margin);
            
            pdf.setLineWidth(0.5);
            pdf.rect(margin - 5, margin - 5, contentWidth + 10, pageHeight - (2 * margin) + 10);
            
            let currentY = margin + 5;
            
            pdf.setFontSize(18);
            pdf.setFont(undefined, 'bold');
            pdf.text(`HORARIO: ${tipoHorario.toUpperCase()}`, pageWidth / 2, currentY, { align: 'center' });
            currentY += 15;
            
            pdf.setFontSize(10);
            pdf.setFont(undefined, 'normal');
            
            const infoStartY = currentY;
            
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
            const fechaValidacionCorta = fechaValidacion.length > 45 ? 
                fechaValidacion.substring(0, 42) + '...' : fechaValidacion;
            pdf.text(fechaValidacionCorta, margin + 35, currentY);
            
            currentY = infoStartY;
            const rightColumnX = pageWidth / 2 - 5;
            
            pdf.setFont(undefined, 'bold');
            pdf.text('Fecha de realización:', rightColumnX, currentY);
            pdf.setFont(undefined, 'normal');
            pdf.text(fechaActual, rightColumnX + 35, currentY);
            currentY += 7;
            
            pdf.setFont(undefined, 'bold');
            pdf.text('Horas de SICA:', rightColumnX, currentY);
            pdf.setFont(undefined, 'bold');
            pdf.setTextColor(217, 119, 6);
            pdf.text(sicaTimeText, rightColumnX + 26, currentY);
            
            const sicaTextWidth = pdf.getTextWidth(sicaTimeText);
            pdf.line(rightColumnX + 25, currentY + 1, rightColumnX + 25 + sicaTextWidth, currentY + 1);
            
            pdf.setTextColor(0, 0, 0);
            
            currentY += 15;
            
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = contentWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            const remainingHeight = pageHeight - currentY - margin - 20;
            let finalImgHeight = imgHeight;
            let finalImgWidth = imgWidth;
            
            if (imgHeight > remainingHeight) {
                finalImgHeight = remainingHeight;
                finalImgWidth = (canvas.width * finalImgHeight) / canvas.height;
            }
            
            const imgX = finalImgWidth < contentWidth ? 
                (pageWidth - finalImgWidth) / 2 : margin;
            
            pdf.addImage(imgData, 'PNG', imgX, currentY, finalImgWidth, finalImgHeight);
            
            const firmaY = pageHeight - margin - 10;
            pdf.setFontSize(12);
            pdf.setFont(undefined, 'normal');
            
            const firmaLineStart = pageWidth / 2 - 30;
            const firmaLineEnd = pageWidth / 2 + 30;
            pdf.line(firmaLineStart, firmaY - 5, firmaLineEnd, firmaY - 5);
            
            pdf.text('Firma', pageWidth / 2, firmaY, { align: 'center' });
            
            const nombreLimpio = nombreAsesor.replace(/[^a-zA-Z0-9]/g, '_');
            const tipoLimpio = tipoHorario.replace(/[^a-zA-Z0-9]/g, '_');
            const fileName = `${nombreLimpio}_${tipoLimpio}.pdf`;
            
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

// ===== MANEJO DE MENSAJES =====
function showStatusMessage(message, type) {
    const existingMessage = document.querySelector('.status-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    const statusDiv = document.createElement('div');
    statusDiv.className = `status-message status-${type}`;
    statusDiv.textContent = message;
    
    const buttonGroup = document.querySelector('.button-group');
    buttonGroup.parentNode.insertBefore(statusDiv, buttonGroup.nextSibling);
    
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