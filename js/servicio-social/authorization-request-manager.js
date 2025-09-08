// authorization-request-manager.js
// Módulo para gestión de solicitudes de autorización

class AuthorizationRequestManager {
    constructor(core, dataManager) {
        this.core = core;
        this.dataManager = dataManager;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Botones de solicitud
        document.querySelectorAll('[data-auth-type]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const authType = btn.getAttribute('data-auth-type');
                this.enviarSolicitudAutorizacion(authType);
            });
        });

        console.log('📧 Authorization Request Manager configurado');
    }

    async enviarSolicitudAutorizacion(tipoAutorizacion) {
        if (!this.core.currentAsesor) {
            this.core.showNotification('No hay asesor seleccionado', 'error');
            return;
        }

        // Verificar si ya existe una solicitud pendiente del mismo tipo
        const solicitudExistente = await this.verificarSolicitudExistente(tipoAutorizacion);
        if (solicitudExistente) {
            this.core.showNotification(
                'Solicitud ya enviada',
                `Ya existe una solicitud pendiente para ${this.getTipoLabel(tipoAutorizacion)}`,
                'warning'
            );
            return;
        }

        try {
            this.core.showLoadingModal('Enviando solicitud...');

            // Preparar datos de la solicitud para agregar al documento del asesor
            const solicitudData = {
                tipoAutorizacion: tipoAutorizacion,
                estado: 'Pendiente',
                fechaSolicitud: new Date(),
                usuarioSolicita: this.core.currentUser?.email || '',
                sistemaOrigen: 'SICA Administrativo'
            };

            // Actualizar el documento existente del asesor en lugar de crear uno nuevo
            await this.agregarSolicitudAlDocumento(solicitudData);

            // Actualizar UI
            this.actualizarEstadoBoton(tipoAutorizacion, 'enviado');
            
            // Actualizar datos locales
            this.actualizarDatosLocales(solicitudData);

            this.core.showNotification(
                'Solicitud Enviada',
                `Se ha enviado la solicitud para ${this.getTipoLabel(tipoAutorizacion)}`,
                'success',
                'bi-check-circle-fill'
            );

        } catch (error) {
            console.error('Error enviando solicitud:', error);
            this.core.showNotification(
                'Error al enviar solicitud',
                'No se pudo procesar la solicitud. Intente nuevamente.',
                'error'
            );
        } finally {
            this.core.hideLoadingModal();
        }
    }

    async verificarSolicitudExistente(tipoAutorizacion) {
        try {
            // Verificar en el documento existente del asesor
            const docRef = this.core.db.collection('serviciosocial').doc(this.core.currentAsesor.id);
            const doc = await docRef.get();

            if (doc.exists) {
                const data = doc.data();
                // Verificar si existe una solicitud pendiente de este tipo
                const solicitudes = data.solicitudesAutorizacion || {};
                return solicitudes[tipoAutorizacion]?.estado === 'Pendiente';
            }

            return false;
        } catch (error) {
            console.error('Error verificando solicitud existente:', error);
            return false;
        }
    }

    async agregarSolicitudAlDocumento(solicitudData) {
        const docRef = this.core.db.collection('serviciosocial').doc(this.core.currentAsesor.id);
        
        // Obtener el documento actual
        const doc = await docRef.get();
        let currentData = {};
        
        if (doc.exists) {
            currentData = doc.data();
        } else {
            // Si no existe el documento, crear la estructura básica
            currentData = {
                asesorId: this.core.currentAsesor.id,
                estadoTermino: this.core.currentAsesor.servicioSocial?.estadoTermino || '',
                fechaInicio: this.core.currentAsesor.servicioSocial?.fechaInicio || '',
                fechaTermino: this.core.currentAsesor.servicioSocial?.fechaTermino || '',
                clavePrograma: this.core.currentAsesor.servicioSocial?.clavePrograma || '',
                folioAceptacion: this.core.currentAsesor.servicioSocial?.folioAceptacion || '',
                folioTermino: this.core.currentAsesor.servicioSocial?.folioTermino || '',
                fechaEntregaCarta: this.core.currentAsesor.servicioSocial?.fechaEntregaCarta || '',
                horasAsesor: this.core.currentAsesor.servicioSocial?.horasAsesor || 0,
                horasServicioSocial: this.core.currentAsesor.servicioSocial?.horasServicioSocial || 0,
                totalHoras: this.core.currentAsesor.servicioSocial?.totalHoras || 0,
                ajustesHoras: this.core.currentAsesor.servicioSocial?.ajustesHoras || 0,
                cartaPresentacion: this.core.currentAsesor.servicioSocial?.cartaPresentacion || null,
                cartaAceptacion: this.core.currentAsesor.servicioSocial?.cartaAceptacion || null,
                cartaTermino: this.core.currentAsesor.servicioSocial?.cartaTermino || null,
                reporteSS: this.core.currentAsesor.servicioSocial?.reporteSS || null,
                fechaCreacion: new Date(),
                fechaActualizacion: new Date()
            };
        }

        // Inicializar solicitudesAutorizacion si no existe
        if (!currentData.solicitudesAutorizacion) {
            currentData.solicitudesAutorizacion = {};
        }

        // Agregar la nueva solicitud
        currentData.solicitudesAutorizacion[solicitudData.tipoAutorizacion] = solicitudData;
        currentData.fechaActualizacion = new Date();

        // Guardar el documento actualizado
        await docRef.set(currentData, { merge: true });
    }

    actualizarDatosLocales(solicitudData) {
        // Actualizar datos del asesor actual
        if (!this.core.currentAsesor.servicioSocial) {
            this.core.currentAsesor.servicioSocial = {};
        }
        
        if (!this.core.currentAsesor.servicioSocial.solicitudesAutorizacion) {
            this.core.currentAsesor.servicioSocial.solicitudesAutorizacion = {};
        }
        
        this.core.currentAsesor.servicioSocial.solicitudesAutorizacion[solicitudData.tipoAutorizacion] = solicitudData;

        // Actualizar en el array principal
        const asesorIndex = this.core.asesores.findIndex(a => a.id === this.core.currentAsesor.id);
        if (asesorIndex !== -1) {
            this.core.asesores[asesorIndex] = { ...this.core.currentAsesor };
        }

        // Actualizar en servicioSocialData si existe
        const ssIndex = this.core.servicioSocialData.findIndex(ss => ss.asesorId === this.core.currentAsesor.id);
        if (ssIndex !== -1) {
            if (!this.core.servicioSocialData[ssIndex].solicitudesAutorizacion) {
                this.core.servicioSocialData[ssIndex].solicitudesAutorizacion = {};
            }
            this.core.servicioSocialData[ssIndex].solicitudesAutorizacion[solicitudData.tipoAutorizacion] = solicitudData;
        }
    }

    actualizarEstadoBoton(tipoAutorizacion, estado) {
        const boton = document.querySelector(`[data-auth-type="${tipoAutorizacion}"]`);
        if (!boton) return;

        if (estado === 'enviado') {
            boton.classList.remove('btn-outline-primary', 'btn-outline-success');
            boton.classList.add('btn-success');
            boton.disabled = true;
            
            const icon = boton.querySelector('i');
            const text = boton.querySelector('.btn-text');
            
            if (icon) {
                icon.className = 'bi bi-check-circle-fill';
            }
            
            if (text) {
                text.textContent = 'Solicitud Enviada';
            } else {
                // Si no hay .btn-text, buscar el texto directamente
                const textNode = Array.from(boton.childNodes).find(node => 
                    node.nodeType === Node.TEXT_NODE && node.textContent.trim()
                );
                if (textNode) {
                    textNode.textContent = ' Solicitud Enviada';
                }
            }

            // Agregar badge de confirmación si no existe
            if (!boton.querySelector('.sent-badge')) {
                const badge = document.createElement('span');
                badge.className = 'sent-badge ms-2';
                badge.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i>Enviado';
                boton.appendChild(badge);
            }
        }
    }

    async cargarEstadoSolicitudes() {
        if (!this.core.currentAsesor) return;

        try {
            // Buscar el documento del asesor
            const docRef = this.core.db.collection('serviciosocial').doc(this.core.currentAsesor.id);
            const doc = await docRef.get();

            if (doc.exists) {
                const data = doc.data();
                const solicitudes = data.solicitudesAutorizacion || {};
                
                // Verificar cada tipo de solicitud y actualizar botones
                Object.keys(solicitudes).forEach(tipoAutorizacion => {
                    const solicitud = solicitudes[tipoAutorizacion];
                    if (solicitud.estado === 'Pendiente') {
                        this.actualizarEstadoBoton(tipoAutorizacion, 'enviado');
                    }
                });

                // Actualizar datos locales
                if (!this.core.currentAsesor.servicioSocial) {
                    this.core.currentAsesor.servicioSocial = {};
                }
                this.core.currentAsesor.servicioSocial.solicitudesAutorizacion = solicitudes;
            }

        } catch (error) {
            console.error('Error cargando estado de solicitudes:', error);
        }
    }

    resetearBotones() {
        document.querySelectorAll('[data-auth-type]').forEach(boton => {
            boton.classList.remove('btn-success');
            boton.classList.add('btn-outline-primary');
            boton.disabled = false;

            const icon = boton.querySelector('i');
            const badge = boton.querySelector('.sent-badge');

            // Restaurar íconos originales
            if (icon) {
                const tipoAuth = boton.getAttribute('data-auth-type');
                if (tipoAuth.includes('termino')) {
                    icon.className = 'bi bi-file-earmark-check';
                } else if (tipoAuth.includes('aceptacion')) {
                    icon.className = 'bi bi-file-earmark-plus';
                }
            }

            // Restaurar texto original
            const tipoAuth = boton.getAttribute('data-auth-type');
            if (tipoAuth.includes('termino')) {
                if (tipoAuth.includes('fq')) {
                    boton.innerHTML = '<i class="bi bi-file-earmark-check me-2"></i>Carta Término FQ';
                } else {
                    boton.innerHTML = '<i class="bi bi-file-earmark-check me-2"></i>Carta Término Prepa';
                }
            } else if (tipoAuth.includes('aceptacion')) {
                if (tipoAuth.includes('fq')) {
                    boton.innerHTML = '<i class="bi bi-file-earmark-plus me-2"></i>Carta Aceptación FQ';
                } else {
                    boton.innerHTML = '<i class="bi bi-file-earmark-plus me-2"></i>Carta Aceptación Prepa';
                }
            }

            // Remover badge
            if (badge) {
                badge.remove();
            }
        });
    }

    getTipoLabel(tipoAutorizacion) {
        const labels = {
            'carta-termino-fq': 'Carta de Término FQ',
            'carta-termino-prepa': 'Carta de Término Prepa',
            'carta-aceptacion-fq': 'Carta de Aceptación FQ',
            'carta-aceptacion-prepa': 'Carta de Aceptación Prepa'
        };
        return labels[tipoAutorizacion] || tipoAutorizacion;
    }

    // Método para obtener todas las solicitudes pendientes (para administradores)
    async obtenerSolicitudesPendientes() {
        try {
            const query = await this.core.db.collection('serviciosocial').get();
            const solicitudesPendientes = [];

            query.forEach(doc => {
                const data = doc.data();
                const tiposSolicitudes = ['carta-termino-fq', 'carta-termino-prepa', 'carta-aceptacion-fq', 'carta-aceptacion-prepa'];
                
                tiposSolicitudes.forEach(tipoAutorizacion => {
                    const campoEstado = `porAutorizar_${tipoAutorizacion}`;
                    const campoFecha = `fechaSolicitud_${tipoAutorizacion}`;
                    const campoUsuario = `usuarioSolicita_${tipoAutorizacion}`;
                    
                    if (data[campoEstado] === 'Pendiente') {
                        solicitudesPendientes.push({
                            asesorId: data.asesorId,
                            documentId: doc.id,
                            tipoAutorizacion: tipoAutorizacion,
                            estado: data[campoEstado],
                            fechaSolicitud: data[campoFecha],
                            usuarioSolicita: data[campoUsuario]
                        });
                    }
                });
            });

            return solicitudesPendientes;

        } catch (error) {
            console.error('Error obteniendo solicitudes pendientes:', error);
            return [];
        }
    }

    // Método para marcar una solicitud como procesada (para administradores)
    async marcarSolicitudProcesada(asesorId, tipoAutorizacion, resultado = 'Procesada') {
        try {
            const docRef = this.core.db.collection('serviciosocial').doc(asesorId);
            const campoEstado = `porAutorizar_${tipoAutorizacion}`;
            const campoProcesamiento = `fechaProcesamiento_${tipoAutorizacion}`;
            
            const updateData = {};
            updateData[campoEstado] = resultado;
            updateData[campoProcesamiento] = new Date();
            updateData.fechaActualizacion = new Date();
            
            await docRef.update(updateData);
            return true;

        } catch (error) {
            console.error('Error marcando solicitud como procesada:', error);
            return false;
        }
    }
}

window.AuthorizationRequestManager = AuthorizationRequestManager;