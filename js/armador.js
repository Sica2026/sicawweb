// Variables globales
let selectedCells = new Set();
let scheduleData = {};
let currentCourseId = null;
let savedData = {};
let isSelecting = false;
let startCell = null;
let asesoresData = {}; // Almacenar datos de asesores

// Modal instance para Bootstrap
let courseModalInstance = null;

// Cargar asesores desde Firebase
async function loadAsesores() {
    try {
        if (!firebase.firestore) {
            console.log('Firebase Firestore no está disponible');
            return;
        }

        const db = firebase.firestore();
        const asesoresSnapshot = await db.collection('asesores').get();
        
        const advisorSelect = document.getElementById('advisorName');
        
        // Limpiar opciones existentes excepto la primera
        advisorSelect.innerHTML = '<option value="">Selecciona un asesor...</option>';
        
        // Limpiar datos previos
        asesoresData = {};
        
        asesoresSnapshot.forEach((doc) => {
            const data = doc.data();
            const nombreHorario = data.nombreHorario;
            const administrador = data.administrador;
            
            if (nombreHorario) {
                // Almacenar datos del asesor
                asesoresData[nombreHorario] = {
                    administrador: administrador || 'Sin asignar',
                    id: doc.id
                };
                
                // Crear opción en el select
                const option = document.createElement('option');
                option.value = nombreHorario;
                option.textContent = nombreHorario;
                advisorSelect.appendChild(option);
            }
        });
        
        console.log('Asesores cargados:', Object.keys(asesoresData).length);
        
    } catch (error) {
        console.error('Error cargando asesores:', error);
        
        // Mostrar notificación de error si SICA está disponible
        if (window.SICAComponents) {
            window.SICAComponents.notify(
                'Error al cargar asesores', 
                'No se pudieron cargar los asesores desde Firebase', 
                'error', 
                'bi-exclamation-triangle'
            );
        }
    }
}

// Manejar cambio de asesor para llenar administrador automáticamente
function handleAdvisorChange() {
    const advisorSelect = document.getElementById('advisorName');
    const administratorInput = document.getElementById('administrator');
    
    const selectedAdvisor = advisorSelect.value;
    
    if (selectedAdvisor && asesoresData[selectedAdvisor]) {
        administratorInput.value = asesoresData[selectedAdvisor].administrador;
    } else {
        administratorInput.value = '';
    }
}
function getCurrentDateCDMX() {
    const now = new Date();
    // Convertir a zona horaria de CDMX (UTC-6)
    const cdmxTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Mexico_City"}));
    return cdmxTime.toISOString().split('T')[0];
}

// Generar intervalos de tiempo de 30 minutos con formato inicio-fin
function generateTimeSlots() {
    const timeSlots = [];
    for (let hour = 7; hour <= 20; hour++) {
        // Primera media hora: X:00 - X:30
        const startTime1 = `${hour.toString().padStart(2, '0')}:00`;
        const endTime1 = `${hour.toString().padStart(2, '0')}:30`;
        timeSlots.push(`${startTime1}-${endTime1}`);
        
        // Segunda media hora: X:30 - (X+1):00 (excepto la última)
        if (hour < 20) {
            const startTime2 = `${hour.toString().padStart(2, '0')}:30`;
            const endTime2 = `${(hour + 1).toString().padStart(2, '0')}:00`;
            timeSlots.push(`${startTime2}-${endTime2}`);
        }
    }
    // Último intervalo: 20:30-21:00
    timeSlots.push('20:30-21:00');
    return timeSlots;
}

// Inicializar la tabla
function initializeTable() {
    const timeSlots = generateTimeSlots();
    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
    const tbody = document.getElementById('scheduleBody');

    timeSlots.forEach(timeRange => {
        const row = document.createElement('tr');
        
        // Celda de tiempo con rango completo
        const timeCell = document.createElement('td');
        timeCell.className = 'time-cell';
        timeCell.textContent = timeRange;
        row.appendChild(timeCell);

        // Celdas para cada día
        days.forEach(day => {
            const cell = document.createElement('td');
            cell.className = 'schedule-cell';
            cell.dataset.time = timeRange;
            cell.dataset.day = day;
            cell.dataset.cellId = `${day}-${timeRange}`;
            
            // Eventos para selección múltiple
            cell.addEventListener('mousedown', (e) => handleMouseDown(e, cell));
            cell.addEventListener('mouseenter', (e) => handleMouseEnter(e, cell));
            cell.addEventListener('mouseup', () => handleMouseUp());
            cell.addEventListener('click', (e) => handleCellClick(e, cell, timeRange, day));
            
            row.appendChild(cell);
        });

        tbody.appendChild(row);
    });

    // Prevenir selección de texto durante el arrastre
    document.addEventListener('selectstart', (e) => {
        if (isSelecting) e.preventDefault();
    });
}

