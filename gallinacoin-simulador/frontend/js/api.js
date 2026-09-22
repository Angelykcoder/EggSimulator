(function () {
  const BASE_URL = "http://127.0.0.1:8000";

  async function request(path, options) {
    let respuesta;
    try {
      respuesta = await fetch(BASE_URL + path, {
        headers: { "Content-Type": "application/json" },
        ...options,
      });
    } catch (error) {
      throw new Error("No se pudo conectar con el servidor (" + error.message + ")");
    }

    let cuerpo = null;
    try {
      cuerpo = await respuesta.json();
    } catch (error) {
      cuerpo = null;
    }

    if (!respuesta.ok) {
      const detalle = cuerpo && cuerpo.detail ? cuerpo.detail : "Error HTTP " + respuesta.status;
      throw new Error(detalle);
    }

    return cuerpo;
  }

  function getState() {
    return request("/api/state", { method: "GET" });
  }

  function advanceMonth() {
    return request("/api/simulation/advance", { method: "POST", body: JSON.stringify({}) });
  }

  function buyTokens(granjaId, cantidad) {
    return request("/api/client/buy", {
      method: "POST",
      body: JSON.stringify({ granja_id: granjaId, cantidad: cantidad }),
    });
  }

  function sellTokens(granjaId, cantidad) {
    return request("/api/client/sell", {
      method: "POST",
      body: JSON.stringify({ granja_id: granjaId, cantidad: cantidad }),
    });
  }

  function createFarm(payload) {
    return request("/api/farmer/farm", { method: "POST", body: JSON.stringify(payload) });
  }

  function reinvest(granjaId, monto) {
    return request("/api/farmer/reinvest", {
      method: "POST",
      body: JSON.stringify({ granja_id: granjaId, monto: monto }),
    });
  }

  window.GallinaCoinAPI = {
    getState: getState,
    advanceMonth: advanceMonth,
    buyTokens: buyTokens,
    sellTokens: sellTokens,
    createFarm: createFarm,
    reinvest: reinvest,
  };
})();
