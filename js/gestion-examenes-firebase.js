/**
 * GESTIÓN DE EXÁMENES DEPARTAMENTALES - FIREBASE
 * Operaciones CRUD y manejo de Storage
 */

/**
 * Manejar submit del formulario
 */
async function handleFormSubmit(e) {
    e.preventDefault();
    
    try {
        // Validar formulario
        const formData = await validateAndCollectFormData();
        
        // Verificar duplicados
        const isDuplicate = await checkDuplicateExam(formData);
        if (isDuplicate) {
            showNotification(
                'Examen Duplicado',
                'Ya existe un examen con este horario y profesores',
                'warning',
                'bi-exclamation-triangle-fill'
            );
            return;
        }
        
        // Mostrar loading
        const submitBtn = document.getElementById('btnSaveExam');
        submitBtn.classList.add('btn-loading');
        submitBtn.disabled = true;
        
        // Subir archivos y guardar examen
        if (appState.currentEditId) {
            await updateExamen(appState.currentEditId, formData);
        } else {
            await saveNewExamen(formData);
        }
        
        // Recargar lista
        await loadExamenes();
        
        // Reset formulario
        resetForm();
        
        // Quitar loading
        submitBtn.classList.remove('btn-loading');
        submitBtn.disabled = false;
        
        showNotification(
            '¡Éxito!',
            appState.currentEditId ? 'Examen actualizado correctamente' : 'Examen guardado correctamente',
            'success',
            'bi-check-circle-fill'
        );
        
    } catch (error) {
        console.error('Error al guardar examen:', error);
        
        const submitBtn = document.getElementById('btnSaveExam');
        submitBtn.classList.remove('btn-loading');
        submitBtn.disabled = false;
        
        showNotification(
            'Error',
            error.message || 'No se pudo guardar el examen',
            'error',
            'bi-exclamation-triangle-fill'
        );
    }
}

/**
 * Validar y recolectar datos del formulario
 */
async function validateAndCollectFormData() {
    // Validar curso
    if (!appState.selectedCurso) {
        throw new Error('Debe seleccionar un curso válido');
    }
    
    // Obtener datos básicos
    const curso = document.getElementById('cursoInput').value.trim();
    const clave = document.getElementById('claveInput').value.trim();
    const fechaExamen = document.getElementById('fechaExamen').value;
    const horaInicio = document.getElementById('horaInicio').value;
    const horaFinal = document.getElementById('horaFinal').value;
    
    // Validar fecha
    if (!fechaExamen) {
        throw new Error('Debe seleccionar una fecha para el examen');
    }
    
    // Validar que sea viernes
    const fecha = new Date(fechaExamen + 'T00:00:00');
    if (fecha.getDay() !== 5) {
        throw new Error('Los exámenes departamentales solo pueden ser los viernes');
    }
    
    // Validar horario
    const horarioValidation = validateHorario(horaInicio, horaFinal);
    if (!horarioValidation.valid) {
        throw new Error(horarioValidation.message);
    }
    
    // Obtener bloques
    const blocksData = getBlocksData();
    
    if (blocksData.length === 0) {
        throw new Error('Debe agregar al menos una sala/profesor');
    }
    
    // Procesar bloques (subir archivos)
    const processedBlocks = await processBlocks(blocksData);
    
    return {
        curso,
        clave,
        fechaExamen,
        horaInicio,
        horaFinal,
        bloques: processedBlocks,
        materiaId: appState.selectedCurso.id,
        fechaCreacion: appState.currentEditId ? undefined : firebase.firestore.FieldValue.serverTimestamp(),
        fechaModificacion: firebase.firestore.FieldValue.serverTimestamp()
    };
}

/**
 * Procesar bloques (subir archivos a Storage)
 */
async function processBlocks(blocksData) {
    const processedBlocks = [];
    
    for (const block of blocksData) {
        const processedBlock = {
            profesor: block.profesor,
            ubicaciones: block.ubicaciones,
            notas: block.notas
        };
        
        // Si hay archivo, subirlo
        if (block.file) {
            const fileData = await uploadFile(block.file);
            processedBlock.archivoUrl = fileData.url;
            processedBlock.archivoNombre = fileData.nombre;
            processedBlock.archivoPath = fileData.path;
        }
        
        processedBlocks.push(processedBlock);
    }
    
    return processedBlocks;
}

/**
 * Subir archivo a Firebase Storage
 */