// Manejar inicio de selección múltiple
function handleMouseDown(e, cell) {
    if (cell.classList.contains('occupied')) return;
    
    e.preventDefault();
    isSelecting = true;
    startCell = cell;
    clearSelection();
    selectCell(cell);
}

// Manejar arrastre para selección múltiple
function handleMouseEnter(e, cell) {
    if (!isSelecting || cell.classList.contains('occupied')) return;
    
    selectCell(cell);
}

// Manejar fin de selección múltiple
function handleMouseUp() {
    isSelecting = false;
    startCell = null;
}

// Manejar clic en celda
function handleCellClick(e, cell, time, day) {
    if (isSelecting) return;
    
    // Si la celda ya tiene un curso, mostrar detalles
    if (cell.classList.contains('occupied')) {
        showCourseDetails(cell, time, day);
        return;
    }
    
    // Si no está seleccionada, seleccionarla
    if (!cell.classList.contains('selected')) {
        clearSelection();
        selectCell(cell);
    }
}

// Seleccionar celda individual
function selectCell(cell) {
    if (cell.classList.contains('occupied')) return;
    
    cell.classList.add('selected');
    selectedCells.add(cell.dataset.cellId);
    updateSelectionDisplay();
}

// Limpiar selección
function clearSelection() {
    selectedCells.clear();
    document.querySelectorAll('.schedule-cell.selected').forEach(cell => {
        cell.classList.remove('selected');
    });
    updateSelectionDisplay();
}

// Actualizar display de selección con conteo de horas
function updateSelectionDisplay() {
    const count = selectedCells.size;
    const hours = count * 0.5; // Cada celda = 30 minutos = 0.5 horas
    
    const countElement = document.getElementById('selectionCount');
    const hoursElement = document.getElementById('selectionHours');
    
    countElement.textContent = `${count} celda${count !== 1 ? 's' : ''} seleccionada${count !== 1 ? 's' : ''}`;
    hoursElement.textContent = `(${hours} hora${hours !== 1 ? 's' : ''})`;
}

// Mostrar detalles del curso usando Bootstrap Modal
function showCourseDetails(cell, time, day) {
    const courseKey = `${day}-${time}`;
    const course = scheduleData[courseKey];
    
    if (!course) return;

    currentCourseId = courseKey;
    
    // Si es una celda combinada, mostrar información más detallada
    let durationInfo = '';
    if (cell.classList.contains('merged')) {
        const rowSpan = cell.rowSpan || 1;
        const durationHours = rowSpan * 0.5;
        durationInfo = `<strong>Duración:</strong> ${durationHours} hora${durationHours !== 1 ? 's' : ''}<br>`;
    }
    
    const details = `
        <div class="course-info">
            <strong>Curso:</strong> ${course.name}<br>
            <strong>Asesor:</strong> ${course.advisor}<br>
            <strong>Administrador:</strong> ${course.administrator}<br>
            <strong>Salón:</strong> ${course.classroom}<br>
            <strong>Edificio:</strong> ${course.building}<br>
            <strong>Fecha:</strong> ${course.date}<br>
            ${durationInfo}
            <strong>Color:</strong> <span style="display: inline-block; width: 20px; height: 20px; background: ${course.color}; border-radius: 3px; vertical-align: middle; border: 1px solid #ccc;"></span><br>
            <strong>Horario:</strong> ${course.timeSlots.join(', ')}<br>
            <strong>Días:</strong> ${course.days.join(', ')}
        </div>
    `;
    
    document.getElementById('courseDetails').innerHTML = details;
    
    // Mostrar modal usando Bootstrap
    if (!courseModalInstance) {
        courseModalInstance = new bootstrap.Modal(document.getElementById('courseModal'));
    }
    courseModalInstance.show();
}

// Cerrar modal
function closeModal() {
    if (courseModalInstance) {
        courseModalInstance.hide();
    }
    currentCourseId = null;
}

// Eliminar curso
function deleteCourse() {
    if (!currentCourseId) return;
    
    if (!confirm('¿Estás seguro de que quieres eliminar este curso?')) {
        return;
    }
    
    const course = scheduleData[currentCourseId];
    if (course && course.cellIds) {
        // Eliminar todas las celdas del curso
        course.cellIds.forEach(cellId => {
            delete scheduleData[cellId];
        });
    } else {
        // Buscar y eliminar todas las celdas del mismo curso
        const parts = currentCourseId.split('-');
        const day = parts[0];
        const timeRange = parts.slice(1).join('-');
        
        const timeSlots = generateTimeSlots();
        const currentIndex = timeSlots.indexOf(timeRange);
        
        if (currentIndex !== -1) {
            // Eliminar hacia adelante y atrás
            for (let i = 0; i < timeSlots.length; i++) {
                const cellId = `${day}-${timeSlots[i]}`;
                const cellCourse = scheduleData[cellId];
                
                if (cellCourse && 
                    cellCourse.name === course.name && 
                    cellCourse.advisor === course.advisor && 
                    cellCourse.date === course.date) {
                    delete scheduleData[cellId];
                }
            }
        }
    }
    
    updateScheduleDisplay();
    updateCounters();
    closeModal();
    
    // Mostrar notificación usando sistema SICA
    if (window.SICAComponents) {
        window.SICAComponents.notify(
            'Curso Eliminado', 
            'El curso ha sido eliminado correctamente', 
            'success', 
            'bi-trash'
        );
    }
}

