// bitacora-firebase.js - Módulo de Firebase para Bitácora (Modificado para nuevos campos)
// Manejo de todas las operaciones con Firestore y Storage

class BitacoraFirebase {
    constructor() {
        this.db = firebase.firestore();
        this.storage = firebase.storage();
        this.auth = firebase.auth();
        
        // Referencias a colecciones
        this.edgarCollection = this.db.collection('edgar');
        this.servicioSocialCollection = this.db.collection('serviciosocial');
        this.asesoresCollection = this.db.collection('asesores');
        
        // Cache local
        this.cache = {
            folios: [],
            pendientes: [],
            lastUpdate: null
        };

        // Tipos de autorización válidos
        this.tiposAutorizacion = [
            'carta-termino-fq',
            'carta-termino-prepa', 
            'carta-aceptacion-fq',
            'carta-aceptacion-prepa'
        ];
    }

    // ==========================================
    // GESTIÓN DE FOLIOS (Colección Edgar)
    // ==========================================

    async obtenerFolios(filtros = {}) {
        try {
            console.log('🔍 Obteniendo folios de Edgar...');
            
            let query = this.edgarCollection.orderBy('fecha', 'desc');
            
            // Aplicar filtros
            if (filtros.fechaDesde) {
                query = query.where('fecha', '>=', filtros.fechaDesde);
            }
            
            if (filtros.fechaHasta) {
                query = query.where('fecha', '<=', filtros.fechaHasta);
            }
            
            if (filtros.importancia) {
                query = query.where('importancia', '==', filtros.importancia);
            }
            
            const snapshot = await query.get();
            const folios = [];
            
            snapshot.forEach(doc => {
                folios.push({
                    id: doc.id,
                    ...doc.data(),
                    fecha: doc.data().fecha?.toDate?.() || new Date(doc.data().fecha)
                });
            });
            
            this.cache.folios = folios;
            console.log(`✅ Obtenidos ${folios.length} folios`);
            
            return folios;
            
        } catch (error) {
            console.error('❌ Error obteniendo folios:', error);
            throw error;
        }
    }

    async crearFolio(datosfolio, archivo = null) {
        try {
            console.log('📝 Creando nuevo folio...');
            
            // Verificar folio duplicado
            const folioExistente = await this.verificarFolioExistente(datosfolio.folio);
            if (folioExistente) {
                throw new Error(`El folio ${datosfolio.folio} ya existe`);
            }
            
            const folioData = {
                ...datosfolio,
                fecha: firebase.firestore.Timestamp.fromDate(new Date(datosfolio.fecha)),
                fechaCreacion: firebase.firestore.Timestamp.now(),
                creadoPor: this.auth.currentUser?.email || 'admin',
                tipo: 'manual' // Diferenciamos de los generados por SICA
            };
            
            // Subir archivo si existe
            if (archivo) {
                const archivoUrl = await this.subirArchivo(archivo, `folios/${datosfolio.folio}`);
                folioData.documento = {
                    url: archivoUrl,
                    nombre: archivo.name,
                    tipo: archivo.type,
                    tamaño: archivo.size
                };
            }
            
            const docRef = await this.edgarCollection.add(folioData);
            console.log('✅ Folio creado:', docRef.id);
            
            return docRef.id;
            
        } catch (error) {
            console.error('❌ Error creando folio:', error);
            throw error;
        }
    }

    async actualizarFolio(id, datosfolio, archivo = null) {
        try {
            console.log('📝 Actualizando folio:', id);
            
            const folioData = {
                ...datosfolio,
                fecha: firebase.firestore.Timestamp.fromDate(new Date(datosfolio.fecha)),
                fechaModificacion: firebase.firestore.Timestamp.now(),
                modificadoPor: this.auth.currentUser?.email || 'admin'
            };
            
            // Manejar nuevo archivo
            if (archivo) {
                // Eliminar archivo anterior si existe
                const folioActual = await this.obtenerFolioPorId(id);
                if (folioActual.documento?.url) {
                    await this.eliminarArchivo(folioActual.documento.url);
                }
                
                // Subir nuevo archivo
                const archivoUrl = await this.subirArchivo(archivo, `folios/${datosfolio.folio}`);
                folioData.documento = {
                    url: archivoUrl,
                    nombre: archivo.name,
                    tipo: archivo.type,
                    tamaño: archivo.size
                };
            }
            
            await this.edgarCollection.doc(id).update(folioData);
            console.log('✅ Folio actualizado');
            
        } catch (error) {
            console.error('❌ Error actualizando folio:', error);
            throw error;
        }
    }

