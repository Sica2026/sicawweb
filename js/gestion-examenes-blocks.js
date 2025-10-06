/**
 * GESTIÓN DE EXÁMENES DEPARTAMENTALES - BLOQUES
 * Manejo de bloques dinámicos de salas/profesores
 */

let blockCounter = 0;

/**
 * Agregar nuevo bloque de examen
 */
function addExamBlock(blockData = null) {
    blockCounter++;
    const blocksContainer = document.getElementById('blocksContainer');
    
    const blockId = `block-${blockCounter}`;
    const blockDiv = document.createElement('div');
    blockDiv.className = 'exam-block';
    blockDiv.id = blockId;
    
    blockDiv.innerHTML = `
        <div class="block-header">
            <div class="block-number">
                <i class="bi bi-building-fill"></i>
                <span>Sala / Profesor #${blockCounter}</span>
            </div>
            ${blockCounter > 1 ? '<button type="button" class="btn-remove-block" onclick="removeExamBlock(\'' + blockId + '\')"><i class="bi bi-trash"></i> Eliminar</button>' : ''}
        </div>

        <div class="row g-3">
            <!-- Profesor -->
            <div class="col-md-12">
                <label class="form-label-sica">
                    <i class="bi bi-person-badge"></i> Profesor
                </label>
                <div class="autocomplete-wrapper">
                    <input 
                        type="text" 
                        class="form-control form-control-sica profesor-input" 
                        id="profesor-${blockId}"
                        placeholder="Buscar profesor..."
                        autocomplete="off"
                        required
                        style="text-transform: uppercase;">
                    <div class="autocomplete-list" id="profesor-list-${blockId}"></div>
                </div>
            </div>

            <!-- Ubicaciones -->
            <div class="col-md-12">
                <label class="form-label-sica">
                    <i class="bi bi-geo-alt"></i> Ubicaciones
                </label>
                <div class="ubicaciones-grid" id="ubicaciones-${blockId}">
                    <div class="ubicacion-checkbox">
                        <input type="checkbox" id="sica1-${blockId}" value="SICA 1">
                        <label for="sica1-${blockId}">SICA 1</label>
                    </div>
                    <div class="ubicacion-checkbox">
                        <input type="checkbox" id="sica2-${blockId}" value="SICA 2">
                        <label for="sica2-${blockId}">SICA 2</label>
                    </div>
                    <div class="ubicacion-checkbox">
                        <input type="checkbox" id="sica3-${blockId}" value="SICA 3">
                        <label for="sica3-${blockId}">SICA 3</label>
                    </div>
                    <div class="ubicacion-checkbox">
                        <input type="checkbox" id="sica4-${blockId}" value="SICA 4">
                        <label for="sica4-${blockId}">SICA 4</label>
                    </div>
                    <div class="ubicacion-checkbox">
                        <input type="checkbox" id="salon1-${blockId}" value="Salón Inteligente 1">
                        <label for="salon1-${blockId}">Salón Inteligente 1</label>
                    </div>
                    <div class="ubicacion-checkbox">
                        <input type="checkbox" id="salon2-${blockId}" value="Salón Inteligente 2">
                        <label for="salon2-${blockId}">Salón Inteligente 2</label>
                    </div>
                </div>
            </div>

            <!-- Notas -->
            <div class="col-md-12">
                <label class="form-label-sica">
                    <i class="bi bi-sticky"></i> Notas
                </label>
                <textarea 
                    class="form-control form-control-sica" 
                    id="notas-${blockId}"
                    rows="3"
                    placeholder="Agregar notas o comentarios adicionales..."></textarea>
            </div>

            <!-- Archivo -->
            <div class="col-md-12">
                <label class="form-label-sica">
                    <i class="bi bi-paperclip"></i> Archivo (Excel o PDF)
                </label>
                <div class="file-upload-wrapper">
                    <label for="file-${blockId}" class="file-upload-label">
                        <i class="bi bi-cloud-upload"></i>
                        <span>Seleccionar archivo Excel o PDF</span>
                    </label>
                    <input 
                        type="file" 
                        class="file-upload-input" 
                        id="file-${blockId}"
                        accept=".xlsx,.xls,.pdf">
                    <div class="file-name-container" id="file-name-${blockId}"></div>
                </div>
            </div>
        </div>
    `;
    
    blocksContainer.appendChild(blockDiv);
    
    // Inicializar funcionalidad del bloque
    initializeBlockHandlers(blockId);
    
    // Si hay datos, rellenar el bloque
    if (blockData) {
        fillBlockData(blockId, blockData);
    }
}

