// carta-termino-prepa-pdf.js 
// Generador de Carta de Término para Preparatoria en formato PDF

class CartaTerminoPrepaPDF {
    constructor() {
        this.config = {
            programa: "Sala de informática y cómputo para alumnos (SICA)",
            horasReglamentarias: 480,
            periodoMeses: 6,
            responsables: {
                coordinadora: "MTRA. ADANELY PÉREZ RODRÍGUEZ",
                cargoCoordinadora: "COORDINADORA GENERAL DE LOS ESTUDIOS TÉCNICOS ESPECIALIZADOS DE LA ESCUELA NACIONAL PREPARATORIA"
            }
        };
    }

    async generar(datosAsesor) {
        try {
            console.log('📄 Generando carta de término Prepa (PDF)...');
            console.log('📋 Datos recibidos:', datosAsesor);

            // Verificar que jsPDF esté disponible
            if (typeof window.jspdf === 'undefined') {
                console.log('📦 Cargando jsPDF...');
                await this.loadJsPDF();
            }

            // Cargar logo
            const logoData = await this.cargarLogo();

            // Crear documento PDF (tamaño oficio aprox.)
            const doc = new window.jspdf.jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: [216, 330]
            });

            // Generar contenido
            await this.generarContenido(doc, datosAsesor, logoData);

            // Descargar archivo
            const fileName = `Carta_Termino_Prepa_${datosAsesor.nombreAsesor.replace(/\s+/g, '_')}_${datosAsesor.numeroCuenta}.pdf`;
            doc.save(fileName);

