// Variables globales para Firebase
let registroFormDB;
let registroFormAuth;

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    const checkFirebase = setInterval(() => {
    // ✅ AGREGAR firebaseStorage a la verificación:
    if (window.firebase && window.firebaseDB && window.firebaseAuth && window.firebaseStorage) {
        clearInterval(checkFirebase);
        initializeRegistroForm();
    }
}, 100);
    
    setTimeout(() => {
        clearInterval(checkFirebase);
        if (!registroFormDB) {
            showNotification('Error de conexión con Firebase', 'error');
        }
    }, 10000);
});

async function initializeRegistroForm() {
    try {
        registroFormDB = window.firebaseDB;
        registroFormAuth = window.firebaseAuth;
        
        console.log('📝 Formulario de registro inicializado (modo público)');
        
        await setupRegistroForm();
        
    } catch (error) {
        console.error('❌ Error inicializando formulario:', error);
        showNotification('Error al cargar la página', 'error');
    }
}

async function setupRegistroForm() {
    try {
        // Inicializar funcionalidades
        initializeFormManager();
        
        console.log('✅ Formulario de registro público configurado correctamente');
        
    } catch (error) {
        console.error('❌ Error configurando formulario:', error);
    }
}

// =============================================================================
// CLASE PRINCIPAL PARA MANEJO DEL FORMULARIO Y OCR
// =============================================================================

class AcademicFormManager {
    constructor() {
        this.fileInput = document.getElementById('fileInput');
        this.uploadArea = document.getElementById('uploadArea');
        this.progressSection = document.getElementById('progressSection');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.form = document.getElementById('registroForm');
        
        this.ocrFields = [
            'apellidoPaterno',
            'apellidoMaterno', 
            'nombre',
            'numeroCuenta',
            'plantel',
            'carrera',
            'promedio',
            'avance'
        ];
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // File upload events
        if (this.fileInput) {
            this.fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleFile(e.target.files[0]);
                }
            });
        }

        // Drag and drop events
        if (this.uploadArea) {
            this.uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                this.uploadArea.classList.add('dragover');
            });

            this.uploadArea.addEventListener('dragleave', (e) => {
                e.preventDefault();
                this.uploadArea.classList.remove('dragover');
            });

            this.uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                this.uploadArea.classList.remove('dragover');
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleFile(files[0]);
                }
            });
        }

        // Form submission
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit();
        });

        // CURP validation
        const curpField = document.getElementById('curp');
        if (curpField) {
            curpField.addEventListener('input', (e) => {
                e.target.value = e.target.value.toUpperCase();
            });
        }

        // Phone number formatting
        ['telefonoCasa', 'telefonoCelular'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', (e) => {
                    e.target.value = e.target.value.replace(/\D/g, '');
                });
            }
        });
    }

    async handleFile(file) {
        console.log('Manejando archivo:', file);
        
        if (!this.validateFile(file)) {
            return;
        }

        try {
            await this.processOCR(file);
            showNotification('OCR Completado', '¡Datos extraídos exitosamente! Revise y complete la información faltante.', 'success');
        } catch (error) {
            console.error('Error completo:', error);
            
            let errorMessage = 'Error al procesar el archivo';
            
            if (error.message) {
                errorMessage += ': ' + error.message;
            }
            
            if (error.message && error.message.includes('Tesseract')) {
                errorMessage = 'Error al cargar la librería OCR. Verifique su conexión a internet.';
            } else if (error.message && error.message.includes('network')) {
                errorMessage = 'Error de conexión. Verifique su internet e inténtelo nuevamente.';
            } else if (error.message && error.message.includes('Failed to fetch')) {
                errorMessage = 'No se pudo cargar Tesseract.js. Verifique su conexión a internet.';
            }
            
            showNotification(errorMessage, 'error');
        }
    }

