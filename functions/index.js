/**
 * CLOUD FUNCTIONS - PROCESAMIENTO AUTOMÁTICO DE ASISTENCIAS
 * Sistema que procesa asistencias diariamente a las 10 PM
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Inicializar Firebase Admin
admin.initializeApp();

// Función principal que se ejecuta diariamente a las 10 PM
exports.procesarAsistenciasDiarias = functions
  .region('us-central1') // Puedes cambiar la región si necesitas
  .pubsub
  .schedule('0 22 * * *') // 10:00 PM todos los días
  .timeZone('America/Mexico_City') // Zona horaria de México
  .onRun(async (context) => {
    console.log('🚀 Iniciando procesamiento diario de asistencias...');
    
    try {
      const resultado = await procesarAsistencias();
      console.log('✅ Procesamiento completado:', resultado);
      return resultado;
    } catch (error) {
      console.error('❌ Error en procesamiento:', error);
      throw error;
    }
  });

/**
 * Función principal de procesamiento
 */
async function procesarAsistencias() {
  const db = admin.firestore();
  const hoy = new Date();
  const fechaHoy = hoy.toISOString().split('T')[0]; // YYYY-MM-DD
  const diaHoy = obtenerNombreDia(hoy);
  
  console.log(`📅 Procesando fecha: ${fechaHoy} (${diaHoy})`);
  
  try {
    // 1. Obtener configuración activa
    const tipoBloqueoActivo = await obtenerConfiguracionActiva(db);
    console.log(`⚙️ Tipo de bloque activo: ${tipoBloqueoActivo}`);
    
    // 2. Obtener horarios del día y tipo activo
    const horarios = await obtenerHorariosDelDia(db, tipoBloqueoActivo, diaHoy);
    console.log(`👥 Horarios encontrados: ${horarios.length}`);
    
    // 3. Procesar cada horario
    const reportes = [];
    const asistenciasProcesadas = [];
    
    for (const horario of horarios) {
      const resultado = await procesarHorarioIndividual(db, horario, fechaHoy);
      reportes.push(resultado.reporte);
      
      if (resultado.asistenciaProcesada) {
        asistenciasProcesadas.push(resultado.asistenciaProcesada);
      }
    }
    
    // 4. Guardar reportes en batch
    await guardarReportes(db, reportes);
    
    // 5. Mover asistencias procesadas
    await moverAsistenciasProcesadas(db, asistenciasProcesadas);
    
    const resumen = {
      fecha: fechaHoy,
      tipoBloque: tipoBloqueoActivo,
      totalHorarios: horarios.length,
      presentes: reportes.filter(r => r.estado === 'presente').length,
      ausentes: reportes.filter(r => r.estado === 'ausente').length,
      tardanzas: reportes.filter(r => r.observaciones.includes('tarde')).length,
      salidasTempranas: reportes.filter(r => r.observaciones.includes('antes')).length
    };
    
    console.log('📊 Resumen:', resumen);
    return resumen;
    
  } catch (error) {
    console.error('❌ Error en procesarAsistencias:', error);
    throw error;
  }
}

/**
 * Obtener configuración activa
 */
async function obtenerConfiguracionActiva(db) {
  try {
    const configDoc = await db
      .collection('configuracion')
      .doc('qkLlvrqIPsI7HEPKIhyh')
      .get();
    
    if (!configDoc.exists) {
      throw new Error('Documento de configuración no encontrado');
    }
    
    const tipoBloque = configDoc.data().tipoBloque;
    if (!tipoBloque) {
      throw new Error('Campo tipoBloque no encontrado en configuración');
    }
    
    return tipoBloque;
  } catch (error) {
    console.error('❌ Error obteniendo configuración:', error);
    throw error;
  }
}

/**
 * Obtener horarios del día actual y tipo de bloque activo
 */
