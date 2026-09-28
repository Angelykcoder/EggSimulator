(function () {
  function render(estado) {
    const tablaMercado = document.getElementById("gc-tabla-mercado");
    const tablaPortafolio = document.getElementById("gc-tabla-portafolio");
    if (!tablaMercado || !tablaPortafolio) return;

    const cliente = estado.usuarios.cliente;
    const granjasPorId = {};
    estado.granjas.forEach(function (g) {
      granjasPorId[g.id] = g;
    });

    document.getElementById("gc-cliente-saldo").textContent = "Q " + cliente.saldo.toFixed(2);
    renderTransacciones(estado.historial_transacciones || [], granjasPorId);
    renderGraficoInversion(estado.historial_inversion || []);

    tablaMercado.innerHTML =
      estado.granjas
        .map(function (g) {
          return (
            "<tr>" +
            "<td>" + g.nombre + "</td>" +
            "<td>Q " + g.precio_token.toFixed(2) + "</td>" +
            "<td>" + g.tokens_emitidos + "</td>" +
            '<td><button type="button" class="gc-btn gc-btn--buy gc-btn--sm" data-accion="comprar" data-granja="' + g.id + '">Comprar</button></td>' +
            "</tr>"
          );
        })
        .join("") || '<tr class="gc-empty-row"><td colspan="4">Sin granjas disponibles</td></tr>';

    let patrimonioTotal = 0;
    let ganPerdTotal = 0;

    tablaPortafolio.innerHTML =
      cliente.portafolio
        .map(function (p) {
          const granja = granjasPorId[p.granja_id];
          const precioActual = granja ? granja.precio_token : p.costo_promedio;
          const valorActual = precioActual * p.tokens;
          const costoBase = p.costo_promedio * p.tokens;
          const ganancia = valorActual - costoBase;
          const porcentaje = costoBase ? (ganancia / costoBase) * 100 : 0;

          patrimonioTotal += valorActual;
          ganPerdTotal += ganancia;

          const badgeClase = ganancia >= 0 ? "gc-badge--positive" : "gc-badge--negative";
          const signo = ganancia >= 0 ? "+" : "";

          return (
            "<tr>" +
            "<td>" + (granja ? granja.nombre : "Granja " + p.granja_id) + "</td>" +
            "<td>" + p.tokens + "</td>" +
            "<td>Q " + p.costo_promedio.toFixed(2) + "</td>" +
            "<td>Q " + precioActual.toFixed(2) + "</td>" +
            '<td><span class="gc-badge ' + badgeClase + '">' + signo + ganancia.toFixed(2) + " (" + signo + porcentaje.toFixed(1) + "%)</span></td>" +
            '<td><button type="button" class="gc-btn gc-btn--sell gc-btn--sm" data-accion="vender" data-granja="' + p.granja_id + '">Vender</button></td>' +
            "</tr>"
          );
        })
        .join("") || '<tr class="gc-empty-row"><td colspan="6">Sin posiciones abiertas</td></tr>';

    document.getElementById("gc-cliente-patrimonio").textContent = "Q " + patrimonioTotal.toFixed(2);
    const plEl = document.getElementById("gc-cliente-pl");
    plEl.textContent = (ganPerdTotal >= 0 ? "+" : "") + "Q " + ganPerdTotal.toFixed(2);
    plEl.classList.toggle("is-positive", ganPerdTotal >= 0);
    plEl.classList.toggle("is-negative", ganPerdTotal < 0);

    tablaMercado.querySelectorAll('[data-accion="comprar"]').forEach(function (btn) {
      const granjaId = Number(btn.dataset.granja);
      btn.addEventListener("click", function () {
        abrirModalCompra(granjaId, granjasPorId[granjaId]);
      });
    });

    tablaPortafolio.querySelectorAll('[data-accion="vender"]').forEach(function (btn) {
      const granjaId = Number(btn.dataset.granja);
      btn.addEventListener("click", function () {
        const posicion = cliente.portafolio.find(function (p) {
          return p.granja_id === granjaId;
        });
        abrirModalVenta(granjaId, posicion, granjasPorId[granjaId]);
      });
    });

    renderGrafico(estado.granjas);
  }

  function renderTransacciones(transacciones, granjasPorId) {
    const tabla = document.getElementById("gc-tabla-transacciones");
    if (!tabla) return;
    tabla.innerHTML = transacciones.slice().reverse().slice(0, 12).map(function (t) {
      const ganancia = Number(t.ganancia_realizada || 0);
      const nombre = t.nombre_granja || (granjasPorId[t.granja_id] && granjasPorId[t.granja_id].nombre) || "Granja " + t.granja_id;
      const resultado = t.tipo === "venta"
        ? '<span class="gc-badge ' + (ganancia >= 0 ? "gc-badge--positive" : "gc-badge--negative") + '">' + (ganancia >= 0 ? "+" : "") + "Q " + ganancia.toFixed(2) + "</span>"
        : "—";
      return "<tr><td>" + t.mes + "</td><td>" + (t.tipo === "compra" ? "Compra" : "Venta") + "</td><td>" + nombre + "</td><td>" + t.cantidad + "</td><td>Q " + Number(t.precio_unitario).toFixed(2) + "</td><td>Q " + Number(t.monto_total).toFixed(2) + "</td><td>" + resultado + "</td></tr>";
    }).join("") || '<tr class="gc-empty-row"><td colspan="7">Aún no hay operaciones</td></tr>';
  }

  function renderGraficoInversion(historial) {
    if (!window.GallinaCoinApp) return;
    window.GallinaCoinApp.renderChart("gc-grafico-inversion", {
      type: "line",
      data: {
        labels: historial.map(function (p) { return p.mes + " · " + p.evento; }),
        datasets: [
          { label: "Valor actual del portafolio (Q)", data: historial.map(function (p) { return p.valor_portafolio; }), borderColor: "#f5b301", backgroundColor: "rgba(245,179,1,.15)", fill: true, tension: 0.25 },
          { label: "Costo de tokens conservados (Q)", data: historial.map(function (p) { return p.costo_base; }), borderColor: "#60a5fa", backgroundColor: "transparent", tension: 0.25 },
        ],
      },
      options: {
        responsive: true,
        interaction: { mode: "index", intersect: false },
        plugins: { legend: { labels: { color: "#8b95a7" } } },
        scales: {
          x: { ticks: { color: "#8b95a7", maxRotation: 45 }, grid: { color: "#2a3244" } },
          y: { beginAtZero: true, ticks: { color: "#8b95a7", callback: function (v) { return "Q " + v; } }, grid: { color: "#2a3244" } },
        },
      },
    });
  }

  function renderGrafico(granjas) {
    if (!window.GallinaCoinApp) return;
    window.GallinaCoinApp.renderChart("gc-grafico-cliente", {
      type: "bar",
      data: {
        labels: granjas.map(function (g) {
          return g.nombre;
        }),
        datasets: [
          {
            label: "Precio del token (Q)",
            data: granjas.map(function (g) {
              return g.precio_token;
            }),
            backgroundColor: "#f5b301",
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: "#8b95a7" }, grid: { color: "#2a3244" } },
          y: { ticks: { color: "#8b95a7" }, grid: { color: "#2a3244" } },
        },
      },
    });
  }

  function abrirModalCompra(granjaId, granja) {
    const contenedor = document.createElement("div");
    contenedor.innerHTML =
      "<h3>Comprar tokens - " + (granja ? granja.nombre : granjaId) + "</h3>" +
      "<p>Precio unitario: Q " + (granja ? granja.precio_token.toFixed(2) : "-") + "</p>" +
      '<label>Cantidad<input type="number" id="gc-input-compra" min="1" step="1" value="1"></label>' +
      '<p id="gc-compra-total">Total estimado: Q ' + (granja ? granja.precio_token.toFixed(2) : "0.00") + '</p>' +
      '<p id="gc-compra-error" class="gc-form__error"></p>' +
      '<div class="gc-modal__actions">' +
      '<button type="button" id="gc-confirmar-compra" class="gc-btn gc-btn--primary">Confirmar compra</button>' +
      '<button type="button" id="gc-cancelar-compra" class="gc-btn gc-btn--ghost">Cancelar</button>' +
      "</div>";

    window.GallinaCoinApp.showModal(contenedor);

    const inputCompra = contenedor.querySelector("#gc-input-compra");
    inputCompra.addEventListener("input", function () {
      const total = Number(inputCompra.value || 0) * (granja ? granja.precio_token : 0);
      contenedor.querySelector("#gc-compra-total").textContent = "Total estimado: Q " + total.toFixed(2);
    });

    contenedor.querySelector("#gc-cancelar-compra").addEventListener("click", function () {
      window.GallinaCoinApp.closeModal();
    });

    contenedor.querySelector("#gc-confirmar-compra").addEventListener("click", async function () {
      const cantidad = Number(contenedor.querySelector("#gc-input-compra").value);
      const errorEl = contenedor.querySelector("#gc-compra-error");
      if (!Number.isInteger(cantidad) || cantidad <= 0) {
        errorEl.textContent = "Ingresa una cantidad válida";
        return;
      }
      try {
        await GallinaCoinAPI.buyTokens(granjaId, cantidad);
        window.GallinaCoinApp.closeModal();
        window.GallinaCoinApp.mostrarMensaje("Compra realizada correctamente", "success");
        await window.GallinaCoinApp.refresh();
      } catch (error) {
        errorEl.textContent = error.message;
      }
    });
  }

  function abrirModalVenta(granjaId, posicion, granja) {
    const tokensDisponibles = posicion ? posicion.tokens : 0;
    const precioActual = granja ? granja.precio_token : 0;
    const contenedor = document.createElement("div");
    contenedor.innerHTML =
      "<h3>Vender tokens - " + (granja ? granja.nombre : "Granja " + granjaId) + "</h3>" +
      "<p>Precio unitario estimado: Q " + precioActual.toFixed(2) + "</p>" +
      "<p>Tokens disponibles: " + tokensDisponibles + "</p>" +
      '<label>Cantidad<input type="number" id="gc-input-venta" min="1" step="1" max="' + tokensDisponibles + '" value="1"></label>' +
      '<p id="gc-venta-total">Recibirías: Q ' + precioActual.toFixed(2) + '</p>' +
      '<p id="gc-venta-error" class="gc-form__error"></p>' +
      '<div class="gc-modal__actions">' +
      '<button type="button" id="gc-confirmar-venta" class="gc-btn gc-btn--primary">Confirmar venta</button>' +
      '<button type="button" id="gc-cancelar-venta" class="gc-btn gc-btn--ghost">Cancelar</button>' +
      "</div>";

    window.GallinaCoinApp.showModal(contenedor);

    const inputVenta = contenedor.querySelector("#gc-input-venta");
    inputVenta.addEventListener("input", function () {
      const total = Number(inputVenta.value || 0) * precioActual;
      contenedor.querySelector("#gc-venta-total").textContent = "Recibirías: Q " + total.toFixed(2);
    });

    contenedor.querySelector("#gc-cancelar-venta").addEventListener("click", function () {
      window.GallinaCoinApp.closeModal();
    });

    contenedor.querySelector("#gc-confirmar-venta").addEventListener("click", async function () {
      const cantidad = Number(contenedor.querySelector("#gc-input-venta").value);
      const errorEl = contenedor.querySelector("#gc-venta-error");
      if (!Number.isInteger(cantidad) || cantidad <= 0) {
        errorEl.textContent = "Ingresa una cantidad válida";
        return;
      }
      try {
        const resultado = await GallinaCoinAPI.sellTokens(granjaId, cantidad);
        window.GallinaCoinApp.closeModal();
        const signo = resultado.ganancia_realizada >= 0 ? "+" : "";
        window.GallinaCoinApp.mostrarMensaje("Venta: recibiste Q " + resultado.monto_recibido.toFixed(2) + ". Resultado realizado: " + signo + "Q " + resultado.ganancia_realizada.toFixed(2), "success");
        await window.GallinaCoinApp.refresh();
      } catch (error) {
        errorEl.textContent = error.message;
      }
    });
  }

  window.GallinaCoinClient = { render: render };
})();
