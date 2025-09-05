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

            // Preparar datos de la solicitud
            const solicitudData = {
                asesorId: this.core.currentAsesor.id,
                porAutorizar: 'Pendiente',
                tipoAutorizacion: tipoAutorizacion,
                fechaSolicitud: new Date(),
                fechaCreacion: new Date(),
                fechaActualizacion: new Date(),
                usuarioSolicita: this.core.currentUser?.email || '',
                sistemaOrigen: 'SICA Administrativo'
            };

            // Guardar en Firestore
            await this.guardarSolicitud(solicitudData);

            // Actualizar UI
            this.actualizarEstadoBoton(tipoAutorizacion, 'enviado');
            
            // Actualizar datos locales
            await this.actualizarDatosLocales(solicitudData);

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
            const query = await this.core.db.collection('serviciosocial')
                .where('asesorId', '==', this.core.currentAsesor.id)
                .where('tipoAutorizacion', '==', tipoAutorizacion)
                .where('porAutorizar', '==', 'Pendiente')
                .get();

            return !query.empty;
        } catch (error) {
            console.error('Error verificando solicitud existente:', error);
            return false;
        }
    }

    async guardarSolicitud(solicitudData) {
        // Crear documento único para la solicitud
        const solicitudId = `${this.core.currentAsesor.id}_${solicitudData.tipoAutorizacion}_${Date.now()}`;
        
        const docRef = this.core.db.collection('serviciosocial').doc(solicitudId);
        await docRef.set(solicitudData);

        return solicitudId;
    }

    async actualizarDatosLocales(solicitudData) {
        // Actualizar datos del asesor actual
        if (!this.core.currentAsesor.solicitudesAutorizacion) {
            this.core.currentAsesor.solicitudesAutorizacion = {};
        }
        
        this.core.currentAsesor.solicitudesAutorizacion[solicitudData.tipoAutorizacion] = {
            estado: 'Pendiente',
            fechaSolicitud: solicitudData.fechaSolicitud,
            id: solicitudData.id
        };

        // Actualizar en el array principal
        const asesorIndex = this.core.asesores.findIndex(a => a.id === this.core.currentAsesor.id);
        if (asesorIndex !== -1) {
            this.core.asesores[asesorIndex] = { ...this.core.currentAsesor };
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
            }

            // Agregar badge de confirmación
            if (!boton.querySelector('.sent-badge')) {
                const badge = document.createElement('span');
                badge.className = 'sent-badge';
                badge.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i>Enviado';
                boton.appendChild(badge);
            }
        }
    }

    async cargarEstadoSolicitudes() {
        if (!this.core.currentAsesor) return;

        try {
            // Buscar el documento existente del asesor
            const docRef = this.core.db.collection('serviciosocial').doc(this.core.currentAsesor.id);
            const doc = await docRef.get();

            if (doc.exists) {
                const data = doc.data();
                
                // Si tiene una solicitud pendiente, actualizar el botón correspondiente
                if (data.porAutorizar === 'Pendiente' && data.tipoAutorizacion) {
                    this.actualizarEstadoBoton(data.tipoAutorizacion, 'enviado');
                }
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
            const text = boton.querySelector('.btn-text');
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
            if (text) {
                const tipoAuth = boton.getAttribute('data-auth-type');
                if (tipoAuth.includes('termino')) {
                    text.textContent = 'Solicitar Carta Término';
                } else if (tipoAuth.includes('aceptacion')) {
                    text.textContent = 'Solicitar Carta Aceptación';
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

    // Método para verificar solicitudes masivas (opcional)
    async verificarSolicitudesMasivas() {
        try {
            const query = await this.core.db.collection('serviciosocial')
                .where('porAutorizar', '==', 'Pendiente')
                .get();

            const solicitudesPorTipo = {};
            query.forEach(doc => {
                const data = doc.data();
                const tipo = data.tipoAutorizacion;
                if (!solicitudesPorTipo[tipo]) {
                    solicitudesPorTipo[tipo] = 0;
                }
                solicitudesPorTipo[tipo]++;
            });

            console.log('Solicitudes pendientes por tipo:', solicitudesPorTipo);
            return solicitudesPorTipo;

        } catch (error) {
            console.error('Error verificando solicitudes masivas:', error);
            return {};
        }
    }
}

window.AuthorizationRequestManager = AuthorizationRequestManager;