// Motor de simulación 100% cliente. Reemplaza al backend FastAPI:
// el estado vive en localStorage y expone la misma interfaz asíncrona que antes.
(function () {
  const STORAGE_KEY = "biteggcoin_state_v1";
  const MESES_SIMULACION = ["Septiembre 2026", "Octubre 2026", "Noviembre 2026", "Diciembre 2026"];
  const ELASTICIDAD_PRECIO = 0.5;
  const OFERTA_REFERENCIA_MERCADO = 1000000;
  const COSTO_ADQUISICION_GALLINA = 20;

  const estudioMercado = window.GALLINACOIN_MARKET_STUDY.meses
    .slice()
    .sort(function (a, b) { return a.indice - b.indice; });

  function redondear(valor, decimales) {
    const f = Math.pow(10, decimales);
    return Math.round((valor + Number.EPSILON) * f) / f;
  }

  // ---------- Estado / persistencia ----------

  function crearEstadoInicial() {
    const primer = estudioMercado[0];
    return {
      mes_actual: primer.mes + " " + primer.anio,
      mes_indice: primer.indice,
      usuarios: {
        cliente: { saldo: 5000, portafolio: [] },
        granjero: { saldo: 10000, granjas_propias: [1] },
      },
      granjas: [
        { id: 1, nombre: "Granja El Amanecer", gallinas: 500, produccion_promedio: 450,
          alimento_costo: 800, mantenimiento_costo: 200, otros_costos: 100,
          precio_token: 10.0, tokens_emitidos: 1000, valor_patrimonial: 10000 },
        { id: 2, nombre: "Granja Santa Rosa", gallinas: 800, produccion_promedio: 720,
          alimento_costo: 1280, mantenimiento_costo: 320, otros_costos: 150,
          precio_token: 15.0, tokens_emitidos: 1200, valor_patrimonial: 18000 },
      ],
      historial_transacciones: [],
      historial_inversion: [],
    };
  }

  function estadoValido(s) {
    return s && typeof s === "object" && s.usuarios && s.usuarios.cliente && s.usuarios.granjero &&
      Array.isArray(s.granjas) && Array.isArray(s.usuarios.cliente.portafolio) &&
      Array.isArray(s.usuarios.granjero.granjas_propias) && typeof s.mes_indice === "number";
  }

  function cargarEstado() {
    try {
      const crudo = window.localStorage.getItem(STORAGE_KEY);
      if (crudo) {
        const s = JSON.parse(crudo);
        if (estadoValido(s)) {
          s.historial_transacciones = s.historial_transacciones || [];
          s.historial_inversion = s.historial_inversion || [];
          return s;
        }
      }
    } catch (error) {
      console.warn("localStorage no disponible o estado corrupto; se usa el estado inicial.", error);
    }
    return crearEstadoInicial();
  }

  function guardarEstado(s) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch (error) {
      console.warn("No se pudo guardar en localStorage:", error);
    }
  }

  function clonar(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // ---------- Lógica de granjas ----------

  function obtenerGranja(s, id) {
    const g = s.granjas.find(function (x) { return x.id === id; });
    if (!g) throw new Error("Granja " + id + " no encontrada");
    return g;
  }

  function validarPropiedad(s, id) {
    if (s.usuarios.granjero.granjas_propias.indexOf(id) === -1) {
      throw new Error("La granja " + id + " no pertenece al granjero");
    }
  }

  function calcularResultado(g, precioHuevo) {
    const huevos = g.gallinas * g.produccion_promedio;
    const ingresos = huevos * precioHuevo;
    const costos = g.alimento_costo + g.mantenimiento_costo + g.otros_costos;
    const resultado = ingresos - costos;
    return {
      huevos: huevos,
      ingresos: ingresos,
      costos_totales: costos,
      resultado: resultado,
      retorno: g.valor_patrimonial ? resultado / g.valor_patrimonial : 0,
    };
  }

  function calcularPrecioEquilibrio(granjas, mes) {
    const oferta = granjas.reduce(function (a, g) { return a + g.gallinas * g.produccion_promedio; }, 0);
    const base = mes.precio_huevo_base_Pe * mes.costo_alimento_index;
    if (oferta <= 0) return redondear(base, 4);
    const demanda = OFERTA_REFERENCIA_MERCADO * (1 + mes.variacion_Pe_porcentaje / 100);
    const desbalance = (demanda - oferta) / oferta;
    return redondear(Math.max(base * (1 + ELASTICIDAD_PRECIO * desbalance), 0.01), 4);
  }

  // ---------- Valoración e historial ----------

  function registrarValoracion(s, evento) {
    const porId = {};
    s.granjas.forEach(function (g) { porId[g.id] = g; });
    const pos = s.usuarios.cliente.portafolio;
    const valor = pos.reduce(function (a, p) { return porId[p.granja_id] ? a + porId[p.granja_id].precio_token * p.tokens : a; }, 0);
    const costo = pos.reduce(function (a, p) { return a + p.costo_promedio * p.tokens; }, 0);
    s.historial_inversion.push({
      mes: s.mes_actual,
      evento: evento,
      valor_portafolio: redondear(valor, 2),
      costo_base: redondear(costo, 2),
      ganancia_estimada: redondear(valor - costo, 2),
    });
  }

  function registrarTransaccion(s, tipo, g, cantidad, precio, ganancia) {
    s.historial_transacciones.push({
      tipo: tipo,
      granja_id: g.id,
      cantidad: cantidad,
      precio_unitario: precio,
      monto_total: redondear(precio * cantidad, 2),
      ganancia_realizada: redondear(ganancia || 0, 2),
      mes: s.mes_actual,
      nombre_granja: g.nombre,
    });
  }

  function validarEntero(valor, mensaje) {
    if (!Number.isFinite(valor) || valor <= 0 || Math.floor(valor) !== valor) throw new Error(mensaje);
  }

  // ---------- Operaciones públicas (asíncronas para mantener la interfaz) ----------

  function operar(fn) {
    return new Promise(function (resolve, reject) {
      try {
        const s = cargarEstado();
        const resultado = fn(s);
        guardarEstado(s);
        resolve(resultado === undefined ? clonar(s) : resultado);
      } catch (error) {
        reject(error);
      }
    });
  }

  function getState() {
    return Promise.resolve(cargarEstado());
  }

  function advanceMonth() {
    return operar(function (s) {
      const indice = s.mes_indice;
      if (indice >= MESES_SIMULACION.length - 1) {
        throw new Error("La simulación ya alcanzó Diciembre 2026, no hay más meses disponibles");
      }
      const precioHuevo = calcularPrecioEquilibrio(s.granjas, estudioMercado[indice]);
      const resultados = s.granjas.map(function (g) {
        const r = calcularResultado(g, precioHuevo);
        g.precio_token = redondear(Math.max(g.precio_token * (1 + r.retorno), 0.01), 4);
        g.valor_patrimonial += r.resultado;
        return Object.assign({ granja_id: g.id }, r, { nuevo_precio_token: g.precio_token });
      });
      s.mes_indice = indice + 1;
      s.mes_actual = MESES_SIMULACION[s.mes_indice];
      registrarValoracion(s, "Avance mensual");
      return {
        mes_anterior: MESES_SIMULACION[indice],
        mes_nuevo: s.mes_actual,
        precio_huevo_equilibrio: precioHuevo,
        resultados_granjas: resultados,
      };
    });
  }

  function buyTokens(granjaId, cantidad) {
    return operar(function (s) {
      validarEntero(cantidad, "La cantidad de tokens debe ser mayor a 0");
      const g = obtenerGranja(s, granjaId);
      const cliente = s.usuarios.cliente;
      if (cantidad > g.tokens_emitidos) throw new Error("No hay suficientes tokens disponibles en la granja");
      const costoTotal = g.precio_token * cantidad;
      if (costoTotal > cliente.saldo) throw new Error("Saldo insuficiente para comprar tokens");

      cliente.saldo -= costoTotal;
      g.tokens_emitidos -= cantidad;

      let pos = cliente.portafolio.find(function (p) { return p.granja_id === granjaId; });
      if (!pos) {
        pos = { granja_id: granjaId, tokens: 0, costo_promedio: 0 };
        cliente.portafolio.push(pos);
      }
      const costoPrevio = pos.costo_promedio * pos.tokens;
      pos.tokens += cantidad;
      pos.costo_promedio = (costoPrevio + costoTotal) / pos.tokens;

      registrarTransaccion(s, "compra", g, cantidad, g.precio_token, 0);
      registrarValoracion(s, "Compra");
      return clonar(pos);
    });
  }

  function sellTokens(granjaId, cantidad) {
    return operar(function (s) {
      validarEntero(cantidad, "La cantidad de tokens debe ser mayor a 0");
      const g = obtenerGranja(s, granjaId);
      const cliente = s.usuarios.cliente;
      const pos = cliente.portafolio.find(function (p) { return p.granja_id === granjaId; });
      if (!pos || pos.tokens < cantidad) throw new Error("Tokens insuficientes en el portafolio");

      const precio = g.precio_token;
      const monto = precio * cantidad;
      const ganancia = (precio - pos.costo_promedio) * cantidad;
      cliente.saldo += monto;
      g.tokens_emitidos += cantidad;
      pos.tokens -= cantidad;
      if (pos.tokens === 0) {
        cliente.portafolio.splice(cliente.portafolio.indexOf(pos), 1);
      }

      registrarTransaccion(s, "venta", g, cantidad, precio, ganancia);
      registrarValoracion(s, "Venta");
      return {
        posicion: pos.tokens > 0 ? clonar(pos) : null,
        monto_recibido: redondear(monto, 2),
        ganancia_realizada: redondear(ganancia, 2),
        precio_unitario: precio,
      };
    });
  }

  function createFarm(p) {
    return operar(function (s) {
      const nombre = String(p.nombre || "").trim();
      if (!nombre) throw new Error("El nombre de la granja es obligatorio");
      const numeros = ["gallinas", "produccion_promedio", "alimento_costo", "mantenimiento_costo",
        "otros_costos", "precio_token", "tokens_emitidos"];
      numeros.forEach(function (k) {
        if (!Number.isFinite(Number(p[k])) || Number(p[k]) < 0) throw new Error("Valor inválido en " + k);
      });
      if (Number(p.gallinas) < 1 || Number(p.tokens_emitidos) < 1 || Number(p.precio_token) <= 0) {
        throw new Error("Gallinas, tokens emitidos y precio del token deben ser mayores a 0");
      }
      const id = s.granjas.reduce(function (m, g) { return Math.max(m, g.id); }, 0) + 1;
      const granja = {
        id: id,
        nombre: nombre,
        gallinas: Number(p.gallinas),
        produccion_promedio: Number(p.produccion_promedio),
        alimento_costo: Number(p.alimento_costo),
        mantenimiento_costo: Number(p.mantenimiento_costo),
        otros_costos: Number(p.otros_costos),
        precio_token: Number(p.precio_token),
        tokens_emitidos: Number(p.tokens_emitidos),
        valor_patrimonial: Number(p.precio_token) * Number(p.tokens_emitidos),
      };
      s.granjas.push(granja);
      s.usuarios.granjero.granjas_propias.push(id);
      return clonar(granja);
    });
  }

  function reinvest(granjaId, monto) {
    return operar(function (s) {
      if (!Number.isFinite(monto) || monto <= 0) throw new Error("El monto a reinvertir debe ser mayor a 0");
      validarPropiedad(s, granjaId);
      const g = obtenerGranja(s, granjaId);
      const granjero = s.usuarios.granjero;
      if (monto > granjero.saldo) throw new Error("Saldo insuficiente para reinvertir");
      granjero.saldo -= monto;
      g.valor_patrimonial += monto;
      g.gallinas += Math.floor(monto / COSTO_ADQUISICION_GALLINA);
      return clonar(g);
    });
  }

  function resetSimulation() {
    return new Promise(function (resolve) {
      const s = crearEstadoInicial();
      guardarEstado(s);
      resolve(clonar(s));
    });
  }

  window.GallinaCoinAPI = {
    getState: getState,
    advanceMonth: advanceMonth,
    buyTokens: buyTokens,
    sellTokens: sellTokens,
    createFarm: createFarm,
    reinvest: reinvest,
    resetSimulation: resetSimulation,
  };
})();
