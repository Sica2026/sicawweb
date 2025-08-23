/**
 * CLOUD FUNCTIONS - PROCESAMIENTO AUTOMÁTICO DE ASISTENCIAS
 * Sistema que procesa asistencias diariamente a las 10 PM
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Inicializar Firebase Admin
admin.initializeApp();

// Configurar Firestore para ignorar valores undefined
const db = admin.firestore();
db.settings({
  ignoreUndefinedProperties: true
});

// =============================================
// FUNCIÓN AUTOMÁTICA DIARIA
// =============================================

// Función principal que se ejecuta diariamente a las 10 PM
exports.procesarAsistenciasDiarias = functions
  .region('us-central1')
  .pubsub
  .schedule('0 22 * * *') // 10:00 PM todos los días
  .timeZone('America/Mexico_City')
  .onRun(async (context) => {
    const inicioEjecucion = new Date();
    console.log('🚀 Iniciando procesamiento diario de asistencias...', inicioEjecucion.toISOString());
    
    try {
      // Registrar inicio de ejecución
      await registrarEjecucion(db, 'inicio', inicioEjecucion);
      
      const resultado = await procesarAsistencias();
      
      const finEjecucion = new Date();
      const duracion = finEjecucion - inicioEjecucion;
      
      console.log('✅ Procesamiento completado:', resultado);
      console.log(`⏱️ Duración: ${duracion}ms`);
      
      // Registrar éxito de ejecución
      await registrarEjecucion(db, 'exito', inicioEjecucion, {
        duracion: duracion,
        resultado: resultado
      });
      
      return resultado;
    } catch (error) {
      console.error('❌ Error en procesamiento:', error);
      
      // Registrar error de ejecución
      await registrarEjecucion(db, 'error', inicioEjecucion, {
        error: error.message
      });
      
      throw error;
    }
  });

// =============================================
// FUNCIÓN MANUAL PARA FECHA ESPECÍFICA
// =============================================

/**
 * Función para procesar asistencias de una fecha específica (MANUAL)
 * 
 * Parámetros:
 * - fecha: YYYY-MM-DD (ej: "2025-08-14")
 * - tipoBloque: opcional, si no se especifica usa la configuración activa
 * - moverAsistencias: true/false, default true
 */
