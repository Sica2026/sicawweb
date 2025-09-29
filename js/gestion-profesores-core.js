/**
 * GESTIÓN DE PROFESORES - CORE FUNCTIONS
 * Funciones principales para el manejo de datos y Firebase
 */

// Referencias a Firebase (usar variables globales si ya existen)
let profesoresDb, profesoresStorage, profesoresAuth;

// Verificar si las variables globales ya existen
if (typeof window.db !== 'undefined') {
    profesoresDb = window.db;
} else if (typeof db !== 'undefined') {
    profesoresDb = db;
} else {
    profesoresDb = firebase.firestore();
}

if (typeof window.storage !== 'undefined') {
    profesoresStorage = window.storage;
} else if (typeof storage !== 'undefined') {
    profesoresStorage = storage;
} else {
    profesoresStorage = firebase.storage();
}

if (typeof window.auth !== 'undefined') {
    profesoresAuth = window.auth;
} else if (typeof auth !== 'undefined') {
    profesoresAuth = auth;
} else {
    profesoresAuth = firebase.auth();
}

// Configuración de la colección
const COLLECTION_NAME = 'maestros';

// Estado global de la aplicación
const AppState = {
    currentProfessors: [],
    filteredProfessors: [],
    isLoading: false,
    searchTerm: '',
    editingProfessor: null
};

/**
 * FUNCIONES DE AUTENTICACIÓN
 */

// Verificar autenticación del usuario
profesoresAuth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    await setupGestionProfesores();
});

/**
 * FUNCIONES DE FIREBASE - CRUD OPERATIONS
 */

class ProfessorsService {
    
