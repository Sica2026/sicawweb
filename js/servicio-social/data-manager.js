// data-manager.js
// Módulo para manejo de datos y Firestore

class DataManager {
    constructor(core) {
        this.core = core;
    }

    async loadData() {
        try {
            this.core.showLoading(true);
            
            console.log('📊 Cargando datos de asesores y servicio social...');
            
            await this.loadAsesores();
            await this.loadServicioSocialData();
            this.combineData();
            this.loadCarrerasFilter();
            
            this.core.showLoading(false);
            
            console.log('✅ Datos cargados exitosamente');
            return true;
            
        } catch (error) {
            console.error('❌ Error cargando datos:', error);
            this.core.showNotification('Error al cargar los datos', 'error');
            this.core.showLoading(false);
            throw error;
        }
    }

    async loadAsesores() {
        if (!this.core.db) return;
        
        try {
            const snapshot = await this.core.db.collection('asesores')
                .where('estado', '==', 'aprobado')
                .where('servicioSocial', '==', true)
                .get();
            
            this.core.asesores = [];
            snapshot.forEach(doc => {
                this.core.asesores.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            console.log(`📋 ${this.core.asesores.length} asesores con servicio social cargados`);
            
        } catch (error) {
            console.error('Error cargando asesores:', error);
            throw error;
        }
    }

    async loadServicioSocialData() {
        if (!this.core.db) return;
        
        try {
            const snapshot = await this.core.db.collection('serviciosocial').get();
            
            this.core.servicioSocialData = [];
            snapshot.forEach(doc => {
                this.core.servicioSocialData.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            console.log(`📋 ${this.core.servicioSocialData.length} registros de servicio social cargados`);
            
        } catch (error) {
            console.error('Error cargando servicio social:', error);
        }
    }

    combineData() {
        this.core.asesores = this.core.asesores.map(asesor => {
            const servicioData = this.core.servicioSocialData.find(ss => ss.asesorId === asesor.id);
            return {
                ...asesor,
                servicioSocial: servicioData || {
                    estadoTermino: null,
                    fechaInicio: '',
                    fechaTermino: '',
                    clavePrograma: '',
                    folioAceptacion: '',
                    folioTermino: '',
                    fechaEntregaCarta: '',
                    horasAsesor: 0,
                    horasServicioSocial: 0,
                    totalHoras: 0,
                    ajustesHoras: 0,
                    cartaPresentacion: null,
                    cartaAceptacion: null,
                    cartaTermino: null,
                    reporteSS: null
                }
            };
        });
        
        this.core.filteredAsesores = [...this.core.asesores];
    }

    loadCarrerasFilter() {
        const carreras = [...new Set(this.core.asesores.map(a => a.carrera).filter(Boolean))];
        const select = document.getElementById('carreraFilter');
        
        if (select) {
            while (select.children.length > 1) {
                select.removeChild(select.lastChild);
            }
            
            carreras.forEach(carrera => {
                const option = document.createElement('option');
                option.value = carrera;
                option.textContent = carrera;
                select.appendChild(option);
            });
        }
    }

    async saveServicioSocial(formData) {
        try {
            this.core.showLoadingModal('Guardando información...');
            
            if (this.core.currentAsesor.servicioSocial.pendingFiles) {
                await this.uploadPendingFiles(formData);
            }
            
            if (this.core.currentAsesor.servicioSocial.filesToDelete) {
                await this.deleteMarkedFiles();
            }
            
            await this.saveToFirestore(formData);
            this.updateLocalData(formData);
            
            return true;
            
        } catch (error) {
            console.error('Error guardando:', error);
            throw error;
        } finally {
            this.core.hideLoadingModal();
        }
    }

    async uploadPendingFiles(formData) {
        const pendingFiles = this.core.currentAsesor.servicioSocial.pendingFiles;
        
        for (const [fieldName, file] of Object.entries(pendingFiles)) {
            try {
                const fileName = `servicio-social/${this.core.currentAsesor.id}/${fieldName}_${Date.now()}.pdf`;
                const uploadTask = this.core.storage.ref(fileName).put(file);
                
                const snapshot = await uploadTask;
                const downloadURL = await snapshot.ref.getDownloadURL();
                
                formData[fieldName] = {
                    name: file.name,
                    url: downloadURL,
                    uploadDate: new Date()
                };
                
            } catch (error) {
                console.error(`Error subiendo ${fieldName}:`, error);
                throw new Error(`Error subiendo ${fieldName}`);
            }
        }
    }

    async deleteMarkedFiles() {
        const filesToDelete = this.core.currentAsesor.servicioSocial.filesToDelete || [];
        
        for (const fieldName of filesToDelete) {
            try {
                const fileData = this.core.currentAsesor.servicioSocial[fieldName];
                if (fileData && fileData.url) {
                    const fileRef = this.core.storage.refFromURL(fileData.url);
                    await fileRef.delete();
                }
            } catch (error) {
                console.error(`Error eliminando archivo ${fieldName}:`, error);
            }
        }
    }

    async saveToFirestore(formData) {
        const docRef = this.core.db.collection('serviciosocial').doc(this.core.currentAsesor.id);
        await docRef.set(formData, { merge: true });
    }

    updateLocalData(formData) {
        const asesorIndex = this.core.asesores.findIndex(a => a.id === this.core.currentAsesor.id);
        if (asesorIndex !== -1) {
            this.core.asesores[asesorIndex].servicioSocial = formData;
        }
        
        const ssIndex = this.core.servicioSocialData.findIndex(ss => ss.asesorId === this.core.currentAsesor.id);
        if (ssIndex !== -1) {
            this.core.servicioSocialData[ssIndex] = formData;
        } else {
            this.core.servicioSocialData.push(formData);
        }
        
        delete this.core.currentAsesor.servicioSocial.pendingFiles;
        delete this.core.currentAsesor.servicioSocial.filesToDelete;
    }

    

    getFormData() {
        return {
            asesorId: this.core.currentAsesor.id,
            estadoTermino: document.getElementById('estadoTermino')?.value || '',
            fechaInicio: document.getElementById('fechaInicio')?.value || '',
            fechaTermino: document.getElementById('fechaTermino')?.value || '',
            clavePrograma: document.getElementById('clavePrograma')?.value || '',
            folioAceptacion: document.getElementById('folioAceptacion')?.value || '',
            folioTermino: document.getElementById('folioTermino')?.value || '',
            fechaEntregaCarta: document.getElementById('fechaEntregaCarta')?.value || '',
            horasAsesor: parseFloat(document.getElementById('horasAsesor')?.value) || 0,
            horasServicioSocial: parseFloat(document.getElementById('horasServicioSocial')?.value) || 0,
            totalHoras: parseFloat(document.getElementById('totalHoras')?.value) || 0,
            ajustesHoras: parseFloat(document.getElementById('ajustesHoras')?.value) || 0,
            cartaPresentacion: this.core.currentAsesor.servicioSocial.cartaPresentacion,
            cartaAceptacion: this.core.currentAsesor.servicioSocial.cartaAceptacion,
            cartaTermino: this.core.currentAsesor.servicioSocial.cartaTermino,
            reporteSS: this.core.currentAsesor.servicioSocial.reporteSS,
            fechaActualizacion: new Date()
        };
    }
}



window.DataManager = DataManager;