            return {
                success: true,
                fileName: fileName
            };

        } catch (error) {
            console.error('❌ Error generando carta PDF:', error);
            throw error;
        }
    }

    async loadJsPDF() {
        return new Promise((resolve, reject) => {
            if (window.jspdf) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.js';
            script.onload = () => {
                console.log('✅ jsPDF cargado correctamente');
                resolve();
            };
            script.onerror = () => {
                reject(new Error('No se pudo cargar jsPDF'));
            };
            document.head.appendChild(script);
        });
    }

    async cargarLogo() {
        const posiblesRutas = [
            '../../image/logo-fq.png',
            '../image/logo-fq.png',
            './image/logo-fq.png',
            '/image/logo-fq.png'
        ];

        for (const ruta of posiblesRutas) {
            try {
                console.log(`🔍 Intentando cargar logo desde: ${ruta}`);
                const logoBase64 = await this.imageToBase64(ruta);
                console.log('✅ Logo cargado exitosamente para PDF');
                return {
                    success: true,
                    data: logoBase64,
                    ruta: ruta
                };
            } catch (error) {
                console.log(`❌ Error cargando desde ${ruta}:`, error.message);
                continue;
            }
        }

        console.log('⚠️ No se pudo cargar el logo, usando placeholder');
        return { success: false, data: null, ruta: null };
    }

    async imageToBase64(url) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Timeout cargando imagen'));
            }, 5000);

            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = function() {
                clearTimeout(timeout);
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    canvas.width = this.naturalWidth || this.width;
                    canvas.height = this.naturalHeight || this.height;
                    
                    ctx.drawImage(this, 0, 0);
                    const dataURL = canvas.toDataURL('image/png', 0.9);
                    
                    console.log(`✅ Logo convertido para PDF (${dataURL.length} caracteres)`);
                    resolve(dataURL);
                } catch (error) {
                    reject(new Error(`Error procesando imagen: ${error.message}`));
                }
            };
            
            img.onerror = function() {
                clearTimeout(timeout);
                reject(new Error(`Error cargando imagen desde ${url}`));
            };
            
            img.src = url;
        });
    }

    // =======================
    // HELPERS DE TEXTO RICO
    // =======================
    drawRichText(doc, startX, startY, maxWidth, runs, lineHeight = 6) {
        let y = startY;

        // Convertimos runs en palabras con estilo
        const palabras = [];
        runs.forEach(r => {
            const txt = (typeof r === "string") ? r : r.t || r.text || "";
            const bold = (typeof r === "string") ? false : !!r.b || !!r.bold;
            txt.split(/(\s+)/).forEach(p => {
                if (p !== "") palabras.push({ text: p, bold, width: doc.getTextWidth(p) });
            });
        });

        let linea = [];
        let anchoLinea = 0;

        const flushLine = (justificar = true) => {
            if (linea.length === 0) return;
            let totalPalabras = linea.reduce((a, w) => a + w.width, 0);
            let espacios = linea.length - 1;
            let extraEspacio = justificar && espacios > 0
                ? (maxWidth - totalPalabras) / espacios
                : 0;

            let x = startX;
            linea.forEach((w, i) => {
                doc.setFont("times", w.bold ? "bold" : "normal");
                doc.text(w.text, x, y);
                x += w.width + (i < linea.length - 1 ? extraEspacio : 0);
            });

            y += lineHeight;
            linea = [];
            anchoLinea = 0;
        };

        palabras.forEach(w => {
            if (anchoLinea + w.width > maxWidth && linea.length > 0) {
                flushLine(true);
            }
            linea.push(w);
            anchoLinea += w.width;
        });
        flushLine(false); // última línea no justificada

        return y;
    }

    // Descompone una fecha "YYYY-MM-DD" a partes con nombre de mes en español
    descomponerFecha(fechaString) {
        const f = new Date(fechaString);
        const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
        return {
            dia: f.getDate(),
            mes: meses[f.getMonth()],
            anio: f.getFullYear()
        };
    }

    async generarContenido(doc, datos, logoData) {
        // Configurar fuente
        doc.setFont("times", "normal");
        
        let yPos = 25; // Posición inicial

        // ========================================
        // ENCABEZADO CON LOGO
        // ========================================
        if (logoData && logoData.success) {
            try {
                console.log('🖼️ Agregando logo real al PDF');
                // Logo a la izquierda
                doc.addImage(logoData.data, 'PNG', 25, yPos, 35, 35);
            } catch (error) {
                console.log('⚠️ Error agregando logo, usando placeholder');
                this.dibujarPlaceholderLogo(doc, 20, yPos);
            }
        } else {
            console.log('📝 Dibujando placeholder del logo');
            this.dibujarPlaceholderLogo(doc, 20, yPos);
        }

        // Texto del encabezado a la derecha del logo
        doc.setFontSize(14);
        doc.setFont("times", "bold");
        const titulo1 = "FACULTAD DE QUÍMICA";
        const titulo1Width = doc.getTextWidth(titulo1);
        doc.text(titulo1, 210 - 25 - titulo1Width, yPos + 8);

        doc.setFontSize(12);
        const titulo2 = "SECRETARÍA DE PLANEACIÓN E INFORMÁTICA";
        const titulo2Width = doc.getTextWidth(titulo2);
        doc.text(titulo2, 210 - 25 - titulo2Width, yPos + 15);

        const titulo3 = "CENTRO DE INFORMÁTICA";
        const titulo3Width = doc.getTextWidth(titulo3);
        doc.text(titulo3, 210 - 25 - titulo3Width, yPos + 22);

        yPos += 45; // Espacio después del encabezado

        // ========================================
        // FOLIO (alineado a la derecha)
        // ========================================
        doc.setFont("times", "bold");
        doc.setFontSize(12);
        const folio = `FOLIO: ${datos.folioTermino || ''}`;
        const folioWidth = doc.getTextWidth(folio);
        doc.text(folio, 210 - 25 - folioWidth, yPos); // Alineado a la derecha
        yPos += 10;

        // ========================================
        // FECHA EN ENCABEZADO (alineada a la derecha)
        // ========================================
        const hoyISO = new Date().toISOString().split('T')[0];
        const fechaDoc = datos.fechaCarta || hoyISO;
        const { dia, mes, anio } = this.descomponerFecha(fechaDoc);
        
        const fechaTexto = `Ciudad de México a ${dia} de ${mes} de ${anio}`;
        const fechaWidth = doc.getTextWidth(fechaTexto);
        doc.text(fechaTexto, 210 - 25 - fechaWidth, yPos); // Alineado a la derecha
        yPos += 10;

        // ========================================
        // ASUNTO (alineado a la derecha)
        // ========================================
        doc.setFont("times", "bold");
        const asunto = "Asunto: Carta de término de Servicio Social.";
        const asuntoWidth = doc.getTextWidth(asunto);
        doc.text(asunto, 210 - 25 - asuntoWidth, yPos); // Alineado a la derecha
        yPos += 15;

        // ========================================
        // DESTINATARIOS
        // ========================================
        doc.setFont("times", "bold");
        doc.text(this.config.responsables.coordinadora, 25, yPos);
        yPos += 7;
        
        // Dividir el cargo largo en líneas
        const cargoLineas = doc.splitTextToSize(this.config.responsables.cargoCoordinadora, 160);
        cargoLineas.forEach(linea => {
            doc.text(linea, 25, yPos);
            yPos += 5;
        });
        yPos += 2;
        
        doc.text("PRESENTE", 25, yPos);
        yPos += 15;

        // ========================================
        // CUERPO PRINCIPAL
        // ========================================
        doc.setFontSize(12);
        
        const programaUsado = datos.programa || this.config.programa;
        const fIni = this.formatearFecha(datos.fechaInicio);
        const fFin = this.formatearFecha(datos.fechaTermino);
        const horarioInicio = datos.horarioInicio || "XX";
        const horarioFin = datos.horarioFin || "XX";

        const runsCuerpo = [
            "Por este conducto me permito informar a usted, que el alumno (a) ",
            { b: true, t: datos.nombreAsesor },
            " con número de cuenta ",
            { b: true, t: datos.numeroCuenta },
            ", inscrito en la ",
            { b: true, t: datos.carrera || "XXXXXX" },
            ", ha concluido satisfactoriamente su servicio social, durante un periodo de ",
            { b: true, t: String(this.config.periodoMeses) },
            " meses, en el programa de trabajo \"",
            { b: true, t: programaUsado },
            "\" con clave ",
            { b: true, t: datos.clavePrograma },
            ", que se llevó a cabo en el área de SICA de la Facultad de Química UNAM, su colaboración en el periodo comprendido del ",
            { b: true, t: fIni },
            " al ",
            { b: true, t: fFin },
            ", en un horario de ",
            { b: true, t: horarioInicio },
            " a ",
            { b: true, t: horarioFin },
            ", cubriendo ",
            { b: true, t: String(this.config.horasReglamentarias) },
            " horas totales."
        ];

        yPos = this.drawRichText(doc, 25, yPos, 165, runsCuerpo, 6) + 15;

        // ========================================
        // DESPEDIDA
        // ========================================
        doc.setFont("times", "normal");
        const despedida = "Sin otro particular, agradezco la atención prestada a la presente, reciba un cordial saludo.";
        const lineasDespedida = doc.splitTextToSize(despedida, 165);
        doc.text(lineasDespedida, 25, yPos);
        yPos += lineasDespedida.length * 6 + 20;

        // ========================================
        // ATENTAMENTE
        // ========================================
        doc.setFont("times", "bold");
        doc.setFontSize(12);

        const atentamente = "ATENTAMENTE";
        const atentamenteWidth = doc.getTextWidth(atentamente);
        doc.text(atentamente, (216 - atentamenteWidth) / 2, yPos);
        yPos += 8;

        const lema = '"POR MI RAZA HABLARÁ EL ESPÍRITU"';
        const lemaWidth = doc.getTextWidth(lema);
        doc.text(lema, (216 - lemaWidth) / 2, yPos);
        yPos += 15;

        // ========================================
        // FECHA Y LUGAR FINAL
        // ========================================
        doc.setFont("times", "normal");
        const fechaFinal = `Cd. Universitaria, CDMX ${dia} del ${mes} de ${anio}.`;
        const fechaFinalWidth = doc.getTextWidth(fechaFinal);
        doc.text(fechaFinal, (216 - fechaFinalWidth) / 2, yPos);
        
        // Texto "SELLO" al lado derecho
        doc.setFont("times", "bold");
        const sello = "SELLO";
        doc.text(sello, 170, yPos);
        
        yPos += 25;

        // ========================================
        // LÍNEAS DE FIRMA
        // ========================================
        doc.setFont("times", "normal");
        doc.setFontSize(10);
        
        // Líneas de firma
        doc.line(25, yPos, 95, yPos);
        doc.line(120, yPos, 190, yPos);
        yPos += 10;

        // ========================================
        // FIRMAS ADICIONALES (con negritas)
        // ========================================
        doc.setFontSize(12);

        // Firma izquierda
        doc.setFont("times", "bold");
        doc.text("Ing. Edgar López García", 25, yPos);
        doc.text("Responsable de servicio social SICA", 25, yPos + 5);
        yPos += 15;

        // Firma derecha  
        doc.text("p.IQ Marcos René López Hernández", 120, yPos - 15);
        doc.text("Jefe de Área Salas de Informática y", 120, yPos - 10);
        doc.text("Cómputo para Alumnos (SICA)", 120, yPos - 5);

        // ========================================
        // COPIA
        // ========================================
        doc.setFont("times", "normal");
        doc.setFontSize(10);
        doc.text("c.c.p.- El alumno", 25, yPos + 5);
    }

    dibujarPlaceholderLogo(doc, x, y) {
        // Dibujar círculo para el placeholder
        doc.setDrawColor(51, 51, 51);
        doc.setLineWidth(0.5);
        doc.circle(x + 15, y + 15, 15, 'S');
        
        // Texto del placeholder
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("LOGO", x + 11, y + 12);
        doc.text("FACULTAD", x + 7, y + 15);
        doc.text("QUÍMICA", x + 8, y + 18);
    }

    formatearFecha(fechaString) {
        if (!fechaString) return '';
        
        const fecha = new Date(fechaString);
        const meses = [
            'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
            'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
        ];
        
        const dia = fecha.getDate();
        const mes = meses[fecha.getMonth()];
        const año = fecha.getFullYear();
        
        return `${dia} de ${mes} de ${año}`;
    }

    // Método para actualizar configuración
    actualizarConfiguracion(nuevaConfig) {
        this.config = { ...this.config, ...nuevaConfig };
    }

    obtenerConfiguracion() {
        return { ...this.config };
    }
}