    async eliminarFolio(id) {
        try {
            console.log('🗑️ Eliminando folio:', id);
            
            // Obtener datos del folio para eliminar archivo
            const folio = await this.obtenerFolioPorId(id);
            
            // Eliminar archivo si existe
            if (folio.documento?.url) {
                await this.eliminarArchivo(folio.documento.url);
            }
            
            // Eliminar documento
            await this.edgarCollection.doc(id).delete();
            console.log('✅ Folio eliminado');
            
        } catch (error) {
            console.error('❌ Error eliminando folio:', error);
            throw error;
        }
    }

    async obtenerFolioPorId(id) {
        try {
            const doc = await this.edgarCollection.doc(id).get();
            if (!doc.exists) {
                throw new Error('Folio no encontrado');
            }
            
            return {
                id: doc.id,
                ...doc.data(),
                fecha: doc.data().fecha?.toDate?.() || new Date(doc.data().fecha)
            };
            
        } catch (error) {
            console.error('❌ Error obteniendo folio:', error);
            throw error;
        }
    }

    async verificarFolioExistente(folio) {
        try {
            const query = await this.edgarCollection
                .where('folio', '==', folio)
                .get();
            
            return !query.empty;
            
        } catch (error) {
            console.error('❌ Error verificando folio:', error);
            return false;
        }
    }

    // ==========================================
    // GESTIÓN PENDIENTES SICA - NUEVA ESTRUCTURA
    // ==========================================

async obtenerPendientesSICA() {
    try {
        console.log('🔍 Obteniendo pendientes SICA...');
        
        // CAMBIO: Obtener todos los documentos de serviciosocial, no asesores
        const snapshot = await this.servicioSocialCollection.get();
        
        console.log('📊 Documentos de serviciosocial encontrados:', snapshot.size);
        
        const pendientes = [];
        
        for (const doc of snapshot.docs) {
            const servicioData = doc.data();
            const servicioId = doc.id;
            
            console.log('📋 Procesando servicio social:', servicioId);
            
            // DEBUG ESPECÍFICO: Si es el documento que sabemos que tiene pendientes
            if (servicioId.includes('314302498')) {
                console.log('🎯 DOCUMENTO OBJETIVO ENCONTRADO:', servicioId);
                console.log('🎯 Claves del documento:', Object.keys(servicioData));
                console.log('🎯 Tiene solicitudesAutorizacion?', !!servicioData.solicitudesAutorizacion);
                
                if (servicioData.solicitudesAutorizacion) {
                    console.log('🎯 Contenido de solicitudesAutorizacion:', servicioData.solicitudesAutorizacion);
                }
            }
            
            // Buscar solicitudes pendientes en este documento de servicio social
            const solicitudesPendientes = this.buscarSolicitudesPendientes(servicioData);
            
            if (solicitudesPendientes.length > 0) {
                console.log(`📋 ✅ Solicitudes pendientes encontradas para ${servicioId}:`, solicitudesPendientes.length);
            }
            
            // Para cada solicitud pendiente, obtener datos del asesor
            for (const solicitud of solicitudesPendientes) {
                // Extraer número de cuenta del ID del documento (asumiendo formato asesor_NUMEROCUENTA)
                const numeroCuenta = servicioId.replace('asesor_', '');
                
                try {
                    // Buscar datos del asesor
                    const asesorQuery = await this.asesoresCollection
                        .where('numeroCuenta', '==', numeroCuenta)
                        .get();
                    
                    let asesorData = null;
                    if (!asesorQuery.empty) {
                        asesorData = asesorQuery.docs[0].data();
                    }
                    
                    pendientes.push({
                        id: `${servicioId}_${solicitud.tipo}`, // ID único combinando servicio y tipo
                        asesorId: servicioId,
                        asesor: asesorData,
                        tipoAutorizacion: solicitud.tipo,
                        fechaSolicitud: solicitud.fechaSolicitud,
                        usuarioSolicita: solicitud.usuarioSolicita,
                        // Campos adicionales para compatibilidad
                        nombreAsesor: asesorData?.nombreAsesor || 'No encontrado',
                        numeroCuenta: numeroCuenta,
                        carrera: asesorData?.carrera || 'No especificada'
                    });
                    
                } catch (error) {
                    console.warn('Error obteniendo datos del asesor:', error);
                }
            }
        }
        
        // Ordenar por fecha de solicitud (más recientes primero)
        pendientes.sort((a, b) => b.fechaSolicitud - a.fechaSolicitud);
        
        console.log('✅ Total pendientes procesados:', pendientes.length);
        console.log('✅ Lista completa de pendientes:', pendientes);
        return pendientes;
        
    } catch (error) {
        console.error('❌ Error obteniendo pendientes SICA:', error);
        throw error;
    }
}

buscarSolicitudesPendientes(servicioData) {
    const solicitudes = [];
    
    // Verificar si existe la estructura solicitudesAutorizacion
    if (!servicioData.solicitudesAutorizacion) {
        console.log('❌ No existe solicitudesAutorizacion');
        return solicitudes;
    }
    
    const solicitudesAuth = servicioData.solicitudesAutorizacion;
    console.log('🔍 Revisando solicitudesAutorizacion:', solicitudesAuth);
    
    // Revisar cada tipo de autorización en la estructura anidada
    this.tiposAutorizacion.forEach(tipo => {
        console.log(`🔍 Buscando tipo: ${tipo}`);
        
        // Buscar en la estructura anidada: solicitudesAutorizacion.carta-termino-fq.estado
        if (solicitudesAuth[tipo]) {
            console.log(`✅ Encontrado ${tipo}:`, solicitudesAuth[tipo]);
            
            if (solicitudesAuth[tipo].estado === 'Pendiente') {
                console.log(`🟡 ${tipo} está PENDIENTE`);
                solicitudes.push({
                    tipo: tipo,
                    fechaSolicitud: solicitudesAuth[tipo].fechaSolicitud?.toDate?.() || new Date(),
                    usuarioSolicita: solicitudesAuth[tipo].usuarioSolicita || 'No especificado',
                    sistemaOrigen: solicitudesAuth[tipo].sistemaOrigen || 'No especificado',
                    tipoAutorizacion: solicitudesAuth[tipo].tipoAutorizacion || tipo
                });
            } else {
                console.log(`🔴 ${tipo} NO está pendiente, estado:`, solicitudesAuth[tipo].estado);
            }
        } else {
            console.log(`❌ No encontrado ${tipo} en solicitudesAutorizacion`);
        }
    });
    
    console.log(`🔍 Total solicitudes pendientes encontradas: ${solicitudes.length}`);
    return solicitudes;
}