/**
 * Inicializar manejadores de un bloque
 */
function initializeBlockHandlers(blockId) {
    // Autocompletado de profesor
    setupProfesorAutocomplete(blockId);
    
    // Manejo de checkboxes de ubicación
    setupUbicacionCheckboxes(blockId);
    
    // Manejo de archivo
    setupFileUpload(blockId);
}

/**
 * Autocompletado de profesor
 */
function setupProfesorAutocomplete(blockId) {
    const profesorInput = document.getElementById(`profesor-${blockId}`);
    const profesorList = document.getElementById(`profesor-list-${blockId}`);
    
    let selectedIndex = -1;

    profesorInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toUpperCase().trim();
        
        if (searchTerm.length < 2) {
            profesorList.classList.remove('show');
            return;
        }

        const filtered = appState.maestros.filter(maestro => 
            maestro.nombre.toUpperCase().includes(searchTerm)
        );

        if (filtered.length === 0) {
            profesorList.innerHTML = '<div class="autocomplete-item">No se encontraron profesores</div>';
            profesorList.classList.add('show');
            return;
        }

        profesorList.innerHTML = filtered.map((maestro, index) => `
            <div class="autocomplete-item" data-index="${index}" data-nombre="${maestro.nombre}">
                ${maestro.nombre}
            </div>
        `).join('');

        profesorList.classList.add('show');
        selectedIndex = -1;

        // Click en item
        profesorList.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', () => {
                const nombre = item.dataset.nombre;
                if (nombre) {
                    profesorInput.value = nombre;
                    profesorList.classList.remove('show');
                }
            });
        });
    });

    // Navegación con teclado
    profesorInput.addEventListener('keydown', (e) => {
        const items = profesorList.querySelectorAll('.autocomplete-item');
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
            updateSelection(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, 0);
            updateSelection(items);
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
            e.preventDefault();
            const nombre = items[selectedIndex].dataset.nombre;
            if (nombre) {
                profesorInput.value = nombre;
                profesorList.classList.remove('show');
            }
        } else if (e.key === 'Escape') {
            profesorList.classList.remove('show');
        }
    });

    function updateSelection(items) {
        items.forEach((item, index) => {
            item.classList.toggle('active', index === selectedIndex);
        });
        if (items[selectedIndex]) {
            items[selectedIndex].scrollIntoView({ block: 'nearest' });
        }
    }

    // Cerrar al hacer click fuera
    document.addEventListener('click', (e) => {
        if (!profesorInput.contains(e.target) && !profesorList.contains(e.target)) {
            profesorList.classList.remove('show');
        }
    });

    // Forzar mayúsculas
    profesorInput.addEventListener('blur', () => {
        profesorInput.value = profesorInput.value.toUpperCase();
    });
}

/**
 * Setup de checkboxes de ubicación
 */
function setupUbicacionCheckboxes(blockId) {
    const ubicacionesGrid = document.getElementById(`ubicaciones-${blockId}`);
    const checkboxWrappers = ubicacionesGrid.querySelectorAll('.ubicacion-checkbox');
    
    checkboxWrappers.forEach(wrapper => {
        const checkbox = wrapper.querySelector('input[type="checkbox"]');
        
        // Toggle al hacer click en el wrapper
        wrapper.addEventListener('click', (e) => {
            if (e.target !== checkbox) {
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change'));
            }
        });
        
        // Actualizar estilos al cambiar
        checkbox.addEventListener('change', () => {
            wrapper.classList.toggle('checked', checkbox.checked);
        });
    });
}

/**
 * Setup de subida de archivo
 */
function setupFileUpload(blockId) {
    const fileInput = document.getElementById(`file-${blockId}`);
    const fileNameContainer = document.getElementById(`file-name-${blockId}`);
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        
        if (!file) {
            fileNameContainer.innerHTML = '';
            return;
        }

        // Validar tipo de archivo
        const validTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.ms-excel', // .xls
            'application/pdf'
        ];

        if (!validTypes.includes(file.type)) {
            showNotification(
                'Archivo No Válido',
                'Solo se permiten archivos Excel (.xlsx, .xls) o PDF',
                'error',
                'bi-exclamation-triangle-fill'
            );
            fileInput.value = '';
            return;
        }

        // Validar tamaño (máximo 10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            showNotification(
                'Archivo Muy Grande',
                'El archivo no debe superar los 10MB',
                'error',
                'bi-exclamation-triangle-fill'
            );
            fileInput.value = '';
            return;
        }

        // Mostrar nombre del archivo
        fileNameContainer.innerHTML = `
            <div class="file-name">
                <span><i class="bi bi-file-earmark"></i> ${file.name}</span>
                <button type="button" class="btn-remove-file" onclick="removeFile('${blockId}')">
                    <i class="bi bi-x-circle-fill"></i>
                </button>
            </div>
        `;
    });
}

