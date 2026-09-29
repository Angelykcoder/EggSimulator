(function () {
  const state = { current: null, activeTab: "cliente" };
  const chartInstances = {};
  let mensajeTimeoutId = null;

  function attachTabs() {
    document.querySelectorAll(".gc-tab-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        switchTab(btn.dataset.tab);
      });
    });
  }

  function switchTab(tab) {
    state.activeTab = tab;
    document.getElementById("gc-panel-cliente").hidden = tab !== "cliente";
    document.getElementById("gc-panel-granjero").hidden = tab !== "granjero";

    document.querySelectorAll(".gc-tab-btn").forEach(function (btn) {
      btn.classList.toggle("is-active", btn.dataset.tab === tab);
    });

    actualizarSaldoActivo();
  }

  function actualizarSaldoActivo() {
    if (!state.current) return;
    const el = document.getElementById("gc-saldo-activo");
    const usuarios = state.current.usuarios;
    const saldo = state.activeTab === "granjero" ? usuarios.granjero.saldo : usuarios.cliente.saldo;
    el.textContent = "Q " + saldo.toFixed(2);
  }

  function mostrarMensaje(texto, tipo) {
    const el = document.getElementById("gc-mensaje");
    if (!el) return;
    el.textContent = texto;
    el.dataset.tipo = tipo || "info";
    if (mensajeTimeoutId) {
      window.clearTimeout(mensajeTimeoutId);
    }
    if (texto) {
      mensajeTimeoutId = window.setTimeout(function () {
        el.textContent = "";
        el.removeAttribute("data-tipo");
      }, 4000);
    }
  }

  async function refresh() {
    let estado;
    try {
      estado = await GallinaCoinAPI.getState();
    } catch (error) {
      mostrarMensaje("No se pudo cargar el estado: " + error.message, "error");
      return;
    }

    state.current = estado;
    document.getElementById("gc-mes-actual").textContent = estado.mes_actual;
    actualizarSaldoActivo();

    try {
      GallinaCoinClient.render(estado);
    } catch (error) {
      console.error("Error al renderizar el panel cliente:", error);
    }

    try {
      GallinaCoinFarmer.render(estado);
    } catch (error) {
      console.error("Error al renderizar el panel granjero:", error);
    }
  }

  async function handleAdvanceMonth() {
    try {
      const resultado = await GallinaCoinAPI.advanceMonth();
      mostrarMensaje("Mes avanzado: " + resultado.mes_anterior + " -> " + resultado.mes_nuevo, "success");
      await refresh();
    } catch (error) {
      mostrarMensaje(error.message, "error");
    }
  }

  async function handleReset() {
    if (!window.confirm("¿Reiniciar la simulación? Se perderán saldo, portafolio e historial.")) return;
    await GallinaCoinAPI.resetSimulation();
    mostrarMensaje("Simulación reiniciada", "success");
    await refresh();
  }

  function showModal(contenidoEl) {
    const overlay = document.getElementById("gc-modal-overlay");
    const content = document.getElementById("gc-modal-content");
    content.innerHTML = "";
    content.appendChild(contenidoEl);
    overlay.hidden = false;
  }

  function closeModal() {
    const overlay = document.getElementById("gc-modal-overlay");
    overlay.hidden = true;
  }

  function attachModalOverlay() {
    const overlay = document.getElementById("gc-modal-overlay");
    overlay.addEventListener("click", function (evento) {
      if (evento.target === overlay) closeModal();
    });
  }

  function renderChart(canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof window.Chart === "undefined") return;

    try {
      if (chartInstances[canvasId]) {
        chartInstances[canvasId].destroy();
      }
      chartInstances[canvasId] = new window.Chart(canvas, config);
    } catch (error) {
      console.error("Error al dibujar el gráfico " + canvasId + ":", error);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    attachTabs();
    attachModalOverlay();
    document.getElementById("gc-btn-avanzar-mes").addEventListener("click", handleAdvanceMonth);
    document.getElementById("gc-btn-reiniciar").addEventListener("click", handleReset);
    switchTab("cliente");
    refresh();
  });

  window.GallinaCoinApp = {
    refresh: refresh,
    mostrarMensaje: mostrarMensaje,
    showModal: showModal,
    closeModal: closeModal,
    renderChart: renderChart,
    getState: function () {
      return state.current;
    },
  };
})();