async uploadPDFToStorage(file, asesorId) {
    try {
        showNotification('Subiendo documento...', 'info');
        
        // ✅ CAMBIAR ESTA LÍNEA:
        const storage = window.firebaseStorage; // En lugar de firebase.storage()
        
        const fileName = `${asesorId}_${Date.now()}_${file.name}`;
        const ref = storage.ref(`documentos_asesores/${fileName}`);
        
        const snapshot = await ref.put(file);
        const downloadURL = await snapshot.ref.getDownloadURL();
        
        console.log('Archivo subido exitosamente:', fileName);
        
        return {
            fileName: fileName,
            originalName: file.name,
            downloadURL: downloadURL,
            uploadDate: firebase.firestore.FieldValue.serverTimestamp(),
            fileSize: file.size,
            fileType: file.type
        };
    } catch (error) {
        console.error('Error subiendo archivo:', error);
        throw new Error('No se pudo subir el documento: ' + error.message);
    }
}

    validateFile(file) {
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

        if (file.size > maxSize) {
            showNotification('El archivo es demasiado grande. Máximo 10MB.', 'error');
            return false;
        }

        if (!allowedTypes.includes(file.type)) {
            showNotification('Tipo de archivo no soportado. Use PDF, JPG o PNG.', 'error');
            return false;
        }

        return true;
    }

    async processOCR(file) {
        this.showProgress('Inicializando OCR...');
        
        try {
            console.log('Iniciando procesamiento OCR para archivo:', file.name, 'Tipo:', file.type);
            
            // Verificar que las librerías estén disponibles
            if (typeof Tesseract === 'undefined') {
                throw new Error('Tesseract.js no está cargado correctamente');
            }

            let imageData;
            
            if (file.type === 'application/pdf') {
                console.log('Convirtiendo PDF a imagen con alta calidad...');
                this.updateProgress(10, 'Convirtiendo PDF a imagen...');
                imageData = await this.convertPdfToImage(file);
            } else {
                console.log('Procesando archivo de imagen...');
                this.updateProgress(10, 'Procesando imagen...');
                imageData = file;
            }
            
            const worker = await Tesseract.createWorker({
                logger: m => {
                    console.log('Tesseract log:', m);
                    if (m.status === 'recognizing text') {
                        const progress = Math.round(30 + (m.progress * 60)); // 30-90%
                        this.updateProgress(progress, `Reconociendo texto... ${Math.round(m.progress * 100)}%`);
                    }
                }
            });

            this.updateProgress(20, 'Cargando idioma español...');
            await worker.loadLanguage('spa');
            
            this.updateProgress(25, 'Inicializando reconocimiento...');
            await worker.initialize('spa');
            
            this.updateProgress(30, 'Analizando texto...');
            console.log('Iniciando reconocimiento de texto...');
            
            const result = await worker.recognize(imageData);
            console.log('Resultado del OCR:', result);
            
            if (!result || !result.data || !result.data.text) {
                throw new Error('No se pudo extraer texto del archivo. Verifique que la imagen tenga texto legible.');
            }
            
            const text = result.data.text;
            console.log('Texto extraído:', text);
            
            this.updateProgress(95, 'Extrayendo datos académicos...');
            
            // Extract data from text
            const extractedData = this.extractAcademicData(text);
            
            await worker.terminate();
            
            this.hideProgress();
            this.fillFormWithOCRData(extractedData);
            
        } catch (error) {
            console.error('Error detallado en processOCR:', error);
            this.hideProgress();
            throw error;
        }
    }

    async convertPdfToImage(file) {
        try {
            console.log('Iniciando conversión de PDF con ALTA CALIDAD...');
            
            if (typeof pdfjsLib === 'undefined') {
                throw new Error('PDF.js no está cargado. Verifique su conexión a internet.');
            }

            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            console.log('PDF cargado, páginas:', pdf.numPages);
            
            const page = await pdf.getPage(1);
            
            // MEJORAR LA CALIDAD - Escala mucho más alta
            const scale = 4.0; // Aumentado para mejor calidad
            const viewport = page.getViewport({ scale });
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            // Mejorar calidad del canvas
            context.imageSmoothingEnabled = true;
            context.imageSmoothingQuality = 'high';
            
            const renderContext = {
                canvasContext: context,
                viewport: viewport,
                intent: 'print', // Usar intent de impresión para mejor calidad
                renderInteractiveForms: false,
                optionalContentConfigPromise: null
            };
            
            console.log('Renderizando PDF con escala:', scale);
            await page.render(renderContext).promise;
            console.log('PDF renderizado en canvas con alta calidad');
            
            return new Promise((resolve, reject) => {
                canvas.toBlob((blob) => {
                    if (blob) {
                        console.log('PDF convertido a imagen PNG de alta calidad');
                        console.log('Tamaño de imagen generada:', blob.size, 'bytes');
                        console.log('Dimensiones:', canvas.width, 'x', canvas.height);
                        resolve(blob);
                    } else {
                        reject(new Error('No se pudo convertir PDF a imagen'));
                    }
                }, 'image/png', 1.0); // Calidad máxima (1.0)
            });
            
        } catch (error) {
            console.error('Error al convertir PDF:', error);
            
            if (error.message && error.message.includes('Invalid PDF')) {
                throw new Error('El archivo PDF está corrupto o no es válido');
            } else if (error.message && error.message.includes('PDF.js')) {
                throw new Error('Error al cargar PDF.js. Verifique su conexión a internet.');
            } else {
                throw new Error('Error al procesar el PDF: ' + error.message);
            }
        }
    }

    extractAcademicData(text) {
        console.log('=== INICIANDO EXTRACCIÓN LIMPIA ===');
        console.log('Texto reconocido completo:', text);
        
        // Inicializar datos completamente limpios
        const data = {
            apellidoPaterno: '',
            apellidoMaterno: '',
            nombre: '',
            numeroCuenta: '',
            plantel: '',
            carrera: '',
            promedio: '',
            avance: ''
        };

        // Limpiar el texto para mejor análisis
        const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        console.log('Texto limpio:', cleanText);

        // 1. Extraer número de cuenta
        const accountPatterns = [
            /NUMERO DE CUENTA:\s*(\d+)/i,
            /CUENTA:\s*(\d+)/i,
            /(\d{9})/g,
            /(\d{8})/g
        ];
        
        for (let pattern of accountPatterns) {
            const match = cleanText.match(pattern);
            if (match) {
                data.numeroCuenta = match[1] || match[0];
                console.log('Número de cuenta encontrado:', data.numeroCuenta);
                break;
            }
        }

        // 2. Extraer nombre completo
        const namePatterns = [
            /NOMBRE:\s*([A-ZÁÉÍÓÚÑ]+)\s+([A-ZÁÉÍÓÚÑ]+)\s+([A-ZÁÉÍÓÚÑ]+)(?:\s+AÑO\s+DE\s+INGRESO|$)/i,
            /NOMBRE:\s*([A-ZÁÉÍÓÚÑ\s,]+?)(?:\s+AÑO\s+DE\s+INGRESO|$)/i
        ];

        for (let pattern of namePatterns) {
            const match = cleanText.match(pattern);
            if (match) {
                if (match[3]) {
                    data.apellidoPaterno = match[1].trim();
                    data.apellidoMaterno = match[2].trim();
                    data.nombre = match[3].trim();
                } else {
                    const fullName = match[1].trim();
                    const nameParts = fullName.split(/[,\s]+/).filter(part => part.length > 0);
                    if (nameParts.length >= 3) {
                        data.apellidoPaterno = nameParts[0];
                        data.apellidoMaterno = nameParts[1];
                        data.nombre = nameParts.slice(2).join(' ');
                    }
                }
                console.log('Nombre encontrado:', data.apellidoPaterno, data.apellidoMaterno, data.nombre);
                break;
            }
        }

        // 3. Extraer plantel
        const plantelPatterns = [
            /PLANTEL:\s*\d+\s*(FACULTAD DE [A-ZÁÉÍÓÚÑ]+)/i,
            /(FACULTAD DE INGENIER[ÍI]A)(?:\s+[A-Z]|$)/i,
            /(FACULTAD DE [A-ZÁÉÍÓÚÑ]+)(?:\s+[A-Z]|$)/i
        ];

        for (let pattern of plantelPatterns) {
            const match = cleanText.match(pattern);
            if (match) {
                let plantel = match[1].trim();
                plantel = plantel.replace(/\s+(CARRERA|AVANCE|PROMEDIO|ASIGNATURAS).*$/i, '');
                data.plantel = plantel;
                console.log('Plantel encontrado:', data.plantel);
                break;
            }
        }

        // 4. Extraer carrera
        const carreraPatterns = [
            /CARRERA:\s*\d+\s*PLAN DE ESTUDIOS\s*[\d\-]+\s*([A-ZÁÉÍÓÚÑ\s\.]+?)(?:\s+AVANCE|\s+ASIGNATURAS|\s+PROMEDIO|$)/i,
            /CARRERA:\s*\d+[^-]*-\s*([A-ZÁÉÍÓÚÑ\s\.]+?)(?:\s+AVANCE|\s+ASIGNATURAS|\s+PROMEDIO|$)/i,
            /(ING\.?\s*CIVIL)(?!\s*[A-Z])/i
        ];

        for (let pattern of carreraPatterns) {
            const match = cleanText.match(pattern);
            if (match) {
                let carrera = match[1].trim();
                carrera = carrera.replace(/\s+(AVANCE|ASIGNATURAS|PROMEDIO|OBLICATORIOS|DE|CRÉDITOS).*$/i, '');
                
                if (carrera.match(/ING\.?\s*CIVIL/i)) {
                    carrera = 'ING. CIVIL';
                } else {
                    carrera = carrera.replace(/ING\s+/i, 'ING. ');
                }
                
                data.carrera = carrera;
                console.log('Carrera encontrada y formateada:', data.carrera);
                break;
            }
        }

        // 5. Extraer promedio
        const promedioPatterns = [
            /PROMEDIO[:\s]*(\d+\.?\d*)/i,
            /(\d+\.\d{1,2})/g
        ];

        for (let pattern of promedioPatterns) {
            const matches = cleanText.match(pattern);
            if (matches) {
                if (pattern.source.includes('PROMEDIO')) {
                    data.promedio = matches[1];
                } else {
                    for (let match of matches) {
                        const num = parseFloat(match.replace(/[^\d.]/g, ''));
                        if (num >= 0 && num <= 10 && match.includes('.')) {
                            data.promedio = num.toString();
                            break;
                        }
                    }
                }
                if (data.promedio) {
                    console.log('Promedio encontrado:', data.promedio);
                    break;
                }
            }
        }

        // 6. Extraer avance
        const textLines = text.split(/[\r\n]+/).filter(line => line.trim().length > 0);
        
        for (let line of textLines) {
            const lineUpper = line.toUpperCase();
            if (lineUpper.includes('TOTALES')) {
                console.log('LÍNEA DE TOTALES ENCONTRADA:', line.trim());
                
                const porcentajeMatch = line.match(/(\d+\.?\d*)\s*%/);
                if (porcentajeMatch) {
                    data.avance = porcentajeMatch[1] + '%';
                    console.log('PORCENTAJE EXTRAÍDO:', data.avance);
                } else {
                    data.avance = line.trim();
                }
                break;
            }
        }
        
        if (!data.avance) {
            const todosLosPorcentajes = text.match(/\d+\.?\d*%/g);
            if (todosLosPorcentajes && todosLosPorcentajes.length > 0) {
                data.avance = todosLosPorcentajes[todosLosPorcentajes.length - 1];
            }
        }

        console.log('Datos extraídos finales:', data);
        return data;
    }

    fillFormWithOCRData(data) {
        console.log('=== LLENANDO FORMULARIO ===');
        console.log('Datos recibidos para llenar:', data);
        
        // LIMPIAR TODOS LOS CAMPOS OCR PRIMERO
        this.ocrFields.forEach(field => {
            const element = document.getElementById(field);
            if (element) {
                element.value = '';
                element.classList.remove('ocr-filled');
            }
        });
        
        // Fill form fields with extracted data
        Object.keys(data).forEach(field => {
            const element = document.getElementById(field);
            if (element && data[field]) {
                console.log(`Llenando campo ${field} con valor: "${data[field]}"`);
                element.value = data[field];
                element.classList.add('ocr-filled');
                
                element.dispatchEvent(new Event('change', { bubbles: true }));
                element.dispatchEvent(new Event('input', { bubbles: true }));
                
                setTimeout(() => {
                    element.classList.remove('ocr-filled');
                }, 3000);
            }
        });

        const filledFields = Object.keys(data).filter(key => data[key] && data[key].toString().trim() !== '');
        
        if (filledFields.length > 0) {
            const fieldNames = {
                apellidoPaterno: 'Apellido Paterno',
                apellidoMaterno: 'Apellido Materno',
                nombre: 'Nombre',
                numeroCuenta: 'Número de Cuenta',
                plantel: 'Plantel',
                carrera: 'Carrera',
                promedio: 'Promedio',
                avance: 'Avance'
            };
            
            const filledFieldsText = filledFields.map(field => fieldNames[field]).join(', ');
            showNotification(`OCR Exitoso - Campos llenados: ${filledFieldsText}`, 'success');
        } else {
            showNotification('OCR Incompleto - No se pudieron extraer datos del documento.', 'warning');
        }
    }

