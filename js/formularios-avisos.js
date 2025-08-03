let formulariosDB;
let formulariosAuth;

// Configuraciones de formularios
const formConfigs = {
    'registro-asesor': {
        title: 'Convocatoria Registro de Asesor',
        type: 'whatsapp',
        icon: 'bi-person-plus',
        fields: [
            { name: 'numeros', label: 'Números de WhatsApp', type: 'textarea', placeholder: 'Un número por línea (ej: 5551234567)', required: true },
            { name: 'fecha_limite', label: 'Fecha Límite de Registro', type: 'date', required: true },
            { name: 'mensaje_adicional', label: 'Mensaje Adicional (opcional)', type: 'textarea', rows: 3, placeholder: 'Información extra sobre la convocatoria...' }
        ]
    },

    // ✅ ACTUALIZADO: Configuración para Actualización de Datos
    'actualizacion-datos': {
        title: 'Actualización de Datos',
        type: 'url',
        icon: 'bi-arrow-clockwise',
        fields: [
            { 
                name: 'mensaje_completo', 
                label: 'Mensaje para el Grupo SICA', 
                type: 'message_display', 
                value: `📋 *ACTUALIZACIÓN DE DOCUMENTOS - SICA*

¡Hola compañeras y compañeros asesores! 👋

Es necesario que actualicen sus documentos personales en el sistema SICA para mantener su información al día.

🔗 *ACCEDE AL FORMULARIO:*
https://sica-a5c24.web.app/view/actualizacion-datos.html

📄 *DOCUMENTOS REQUERIDOS:*
• Historial Académico actualizado
• Comprobante de Domicilio reciente (Julio/Agosto 2025)
• CURP
• INE (ambos lados en un solo archivo)
• Credencial UNAM (ambos lados en un solo archivo)

⏰ *IMPORTANTE:* Por favor completen la actualización lo antes posible para evitar inconvenientes.

Si tienen dudas, pueden contactar al equipo administrativo.

¡Gracias por su colaboración! 🙌

*Equipo SICA - Facultad de Química, UNAM* 🧪⚗️`,
                readonly: true 
            }
        ]
    },

    // ✅ NUEVO: Configuración para Comprobante de Inscripción
    'comprobante-inscripcion': {
        title: 'Actualizar Comprobante de Inscripción',
        type: 'url',
        icon: 'bi-file-earmark-check',
        fields: [
            { 
                name: 'mensaje_completo', 
                label: 'Mensaje para el Grupo SICA', 
                type: 'message_display', 
                value: `📚 *ACTUALIZACIÓN DE COMPROBANTE DE INSCRIPCIÓN - SICA*

¡Hola compañeras y compañeros asesores! 👋

Es necesario que actualicen su comprobante de inscripción en el sistema SICA para el semestre actual.

🔗 *ACCEDE AL FORMULARIO:*
https://sica-a5c24.web.app/view/comprobante-inscripcion.html

📋 *DOCUMENTO REQUERIDO:*
• Comprobante de Inscripción actualizado del semestre 2025-2
• El documento debe estar en formato PDF
• Verificar que contenga todos los datos legibles

📅 *SEMESTRE ACTUAL:* 2025-2

⏰ *IMPORTANTE:* Por favor suban su comprobante actualizado lo antes posible para mantener activo su estatus como asesor.

Si tienen dudas sobre cómo obtener su comprobante de inscripción:
• Ingresen al portal de alumnos UNAM
• Sección "Servicios Escolares"
• Generar comprobante de inscripción

¡Gracias por mantener sus documentos actualizados! 🙌

*Equipo SICA - Facultad de Química, UNAM* 🧪⚗️`,
                readonly: true 
            }
        ]
    },
    
    'becas': {
        title: 'Aviso de Entrega de Becas',
        type: 'email',
        icon: 'bi-trophy',
        fields: [
            { name: 'destinatarios', label: 'Beneficiarios', type: 'email', multiple: true, required: true },
            { name: 'asunto', label: 'Asunto', type: 'text', value: 'Notificación de Entrega de Beca - UNAM', required: true },
            { name: 'tipo_beca', label: 'Tipo de Beca', type: 'select', options: ['Beca de Excelencia', 'Beca de Apoyo', 'Beca de Investigación'], required: true },
            { name: 'monto', label: 'Monto de la Beca', type: 'number', required: true },
            { name: 'fecha_entrega', label: 'Fecha de Entrega', type: 'date', required: true },
            { name: 'lugar_entrega', label: 'Lugar de Entrega', type: 'text', required: true },
            { name: 'documentos', label: 'Documentos Requeridos', type: 'textarea', rows: 3 }
        ]
    },
    'protocolo-instalacion': {
        title: 'Protocolo de Instalación',
        type: 'email',
        icon: 'bi-gear',
        fields: [
            { name: 'destinatarios', label: 'Destinatarios', type: 'email', multiple: true, required: true },
            { name: 'asunto', label: 'Asunto', type: 'text', value: 'Protocolo de Instalación de Software - SICA', required: true },
            { name: 'software', label: 'Software a Instalar', type: 'text', required: true },
            { name: 'version', label: 'Versión', type: 'text', required: true },
            { name: 'sistema_operativo', label: 'Sistema Operativo', type: 'select', options: ['Windows 10/11', 'macOS', 'Linux', 'Todos'], required: true },
            { name: 'prioridad', label: 'Prioridad', type: 'select', options: ['Baja', 'Media', 'Alta', 'Crítica'], required: true }
        ]
    },
    'reunion-navidena': {
        title: 'Invitación Reunión Navideña',
        type: 'whatsapp',
        icon: 'bi-calendar-heart',
        fields: [
            { name: 'numeros', label: 'Números de WhatsApp', type: 'textarea', placeholder: 'Un número por línea', required: true },
            { name: 'fecha_evento', label: 'Fecha del Evento', type: 'datetime-local', required: true },
            { name: 'lugar', label: 'Lugar del Evento', type: 'text', required: true },
            { name: 'dress_code', label: 'Código de Vestimenta', type: 'text' },
            { name: 'mensaje_adicional', label: 'Mensaje Adicional', type: 'textarea', rows: 3 }
        ]
    },
    'encuesta-usuarios': {
        title: 'Encuesta de Servicio para Usuarios',
        type: 'survey',
        icon: 'bi-people',
        fields: [
            { name: 'titulo_encuesta', label: 'Título de la Encuesta', type: 'text', value: 'Evaluación del Servicio SICA', required: true },
            { name: 'descripcion', label: 'Descripción', type: 'textarea', rows: 3, required: true },
            { name: 'destinatarios', label: 'Destinatarios', type: 'email', multiple: true, required: true },
            { name: 'tipo_usuarios', label: 'Tipo de Usuarios', type: 'select', options: ['Estudiantes', 'Profesores', 'Personal', 'Todos'], required: true },
            { name: 'fecha_limite', label: 'Fecha Límite de Respuesta', type: 'date', required: true },
            { name: 'anonimo', label: 'Encuesta Anónima', type: 'checkbox', checked: true }
        ]
    },
    'encuesta-asesores': {
        title: 'Encuesta para Asesores',
        type: 'survey',
        icon: 'bi-headset',
        fields: [
            { name: 'titulo_encuesta', label: 'Título de la Encuesta', type: 'text', value: 'Evaluación de Desempeño - Asesores SICA', required: true },
            { name: 'periodo_evaluacion', label: 'Período de Evaluación', type: 'text', required: true },
            { name: 'destinatarios', label: 'Asesores a Evaluar', type: 'email', multiple: true, required: true },
            { name: 'evaluador', label: 'Evaluado por', type: 'select', options: ['Supervisor', 'Compañeros', 'Usuarios', 'Autoevaluación'], required: true },
            { name: 'fecha_limite', label: 'Fecha Límite', type: 'date', required: true },
            { name: 'incluir_metricas', label: 'Incluir Métricas de Rendimiento', type: 'checkbox', checked: true }
        ]
    }
};

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    const checkFirebase = setInterval(() => {
        if (window.firebase && window.firebaseDB && window.firebaseAuth) {
            clearInterval(checkFirebase);
            initializeFormularios();
        }
    }, 100);
    
    setTimeout(() => {
        clearInterval(checkFirebase);
        if (!formulariosDB) {
            showNotification('Error de conexión con Firebase', 'error');
        }
    }, 10000);
});