// Agregar curso
function addCourse() {
    if (selectedCells.size === 0) {
        if (window.SICAComponents) {
            window.SICAComponents.notify(
                'Selección Requerida', 
                'Por favor, selecciona al menos una celda en el horario', 
                'warning', 
                'bi-exclamation-triangle'
            );
        } else {
            alert('Por favor, selecciona al menos una celda en el horario.');
        }
        return;
    }

    const courseName = document.getElementById('courseName').value.trim();
    const advisorName = document.getElementById('advisorName').value; // Ahora es un select
    const administrator = document.getElementById('administrator').value.trim();
    const classroom = document.getElementById('classroom').value.trim();
    const building = document.getElementById('building').value.trim();
    const realizationDate = document.getElementById('realizationDate').value;
    const courseColor = document.getElementById('courseColor').value;

    // Validar campos obligatorios
    if (!courseName || !advisorName || !administrator || !realizationDate) {
        if (window.SICAComponents) {
            window.SICAComponents.notify(
                'Campos Requeridos', 
                'Por favor, completa todos los campos obligatorios', 
                'error', 
                'bi-exclamation-circle'
            );
        } else {
            alert('Por favor, completa todos los campos obligatorios.');
        }
        return;
    }

    // Para cursos SICA, salón y edificio no son necesarios
    if (courseName.toUpperCase() !== 'SICA' && (!classroom || !building)) {
        if (window.SICAComponents) {
            window.SICAComponents.notify(
                'Información Requerida', 
                'Para cursos que no son SICA, el salón y edificio son obligatorios', 
                'warning', 
                'bi-info-circle'
            );
        } else {
            alert('Para cursos que no son SICA, el salón y edificio son obligatorios.');
        }
        return;
    }

    // Verificar conflictos
    const conflictCells = Array.from(selectedCells).filter(cellId => scheduleData[cellId]);
    if (conflictCells.length > 0) {
        if (window.SICAComponents) {
            window.SICAComponents.notify(
                'Conflicto de Horario', 
                'Algunas celdas seleccionadas ya tienen cursos asignados', 
                'error', 
                'bi-exclamation-triangle'
            );
        } else {
            alert('Algunas celdas seleccionadas ya tienen cursos asignados. Por favor, selecciona celdas vacías.');
        }
        return;
    }

    // Obtener información de las celdas seleccionadas
    const cellsInfo = Array.from(selectedCells).map(cellId => {
        const parts = cellId.split('-');
        const day = parts[0];
        const timeRange = parts.slice(1).join('-');
        return { day, timeRange, cellId };
    });

    const days = [...new Set(cellsInfo.map(cell => cell.day))];
    const timeSlots = [...new Set(cellsInfo.map(cell => cell.timeRange))].sort();

    // Crear objeto de curso
    const courseData = {
        name: courseName,
        advisor: advisorName,
        administrator: administrator,
        classroom: courseName.toUpperCase() === 'SICA' ? 'N/A' : classroom,
        building: courseName.toUpperCase() === 'SICA' ? 'N/A' : building,
        date: realizationDate,
        color: courseColor,
        days: days,
        timeSlots: timeSlots,
        cellIds: Array.from(selectedCells)
    };

    // Guardar curso en todas las celdas seleccionadas
    selectedCells.forEach(cellId => {
        scheduleData[cellId] = { ...courseData };
    });

    // Guardar datos si está marcado el checkbox
    if (document.getElementById('saveData').checked) {
        saveFormData();
    }

    updateScheduleDisplay();
    updateCounters();
    clearForm();
    clearSelection();
    
    // Mostrar notificación de éxito
    if (window.SICAComponents) {
        window.SICAComponents.notify(
            'Curso Agregado', 
            `El curso "${courseName}" ha sido agregado correctamente`, 
            'success', 
            'bi-check-circle'
        );
    }
}

// Actualizar visualización del horario
function updateScheduleDisplay() {
    // Limpiar todas las celdas
    document.querySelectorAll('.schedule-cell').forEach(cell => {
        cell.className = 'schedule-cell';
        cell.textContent = '';
        cell.style.border = '';
        cell.style.background = '';
        cell.style.display = '';
        cell.rowSpan = 1;
    });

    // Llenar todas las celdas normalmente
    Object.keys(scheduleData).forEach(cellId => {
        const course = scheduleData[cellId];
        const cell = document.querySelector(`[data-cell-id="${cellId}"]`);
        
        if (cell) {
            cell.classList.add('occupied');
            if (course.name.toUpperCase() === 'SICA') {
                cell.classList.add('sica');
            }
            
            // Aplicar color personalizado
            if (course.color) {
                cell.style.background = course.color;
            }
            
            cell.textContent = course.name;
        }
    });

    // Combinar celdas consecutivas
    mergeCells();
}