exports.procesarFechaEspecifica = functions.https.onRequest(async (req, res) => {
  console.log('🛠️ Iniciando procesamiento manual de fecha específica...');
  
  // Configurar CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  try {
    // Obtener parámetros de la request
    const fecha = req.query.fecha || req.body?.fecha;
    const tipoBloqueForzado = req.query.tipoBloque || req.body?.tipoBloque;
    const moverAsistencias = req.query.moverAsistencias !== 'false'; // default true
    
    if (!fecha) {
      return res.status(400).json({
        success: false,
        error: 'Parámetro "fecha" es requerido. Formato: YYYY-MM-DD',
        ejemplo: 'https://url/procesarFechaEspecifica?fecha=2025-08-14'
      });
    }
    
    // Validar formato de fecha
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({
        success: false,
        error: 'Formato de fecha inválido. Use: YYYY-MM-DD',
        fechaRecibida: fecha
      });
    }
    
    const inicioEjecucion = new Date();
    console.log(`📅 Procesando fecha específica: ${fecha}`);
    console.log(`⚙️ Tipo bloque forzado: ${tipoBloqueForzado || 'usar configuración'}`);
    console.log(`🔄 Mover asistencias: ${moverAsistencias}`);
    
    // Registrar inicio de ejecución manual
    await registrarEjecucionManual(db, 'inicio', inicioEjecucion, { fecha, tipoBloqueForzado });
    
    const resultado = await procesarAsistenciasFechaEspecifica(fecha, tipoBloqueForzado, moverAsistencias);
    
    const finEjecucion = new Date();
    const duracion = finEjecucion - inicioEjecucion;
    
    console.log('✅ Procesamiento manual completado:', resultado);
    
    // Registrar éxito de ejecución manual
    await registrarEjecucionManual(db, 'exito', inicioEjecucion, {
      fecha,
      duracion,
      resultado,
      tipoBloqueForzado,
      moverAsistencias
    });
    
    res.status(200).json({
      success: true,
      mensaje: `Procesamiento completado para ${fecha}`,
      timestamp: new Date().toISOString(),
      parametros: {
        fecha,
        tipoBloque: resultado.tipoBloque,
        moverAsistencias
      },
      resultado: resultado
    });
    
  } catch (error) {
    console.error('❌ Error en procesamiento manual:', error);
    
    // Registrar error de ejecución manual
    await registrarEjecucionManual(db, 'error', new Date(), {
      fecha: req.query.fecha || req.body?.fecha,
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      mensaje: 'Error en procesamiento manual',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// =============================================
// FUNCIONES DE PROCESAMIENTO CORE
// =============================================

/**
 * Función principal de procesamiento (AUTOMÁTICO)
 */
/**
 * Función principal de procesamiento (AUTOMÁTICO) - CORREGIDA PARA ZONA HORARIA
 */
async function procesarAsistencias() {
  console.log('Iniciando procesarAsistencias - versión corregida para zona horaria');
  
  // CORREGIDO: Usar zona horaria de México explícitamente
  const ahoraUTC = new Date();
  console.log('Hora actual UTC:', ahoraUTC.toISOString());
  
  // Convertir a hora de México (UTC-6)
  const horaEfectivaMexico = new Date(ahoraUTC.toLocaleString("en-US", {timeZone: "America/Mexico_City"}));
  console.log('Hora efectiva México:', horaEfectivaMexico.toString());
  
  // Si la función se ejecuta muy temprano (antes de las 6 AM), procesar el día anterior
  // Esto evita problemas cuando la función se ejecuta a las 10 PM y ya es el día siguiente en UTC
  let fechaProcesamiento = new Date(horaEfectivaMexico);
  if (horaEfectivaMexico.getHours() < 6) {
    console.log('Detectada ejecución temprana, procesando día anterior');
    fechaProcesamiento.setDate(fechaProcesamiento.getDate() - 1);
  }
  
  const fechaHoy = fechaProcesamiento.toISOString().split('T')[0]; // YYYY-MM-DD
  const diaHoy = obtenerNombreDia(fechaProcesamiento);
  
  console.log(`Procesando fecha corregida: ${fechaHoy} (${diaHoy})`);
  console.log(`Fecha de procesamiento: ${fechaProcesamiento.toISOString()}`);
  
  try {
    // 1. Obtener configuración activa
    const tipoBloqueoActivo = await obtenerConfiguracionActiva(db);
    console.log(`Tipo de bloque activo: ${tipoBloqueoActivo}`);
    
    // 2. Obtener horarios del día y tipo activo
    const horarios = await obtenerHorariosDelDia(db, tipoBloqueoActivo, diaHoy);
    console.log(`Horarios encontrados: ${horarios.length}`);
    
    if (horarios.length === 0) {
      console.log(`No se encontraron horarios para ${diaHoy} con tipo ${tipoBloqueoActivo}`);
      return {
        fecha: fechaHoy,
        tipoBloque: tipoBloqueoActivo,
        totalHorarios: 0,
        presentes: 0,
        ausentes: 0,
        tardanzas: 0,
        salidasTempranas: 0,
        mensaje: `No hay horarios programados para ${diaHoy}`
      };
    }
    
    // 3. Procesar cada horario
    const reportes = [];
    const asistenciasProcesadas = [];
    
    for (const horario of horarios) {
      console.log(`Procesando horario: ${horario.numeroCuenta} - ${horario.nombreAsesor}`);
      const resultado = await procesarHorarioIndividualCorregido(db, horario, fechaHoy);
      reportes.push(resultado.reporte);
      
      if (resultado.asistenciaProcesada) {
        asistenciasProcesadas.push(resultado.asistenciaProcesada);
      }
    }
    
    console.log(`Procesados ${reportes.length} reportes, ${asistenciasProcesadas.length} asistencias encontradas`);
    
    // 4. Guardar reportes en batch
    if (reportes.length > 0) {
      await guardarReportes(db, reportes);
      console.log(`Guardados ${reportes.length} reportes`);
    }
    
    // 5. Mover asistencias procesadas
    if (asistenciasProcesadas.length > 0) {
      await moverAsistenciasProcesadas(db, asistenciasProcesadas);
      console.log(`Movidas ${asistenciasProcesadas.length} asistencias`);
    }
    
    const resumen = {
      fecha: fechaHoy,
      dia: diaHoy,
      tipoBloque: tipoBloqueoActivo,
      totalHorarios: horarios.length,
      presentes: reportes.filter(r => r.estado === 'presente').length,
      ausentes: reportes.filter(r => r.estado === 'ausente').length,
      tardanzas: reportes.filter(r => r.observaciones && r.observaciones.includes('tarde')).length,
      salidasTempranas: reportes.filter(r => r.observaciones && r.observaciones.includes('antes')).length,
      asistenciasEncontradas: asistenciasProcesadas.length,
      horaMexico: horaEfectivaMexico.toISOString(),
      horaUTC: ahoraUTC.toISOString()
    };
    
    console.log('Resumen final:', JSON.stringify(resumen, null, 2));
    return resumen;
    
  } catch (error) {
    console.error('Error en procesarAsistencias:', error);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

/**
 * Procesar un horario individual (AUTOMÁTICO) - VERSIÓN CORREGIDA
 */
async function procesarHorarioIndividualCorregido(db, horario, fecha) {
  try {
    console.log(`Procesando horario individual: ${horario.nombreAsesor || 'Sin nombre'} (${horario.numeroCuenta || 'Sin cuenta'}) para fecha ${fecha}`);
    
    // Buscar asistencia correspondiente con manejo mejorado de zona horaria
    const asistencia = await buscarAsistenciaCorregida(db, horario, fecha);
    
    if (asistencia) {
      console.log(`Asistencia encontrada para ${horario.numeroCuenta}: entrada ${asistencia.entrada?.horaRedondeada}, salida ${asistencia.salida?.horaRedondeada}`);
      // Hay asistencia - analizar cumplimiento
      return procesarAsistenciaPresente(horario, asistencia, fecha);
    } else {
      console.log(`No se encontró asistencia para ${horario.numeroCuenta}`);
      // No hay asistencia - marcar como falta
      return procesarAsistenciaAusente(horario, fecha);
    }
    
  } catch (error) {
    console.error(`Error procesando horario ${horario.numeroCuenta || 'Sin cuenta'}:`, error);
    throw error;
  }
}

/**
 * Buscar asistencia correspondiente al horario (AUTOMÁTICO) - VERSIÓN CORREGIDA
 */
async function buscarAsistenciaCorregida(db, horario, fecha) {
  try {
    console.log(`Buscando asistencia para ${horario.numeroCuenta} en fecha ${fecha} con tipo ${horario.tipoBloque}`);
    
    // Crear rangos de fecha más amplios para capturar asistencias
    // Usar zona horaria de México explícitamente
    const fechaBase = new Date(fecha + 'T00:00:00-06:00'); // Medianoche México
    const fechaInicio = new Date(fechaBase);
    fechaInicio.setHours(-6, 0, 0, 0); // 6 PM del día anterior México = Medianoche UTC
    
    const fechaFin = new Date(fechaBase);
    fechaFin.setHours(29, 59, 59, 999); // 5:59 AM del día siguiente México = 11:59 PM UTC
    
    console.log(`Buscando asistencias entre: ${fechaInicio.toISOString()} y ${fechaFin.toISOString()}`);
    console.log(`Para numeroCuenta: ${horario.numeroCuenta}, tipoBloque: ${horario.tipoBloque}`);
    
    const asistenciaSnapshot = await db
      .collection('asistenciasemana')
      .where('numeroCuenta', '==', horario.numeroCuenta)
      .where('tipoBloque', '==', horario.tipoBloque)
      .where('fechaCompleta', '>=', fechaInicio)
      .where('fechaCompleta', '<', fechaFin)
      .get();
    
    console.log(`Documentos encontrados en consulta: ${asistenciaSnapshot.size}`);
    
    if (!asistenciaSnapshot.empty) {
      const doc = asistenciaSnapshot.docs[0];
      const data = doc.data();
      console.log(`Asistencia encontrada: ID=${doc.id}, fecha=${data.fechaCompleta?.toDate?.()?.toISOString()}`);
      
      return {
        id: doc.id,
        ...data
      };
    }
    
    // Búsqueda alternativa más amplia si no se encuentra nada
    console.log('No se encontró con búsqueda estricta, intentando búsqueda ampliada...');
    
    const fechaAmpliadaInicio = new Date(fechaBase);
    fechaAmpliadaInicio.setDate(fechaAmpliadaInicio.getDate() - 1);
    fechaAmpliadaInicio.setHours(0, 0, 0, 0);
    
    const fechaAmpliadaFin = new Date(fechaBase);
    fechaAmpliadaFin.setDate(fechaAmpliadaFin.getDate() + 1);
    fechaAmpliadaFin.setHours(23, 59, 59, 999);
    
    const asistenciaAmpliadaSnapshot = await db
      .collection('asistenciasemana')
      .where('numeroCuenta', '==', horario.numeroCuenta)
      .where('tipoBloque', '==', horario.tipoBloque)
      .where('fechaCompleta', '>=', fechaAmpliadaInicio)
      .where('fechaCompleta', '<', fechaAmpliadaFin)
      .get();
    
    console.log(`Documentos encontrados en búsqueda ampliada: ${asistenciaAmpliadaSnapshot.size}`);
    
    if (!asistenciaAmpliadaSnapshot.empty) {
      const doc = asistenciaAmpliadaSnapshot.docs[0];
      const data = doc.data();
      console.log(`Asistencia encontrada (ampliada): ID=${doc.id}, fecha=${data.fechaCompleta?.toDate?.()?.toISOString()}`);
      
      return {
        id: doc.id,
        ...data
      };
    }
    
    console.log(`No se encontró asistencia para ${horario.numeroCuenta} en ninguna búsqueda`);
    return null;
  } catch (error) {
    console.error('Error buscando asistencia corregida:', error);
    console.error('Parámetros de búsqueda:', {
      numeroCuenta: horario.numeroCuenta,
      tipoBloque: horario.tipoBloque,
      fecha: fecha
    });
    throw error;
  }
}

/**
 * Función principal de procesamiento para fecha específica (MANUAL)
 */
async function procesarAsistenciasFechaEspecifica(fechaEspecifica, tipoBloqueForzado = null, moverAsistencias = true) {
  const fechaObj = new Date(fechaEspecifica + 'T12:00:00.000Z'); // Usar mediodía para evitar problemas de zona horaria
  const diaEspecifico = obtenerNombreDia(fechaObj);
  
  console.log(`📅 Procesando fecha: ${fechaEspecifica} (${diaEspecifico})`);
  
  try {
    // 1. Obtener configuración activa o usar tipo forzado
    let tipoBloqueoActivo;
    if (tipoBloqueForzado) {
      tipoBloqueoActivo = tipoBloqueForzado;
      console.log(`⚙️ Usando tipo de bloque forzado: ${tipoBloqueoActivo}`);
    } else {
      tipoBloqueoActivo = await obtenerConfiguracionActiva(db);
      console.log(`⚙️ Tipo de bloque desde configuración: ${tipoBloqueoActivo}`);
    }
    
    // 2. Obtener horarios del día específico
    const horarios = await obtenerHorariosDelDia(db, tipoBloqueoActivo, diaEspecifico);
    console.log(`👥 Horarios encontrados para ${diaEspecifico}: ${horarios.length}`);
    
    // 3. Procesar cada horario
    const reportes = [];
    const asistenciasProcesadas = [];
    
    for (const horario of horarios) {
      const resultado = await procesarHorarioIndividualFecha(db, horario, fechaEspecifica);
      reportes.push(resultado.reporte);
      
      if (resultado.asistenciaProcesada && moverAsistencias) {
        asistenciasProcesadas.push(resultado.asistenciaProcesada);
      }
    }
    
    // 4. Guardar reportes en batch
    if (reportes.length > 0) {
      await guardarReportesConSufijo(db, reportes, 'manual');
      console.log(`💾 Guardados ${reportes.length} reportes con sufijo 'manual'`);
    }
    
    // 5. Mover asistencias procesadas (si está habilitado)
    if (moverAsistencias && asistenciasProcesadas.length > 0) {
      await moverAsistenciasProcesadasConSufijo(db, asistenciasProcesadas, 'manual');
      console.log(`🔄 Movidas ${asistenciasProcesadas.length} asistencias`);
    } else if (!moverAsistencias) {
      console.log(`📝 Mover asistencias deshabilitado, ${asistenciasProcesadas.length} asistencias no se movieron`);
    }
    
    const resumen = {
      fecha: fechaEspecifica,
      dia: diaEspecifico,
      tipoBloque: tipoBloqueoActivo,
      totalHorarios: horarios.length,
      presentes: reportes.filter(r => r.estado === 'presente').length,
      ausentes: reportes.filter(r => r.estado === 'ausente').length,
      tardanzas: reportes.filter(r => r.observaciones.includes('tarde')).length,
      salidasTempranas: reportes.filter(r => r.observaciones.includes('antes')).length,
      asistenciasMovidas: moverAsistencias ? asistenciasProcesadas.length : 0,
      procesamientoManual: true
    };
    
    console.log('📊 Resumen procesamiento manual:', resumen);
    return resumen;
    
  } catch (error) {
    console.error('❌ Error en procesarAsistenciasFechaEspecifica:', error);
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
 * Procesar un horario individual (AUTOMÁTICO)
 */
async function procesarHorarioIndividual(db, horario, fecha) {
  try {
    console.log(`👤 Procesando: ${horario.nombreAsesor || 'Sin nombre'} (${horario.numeroCuenta || 'Sin cuenta'})`);
    
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
    console.error(`❌ Error procesando horario ${horario.numeroCuenta || 'Sin cuenta'}:`, error);
    throw error;
  }
}

/**
 * Procesar un horario individual para fecha específica (MANUAL)
 */
async function procesarHorarioIndividualFecha(db, horario, fechaEspecifica) {
  try {
    console.log(`👤 Procesando para ${fechaEspecifica}: ${horario.nombreAsesor || 'Sin nombre'} (${horario.numeroCuenta || 'Sin cuenta'})`);
    
    // Buscar asistencia correspondiente en la fecha específica
    const asistencia = await buscarAsistenciaFechaEspecifica(db, horario, fechaEspecifica);
    
    if (asistencia) {
      // Hay asistencia - analizar cumplimiento
      return procesarAsistenciaPresente(horario, asistencia, fechaEspecifica);
    } else {
      // No hay asistencia - marcar como falta
      return procesarAsistenciaAusente(horario, fechaEspecifica);
    }
    
  } catch (error) {
    console.error(`❌ Error procesando horario ${horario.numeroCuenta || 'Sin cuenta'} para ${fechaEspecifica}:`, error);
    throw error;
  }
}

/**
 * Buscar asistencia correspondiente al horario (AUTOMÁTICO)
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
 * Buscar asistencia para fecha específica (MANUAL)
 */
async function buscarAsistenciaFechaEspecifica(db, horario, fechaEspecifica) {
  try {
    const fechaCompleta = new Date(fechaEspecifica + 'T00:00:00.000Z');
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
    console.error('❌ Error buscando asistencia para fecha específica:', error);
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
  if (entradaReal && horaInicio) {
    const tardanza = calcularDiferenciaMinutos(entradaReal, horaInicio);
    if (tardanza > 0) {
      observaciones.push(`Llegó ${tardanza} minutos tarde`);
    }
  }
  
  // Analizar salida
  if (salidaReal && horaFinal) {
    const salidaTemprana = calcularDiferenciaMinutos(horaFinal, salidaReal);
    if (salidaTemprana > 0) {
      observaciones.push(`Salió ${salidaTemprana} minutos antes`);
    }
  }
  
  if (observaciones.length === 0) {
    observaciones.push('Puntual');
  }
  
  // Crear reporte limpio sin campos undefined
  const reporte = {};
  
  // Solo agregar campos que no sean undefined
  if (horario.nombreAsesor || asistencia.nombreAsesor) {
    reporte.nombreAsesor = horario.nombreAsesor || asistencia.nombreAsesor || 'Sin nombre';
  } else {
    reporte.nombreAsesor = 'Sin nombre';
  }
  
  if (horario.numeroCuenta) {
    reporte.numeroCuenta = horario.numeroCuenta;
  } else {
    reporte.numeroCuenta = 'Sin cuenta';
  }
  
  reporte.fecha = fecha;
  reporte.entrada = entradaReal || null;
  reporte.salida = salidaReal || null;
  reporte.tiempoTrabajado = asistencia.horasTrabajadas || calcularTiempoTrabajado(entradaReal, salidaReal) || '0h 0m';
  reporte.observaciones = observaciones.join(', ');
  reporte.tipoBloque = horario.tipoBloque || 'Sin tipo';
  reporte.estado = 'presente';
  reporte.timestamp = admin.firestore.FieldValue.serverTimestamp();
  
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
  
  // Crear reporte limpio sin campos undefined
  const reporte = {};
  
  reporte.nombreAsesor = horario.nombreAsesor || 'Sin nombre';
  reporte.numeroCuenta = horario.numeroCuenta || 'Sin cuenta';
  reporte.fecha = fecha;
  reporte.entrada = null;
  reporte.salida = null;
  reporte.tiempoTrabajado = `-${horasEsperadas || '0h 0m'}`;
  reporte.observaciones = `Faltó en su horario de ${horario.horaInicio || 'N/A'}-${horario.horaFinal || 'N/A'}`;
  reporte.tipoBloque = horario.tipoBloque || 'Sin tipo';
  reporte.estado = 'ausente';
  reporte.timestamp = admin.firestore.FieldValue.serverTimestamp();
  
  return {
    reporte: reporte,
    asistenciaProcesada: null
  };
}

/**
 * Guardar reportes en Firestore (con filtrado de undefined)
 */
async function guardarReportes(db, reportes) {
  try {
    const batch = db.batch();
    
    reportes.forEach(reporte => {
      // Filtrar campos undefined como medida extra de seguridad
      const reporteLimpio = {};
      Object.keys(reporte).forEach(key => {
        if (reporte[key] !== undefined && reporte[key] !== null) {
          reporteLimpio[key] = reporte[key];
        }
      });
      
      const docRef = db.collection('reportesasesores').doc();
      batch.set(docRef, reporteLimpio);
    });
    
    await batch.commit();
    console.log(`💾 Guardados ${reportes.length} reportes`);
  } catch (error) {
    console.error('❌ Error guardando reportes:', error);
    throw error;
  }
}

/**
 * Guardar reportes con sufijo para distinguir procesamiento manual
 */
async function guardarReportesConSufijo(db, reportes, sufijo) {
  try {
    const batch = db.batch();
    
    reportes.forEach(reporte => {
      // Filtrar campos undefined
      const reporteLimpio = {};
      Object.keys(reporte).forEach(key => {
        if (reporte[key] !== undefined && reporte[key] !== null) {
          reporteLimpio[key] = reporte[key];
        }
      });
      
      // Agregar información de procesamiento manual
      reporteLimpio.procesamientoTipo = sufijo;
      reporteLimpio.timestampProcesamiento = admin.firestore.FieldValue.serverTimestamp();
      
      const docRef = db.collection('reportesasesores').doc();
      batch.set(docRef, reporteLimpio);
    });
    
    await batch.commit();
    console.log(`💾 Guardados ${reportes.length} reportes (${sufijo})`);
  } catch (error) {
    console.error('❌ Error guardando reportes con sufijo:', error);
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
      
      // Crear datos limpios sin undefined
      const datosLimpios = {};
      Object.keys(dataSinId).forEach(key => {
        if (dataSinId[key] !== undefined) {
          datosLimpios[key] = dataSinId[key];
        }
      });
      
      datosLimpios.fechaProcesamiento = admin.firestore.FieldValue.serverTimestamp();
      datosLimpios.documentoOriginal = id;
      
      batch.set(docRef, datosLimpios);
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

/**
 * Mover asistencias con sufijo para distinguir procesamiento manual
 */
async function moverAsistenciasProcesadasConSufijo(db, asistencias, sufijo) {
  try {
    if (asistencias.length === 0) {
      console.log('📝 No hay asistencias para mover');
      return;
    }
    
    const batch = db.batch();
    
    // Copiar a asistenciasrevisadas con información adicional
    asistencias.forEach(asistencia => {
      const docRef = db.collection('asistenciasrevisadas').doc();
      const { id, ...dataSinId } = asistencia;
      
      // Crear datos limpios sin undefined
      const datosLimpios = {};
      Object.keys(dataSinId).forEach(key => {
        if (dataSinId[key] !== undefined) {
          datosLimpios[key] = dataSinId[key];
        }
      });
      
      datosLimpios.fechaProcesamiento = admin.firestore.FieldValue.serverTimestamp();
      datosLimpios.documentoOriginal = id;
      datosLimpios.procesamientoTipo = sufijo; // manual/automatico
      
      batch.set(docRef, datosLimpios);
    });
    
    await batch.commit();
    
    // Eliminar de asistenciasemana
    const deleteBatch = db.batch();
    asistencias.forEach(asistencia => {
      const docRef = db.collection('asistenciasemana').doc(asistencia.id);
      deleteBatch.delete(docRef);
    });
    
    await deleteBatch.commit();
    
    console.log(`🔄 Movidas ${asistencias.length} asistencias (${sufijo})`);
  } catch (error) {
    console.error('❌ Error moviendo asistencias con sufijo:', error);
    throw error;
  }
}

/**
 * Registrar ejecución en Firestore para auditoría
 */
async function registrarEjecucion(db, estado, inicioEjecucion, datos = {}) {
  try {
    const registro = {
      fecha: inicioEjecucion.toISOString().split('T')[0],
      horaEjecucion: inicioEjecucion.toISOString(),
      estado: estado, // 'inicio', 'exito', 'error'
      tipoEjecucion: 'automatico',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ...datos
    };
    
    await db.collection('logs_ejecuciones').add(registro);
    console.log(`📝 Registrada ejecución: ${estado}`);
  } catch (error) {
    console.error('❌ Error registrando ejecución:', error);
    // No lanzar error para no interrumpir el procesamiento principal
  }
}

/**
 * Registrar ejecución manual en Firestore
 */
async function registrarEjecucionManual(db, estado, inicioEjecucion, datos = {}) {
  try {
    const registro = {
      fecha: datos.fecha || inicioEjecucion.toISOString().split('T')[0],
      horaEjecucion: inicioEjecucion.toISOString(),
      estado: estado, // 'inicio', 'exito', 'error'
      tipoEjecucion: 'manual',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ...datos
    };
    
    await db.collection('logs_ejecuciones').add(registro);
    console.log(`📝 Registrada ejecución manual: ${estado} para ${datos.fecha || 'fecha no especificada'}`);
  } catch (error) {
    console.error('❌ Error registrando ejecución manual:', error);
    // No lanzar error para no interrumpir el procesamiento principal
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
  if (!hora1 || !hora2) return 0;
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
  if (!horaInicio || !horaFinal) return '0h 0m';
  
  const minutosInicio = horaAMinutos(horaInicio);
  const minutosFinal = horaAMinutos(horaFinal);
  const diferenciaMinutos = minutosFinal - minutosInicio;
  
  if (diferenciaMinutos <= 0) return '0h 0m';
  
  const horas = Math.floor(diferenciaMinutos / 60);
  const minutos = diferenciaMinutos % 60;
  
  return `${horas}h ${minutos}m`;
}

// =============================================
// FUNCIONES DE PRUEBA Y CONSULTA
// =============================================

/**
 * Función para probar manualmente (callable)
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

/**
 * Función para probar manualmente via HTTP
 * Accesible desde navegador web
 */
exports.probarProcesamiento = functions.https.onRequest(async (req, res) => {
  console.log('🧪 Iniciando prueba manual via HTTP...');
  
  // Configurar CORS para permitir acceso desde navegador
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  try {
    const resultado = await procesarAsistencias();
    
    res.status(200).json({
      success: true,
      mensaje: 'Procesamiento completado exitosamente',
      timestamp: new Date().toISOString(),
      resultado: resultado
    });
    
  } catch (error) {
    console.error('❌ Error en prueba HTTP:', error);
    
    res.status(500).json({
      success: false,
      mensaje: 'Error en procesamiento',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * Función para obtener estadísticas sin procesar
 * Útil para verificar datos antes del procesamiento
 */
exports.obtenerEstadisticas = functions.https.onRequest(async (req, res) => {
  console.log('📊 Obteniendo estadísticas...');
  
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  try {
    const hoy = new Date();
    const fechaHoy = hoy.toISOString().split('T')[0];
    const diaHoy = obtenerNombreDia(hoy);
    
    // Obtener configuración
    const tipoBloqueoActivo = await obtenerConfiguracionActiva(db);
    
    // Obtener horarios
    const horarios = await obtenerHorariosDelDia(db, tipoBloqueoActivo, diaHoy);
    
    // Obtener asistencias del día
    const fechaCompleta = new Date(fechaHoy + 'T00:00:00.000Z');
    const fechaSiguiente = new Date(fechaCompleta);
    fechaSiguiente.setDate(fechaSiguiente.getDate() + 1);
    
    const asistenciasSnapshot = await db
      .collection('asistenciasemana')
      .where('tipoBloque', '==', tipoBloqueoActivo)
      .where('fechaCompleta', '>=', fechaCompleta)
      .where('fechaCompleta', '<', fechaSiguiente)
      .get();
    
    const estadisticas = {
      fecha: fechaHoy,
      dia: diaHoy,
      tipoBloque: tipoBloqueoActivo,
      totalHorarios: horarios.length,
      totalAsistencias: asistenciasSnapshot.size,
      horarios: horarios.map(h => ({
        numeroCuenta: h.numeroCuenta,
        nombreAsesor: h.nombreAsesor,
        horario: `${h.horaInicio}-${h.horaFinal}`
      })),
      asistencias: []
    };
    
    asistenciasSnapshot.forEach(doc => {
      const data = doc.data();
      estadisticas.asistencias.push({
        numeroCuenta: data.numeroCuenta,
        nombreAsesor: data.nombreAsesor,
        entrada: data.entrada?.horaRedondeada,
        salida: data.salida?.horaRedondeada
      });
    });
    
    res.status(200).json({
      success: true,
      estadisticas: estadisticas
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Función para consultar logs de ejecuciones
 * Útil para verificar el historial de ejecuciones automáticas y manuales
 */
exports.consultarLogsEjecuciones = functions.https.onRequest(async (req, res) => {
  console.log('📋 Consultando logs de ejecuciones...');
  
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  try {
    const limite = req.query.limite || 20;
    
    const logsSnapshot = await db
      .collection('logs_ejecuciones')
      .orderBy('timestamp', 'desc')
      .limit(parseInt(limite))
      .get();
    
    const logs = [];
    logsSnapshot.forEach(doc => {
      logs.push({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.()?.toISOString() || doc.data().timestamp
      });
    });
    
    // Estadísticas
    const estadisticas = {
      totalEjecuciones: logs.length,
      ultimaEjecucion: logs[0]?.horaEjecucion || 'Nunca',
      exitosas: logs.filter(l => l.estado === 'exito').length,
      errores: logs.filter(l => l.estado === 'error').length,
      enProceso: logs.filter(l => l.estado === 'inicio').length,
      automaticas: logs.filter(l => l.tipoEjecucion === 'automatico').length,
      manuales: logs.filter(l => l.tipoEjecucion === 'manual').length
    };
    
    res.status(200).json({
      success: true,
      estadisticas: estadisticas,
      logs: logs,
      nota: 'Logs ordenados del más reciente al más antiguo'
    });
    
  } catch (error) {
    console.error('❌ Error consaultando logs:', error);
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});