async function obtenerHorariosDelDia(db, tipoBloque, dia) {
  try {
    const horariosSnapshot = await db
      .collection('horarios')
      .where('tipoBloque', '==', tipoBloque)
      .where('dias', 'array-contains', dia)
      .get();
    
    const horarios = [];
    horariosSnapshot.forEach(doc => {
      horarios.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return horarios;
  } catch (error) {
    console.error('❌ Error obteniendo horarios:', error);
    throw error;
  }
}

/**
 * Procesar un horario individual
 */
async function procesarHorarioIndividual(db, horario, fecha) {
  try {
    console.log(`👤 Procesando: ${horario.nombreAsesor} (${horario.numeroCuenta})`);
    
    // Buscar asistencia correspondiente
    const asistencia = await buscarAsistencia(db, horario, fecha);
    
    if (asistencia) {
      // Hay asistencia - analizar cumplimiento
      return procesarAsistenciaPresente(horario, asistencia, fecha);
    } else {
      // No hay asistencia - marcar como falta
      return procesarAsistenciaAusente(horario, fecha);
    }
    
  } catch (error) {
    console.error(`❌ Error procesando horario ${horario.numeroCuenta}:`, error);
    throw error;
  }
}

/**
 * Buscar asistencia correspondiente al horario
 */
async function buscarAsistencia(db, horario, fecha) {
  try {
    const fechaCompleta = new Date(fecha + 'T00:00:00.000Z');
    const fechaSiguiente = new Date(fechaCompleta);
    fechaSiguiente.setDate(fechaSiguiente.getDate() + 1);
    
    const asistenciaSnapshot = await db
      .collection('asistenciasemana')
      .where('numeroCuenta', '==', horario.numeroCuenta)
      .where('tipoBloque', '==', horario.tipoBloque)
      .where('fechaCompleta', '>=', fechaCompleta)
      .where('fechaCompleta', '<', fechaSiguiente)
      .limit(1)
      .get();
    
    if (!asistenciaSnapshot.empty) {
      const doc = asistenciaSnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      };
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error buscando asistencia:', error);
    throw error;
  }
}

/**
 * Procesar cuando hay asistencia (presente)
 */
function procesarAsistenciaPresente(horario, asistencia, fecha) {
  const entradaReal = asistencia.entrada?.horaRedondeada;
  const salidaReal = asistencia.salida?.horaRedondeada;
  const horaInicio = horario.horaInicio;
  const horaFinal = horario.horaFinal;
  
  const observaciones = [];
  
  // Analizar entrada
  if (entradaReal) {
    const tardanza = calcularDiferenciaMinutos(entradaReal, horaInicio);
    if (tardanza > 0) {
      observaciones.push(`Llegó ${tardanza} minutos tarde`);
    }
  }
  
  // Analizar salida
  if (salidaReal) {
    const salidaTemprana = calcularDiferenciaMinutos(horaFinal, salidaReal);
    if (salidaTemprana > 0) {
      observaciones.push(`Salió ${salidaTemprana} minutos antes`);
    }
  }
  
  if (observaciones.length === 0) {
    observaciones.push('Puntual');
  }
  
  const reporte = {
    nombreAsesor: horario.nombreAsesor,
    numeroCuenta: horario.numeroCuenta,
    fecha: fecha,
    entrada: entradaReal || null,
    salida: salidaReal || null,
    tiempoTrabajado: asistencia.horasTrabajadas || calcularTiempoTrabajado(entradaReal, salidaReal),
    observaciones: observaciones.join(', '),
    tipoBloque: horario.tipoBloque,
    estado: 'presente',
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  };
  
  return {
    reporte: reporte,
    asistenciaProcesada: asistencia
  };
}

/**
 * Procesar cuando no hay asistencia (ausente)
 */
function procesarAsistenciaAusente(horario, fecha) {
  const horasEsperadas = calcularHorasEsperadas(horario.horaInicio, horario.horaFinal);
  
  const reporte = {
    nombreAsesor: horario.nombreAsesor,
    numeroCuenta: horario.numeroCuenta,
    fecha: fecha,
    entrada: null,
    salida: null,
    tiempoTrabajado: `-${horasEsperadas}`,
    observaciones: `Faltó en su horario de ${horario.horaInicio}-${horario.horaFinal}`,
    tipoBloque: horario.tipoBloque,
    estado: 'ausente',
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  };
  
  return {
    reporte: reporte,
    asistenciaProcesada: null
  };
}

/**
 * Guardar reportes en Firestore
 */
async function guardarReportes(db, reportes) {
  try {
    const batch = db.batch();
    
    reportes.forEach(reporte => {
      const docRef = db.collection('reportesasesores').doc();
      batch.set(docRef, reporte);
    });
    
    await batch.commit();
    console.log(`💾 Guardados ${reportes.length} reportes`);
  } catch (error) {
    console.error('❌ Error guardando reportes:', error);
    throw error;
  }
}

/**
 * Mover asistencias procesadas a colección de revisadas
 */
async function moverAsistenciasProcesadas(db, asistencias) {
  try {
    if (asistencias.length === 0) {
      console.log('📝 No hay asistencias para mover');
      return;
    }
    
    const batch = db.batch();
    
    // Copiar a asistenciasrevisadas
    asistencias.forEach(asistencia => {
      const docRef = db.collection('asistenciasrevisadas').doc();
      const { id, ...dataSinId } = asistencia;
      batch.set(docRef, {
        ...dataSinId,
        fechaProcesamiento: admin.firestore.FieldValue.serverTimestamp(),
        documentoOriginal: id
      });
    });
    
    await batch.commit();
    
    // Eliminar de asistenciasemana
    const deleteBatch = db.batch();
    asistencias.forEach(asistencia => {
      const docRef = db.collection('asistenciasemana').doc(asistencia.id);
      deleteBatch.delete(docRef);
    });
    
    await deleteBatch.commit();
    
    console.log(`🔄 Movidas ${asistencias.length} asistencias procesadas`);
  } catch (error) {
    console.error('❌ Error moviendo asistencias:', error);
    throw error;
  }
}

// =============================================
// FUNCIONES DE UTILIDAD
// =============================================

/**
 * Obtener nombre del día en español
 */
function obtenerNombreDia(fecha) {
  const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  return dias[fecha.getDay()];
}

/**
 * Calcular diferencia en minutos entre dos horas
 */
function calcularDiferenciaMinutos(hora1, hora2) {
  const minutos1 = horaAMinutos(hora1);
  const minutos2 = horaAMinutos(hora2);
  return minutos1 - minutos2;
}

/**
 * Convertir hora string a minutos
 */
function horaAMinutos(horaStr) {
  if (!horaStr) return 0;
  const [hora, minuto] = horaStr.split(':').map(Number);
  return hora * 60 + minuto;
}

/**
 * Calcular tiempo trabajado entre dos horas
 */
function calcularTiempoTrabajado(entrada, salida) {
  if (!entrada || !salida) return '0h 0m';
  
  const minutosEntrada = horaAMinutos(entrada);
  const minutosSalida = horaAMinutos(salida);
  const diferenciaMinutos = minutosSalida - minutosEntrada;
  
  if (diferenciaMinutos <= 0) return '0h 0m';
  
  const horas = Math.floor(diferenciaMinutos / 60);
  const minutos = diferenciaMinutos % 60;
  
  return `${horas}h ${minutos}m`;
}

/**
 * Calcular horas esperadas de trabajo
 */
function calcularHorasEsperadas(horaInicio, horaFinal) {
  const minutosInicio = horaAMinutos(horaInicio);
  const minutosFinal = horaAMinutos(horaFinal);
  const diferenciaMinutos = minutosFinal - minutosInicio;
  
  const horas = Math.floor(diferenciaMinutos / 60);
  const minutos = diferenciaMinutos % 60;
  
  return `${horas}h ${minutos}m`;
}

// =============================================
// FUNCIÓN DE PRUEBA (OPCIONAL)
// =============================================

/**
 * Función para probar manualmente (opcional)
 * Se puede llamar desde la consola de Firebase
 */
exports.procesarAsistenciasManual = functions.https.onCall(async (data, context) => {
  console.log('🧪 Ejecutando procesamiento manual...');
  
  try {
    const resultado = await procesarAsistencias();
    return {
      success: true,
      resultado: resultado
    };
  } catch (error) {
    console.error('❌ Error en procesamiento manual:', error);
    return {
      success: false,
      error: error.message
    };
  }
});