async handleFormSubmit() {
    if (!this.validateForm()) {
        return;
    }

    // Mostrar loading en el botón
    const submitBtn = this.form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="bi bi-arrow-clockwise spinning me-2"></i>Guardando...';
    submitBtn.disabled = true;

    try {
        const formData = new FormData(this.form);
        const data = Object.fromEntries(formData.entries());
        
        // ✅ CAMBIAR: Datos para modo público
        data.fechaRegistro = firebase.firestore.FieldValue.serverTimestamp();
        data.registradoPor = 'registro_publico'; // ✅ Sin requerir usuario
        data.activo = true;
        data.estado = 'pendiente';
        data.tipoRegistro = 'publico'; // ✅ Identificar como registro público

        // ✅ AGREGAR después de crear `data`:
        // Si hay archivo cargado, subirlo
        if (this.fileInput && this.fileInput.files.length > 0) {
            const file = this.fileInput.files[0];
            data.documento = await this.uploadPDFToStorage(file, data.id);
        }

        console.log('Datos del asesor a guardar (público):', data);
        
        // Guardar en Firestore
        await registroFormDB.collection('asesores').add(data);
        
        showSuccessModal();
        
    } catch (error) {
        console.error('Error guardando registro:', error);
        showNotification('Error al enviar el registro. Inténtelo nuevamente.', 'error');
    } finally {
        // Restaurar botón
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

    validateForm() {
        const requiredFields = this.form.querySelectorAll('[required]');
        let isValid = true;
        let firstInvalidField = null;

        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                field.classList.add('is-invalid');
                isValid = false;
                if (!firstInvalidField) {
                    firstInvalidField = field;
                }
            } else {
                field.classList.remove('is-invalid');
            }
        });

        // Validate CURP format
        const curp = document.getElementById('curp');
        const curpPattern = /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[0-9A-Z][0-9]$/;
        if (curp.value && !curpPattern.test(curp.value)) {
            curp.classList.add('is-invalid');
            isValid = false;
            if (!firstInvalidField) {
                firstInvalidField = curp;
            }
        }

        // Validate email
        const email = document.getElementById('correoElectronico');
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (email.value && !emailPattern.test(email.value)) {
            email.classList.add('is-invalid');
            isValid = false;
            if (!firstInvalidField) {
                firstInvalidField = email;
            }
        }

        // Validate phone numbers
        ['telefonoCasa', 'telefonoCelular'].forEach(id => {
            const phone = document.getElementById(id);
            if (phone && phone.value && (phone.value.length !== 10 || !/^\d+$/.test(phone.value))) {
                phone.classList.add('is-invalid');
                isValid = false;
                if (!firstInvalidField) {
                    firstInvalidField = phone;
                }
            }
        });

        if (!isValid) {
            showNotification('Por favor, complete todos los campos requeridos correctamente.', 'warning');
            if (firstInvalidField) {
                firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                firstInvalidField.focus();
            }
        }

        return isValid;
    }

    generateUniqueId() {
        return 'asesor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    showProgress(message) {
        if (this.progressText && this.progressSection && this.progressFill) {
            this.progressText.textContent = message;
            this.progressSection.style.display = 'block';
            this.progressFill.style.width = '0%';
        }
    }

    updateProgress(percent, message) {
        if (this.progressFill && this.progressText) {
            this.progressFill.style.width = percent + '%';
            this.progressText.textContent = message;
        }
    }

    hideProgress() {
        if (this.progressSection) {
            this.progressSection.style.display = 'none';
        }
    }

