// ss.js - Version de prueba simplificada
function ServicioSocialCarousel() {
    this.currentIndex = 0;
    this.cards = document.querySelectorAll('.card');
    this.track = document.getElementById('carouselTrack');
    this.prevBtn = document.getElementById('prevBtn');
    this.nextBtn = document.getElementById('nextBtn');
    this.modal = document.getElementById('studentModal');
    this.closeBtn = document.querySelector('.close');
    
    this.panelOverlay = document.getElementById('panelOverlay');
    this.panelContainer = document.getElementById('panelContainer');
    this.panelClose = document.getElementById('panelClose');
    this.panelTitle = document.getElementById('panelTitle');
    this.studentsGrid = document.getElementById('studentsGrid');
    
    this.studentsData = {
        'SS-2024-001': {
            name: 'Maria Garcia Lopez',
            career: 'Ingenieria en Sistemas',
            faculty: 'Facultad de Ingenieria',
            folio: 'SS-2024-001',
            progress: 75,
            startDate: '15 Ene 2024',
            endDate: '15 Jul 2024',
            scholarship: 'Si - Beca de Excelencia',
            lastUpdate: '12 Jul 2024 - 14:30',
            photo: this.createPhoto('#9da5b4')
        },
        'SS-2024-002': {
            name: 'Carlos Rodriguez Martinez',
            career: 'Licenciatura en Psicologia',
            faculty: 'Facultad de Psicologia',
            folio: 'SS-2024-002',
            progress: 45,
            startDate: '20 Feb 2024',
            endDate: '20 Ago 2024',
            scholarship: 'No',
            lastUpdate: '11 Jul 2024 - 09:15',
            photo: this.createPhoto('#8363d3')
        },
        'SS-2024-003': {
            name: 'Ana Sofia Hernandez',
            career: 'Bachillerato General',
            faculty: 'Preparatoria No. 2',
            folio: 'SS-2024-003',
            progress: 90,
            startDate: '10 Mar 2024',
            endDate: '10 Sep 2024',
            scholarship: 'Si - Beca Socioeconomica',
            lastUpdate: '13 Jul 2024 - 16:45',
            photo: this.createPhoto('#f97fa7')
        }
    };
    
    this.gridData = this.generateGridData();
    this.init();
}

ServicioSocialCarousel.prototype.createPhoto = function(color) {
    var svg = '<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">';
    svg += '<rect width="200" height="200" fill="#f3f4f6"/>';
    svg += '<circle cx="100" cy="70" r="35" fill="' + color + '"/>';
    svg += '<path d="M50 150c0-27.614 22.386-50 50-50s50 22.386 50 50v50H50v-50z" fill="' + color + '"/>';
    svg += '</svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
};

ServicioSocialCarousel.prototype.generateGridData = function() {
    var names = ['Ana Garcia', 'Luis Lopez', 'Maria Rodriguez', 'Carlos Martinez', 'Elena Perez'];
    var careers = ['Ing. Sistemas', 'Medicina', 'Derecho', 'Psicologia', 'Administracion'];
    var faculties = ['Facultad de Ingenieria', 'Facultad de Medicina', 'Preparatoria No. 1'];
    var colors = ['#9da5b4', '#8363d3', '#f97fa7', '#3b82f6', '#a855f7'];
    
    var categories = ['registrado', 'proceso', 'creditos', 'terminado', 'cancelado'];
    var result = {};
    
    for (var c = 0; c < categories.length; c++) {
        var category = categories[c];
        result[category] = [];
        for (var i = 0; i < 21; i++) {
            var ss = Math.floor(Math.random() * 400) + 80;
            var restan = Math.max(0, 480 - ss);
            var percentage = Math.floor((ss / 480) * 100);
            
            result[category].push({
                id: category + '-' + (i + 1),
                name: names[i % names.length],
                career: careers[i % careers.length],
                faculty: faculties[i % faculties.length],
                photo: this.createPhoto(colors[i % colors.length]),
                ss: ss,
                restan: restan,
                percentage: percentage,
                folio: 'SS-2024-' + (i + 100),
                endDate: '15 Jul 2024',
                status: ['Firma', 'Carta de Presentacion', 'Confirmacion'][i % 3],
                progress: percentage,
                startDate: '15 Ene 2024',
                scholarship: Math.random() > 0.5 ? 'Si' : 'No',
                lastUpdate: '12 Jul 2024 - 14:30'
            });
        }
    }
    
    return result;
};

ServicioSocialCarousel.prototype.init = function() {
    this.setupEvents();
    this.updateCarousel();
};