    /**
     * Obtener todos los profesores
     */
    static async getAllProfessors() {
        try {
            const snapshot = await profesoresDb.collection(COLLECTION_NAME)
                .orderBy('nombre', 'asc')
                .get();
            
            const professors = [];
            snapshot.forEach(doc => {
                professors.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            return professors;
        } catch (error) {
            console.error('Error al obtener profesores:', error);
            throw new Error('Error al cargar los profesores');
        }
    }

    /**
     * Verificar si un profesor existe por nombre
     */
    static async checkProfessorExists(nombre) {
        try {
            const normalizedName = nombre.toUpperCase().trim();
            const snapshot = await profesoresDb.collection(COLLECTION_NAME)
                .where('nombre', '==', normalizedName)
                .get();
            
            return !snapshot.empty ? snapshot.docs[0] : null;
        } catch (error) {
            console.error('Error al verificar profesor:', error);
            return null;
        }
    }

    /**
     * Crear nuevo profesor
     */
    static async createProfessor(professorData) {
        try {
            const normalizedName = professorData.nombre.toUpperCase().trim();
            
            // Verificar si ya existe
            const existingProfessor = await this.checkProfessorExists(normalizedName);
            if (existingProfessor) {
                throw new Error('Ya existe un profesor con ese nombre');
            }

            const docData = {
                nombre: normalizedName,
                foto: professorData.foto || 'default-avatar.png',
                fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
                fechaModificacion: firebase.firestore.FieldValue.serverTimestamp()
            };

            const docRef = await profesoresDb.collection(COLLECTION_NAME).add(docData);
            
            return {
                id: docRef.id,
                ...docData,
                fechaCreacion: new Date(),
                fechaModificacion: new Date()
            };
        } catch (error) {
            console.error('Error al crear profesor:', error);
            throw error;
        }
    }

    /**
     * Actualizar profesor existente
     */
    static async updateProfessor(professorId, professorData) {
        try {
            const normalizedName = professorData.nombre.toUpperCase().trim();
            
            // Verificar si el nombre ya existe en otro documento
            const existingProfessor = await this.checkProfessorExists(normalizedName);
            if (existingProfessor && existingProfessor.id !== professorId) {
                throw new Error('Ya existe un profesor con ese nombre');
            }

            const updateData = {
                nombre: normalizedName,
                fechaModificacion: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (professorData.foto) {
                updateData.foto = professorData.foto;
            }

            await profesoresDb.collection(COLLECTION_NAME).doc(professorId).update(updateData);
            
            return {
                id: professorId,
                ...updateData,
                fechaModificacion: new Date()
            };
        } catch (error) {
            console.error('Error al actualizar profesor:', error);
            throw error;
        }
    }

    /**
     * Eliminar profesor
     */
    static async deleteProfessor(professorId) {
        try {
            await profesoresDb.collection(COLLECTION_NAME).doc(professorId).delete();
            return true;
        } catch (error) {
            console.error('Error al eliminar profesor:', error);
            throw new Error('Error al eliminar el profesor');
        }
    }

    /**
     * Subir imagen a Firebase Storage
     */
    static async uploadPhoto(file, professorName) {
        try {
            const timestamp = Date.now();
            const fileName = `profesores/${professorName}_${timestamp}.${file.name.split('.').pop()}`;
            
            const storageRef = profesoresStorage.ref(fileName);
            const snapshot = await storageRef.put(file);
            const downloadURL = await snapshot.ref.getDownloadURL();
            
            return downloadURL;
        } catch (error) {
            console.error('Error al subir imagen:', error);
            throw new Error('Error al subir la imagen');
        }
    }

    /**
     * Procesar carga masiva desde Excel
     */
    static async processBulkUpload(excelData) {
        const results = {
            success: 0,
            updated: 0,
            errors: 0,
            errorDetails: []
        };

        for (let i = 0; i < excelData.length; i++) {
            const row = excelData[i];
            
            if (!row.nombre || !row.nombre.trim()) {
                results.errors++;
                results.errorDetails.push(`Fila ${i + 2}: Nombre vacío`);
                continue;
            }

            try {
                const normalizedName = row.nombre.toUpperCase().trim();
                const existingProfessor = await this.checkProfessorExists(normalizedName);

                if (existingProfessor) {
                    // Actualizar profesor existente
                    await profesoresDb.collection(COLLECTION_NAME)
                        .doc(existingProfessor.id)
                        .update({
                            nombre: normalizedName,
                            fechaModificacion: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    results.updated++;
                } else {
                    // Crear nuevo profesor
                    await profesoresDb.collection(COLLECTION_NAME).add({
                        nombre: normalizedName,
                        foto: 'default-avatar.png',
                        fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
                        fechaModificacion: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    results.success++;
                }
            } catch (error) {
                results.errors++;
                results.errorDetails.push(`Fila ${i + 2}: ${error.message}`);
            }
        }

        return results;
    }
}

/**
 * FUNCIONES DE VALIDACIÓN
 */

class ValidationHelper {
    
    /**
     * Validar datos de profesor
     */
    static validateProfessorData(data) {
        const errors = [];

        // Validar nombre
        if (!data.nombre || !data.nombre.trim()) {
            errors.push('El nombre es requerido');
        } else if (data.nombre.trim().length < 2) {
            errors.push('El nombre debe tener al menos 2 caracteres');
        } else if (data.nombre.trim().length > 100) {
            errors.push('El nombre no puede exceder 100 caracteres');
        }

        // Validar archivo de imagen si existe
        if (data.photoFile) {
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
            if (!validTypes.includes(data.photoFile.type)) {
                errors.push('La imagen debe ser de tipo JPG, PNG o GIF');
            }
            
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (data.photoFile.size > maxSize) {
                errors.push('La imagen no puede ser mayor a 5MB');
            }
        }

        return errors;
    }

    /**
     * Validar archivo Excel
     */
    static validateExcelFile(file) {
        const errors = [];

        if (!file) {
            errors.push('Debe seleccionar un archivo');
            return errors;
        }

        const validTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel'
        ];
        
        if (!validTypes.includes(file.type)) {
            errors.push('El archivo debe ser de tipo Excel (.xlsx o .xls)');
        }

        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            errors.push('El archivo no puede ser mayor a 10MB');
        }

        return errors;
    }

    /**
     * Mostrar errores en el formulario
     */
    static showFieldError(fieldElement, message) {
        // Limpiar errores previos
        this.clearFieldError(fieldElement);

        // Agregar clase de error
        fieldElement.classList.add('is-invalid');

        // Crear elemento de feedback
        const feedback = document.createElement('div');
        feedback.className = 'invalid-feedback';
        feedback.textContent = message;
        
        // Insertar después del campo
        fieldElement.parentNode.appendChild(feedback);
    }

    /**
     * Limpiar errores de campo
     */
    static clearFieldError(fieldElement) {
        fieldElement.classList.remove('is-invalid');
        
        const feedback = fieldElement.parentNode.querySelector('.invalid-feedback');
        if (feedback) {
            feedback.remove();
        }
    }

    /**
     * Limpiar todos los errores del formulario
     */
    static clearFormErrors(formElement) {
        const invalidFields = formElement.querySelectorAll('.is-invalid');
        invalidFields.forEach(field => {
            this.clearFieldError(field);
        });
    }
}

/**
 * FUNCIONES DE UTILIDAD
 */

class UtilityHelper {
    
    /**
     * Mostrar estado de carga en botón
     */
    static setButtonLoading(button, isLoading) {
        if (isLoading) {
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }

    /**
     * Mostrar notificación
     */
    static showNotification(title, message, type = 'info', icon = 'bi-info-circle') {
        if (window.SICAComponents && window.SICAComponents.notify) {
            window.SICAComponents.notify(title, message, type, icon);
        } else {
            // Fallback para alert
            alert(`${title}: ${message}`);
        }
    }

    /**
     * Formatear fecha
     */
    static formatDate(date) {
        if (!date) return 'N/A';
        
        if (date.toDate) {
            date = date.toDate();
        }
        
        return new Intl.DateTimeFormat('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }

    /**
     * Procesar archivo Excel
     */
    static async processExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    // Obtener la primera hoja
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    
                    // Convertir a JSON, omitiendo la primera fila (encabezados)
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                        header: ['nombre'],
                        range: 1 // Empezar desde la fila 2
                    });
                    
                    // Filtrar filas vacías
                    const filteredData = jsonData.filter(row => 
                        row.nombre && row.nombre.toString().trim()
                    );
                    
                    resolve(filteredData);
                } catch (error) {
                    reject(new Error('Error al procesar el archivo Excel'));
                }
            };
            
            reader.onerror = function() {
                reject(new Error('Error al leer el archivo'));
            };
            
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Filtrar profesores por término de búsqueda
     */
    static filterProfessors(professors, searchTerm) {
        if (!searchTerm || !searchTerm.trim()) {
            return professors;
        }
        
        const term = searchTerm.toLowerCase().trim();
        return professors.filter(professor => 
            professor.nombre.toLowerCase().includes(term)
        );
    }

    /**
     * Debounce function para búsqueda
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}