resetForm() {
    this.form.reset();
    
    // Remove validation classes
    const invalidFields = this.form.querySelectorAll('.is-invalid');
    invalidFields.forEach(field => {
        field.classList.remove('is-invalid');
    });
    
    // Reset file input
    if (this.fileInput) {
        this.fileInput.value = '';
    }  
    showNotification('Formulario limpiado exitosamente.', 'info');
}
}

// Funciones globales para HTML onclick events
function initializeFormManager() {
    window.academicFormManager = new AcademicFormManager();
}

function toggleBecaType() {
    const tieneBeca = document.getElementById('tieneBeca').value;
    const tipoBecaGroup = document.getElementById('tipoBecaGroup');
    const tipoBeca = document.getElementById('tipoBeca');
    
    if (tieneBeca === 'si') {
        tipoBecaGroup.style.display = 'block';
        tipoBeca.required = true;
    } else {
        tipoBecaGroup.style.display = 'none';
        tipoBeca.required = false;
        tipoBeca.value = '';
    }
}

function resetForm() {
    if (window.academicFormManager) {
        if (confirm('¿Está seguro de que desea limpiar todo el formulario?')) {
            window.academicFormManager.resetForm();
        }
    }
}

function toggleOCRSection() {
    const ocrSection = document.getElementById('ocrSection');
    if (ocrSection.style.display === 'none') {
        ocrSection.style.display = 'block';
        showNotification('Sección OCR activada', 'info');
    } else {
        ocrSection.style.display = 'none';
    }
}