// Función principal para generar carta de término Prepa en PDF
async function generarCartaTerminoPrepaPDF(datosAsesor) {
    try {
        console.log('📄 Generando Carta de Término Prepa (PDF)...');
        
        const generador = new CartaTerminoPrepaPDF();
        
        // Cargar configuración personalizada si existe
        if (window.servicioSocialManager && window.servicioSocialManager.configuracion) {
            const configSS = window.servicioSocialManager.configuracion.cartaTerminoPrepa;
            if (configSS) {
                generador.actualizarConfiguracion(configSS);
            }
        }
        
        const resultado = await generador.generar(datosAsesor);
        
        // Mostrar notificación de éxito
        if (window.servicioSocialManager) {
            window.servicioSocialManager.showNotification(
                'Carta generada exitosamente',
                `Se descargó: ${resultado.fileName}`,
                'success',
                'bi-file-earmark-pdf'
            );
        }
        
        return resultado;
        
    } catch (error) {
        console.error('❌ Error generando carta de término Prepa PDF:', error);
        
        if (window.servicioSocialManager) {
            window.servicioSocialManager.showNotification(
                'Error al generar carta',
                'No se pudo generar el documento PDF',
                'error'
            );
        }
        
        throw error;
    }
}

// Exportar para uso global
window.generarCartaTerminoPrepaPDF = generarCartaTerminoPrepaPDF;
window.generarCartaTerminoPrepaWord = generarCartaTerminoPrepaPDF; // Para compatibilidad con modal
window.CartaTerminoPrepaPDF = CartaTerminoPrepaPDF;

// Verificar que se exportó correctamente
console.log('✅ carta-termino-prepa-pdf.js cargado correctamente');
console.log('📋 Funciones disponibles:', {
    CartaTerminoPrepaPDF: typeof window.CartaTerminoPrepaPDF,
    generarCartaTerminoPrepaPDF: typeof window.generarCartaTerminoPrepaPDF,
    generarCartaTerminoPrepaWord: typeof window.generarCartaTerminoPrepaWord
});