async function initializeFormularios() {
    try {
        formulariosDB = window.firebaseDB;
        formulariosAuth = window.firebaseAuth;
        
        console.log('📋 Formularios y Avisos inicializados');
        
        // Verificar autenticación
        formulariosAuth.onAuthStateChanged(async (user) => {
            if (user) {
                await setupFormularios();
            } else {
                window.location.href = 'login.html';
            }
        });
        
    } catch (error) {
        console.error('❌ Error inicializando formularios:', error);
        showNotification('Error al cargar la página', 'error');
    }
}

async function setupFormularios() {
    try {
        // Configurar event listeners
        setupEventListeners();
        
        // Cargar estadísticas
        await loadStats();
        
        // Animar entrada de elementos
        animatePageLoad();
        
        console.log('✅ Formularios configurados correctamente');
        
    } catch (error) {
        console.error('❌ Error configurando formularios:', error);
    }
}

function setupEventListeners() {
    // Cards de opciones
    const optionCards = document.querySelectorAll('.option-card');
    optionCards.forEach(card => {
        card.addEventListener('click', () => {
            const type = card.getAttribute('data-type');
            const form = card.getAttribute('data-form');
            openFormConfig(type, form);
        });
    });
    
    // Botones de acciones rápidas
    const quickActions = {
        'historialBtn': showHistorial,
        'plantillasBtn': showPlantillas,
        'estadisticasBtn': showEstadisticas,
        'configBtn': showConfiguracion
    };
    
    Object.entries(quickActions).forEach(([id, handler]) => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('click', handler);
        }
    });
    
    // Botón de enviar en modal
    const enviarBtn = document.getElementById('enviarBtn');
    if (enviarBtn) {
        enviarBtn.addEventListener('click', handleFormSubmit);
    }
    
    console.log('🎧 Event listeners configurados');
}