function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container') || document.body;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        min-width: 350px;
        max-width: 400px;
        background: ${getNotificationColor(type)};
        color: white;
        border-radius: 15px;
        padding: 1.5rem;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255,255,255,0.2);
        transform: translateX(100%) scale(0.8);
        opacity: 0;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 1rem;">
            <div style="font-size: 1.5rem;">
                <i class="bi ${getNotificationIcon(type)}"></i>
            </div>
            <div style="flex: 1;">
                ${message}
            </div>
            <button onclick="this.parentElement.parentElement.remove()" style="
                background: none; border: none; color: white; font-size: 1.2rem; 
                cursor: pointer; opacity: 0.7; padding: 0; line-height: 1;
            ">
                <i class="bi bi-x"></i>
            </button>
        </div>
    `;
    
    container.appendChild(notification);
    
    // Animar entrada
    requestAnimationFrame(() => {
        notification.style.transform = 'translateX(0) scale(1)';
        notification.style.opacity = '1';
    });
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.transform = 'translateX(100%) scale(0.8)';
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 400);
        }
    }, 5000);
}

function showSuccessModal() {

    // Agregar al inicio de showSuccessModal()
// Efecto de confeti simple
function createConfetti() {
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.style.cssText = `
            position: fixed;
            width: 10px;
            height: 10px;
            background: ${['#10B981', '#059669', '#34D399', '#6EE7B7'][Math.floor(Math.random() * 4)]};
            top: -10px;
            left: ${Math.random() * 100}%;
            z-index: 10001;
            animation: confettiFall 3s linear forwards;
        `;
        document.body.appendChild(confetti);
        
        setTimeout(() => confetti.remove(), 3000);
    }
}

// CSS para la animación
const confettiStyle = document.createElement('style');
confettiStyle.textContent = `
    @keyframes confettiFall {
        to {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
        }
    }
