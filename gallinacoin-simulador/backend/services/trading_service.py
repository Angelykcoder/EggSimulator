class TradingService:
    def __init__(self, state_manager, farm_service):
        self.state_manager = state_manager
        self.farm_service = farm_service

    def _obtener_posicion(self, portafolio, granja_id):
        for posicion in portafolio:
            if posicion["granja_id"] == granja_id:
                return posicion
        return None

    def _registrar_transaccion(self, state, tipo, granja_id, cantidad, precio_unitario):
        state["historial_transacciones"].append({
            "tipo": tipo,
            "granja_id": granja_id,
            "cantidad": cantidad,
            "precio_unitario": precio_unitario,
            "monto_total": round(precio_unitario * cantidad, 2),
            "mes": state["mes_actual"],
        })

    def comprar_tokens(self, granja_id, cantidad):
        if cantidad <= 0:
            raise ValueError("La cantidad de tokens debe ser mayor a 0")

        state = self.state_manager.get_state()
        granja = self.farm_service.obtener_granja(state, granja_id)
        cliente = state["usuarios"]["cliente"]

        if cantidad > granja["tokens_emitidos"]:
            raise ValueError("No hay suficientes tokens disponibles en la granja")

        costo_total = granja["precio_token"] * cantidad
        if costo_total > cliente["saldo"]:
            raise ValueError("Saldo insuficiente para comprar tokens")

        cliente["saldo"] -= costo_total
        granja["tokens_emitidos"] -= cantidad

        posicion = self._obtener_posicion(cliente["portafolio"], granja_id)
        if posicion is None:
            posicion = {"granja_id": granja_id, "tokens": 0, "costo_promedio": 0.0}
            cliente["portafolio"].append(posicion)

        costo_previo_total = posicion["costo_promedio"] * posicion["tokens"]
        posicion["tokens"] += cantidad
        posicion["costo_promedio"] = (costo_previo_total + costo_total) / posicion["tokens"]

        self._registrar_transaccion(state, "compra", granja_id, cantidad, granja["precio_token"])
        self.state_manager.save_state(state)
        return posicion

    def vender_tokens(self, granja_id, cantidad):
        if cantidad <= 0:
            raise ValueError("La cantidad de tokens debe ser mayor a 0")

        state = self.state_manager.get_state()
        granja = self.farm_service.obtener_granja(state, granja_id)
        cliente = state["usuarios"]["cliente"]
        posicion = self._obtener_posicion(cliente["portafolio"], granja_id)

        if posicion is None or posicion["tokens"] < cantidad:
            raise ValueError("Tokens insuficientes en el portafolio")

        monto_venta = granja["precio_token"] * cantidad
        cliente["saldo"] += monto_venta
        granja["tokens_emitidos"] += cantidad
        posicion["tokens"] -= cantidad

        if posicion["tokens"] == 0:
            cliente["portafolio"].remove(posicion)

        self._registrar_transaccion(state, "venta", granja_id, cantidad, granja["precio_token"])
        self.state_manager.save_state(state)
        return posicion if posicion["tokens"] > 0 else None

    def calcular_ganancia_perdida(self, state=None):
        state = state or self.state_manager.get_state()
        cliente = state["usuarios"]["cliente"]
        granjas_por_id = {g["id"]: g for g in state["granjas"]}
        resumen = []

        for posicion in cliente["portafolio"]:
            granja = granjas_por_id.get(posicion["granja_id"])
            if not granja:
                continue

            valor_actual = granja["precio_token"] * posicion["tokens"]
            costo_base = posicion["costo_promedio"] * posicion["tokens"]

            resumen.append({
                "granja_id": posicion["granja_id"],
                "tokens": posicion["tokens"],
                "precio_actual": granja["precio_token"],
                "costo_promedio": posicion["costo_promedio"],
                "valor_actual": valor_actual,
                "costo_base": costo_base,
                "ganancia_perdida": valor_actual - costo_base,
            })

        return resumen