function openFormConfig(type, formKey) {
    const config = formConfigs[formKey];
    if (!config) {
        showNotification('Configuración de formulario no encontrada', 'error');
        return;
    }
    
    // Actualizar título del modal
    const modalTitle = document.getElementById('modalTitle');
    modalTitle.innerHTML = `
        <i class="${config.icon} me-2"></i>
        ${config.title}
    `;
    
    // Generar formulario dinámico
    const configForm = document.getElementById('configForm');
    configForm.innerHTML = generateFormHTML(config.fields, type);
    
    // Configurar botón de envío
    const enviarBtn = document.getElementById('enviarBtn');
    enviarBtn.setAttribute('data-form-key', formKey);
    enviarBtn.setAttribute('data-form-type', type);
    
    // ✅ ACTUALIZAR texto del botón según el tipo
    if (formKey === 'actualizacion-datos' || formKey === 'comprobante-inscripcion') {
        // Para formularios de mensaje, ocultar el botón principal
        enviarBtn.style.display = 'none';
    } else {
        // Para otros formularios, mostrar botón normal
        enviarBtn.style.display = 'inline-block';
        const buttonTexts = {
            'email': 'Enviar Email',
            'whatsapp': 'Enviar WhatsApp',
            'survey': 'Crear Encuesta',
            'url': 'Compartir Mensaje'
        };
        
        enviarBtn.innerHTML = `
            <i class="bi ${getTypeIcon(type)} me-1"></i>
            ${buttonTexts[type] || 'Enviar'}
        `;
    }
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('formConfigModal'));
    modal.show();
}