ServicioSocialCarousel.prototype.setupEvents = function() {
    var self = this;
    
    if (this.prevBtn) {
        this.prevBtn.onclick = function() { self.prev(); };
    }
    if (this.nextBtn) {
        this.nextBtn.onclick = function() { self.next(); };
    }
    if (this.closeBtn) {
        this.closeBtn.onclick = function() { self.closeModal(); };
    }
    if (this.panelClose) {
        this.panelClose.onclick = function() { self.closePanel(); };
    }
    
    if (this.modal) {
        this.modal.onclick = function(e) {
            if (e.target === self.modal) self.closeModal();
        };
    }
    
    if (this.panelOverlay) {
        this.panelOverlay.onclick = function(e) {
            if (e.target === self.panelOverlay) self.closePanel();
        };
    }
    
    for (var i = 0; i < this.cards.length; i++) {
        this.cards[i].onclick = function(e) {
            if (!e.target.closest('.case-item.clickable')) {
                var category = this.getAttribute('data-category');
                self.openPanel(category);
            }
        };
    }
    
    var clickableItems = document.querySelectorAll('.case-item.clickable');
    for (var i = 0; i < clickableItems.length; i++) {
        clickableItems[i].onclick = function(e) {
            e.stopPropagation();
            var folio = this.getAttribute('data-folio');
            self.showStudentDetails(folio);
        };
    }
    
    document.onkeydown = function(e) {
        if (e.key === 'ArrowLeft') self.prev();
        if (e.key === 'ArrowRight') self.next();
        if (e.key === 'Escape') {
            self.closeModal();
            self.closePanel();
        }
    };
};

ServicioSocialCarousel.prototype.prev = function() {
    this.currentIndex = this.currentIndex > 0 ? this.currentIndex - 1 : this.cards.length - 1;
    this.updateCarousel();
};

ServicioSocialCarousel.prototype.next = function() {
    this.currentIndex = this.currentIndex < this.cards.length - 1 ? this.currentIndex + 1 : 0;
    this.updateCarousel();
};

ServicioSocialCarousel.prototype.updateCarousel = function() {
    if (this.cards.length > 0 && this.track) {
        var cardWidth = this.cards[0].offsetWidth + 32;
        var offset = -this.currentIndex * cardWidth;
        this.track.style.transform = 'translateX(' + offset + 'px)';
    }
};

ServicioSocialCarousel.prototype.openPanel = function(category) {
    if (!this.panelOverlay) return;
    
    if (this.panelTitle) {
        this.panelTitle.textContent = 'Estudiantes - ' + category;
    }
    
    this.generateGrid(category);
    this.panelOverlay.style.display = 'block';
    var self = this;
    setTimeout(function() {
        self.panelOverlay.classList.add('active');
        self.panelContainer.classList.add('active');
    }, 10);
};

ServicioSocialCarousel.prototype.closePanel = function() {
    if (!this.panelOverlay) return;
    this.panelOverlay.classList.remove('active');
    this.panelContainer.classList.remove('active');
    var self = this;
    setTimeout(function() {
        self.panelOverlay.style.display = 'none';
        if (self.studentsGrid) self.studentsGrid.innerHTML = '';
    }, 500);
};

ServicioSocialCarousel.prototype.generateGrid = function(category) {
    if (!this.studentsGrid) return;
    
    var students = this.gridData[category] || [];
    this.studentsGrid.innerHTML = '';
    var self = this;
    
    for (var i = 0; i < students.length; i++) {
        var student = students[i];
        var card = document.createElement('div');
        card.className = 'student-card';
        
        var details = this.getDetailsForCategory(category, student);
        
        card.innerHTML = '<img src="' + student.photo + '" alt="' + student.name + '" class="student-photo-mini"><div class="student-info-mini"><div class="student-name-mini">' + student.name + '</div><div class="student-details-mini">' + details + '</div><div class="career-mini">' + student.career + '</div></div>';
        
        card.onclick = function(student) {
            return function() {
                self.studentsData[student.folio] = student;
                self.closePanel();
                setTimeout(function() {
                    self.showStudentDetails(student.folio);
                }, 500);
            };
        }(student);
        
        this.studentsGrid.appendChild(card);
    }
};

