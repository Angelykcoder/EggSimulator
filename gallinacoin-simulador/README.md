# Biteggcoin — simulador de inversión

Simulador local con saldo virtual para comprar y vender tokens asociados a granjas. El precio se estima con los datos de `backend/data/market_study.json`; no representa cotizaciones reales.

## Iniciar

Desde esta carpeta, instala dependencias y arranca la API:

```powershell
python -m pip install -r requirements.txt
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Con el servidor activo, abre `frontend/index.html` en el navegador. La gráfica usa Chart.js desde CDN y requiere conexión a internet para cargar esa biblioteca.

## Usar

- En **Inversionista**, el saldo virtual inicial es Q 5,000.
- Elige una granja y pulsa **Comprar**. El total estimado se calcula según el precio actual y se valida contra el saldo y los tokens disponibles.
- En el portafolio, pulsa **Vender** para liquidar tokens. El aviso indica cuánto recibiste y la ganancia o pérdida realizada frente al costo promedio.
- La gráfica registra el valor de los tokens que conservas después de compras, ventas y avances mensuales. Usa **Avanzar mes** para aplicar la siguiente estimación, hasta diciembre de 2026.
- El estado y el historial se guardan en `backend/data/app_state.json`.

Las compras y ventas son simuladas y no transfieren dinero real.