// Función para combinar celdas consecutivas del mismo curso
function mergeCells() {
    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
    const timeSlots = generateTimeSlots();
    
    days.forEach(day => {
        let i = 0;
        while (i < timeSlots.length) {
            const currentTime = timeSlots[i];
            const currentCellId = `${day}-${currentTime}`;
            const currentCourse = scheduleData[currentCellId];
            
            if (currentCourse) {
                // Buscar celdas consecutivas del mismo curso
                let consecutiveCount = 1;
                let j = i + 1;
                
                while (j < timeSlots.length) {
                    const nextTime = timeSlots[j];
                    const nextCellId = `${day}-${nextTime}`;
                    const nextCourse = scheduleData[nextCellId];
                    
                    if (nextCourse && 
                        nextCourse.name === currentCourse.name && 
                        nextCourse.advisor === currentCourse.advisor && 
                        nextCourse.date === currentCourse.date) {
                        consecutiveCount++;
                        j++;
                    } else {
                        break;
                    }
                }
                
                // Si hay 2 o más celdas consecutivas, combinarlas
                if (consecutiveCount >= 2) {
                    const firstCell = document.querySelector(`[data-cell-id="${currentCellId}"]`);
                    
                    if (firstCell) {
                        firstCell.rowSpan = consecutiveCount;
                        firstCell.classList.add('merged');
                        
                        const startRange = currentTime;
                        const endRange = timeSlots[i + consecutiveCount - 1];
                        
                        const startTime = startRange.split('-')[0];
                        const endTime = endRange.split('-')[1];
                        const durationHours = consecutiveCount * 0.5;
                        
                        const courseContent = `
                            <div class="course-title">${currentCourse.name}</div>
                            <div class="course-time">${startTime} - ${endTime}</div>
                            <div class="course-duration">${durationHours} hora${durationHours !== 1 ? 's' : ''}</div>
                            <div class="course-location">
                                ${currentCourse.classroom !== 'N/A' ? `${currentCourse.building} - ${currentCourse.classroom}` : 'En validación'}
                            </div>
                        `;
                        
                        firstCell.innerHTML = courseContent;
                        
                        // Ocultar las celdas siguientes
                        for (let k = 1; k < consecutiveCount; k++) {
                            const cellToHide = document.querySelector(`[data-cell-id="${day}-${timeSlots[i + k]}"]`);
                            if (cellToHide) {
                                cellToHide.classList.add('hidden');
                                cellToHide.style.display = 'none';
                            }
                        }
                    }
                }
                
                i += consecutiveCount;
            } else {
                i++;
            }
        }
    });
}

// Actualizar contadores
function updateCounters() {
    const uniqueCourses = new Set();
    let sicaHours = 0;
    
    // Para cursos únicos
    Object.values(scheduleData).forEach(course => {
        const courseKey = `${course.name}-${course.advisor}-${course.date}`;
        uniqueCourses.add(courseKey);
    });

    // Para horas SICA
    Object.values(scheduleData).forEach(course => {
        if (course.name.toUpperCase() === 'SICA') {
            sicaHours += 0.5;
        }
    });

    document.getElementById('totalCourses').textContent = uniqueCourses.size;
    document.getElementById('sicaHours').textContent = sicaHours;
}

// Limpiar formulario
function clearForm() {
    if (!document.getElementById('saveData').checked) {
        document.getElementById('courseName').value = '';
        document.getElementById('advisorName').value = ''; // Reset select
        document.getElementById('administrator').value = '';
        document.getElementById('classroom').value = '';
        document.getElementById('building').value = '';
        document.getElementById('courseColor').value = '#4facfe';
    } else {
        document.getElementById('courseName').value = '';
        document.getElementById('advisorName').value = ''; // Reset select
        document.getElementById('administrator').value = '';
    }
    
    document.getElementById('realizationDate').value = getCurrentDateCDMX();
    clearSelection();
    
    document.getElementById('courseName').dispatchEvent(new Event('input'));
}

// Limpiar todos los datos
function clearAllData() {
    if (!confirm('¿Estás seguro de que quieres eliminar TODOS los cursos del horario? Esta acción no se puede deshacer.')) {
        return;
    }
    
    scheduleData = {};
    savedData = {};
    
    // Limpiar formulario completo
    document.getElementById('courseName').value = '';
    document.getElementById('advisorName').value = ''; // Reset select
    document.getElementById('administrator').value = '';
    document.getElementById('classroom').value = '';
    document.getElementById('building').value = '';
    document.getElementById('courseColor').value = '#4facfe';
    document.getElementById('realizationDate').value = getCurrentDateCDMX();
    document.getElementById('saveData').checked = false;
    
    // Limpiar localStorage
    try {
        localStorage.removeItem('scheduleBuilderData');
    } catch (e) {
        console.log('No se pudo limpiar localStorage');
    }
    
    updateScheduleDisplay();
    updateCounters();
    clearSelection();
    document.getElementById('savedDataSection').style.display = 'none';
    
    if (window.SICAComponents) {
        window.SICAComponents.notify(
            'Datos Limpiados', 
            'Horario limpiado completamente', 
            'success', 
            'bi-check-circle'
        );
    }
}

