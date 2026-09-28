import copy
import json
import os
import tempfile
import threading

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_STATE_PATH = os.path.join(BASE_DIR, "data", "app_state.json")
DEFAULT_MARKET_STUDY_PATH = os.path.join(BASE_DIR, "data", "market_study.json")


def crear_estado_inicial(market_study_path=DEFAULT_MARKET_STUDY_PATH):
    """Genera un estado válido tomando el primer mes del estudio de mercado."""
    with open(market_study_path, "r", encoding="utf-8") as f:
        estudio = json.load(f)

    meses = sorted(estudio.get("meses", []), key=lambda mes: mes["indice"])
    if not meses:
        raise ValueError("market_study.json no contiene meses para iniciar la simulación")

    primer_mes = meses[0]
    return {
        "mes_actual": f'{primer_mes["mes"]} {primer_mes["anio"]}',
        "mes_indice": primer_mes["indice"],
        "usuarios": {
            "cliente": {"saldo": 5000, "portafolio": []},
            "granjero": {"saldo": 10000, "granjas_propias": [1]},
        },
        "granjas": [
            {
                "id": 1,
                "nombre": "Granja El Amanecer",
                "gallinas": 500,
                "produccion_promedio": 450,
                "alimento_costo": 800,
                "mantenimiento_costo": 200,
                "otros_costos": 100,
                "precio_token": 10.0,
                "tokens_emitidos": 1000,
                "valor_patrimonial": 10000,
            },
            {
                "id": 2,
                "nombre": "Granja Santa Rosa",
                "gallinas": 800,
                "produccion_promedio": 720,
                "alimento_costo": 1280,
                "mantenimiento_costo": 320,
                "otros_costos": 150,
                "precio_token": 15.0,
                "tokens_emitidos": 1200,
                "valor_patrimonial": 18000,
            },
        ],
        "historial_transacciones": [],
        "historial_inversion": [],
    }


class StateManager:
    def __init__(self, file_path=DEFAULT_STATE_PATH):
        self.file_path = file_path
        self._lock = threading.Lock()
        self._ensure_state_file()
        self._state = self._read_from_disk()

    def _ensure_state_file(self):
        if os.path.exists(self.file_path):
            return

        os.makedirs(os.path.dirname(self.file_path), exist_ok=True)
        self._write_to_disk(crear_estado_inicial())

    def _read_from_disk(self):
        with open(self.file_path, "r", encoding="utf-8") as f:
            state = json.load(f)

        # Estados creados antes del historial nuevo siguen siendo compatibles.
        changed = False
        for key, default in (("historial_transacciones", []), ("historial_inversion", [])):
            if key not in state:
                state[key] = default
                changed = True
        if changed:
            self._write_to_disk(state)
        return state

    def _write_to_disk(self, state):
        directorio = os.path.dirname(self.file_path)
        fd, ruta_temporal = tempfile.mkstemp(dir=directorio, suffix=".tmp")
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                json.dump(state, f, indent=2, ensure_ascii=False)
            os.replace(ruta_temporal, self.file_path)
        except Exception:
            if os.path.exists(ruta_temporal):
                os.remove(ruta_temporal)
            raise

    def get_state(self):
        with self._lock:
            return copy.deepcopy(self._state)

    def save_state(self, state):
        with self._lock:
            self._state = copy.deepcopy(state)
            self._write_to_disk(self._state)

    def reload(self):
        with self._lock:
            self._state = self._read_from_disk()
            return copy.deepcopy(self._state)
