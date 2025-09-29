/**
 * Gestión de Materias - Procesamiento de Excel
 * Manejo de archivos Excel para carga masiva de materias
 */

// Variables globales para Excel
let excelData = null;
let processedData = null;

/**
 * Procesar archivo Excel seleccionado
 */
async function processExcelFile() {
    const processBtn = document.getElementById('process-excel');
    const uploadProgress = document.getElementById('upload-progress');
    const uploadContent = document.querySelector('.upload-content');
    const originalBtnText = processBtn.innerHTML;

    try {
        if (!window.selectedExcelFile) {
            throw new Error('No hay archivo seleccionado');
        }

        // Mostrar loading en botón
        processBtn.disabled = true;
        processBtn.innerHTML = `
            <div class="spinner-border spinner-border-sm me-2" role="status">
                <span class="visually-hidden">Procesando...</span>
            </div>
            Procesando...
        `;

        // Mostrar barra de progreso
        uploadContent.style.display = 'none';
        uploadProgress.style.display = 'block';
        
        // Actualizar progreso: Leyendo archivo
        updateProgress(20, 'Leyendo archivo Excel...');

        // Leer archivo Excel
        const fileData = await readExcelFile(window.selectedExcelFile);
        
        // Actualizar progreso: Validando datos
        updateProgress(40, 'Validando estructura del archivo...');

        // Validar estructura del archivo
        const validatedData = validateExcelData(fileData);
        
        // Actualizar progreso: Procesando materias
        updateProgress(60, 'Procesando materias...');

        // Procesar materias en Firebase
        const results = await processMasiveMaterias(validatedData);
        
        // Actualizar progreso: Finalizando
        updateProgress(100, 'Procesamiento completado');

        // Mostrar resultados
        showProcessResults(results);
        
        // Actualizar estadísticas
        await loadMateriasStats();
        
        // Resetear formulario después de un tiempo
        setTimeout(() => {
            resetUploadZone();
            hideSection('excel-section');
        }, 3000);

    } catch (error) {
        console.error('Error procesando archivo Excel:', error);
        showErrorMessage(error.message);
        
        // Resetear UI en caso de error
        uploadContent.style.display = 'block';
        uploadProgress.style.display = 'none';
        
    } finally {
        // Restaurar botón
        processBtn.disabled = false;
        processBtn.innerHTML = originalBtnText;
    }
}

/**
 * Leer archivo Excel usando SheetJS
 */
async function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                // Obtener la primera hoja
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                
                // Convertir a JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                    header: ['clave', 'nombre'],
                    range: 1, // Empezar desde la fila 2 (índice 1)
                    defval: '' // Valor por defecto para celdas vacías
                });
                
                console.log('Archivo Excel leído correctamente:', jsonData.length, 'filas');
                resolve(jsonData);
                
            } catch (error) {
                console.error('Error leyendo archivo Excel:', error);
                reject(new Error('Error leyendo el archivo Excel. Verifica el formato.'));
            }
        };
        
        reader.onerror = function() {
            reject(new Error('Error leyendo el archivo'));
        };
        
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Validar datos del Excel
 */
function validateExcelData(data) {
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error('El archivo está vacío o no tiene el formato correcto');
    }

    const validatedData = [];
    const errors = [];

    data.forEach((row, index) => {
        const rowNumber = index + 2; // +2 porque empezamos desde la fila 2
        
        try {
            // Extraer y limpiar datos
            let clave = (row.clave || '').toString().trim().toUpperCase();
            let nombre = (row.nombre || '').toString().trim().toUpperCase();
            
            // Validaciones básicas
            if (!clave && !nombre) {
                // Fila vacía, omitir
                return;
            }
            
            if (!clave) {
                throw new Error('Clave requerida');
            }
            
            if (!nombre) {
                throw new Error('Nombre requerido');
            }
            
            // Validar longitud
            if (clave.length < 1) {
                throw new Error('Clave requerida');
            }
            
            if (clave.length > 10) {
                throw new Error('Clave muy larga (máximo 10 caracteres)');
            }
            
            if (nombre.length < 5) {
                throw new Error('Nombre muy corto (mínimo 5 caracteres)');
            }
            
            if (nombre.length > 100) {
                throw new Error('Nombre muy largo (máximo 100 caracteres)');
            }
            
            // Validar caracteres permitidos en clave
            if (!/^[A-Z0-9\-_]+$/.test(clave)) {
                throw new Error('Clave contiene caracteres no válidos');
            }
            
            validatedData.push({
                clave: clave,
                nombre: nombre,
                row: rowNumber
            });
            
        } catch (error) {
            errors.push({
                row: rowNumber,
                clave: row.clave || 'N/A',
                nombre: row.nombre || 'N/A',
                error: error.message
            });
        }
    });

    // Si hay errores críticos, mostrar detalles
    if (errors.length > 0) {
        console.warn('Errores encontrados en el archivo:', errors);
        
        // Si hay demasiados errores, detener el proceso
        if (errors.length > validatedData.length) {
            let errorMessage = `Se encontraron ${errors.length} errores en el archivo:\n\n`;
            errors.slice(0, 5).forEach(error => {
                errorMessage += `Fila ${error.row}: ${error.error}\n`;
            });
            
            if (errors.length > 5) {
                errorMessage += `... y ${errors.length - 5} errores más`;
            }
            
            throw new Error(errorMessage);
        }
    }

    if (validatedData.length === 0) {
        throw new Error('No se encontraron datos válidos en el archivo');
    }

    console.log(`Validación completada: ${validatedData.length} materias válidas, ${errors.length} errores`);
    return validatedData;
}