// Eliminar completamente la función updateCoursesList y highlightCourse

// Manejar cambios en el nombre del curso para SICA
function handleCourseNameChange() {
    const courseName = document.getElementById('courseName');
    const isSica = courseName.value.toUpperCase() === 'SICA';
    const classroom = document.getElementById('classroom');
    const building = document.getElementById('building');
    
    classroom.disabled = isSica;
    building.disabled = isSica;
    
    if (isSica) {
        classroom.value = 'N/A';
        building.value = 'N/A';
    } else {
        if (classroom.value === 'N/A') classroom.value = '';
        if (building.value === 'N/A') building.value = '';
    }
}

// Guardar datos del formulario
function saveFormData() {
    const courseName = document.getElementById('courseName').value.trim();
    
    savedData = {
        courseName: courseName,
        advisorName: document.getElementById('advisorName').value.trim(),
        administrator: document.getElementById('administrator').value.trim(),
        classroom: courseName.toUpperCase() === 'SICA' ? '' : document.getElementById('classroom').value.trim(),
        building: courseName.toUpperCase() === 'SICA' ? '' : document.getElementById('building').value.trim(),
        realizationDate: document.getElementById('realizationDate').value,
        courseColor: document.getElementById('courseColor').value
    };
    
    try {
        localStorage.setItem('scheduleBuilderData', JSON.stringify(savedData));
    } catch (e) {
        console.log('No se pudo guardar en localStorage');
    }
    
    showSavedData();
}

// Cargar últimos datos guardados
function loadLastData() {
    if (Object.keys(savedData).length === 0) {
        if (window.SICAComponents) {
            window.SICAComponents.notify(
                'Sin Datos', 
                'No hay datos guardados previamente', 
                'info', 
                'bi-info-circle'
            );
        } else {
            alert('No hay datos guardados previamente.');
        }
        return;
    }
    
    document.getElementById('courseName').value = savedData.courseName || '';
    document.getElementById('advisorName').value = savedData.advisorName || ''; // Select
    document.getElementById('classroom').value = savedData.classroom || '';
    document.getElementById('building').value = savedData.building || '';
    document.getElementById('realizationDate').value = savedData.realizationDate || '';
    document.getElementById('courseColor').value = savedData.courseColor || '#4facfe';
    
    // Llenar administrador automáticamente si hay asesor seleccionado
    if (savedData.advisorName && asesoresData[savedData.advisorName]) {
        document.getElementById('administrator').value = asesoresData[savedData.advisorName].administrador;
    } else {
        document.getElementById('administrator').value = savedData.administrator || '';
    }
    
    updateColorPresets();
    document.getElementById('courseName').dispatchEvent(new Event('input'));
    
    if (window.SICAComponents) {
        window.SICAComponents.notify(
            'Datos Cargados', 
            'Últimos datos cargados correctamente', 
            'success', 
            'bi-upload'
        );
    }
}

// Mostrar datos guardados
function showSavedData() {
    if (Object.keys(savedData).length === 0) {
        document.getElementById('savedDataSection').style.display = 'none';
        return;
    }
    
    const display = `
        <div class="small">
            <strong>Asesor:</strong> ${savedData.advisorName}<br>
            <strong>Admin:</strong> ${savedData.administrator}<br>
            ${savedData.classroom ? `<strong>Salón:</strong> ${savedData.classroom}<br>` : ''}
            ${savedData.building ? `<strong>Edificio:</strong> ${savedData.building}<br>` : ''}
            <strong>Color:</strong> <span style="display: inline-block; width: 15px; height: 15px; background: ${savedData.courseColor}; border-radius: 3px; vertical-align: middle; border: 1px solid #ccc;"></span>
        </div>
    `;
    
    document.getElementById('savedDataDisplay').innerHTML = display;
    document.getElementById('savedDataSection').style.display = 'block';
}

// Cargar datos guardados al iniciar
function loadSavedData() {
    try {
        const stored = localStorage.getItem('scheduleBuilderData');
        if (stored) {
            savedData = JSON.parse(stored);
            showSavedData();
        }
    } catch (e) {
        console.log('No se pudo cargar desde localStorage');
    }
}

// Actualizar selector de colores
function updateColorPresets() {
    const currentColor = document.getElementById('courseColor').value;
    document.querySelectorAll('.color-preset').forEach(preset => {
        preset.classList.remove('selected');
        if (preset.dataset.color === currentColor) {
            preset.classList.add('selected');
        }
    });
}

