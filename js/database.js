'use strict';

(function () {
  const CONFIG = {
    url: 'https://uahmisoeagczpymobvbx.supabase.co',
    anonKey: 'sb_publishable_IyASQiq3eg8suAEFRJCGGw_8Q2f0o1Z'
  };

  const storageKey = 'teatroUCB.supabase.fallback';
  const configured = CONFIG.url.startsWith('https://') && !CONFIG.anonKey.startsWith('TU_');
  let client = null;

  if (configured && window.supabase) {
    client = window.supabase.createClient(CONFIG.url, CONFIG.anonKey);
  }

  function leerFallback() {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '{}');
    } catch (_) {
      return {};
    }
  }

  function guardarFallback(valor) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(valor));
    } catch (_) {}
  }

  async function obtenerObras() {
    if (!client) return [];
    const { data, error } = await client
      .from('obras')
      .select('id,nombre,genero,autor,sinopsis')
      .order('nombre');
    return error ? [] : (data || []);
  }

  async function obtenerFuncionUuid(funcionId) {
    if (!client || !funcionId || funcionId.includes('TU_')) return null;
    const ultimoSeparador = funcionId.lastIndexOf('|');
    if (ultimoSeparador < 0) return funcionId;
    const nombre = funcionId.slice(0, ultimoSeparador);
    const fecha = funcionId.slice(ultimoSeparador + 1);
    const fechaInstante = new Date(fecha);
    if (Number.isNaN(fechaInstante.getTime())) return null;

    const { data, error } = await client.rpc('resolver_funcion', {
      p_obra: nombre,
      p_fecha: fechaInstante.toISOString()
    });
    if (!error && typeof data === 'string') return data;

    const { data: obra, error: errorObra } = await client
      .from('obras')
      .select('id')
      .eq('nombre', nombre)
      .maybeSingle();
    if (errorObra || !obra) return null;

    const { data: funciones, error: errorFunciones } = await client
      .from('funciones')
      .select('id,fecha_hora')
      .eq('obra_id', obra.id);
    if (errorFunciones || !funciones) return null;

    const minutoObjetivo = Math.floor(fechaInstante.getTime() / 60000);
    const coincidencia = funciones.find((item) => {
      const fechaSupabase = new Date(item.fecha_hora);
      return !Number.isNaN(fechaSupabase.getTime())
        && Math.floor(fechaSupabase.getTime() / 60000) === minutoObjetivo;
    });
    return coincidencia?.id || null;
  }

  async function obtenerFunciones(obraId) {
    if (!client) return [];
    let consulta = client
      .from('funciones')
      .select('id,fecha_hora,obra_id')
      .gte('fecha_hora', new Date().toISOString())
      .order('fecha_hora');
    if (obraId) consulta = consulta.eq('obra_id', obraId);
    const { data, error } = await consulta;
    return error ? [] : (data || []);
  }

  async function obtenerButacasOcupadas(funcionId) {
    if (!client) return new Set();
    const funcionUuid = await obtenerFuncionUuid(funcionId);
    if (!funcionUuid) return new Set();
    const { data, error } = await client
      .from('reserva_butacas')
      .select('butacas!inner(fila,numero,funcion_id),reservas!inner(estado)')
      .eq('butacas.funcion_id', funcionUuid)
      .eq('reservas.estado', 'confirmada');
    if (error) return new Set();
    return new Set((data || []).map((item) => `${item.butacas.fila}${item.butacas.numero}`));
  }

  async function crearReserva({ funcionId, nombre, codigo, asientos }) {
    if (!client) {
      return { ok: false, error: 'Supabase no está configurado.' };
    }

    const funcionUuid = await obtenerFuncionUuid(funcionId);
    if (!funcionUuid) return { ok: false, error: 'No se encontró la función en Supabase.' };

    const filas = asientos.map((id) => ({
      fila: id[0],
      numero: Number(id.slice(1))
    }));

    for (const asiento of filas) {
      const { error } = await client.rpc('ocupar_butacas', {
        p_funcion_id: funcionUuid,
        p_codigo: codigo,
        p_nombre: nombre,
        p_fila: asiento.fila,
        p_numero: asiento.numero
      });
      if (error) return { ok: false, error: error.message };
    }
    return { ok: true };
  }

  async function obtenerMisReservas(nombre) {
    if (!client) return [];
    let consulta = client
      .from('reservas')
      .select('id,codigo,nombre,total,estado,created_at,funciones(fecha_hora,obras(nombre)),reserva_butacas(butacas(fila,numero))')
      .eq('estado', 'confirmada')
      .order('created_at', { ascending: false });
    if (nombre) consulta = consulta.eq('nombre', nombre);
    const { data, error } = await consulta;
    if (error) return [];
    return (data || []).map((reserva) => ({
      codigo: reserva.codigo,
      nombre: reserva.nombre,
      total: reserva.total,
      obra: reserva.funciones?.obras?.nombre || '',
      funcion: reserva.funciones?.fecha_hora || '',
      funcionId: reserva.funciones?.id || '',
      asientos: (reserva.reserva_butacas || []).map((item) =>
        `${item.butacas.fila}${item.butacas.numero}`
      )
    }));
  }

  async function cancelarReserva(codigo) {
    if (!client) {
      return { ok: false, error: 'Supabase no está configurado.' };
    }
    const { data, error } = await client.rpc('cancelar_reserva', {
      p_codigo: codigo
    });
    if (error) return { ok: false, error: error.message };
    if (data !== true) return { ok: false, error: 'No se encontró la reserva.' };
    return { ok: true };
  }

  window.TeatroDatabase = {
    configured,
    obtenerObras,
    obtenerFunciones,
    obtenerButacasOcupadas,
    crearReserva,
    obtenerMisReservas,
    cancelarReserva
  };
})();
