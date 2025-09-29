/**
 * Gestión de Materias - Manejo de Datos
 * Operaciones CRUD para materias en Firebase Firestore
 */

// Referencias de Firebase - Nombres únicos para evitar conflictos
let gestionMateriasDB;
let gestionMateriasCollection;

/**
 * Inicializar conexión a Firebase
 */
function initializeFirestore() {
    try {
        gestionMateriasDB = firebase.firestore();
        gestionMateriasCollection = gestionMateriasDB.collection('materias');
        console.log('Firestore inicializado correctamente');
        return true;
    } catch (error) {
        console.error('Error inicializando Firestore:', error);
        return false;
    }
}

/**
 * Agregar nueva materia
 */
async function addMateria(clave, nombre) {
    try {
        if (!gestionMateriasDB) initializeFirestore();

        // Verificar si la clave ya existe
        const existingMateria = await gestionMateriasCollection
            .where('clave', '==', clave)
            .get();

        if (!existingMateria.empty) {
            throw new Error('Ya existe una materia con esa clave');
        }

        // Crear nueva materia
        const nuevaMateria = {
            clave: clave.toUpperCase(),
            nombre: nombre.toUpperCase(),
            fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
            fechaModificacion: firebase.firestore.FieldValue.serverTimestamp(),
            creadoPor: firebase.auth().currentUser.uid,
            activa: true
        };

        // Agregar a Firestore
        const docRef = await gestionMateriasCollection.add(nuevaMateria);
        
        console.log('Materia agregada con ID:', docRef.id);
        return docRef.id;

    } catch (error) {
        console.error('Error agregando materia:', error);
        throw error;
    }
}

/**
 * Actualizar materia existente
 */
async function updateMateria(materiaId, clave, nombre) {
    try {
        if (!gestionMateriasDB) initializeFirestore();

        // Obtener materia actual
        const materiaDoc = await gestionMateriasCollection.doc(materiaId).get();
        
        if (!materiaDoc.exists) {
            throw new Error('La materia no existe');
        }

        const materiaActual = materiaDoc.data();

        // Verificar si la nueva clave ya existe (solo si cambió)
        if (materiaActual.clave !== clave.toUpperCase()) {
            const existingMateria = await gestionMateriasCollection
                .where('clave', '==', clave.toUpperCase())
                .get();

            if (!existingMateria.empty) {
                throw new Error('Ya existe una materia con esa clave');
            }
        }

        // Actualizar materia
        const datosActualizados = {
            clave: clave.toUpperCase(),
            nombre: nombre.toUpperCase(),
            fechaModificacion: firebase.firestore.FieldValue.serverTimestamp(),
            modificadoPor: firebase.auth().currentUser.uid
        };

        await gestionMateriasCollection.doc(materiaId).update(datosActualizados);
        
        console.log('Materia actualizada:', materiaId);
        return true;

    } catch (error) {
        console.error('Error actualizando materia:', error);
        throw error;
    }
}

/**
 * Eliminar materia
 */
async function deleteMateria(materiaId) {
    try {
        if (!gestionMateriasDB) initializeFirestore();

        // Verificar si la materia existe
        const materiaDoc = await gestionMateriasCollection.doc(materiaId).get();
        
        if (!materiaDoc.exists) {
            throw new Error('La materia no existe');
        }

        // Verificar si la materia está siendo utilizada
        const isUsed = await checkMateriaUsage(materiaId);
        
        if (isUsed) {
            throw new Error('No se puede eliminar la materia porque está siendo utilizada');
        }

        // Eliminar materia
        await gestionMateriasCollection.doc(materiaId).delete();
        
        console.log('Materia eliminada:', materiaId);
        return true;

    } catch (error) {
        console.error('Error eliminando materia:', error);
        throw error;
    }
}

/**
 * Verificar si una materia está siendo utilizada
 */
async function checkMateriaUsage(materiaId) {
    // No hay otras colecciones que verifiquen el uso de materias
    // Siempre permitir eliminación
    return false;
}

/**
 * Obtener todas las materias
 */
async function getAllMaterias() {
    try {
        if (!gestionMateriasDB) initializeFirestore();

        const snapshot = await gestionMateriasCollection
            .where('activa', '==', true)
            .orderBy('clave')
            .get();

        const materias = [];
        snapshot.forEach(doc => {
            materias.push({
                id: doc.id,
                ...doc.data()
            });
        });

        console.log(`Obtenidas ${materias.length} materias`);
        return materias;

    } catch (error) {
        console.error('Error obteniendo materias:', error);
        throw error;
    }
}

