// document-preview.js - Módulo de previsualización de documentos
class DocumentPreview {
    constructor() {
        this.previewContainer = null;
        this.currentDoc = null;
        this.currentData = {};
        this.templates = this.initTemplates();
        this.isRendering = false;
    }

    // ================================
    // INICIALIZACIÓN
    // ================================
    init() {
        console.log('👁️ Inicializando DocumentPreview...');
        this.setupElements();
        this.setupEventListeners();
        console.log('✅ DocumentPreview inicializado');
    }

    setupElements() {
        this.previewContainer = document.getElementById('previewDocument');
    }

    setupEventListeners() {
        // Escuchar cambios en el tamaño de la ventana para ajustar preview
        window.addEventListener('resize', () => {
            this.debounceResize();
        });
    }

    debounceResize() {
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        
        this.resizeTimeout = setTimeout(() => {
            this.adjustPreviewSize();
        }, 300);
    }

    // ================================
    // TEMPLATES DE DOCUMENTOS
    // ================================
    initTemplates() {
        return {
            'carta-aceptacion-fq': {
                title: 'Carta de Aceptación - Facultad de Química',
                structure: this.getCartaAceptacionFQTemplate(),
                styles: this.getDocumentStyles()
            },
            'carta-aceptacion-prepa': {
                title: 'Carta de Aceptación - Preparatoria',
                structure: this.getCartaAceptacionPrepaTemplate(),
                styles: this.getDocumentStyles()
            },
            'carta-termino-fq': {
                title: 'Carta de Término - Facultad de Química',
                structure: this.getCartaTerminoFQTemplate(),
                styles: this.getDocumentStyles()
            },
            'carta-termino-prepa': {
                title: 'Carta de Término - Preparatoria',
                structure: this.getCartaTerminoPrepaTemplate(),
                styles: this.getDocumentStyles()
            },
            'evaluacion': {
                title: 'Evaluación de Desempeño',
                structure: this.getEvaluacionTemplate(),
                styles: this.getDocumentStyles()
            }
        };
    }

    getDocumentStyles() {
        return `
            <style>
                .document-preview {
                    background: white;
                    padding: 40px;
                    margin: 20px auto;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                    border-radius: 8px;
                    font-family: 'Times New Roman', serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 800px;
                    min-height: 1000px;
                }
                
                .document-header {
                    display: flex;
                    align-items: center;
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                    border-bottom: 2px solid #202c56;
                }
                
                .logo-placeholder {
                    width: 80px;
                    height: 80px;
                    background: linear-gradient(135deg, #202c56, #ac965a);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: bold;
                    font-size: 12px;
                    margin-right: 30px;
                    flex-shrink: 0;
                }
                
                .header-text {
                    flex: 1;
                    text-align: right;
                }
                
                .header-title {
                    font-size: 18px;
                    font-weight: bold;
                    color: #202c56;
                    margin: 0;
                }
                
                .header-subtitle {
                    font-size: 14px;
                    color: #666;
                    margin: 5px 0;
                }
                
                .folio-section {
                    text-align: right;
                    margin: 20px 0;
                    font-weight: bold;
                    color: #202c56;
                }
                
                .document-body {
                    margin: 30px 0;
                }
                
                .addressee {
                    margin-bottom: 30px;
                    font-weight: bold;
                }
                
                .document-content {
                    text-align: justify;
                    margin: 20px 0;
                }
                
                .signature-section {
                    margin-top: 50px;
                    text-align: center;
                }
                
                .signature-line {
                    border-top: 1px solid #333;
                    width: 200px;
                    margin: 30px auto 10px;
                }
                
                .field-highlight {
                    background: #fff3cd;
                    padding: 2px 4px;
                    border-radius: 3px;
                    font-weight: bold;
                    color: #856404;
                }
                
                .date-field {
                    color: #202c56;
                    font-weight: bold;
                }
                
                .loading-preview {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 400px;
                    color: #666;
                }
                
                .preview-error {
                    background: #f8d7da;
                    color: #721c24;
                    padding: 20px;
                    border-radius: 8px;
                    text-align: center;
                }
            </style>
        `;
    }

