import copy
import json
import os
import tempfile
import threading

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_STATE_PATH = os.path.join(BASE_DIR, "data", "app_state.json")


class StateManager:
    def __init__(self, file_path=DEFAULT_STATE_PATH):
        self.file_path = file_path
        self._lock = threading.Lock()
        self._state = self._read_from_disk()

    def _read_from_disk(self):
        with open(self.file_path, "r", encoding="utf-8") as f:
            return json.load(f)

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
