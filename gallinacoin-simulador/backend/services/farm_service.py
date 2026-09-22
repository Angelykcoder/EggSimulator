class FarmService:
    COSTO_ADQUISICION_GALLINA = 20

    def __init__(self, state_manager):
        self.state_manager = state_manager

    def obtener_granja(self, state, granja_id):
        for granja in state["granjas"]:
            if granja["id"] == granja_id:
                return granja
        raise ValueError(f"Granja {granja_id} no encontrada")

    def _validar_propiedad(self, state, granja_id):
        if granja_id not in state["usuarios"]["granjero"]["granjas_propias"]:
            raise ValueError(f"La granja {granja_id} no pertenece al granjero")

    def crear_granja(self, nombre, gallinas, produccion_promedio, alimento_costo,
                      mantenimiento_costo, otros_costos, precio_token, tokens_emitidos):
        state = self.state_manager.get_state()
        granjas = state["granjas"]
        nuevo_id = max((g["id"] for g in granjas), default=0) + 1

        granja = {
            "id": nuevo_id,
            "nombre": nombre,
            "gallinas": gallinas,
            "produccion_promedio": produccion_promedio,
            "alimento_costo": alimento_costo,
            "mantenimiento_costo": mantenimiento_costo,
            "otros_costos": otros_costos,
            "precio_token": precio_token,
            "tokens_emitidos": tokens_emitidos,
            "valor_patrimonial": precio_token * tokens_emitidos,
        }

        granjas.append(granja)
        state["usuarios"]["granjero"]["granjas_propias"].append(nuevo_id)
        self.state_manager.save_state(state)
        return granja

    def actualizar_gallinas(self, granja_id, nuevas_gallinas):
        state = self.state_manager.get_state()
        self._validar_propiedad(state, granja_id)
        granja = self.obtener_granja(state, granja_id)
        granja["gallinas"] = nuevas_gallinas
        self.state_manager.save_state(state)
        return granja

    def actualizar_costos(self, granja_id, alimento_costo=None, mantenimiento_costo=None, otros_costos=None):
        state = self.state_manager.get_state()
        self._validar_propiedad(state, granja_id)
        granja = self.obtener_granja(state, granja_id)

        if alimento_costo is not None:
            granja["alimento_costo"] = alimento_costo
        if mantenimiento_costo is not None:
            granja["mantenimiento_costo"] = mantenimiento_costo
        if otros_costos is not None:
            granja["otros_costos"] = otros_costos

        self.state_manager.save_state(state)
        return granja

    def calcular_resultado(self, granja, precio_huevo):
        huevos = granja["gallinas"] * granja["produccion_promedio"]
        ingresos = huevos * precio_huevo
        costos_totales = granja["alimento_costo"] + granja["mantenimiento_costo"] + granja["otros_costos"]
        resultado = ingresos - costos_totales
        retorno = resultado / granja["valor_patrimonial"] if granja["valor_patrimonial"] else 0

        return {
            "huevos": huevos,
            "ingresos": ingresos,
            "costos_totales": costos_totales,
            "resultado": resultado,
            "retorno": retorno,
        }

    def reinvertir(self, granja_id, monto):
        if monto <= 0:
            raise ValueError("El monto a reinvertir debe ser mayor a 0")

        state = self.state_manager.get_state()
        self._validar_propiedad(state, granja_id)
        granja = self.obtener_granja(state, granja_id)
        granjero = state["usuarios"]["granjero"]

        if monto > granjero["saldo"]:
            raise ValueError("Saldo insuficiente para reinvertir")

        granjero["saldo"] -= monto
        granja["valor_patrimonial"] += monto
        granja["gallinas"] += int(monto // self.COSTO_ADQUISICION_GALLINA)

        self.state_manager.save_state(state)
        return granja
