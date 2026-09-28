class SimulationService:
    MESES_SIMULACION = ["Septiembre 2026", "Octubre 2026", "Noviembre 2026", "Diciembre 2026"]

    def __init__(self, state_manager, market_service, farm_service, estudio_mercado):
        self.state_manager = state_manager
        self.market_service = market_service
        self.farm_service = farm_service
        self.estudio_mercado = estudio_mercado

    def _mes_info(self, indice):
        return self.estudio_mercado[indice]

    def avanzar_mes(self):
        state = self.state_manager.get_state()
        indice_actual = state["mes_indice"]

        if indice_actual >= len(self.MESES_SIMULACION) - 1:
            raise ValueError("La simulación ya alcanzó Diciembre 2026, no hay más meses disponibles")

        mes_info = self._mes_info(indice_actual)
        precio_huevo = self.market_service.calcular_precio_equilibrio(state["granjas"], mes_info)

        resultados_granjas = []
        for granja in state["granjas"]:
            resultado = self.farm_service.calcular_resultado(granja, precio_huevo)

            nuevo_precio_token = granja["precio_token"] * (1 + resultado["retorno"])
            granja["precio_token"] = round(max(nuevo_precio_token, 0.01), 4)
            granja["valor_patrimonial"] += resultado["resultado"]

            resultados_granjas.append({
                "granja_id": granja["id"],
                **resultado,
                "nuevo_precio_token": granja["precio_token"],
            })

        nuevo_indice = indice_actual + 1
        state["mes_indice"] = nuevo_indice
        state["mes_actual"] = self.MESES_SIMULACION[nuevo_indice]

        granjas_por_id = {g["id"]: g for g in state["granjas"]}
        posiciones = state["usuarios"]["cliente"]["portafolio"]
        valor = sum(granjas_por_id[p["granja_id"]]["precio_token"] * p["tokens"]
                    for p in posiciones if p["granja_id"] in granjas_por_id)
        costo = sum(p["costo_promedio"] * p["tokens"] for p in posiciones)
        state.setdefault("historial_inversion", []).append({
            "mes": state["mes_actual"],
            "evento": "Avance mensual",
            "valor_portafolio": round(valor, 2),
            "costo_base": round(costo, 2),
            "ganancia_estimada": round(valor - costo, 2),
        })

        self.state_manager.save_state(state)

        return {
            "mes_anterior": self.MESES_SIMULACION[indice_actual],
            "mes_nuevo": state["mes_actual"],
            "precio_huevo_equilibrio": precio_huevo,
            "resultados_granjas": resultados_granjas,
        }
