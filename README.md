# Biteggcoin — simulador

Simulador educativo de inversión en tokens asociados a granjas avícolas. Todas las compras, ventas y valoraciones usan saldo virtual; no hay conexión con una bolsa, una billetera ni precios reales.

## Estructura

- `gallinacoin-simulador/frontend/`: aplicación web estática.
- `gallinacoin-simulador/frontend/js/market_data.js`: escenario de mercado usado por la aplicación.
- `gallinacoin-simulador/backend/`: implementación FastAPI conservada en el proyecto; la interfaz actual funciona en el navegador sin usarla.
- `netlify.toml`: publica el frontend desde la raíz del repositorio en Netlify.
- `gallinacoin-simulador/README_REGLAS_NEGOCIO.md`: fórmulas, supuestos y límites del simulador.

## Ejecutar localmente

No hace falta instalar dependencias para usar la interfaz. Abre `gallinacoin-simulador/frontend/index.html` en un navegador. Chart.js se carga desde un CDN, así que la gráfica requiere conexión a internet.

El estado se guarda en el almacenamiento local del navegador (`localStorage`), separado por navegador y dispositivo. Usa **Reiniciar simulación** para volver al estado inicial y borrar el progreso guardado para esta aplicación.

## Funciones

- Saldo virtual inicial: Q 5,000 para el inversionista y Q 10,000 para el granjero.
- Compra y venta de tokens, con costo promedio y registro de operaciones.
- Creación de granjas y reinversión del saldo del granjero.
- Avance mensual de septiembre a diciembre de 2026 según el escenario incluido.
- Gráficas de precios estimados, producción y evolución del portafolio.

## Publicación

La configuración de Netlify está en `netlify.toml`: usa `gallinacoin-simulador/frontend` como directorio publicado. El sitio publicado es estático y no requiere desplegar la API FastAPI.

## Alcance

Los datos y resultados son ilustrativos; no son cotizaciones, asesoría ni rendimientos esperados. Consulta [las reglas de negocio y los supuestos](gallinacoin-simulador/README_REGLAS_NEGOCIO.md) antes de interpretar los cálculos.
