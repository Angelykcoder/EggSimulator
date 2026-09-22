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
        abrirModalVenta(granjaId, posicion);
      });
    });

    renderGrafico(estado.granjas);
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
      '<p id="gc-compra-error" class="gc-form__error"></p>' +
      '<div class="gc-modal__actions">' +
      '<button type="button" id="gc-confirmar-compra" class="gc-btn gc-btn--primary">Confirmar compra</button>' +
      '<button type="button" id="gc-cancelar-compra" class="gc-btn gc-btn--ghost">Cancelar</button>' +
      "</div>";

    window.GallinaCoinApp.showModal(contenedor);

    contenedor.querySelector("#gc-cancelar-compra").addEventListener("click", function () {
      window.GallinaCoinApp.closeModal();
    });

    contenedor.querySelector("#gc-confirmar-compra").addEventListener("click", async function () {
      const cantidad = Number(contenedor.querySelector("#gc-input-compra").value);
      const errorEl = contenedor.querySelector("#gc-compra-error");
      if (!cantidad || cantidad <= 0) {
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

  function abrirModalVenta(granjaId, posicion) {
    const tokensDisponibles = posicion ? posicion.tokens : 0;
    const contenedor = document.createElement("div");
    contenedor.innerHTML =
      "<h3>Vender tokens - Granja " + granjaId + "</h3>" +
      "<p>Tokens disponibles: " + tokensDisponibles + "</p>" +
      '<label>Cantidad<input type="number" id="gc-input-venta" min="1" step="1" max="' + tokensDisponibles + '" value="1"></label>' +
      '<p id="gc-venta-error" class="gc-form__error"></p>' +
      '<div class="gc-modal__actions">' +
      '<button type="button" id="gc-confirmar-venta" class="gc-btn gc-btn--primary">Confirmar venta</button>' +
      '<button type="button" id="gc-cancelar-venta" class="gc-btn gc-btn--ghost">Cancelar</button>' +
      "</div>";

    window.GallinaCoinApp.showModal(contenedor);

    contenedor.querySelector("#gc-cancelar-venta").addEventListener("click", function () {
      window.GallinaCoinApp.closeModal();
    });

    contenedor.querySelector("#gc-confirmar-venta").addEventListener("click", async function () {
      const cantidad = Number(contenedor.querySelector("#gc-input-venta").value);
      const errorEl = contenedor.querySelector("#gc-venta-error");
      if (!cantidad || cantidad <= 0) {
        errorEl.textContent = "Ingresa una cantidad válida";
        return;
      }
      try {
        await GallinaCoinAPI.sellTokens(granjaId, cantidad);
        window.GallinaCoinApp.closeModal();
        window.GallinaCoinApp.mostrarMensaje("Venta realizada correctamente", "success");
        await window.GallinaCoinApp.refresh();
      } catch (error) {
        errorEl.textContent = error.message;
      }
    });
  }

  window.GallinaCoinClient = { render: render };
})();