`;
document.head.appendChild(confettiStyle);

createConfetti(); // Llamar antes de crear el modal


    // Crear overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(5px);
    `;
    
    // Crear modal
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: linear-gradient(135deg, #10B981, #059669);
        color: white;
        border-radius: 20px;
        padding: 3rem;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        text-align: center;
        max-width: 500px;
        width: 90%;
        transform: scale(0.8);
        opacity: 0;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    `;
    
    modal.innerHTML = `
        <div style="font-size: 4rem; margin-bottom: 1.5rem;">
            <i class="bi bi-check-circle-fill"></i>
        </div>
        <h2 style="font-size: 2rem; font-weight: 700; margin-bottom: 1rem;">
            ¡Registro Enviado Exitosamente!
        </h2>
        <p style="font-size: 1.2rem; margin-bottom: 2rem; opacity: 0.9;">
            Su solicitud será revisada por el equipo SICA.<br>
            Le contactaremos por correo electrónico.
        </p>
        <div style="background: rgba(255,255,255,0.2); padding: 1rem; border-radius: 10px; margin-bottom: 1.5rem;">
            <p style="margin: 0; font-size: 1rem;">
                <i class="bi bi-clock me-2"></i>
                Redirigiendo al inicio en <span id="countdown">3</span> segundos...
            </p>
        </div>
        <button onclick="redirectToHome()" style="
            background: rgba(255,255,255,0.2);
            border: 2px solid white;
            color: white;
            padding: 0.75rem 2rem;
            border-radius: 25px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        " onmouseover="this.style.background='white'; this.style.color='#10B981';" 
           onmouseout="this.style.background='rgba(255,255,255,0.2)'; this.style.color='white';">
            Ir al Inicio Ahora
        </button>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Animar entrada
    requestAnimationFrame(() => {
        modal.style.transform = 'scale(1)';
        modal.style.opacity = '1';
    });
    
    // Countdown y redirección automática
    let seconds = 3;
    const countdownElement = modal.querySelector('#countdown');
    
    const countdownInterval = setInterval(() => {
        seconds--;
        if (countdownElement) {
            countdownElement.textContent = seconds;
        }
        
        if (seconds <= 0) {
            clearInterval(countdownInterval);
            redirectToHome();
        }
    }, 1000);
    
    // Función para redireccionar
    window.redirectToHome = function() {
        clearInterval(countdownInterval);
        
        // Animar salida
        modal.style.transform = 'scale(0.8)';
        modal.style.opacity = '0';
        
        setTimeout(() => {
            // Determinar la ruta correcta
            const currentPath = window.location.pathname;
            const isInViewFolder = currentPath.includes('/view/');
            
            if (isInViewFolder) {
                window.location.href = '../index.html';
            } else {
                window.location.href = 'index.html';
            }
        }, 400);
    };
}

function getNotificationColor(type) {
    const colors = {
        'success': 'linear-gradient(135deg, #10B981, #059669)',
        'info': 'linear-gradient(135deg, #3B82F6, #1D4ED8)', 
        'warning': 'linear-gradient(135deg, #F59E0B, #D97706)',
        'error': 'linear-gradient(135deg, #EF4444, #DC2626)'
    };
    return colors[type] || colors['info'];
}

function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'bi-check-circle-fill';
        case 'error': return 'bi-exclamation-triangle-fill';
        case 'warning': return 'bi-exclamation-triangle-fill';
        case 'info': return 'bi-info-circle-fill';
        default: return 'bi-info-circle-fill';
    }
}

// Agregar CSS para animación de spinner
const style = document.createElement('style');
style.textContent = `
    .spinning {
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    
    .is-invalid {
        border-color: #dc3545 !important;
        background-color: rgba(220, 53, 69, 0.1) !important;
    }
`;
document.head.appendChild(style);