ServicioSocialCarousel.prototype.getDetailsForCategory = function(category, student) {
    var details = '';
    
    if (category === 'registrado') {
        details = '<div class="detail-row"><span class="detail-label">SS:</span><span class="detail-value">' + student.ss + 'h</span></div>';
        details += '<div class="detail-row"><span class="detail-label">Restan:</span><span class="detail-value">' + student.restan + 'h</span></div>';
        details += '<div class="detail-row"><span class="detail-label">Folio:</span><span class="detail-value">' + student.folio + '</span></div>';
        details += '<div class="detail-row"><span class="detail-label">Termino:</span><span class="detail-value">' + student.endDate + '</span></div>';
    } else if (category === 'proceso') {
        details = '<div class="detail-row"><span class="detail-label">SS:</span><span class="detail-value">' + student.ss + 'h</span></div>';
        details += '<div class="detail-row"><span class="detail-label">Restan:</span><span class="detail-value">' + student.restan + 'h</span></div>';
        details += '<div class="detail-row"><span class="detail-label">Status:</span><span class="detail-value">' + student.status + '</span></div>';
    } else if (category === 'creditos') {
        details = '<div class="detail-row"><span class="detail-label">SS:</span><span class="detail-value">' + student.ss + 'h</span></div>';
        details += '<div class="detail-row"><span class="detail-label">Restan:</span><span class="detail-value">' + student.restan + 'h</span></div>';
        details += '<div class="detail-row"><span class="detail-label">Avance:</span><span class="detail-value">' + student.percentage + '%</span></div>';
    } else if (category === 'terminado') {
        details = '<div class="detail-row"><span class="detail-label">SS:</span><span class="detail-value">' + student.ss + 'h</span></div>';
        details += '<div class="detail-row"><span class="detail-label">Restan:</span><span class="detail-value">0h</span></div>';
        details += '<div class="detail-row"><span class="detail-label">Folio:</span><span class="detail-value">' + student.folio + '</span></div>';
        details += '<div class="detail-row"><span class="detail-label">Termino:</span><span class="detail-value">' + student.endDate + '</span></div>';
    } else {
        details = '<div class="detail-row"><span class="detail-label">SS:</span><span class="detail-value">' + student.ss + 'h</span></div>';
        details += '<div class="detail-row"><span class="detail-label">Restan:</span><span class="detail-value">' + student.restan + 'h</span></div>';
        details += '<div class="detail-row"><span class="detail-label">Folio:</span><span class="detail-value">' + student.folio + '</span></div>';
        details += '<div class="detail-row"><span class="detail-label">Estado:</span><span class="detail-value">Cancelado</span></div>';
    }
    
    return details;
};

ServicioSocialCarousel.prototype.showStudentDetails = function(folio) {
    var student = this.studentsData[folio];
    if (!student) return;

    this.updateElement('studentPhoto', student.photo);
    this.updateElement('studentName', student.name);
    this.updateElement('studentCareer', student.career);
    this.updateElement('studentFaculty', student.faculty);
    this.updateElement('studentFolio', student.folio);
    this.updateElement('studentProgress', student.progress + '%');
    this.updateElement('studentStartDate', student.startDate);
    this.updateElement('studentEndDate', student.endDate);
    this.updateElement('studentScholarship', student.scholarship);
    this.updateElement('lastUpdate', student.lastUpdate);
    this.updateElement('progressFill', student.progress + '%');
    
    this.resetPanels();
    this.setupModalEvents(student);
    this.populateDetailedInfo(student);
    
    if (this.modal) {
        this.modal.style.display = 'block';
        var self = this;
        setTimeout(function() {
            self.modal.style.opacity = '1';
        }, 10);
    }
};

ServicioSocialCarousel.prototype.updateElement = function(id, value) {
    var element = document.getElementById(id);
    if (element) {
        if (id === 'studentPhoto') {
            element.src = value;
        } else if (id === 'progressFill') {
            element.style.width = value;
        } else {
            element.textContent = value;
        }
    }
};

ServicioSocialCarousel.prototype.resetPanels = function() {
    var detailedPanel = document.getElementById('detailedInfoPanel');
    var docsPanel = document.getElementById('docsGenerationPanel');
    var photoContainer = document.getElementById('studentPhotoContainer');
    var infoGrid = document.querySelector('.info-grid');
    
    if (detailedPanel) {
        detailedPanel.style.display = 'none';
        detailedPanel.classList.remove('active');
    }
    if (docsPanel) {
        docsPanel.style.display = 'none';
        docsPanel.classList.remove('active');
    }
    if (photoContainer) {
        photoContainer.classList.remove('minimized');
    }
    if (infoGrid) {
        infoGrid.classList.remove('hidden');
    }
};

ServicioSocialCarousel.prototype.setupModalEvents = function(student) {
    var self = this;
    var generateBtn = document.getElementById('generateDocsBtn');
    var photoContainer = document.getElementById('studentPhotoContainer');
    var editBtn = document.getElementById('editInfoBtn');
    var updateBtn = document.getElementById('updateInfoBtn');
    var closeDetailedBtn = document.getElementById('closeDetailedBtn');
    var closeDocsBtn = document.getElementById('closeDocsGenBtn');
    var editDocsBtn = document.getElementById('editDocsBtn');
    
    if (generateBtn) {
        generateBtn.onclick = function() { self.openDocsPanel(student); };
    }
    
    if (photoContainer) {
        photoContainer.onclick = function() { self.toggleDetailedPanel(); };
    }
    
    if (editBtn) {
        editBtn.onclick = function() { self.toggleEditMode(true); };
    }
    
    if (updateBtn) {
        updateBtn.onclick = function() { self.updateInfo(); };
    }
    
    if (closeDetailedBtn) {
        closeDetailedBtn.onclick = function() { self.closeDetailedPanel(); };
    }
    
    if (closeDocsBtn) {
        closeDocsBtn.onclick = function() { self.closeDocsPanel(); };
    }
    
    if (editDocsBtn) {
        editDocsBtn.onclick = function() { self.toggleDocsOCR(true); };
    }
    
    this.setupCollapsible();
    this.setupOCREvents();
    this.setupDocGenerationButtons();
};