    async autorizarPendiente(pendienteId, datosAutorizacion) {
        try {
            console.log('✅ Autorizando pendiente:', pendienteId);
            
            // Extraer asesorId y tipo del pendienteId
            const [asesorId, tipoAutorizacion] = pendienteId.split('_', 2);
            
            const batch = this.db.batch();
            
            // 1. Actualizar campos del asesor
            const asesorRef = this.asesoresCollection.doc(asesorId);
            const camposActualizacion = {};
            
            // Marcar como autorizado
            camposActualizacion[`porAutorizar_${tipoAutorizacion}`] = 'Autorizado';
            camposActualizacion[`fechaProcesamiento_${tipoAutorizacion}`] = firebase.firestore.Timestamp.now();
            
            // Agregar información de autorización
            camposActualizacion[`autorizadoPor_${tipoAutorizacion}`] = this.auth.currentUser?.email || 'admin';
            camposActualizacion[`folioAsignado_${tipoAutorizacion}`] = datosAutorizacion.folio;
            
            batch.update(asesorRef, camposActualizacion);
            
            // 2. Crear registro en Edgar
            const edgarRef = this.edgarCollection.doc();
            batch.set(edgarRef, {
                folio: datosAutorizacion.folio,
                nombre: datosAutorizacion.nombreAsesor,
                carrera: datosAutorizacion.carrera,
                tipoAutorizacion: tipoAutorizacion,
                fecha: firebase.firestore.Timestamp.now(),
                fechaCreacion: firebase.firestore.Timestamp.now(),
                creadoPor: this.auth.currentUser?.email || 'admin',
                tipo: 'sica',
                importancia: 'alta',
                comentarios: `Autorización SICA: ${tipoAutorizacion}`,
                numeroCuenta: datosAutorizacion.numeroCuenta,
                asesorId: asesorId
            });
            
            await batch.commit();
            console.log('✅ Pendiente autorizado y registrado en Edgar');
            
        } catch (error) {
            console.error('❌ Error autorizando pendiente:', error);
            throw error;
        }
    }

    // ==========================================
    // GESTIÓN DE ARCHIVOS
    // ==========================================