/**
 * Remover archivo
 */
function removeFile(blockId) {
    const fileInput = document.getElementById(`file-${blockId}`);
    const fileNameContainer = document.getElementById(`file-name-${blockId}`);
    
    fileInput.value = '';
    fileNameContainer.innerHTML = '';
}

/**
 * Remover bloque de examen
 */
function removeExamBlock(blockId) {
    const block = document.getElementById(blockId);
    if (!block) return;
    
    // Animación de salida
    block.style.animation = 'slideOut 0.3s ease';
    
    setTimeout(() => {
        block.remove();
        
        // Renumerar bloques
        renumberBlocks();
    }, 300);
}

/**
 * Renumerar bloques
 */
function renumberBlocks() {
    const blocks = document.querySelectorAll('.exam-block');
    blocks.forEach((block, index) => {
        const numberSpan = block.querySelector('.block-number span');
        if (numberSpan) {
            numberSpan.textContent = `Sala / Profesor #${index + 1}`;
        }
    });
}

/**
 * Obtener datos de todos los bloques
 */
function getBlocksData() {
    const blocks = document.querySelectorAll('.exam-block');
    const blocksData = [];
    
    blocks.forEach(block => {
        const blockId = block.id;
        
        const profesor = document.getElementById(`profesor-${blockId}`).value.trim().toUpperCase();
        const notas = document.getElementById(`notas-${blockId}`).value.trim();
        const fileInput = document.getElementById(`file-${blockId}`);
        
        // Obtener ubicaciones seleccionadas
        const ubicacionesGrid = document.getElementById(`ubicaciones-${blockId}`);
        const ubicaciones = Array.from(ubicacionesGrid.querySelectorAll('input[type="checkbox"]:checked'))
            .map(checkbox => checkbox.value);
        
        if (!profesor) {
            throw new Error('Todos los bloques deben tener un profesor asignado');
        }
        
        if (ubicaciones.length === 0) {
            throw new Error('Todos los bloques deben tener al menos una ubicación seleccionada');
        }
        
        blocksData.push({
            profesor,
            ubicaciones,
            notas,
            file: fileInput.files[0] || null
        });
    });
    
    return blocksData;
}

/**
 * Llenar datos en un bloque
 */
function fillBlockData(blockId, blockData) {
    // Llenar profesor
    const profesorInput = document.getElementById(`profesor-${blockId}`);
    if (profesorInput && blockData.profesor) {
        profesorInput.value = blockData.profesor;
    }
    
    // Llenar ubicaciones
    if (blockData.ubicaciones && blockData.ubicaciones.length > 0) {
        const ubicacionesGrid = document.getElementById(`ubicaciones-${blockId}`);
        blockData.ubicaciones.forEach(ubicacion => {
            const checkboxes = ubicacionesGrid.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                if (checkbox.value === ubicacion) {
                    checkbox.checked = true;
                    checkbox.parentElement.classList.add('checked');
                }
            });
        });
    }
    
    // Llenar notas
    const notasInput = document.getElementById(`notas-${blockId}`);
    if (notasInput && blockData.notas) {
        notasInput.value = blockData.notas;
    }
    
    // Si hay URL de archivo, mostrarla
    if (blockData.archivoUrl) {
        const fileNameContainer = document.getElementById(`file-name-${blockId}`);
        const fileName = blockData.archivoNombre || 'Archivo adjunto';
        fileNameContainer.innerHTML = `
            <div class="file-name">
                <span><i class="bi bi-file-earmark"></i> ${fileName}</span>
                <a href="${blockData.archivoUrl}" target="_blank" class="btn-remove-file" style="color: var(--exam-gold);">
                    <i class="bi bi-download"></i>
                </a>
            </div>
        `;
    }
}

// Animación CSS para salida
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(-30px);
        }
    }
`;
document.head.appendChild(style);

// Exponer funciones globales
window.addExamBlock = addExamBlock;
window.removeExamBlock = removeExamBlock;
window.removeFile = removeFile;
window.getBlocksData = getBlocksData;
window.fillBlockData = fillBlockData;