ServicioSocialCarousel.prototype.setupOCREvents = function() {
    var self = this;
    var fileUploadArea = document.getElementById('fileUploadArea');
    var pdfFileInput = document.getElementById('pdfFileInput');
    var ocrSaveBtn = document.getElementById('ocrSaveBtn');
    var ocrCancelBtn = document.getElementById('ocrCancelBtn');
    
    if (fileUploadArea && pdfFileInput) {
        fileUploadArea.onclick = function() { pdfFileInput.click(); };
        
        fileUploadArea.ondragover = function(e) {
            e.preventDefault();
            fileUploadArea.classList.add('dragover');
        };
        
        fileUploadArea.ondragleave = function() {
            fileUploadArea.classList.remove('dragover');
        };
        
        fileUploadArea.ondrop = function(e) {
            e.preventDefault();
            fileUploadArea.classList.remove('dragover');
            var files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type === 'application/pdf') {
                self.processPDF(files[0]);
            }
        };
        
        pdfFileInput.onchange = function(e) {
            if (e.target.files.length > 0) {
                self.processPDF(e.target.files[0]);
            }
        };
    }
    
    if (ocrSaveBtn) {
        ocrSaveBtn.onclick = function() { self.saveOCRChanges(); };
    }
    
    if (ocrCancelBtn) {
        ocrCancelBtn.onclick = function() { self.toggleDocsOCR(false); };
    }
};

ServicioSocialCarousel.prototype.setupDocGenerationButtons = function() {
    var self = this;
    var cartaAceptacionBtn = document.getElementById('genCartaAceptacion');
    var cartaTerminoBtn = document.getElementById('genCartaTermino');
    var informeBtn = document.getElementById('genInforme');
    
    if (cartaAceptacionBtn) {
        cartaAceptacionBtn.onclick = function() { self.generateDocument('carta-aceptacion'); };
    }
    
    if (cartaTerminoBtn) {
        cartaTerminoBtn.onclick = function() { self.generateDocument('carta-termino'); };
    }
    
    if (informeBtn) {
        informeBtn.onclick = function() { self.generateDocument('informe'); };
    }
};

ServicioSocialCarousel.prototype.setupCollapsible = function() {
    var headers = document.querySelectorAll('.section-header');
    for (var i = 0; i < headers.length; i++) {
        headers[i].onclick = function() {
            var section = this.getAttribute('data-section');
            var content = document.getElementById(section + '-section');
            if (content) {
                this.classList.toggle('collapsed');
                content.classList.toggle('collapsed');
            }
        };
    }
};

ServicioSocialCarousel.prototype.toggleDetailedPanel = function() {
    var detailedPanel = document.getElementById('detailedInfoPanel');
    if (detailedPanel && detailedPanel.classList.contains('active')) {
        this.closeDetailedPanel();
    } else {
        this.openDetailedPanel();
    }
};

ServicioSocialCarousel.prototype.openDetailedPanel = function() {
    var photoContainer = document.getElementById('studentPhotoContainer');
    var detailedPanel = document.getElementById('detailedInfoPanel');
    var studentInfo = document.getElementById('studentInfo');
    var infoGrid = document.querySelector('.info-grid');
    
    if (photoContainer) photoContainer.classList.add('minimized');
    if (infoGrid) infoGrid.classList.add('hidden');
    if (studentInfo) {
        studentInfo.style.opacity = '0';
        studentInfo.style.transform = 'translateY(-20px)';
        studentInfo.style.pointerEvents = 'none';
    }
    
    if (detailedPanel) {
        detailedPanel.style.display = 'block';
        setTimeout(function() {
            detailedPanel.classList.add('active');
        }, 200);
    }
};

ServicioSocialCarousel.prototype.closeDetailedPanel = function() {
    var self = this;
    var photoContainer = document.getElementById('studentPhotoContainer');
    var detailedPanel = document.getElementById('detailedInfoPanel');
    var studentInfo = document.getElementById('studentInfo');
    var infoGrid = document.querySelector('.info-grid');
    
    if (detailedPanel) {
        detailedPanel.classList.remove('active');
        setTimeout(function() {
            detailedPanel.style.display = 'none';
            if (photoContainer) photoContainer.classList.remove('minimized');
            if (studentInfo) {
                studentInfo.style.opacity = '1';
                studentInfo.style.transform = 'translateY(0)';
                studentInfo.style.pointerEvents = 'auto';
            }
            if (infoGrid) infoGrid.classList.remove('hidden');
        }, 500);
    }
};