    async subirArchivo(archivo, ruta) {
        try {
            console.log('📁 Subiendo archivo:', archivo.name);
            
            // Validaciones
            if (archivo.size > 10 * 1024 * 1024) { // 10MB
                throw new Error('El archivo es demasiado grande (máximo 10MB)');
            }
            
            const tiposPermitidos = [
                'application/pdf',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-excel'
            ];
            
            if (!tiposPermitidos.includes(archivo.type)) {
                throw new Error('Tipo de archivo no permitido. Solo PDF, Word y Excel.');
            }
            
            // Crear referencia con timestamp para evitar conflictos
            const timestamp = Date.now();
            const extension = archivo.name.split('.').pop();
            const nombreArchivo = `${ruta}_${timestamp}.${extension}`;
            const storageRef = this.storage.ref(`bitacora/${nombreArchivo}`);
            
            // Subir archivo
            const snapshot = await storageRef.put(archivo);
            const downloadURL = await snapshot.ref.getDownloadURL();
            
            console.log('✅ Archivo subido:', downloadURL);
            return downloadURL;
            
        } catch (error) {
            console.error('❌ Error subiendo archivo:', error);
            throw error;
        }
    }

    async eliminarArchivo(url) {
        try {
            console.log('🗑️ Eliminando archivo:', url);
            
            const storageRef = this.storage.refFromURL(url);
            await storageRef.delete();
            
            console.log('✅ Archivo eliminado');
            
        } catch (error) {
            console.error('⚠️ Error eliminando archivo (puede que ya no exista):', error);
            // No lanzamos error para no bloquear otras operaciones
        }
    }

    // ==========================================
    // ESTADÍSTICAS Y UTILIDADES - ACTUALIZADAS
    // ==========================================

    async obtenerEstadisticas() {
        try {
            console.log('📊 Calculando estadísticas...');
            
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            const inicioSemana = new Date(hoy);
            inicioSemana.setDate(hoy.getDate() - hoy.getDay());
            
            // Total folios
            const totalSnapshot = await this.edgarCollection.get();
            const totalFolios = totalSnapshot.size;
            
            // Pendientes SICA - nueva lógica
            const pendientesSica = await this.contarPendientesSICA();
            
            // Autorizados hoy
            const hoySnapshot = await this.edgarCollection
                .where('fecha', '>=', firebase.firestore.Timestamp.fromDate(hoy))
                .where('tipo', '==', 'sica')
                .get();
            const autorizadosHoy = hoySnapshot.size;
            
            // Esta semana
            const semanaSnapshot = await this.edgarCollection
                .where('fecha', '>=', firebase.firestore.Timestamp.fromDate(inicioSemana))
                .get();
            const estaSemana = semanaSnapshot.size;
            
            return {
                totalFolios,
                pendientesSica,
                autorizadosHoy,
                estaSemana
            };
            
        } catch (error) {
            console.error('❌ Error calculando estadísticas:', error);
            return {
                totalFolios: 0,
                pendientesSica: 0,
                autorizadosHoy: 0,
                estaSemana: 0
            };
        }
    }

async contarPendientesSICA() {
    try {
        const snapshot = await this.servicioSocialCollection.get();
        let totalPendientes = 0;
        
        snapshot.forEach(doc => {
            const servicioData = doc.data();
            
            // Verificar si existe la estructura solicitudesAutorizacion
            if (servicioData.solicitudesAutorizacion) {
                const solicitudesAuth = servicioData.solicitudesAutorizacion;
                
                // Contar solicitudes pendientes para este documento
                this.tiposAutorizacion.forEach(tipo => {
                    if (solicitudesAuth[tipo] && solicitudesAuth[tipo].estado === 'Pendiente') {
                        totalPendientes++;
                    }
                });
            }
        });
        
        return totalPendientes;
        
    } catch (error) {
        console.error('❌ Error contando pendientes SICA:', error);
        return 0;
    }
}

    async obtenerSiguienteNumeroFolio() {
        try {
            const year = new Date().getFullYear();
            const query = await this.edgarCollection
                .where('folio', '>=', `CI/001/${year}`)
                .where('folio', '<=', `CI/999/${year}`)
                .orderBy('folio', 'desc')
                .limit(1)
                .get();
            
            if (query.empty) {
                return 1;
            }
            
            const ultimoFolio = query.docs[0].data().folio;
            const numero = parseInt(ultimoFolio.match(/CI\/(\d+)\/\d{4}/)[1]);
            
            return numero + 1;
            
        } catch (error) {
            console.error('❌ Error obteniendo siguiente número de folio:', error);
            return 1;
        }
    }

