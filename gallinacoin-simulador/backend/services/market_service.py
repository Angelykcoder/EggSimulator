import json
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_MARKET_STUDY_PATH = os.path.join(BASE_DIR, "data", "market_study.json")


class MarketService:
    ELASTICIDAD_PRECIO = 0.5
    OFERTA_REFERENCIA_MERCADO = 1_000_000

    @staticmethod
    def cargar_estudio_mercado(file_path=DEFAULT_MARKET_STUDY_PATH):
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return sorted(data["meses"], key=lambda mes: mes["indice"])

    def calcular_oferta_total(self, granjas):
        return sum(g["gallinas"] * g["produccion_promedio"] for g in granjas)

    def calcular_demanda_esperada(self, mes_info):
        factor_demanda = 1 + (mes_info["variacion_Pe_porcentaje"] / 100)
        return self.OFERTA_REFERENCIA_MERCADO * factor_demanda

    def calcular_precio_equilibrio(self, granjas, mes_info):
        oferta_total = self.calcular_oferta_total(granjas)
        precio_base = mes_info["precio_huevo_base_Pe"] * mes_info["costo_alimento_index"]

        if oferta_total <= 0:
            return round(precio_base, 4)

        demanda_esperada = self.calcular_demanda_esperada(mes_info)
        desbalance = (demanda_esperada - oferta_total) / oferta_total
        precio_equilibrio = precio_base * (1 + self.ELASTICIDAD_PRECIO * desbalance)

        return round(max(precio_equilibrio, 0.01), 4)
