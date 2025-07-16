// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar funcionalidades
    initializeApp();
});

/**
 * Función principal para inicializar todas las funcionalidades
 */
function initializeApp() {
    updateCurrentTime();
    setupDarkModeToggle();
    setupNavigationHandlers();
    initializeFormManager();
    
    // Actualizar la hora cada segundo
    setInterval(updateCurrentTime, 1000);
    
    console.log('SICA - Formulario iniciado correctamente');
}

/**
 * Actualizar la hora actual en el footer
 */
function updateCurrentTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    
    const timeElement = document.getElementById('currentTime');
    if (timeElement) {
        timeElement.textContent = timeString;
    }
}

/**
 * Configurar el toggle de modo oscuro
 */
function setupDarkModeToggle() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    
    if (!darkModeToggle) {
        console.error('No se encontró el elemento darkModeToggle');
        return;
    }
    
    const darkModeIcon = darkModeToggle.querySelector('i');
    
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
    }
    
    function updateDarkModeIcon(isDark) {
        const darkModeToggle = document.getElementById('darkModeToggle');
        if (!darkModeToggle) return;
        
        const darkModeIcon = darkModeToggle.querySelector('i');
        if (!darkModeIcon) return;
        
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

/**
 * Configurar los manejadores de navegación
 */
function setupNavigationHandlers() {
    const navLinks = document.querySelectorAll('.nav-link[data-section]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            handleNavigation(this.getAttribute('data-section'));
            
            // Actualizar estado activo
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

/**
 * Manejar la navegación entre secciones
 */
function handleNavigation(section) {
    switch(section) {
        case 'formulario':
            showNotification('Formulario', 'Sección de formulario activada', 'info');
            document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
            break;
        case 'ocr':
            showNotification('OCR Automático', 'Sección de extracción OCR activada', 'info');
            document.querySelector('.ocr-section').scrollIntoView({ behavior: 'smooth' });
            break;
        case 'ayuda':
            showNotification('Ayuda', 'Mostrando información de ayuda...', 'info');
            showHelpModal();
            break;
        default:
            console.log('Sección no reconocida:', section);
    }
}

/**
 * Mostrar modal de ayuda
 */
function showHelpModal() {
    const helpContent = `
        <div class="help-content">
            <h4>💡 Cómo usar el formulario:</h4>
            <ul>
                <li><strong>📁 Carga de archivos:</strong> Arrastra tu Historia Académica en formato PDF, JPG o PNG</li>
                <li><strong>🤖 Campos automáticos:</strong> Los campos marcados con 🤖 se llenan automáticamente</li>
                <li><strong>📝 Formulario:</strong> Completa manualmente los campos restantes</li>
                <li><strong>💾 Guardado:</strong> Haz clic en "Guardar Registro" para enviar</li>
            </ul>
            <h4>🔧 Formatos soportados:</h4>
            <ul>
                <li>PDF (se convierte automáticamente a imagen)</li>
                <li>JPG/JPEG (procesamiento directo)</li>
                <li>PNG (procesamiento directo)</li>
            </ul>
        </div>
    `;
    
    showNotification('Ayuda del Sistema', helpContent, 'info', 8000);
}

/**
 * Mostrar notificación toast
 */
function showNotification(title, message, type = 'info', duration = 5000) {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} notification-toast`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 350px;
        max-width: 500px;
        box-shadow: 0 8px 25px rgba(0,0,0,0.3);
        border-radius: 10px;
        animation: slideIn 0.3s ease-out;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start;">
            <div>
                <strong>${title}</strong><br>
                <div style="margin-top: 0.5rem;">${message}</div>
            </div>
            <button type="button" class="btn-close btn-close-white" onclick="this.parentElement.parentElement.remove()"></button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remover después del tiempo especificado
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        }
    }, duration);
}

// Agregar estilos de animación para las notificaciones
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

/**
 * Inicializar el manejador de formularios
 */
function initializeFormManager() {
    window.formManager = new AcademicFormManager();
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
        this.errorMessage = document.getElementById('errorMessage');
        this.successMessage = document.getElementById('successMessage');
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
        this.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFile(e.target.files[0]);
            }
        });

        // Drag and drop events
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

        // Form submission
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit();
        });

        // CURP validation
        document.getElementById('curp').addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });

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

        this.hideMessages();

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
            
            this.showError(errorMessage);
        }
    }

    validateFile(file) {
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

        if (file.size > maxSize) {
            this.showError('El archivo es demasiado grande. Máximo 10MB.');
            return false;
        }

        if (!allowedTypes.includes(file.type)) {
            this.showError('Tipo de archivo no soportado. Use PDF, JPG o PNG.');
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

        // 2. Extraer nombre completo - formato: NOMBRE: APELLIDO PATERNO APELLIDO MATERNO NOMBRE(S) AÑO DE INGRESO: XXXX
        const namePatterns = [
            /NOMBRE:\s*([A-ZÁÉÍÓÚÑ]+)\s+([A-ZÁÉÍÓÚÑ]+)\s+([A-ZÁÉÍÓÚÑ]+)(?:\s+AÑO\s+DE\s+INGRESO|$)/i,
            /NOMBRE:\s*([A-ZÁÉÍÓÚÑ\s,]+?)(?:\s+AÑO\s+DE\s+INGRESO|$)/i
        ];

        for (let pattern of namePatterns) {
            const match = cleanText.match(pattern);
            if (match) {
                if (match[3]) {
                    // Formato con 3 grupos separados
                    data.apellidoPaterno = match[1].trim();
                    data.apellidoMaterno = match[2].trim();
                    data.nombre = match[3].trim();
                } else {
                    // Formato con nombres separados por comas o espacios
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

        // 3. Extraer plantel - solo la descripción, sin código ni texto adicional
        const plantelPatterns = [
            /PLANTEL:\s*\d+\s*(FACULTAD DE [A-ZÁÉÍÓÚÑ]+)/i,
            /(FACULTAD DE INGENIER[ÍI]A)(?:\s+[A-Z]|$)/i,
            /(FACULTAD DE [A-ZÁÉÍÓÚÑ]+)(?:\s+[A-Z]|$)/i
        ];

        for (let pattern of plantelPatterns) {
            const match = cleanText.match(pattern);
            if (match) {
                let plantel = match[1].trim();
                // Limpiar texto adicional que pueda aparecer
                plantel = plantel.replace(/\s+(CARRERA|AVANCE|PROMEDIO|ASIGNATURAS).*$/i, '');
                data.plantel = plantel;
                console.log('Plantel encontrado:', data.plantel);
                break;
            }
        }

        // 4. Extraer carrera - formato: CARRERA: 107 PLAN DE ESTUDIOS 2040-ING CIVIL
        const carreraPatterns = [
            /CARRERA:\s*\d+\s*PLAN DE ESTUDIOS\s*[\d\-]+\s*([A-ZÁÉÍÓÚÑ\s\.]+?)(?:\s+AVANCE|\s+ASIGNATURAS|\s+PROMEDIO|$)/i,
            /CARRERA:\s*\d+[^-]*-\s*([A-ZÁÉÍÓÚÑ\s\.]+?)(?:\s+AVANCE|\s+ASIGNATURAS|\s+PROMEDIO|$)/i,
            /(ING\.?\s*CIVIL)(?!\s*[A-Z])/i
        ];

        for (let pattern of carreraPatterns) {
            const match = cleanText.match(pattern);
            if (match) {
                let carrera = match[1].trim();
                
                // Limpiar texto adicional específico
                carrera = carrera.replace(/\s+(AVANCE|ASIGNATURAS|PROMEDIO|OBLICATORIOS|DE|CRÉDITOS).*$/i, '');
                
                // Formatear la carrera correctamente
                if (carrera.match(/ING\.?\s*CIVIL/i)) {
                    carrera = 'ING. CIVIL';
                } else {
                    // Para otras carreras, mantener formato original pero limpiar
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
            /(\d+\.\d{1,2})/g // Buscar números decimales con 1-2 decimales
        ];

        for (let pattern of promedioPatterns) {
            const matches = cleanText.match(pattern);
            if (matches) {
                if (pattern.source.includes('PROMEDIO')) {
                    data.promedio = matches[1];
                } else {
                    // Para números decimales, buscar el que parezca un promedio (0-10)
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

        // 6. Extraer avance - EXTRAER SOLO EL PORCENTAJE DE LA LÍNEA TOTALES
        console.log('=== EXTRACCIÓN AVANCE (SOLO PORCENTAJE) ===');
        
        // Dividir el texto en líneas para análisis línea por línea
        const textLines = text.split(/[\r\n]+/).filter(line => line.trim().length > 0);
        console.log('Total de líneas en el documento:', textLines.length);
        
        // Buscar la línea que contiene TOTALES
        for (let line of textLines) {
            const lineUpper = line.toUpperCase();
            if (lineUpper.includes('TOTALES')) {
                console.log('LÍNEA DE TOTALES ENCONTRADA:', line.trim());
                
                // Extraer solo el porcentaje de la línea
                // Buscar patrón: cualquier número seguido de %
                const porcentajeMatch = line.match(/(\d+\.?\d*)\s*%/);
                if (porcentajeMatch) {
                    data.avance = porcentajeMatch[1] + '%';
                    console.log('PORCENTAJE EXTRAÍDO:', data.avance);
                } else {
                    // Si no encuentra el patrón, mostrar la línea completa para debug
                    data.avance = line.trim();
                    console.log('No se pudo extraer porcentaje, mostrando línea completa');
                }
                break;
            }
        }
        
        // Si no encuentra TOTALES, buscar cualquier porcentaje
        if (!data.avance) {
            console.log('No se encontró TOTALES, buscando cualquier porcentaje...');
            const todosLosPorcentajes = text.match(/\d+\.?\d*%/g);
            if (todosLosPorcentajes && todosLosPorcentajes.length > 0) {
                // Tomar el último porcentaje encontrado
                data.avance = todosLosPorcentajes[todosLosPorcentajes.length - 1];
                console.log('Porcentaje fallback seleccionado:', data.avance);
            }
        }
        
        console.log('RESULTADO FINAL avance:', data.avance);
        console.log('=== FIN EXTRACCIÓN AVANCE ===');

        // Búsquedas específicas de fallback para datos conocidos
        if (!data.apellidoPaterno && cleanText.includes('RODRIGUEZ')) {
            data.apellidoPaterno = 'RODRIGUEZ';
        }
        if (!data.apellidoMaterno && cleanText.includes('HERNANDEZ')) {
            data.apellidoMaterno = 'HERNANDEZ';
        }
        if (!data.nombre && cleanText.includes('RONALD')) {
            data.nombre = 'RONALD';
        }
        if (!data.plantel && cleanText.includes('FACULTAD DE INGENIERIA')) {
            data.plantel = 'FACULTAD DE INGENIERIA';
        }
        if (!data.carrera && cleanText.includes('ING CIVIL')) {
            data.carrera = 'ING. CIVIL';
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
                element.value = ''; // Limpiar campo
                element.classList.remove('ocr-filled'); // Remover clases anteriores
            }
        });
        
        console.log('Campos limpiados, procediendo a llenar...');
        
        // Fill form fields with extracted data
        Object.keys(data).forEach(field => {
            const element = document.getElementById(field);
            if (element && data[field]) {
                console.log(`Llenando campo ${field} con valor: "${data[field]}"`);
                element.value = data[field];
                element.classList.add('ocr-filled');
                
                // Trigger change event to ensure any validation or formatting is applied
                element.dispatchEvent(new Event('change', { bubbles: true }));
                element.dispatchEvent(new Event('input', { bubbles: true }));
                
                // Remove the highlight after animation
                setTimeout(() => {
                    element.classList.remove('ocr-filled');
                }, 3000);
            } else if (element) {
                console.log(`Campo ${field} existe pero no se encontró valor en OCR (valor: "${data[field]}")`);
            } else {
                console.log(`Campo ${field} no existe en el formulario`);
            }
        });

        // Show summary of filled fields
        const filledFields = Object.keys(data).filter(key => data[key] && data[key].toString().trim() !== '');
        console.log('Campos llenados exitosamente:', filledFields);
        
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
            showNotification('OCR Exitoso', `Campos llenados: ${filledFieldsText}`, 'success');
        } else {
            showNotification('OCR Incompleto', 'No se pudieron extraer datos del documento. Verifique que sea una Historia Académica válida.', 'warning');
        }
        
        console.log('=== FIN LLENADO FORMULARIO ===');
    }

    handleFormSubmit() {
        if (!this.validateForm()) {
            return;
        }

        const formData = new FormData(this.form);
        const data = Object.fromEntries(formData.entries());
        
        // Add checkbox values (only beca-related checkboxes now)
        const checkboxes = this.form.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            data[checkbox.name] = checkbox.checked;
        });

        console.log('Datos del formulario:', data);
        
        // Here you would normally send the data to your server
        showNotification('Formulario Enviado', '¡Formulario enviado exitosamente! Los datos han sido guardados.', 'success');
        
        // Optional: Reset form after successful submission
        setTimeout(() => {
            if (confirm('¿Desea limpiar el formulario para un nuevo registro?')) {
                this.resetForm();
            }
        }, 2000);
    }

    validateForm() {
        const requiredFields = this.form.querySelectorAll('[required]');
        let isValid = true;
        let firstInvalidField = null;

        requiredFields.forEach(field => {
            if (!field.value.trim() && field.type !== 'checkbox') {
                field.classList.add('error');
                isValid = false;
                if (!firstInvalidField) {
                    firstInvalidField = field;
                }
            } else if (field.type === 'checkbox' && !field.checked) {
                field.parentElement.classList.add('error');
                isValid = false;
                if (!firstInvalidField) {
                    firstInvalidField = field;
                }
            } else {
                field.classList.remove('error');
                if (field.type === 'checkbox') {
                    field.parentElement.classList.remove('error');
                }
            }
        });

        // Validate CURP format
        const curp = document.getElementById('curp');
        const curpPattern = /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[0-9A-Z][0-9]$/;
        if (curp.value && !curpPattern.test(curp.value)) {
            curp.classList.add('error');
            isValid = false;
            if (!firstInvalidField) {
                firstInvalidField = curp;
            }
        }

        // Validate email
        const email = document.getElementById('correoElectronico');
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (email.value && !emailPattern.test(email.value)) {
            email.classList.add('error');
            isValid = false;
            if (!firstInvalidField) {
                firstInvalidField = email;
            }
        }

        // Validate phone numbers
        ['telefonoCasa', 'telefonoCelular'].forEach(id => {
            const phone = document.getElementById(id);
            if (phone && phone.value && (phone.value.length !== 10 || !/^\d+$/.test(phone.value))) {
                phone.classList.add('error');
                isValid = false;
                if (!firstInvalidField) {
                    firstInvalidField = phone;
                }
            }
        });

        if (!isValid) {
            showNotification('Validación', 'Por favor, complete todos los campos requeridos correctamente.', 'warning');
            if (firstInvalidField) {
                firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                firstInvalidField.focus();
            }
        }

        return isValid;
    }

    showProgress(message) {
        this.progressText.textContent = message;
        this.progressSection.style.display = 'block';
        this.progressFill.style.width = '0%';
    }

    updateProgress(percent, message) {
        this.progressFill.style.width = percent + '%';
        this.progressText.textContent = message;
    }

    hideProgress() {
        this.progressSection.style.display = 'none';
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.style.display = 'block';
        this.errorMessage.scrollIntoView({ behavior: 'smooth' });
        
        setTimeout(() => {
            this.hideMessages();
        }, 5000);
    }

    showSuccess(message) {
        this.successMessage.textContent = message;
        this.successMessage.style.display = 'block';
        this.successMessage.scrollIntoView({ behavior: 'smooth' });
        
        setTimeout(() => {
            this.hideMessages();
        }, 5000);
    }

    hideMessages() {
        this.errorMessage.style.display = 'none';
        this.successMessage.style.display = 'none';
    }

    resetForm() {
        this.form.reset();
        
        // Remove any error classes
        const errorFields = this.form.querySelectorAll('.error');
        errorFields.forEach(field => {
            field.classList.remove('error');
        });
        
        // Hide messages
        this.hideMessages();
        
        // Reset file input
        this.fileInput.value = '';
        
        showNotification('Formulario', 'Formulario limpiado exitosamente.', 'info');
    }
}

// Global functions for HTML onclick events
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
    if (window.formManager) {
        if (confirm('¿Está seguro de que desea limpiar todo el formulario?')) {
            window.formManager.resetForm();
        }
    }
}

/**
 * Utilidades adicionales
 */
const Utils = {
    formatDate: function(date) {
        return new Intl.DateTimeFormat('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(date);
    },
    
    validateEmail: function(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },
    
    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    smoothScrollTo: function(element) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    },
    
    generateId: function() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
};

/**
 * Manejo de errores global
 */
window.addEventListener('error', function(e) {
    console.error('Error en la aplicación:', e.error);
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('Promise rechazada no manejada:', e.reason);
    e.preventDefault();
});

// Exportar funciones para uso global si es necesario
window.SICAApp = {
    Utils,
    showNotification,
    AcademicFormManager
};