/**
 * Actualizar barra de progreso
 */
function updateProgress(percentage, message) {
    const progressBar = document.querySelector('#upload-progress .progress-bar');
    const progressText = document.querySelector('#upload-progress .progress-text');
    
    if (progressBar) {
        progressBar.style.width = percentage + '%';
        progressBar.setAttribute('aria-valuenow', percentage);
    }
    
    if (progressText) {
        progressText.textContent = message;
    }
}

/**
 * Mostrar resultados del procesamiento
 */
function showProcessResults(results) {
    const { success, updated, errors, details } = results;
    
    let message = '';
    let type = 'success';
    
    if (errors === 0) {
        message = `✅ Procesamiento exitoso: ${success} materias creadas, ${updated} materias actualizadas`;
        type = 'success';
    } else if (success + updated > 0) {
        message = `⚠️ Procesamiento parcial: ${success} creadas, ${updated} actualizadas, ${errors} errores`;
        type = 'warning';
    } else {
        message = `❌ Error en procesamiento: ${errors} errores encontrados`;
        type = 'error';
    }
    
    // Mostrar notificación principal
    if (typeof SICAComponents !== 'undefined') {
        SICAComponents.notify(
            'Procesamiento Completado',
            message,
            type,
            type === 'success' ? 'bi-check-circle' : 
            type === 'warning' ? 'bi-exclamation-triangle' : 'bi-x-circle'
        );
    }
    
    // Mostrar detalles si hay errores
    if (errors > 0 && details) {
        setTimeout(() => {
            showDetailedResults(details);
        }, 2000);
    }
    
    console.log('Resultados del procesamiento:', results);
}

/**
 * Mostrar resultados detallados en modal
 */
function showDetailedResults(details) {
    // Crear modal de resultados
    const modalHtml = `
        <div class="modal fade" id="resultsModal" tabindex="-1" aria-labelledby="resultsModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg modal-dialog-scrollable">
                <div class="modal-content modal-sica">
                    <div class="modal-header">
                        <h5 class="modal-title" id="resultsModalLabel">
                            <i class="bi bi-list-check me-2"></i>
                            Detalles del Procesamiento
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="table-responsive">
                            <table class="table table-sm">
                                <thead>
                                    <tr>
                                        <th>Fila</th>
                                        <th>Clave</th>
                                        <th>Estado</th>
                                        <th>Observaciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${details.map(detail => {
                                        let statusIcon, statusClass, statusText;
                                        
                                        switch (detail.status) {
                                            case 'creada':
                                                statusIcon = 'bi-plus-circle-fill';
                                                statusClass = 'text-success';
                                                statusText = 'Creada';
                                                break;
                                            case 'actualizada':
                                                statusIcon = 'bi-arrow-repeat';
                                                statusClass = 'text-info';
                                                statusText = 'Actualizada';
                                                break;
                                            case 'error':
                                                statusIcon = 'bi-x-circle-fill';
                                                statusClass = 'text-danger';
                                                statusText = 'Error';
                                                break;
                                            default:
                                                statusIcon = 'bi-question-circle';
                                                statusClass = 'text-muted';
                                                statusText = 'Desconocido';
                                        }
                                        
                                        return `
                                            <tr>
                                                <td>${detail.row}</td>
                                                <td class="fw-bold">${detail.clave}</td>
                                                <td class="${statusClass}">
                                                    <i class="bi ${statusIcon} me-1"></i>
                                                    ${statusText}
                                                </td>
                                                <td class="text-muted small">
                                                    ${detail.error || 'Procesado correctamente'}
                                                </td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Agregar modal al DOM
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('resultsModal'));
    modal.show();
    
    // Remover modal del DOM cuando se cierre
    document.getElementById('resultsModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

/**
 * Validar formato de archivo Excel
 */
function validateExcelFile(file) {
    // Validar extensión
    const validExtensions = ['.xlsx', '.xls'];
    const fileName = file.name.toLowerCase();
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
    
    if (!hasValidExtension) {
        throw new Error('Formato de archivo no válido. Solo se permiten archivos .xlsx y .xls');
    }
    
    // Validar tipo MIME
    const validMimeTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
    ];
    
    if (!validMimeTypes.includes(file.type)) {
        throw new Error('Tipo de archivo no válido');
    }
    
    // Validar tamaño (máximo 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        throw new Error('Archivo demasiado grande. Máximo 10MB permitidos');
    }
    
    return true;
}