// Descargar imagen del horario
function downloadImage() {
    showLoadingState('downloadImage');
    
    const stats = getDetailedStatsForPDF();
    const currentDate = new Date().toISOString().split('T')[0];
    const advisorName = stats.mainAdvisor.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    const fileName = `Horario_${advisorName}_${currentDate}`;
    
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.width = '210mm';
    tempDiv.style.height = '297mm';
    tempDiv.style.backgroundColor = 'white';
    tempDiv.style.fontFamily = 'Arial, sans-serif';
    tempDiv.style.fontSize = '12px';
    
    tempDiv.innerHTML = `
        <div style="padding: 15px; height: 100%; display: flex; flex-direction: column;">
            <div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 6px; padding: 12px; margin-bottom: 15px; text-align: center; font-family: monospace; font-size: 12px; flex-shrink: 0;">
                <strong>CURSOS:</strong> ${stats.totalCourses} | 
                <strong style="color: #dc3545;">HORAS SICA:</strong> <span style="color: #dc3545; font-weight: bold;">${stats.sicaHours} hrs</span> | 
                <strong>ASESOR:</strong> ${stats.mainAdvisor} | 
                <strong>FIRMA:</strong> _________________________________ | 
                <strong>ADMIN:</strong> ${stats.mainAdministrator}
            </div>
            <div style="border: 1px solid #dee2e6; border-radius: 8px; overflow: hidden; flex: 1; display: flex; flex-direction: column;">
                ${generateVerticalPDFTable()}
            </div>
        </div>
    `;
    
    document.body.appendChild(tempDiv);
    
    html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: 794,
        height: 1123
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = `${fileName}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        document.body.removeChild(tempDiv);
        
        hideLoadingState('downloadImage');
        
        if (window.SICAComponents) {
            window.SICAComponents.notify(
                'Imagen Descargada', 
                'La imagen del horario se ha descargado correctamente', 
                'success', 
                'bi-download'
            );
        }
        
    }).catch(error => {
        console.error('Error generando imagen:', error);
        document.body.removeChild(tempDiv);
        hideLoadingState('downloadImage');
        
        if (window.SICAComponents) {
            window.SICAComponents.notify(
                'Error', 
                'Error al generar la imagen. Por favor, intenta de nuevo', 
                'error', 
                'bi-exclamation-triangle'
            );
        }
    });
}

// Generar PDF
function generatePDF() {
    showLoadingState('generatePDF');
    
    const stats = getDetailedStatsForPDF();
    const currentDate = new Date().toISOString().split('T')[0];
    const advisorName = stats.mainAdvisor.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    const fileName = `Horario_${advisorName}_${currentDate}`;
    
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.width = '210mm';
    tempDiv.style.height = '297mm';
    tempDiv.style.backgroundColor = 'white';
    tempDiv.style.fontFamily = 'Arial, sans-serif';
    tempDiv.style.fontSize = '12px';
    
    tempDiv.innerHTML = `
        <div style="padding: 15px; height: 100%; display: flex; flex-direction: column;">
            <div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 6px; padding: 12px; margin-bottom: 15px; text-align: center; font-family: monospace; font-size: 12px; flex-shrink: 0;">
                <strong>CURSOS:</strong> ${stats.totalCourses} | 
                <strong style="color: #dc3545;">HORAS SICA:</strong> <span style="color: #dc3545; font-weight: bold;">${stats.sicaHours} hrs</span> | 
                <strong>ASESOR:</strong> ${stats.mainAdvisor} | 
                <strong>FIRMA:</strong> _________________________________ | 
                <strong>ADMIN:</strong> ${stats.mainAdministrator}
            </div>
            <div style="border: 1px solid #dee2e6; border-radius: 8px; overflow: hidden; flex: 1; display: flex; flex-direction: column;">
                ${generateVerticalPDFTable()}
            </div>
        </div>
    `;
    
    document.body.appendChild(tempDiv);
    
    html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: 794,
        height: 1123
    }).then(canvas => {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${fileName}.pdf`);
        
        document.body.removeChild(tempDiv);
        hideLoadingState('generatePDF');
        
        if (window.SICAComponents) {
            window.SICAComponents.notify(
                'PDF Generado', 
                'El PDF del horario se ha descargado correctamente', 
                'success', 
                'bi-file-earmark-pdf'
            );
        }
        
    }).catch(error => {
        console.error('Error generando PDF:', error);
        document.body.removeChild(tempDiv);
        hideLoadingState('generatePDF');
        
        if (window.SICAComponents) {
            window.SICAComponents.notify(
                'Error', 
                'Error al generar el PDF. Por favor, intenta de nuevo', 
                'error', 
                'bi-exclamation-triangle'
            );
        }
    });
}