    // ==========================================
    // BÚSQUEDA Y FILTROS
    // ==========================================

    filtrarFoliosLocalmente(folios, termino) {
        if (!termino.trim()) return folios;
        
        const terminoLower = termino.toLowerCase();
        
        return folios.filter(folio => {
            return (
                folio.folio?.toLowerCase().includes(terminoLower) ||
                folio.nombre?.toLowerCase().includes(terminoLower) ||
                folio.comentarios?.toLowerCase().includes(terminoLower) ||
                folio.carrera?.toLowerCase().includes(terminoLower) ||
                folio.tipoAutorizacion?.toLowerCase().includes(terminoLower)
            );
        });
    }

    aplicarFiltrosLocalmente(folios, filtros) {
        let foliosFiltrados = [...folios];
        
        if (filtros.importancia) {
            foliosFiltrados = foliosFiltrados.filter(f => f.importancia === filtros.importancia);
        }
        
        if (filtros.fechaDesde) {
            const fechaDesde = new Date(filtros.fechaDesde);
            foliosFiltrados = foliosFiltrados.filter(f => f.fecha >= fechaDesde);
        }
        
        if (filtros.fechaHasta) {
            const fechaHasta = new Date(filtros.fechaHasta);
            fechaHasta.setHours(23, 59, 59, 999);
            foliosFiltrados = foliosFiltrados.filter(f => f.fecha <= fechaHasta);
        }
        
        if (filtros.busqueda) {
            foliosFiltrados = this.filtrarFoliosLocalmente(foliosFiltrados, filtros.busqueda);
        }
        
        return foliosFiltrados;
    }

    // ==========================================
    // LISTENERS EN TIEMPO REAL - ACTUALIZADOS
    // ==========================================

    escucharPendientesSICA(callback) {
        console.log('👂 Configurando listener para pendientes SICA...');
        
        return this.servicioSocialCollection
            .onSnapshot(snapshot => {
                console.log('🔔 Actualización en serviciosocial - recalculando pendientes');
                this.contarPendientesSICA().then(cantidad => {
                    callback(cantidad);
                });
            }, error => {
                console.error('❌ Error en listener de pendientes:', error);
            });
    }

    escucharFolios(callback) {
        console.log('👂 Configurando listener para folios...');
        
        return this.edgarCollection
            .orderBy('fecha', 'desc')
            .limit(100) // Limitamos para rendimiento
            .onSnapshot(snapshot => {
                console.log('🔔 Actualización en folios');
                const folios = [];
                snapshot.forEach(doc => {
                    folios.push({
                        id: doc.id,
                        ...doc.data(),
                        fecha: doc.data().fecha?.toDate?.() || new Date(doc.data().fecha)
                    });
                });
                callback(folios);
            }, error => {
                console.error('❌ Error en listener de folios:', error);
            });
    }

    // ==========================================
    // UTILIDADES PARA DEBUG Y DESARROLLO
    // ==========================================

    async verificarEstructuraCampos() {
        try {
            console.log('🔍 Verificando estructura de campos...');
            
            const snapshot = await this.asesoresCollection.limit(5).get();
            
            snapshot.forEach(doc => {
                const data = doc.data();
                console.log(`Asesor ${doc.id}:`);
                
                this.tiposAutorizacion.forEach(tipo => {
                    const campoAutorizar = `porAutorizar_${tipo}`;
                    const campoFecha = `fechaSolicitud_${tipo}`;
                    const campoUsuario = `usuarioSolicita_${tipo}`;
                    
                    if (data[campoAutorizar]) {
                        console.log(`  ${tipo}: ${data[campoAutorizar]} (${data[campoFecha]?.toDate?.()})`);
                    }
                });
            });
            
        } catch (error) {
            console.error('Error verificando estructura:', error);
        }
    }
}

// Instancia global
window.bitacoraFirebase = new BitacoraFirebase();

// Verificar autenticación
firebase.auth().onAuthStateChanged(user => {
    if (!user) {
        console.log('❌ Usuario no autenticado, redirigiendo...');
        window.location.href = '../login.html';
        return;
    }
    
    console.log('✅ Usuario autenticado:', user.email);
});

console.log('✅ Módulo BitacoraFirebase cargado correctamente (versión campos específicos)');