/**
 * Cargar lista de materias en la tabla
 */
async function loadMateriasList() {
    const tbody = document.getElementById('materias-tbody');
    const loadingState = document.getElementById('loading-state');
    const emptyState = document.getElementById('empty-state');

    try {
        // Mostrar loading
        if (loadingState) loadingState.style.display = 'flex';
        if (emptyState) emptyState.style.display = 'none';
        if (tbody) tbody.innerHTML = '';

        // Obtener materias
        const materias = await getAllMaterias();
        materiasCache = materias;

        // Ocultar loading
        if (loadingState) loadingState.style.display = 'none';

        if (materias.length === 0) {
            // Mostrar estado vacío
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        // Llenar tabla
        tbody.innerHTML = '';
        materias.forEach((materia, index) => {
            const row = createMateriaRow(materia, index);
            tbody.appendChild(row);
        });

        // Agregar animaciones escalonadas
        const rows = tbody.querySelectorAll('tr');
        rows.forEach((row, index) => {
            row.style.animationDelay = `${index * 0.05}s`;
            row.classList.add('fade-in-up');
        });

    } catch (error) {
        console.error('Error cargando lista de materias:', error);
        
        // Ocultar loading
        if (loadingState) loadingState.style.display = 'none';
        
        // Mostrar mensaje de error en la tabla
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-danger">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        Error cargando materias: ${error.message}
                    </td>
                </tr>
            `;
        }
        
        throw error;
    }
}

/**
 * Crear fila de materia para la tabla
 */
function createMateriaRow(materia, index) {
    const tr = document.createElement('tr');
    tr.style.animationDelay = `${index * 0.1}s`;
    
    // Formatear fecha
    const fechaCreacion = materia.fechaCreacion ? 
        materia.fechaCreacion.toDate().toLocaleDateString('es-MX') : 
        'N/A';

    tr.innerHTML = `
        <td class="fw-bold text-primary">${materia.clave}</td>
        <td>${materia.nombre}</td>
        <td class="text-muted">${fechaCreacion}</td>
        <td>
            <button class="btn btn-action btn-edit" 
                    onclick="openEditModal('${materia.id}', '${materia.clave}', '${materia.nombre.replace(/'/g, "&apos;")}')"
                    title="Editar materia">
                <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-action btn-delete" 
                    onclick="openDeleteModal('${materia.id}', '${materia.clave}', '${materia.nombre.replace(/'/g, "&apos;")}')"
                    title="Eliminar materia">
                <i class="bi bi-trash"></i>
            </button>
        </td>
    `;

    return tr;
}

/**
 * Cargar estadísticas de materias
 */
async function loadMateriasStats() {
    try {
        if (!gestionMateriasDB) initializeFirestore();

        // Contar materias activas
        const snapshot = await gestionMateriasCollection
            .where('activa', '==', true)
            .get();

        const totalMaterias = snapshot.size;

        // Actualizar contador en el header
        const totalElement = document.getElementById('total-materias');
        if (totalElement) {
            // Animación del contador
            animateCounter(totalElement, 0, totalMaterias, 1000);
        }

        console.log(`Total de materias: ${totalMaterias}`);
        return totalMaterias;

    } catch (error) {
        console.error('Error cargando estadísticas:', error);
        
        // Mostrar 0 en caso de error
        const totalElement = document.getElementById('total-materias');
        if (totalElement) {
            totalElement.textContent = '0';
        }
        
        return 0;
    }
}

/**
 * Animar contador numérico
 */
function animateCounter(element, start, end, duration) {
    const range = end - start;
    const increment = Math.ceil(range / 60); // 60 FPS
    const stepTime = Math.abs(Math.floor(duration / range));
    
    let current = start;
    const timer = setInterval(() => {
        current += increment;
        if (current >= end) {
            current = end;
            clearInterval(timer);
        }
        element.textContent = current.toLocaleString();
    }, stepTime);
}

/**
 * Procesamiento masivo de materias desde Excel
 */
async function processMasiveMaterias(materiasData) {
    try {
        if (!gestionMateriasDB) initializeFirestore();

        const results = {
            success: 0,
            updated: 0,
            errors: 0,
            details: []
        };

        // Procesar cada materia
        for (let i = 0; i < materiasData.length; i++) {
            const materiaData = materiasData[i];
            
            try {
                // Validar datos
                if (!materiaData.clave || !materiaData.nombre) {
                    throw new Error('Datos incompletos');
                }

                const clave = materiaData.clave.toString().trim().toUpperCase();
                const nombre = materiaData.nombre.toString().trim().toUpperCase();

                if (clave.length < 1 || nombre.length < 5) {
                    throw new Error('Clave requerida o nombre muy corto');
                }

                // Verificar si ya existe
                const existingQuery = await gestionMateriasCollection
                    .where('clave', '==', clave)
                    .get();

                if (existingQuery.empty) {
                    // Crear nueva materia
                    const nuevaMateria = {
                        clave: clave,
                        nombre: nombre,
                        fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
                        fechaModificacion: firebase.firestore.FieldValue.serverTimestamp(),
                        creadoPor: firebase.auth().currentUser.uid,
                        activa: true,
                        origen: 'carga_masiva'
                    };

                    await gestionMateriasCollection.add(nuevaMateria);
                    results.success++;
                    results.details.push({
                        row: i + 2,
                        clave: clave,
                        status: 'creada'
                    });

                } else {
                    // Actualizar materia existente
                    const docId = existingQuery.docs[0].id;
                    const datosActualizados = {
                        nombre: nombre,
                        fechaModificacion: firebase.firestore.FieldValue.serverTimestamp(),
                        modificadoPor: firebase.auth().currentUser.uid,
                        origen: 'carga_masiva'
                    };

                    await gestionMateriasCollection.doc(docId).update(datosActualizados);
                    results.updated++;
                    results.details.push({
                        row: i + 2,
                        clave: clave,
                        status: 'actualizada'
                    });
                }

            } catch (error) {
                results.errors++;
                results.details.push({
                    row: i + 2,
                    clave: materiaData.clave || 'N/A',
                    status: 'error',
                    error: error.message
                });
                console.error(`Error procesando fila ${i + 2}:`, error);
            }
        }

        console.log('Procesamiento masivo completado:', results);
        return results;

    } catch (error) {
        console.error('Error en procesamiento masivo:', error);
        throw error;
    }
}

/**
 * Obtener materia por ID
 */
async function getMateriaById(materiaId) {
    try {
        if (!gestionMateriasDB) initializeFirestore();

        const doc = await gestionMateriasCollection.doc(materiaId).get();
        
        if (!doc.exists) {
            throw new Error('Materia no encontrada');
        }

        return {
            id: doc.id,
            ...doc.data()
        };

    } catch (error) {
        console.error('Error obteniendo materia:', error);
        throw error;
    }
}

/**
 * Buscar materias por texto
 */
async function searchMaterias(searchTerm) {
    try {
        if (!gestionMateriasDB) initializeFirestore();

        const term = searchTerm.toUpperCase();
        
        // Búsqueda por clave
        const claveQuery = gestionMateriasCollection
            .where('activa', '==', true)
            .where('clave', '>=', term)
            .where('clave', '<=', term + '\uf8ff')
            .orderBy('clave')
            .limit(50);

        // Ejecutar consulta
        const snapshot = await claveQuery.get();
        
        const materias = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            // También buscar en el nombre
            if (data.clave.includes(term) || data.nombre.includes(term)) {
                materias.push({
                    id: doc.id,
                    ...data
                });
            }
        });

        return materias;

    } catch (error) {
        console.error('Error buscando materias:', error);
        throw error;
    }
}

/**
 * Exportar materias a Excel
 */
async function exportMateriasToExcel() {
    try {
        const materias = await getAllMaterias();
        
        // Preparar datos para Excel
        const data = materias.map(materia => ({
            'Clave': materia.clave,
            'Nombre': materia.nombre,
            'Fecha Creación': materia.fechaCreacion ? 
                materia.fechaCreacion.toDate().toLocaleDateString('es-MX') : 'N/A'
        }));

        console.log('Datos preparados para exportación:', data);
        return data;

    } catch (error) {
        console.error('Error exportando materias:', error);
        throw error;
    }
}

// Inicializar Firestore al cargar el script
document.addEventListener('DOMContentLoaded', () => {
    if (typeof firebase !== 'undefined') {
        initializeFirestore();
    }
});

/**
 * Exportar funciones globales
 */
window.addMateria = addMateria;
window.updateMateria = updateMateria;
window.deleteMateria = deleteMateria;
window.getAllMaterias = getAllMaterias;
window.loadMateriasList = loadMateriasList;
window.loadMateriasStats = loadMateriasStats;
window.processMasiveMaterias = processMasiveMaterias;
window.getMateriaById = getMateriaById;
window.searchMaterias = searchMaterias;
window.exportMateriasToExcel = exportMateriasToExcel;