function generateFormHTML(fields, type) {
    return fields.map(field => {
        let fieldHTML = '';
        
        switch (field.type) {
            case 'text':
            case 'email':
            case 'number':
            case 'date':
            case 'datetime-local':
                fieldHTML = `
                    <input 
                        type="${field.type}" 
                        class="form-control" 
                        id="${field.name}" 
                        name="${field.name}"
                        value="${field.value || ''}"
                        placeholder="${field.placeholder || ''}"
                        ${field.required ? 'required' : ''}
                        ${field.multiple ? 'multiple' : ''}
                        ${field.readonly ? 'readonly' : ''}
                    >
                `;
                break;
                
            case 'textarea':
                fieldHTML = `
                    <textarea 
                        class="form-control" 
                        id="${field.name}" 
                        name="${field.name}"
                        rows="${field.rows || 3}"
                        placeholder="${field.placeholder || ''}"
                        ${field.required ? 'required' : ''}
                        ${field.readonly ? 'readonly' : ''}
                    >${field.value || ''}</textarea>
                `;
                break;
                
            case 'select':
                fieldHTML = `
                    <select class="form-select" id="${field.name}" name="${field.name}" ${field.required ? 'required' : ''}>
                        <option value="">Seleccionar...</option>
                        ${field.options.map(option => `<option value="${option}">${option}</option>`).join('')}
                    </select>
                `;
                break;
                
            // ✅ SOPORTE para url_display
            case 'url_display':
                fieldHTML = `
                    <div class="input-group">
                        <input 
                            type="url" 
                            class="form-control" 
                            id="${field.name}" 
                            name="${field.name}"
                            value="${field.value || ''}"
                            readonly
                            style="background-color: #f8f9fa; color: #495057;"
                        >
                        <button class="btn btn-outline-primary" type="button" onclick="copyToClipboard('${field.value}')">
                            <i class="bi bi-clipboard"></i>
                        </button>
                    </div>
                `;
                break;
                
            // ✅ SOPORTE para message_display
            case 'message_display':
                fieldHTML = `
                    <div class="message-display-container" style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem;">
                        <div class="message-preview" style="font-family: 'Segoe UI', sans-serif; line-height: 1.5; color: #495057; white-space: pre-line; max-height: 300px; overflow-y: auto; border: 1px solid #e9ecef; padding: 1rem; border-radius: 6px; background: white;">
${field.value}
                        </div>
                        <div class="copy-section text-center mt-3">
                            <button class="btn btn-primary btn-lg" type="button" onclick="copyToClipboard(\`${field.value.replace(/`/g, '\\`')}\`)">
                                <i class="bi bi-clipboard me-2"></i>
                                Copiar Mensaje Completo
                            </button>
                        </div>
                        <div class="instructions mt-2" style="background: #e3f2fd; border-radius: 6px; padding: 1rem; border-left: 4px solid #2196f3;">
                            <small style="color: #1976d2;">
                                <i class="bi bi-info-circle me-1"></i>
                                <strong>Instrucciones:</strong> Copia el mensaje y envíalo al grupo "SICA Todos" en WhatsApp para notificar a todos los asesores.
                            </small>
                        </div>
                    </div>
                `;
                break;
                
            case 'checkbox':
                fieldHTML = `
                    <div class="form-check">
                        <input 
                            type="checkbox" 
                            class="form-check-input" 
                            id="${field.name}" 
                            name="${field.name}"
                            ${field.checked ? 'checked' : ''}
                        >
                        <label class="form-check-label" for="${field.name}">
                            ${field.label}
                        </label>
                    </div>
                `;
                return field.type === 'checkbox' ? fieldHTML : `
                    <div class="form-group">
                        <label class="form-label" for="${field.name}">${field.label}</label>
                        ${fieldHTML}
                    </div>
                `;
        }
        
        return `
            <div class="form-group">
                <label class="form-label" for="${field.name}">${field.label}</label>
                ${fieldHTML}
            </div>
        `;
    }).join('');
}