async function uploadFile(file) {
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    const path = `examenes/${fileName}`;
    
    const storageRef = storage.ref(path);
    
    try {
        // Subir archivo
        const snapshot = await storageRef.put(file);
        
        // Obtener URL de descarga
        const downloadUrl = await snapshot.ref.getDownloadURL();
        
        return {
            url: downloadUrl,
            nombre: file.name,
            path: path
        };
    } catch (error) {
        console.error('Error al subir archivo:', error);
        throw new Error('No se pudo subir el archivo: ' + file.name);
    }
}

/**
 * Verificar si existe un examen duplicado
 */
async function checkDuplicateExam(formData) {
    try {
        // Buscar exámenes con misma fecha, horario y curso
        const snapshot = await db.collection('departamentales')
            .where('fechaExamen', '==', formData.fechaExamen)
            .where('curso', '==', formData.curso)
            .where('horaInicio', '==', formData.horaInicio)
            .where('horaFinal', '==', formData.horaFinal)
            .get();
        
        // Si estamos editando, excluir el examen actual
        const existingExams = snapshot.docs.filter(doc => 
            appState.currentEditId ? doc.id !== appState.currentEditId : true
        );
        
        if (existingExams.length === 0) {
            return false;
        }
        
        // Verificar si hay profesores duplicados
        const newProfessors = formData.bloques.map(b => b.profesor);
        
        for (const examDoc of existingExams) {
            const examData = examDoc.data();
            const existingProfessors = examData.bloques.map(b => b.profesor);
            
            // Verificar si hay algún profesor en común
            const hasCommonProfessor = newProfessors.some(prof => 
                existingProfessors.includes(prof)
            );
            
            if (hasCommonProfessor) {
                return true;
            }
        }
        
        return false;
        
    } catch (error) {
        console.error('Error al verificar duplicados:', error);
        return false;
    }
}

/**
 * Guardar nuevo examen
 */
async function saveNewExamen(formData) {
    try {
        await db.collection('departamentales').add(formData);
    } catch (error) {
        console.error('Error al guardar examen:', error);
        throw new Error('No se pudo guardar el examen en la base de datos');
    }
}

/**
 * Actualizar examen existente
 */
async function updateExamen(examId, formData) {
    try {
        // Obtener examen actual para eliminar archivos antiguos si es necesario
        const examDoc = await db.collection('departamentales').doc(examId).get();
        const oldData = examDoc.data();
        
        // Eliminar archivos antiguos que ya no están
        if (oldData && oldData.bloques) {
            for (const oldBlock of oldData.bloques) {
                if (oldBlock.archivoPath) {
                    // Verificar si el archivo sigue en los nuevos bloques
                    const stillExists = formData.bloques.some(b => 
                        b.archivoPath === oldBlock.archivoPath
                    );
                    
                    if (!stillExists) {
                        await deleteFile(oldBlock.archivoPath);
                    }
                }
            }
        }
        
        // Actualizar documento
        await db.collection('departamentales').doc(examId).update(formData);
        
    } catch (error) {
        console.error('Error al actualizar examen:', error);
        throw new Error('No se pudo actualizar el examen');
    }
}

/**
 * Eliminar archivo de Storage
 */
async function deleteFile(path) {
    try {
        const fileRef = storage.ref(path);
        await fileRef.delete();
    } catch (error) {
        console.error('Error al eliminar archivo:', error);
        // No lanzar error, ya que el archivo podría no existir
    }
}

/**
 * Renderizar lista de exámenes
 */
