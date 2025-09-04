// bitacora-firebase.js - Módulo de Firebase para Bitácora
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
    // GESTIÓN PENDIENTES SICA
    // ==========================================

    async obtenerPendientesSICA() {
        try {
            console.log('🔍 Obteniendo pendientes SICA...');
            
            const snapshot = await this.servicioSocialCollection
                .where('porAutorizar', '==', 'Pendiente')
                .orderBy('fechaSolicitud', 'desc')
                .get();
            
            console.log('📊 Documentos encontrados en modal:', snapshot.size);
            
            const pendientes = [];
            
            for (const doc of snapshot.docs) {
                const data = doc.data();
                console.log('📋 Procesando documento:', doc.id, data);
                
                // Obtener datos del asesor
                let asesorData = null;
                if (data.asesorId) {
                    console.log('🔍 Buscando asesor:', data.asesorId);
                    // ... resto del código
                }
                
                pendientes.push({
                    id: doc.id,
                    ...data,
                    asesor: asesorData,
                    fechaSolicitud: data.fechaSolicitud?.toDate?.() || new Date()
                });
            }
            
            console.log('✅ Pendientes procesados:', pendientes.length);
            return pendientes;
            
        } catch (error) {
            console.error('❌ Error obteniendo pendientes SICA:', error);
            throw error;
        }
    }

    async autorizarPendiente(pendienteId, datosAutorizacion) {
        try {
            console.log('✅ Autorizando pendiente:', pendienteId);
            
            const batch = this.db.batch();
            
            // 1. Actualizar servicio social
            const pendienteRef = this.servicioSocialCollection.doc(pendienteId);
            batch.update(pendienteRef, {
                porAutorizar: 'Autorizado',
                fechaAutorizacion: firebase.firestore.Timestamp.now(),
                autorizadoPor: this.auth.currentUser?.email || 'admin',
                folioAceptacion: datosAutorizacion.tipoAutorizacion.includes('aceptacion') ? datosAutorizacion.folio : null,
                folioTermino: datosAutorizacion.tipoAutorizacion.includes('termino') ? datosAutorizacion.folio : null
            });
            
            // 2. Crear registro en Edgar
            const edgarRef = this.edgarCollection.doc();
            batch.set(edgarRef, {
                folio: datosAutorizacion.folio,
                nombre: datosAutorizacion.nombreAsesor,
                carrera: datosAutorizacion.carrera,
                tipoAutorizacion: datosAutorizacion.tipoAutorizacion,
                fecha: firebase.firestore.Timestamp.now(),
                fechaCreacion: firebase.firestore.Timestamp.now(),
                creadoPor: this.auth.currentUser?.email || 'admin',
                tipo: 'sica',
                importancia: 'alta',
                comentarios: `Autorización SICA: ${datosAutorizacion.tipoAutorizacion}`,
                numeroCuenta: datosAutorizacion.numeroCuenta
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
    // ESTADÍSTICAS Y UTILIDADES
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
            
            // Pendientes SICA
            const pendientesSnapshot = await this.servicioSocialCollection
                .where('porAutorizar', '==', 'Pendiente')
                .get();
            const pendientesSica = pendientesSnapshot.size;
            
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
    // LISTENERS EN TIEMPO REAL
    // ==========================================

    escucharPendientesSICA(callback) {
        console.log('👂 Configurando listener para pendientes SICA...');
        
        return this.servicioSocialCollection
            .where('porAutorizar', '==', 'Pendiente')
            .onSnapshot(snapshot => {
                console.log('🔔 Actualización en pendientes SICA');
                callback(snapshot.size);
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

console.log('✅ Módulo BitacoraFirebase cargado correctamente');