async function handleFormSubmit() {
    try {
        const enviarBtn = document.getElementById('enviarBtn');
        const formKey = enviarBtn.getAttribute('data-form-key');
        const formType = enviarBtn.getAttribute('data-form-type');
        
        // Mostrar estado de carga
        const originalText = enviarBtn.innerHTML;
        enviarBtn.innerHTML = '<i class="bi bi-arrow-clockwise spinning me-1"></i> Procesando...';
        enviarBtn.disabled = true;
        
        // Recopilar datos del formulario
        const formData = collectFormData();
        
        // Validar datos
        if (!validateFormData(formData, formKey)) {
            enviarBtn.innerHTML = originalText;
            enviarBtn.disabled = false;
            return;
        }
        
        // Procesar según el tipo
        let result;
        switch (formType) {
            case 'email':
                result = await processEmailForm(formKey, formData);
                break;
            case 'whatsapp':
                result = await processWhatsAppForm(formKey, formData);
                break;
            case 'survey':
                result = await processSurveyForm(formKey, formData);
                break;
            case 'url':
                result = await processURLForm(formKey, formData);
                break;
            default:
                throw new Error('Tipo de formulario no válido');
        }
        
        // Guardar en historial
        await saveToHistory(formKey, formType, formData, result);
        
        // Mostrar éxito
        showNotification(`${formConfigs[formKey].title} procesado exitosamente`, 'success');
        
        // Cerrar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('formConfigModal'));
        modal.hide();
        
        // Actualizar estadísticas
        await loadStats();
        
    } catch (error) {
        console.error('❌ Error procesando formulario:', error);
        showNotification('Error al procesar el formulario', 'error');
        
        // Restaurar botón
        const enviarBtn = document.getElementById('enviarBtn');
        enviarBtn.innerHTML = originalText;
        enviarBtn.disabled = false;
    }
}

function collectFormData() {
    const form = document.getElementById('configForm');
    const formData = {};
    
    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
        if (input.type === 'checkbox') {
            formData[input.name] = input.checked;
        } else {
            formData[input.name] = input.value;
        }
    });
    
    return formData;
}

function validateFormData(formData, formKey) {
    const config = formConfigs[formKey];
    
    for (const field of config.fields) {
        if (field.required && !formData[field.name]) {
            showNotification(`El campo "${field.label}" es requerido`, 'warning');
            return false;
        }
    }
    
    return true;
}

async function processEmailForm(formKey, formData) {
    // Simular procesamiento de email
    console.log('📧 Procesando formulario de email:', formKey, formData);
    
    // Aquí integrarías con tu servicio de email (SendGrid, Nodemailer, etc.)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
        type: 'email',
        recipients: formData.destinatarios?.split(',').length || 1,
        subject: formData.asunto,
        status: 'enviado'
    };
}

async function processWhatsAppForm(formKey, formData) {
    const numeros = formData.numeros.split('\n').filter(n => n.trim());
    
    // ✅ MENSAJE ESPECÍFICO PARA REGISTRO DE ASESORES
    if (formKey === 'registro-asesor') {
        const mensaje = `🎓 *CONVOCATORIA ASESOR SICA*

¡Hola! Te invitamos a formar parte del equipo de asesores del Sistema Integral de Cómputo para Alumnos (SICA) de la Facultad de Química, UNAM.

📋 *COMPLETA TU REGISTRO:*
${formData.mensaje_adicional || 'Accede al formulario y llena todos tus datos académicos y personales.'}

🔗 *ENLACE DE REGISTRO:*
https://sica-a5c24.web.app/view/preformulario.html

📝 *REQUISITOS:*
- Ser estudiante activo de la UNAM
- Promedio mínimo de 8.5
- Disponibilidad de tiempo
- Historia académica actualizada

⏰ *FECHA LÍMITE:*
${formData.fecha_limite || 'Por definir'}

📧 *DUDAS:* Responde a este mensaje

¡Esperamos tu participación!

*Equipo SICA - Facultad de Química, UNAM* 🧪⚗️`;

        // Enviar a cada número
        numeros.forEach((numero, index) => {
            const numeroLimpio = numero.replace(/\D/g, '');
            const url = `https://wa.me/52${numeroLimpio}?text=${encodeURIComponent(mensaje)}`;
            
            setTimeout(() => {
                window.open(url, '_blank');
            }, index * 1000);
        });
        
        return {
            type: 'whatsapp',
            recipients: numeros.length,
            message: 'Convocatoria de registro enviada',
            status: 'enviado'
        };
    }
    
    // ✅ PARA OTROS TIPOS DE FORMULARIOS (mantener lógica original)
    let mensaje = formData.mensaje || formData.titulo || 'Mensaje desde SICA';
    
    if (formData.mensaje_adicional) {
        mensaje += '\n\n' + formData.mensaje_adicional;
    }
    
    numeros.forEach((numero, index) => {
        const numeroLimpio = numero.replace(/\D/g, '');
        const url = `https://wa.me/52${numeroLimpio}?text=${encodeURIComponent(mensaje)}`;
        
        setTimeout(() => {
            window.open(url, '_blank');
        }, index * 1000);
    });
    
    return {
        type: 'whatsapp',
        recipients: numeros.length,
        message: mensaje,
        status: 'enviado'
    };
}