    // ================================
    // TEMPLATES ESPECÍFICOS
    // ================================
    getCartaAceptacionFQTemplate() {
        return `
            <div class="document-preview">
                <div class="document-header">
                    <div class="logo-placeholder">
                        LOGO<br>FQ
                    </div>
                    <div class="header-text">
                        <h2 class="header-title">FACULTAD DE QUÍMICA UNAM</h2>
                        <p class="header-subtitle">SECRETARÍA DE PLANEACIÓN E INFORMÁTICA</p>
                        <p class="header-subtitle">CENTRO DE INFORMÁTICA Y SICAS</p>
                    </div>
                </div>
                
                <div class="folio-section">
                    FOLIO: <span class="field-highlight">{{folio}}</span>
                </div>
                
                <div class="folio-section">
                    Asunto: Carta de aceptación.
                </div>
                
                <div class="document-body">
                    <div class="addressee">
                        MVZ GRISELL MORENO MORALES<br>
                        COORDINADORA<br>
                        FACULTAD DE QUÍMICA<br>
                        PRESENTE
                    </div>
                    
                    <div class="attention-section" style="text-align: right; margin-bottom: 20px;">
                        <strong>ATENCIÓN. LIC. ALBERTO PINEDA JIMÉNEZ<br>
                        RESPONSABLE DEL ÁREA DE SERVICIO SOCIAL</strong>
                    </div>
                    
                    <div class="document-content">
                        <p>Por este conducto me permito informar a usted, que el alumno (a) 
                        <span class="field-highlight">{{nombreAsesor}}</span>, con número de cuenta 
                        <span class="field-highlight">{{numeroCuenta}}</span>, inscrito en la 
                        <span class="field-highlight">{{carrera}}</span>, ha sido aceptado para poder realizar 
                        su servicio social, durante un periodo de <strong>6</strong> meses, en el programa de trabajo 
                        "<span class="field-highlight">{{programa}}</span>" con clave 
                        <span class="field-highlight">{{clavePrograma}}</span>. Su colaboración tendrá inicio a partir del 
                        <span class="field-highlight date-field">{{fechaInicio}}</span> y concluirá el 
                        <span class="field-highlight date-field">{{fechaTermino}}</span>, cubriendo un total de 
                        <strong>20</strong> horas a la semana y <strong>480</strong> horas totales.</p>
                        
                        <p>Sin otro particular, agradezco la atención prestada a la presente, reciba un cordial saludo.</p>
                    </div>
                    
                    <div class="signature-section">
                        <p><strong>ATENTAMENTE</strong></p>
                        <p><strong>"POR MI RAZA HABLARÁ EL ESPÍRITU"</strong></p>
                        
                        <div style="margin-top: 40px;">
                            <div style="display: flex; justify-content: space-between; margin-top: 50px;">
                                <div style="text-align: center;">
                                    <div class="signature-line"></div>
                                    <p><strong>Ing. Edgar López García</strong><br>
                                    Responsable de servicio social<br>
                                    SICA</p>
                                </div>
                                
                                <div style="text-align: center;">
                                    <div class="signature-line"></div>
                                    <p><strong>p.IQ Marcos René López Hernández</strong><br>
                                    Jefe de Área Salas de Informática y<br>
                                    Cómputo para Alumnos (SICA)</p>
                                </div>
                            </div>
                        </div>
                        
                        <div style="text-align: left; margin-top: 30px;">
                            <small>c.c.p.- El alumno.</small>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getCartaAceptacionPrepaTemplate() {
        return `
            <div class="document-preview">
                <div class="document-header">
                    <div class="logo-placeholder">
                        LOGO<br>FQ
                    </div>
                    <div class="header-text">
                        <h2 class="header-title">FACULTAD DE QUÍMICA</h2>
                        <p class="header-subtitle">SECRETARÍA DE PLANEACIÓN E INFORMÁTICA</p>
                        <p class="header-subtitle">CENTRO DE INFORMÁTICA</p>
                    </div>
                </div>
                
                <div class="folio-section">
                    FOLIO: <span class="field-highlight">{{folio}}</span>
                </div>
                
                <div class="folio-section">
                    <span class="date-field">Ciudad de México a {{fechaActual}}</span>
                </div>
                
                <div class="folio-section">
                    Asunto: Carta de aceptación Servicio Social.
                </div>
                
                <div class="document-body">
                    <div class="addressee">
                        LIC. ADANELY PÉREZ RODRÍGUEZ<br>
                        COORDINADORA GENERAL DE LOS ESTUDIOS<br>
                        TÉCNICOS ESPECIALIZADOS DE LA<br>
                        ESCUELA NACIONAL PREPARATORIA<br>
                        PRESENTE
                    </div>
                    
                    <div class="document-content">
                        <p>Por este conducto me permito informar a usted, que el alumno (a) 
                        <span class="field-highlight">{{nombreAsesor}}</span>, con número de cuenta 
                        <span class="field-highlight">{{numeroCuenta}}</span> inscrito en la 
                        <span class="field-highlight">{{carrera}}</span>, ha sido aceptado para poder concluir 
                        su servicio social, durante un periodo de <strong>6</strong> meses, en el programa de trabajo 
                        "<span class="field-highlight">{{programa}}</span>" con clave 
                        <span class="field-highlight">{{clavePrograma}}</span>, que se llevará a cabo en las salas SICA 
                        de la facultad de Química UNAM, su colaboración tendrá inicio a partir del 
                        <span class="field-highlight date-field">{{fechaInicio}}</span> y concluirá el 
                        <span class="field-highlight date-field">{{fechaTermino}}</span>, en un horario de 9:00 a 13:00, 
                        cubriendo <strong>480</strong> horas totales.</p>
                        
                        <p>Sin otro particular, agradezco la atención prestada a la presente, reciba un cordial saludo.</p>
                    </div>
                    
                    <div class="signature-section">
                        <p><strong>ATENTAMENTE</strong></p>
                        <p><strong>"POR MI RAZA HABLARÁ EL ESPÍRITU"</strong></p>
                        
                        <div style="margin-top: 40px;">
                            <div style="display: flex; justify-content: space-between; margin-top: 50px;">
                                <div style="text-align: center;">
                                    <div class="signature-line"></div>
                                    <p><strong>Ing. Edgar López García</strong><br>
                                    Responsable de servicio social SICA</p>
                                </div>
                                
                                <div style="text-align: center;">
                                    <div class="signature-line"></div>
                                    <p><strong>p.IQ Marcos René López Hernández</strong><br>
                                    Jefe de Área Salas de Informática y<br>
                                    Cómputo para Alumnos (SICA)</p>
                                </div>
                            </div>
                        </div>
                        
                        <div style="text-align: left; margin-top: 30px;">
                            <small>c.c.p.- El alumno.</small>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getCartaTerminoFQTemplate() {
        return `
            <div class="document-preview">
                <div class="document-header">
                    <div class="logo-placeholder">
                        LOGO<br>FQ
                    </div>
                    <div class="header-text">
                        <h2 class="header-title">FACULTAD DE QUÍMICA UNAM</h2>
                        <p class="header-subtitle">SECRETARÍA DE PLANEACIÓN E INFORMÁTICA</p>
                        <p class="header-subtitle">CENTRO DE INFORMÁTICA Y SICAS</p>
                    </div>
                </div>
                
                <div class="folio-section">
                    FOLIO: <span class="field-highlight">{{folio}}</span>
                </div>
                
                <div class="folio-section">
                    Asunto: Carta de término
                </div>
                
                <div class="document-body">
                    <div class="addressee">
                        MVZ GRISELL MORENO MORALES<br>
                        COORDINADORA DE ATENCIÓN A ALUMNOS<br>
                        FACULTAD DE QUÍMICA<br>
                        PRESENTE
                    </div>
                    
                    <div class="attention-section" style="text-align: right; margin-bottom: 20px;">
                        <strong>ATENCIÓN. LIC. ALBERTO PINEDA JIMÉNEZ<br>
                        RESPONSABLE DEL ÁREA DE SERVICIO SOCIAL</strong>
                    </div>
                    
                    <div class="document-content">
                        <p>Por este conducto me permito informar a usted, que el alumno (a) 
                        <span class="field-highlight">{{nombreAsesor}}</span>, con número de cuenta 
                        <span class="field-highlight">{{numeroCuenta}}</span>, de la Licenciatura en 
                        <span class="field-highlight">{{carrera}}</span> concluyó satisfactoriamente su Servicio Social, 
                        cumpliendo las <strong>480</strong> horas reglamentarias, en el programa 
                        "<span class="field-highlight">{{programa}}</span>" con clave 
                        <span class="field-highlight">{{clavePrograma}}</span>, en el periodo comprendido del 
                        <span class="field-highlight date-field">{{fechaInicio}}</span> al 
                        <span class="field-highlight date-field">{{fechaTermino}}</span>, cumpliendo las siguientes actividades:</p>
                        
                        <div style="margin: 20px 0;">
                            <p><strong>ACTIVIDADES DESARROLLADAS</strong></p>
                            <ul style="text-align: left;">
                                <li>Préstamo de equipos de cómputo a los alumnos de la facultad de química.</li>
                                <li>Atención al servicio de impresiones.</li>
                                <li>Apoyo en departamentales.</li>
                                <li>Apoyo en cursos y clases impartidas en la sala de cómputo.</li>
                                <li>Atención a usuarios con problemas con los equipos.</li>
                            </ul>
                        </div>
                        
                        <p>Sin otro particular, agradezco la atención prestada a la presente, reciba un cordial saludo.</p>
                    </div>
                    
                    <div class="signature-section">
                        <p><strong>ATENTAMENTE</strong></p>
                        <p><strong>"POR MI RAZA HABLARÁ EL ESPÍRITU"</strong></p>
                        
                        <p class="date-field">Ciudad Universitaria, Cd. Mx., a {{fechaActual}}</p>
                        
                        <div style="margin-top: 40px;">
                            <div style="display: flex; justify-content: space-between; margin-top: 50px;">
                                <div style="text-align: center;">
                                    <div class="signature-line"></div>
                                    <p><strong>Por la dependencia:</strong><br>
                                    <strong>Ing. Edgar López García</strong><br>
                                    Responsable de servicio social SICA</p>
                                </div>
                                
                                <div style="text-align: center;">
                                    <div class="signature-line"></div>
                                    <p><strong>p.IQ Marcos René López Hernández</strong><br>
                                    Jefe de Área Salas de Informática y<br>
                                    Cómputo para Alumnos</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getCartaTerminoPrepaTemplate() {
        return `
            <div class="document-preview">
                <div class="document-header">
                    <div class="logo-placeholder">
                        LOGO<br>FQ
                    </div>
                    <div class="header-text">
                        <h2 class="header-title">FACULTAD DE QUÍMICA</h2>
                        <p class="header-subtitle">SECRETARÍA DE PLANEACIÓN E INFORMÁTICA</p>
                        <p class="header-subtitle">CENTRO DE INFORMÁTICA</p>
                    </div>
                </div>
                
                <div class="folio-section">
                    FOLIO: <span class="field-highlight">{{folio}}</span>
                </div>
                
                <div class="folio-section">
                    <span class="date-field">Ciudad de México a {{fechaActual}}</span>
                </div>
                
                <div class="folio-section">
                    Asunto: Carta de término de Servicio Social.
                </div>
                
                <div class="document-body">
                    <div class="addressee">
                        MTRA. ADANELY PÉREZ RODRÍGUEZ<br>
                        COORDINADORA GENERAL DE LOS ESTUDIOS<br>
                        TÉCNICOS ESPECIALIZADOS DE LA<br>
                        ESCUELA NACIONAL PREPARATORIA<br>
                        PRESENTE
                    </div>
                    
                    <div class="document-content">
                        <p>Por este conducto me permito informar a usted, que el alumno (a) 
                        <span class="field-highlight">{{nombreAsesor}}</span> con número de cuenta 
                        <span class="field-highlight">{{numeroCuenta}}</span>, inscrito en la 
                        <span class="field-highlight">{{carrera}}</span>, ha concluido satisfactoriamente 
                        su servicio social, durante un periodo de <strong>6</strong> meses, en el programa de trabajo 
                        "<span class="field-highlight">{{programa}}</span>" con clave 
                        <span class="field-highlight">{{clavePrograma}}</span>, que se llevó a cabo en el área de SICA 
                        de la Facultad de Química UNAM, su colaboración en el periodo comprendido del 
                        <span class="field-highlight date-field">{{fechaInicio}}</span> al 
                        <span class="field-highlight date-field">{{fechaTermino}}</span>, en un horario de 9:00 a 13:00, 
                        cubriendo <strong>480</strong> horas totales.</p>
                        
                        <p>Sin otro particular, agradezco la atención prestada a la presente, reciba un cordial saludo.</p>
                    </div>
                    
                    <div class="signature-section">
                        <p><strong>ATENTAMENTE</strong></p>
                        <p><strong>"POR MI RAZA HABLARÁ EL ESPÍRITU"</strong></p>
                        
                        <p class="date-field">Cd. Universitaria, CDMX {{fechaActual}} <strong>SELLO</strong></p>
                        
                        <div style="margin-top: 40px;">
                            <div style="display: flex; justify-content: space-between; margin-top: 50px;">
                                <div style="text-align: center;">
                                    <div class="signature-line"></div>
                                    <p><strong>Ing. Edgar López García</strong><br>
                                    Responsable de servicio social SICA</p>
                                </div>
                                
                                <div style="text-align: center;">
                                    <div class="signature-line"></div>
                                    <p><strong>p.IQ Marcos René López Hernández</strong><br>
                                    Jefe de Área Salas de Informática y<br>
                                    Cómputo para Alumnos (SICA)</p>
                                </div>
                            </div>
                        </div>
                        
                        <div style="text-align: left; margin-top: 30px;">
                            <small>c.c.p.- El alumno</small>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getEvaluacionTemplate() {
        return `
            <div class="document-preview">
                <div class="document-header">
                    <div class="logo-placeholder">
                        LOGO<br>SICA
                    </div>
                    <div class="header-text">
                        <h2 class="header-title">EVALUACIÓN DE DESEMPEÑO</h2>
                        <p class="header-subtitle">SERVICIO SOCIAL - SICA</p>
                    </div>
                </div>
                
                <div class="folio-section">
                    FOLIO: <span class="field-highlight">{{folio}}</span>
                </div>
                
                <div class="document-body">
                    <div class="document-content">
                        <h3 style="color: #202c56; text-align: center;">EVALUACIÓN DE SERVICIO SOCIAL</h3>
                        
                        <div style="margin: 30px 0; border: 1px solid #ccc; padding: 20px; border-radius: 8px;">
                            <p><strong>Datos del Estudiante:</strong></p>
                            <p><strong>Nombre:</strong> <span class="field-highlight">{{nombreAsesor}}</span></p>
                            <p><strong>Número de Cuenta:</strong> <span class="field-highlight">{{numeroCuenta}}</span></p>
                            <p><strong>Carrera:</strong> <span class="field-highlight">{{carrera}}</span></p>
                            <p><strong>Período:</strong> <span class="field-highlight date-field">{{fechaInicio}}</span> al <span class="field-highlight date-field">{{fechaTermino}}</span></p>
                        </div>
                        
                        <div style="margin: 30px 0;">
                            <h4 style="color: #202c56;">Criterios de Evaluación:</h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
                                <div>
                                    <p><strong>□ Puntualidad</strong></p>
                                    <p><strong>□ Responsabilidad</strong></p>
                                    <p><strong>□ Iniciativa</strong></p>
                                </div>
                                <div>
                                    <p><strong>□ Trabajo en equipo</strong></p>
                                    <p><strong>□ Conocimientos técnicos</strong></p>
                                    <p><strong>□ Actitud de servicio</strong></p>
                                </div>
                            </div>
                        </div>
                        
                        <div style="margin: 30px 0;">
                            <h4 style="color: #202c56;">Observaciones:</h4>
                            <div style="border: 1px solid #ccc; min-height: 100px; padding: 10px; border-radius: 4px;">
                                <p style="color: #999; font-style: italic;">Espacio para observaciones y comentarios...</p>
                            </div>
                        </div>
                        
                        <div style="margin: 30px 0;">
                            <h4 style="color: #202c56;">Calificación Final:</h4>
                            <div style="display: flex; gap: 20px; margin-top: 10px;">
                                <label><strong>□ Excelente (10)</strong></label>
                                <label><strong>□ Muy Bueno (9)</strong></label>
                                <label><strong>□ Bueno (8)</strong></label>
                                <label><strong>□ Suficiente (7)</strong></label>
                            </div>
                        </div>
                    </div>
                    
                    <div class="signature-section">
                        <div style="display: flex; justify-content: space-between; margin-top: 80px;">
                            <div style="text-align: center;">
                                <div class="signature-line"></div>
                                <p><strong>Responsable SICA</strong></p>
                            </div>
                            
                            <div style="text-align: center;">
                                <div class="signature-line"></div>
                                <p><strong>Jefe de Área</strong></p>
                            </div>
                        </div>
                        
                        <div style="text-align: center; margin-top: 40px;">
                            <p class="date-field">Fecha: {{fechaActual}}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ================================
    // ACTUALIZACIÓN DE PREVIEW
    // ================================
    updatePreview(docType, formData) {
        if (this.isRendering) return;
        
        this.isRendering = true;
        this.currentDoc = docType;
        this.currentData = formData;
        
        // Mostrar loading
        this.showLoading();
        
        // Simular delay para suavizar la transición
        setTimeout(() => {
            this.renderPreview(docType, formData);
            this.isRendering = false;
        }, 300);
    }

    showLoading() {
        if (this.previewContainer) {
            this.previewContainer.innerHTML = `
                <div class="loading-preview">
                    <div class="spinner-border text-primary me-3" role="status">
                        <span class="visually-hidden">Generando vista previa...</span>
                    </div>
                    <div>
                        <p class="mb-1">Generando vista previa...</p>
                        <small class="text-muted">Procesando documento</small>
                    </div>
                </div>
            `;
        }
    }

    renderPreview(docType, formData) {
        try {
            if (!this.previewContainer) {
                throw new Error('Contenedor de vista previa no encontrado');
            }
            
            const template = this.templates[docType.type];
            if (!template) {
                throw new Error('Plantilla de documento no encontrada');
            }
            
            // Preparar datos con valores por defecto
            const processedData = this.prepareData(formData);
            
            // Reemplazar placeholders en el template
            let html = template.structure;
            
            Object.keys(processedData).forEach(key => {
                const regex = new RegExp(`{{${key}}}`, 'g');
                html = html.replace(regex, processedData[key] || `[${key}]`);
            });
            
            // Agregar estilos y contenido
            this.previewContainer.innerHTML = template.styles + html;
            
            // Añadir efecto fade-in
            this.previewContainer.classList.add('fade-in');
            
            // Esperar a que el DOM se actualice antes de ajustar tamaño
            setTimeout(() => {
                this.adjustPreviewSize();
            }, 100);
            
        } catch (error) {
            console.error('Error renderizando vista previa:', error);
            this.showError(error.message);
        }
    }

    prepareData(formData) {
        const today = new Date();
        const currentDate = today.toLocaleDateString('es-MX', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        
        return {
            ...formData,
            fechaActual: currentDate,
            fechaInicio: this.formatDate(formData.fechaInicio),
            fechaTermino: this.formatDate(formData.fechaTermino),
            nombreAsesor: formData.nombreAsesor || '[Nombre del Asesor]',
            numeroCuenta: formData.numeroCuenta || '[Número de Cuenta]',
            carrera: formData.carrera || '[Carrera]',
            programa: formData.programa || 'Sala de informática y cómputo para alumnos (SICA)',
            clavePrograma: formData.clavePrograma || 'DGOSE-CI-001',
            folio: formData.folio || '[FOLIO]'
        };
    }

    formatDate(dateString) {
        if (!dateString) return '[Fecha]';
        
        try {
            // Agregar tiempo local para evitar problemas de zona horaria
            const [year, month, day] = dateString.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            
            return date.toLocaleDateString('es-MX', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        } catch (error) {
            return dateString;
        }
    }

    showError(message) {
        if (this.previewContainer) {
            this.previewContainer.innerHTML = `
                <div class="preview-error">
                    <i class="bi bi-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                    <h5>Error en la vista previa</h5>
                    <p>${message}</p>
                    <button class="btn btn-outline-danger btn-sm" onclick="window.documentPreview.retryPreview()">
                        <i class="bi bi-arrow-clockwise"></i> Reintentar
                    </button>
                </div>
            `;
        }
    }

    retryPreview() {
        if (this.currentDoc && this.currentData) {
            this.updatePreview(this.currentDoc, this.currentData);
        }
    }

    // ================================
    // UTILIDADES
    // ================================
    adjustPreviewSize() {
        if (!this.previewContainer) return;
        
        const container = this.previewContainer.parentElement;
        if (!container) return;
        
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        // Resetear transformación antes de calcular
        this.previewContainer.style.transform = 'none';
        
        // Ajustar el preview para que se vea bien en el contenedor
        const preview = this.previewContainer.querySelector('.document-preview');
        if (preview) {
            // Obtener dimensiones reales del documento
            const previewWidth = preview.offsetWidth;
            const previewHeight = preview.offsetHeight;
            
            // Calcular scale apropiado con margen
            const scaleX = (containerWidth - 40) / previewWidth; // 40px de margen
            const scaleY = (containerHeight - 40) / previewHeight;
            const scale = Math.min(scaleX, scaleY, 1); // No hacer zoom mayor a 100%
            
            if (scale < 1) {
                this.previewContainer.style.transform = `scale(${scale})`;
                this.previewContainer.style.transformOrigin = 'top center';
                this.previewContainer.style.width = 'fit-content';
                this.previewContainer.style.margin = '0 auto';
            } else {
                this.previewContainer.style.transform = 'none';
                this.previewContainer.style.width = '100%';
                this.previewContainer.style.margin = '0';
            }
            
            // Actualizar indicador de zoom
            const zoomLevel = document.getElementById('zoomLevel');
            if (zoomLevel) {
                zoomLevel.textContent = `${Math.round(scale * 100)}%`;
            }
        }
    }

    clearPreview() {
        if (this.previewContainer) {
            this.previewContainer.innerHTML = `
                    <p>Selecciona un tipo de documento para ver la vista previa</p>
                </div>
            `;
        }
        
        this.currentDoc = null;
        this.currentData = {};
    }

    exportPreview() {
        if (!this.currentDoc) {
            throw new Error('No hay documento para exportar');
        }
        
        return {
            docType: this.currentDoc,
            data: this.currentData,
            html: this.previewContainer.innerHTML,
            timestamp: new Date().toISOString()
        };
    }

    // ================================
    // MÉTODOS PÚBLICOS
    // ================================
    getAvailableTemplates() {
        return Object.keys(this.templates).map(key => ({
            type: key,
            title: this.templates[key].title
        }));
    }

    validateTemplate(docType) {
        return !!this.templates[docType];
    }

    setCustomTemplate(docType, template) {
        this.templates[docType] = {
            title: template.title || 'Plantilla Personalizada',
            structure: template.structure,
            styles: template.styles || this.getDocumentStyles()
        };
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Esperar a que otros módulos estén disponibles
    const initPreview = () => {
        if (window.folioManager && window.folioConfig) {
            window.documentPreview = new DocumentPreview();
            window.documentPreview.init();
        } else {
            setTimeout(initPreview, 100);
        }
    };
    
    setTimeout(initPreview, 1000);
});

// Exportar para uso global
window.DocumentPreview = DocumentPreview;