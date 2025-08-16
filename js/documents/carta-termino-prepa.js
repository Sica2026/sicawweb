// carta-termino-FQ-pdf.js 
// Generador de Carta de Término para Facultad de Química en formato PDF

class CartaTerminoFQPDF {
    constructor() {
        this.config = {
            actividades: [
                "Préstamo de equipos de cómputo a los alumnos de la facultad de química.",
                "Atención al servicio de impresiones.",
                "Apoyo en departamentales.",
                "Apoyo en cursos y clases impartidas en la sala de cómputo.",
                "Atención a usuarios con problemas con los equipos."
            ],
            programa: "Sala de Informática y Cómputo para Alumnos (SICA)",
            horasReglamentarias: 480,
            responsables: {
                coordinadora: "MTRA. ADANELY PÉREZ RODRÍGUEZ ",
                cargoCoordinadora: "COORDINADORA GENERAL DE LOS ESTUDIOS TÉCNICOS ESPECIALIZADOS DE LA ESCUELA NACIONAL PREPARATORIA",
                responsableArea: "LIC. ALBERTO PINEDA JIMÉNEZ",
                cargoResponsable: "RESPONSABLE DEL ÁREA DE SERVICIO SOCIAL"
            }
        };
    }

    async generar(datosAsesor) {
        try {
            console.log('📄 Generando carta de término FQ (PDF)...');
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
            const fileName = `Carta_Termino_${datosAsesor.nombreAsesor.replace(/\s+/g, '_')}_${datosAsesor.numeroCuenta}.pdf`;
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
    // Dibuja texto con estilos mezclados (normal/bold) con ajuste de línea
    // Dibuja texto con estilos mezclados (normal/bold) y justificación
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
        const titulo1 = "FACULTAD DE QUÍMICA UNAM";
        const titulo1Width = doc.getTextWidth(titulo1);
        doc.text(titulo1, 210 - 25 - titulo1Width, yPos + 8);

        doc.setFontSize(12);
        const titulo2 = "SECRETARÍA DE";
        const titulo2Width = doc.getTextWidth(titulo2);
        doc.text(titulo2, 210 - 25 - titulo2Width, yPos + 15);

        const titulo3 = "PLANEACIÓN E INFORMÁTICA";
        const titulo3Width = doc.getTextWidth(titulo3);
        doc.text(titulo3, 210 - 25 - titulo3Width, yPos + 22);

        const titulo4 = "CENTRO DE INFORMÁTICA Y SICAS";
        const titulo4Width = doc.getTextWidth(titulo4);
        doc.text(titulo4, 210 - 25 - titulo4Width, yPos + 29);

        yPos += 35; // Espacio después del encabezado

        // ========================================
        // FOLIO
        // ========================================
        doc.setFont("times", "bold");
        doc.setFontSize(12);
        const folio = `FOLIO: ${datos.folioTermino || 'CI/000/2025'}`;
        const folioWidth = doc.getTextWidth(folio);
        doc.text(folio, 210 - 25 - folioWidth, yPos); // Alineado a la derecha
        yPos += 10;

        // ========================================
        // ASUNTO
        // ========================================
        doc.setFont("times", "bold");
        const asunto = "Asunto: Carta de término";
        const asuntoWidth = doc.getTextWidth(asunto);
        doc.text(asunto, 210 - 25 - asuntoWidth, yPos);

        // ========================================
        // DESTINATARIOS
        // ========================================
        doc.setFont("times", "bold");
        doc.text(this.config.responsables.coordinadora, 20, yPos);
        yPos += 5;
        doc.text(this.config.responsables.cargoCoordinadora, 20, yPos);
        yPos += 5;
        doc.text("FACULTAD DE QUÍMICA", 20, yPos);
        yPos += 5;
        doc.text("PRESENTE", 20, yPos);
        yPos += 7;

        // ATENCIÓN
        doc.setFont("times", "bold");
        const atencion1 = `ATENCIÓN. ${this.config.responsables.responsableArea}`;
        const atencion1Width = doc.getTextWidth(atencion1);
        doc.text(atencion1, 210 - 25 - atencion1Width, yPos);
        yPos += 5;

        const atencion2 = this.config.responsables.cargoResponsable;
        const atencion2Width = doc.getTextWidth(atencion2);
        doc.text(atencion2, 210 - 25 - atencion2Width, yPos);

        // ========================================
        // CUERPO PRINCIPAL (con negritas en campos)
        // ========================================
        yPos += 8; // Espacio después de ATENCIÓN
        doc.setFontSize(14);

        const programaUsado = datos.programa || this.config.programa;
        const fIni = this.formatearFecha(datos.fechaInicio);
        const fFin = this.formatearFecha(datos.fechaTermino);

        const runsCuerpo = [
            "Por este conducto me permito informar a usted, que el alumno (a) ",
            { b: true, t: datos.nombreAsesor },
            ", con número de cuenta ",
            { b: true, t: datos.numeroCuenta },
            ", de la Licenciatura en ",
            { b: true, t: datos.carrera },
            " concluyó satisfactoriamente su Servicio Social, cumpliendo las ",
            { b: true, t: String(this.config.horasReglamentarias) },
            " horas reglamentarias, en el programa \"",
            { b: true, t: programaUsado },
            "\" con clave ",
            { b: true, t: datos.clavePrograma },
            ", en el periodo comprendido del ",
            { b: true, t: fIni },
            " al ",
            { b: true, t: fFin },
            ", cumpliendo las siguientes actividades:"
        ];

        yPos = this.drawRichText(doc, 20, yPos, 170, runsCuerpo, 5) + 7;

        // ========================================
        // ACTIVIDADES
        // ========================================
        doc.setFont("times", "bold");
        doc.text("ACTIVIDADES DESARROLLADAS", 20, yPos);
        doc.line(20, yPos + 1, 145, yPos + 1); // Línea de subrayado
        yPos += 7;

        doc.setFont("times", "normal");
        this.config.actividades.forEach(actividad => {
            doc.text(`• ${actividad}`, 25, yPos);
            yPos += 7;
        });

        yPos += 7;

        // ========================================
        // FIRMAS - SOLO LAS ADICIONALES
        // ========================================
        // Asegurar espacio mínimo para las firmas
        if (yPos > 250) { 
            doc.addPage();
            yPos = 25;
        }

        // ========================================
        // DESPEDIDA
        // ========================================
        doc.setFont("times", "normal");
        const despedida = "Sin otro particular, agradezco la atención prestada a la presente, reciba un cordial saludo.";
        const lineasDespedida = doc.splitTextToSize(despedida, 170);
        doc.text(lineasDespedida, 20, yPos);
        yPos += lineasDespedida.length * 5 + 9;

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
        yPos += 8;

        // ========================================
        // FECHA "Ciudad Universitaria" (día y año en negritas)
        // ========================================
        doc.setFont("times", "normal");
        const hoyISO = new Date().toISOString().split('T')[0];
        const fechaCu = datos.fechaCiudad || hoyISO;
        const { dia, mes, anio } = this.descomponerFecha(fechaCu);

        const parte1 = "Ciudad Universitaria, Cd. Mx., a ";
        const parte2 = " de ";
        const parte3 = " de ";
        const punto = ".";

        // Medimos el ancho total para centrar
        const widthTotal =
            doc.getTextWidth(parte1) +
            doc.getTextWidth(String(dia)) +
            doc.getTextWidth(parte2) +
            doc.getTextWidth(mes) +
            doc.getTextWidth(parte3) +
            doc.getTextWidth(String(anio)) +
            doc.getTextWidth(punto);

        const xStart = (216 - widthTotal) / 2;
        let xCursor = xStart;

        const put = (txt, bold = false) => {
            doc.setFont("times", bold ? "bold" : "normal");
            doc.text(txt, xCursor, yPos);
            xCursor += doc.getTextWidth(txt);
        };

        put(parte1, false);
        put(String(dia), true);     // día en negritas
        put(parte2, false);
        put(mes, false);
        put(parte3, false);
        put(String(anio), true);    // año en negritas
        put(punto, false);

        yPos += 35; // ESPACIO GRANDE para las firmas

        // ========================================
        // SOLO FIRMAS ADICIONALES (con negritas)
        // ========================================
        doc.setFontSize(12);

        // Firma izquierda
        doc.line(20, yPos, 85, yPos); // Línea primero
        doc.setFont("times", "bold");
        doc.text("Por la dependencia:", 20, yPos + 8);
        doc.text("Ing. Edgar López García", 20, yPos + 15);
        doc.text("Responsable de servicio social SICA", 20, yPos + 20);

        // Firma derecha  
        doc.line(130, yPos, 195, yPos); // Línea primero
        doc.setFont("times", "bold");
        doc.text("p.IQ Marcos René López Hernández", 130, yPos + 8);
        doc.text("Jefe de Área Salas de Informática y", 130, yPos + 13);
        doc.text("Cómputo para Alumnos", 130, yPos + 18);

        // (si quieres que TODO lo demás quede normal, regresa después a normal con:)
        doc.setFont("times", "normal");
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

// Función principal para generar carta de término FQ en PDF
async function generarCartaTerminoFQPDF(datosAsesor) {
    try {
        console.log('📄 Generando Carta de Término FQ (PDF)...');
        
        const generador = new CartaTerminoFQPDF();
        
        // Cargar configuración personalizada si existe
        if (window.servicioSocialManager && window.servicioSocialManager.configuracion) {
            const configSS = window.servicioSocialManager.configuracion.cartaTerminoFQ;
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
        console.error('❌ Error generando carta de término FQ PDF:', error);
        
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
window.CartaTerminoFQPDF = CartaTerminoFQPDF;
window.generarCartaTerminoFQPDF = generarCartaTerminoFQPDF;

// Para compatibilidad, también exportar como la función esperada
window.generarCartaTerminoFQWord = generarCartaTerminoFQPDF;

// Verificar que se exportó correctamente
console.log('✅ carta-termino-FQ-pdf.js cargado correctamente');
console.log('📋 Funciones disponibles:', {
    CartaTerminoFQPDF: typeof window.CartaTerminoFQPDF,
    generarCartaTerminoFQPDF: typeof window.generarCartaTerminoFQPDF,
    generarCartaTerminoFQWord: typeof window.generarCartaTerminoFQWord
});