async function processSurveyForm(formKey, formData) {
    // Simular creación de encuesta
    console.log('📊 Procesando encuesta:', formKey, formData);
    
    // Aquí integrarías con tu sistema de encuestas
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    return {
        type: 'survey',
        title: formData.titulo_encuesta,
        recipients: formData.destinatarios?.split(',').length || 1,
        status: 'creada'
    };
}

// ✅ Función para procesar formularios de URL
async function processURLForm(formKey, formData) {
    console.log('🔗 Procesando formulario de URL:', formKey, formData);
    
    return {
        type: 'url',
        status: 'procesado'
    };
}

async function saveToHistory(formKey, formType, formData, result) {
    try {
        const historyEntry = {
            form_key: formKey,
            form_type: formType,
            form_data: formData,
            result: result,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            user: formulariosAuth.currentUser?.email || 'unknown'
        };
        
        await formulariosDB.collection('formularios_historial').add(historyEntry);
        console.log('📝 Entrada guardada en historial');
        
    } catch (error) {
        console.warn('⚠️ Error guardando en historial:', error);
    }
}

async function loadStats() {
    try {
        // Cargar estadísticas del día
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todaySnapshot = await formulariosDB.collection('formularios_historial')
            .where('timestamp', '>=', firebase.firestore.Timestamp.fromDate(today))
            .get();
        
        const pendientesSnapshot = await formulariosDB.collection('pendientes').get();
        
        // Actualizar contadores
        document.getElementById('totalEnviados').textContent = todaySnapshot.size;
        document.getElementById('totalPendientes').textContent = pendientesSnapshot.size;
        
    } catch (error) {
        console.warn('⚠️ Error cargando estadísticas:', error);
    }
}

function animatePageLoad() {
    // Animar secciones con delay
    const sections = document.querySelectorAll('.communication-section');
    sections.forEach((section, index) => {
        section.style.animationDelay = `${index * 0.2}s`;
        section.classList.add('fade-in-up');
    });
    
    // Animar cards dentro de cada sección
    const cards = document.querySelectorAll('.option-card');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${(index * 0.1) + 0.5}s`;
        card.classList.add('slide-in-left');
    });
}

// Funciones de acciones rápidas
function showHistorial() {
    showNotification('Cargando historial de formularios...', 'info');
    // Aquí implementarías la vista de historial
}

function showPlantillas() {
    showNotification('Cargando plantillas de formularios...', 'info');
    // Aquí implementarías la gestión de plantillas
}

function showEstadisticas() {
    showNotification('Generando estadísticas detalladas...', 'info');
    // Aquí implementarías las estadísticas avanzadas
}

function showConfiguracion() {
    showNotification('Abriendo configuración de formularios...', 'info');
    // Aquí implementarías la configuración
}

function getTypeIcon(type) {
    const icons = {
        'email': 'bi-envelope-fill',
        'whatsapp': 'bi-whatsapp',
        'survey': 'bi-clipboard-data',
        'url': 'bi-share'
    };
    return icons[type] || 'bi-send';
}

// ✅ Función de utilidad para copiar al portapapeles
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Mensaje copiado al portapapeles exitosamente', 'success');
        
        // Encontrar el botón que se presionó y cambiar su texto temporalmente
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            if (button.textContent.includes('Copiar Mensaje Completo')) {
                const originalText = button.innerHTML;
                button.innerHTML = '<i class="bi bi-check-circle me-2"></i> ¡Mensaje Copiado!';
                button.style.background = '#28a745';
                button.style.borderColor = '#28a745';
                
                setTimeout(() => {
                    button.innerHTML = originalText;
                    button.style.background = '';
                    button.style.borderColor = '';
                }, 3000);
            }
        });
        
    }).catch(() => {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showNotification('Mensaje copiado al portapapeles', 'success');
    });
}

function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
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
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
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
`;
document.head.appendChild(style);

// Exportar para uso global
window.FormulariosAvisos = {
    openFormConfig,
    showNotification,
    loadStats
};