/**
 * Generar plantilla de Excel para descarga
 */
function generateExcelTemplate() {
    try {
        // Crear datos de ejemplo
        const templateData = [
            ['Clave', 'Nombre'],
            ['MAT001', 'MATEMÁTICAS BÁSICAS'],
            ['FIS001', 'FÍSICA GENERAL'],
            ['QUI001', 'QUÍMICA ORGÁNICA'],
            ['', '']  // Fila vacía para que el usuario vea el formato
        ];
        
        // Crear libro de trabajo
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(templateData);
        
        // Configurar anchos de columna
        ws['!cols'] = [
            { width: 15 }, // Columna A - Clave
            { width: 40 }  // Columna B - Nombre
        ];
        
        // Agregar hoja al libro
        XLSX.utils.book_append_sheet(wb, ws, 'Materias');
        
        // Generar archivo y descargar
        XLSX.writeFile(wb, 'plantilla_materias.xlsx');
        
        // Mostrar mensaje informativo
        showInfoMessage(
            'Plantilla Descargada',
            'Se ha descargado la plantilla de Excel. Úsala como referencia para el formato correcto.'
        );
        
    } catch (error) {
        console.error('Error generando plantilla:', error);
        showErrorMessage('Error generando la plantilla de Excel');
    }
}

/**
 * Exportar materias existentes a Excel
 */
async function exportMateriasToExcel() {
    try {
        // Mostrar loading
        showInfoMessage('Exportando', 'Generando archivo Excel...');
        
        // Obtener materias
        const materias = await getAllMaterias();
        
        if (materias.length === 0) {
            throw new Error('No hay materias para exportar');
        }
        
        // Preparar datos para Excel
        const excelData = [
            ['Clave', 'Nombre', 'Fecha Creación']
        ];
        
        materias.forEach(materia => {
            const fechaCreacion = materia.fechaCreacion ? 
                materia.fechaCreacion.toDate().toLocaleDateString('es-MX') : 
                'N/A';
                
            excelData.push([
                materia.clave,
                materia.nombre,
                fechaCreacion
            ]);
        });
        
        // Crear libro de trabajo
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(excelData);
        
        // Configurar anchos de columna
        ws['!cols'] = [
            { width: 15 }, // Clave
            { width: 50 }, // Nombre
            { width: 15 }  // Fecha
        ];
        
        // Agregar hoja al libro
        XLSX.utils.book_append_sheet(wb, ws, 'Materias');
        
        // Generar nombre de archivo con fecha
        const fecha = new Date().toISOString().split('T')[0];
        const fileName = `materias_${fecha}.xlsx`;
        
        // Descargar archivo
        XLSX.writeFile(wb, fileName);
        
        // Mostrar mensaje de éxito
        showSuccessMessage(`Materias exportadas correctamente (${materias.length} registros)`);
        
    } catch (error) {
        console.error('Error exportando materias:', error);
        showErrorMessage('Error exportando materias: ' + error.message);
    }
}

/**
 * Agregar botón de plantilla a la UI
 */
function addTemplateButton() {
    const uploadActions = document.querySelector('#excel-section .upload-actions');
    if (uploadActions && !document.getElementById('template-btn')) {
        const templateBtn = document.createElement('button');
        templateBtn.id = 'template-btn';
        templateBtn.type = 'button';
        templateBtn.className = 'btn btn-outline-primary';
        templateBtn.innerHTML = '<i class="bi bi-download me-2"></i>Descargar Plantilla';
        templateBtn.addEventListener('click', generateExcelTemplate);
        
        // Insertar antes del botón de volver
        uploadActions.insertBefore(templateBtn, uploadActions.firstChild);
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    // Verificar si SheetJS está disponible
    if (typeof XLSX === 'undefined') {
        console.error('SheetJS no está cargado');
        return;
    }
    
    console.log('Módulo de Excel inicializado correctamente');
    
    // Agregar botón de plantilla cuando se cargue la sección
    setTimeout(addTemplateButton, 1000);
});

/**
 * Exportar funciones globales
 */
window.processExcelFile = processExcelFile;
window.generateExcelTemplate = generateExcelTemplate;
window.exportMateriasToExcel = exportMateriasToExcel;