ServicioSocialCarousel.prototype.openDocsPanel = function(student) {
    var docsPanel = document.getElementById('docsGenerationPanel');
    var photoContainer = document.getElementById('studentPhotoContainer');
    var studentInfo = document.getElementById('studentInfo');
    var infoGrid = document.querySelector('.info-grid');
    
    if (photoContainer) photoContainer.classList.add('minimized');
    if (infoGrid) infoGrid.classList.add('hidden');
    if (studentInfo) {
        studentInfo.style.opacity = '0';
        studentInfo.style.transform = 'translateY(-20px)';
        studentInfo.style.pointerEvents = 'none';
    }
    
    this.populateDocsInfo(student);
    
    if (docsPanel) {
        docsPanel.style.display = 'block';
        setTimeout(function() {
            docsPanel.classList.add('active');
        }, 200);
    }
};

ServicioSocialCarousel.prototype.closeDocsPanel = function() {
    var self = this;
    var docsPanel = document.getElementById('docsGenerationPanel');
    var photoContainer = document.getElementById('studentPhotoContainer');
    var studentInfo = document.getElementById('studentInfo');
    var infoGrid = document.querySelector('.info-grid');
    
    if (docsPanel) {
        docsPanel.classList.remove('active');
        setTimeout(function() {
            docsPanel.style.display = 'none';
            if (photoContainer) photoContainer.classList.remove('minimized');
            if (studentInfo) {
                studentInfo.style.opacity = '1';
                studentInfo.style.transform = 'translateY(0)';
                studentInfo.style.pointerEvents = 'auto';
            }
            if (infoGrid) infoGrid.classList.remove('hidden');
        }, 500);
    }
};

ServicioSocialCarousel.prototype.populateDocsInfo = function(student) {
    var ocrData = {
        apellidoPaterno: 'GARCIA',
        apellidoMaterno: 'CIFUENTES', 
        nombre: 'KARIME',
        numeroCuenta: '422079941',
        carrera: 'INGENIERIA QUIMICA',
        nombrePrograma: 'Sala De Informatica Y Computo Para Alumnos (SICA)',
        clave: 'SS-2025-12/157-7243',
        fechaInicio: '18 de junio de 2025',
        fechaTermino: '18 de diciembre de 2025',
        folio: 'FQUI/SAA/CAA/SS/9/2025'
    };
    
    var keys = Object.keys(ocrData);
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var element = document.getElementById('docs' + key.charAt(0).toUpperCase() + key.slice(1));
        if (element) element.textContent = ocrData[key];
    }
};

ServicioSocialCarousel.prototype.toggleDocsOCR = function(showOCR) {
    var docsInfoView = document.getElementById('docsInfoView');
    var docsOcrView = document.getElementById('docsOcrView');
    var editDocsBtn = document.getElementById('editDocsBtn');
    
    if (showOCR) {
        if (docsInfoView) docsInfoView.style.display = 'none';
        if (docsOcrView) docsOcrView.style.display = 'block';
        if (editDocsBtn) editDocsBtn.style.display = 'none';
    } else {
        if (docsInfoView) docsInfoView.style.display = 'block';
        if (docsOcrView) docsOcrView.style.display = 'none';
        if (editDocsBtn) editDocsBtn.style.display = 'flex';
        this.resetOCRInterface();
    }
};

ServicioSocialCarousel.prototype.processPDF = function(file) {
    var self = this;
    var ocrProgress = document.getElementById('ocrProgress');
    var ocrProgressFill = document.getElementById('ocrProgressFill');
    var ocrProgressText = document.getElementById('ocrProgressText');
    var ocrResults = document.getElementById('ocrResults');
    
    if (ocrProgress) ocrProgress.style.display = 'block';
    if (ocrResults) ocrResults.style.display = 'none';
    
    // Mostrar progreso inicial
    if (ocrProgressFill) ocrProgressFill.style.width = '10%';
    if (ocrProgressText) ocrProgressText.textContent = 'Cargando PDF...';
    
    // Usar PDF.js para convertir PDF a imágenes
    var fileReader = new FileReader();
    fileReader.onload = function(e) {
        var typedarray = new Uint8Array(e.target.result);
        
        // Cargar PDF.js desde CDN
        if (typeof pdfjsLib === 'undefined') {
            var script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.onload = function() {
                pdfjsLib.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                self.processPDFWithLibrary(typedarray);
            };
            document.head.appendChild(script);
        } else {
            self.processPDFWithLibrary(typedarray);
        }
    };
    
    fileReader.readAsArrayBuffer(file);
};

