from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .state_manager import StateManager
from .services.market_service import MarketService
from .services.farm_service import FarmService
from .services.trading_service import TradingService
from .services.simulation_service import SimulationService

app = FastAPI(title="GallinaCoin API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

state_manager = StateManager()
market_service = MarketService()
farm_service = FarmService(state_manager)
trading_service = TradingService(state_manager, farm_service)
estudio_mercado = MarketService.cargar_estudio_mercado()
simulation_service = SimulationService(state_manager, market_service, farm_service, estudio_mercado)


class CompraVentaRequest(BaseModel):
    granja_id: int
    cantidad: int


class CrearGranjaRequest(BaseModel):
    nombre: str
    gallinas: int
    produccion_promedio: float
    alimento_costo: float
    mantenimiento_costo: float
    otros_costos: float
    precio_token: float
    tokens_emitidos: int


class ReinvertirRequest(BaseModel):
    granja_id: int
    monto: float


@app.get("/api/state")
def obtener_estado():
    return state_manager.get_state()


@app.post("/api/simulation/advance")
def avanzar_simulacion():
    try:
        return simulation_service.avanzar_mes()
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))


@app.post("/api/client/buy")
def comprar_tokens(request: CompraVentaRequest):
    try:
        return trading_service.comprar_tokens(request.granja_id, request.cantidad)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))


@app.post("/api/client/sell")
def vender_tokens(request: CompraVentaRequest):
    try:
        return trading_service.vender_tokens(request.granja_id, request.cantidad)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))


@app.post("/api/farmer/farm")
def crear_granja(request: CrearGranjaRequest):
    try:
        return farm_service.crear_granja(
            request.nombre,
            request.gallinas,
            request.produccion_promedio,
            request.alimento_costo,
            request.mantenimiento_costo,
            request.otros_costos,
            request.precio_token,
            request.tokens_emitidos,
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))


@app.post("/api/farmer/reinvest")
def reinvertir(request: ReinvertirRequest):
    try:
        return farm_service.reinvertir(request.granja_id, request.monto)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))