function renderExamenesList(examenes = null) {
    const examsList = document.getElementById('examsList');
    const examenesData = examenes || appState.examenes;
    
    if (examenesData.length === 0) {
        examsList.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                <i class="bi bi-inbox" style="font-size: 4rem; color: var(--exam-gold);"></i>
                <p style="margin-top: 1rem; font-size: 1.1rem;">No hay exámenes registrados</p>
            </div>
        `;
        return;
    }
    
    examsList.innerHTML = examenesData.map(examen => {
        // Formatear fecha
        const fechaFormateada = examen.fechaExamen ? 
            new Date(examen.fechaExamen + 'T00:00:00').toLocaleDateString('es-MX', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            }) : 'Fecha no especificada';
        
        return `
            <div class="exam-item">
                <div class="exam-item-header">
                    <div>
                        <h4 class="exam-item-title">${examen.curso}</h4>
                        <span class="exam-item-clave">Clave: ${examen.clave}</span>
                    </div>
                    <div class="exam-item-actions">
                        <button class="btn-edit-exam" onclick="editExamen('${examen.id}')" title="Editar">
                            <i class="bi bi-pencil-fill"></i>
                        </button>
                        <button class="btn-delete-exam" onclick="deleteExamen('${examen.id}')" title="Eliminar">
                            <i class="bi bi-trash-fill"></i>
                        </button>
                    </div>
                </div>
                
                <div class="exam-item-info">
                    <div class="info-badge">
                        <i class="bi bi-calendar-event"></i>
                        <span>${fechaFormateada}</span>
                    </div>
                    <div class="info-badge">
                        <i class="bi bi-clock"></i>
                        <span>${examen.horaInicio} - ${examen.horaFinal}</span>
                    </div>
                    <div class="info-badge">
                        <i class="bi bi-people"></i>
                        <span>${examen.bloques.length} ${examen.bloques.length === 1 ? 'sala' : 'salas'}</span>
                    </div>
                </div>
                
                <div class="exam-blocks-preview">
                    ${examen.bloques.map((bloque, index) => `
                        <div class="block-preview">
                            <strong>Sala ${index + 1}:</strong> ${bloque.profesor}<br>
                            <small style="color: var(--exam-gold);">
                                ${bloque.ubicaciones.join(', ')}
                            </small>
                            ${bloque.notas ? `<br><small>${bloque.notas}</small>` : ''}
                            ${bloque.archivoUrl ? `<br><a href="${bloque.archivoUrl}" target="_blank" style="color: var(--exam-gold);"><i class="bi bi-paperclip"></i> ${bloque.archivoNombre}</a>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Editar examen
 */
async function editExamen(examId) {
    try {
        const examDoc = await db.collection('departamentales').doc(examId).get();
        
        if (!examDoc.exists) {
            showNotification(
                'Error',
                'El examen no existe',
                'error',
                'bi-exclamation-triangle-fill'
            );
            return;
        }
        
        const examData = examDoc.data();
        
        // Cambiar a modo agregar
        document.getElementById('btnModeAdd').click();
        
        // Llenar formulario
        appState.currentEditId = examId;
        
        // Buscar y seleccionar la materia
        const materia = appState.materias.find(m => m.id === examData.materiaId);
        if (materia) {
            appState.selectedCurso = materia;
            document.getElementById('cursoInput').value = examData.curso;
            document.getElementById('claveInput').value = examData.clave;
        }
        
        document.getElementById('fechaExamen').value = examData.fechaExamen || '';
        document.getElementById('horaInicio').value = examData.horaInicio;
        document.getElementById('horaFinal').value = examData.horaFinal;
        
        // Limpiar bloques existentes
        document.getElementById('blocksContainer').innerHTML = '';
        blockCounter = 0;
        
        // Agregar bloques con datos
        examData.bloques.forEach(bloque => {
            addExamBlock(bloque);
        });
        
        // Scroll al inicio
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        showNotification(
            'Modo Edición',
            'Modifica los datos y guarda los cambios',
            'info',
            'bi-pencil-fill'
        );
        
    } catch (error) {
        console.error('Error al cargar examen:', error);
        showNotification(
            'Error',
            'No se pudo cargar el examen',
            'error',
            'bi-exclamation-triangle-fill'
        );
    }
}

/**
 * Eliminar examen
 */
async function deleteExamen(examId) {
    const confirmacion = confirm('¿Estás seguro de eliminar este examen? Esta acción no se puede deshacer.');
    
    if (!confirmacion) return;
    
    try {
        // Obtener datos del examen
        const examDoc = await db.collection('departamentales').doc(examId).get();
        const examData = examDoc.data();
        
        // Eliminar archivos asociados
        if (examData && examData.bloques) {
            for (const bloque of examData.bloques) {
                if (bloque.archivoPath) {
                    await deleteFile(bloque.archivoPath);
                }
            }
        }
        
        // Eliminar documento
        await db.collection('departamentales').doc(examId).delete();
        
        // Recargar lista
        await loadExamenes();
        
        showNotification(
            'Eliminado',
            'El examen ha sido eliminado correctamente',
            'success',
            'bi-trash-fill'
        );
        
    } catch (error) {
        console.error('Error al eliminar examen:', error);
        showNotification(
            'Error',
            'No se pudo eliminar el examen',
            'error',
            'bi-exclamation-triangle-fill'
        );
    }
}

// Exponer funciones globales
window.handleFormSubmit = handleFormSubmit;
window.renderExamenesList = renderExamenesList;
window.editExamen = editExamen;
window.deleteExamen = deleteExamen;