// Generar tabla vertical para PDF/Imagen
function generateVerticalPDFTable() {
    const timeSlots = generateTimeSlots();
    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
    const rowHeight = '20px';
    
    let tableHTML = `
        <table style="width: 100%; border-collapse: collapse; table-layout: fixed; height: 100%;">
            <thead>
                <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); height: 40px;">
                    <th style="color: white; padding: 8px 4px; text-align: center; font-weight: bold; width: 120px; border: 1px solid #dee2e6; font-size: 11px;">Horario</th>
                    ${days.map(day => `<th style="color: white; padding: 8px 4px; text-align: center; font-weight: bold; border: 1px solid #dee2e6; font-size: 12px; width: calc((100% - 120px) / 5);">${day}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
    `;
    
    const processedCells = new Set();
    
    timeSlots.forEach(timeRange => {
        tableHTML += `<tr style="height: ${rowHeight};">`;
        
        tableHTML += `<td style="background: #f8f9fa; font-weight: bold; color: #495057; text-align: center; padding: 3px 2px; border: 1px solid #dee2e6; font-size: 9px; vertical-align: middle; height: ${rowHeight}; line-height: 1.1;">${timeRange}</td>`;
        
        days.forEach(day => {
            const cellId = `${day}-${timeRange}`;
            
            if (processedCells.has(cellId)) {
                return;
            }
            
            const course = scheduleData[cellId];
            
            if (course) {
                let consecutiveCount = 1;
                let timeIndex = timeSlots.indexOf(timeRange);
                
                for (let i = timeIndex + 1; i < timeSlots.length; i++) {
                    const nextTimeRange = timeSlots[i];
                    const nextCellId = `${day}-${nextTimeRange}`;
                    const nextCourse = scheduleData[nextCellId];
                    
                    if (nextCourse && 
                        nextCourse.name === course.name && 
                        nextCourse.advisor === course.advisor && 
                        nextCourse.date === course.date) {
                        consecutiveCount++;
                        processedCells.add(nextCellId);
                    } else {
                        break;
                    }
                }
                
                const durationHours = consecutiveCount * 0.5;
                const combinedHeight = `${parseInt(rowHeight) * consecutiveCount}px`;
                
                const startRange = timeRange;
                const endRange = timeSlots[timeIndex + consecutiveCount - 1];
                
                const startTime = startRange.split('-')[0];
                const endTime = endRange ? endRange.split('-')[1] : '21:00';
                
                let backgroundColor = course.color || '#4facfe';
                if (course.name.toUpperCase() === 'SICA') {
                    backgroundColor = '#ff6b6b';
                }
                
                if (consecutiveCount > 1) {
                    const titleSize = Math.min(16, 10 + consecutiveCount * 2);
                    const textSize = Math.min(14, 8 + consecutiveCount * 2);
                    const smallTextSize = Math.min(12, 7 + consecutiveCount * 2);
                    
                    tableHTML += `
                        <td rowspan="${consecutiveCount}" style="
                            background: ${backgroundColor}; 
                            color: white; 
                            text-align: center; 
                            vertical-align: middle; 
                            padding: 4px 2px; 
                            border: 1px solid #dee2e6;
                            font-size: 10px;
                            line-height: 1.3;
                            height: ${combinedHeight};
                        ">
                            <div style="font-weight: bold; font-size: ${titleSize}px; margin-bottom: 2px;">${course.name}</div>
                            <div style="font-size: ${textSize}px; margin-bottom: 2px;">${startTime} - ${endTime}</div>
                            <div style="font-size: ${textSize}px; font-weight: bold; margin-bottom: 2px;">${durationHours} hrs</div>
                            <div style="font-size: ${smallTextSize}px;">
                                ${course.classroom !== 'N/A' ? `${course.building} - ${course.classroom}` : 'En validación'}
                            </div>
                        </td>
                    `;
                } else {
                    tableHTML += `
                        <td style="background: ${backgroundColor}; color: white; text-align: center; vertical-align: middle; padding: 3px 2px; border: 1px solid #dee2e6; font-size: 12px; font-weight: bold; height: ${rowHeight};">
                            ${course.name}
                        </td>
                    `;
                }
                
                processedCells.add(cellId);
            } else {
                tableHTML += `<td style="border: 1px solid #dee2e6; vertical-align: middle; height: ${rowHeight};"></td>`;
            }
        });
        
        tableHTML += '</tr>';
    });
    
    tableHTML += '</tbody></table>';
    return tableHTML;
}

// Obtener estadísticas detalladas para PDF
function getDetailedStatsForPDF() {
    const stats = {
        totalCourses: 0,
        sicaHours: 0,
        mainAdvisor: 'No asignado',
        mainAdministrator: 'No asignado'
    };
    
    const uniqueCourses = new Set();
    const advisors = new Map();
    const administrators = new Map();
    
    Object.values(scheduleData).forEach(course => {
        const courseKey = `${course.name}-${course.advisor}-${course.date}`;
        if (!uniqueCourses.has(courseKey)) {
            uniqueCourses.add(courseKey);
            stats.totalCourses++;
            
            const advisorCount = advisors.get(course.advisor) || 0;
            advisors.set(course.advisor, advisorCount + 1);
            
            const adminCount = administrators.get(course.administrator) || 0;
            administrators.set(course.administrator, adminCount + 1);
        }
        
        if (course.name.toUpperCase() === 'SICA') {
            stats.sicaHours += 0.5;
        }
    });
    
    if (advisors.size > 0) {
        const mostFrequentAdvisor = [...advisors.entries()].reduce((a, b) => a[1] > b[1] ? a : b);
        stats.mainAdvisor = mostFrequentAdvisor[0];
    }
    
    if (administrators.size > 0) {
        const mostFrequentAdmin = [...administrators.entries()].reduce((a, b) => a[1] > b[1] ? a : b);
        stats.mainAdministrator = mostFrequentAdmin[0];
    }
    
    return stats;
}

// Estados de carga para botones
function showLoadingState(buttonType) {
    const button = document.querySelector(`[onclick="${buttonType}()"]`);
    if (button) {
        button.classList.add('btn-loading');
        button.disabled = true;
    }
}

function hideLoadingState(buttonType) {
    const button = document.querySelector(`[onclick="${buttonType}()"]`);
    if (button) {
        button.classList.remove('btn-loading');
        button.disabled = false;
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Establecer fecha actual de CDMX
    document.getElementById('realizationDate').value = getCurrentDateCDMX();
    
    // Cargar asesores desde Firebase
    loadAsesores();
    
    // Inicializar componentes
    initializeTable();
    updateCounters();
    loadSavedData();
    updateColorPresets();
    
    // Event listener para cambios en el nombre del curso
    document.getElementById('courseName').addEventListener('input', handleCourseNameChange);
    
    // Event listener para cambio de asesor
    document.getElementById('advisorName').addEventListener('change', handleAdvisorChange);
    
    // Event listener para selector de color
    document.getElementById('courseColor').addEventListener('change', updateColorPresets);
    
    // Event listeners para colores predefinidos
    document.querySelectorAll('.color-preset').forEach(preset => {
        preset.addEventListener('click', function() {
            const color = this.dataset.color;
            document.getElementById('courseColor').value = color;
            updateColorPresets();
        });
    });
    
    // Event listener para el checkbox de guardar datos
    document.getElementById('saveData').addEventListener('change', function() {
        if (this.checked) {
            showSavedData();
        } else {
            document.getElementById('savedDataSection').style.display = 'none';
        }
    });
    
    // Prevenir menú contextual durante selección
    document.addEventListener('contextmenu', function(e) {
        if (e.target.classList.contains('schedule-cell') && isSelecting) {
            e.preventDefault();
        }
    });
    
    // Event listener para modal de Bootstrap
    document.getElementById('courseModal').addEventListener('hidden.bs.modal', function() {
        currentCourseId = null;
    });
    
    // Configurar página usando componentes SICA
    if (window.SICAComponents) {
        window.SICAComponents.setPageTitle("Armador de Horarios - SICA");
    }
});

// Atajos de teclado
document.addEventListener('keydown', function(e) {
    // ESC para limpiar selección y cerrar modal
    if (e.key === 'Escape') {
        clearSelection();
        if (courseModalInstance) {
            courseModalInstance.hide();
        }
    }
    
    // Ctrl+S para exportar PDF
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        generatePDF();
    }
    
    // Delete para eliminar curso seleccionado
    if (e.key === 'Delete' && currentCourseId) {
        deleteCourse();
    }
    
    // Ctrl+A para seleccionar todas las celdas vacías
    if (e.ctrlKey && e.key === 'a') {
        e.preventDefault();
        clearSelection();
        document.querySelectorAll('.schedule-cell:not(.occupied)').forEach(cell => {
            selectCell(cell);
        });
    }
    
    // Enter para agregar curso si se está en el formulario
    if (e.key === 'Enter' && e.target.closest('#courseForm')) {
        e.preventDefault();
        addCourse();
    }
});

// Prevenir zoom en móvil en inputs
document.addEventListener('touchstart', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
        e.target.style.fontSize = '16px';
    }
});

// Optimización para rendimiento en dispositivos móviles
if ('ontouchstart' in window) {
    // Deshabilitar hover effects en dispositivos táctiles
    document.body.classList.add('touch-device');
    
    // Añadir estilo para dispositivos táctiles
    const style = document.createElement('style');
    style.textContent = `
        .touch-device .schedule-cell:hover {
            transform: none;
            background: inherit;
        }
        .touch-device .course-item:hover {
            transform: none;
        }
        .touch-device .color-preset:hover {
            transform: none;
        }
    `;
    document.head.appendChild(style);
}

// Función de utilidad para debugging
function debugScheduleData() {
    console.log('Schedule Data:', scheduleData);
    console.log('Selected Cells:', selectedCells);
    console.log('Saved Data:', savedData);
}

// Exportar funciones para uso externo si es necesario
window.ScheduleBuilder = {
    addCourse,
    clearSelection,
    clearAllData,
    generatePDF,
    downloadImage,
    debugScheduleData
};