ServicioSocialCarousel.prototype.processPDFWithLibrary = function(typedarray) {
    var self = this;
    var ocrProgressFill = document.getElementById('ocrProgressFill');
    var ocrProgressText = document.getElementById('ocrProgressText');
    
    if (ocrProgressFill) ocrProgressFill.style.width = '30%';
    if (ocrProgressText) ocrProgressText.textContent = 'Procesando PDF...';
    
    pdfjsLib.getDocument(typedarray).promise.then(function(pdf) {
        // Obtener primera página
        return pdf.getPage(1);
    }).then(function(page) {
        if (ocrProgressFill) ocrProgressFill.style.width = '50%';
        if (ocrProgressText) ocrProgressText.textContent = 'Convirtiendo a imagen...';
        
        var scale = 2.0;
        var viewport = page.getViewport({ scale: scale });
        
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        var renderContext = {
            canvasContext: context,
            viewport: viewport
        };
        
        return page.render(renderContext).promise.then(function() {
            return canvas.toDataURL('image/png');
        });
    }).then(function(imageDataUrl) {
        // Cargar Tesseract.js para OCR
        if (typeof Tesseract === 'undefined') {
            var script = document.createElement('script');
            script.src = 'https://unpkg.com/tesseract.js@4.1.1/dist/tesseract.min.js';
            script.onload = function() {
                self.performOCR(imageDataUrl);
            };
            document.head.appendChild(script);
        } else {
            self.performOCR(imageDataUrl);
        }
    }).catch(function(error) {
        console.error('Error procesando PDF:', error);
        self.showNotification('Error al procesar el PDF', 'error');
        self.resetOCRInterface();
    });
};

ServicioSocialCarousel.prototype.performOCR = function(imageDataUrl) {
    var self = this;
    var ocrProgressFill = document.getElementById('ocrProgressFill');
    var ocrProgressText = document.getElementById('ocrProgressText');
    
    if (ocrProgressFill) ocrProgressFill.style.width = '70%';
    if (ocrProgressText) ocrProgressText.textContent = 'Extrayendo texto con OCR...';
    
    Tesseract.recognize(imageDataUrl, 'spa', {
        logger: function(m) {
            if (m.status === 'recognizing text') {
                var progress = 70 + (m.progress * 30);
                if (ocrProgressFill) ocrProgressFill.style.width = progress + '%';
                if (ocrProgressText) ocrProgressText.textContent = 'Reconociendo texto... ' + Math.round(m.progress * 100) + '%';
            }
        }
    }).then(function(result) {
        if (ocrProgressFill) ocrProgressFill.style.width = '100%';
        if (ocrProgressText) ocrProgressText.textContent = 'Procesando información extraída...';
        
        var extractedText = result.data.text;
        console.log('Texto extraído:', extractedText);
        
        // Procesar el texto extraído
        var parsedData = self.parseExtractedText(extractedText);
        
        setTimeout(function() {
            self.showOCRResults(parsedData);
        }, 1000);
        
    }).catch(function(error) {
        console.error('Error en OCR:', error);
        self.showNotification('Error al extraer texto del PDF', 'error');
        self.resetOCRInterface();
    });
};

