(function () {
  function render(estado) {
    const tablaGranjas = document.getElementById("gc-tabla-granjas");
    const form = document.getElementById("gc-form-granja");
    if (!tablaGranjas || !form) return;

    const granjero = estado.usuarios.granjero;
    const misGranjas = estado.granjas.filter(function (g) {
      return granjero.granjas_propias.indexOf(g.id) !== -1;
    });

    document.getElementById("gc-granjero-saldo").textContent = "Q " + granjero.saldo.toFixed(2);

    let produccionTotal = 0;
    let costosTotal = 0;

    tablaGranjas.innerHTML =
      misGranjas
        .map(function (g) {
          const huevos = g.gallinas * g.produccion_promedio;
          const costos = g.alimento_costo + g.mantenimiento_costo + g.otros_costos;
          produccionTotal += huevos;
          costosTotal += costos;

          return (
            "<tr>" +
            "<td>" + g.nombre + "</td>" +
            "<td>" + g.gallinas + "</td>" +
            "<td>" + huevos + " huevos/mes</td>" +
            "<td>Q " + costos.toFixed(2) + "</td>" +
            "<td>Q " + g.precio_token.toFixed(2) + "</td>" +
            "<td>Q " + g.valor_patrimonial.toFixed(2) + "</td>" +
            '<td><button type="button" class="gc-btn gc-btn--sm" data-accion="reinvertir" data-granja="' + g.id + '">Reinvertir</button></td>' +
            "</tr>"
          );
        })
        .join("") || '<tr class="gc-empty-row"><td colspan="7">Aún no tienes granjas registradas</td></tr>';

    document.getElementById("gc-granjero-produccion").textContent = produccionTotal + " huevos/mes";
    document.getElementById("gc-granjero-costos").textContent = "Q " + costosTotal.toFixed(2);

    tablaGranjas.querySelectorAll('[data-accion="reinvertir"]').forEach(function (btn) {
      const granjaId = Number(btn.dataset.granja);
      btn.addEventListener("click", function () {
        abrirModalReinversion(granjaId);
      });
    });

    if (!form.dataset.bound) {
      form.addEventListener("submit", handleCrearGranja);
      form.dataset.bound = "true";
    }

    renderGrafico(misGranjas);
  }

  function renderGrafico(granjas) {
    if (!window.GallinaCoinApp) return;
    window.GallinaCoinApp.renderChart("gc-grafico-granjero", {
      type: "bar",
      data: {
        labels: granjas.map(function (g) {
          return g.nombre;
        }),
        datasets: [
          {
            label: "Huevos / mes",
            data: granjas.map(function (g) {
              return g.gallinas * g.produccion_promedio;
            }),
            backgroundColor: "#3b82f6",
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

  async function handleCrearGranja(evento) {
    evento.preventDefault();
    const form = evento.target;
    const errorEl = document.getElementById("gc-form-granja-error");
    const datos = new FormData(form);

    const payload = {
      nombre: datos.get("nombre"),
      gallinas: Number(datos.get("gallinas")),
      produccion_promedio: Number(datos.get("produccion_promedio")),
      alimento_costo: Number(datos.get("alimento_costo")),
      mantenimiento_costo: Number(datos.get("mantenimiento_costo")),
      otros_costos: Number(datos.get("otros_costos")),
      precio_token: Number(datos.get("precio_token")),
      tokens_emitidos: Number(datos.get("tokens_emitidos")),
    };

    try {
      await GallinaCoinAPI.createFarm(payload);
      errorEl.textContent = "";
      form.reset();
      window.GallinaCoinApp.mostrarMensaje("Granja registrada correctamente", "success");
      await window.GallinaCoinApp.refresh();
    } catch (error) {
      errorEl.textContent = error.message;
    }
  }

  function abrirModalReinversion(granjaId) {
    const contenedor = document.createElement("div");
    contenedor.innerHTML =
      "<h3>Reinvertir en granja " + granjaId + "</h3>" +
      '<label>Monto a reinvertir<input type="number" id="gc-input-reinversion" min="1" step="0.01" value="100"></label>' +
      '<p id="gc-reinversion-error" class="gc-form__error"></p>' +
      '<div class="gc-modal__actions">' +
      '<button type="button" id="gc-confirmar-reinversion" class="gc-btn gc-btn--primary">Confirmar</button>' +
      '<button type="button" id="gc-cancelar-reinversion" class="gc-btn gc-btn--ghost">Cancelar</button>' +
      "</div>";

    window.GallinaCoinApp.showModal(contenedor);

    contenedor.querySelector("#gc-cancelar-reinversion").addEventListener("click", function () {
      window.GallinaCoinApp.closeModal();
    });

    contenedor.querySelector("#gc-confirmar-reinversion").addEventListener("click", async function () {
      const monto = Number(contenedor.querySelector("#gc-input-reinversion").value);
      const errorEl = contenedor.querySelector("#gc-reinversion-error");
      if (!monto || monto <= 0) {
        errorEl.textContent = "Ingresa un monto válido";
        return;
      }
      try {
        await GallinaCoinAPI.reinvest(granjaId, monto);
        window.GallinaCoinApp.closeModal();
        window.GallinaCoinApp.mostrarMensaje("Reinversión aplicada correctamente", "success");
        await window.GallinaCoinApp.refresh();
      } catch (error) {
        errorEl.textContent = error.message;
      }
    });
  }

  window.GallinaCoinFarmer = { render: render };
})();
