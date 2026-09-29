# Reglas de negocio y estimación

Este documento resume las reglas del simulador de Biteggcoin. Los montos se expresan en quetzales (Q / GTQ). Es una simulación local con saldo virtual; no se conecta a una bolsa, una billetera ni a un mercado en tiempo real.

## Escenario de mercado

La interfaz web lee el escenario de `frontend/js/market_data.js`. El backend FastAPI conservado en el repositorio tiene una copia en `backend/data/market_study.json`, pero la interfaz actual no se comunica con ese backend.

| Mes | Precio base del huevo (Pe) | Variación de demanda | Índice de costo de alimento | Margen indicado |
|---|---:|---:|---:|---:|
| Septiembre | Q1.20 | 0% | 1.00 | 15% |
| Octubre | Q1.20 | 0% | 1.00 | 15% |
| Noviembre | Q1.32 | 10% | 1.05 | 18% |
| Diciembre | Q1.68 | 40% | 1.10 | 28% |

Estos valores forman un escenario demostrativo. No incluyen fuentes estadísticas, fecha de recopilación ni un método documentado de estimación. El margen operativo está en los datos, pero no participa en los cálculos descritos aquí.

## Precio de equilibrio del huevo

El frontend (`frontend/js/api.js`) y el backend (`backend/services/market_service.py`) implementan estas fórmulas:

```text
oferta_total = suma(gallinas × produccion_promedio de cada granja)
demanda_esperada = 1,000,000 × (1 + variacion_demanda / 100)
precio_base = precio_huevo_base_Pe × indice_costo_alimento
desbalance = (demanda_esperada - oferta_total) / oferta_total
precio_equilibrio = max(0.01, precio_base × (1 + 0.5 × desbalance))
```

La elasticidad es `0.5` y la oferta de referencia es `1,000,000`. Si la oferta total es cero o negativa, se usa el precio base. El precio se redondea a cuatro decimales.

## Resultado mensual de una granja

El frontend (`frontend/js/api.js`) y el backend (`backend/services/farm_service.py`) calculan:

```text
huevos = gallinas × produccion_promedio
ingresos = huevos × precio_equilibrio_del_huevo
costos = alimento_costo + mantenimiento_costo + otros_costos
resultado = ingresos - costos
retorno = resultado / valor_patrimonial
```

Si el valor patrimonial es cero, el retorno es cero. La unidad de `produccion_promedio` y el periodo de los costos no están definidos en los datos. Por ello, los resultados no tienen calibración económica documentada y pueden producir variaciones grandes.

Al avanzar un mes, el token se actualiza con `max(precio_anterior × (1 + retorno), 0.01)`, redondeado a cuatro decimales. El resultado mensual se suma al valor patrimonial.

### Orden de avance

El estado inicia en septiembre de 2026. El avance calcula usando los parámetros del mes actual y luego cambia la etiqueta al siguiente mes. El último avance permitido va de noviembre a diciembre y usa los parámetros de noviembre. El escenario de diciembre existe, pero no se aplica porque la simulación termina allí.

## Compras y ventas

- El saldo virtual inicial es Q5,000 para el inversionista y Q10,000 para el granjero.
- Cada compra requiere una cantidad positiva, tokens disponibles y saldo suficiente. El saldo disminuye y la disponibilidad de la granja baja.
- El costo promedio de la posición se pondera con las compras previas y la nueva compra:

  ```text
  nuevo_costo_promedio = (tokens_anteriores × costo_promedio_anterior
                         + tokens_comprados × precio_compra)
                         / tokens_totales
  ```

- Una venta requiere que el inversionista tenga suficientes tokens. Recibe `cantidad × precio_token_actual`; los tokens vuelven a estar disponibles.
- La ganancia o pérdida realizada se calcula con el costo promedio vigente: `cantidad_vendida × (precio_venta - costo_promedio)`.
- No hay comisiones, impuestos, deslizamiento ni límites adicionales de liquidez.

## Portafolio e historial

Para las posiciones abiertas:

```text
valor_actual = suma(tokens × precio_token_actual)
costo_base = suma(tokens × costo_promedio)
ganancia_o_perdida_estimada = valor_actual - costo_base
```

La gráfica registra valoraciones después de cada compra, venta y avance mensual. Solo considera los tokens que siguen en cartera; el efectivo no forma parte de esa línea. La ganancia realizada de las ventas queda en el historial de operaciones.

La interfaz actual guarda el estado, las operaciones y las valoraciones en `localStorage`, de forma separada en cada navegador. El backend FastAPI guarda su estado aparte en `backend/data/app_state.json` cuando se ejecuta de forma independiente. Ambos estados no se sincronizan. El simulador no implementa cuentas separadas.

## Supuestos y límites

- El escenario es fijo de septiembre a diciembre de 2026; no se descargan cotizaciones ni estadísticas externas.
- No existe un libro de órdenes de tokens: el precio se deriva de la fórmula de mercado y el resultado de cada granja.
- La unidad de producción y el periodo de los costos no están definidos; se deben especificar y calibrar antes de usar el modelo para análisis económico.
- El margen operativo del escenario no interviene en el precio del token ni en el resultado mensual.
- Las cifras son ilustrativas y no representan rendimientos esperados de una inversión real.