ServicioSocialCarousel.prototype.parseExtractedText = function(text) {
    var data = {
        apellidoPaterno: '',
        apellidoMaterno: '',
        nombre: '',
        numeroCuenta: '',
        carrera: '',
        nombrePrograma: '',
        clave: '',
        fechaInicio: '',
        fechaTermino: '',
        folio: ''
    };
    
    try {
        // Buscar el nombre del estudiante
        var nombreMatch = text.match(/alumno\(a\)\s+([A-ZÁÉÍÓÚÜÑ\s]+)\s+con\s+número/i);
        if (nombreMatch) {
            var nombreCompleto = nombreMatch[1].trim();
            var partesNombre = nombreCompleto.split(/\s+/);
            if (partesNombre.length >= 3) {
                data.apellidoPaterno = partesNombre[0];
                data.apellidoMaterno = partesNombre[1];
                data.nombre = partesNombre.slice(2).join(' ');
            } else if (partesNombre.length === 2) {
                data.apellidoPaterno = partesNombre[0];
                data.nombre = partesNombre[1];
            }
        }
        
        // Buscar número de cuenta
        var cuentaMatch = text.match(/número\s+de\s+cuenta\s+(\d+)/i);
        if (cuentaMatch) {
            data.numeroCuenta = cuentaMatch[1];
        }
        
        // Buscar carrera
        var carreraMatch = text.match(/carrera\s+de\s+([A-ZÁÉÍÓÚÜÑ\s]+?)\s+que\s+se\s+imparte/i);
        if (carreraMatch) {
            data.carrera = carreraMatch[1].trim();
        }
        
        // Buscar nombre del programa
        var programaMatch = text.match(/programa\s+([^(]+?)\s*\(/i);
        if (programaMatch) {
            data.nombrePrograma = programaMatch[1].trim();
        }
        
        // Buscar clave del programa
        var claveMatch = text.match(/clave\s+([A-Z0-9\-\/]+)/i);
        if (claveMatch) {
            data.clave = claveMatch[1];
        }
        
        // Buscar folio
        var folioMatch = text.match(/FOLIO:\s*([A-Z0-9\/]+)/i);
        if (folioMatch) {
            data.folio = folioMatch[1];
        }
        
        // Buscar fecha (asumiendo que es la fecha del documento)
        var fechaMatch = text.match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i);
        if (fechaMatch) {
            var dia = fechaMatch[1];
            var mes = fechaMatch[2];
            var año = fechaMatch[3];
            data.fechaInicio = dia + ' de ' + mes + ' de ' + año;
            
            // Calcular fecha de término (6 meses después)
            var meses = {
                'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3,
                'mayo': 4, 'junio': 5, 'julio': 6, 'agosto': 7,
                'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
            };
            
            var mesNumero = meses[mes.toLowerCase()];
            if (mesNumero !== undefined) {
                var fechaInicio = new Date(parseInt(año), mesNumero, parseInt(dia));
                var fechaTermino = new Date(fechaInicio);
                fechaTermino.setMonth(fechaTermino.getMonth() + 6);
                
                var mesesNombres = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                                 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
                
                data.fechaTermino = fechaTermino.getDate() + ' de ' + 
                                  mesesNombres[fechaTermino.getMonth()] + ' de ' + 
                                  fechaTermino.getFullYear();
            }
        }
        
        console.log('Datos parseados:', data);
        
    } catch (error) {
        console.error('Error parseando texto:', error);
    }
    
    return data;
};

ServicioSocialCarousel.prototype.showOCRResults = function(parsedData) {
    var ocrProgress = document.getElementById('ocrProgress');
    var ocrResults = document.getElementById('ocrResults');
    
    if (ocrProgress) ocrProgress.style.display = 'none';
    if (ocrResults) ocrResults.style.display = 'block';
    
    // Si no se pudo extraer información, usar datos de ejemplo
    var extractedData = {
        apellidoPaterno: parsedData.apellidoPaterno || 'GARCIA',
        apellidoMaterno: parsedData.apellidoMaterno || 'CIFUENTES',
        nombre: parsedData.nombre || 'KARIME',
        numeroCuenta: parsedData.numeroCuenta || '422079941',
        carrera: parsedData.carrera || 'INGENIERIA QUIMICA',
        nombrePrograma: parsedData.nombrePrograma || 'Sala De Informatica Y Computo Para Alumnos (SICA)',
        clave: parsedData.clave || 'SS-2025-12/157-7243',
        fechaInicio: parsedData.fechaInicio || '18 de junio de 2025',
        fechaTermino: parsedData.fechaTermino || '18 de diciembre de 2025',
        folio: parsedData.folio || 'FQUI/SAA/CAA/SS/9/2025'
    };
    
    var keys = Object.keys(extractedData);
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var element = document.getElementById('ocr' + key.charAt(0).toUpperCase() + key.slice(1));
        if (element) element.value = extractedData[key];
    }
    
    var mensaje = 'PDF procesado exitosamente';
    if (parsedData.apellidoPaterno) {
        mensaje += ' - Información extraída del documento';
    } else {
        mensaje += ' - Se usaron datos de ejemplo (ajusta según sea necesario)';
    }
    
    this.showNotification(mensaje, 'success');
};

ServicioSocialCarousel.prototype.saveOCRChanges = function() {
    var ocrData = {
        apellidoPaterno: document.getElementById('ocrApellidoPaterno').value,
        apellidoMaterno: document.getElementById('ocrApellidoMaterno').value,
        nombre: document.getElementById('ocrNombre').value,
        numeroCuenta: document.getElementById('ocrNumeroCuenta').value,
        carrera: document.getElementById('ocrCarrera').value,
        nombrePrograma: document.getElementById('ocrNombrePrograma').value,
        clave: document.getElementById('ocrClave').value,
        fechaInicio: document.getElementById('ocrFechaInicio').value,
        fechaTermino: document.getElementById('ocrFechaTermino').value,
        folio: document.getElementById('ocrFolio').value
    };
    
    var keys = Object.keys(ocrData);
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var element = document.getElementById('docs' + key.charAt(0).toUpperCase() + key.slice(1));
        if (element) element.textContent = ocrData[key];
    }
    
    this.toggleDocsOCR(false);
    this.showNotification('Informacion actualizada desde OCR', 'success');
};

ServicioSocialCarousel.prototype.resetOCRInterface = function() {
    var ocrProgress = document.getElementById('ocrProgress');
    var ocrResults = document.getElementById('ocrResults');
    var ocrProgressFill = document.getElementById('ocrProgressFill');
    var pdfFileInput = document.getElementById('pdfFileInput');
    
    if (ocrProgress) ocrProgress.style.display = 'none';
    if (ocrResults) ocrResults.style.display = 'none';
    if (ocrProgressFill) ocrProgressFill.style.width = '0%';
    if (pdfFileInput) pdfFileInput.value = '';
};

ServicioSocialCarousel.prototype.generateDocument = function(type) {
    var docNames = {
        'carta-aceptacion': 'Carta de Aceptacion',
        'carta-termino': 'Carta de Termino',
        'informe': 'Informe de Actividades'
    };
    
    var docName = docNames[type] || 'Documento';
    var self = this;
    
    this.showNotification('Generando ' + docName + '...', 'info');
    
    setTimeout(function() {
        self.showNotification(docName + ' generado exitosamente', 'success');
        console.log('Documento generado:', type);
    }, 2000);
};

ServicioSocialCarousel.prototype.populateDetailedInfo = function(student) {
    var nameParts = student.name.split(' ');
    
    var detailData = {
        adminAsignado: 'Dr. Roberto Silva',
        nombre: nameParts[0] || 'N/A',
        apellidoPaterno: nameParts[1] || 'N/A',
        apellidoMaterno: nameParts[2] || 'N/A',
        curp: this.generateCURP(student.name),
        email: this.generateEmail(student.name),
        telefonoCasa: '55-1234-5678',
        telefonoCelular: '55-9876-5432',
        sexo: 'Femenino',
        fechaNacimiento: '15/03/1998',
        estadoCivil: 'Soltero(a)',
        nacionalidad: 'Mexicana',
        nombreAsesor: 'Dra. Carmen Rodriguez',
        calle: 'Av. Universidad 123',
        colonia: 'Ciudad Universitaria',
        municipio: 'Coyoacan',
        entidad: 'Ciudad de Mexico',
        servicioSocial: 'Si',
        fechaInicio: student.startDate,
        horasSemana: '20 horas',
        metodoInscripcion: 'En linea',
        articulo22: 'No',
        clavePrograma: 'SS-' + student.career.substring(0,3).toUpperCase() + '-2024-001',
        nombrePrograma: 'Desarrollo de Sistemas Educativos',
        cartas: 'Parcial',
        documentoSica: 'Si',
        notas: 'Estudiante destacado con excelente desempeno. Carrera: ' + student.career
    };

    var keys = Object.keys(detailData);
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var element = document.getElementById('detail' + key.charAt(0).toUpperCase() + key.slice(1));
        if (element) element.textContent = detailData[key];
    }
    
    this.populateForm(detailData);
};

ServicioSocialCarousel.prototype.populateForm = function(data) {
    var keys = Object.keys(data);
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var element = document.getElementById('edit' + key.charAt(0).toUpperCase() + key.slice(1));
        if (element) element.value = data[key];
    }
};

ServicioSocialCarousel.prototype.generateCURP = function(name) {
    var cleanName = name.replace(/[^A-Za-z\s]/g, '').toUpperCase();
    var parts = cleanName.split(' ');
    var curp = '';
    curp += parts[0] ? parts[0].charAt(0) : 'X';
    curp += parts[0] ? parts[0].charAt(1) || 'X' : 'X';
    curp += parts[1] ? parts[1].charAt(0) : 'X';
    curp += parts[2] ? parts[2].charAt(0) : 'X';
    curp += '980315MDFXXX09';
    return curp;
};

ServicioSocialCarousel.prototype.generateEmail = function(name) {
    var cleanName = name.toLowerCase().replace(/[^a-z\s]/g, '');
    var parts = cleanName.split(' ');
    return (parts[0] || 'usuario') + '.' + (parts[1] || 'apellido') + '@universidad.edu.mx';
};

ServicioSocialCarousel.prototype.toggleEditMode = function(isEditing) {
    var infoView = document.getElementById('infoView');
    var editForm = document.getElementById('editForm');
    var editBtn = document.getElementById('editInfoBtn');
    var updateBtn = document.getElementById('updateInfoBtn');
    
    if (isEditing) {
        if (infoView) infoView.style.display = 'none';
        if (editForm) editForm.style.display = 'block';
        if (editBtn) editBtn.style.display = 'none';
        if (updateBtn) updateBtn.style.display = 'flex';
    } else {
        if (infoView) infoView.style.display = 'block';
        if (editForm) editForm.style.display = 'none';
        if (editBtn) editBtn.style.display = 'flex';
        if (updateBtn) updateBtn.style.display = 'none';
    }
};

ServicioSocialCarousel.prototype.updateInfo = function() {
    this.toggleEditMode(false);
    this.showNotification('Informacion actualizada correctamente', 'success');
};

ServicioSocialCarousel.prototype.closeModal = function() {
    this.closeDetailedPanel();
    this.closeDocsPanel();
    
    if (this.modal) {
        this.modal.style.opacity = '0';
        var self = this;
        setTimeout(function() {
            self.modal.style.display = 'none';
            self.resetPanels();
        }, 300);
    }
};

ServicioSocialCarousel.prototype.showNotification = function(message, type) {
    var notification = document.createElement('div');
    notification.className = 'notification notification-' + type;
    notification.innerHTML = '<span class="notification-icon">' + (type === 'success' ? '✅' : 'ℹ️') + '</span><span class="notification-message">' + message + '</span>';
    
    document.body.appendChild(notification);
    setTimeout(function() {
        notification.classList.add('show');
    }, 10);
    setTimeout(function() {
        notification.classList.remove('show');
        setTimeout(function() {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 4000);
};

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    try {
        window.carousel = new ServicioSocialCarousel();
        console.log('Sistema inicializado correctamente');
    } catch (error) {
        console.error('Error:', error);
    }
});

window.ServicioSocial = {
    carousel: null
};