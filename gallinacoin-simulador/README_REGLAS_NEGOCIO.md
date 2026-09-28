# Reglas de negocio y estimación

Este documento describe las reglas que implementa el código actual del simulador de Biteggcoin. Los montos se expresan en quetzales (Q / GTQ). Es una simulación local con saldo virtual: no existe una conexión a una bolsa, una billetera ni un mercado en tiempo real.

## De dónde salen los datos

El escenario está configurado en `backend/data/market_study.json`. Incluye cuatro meses de 2026 y estos valores:

| Mes | Precio base del huevo (Pe) | Variación de demanda | Índice de costo de alimento | Margen indicado en el archivo |
|---|---:|---:|---:|---:|
| Septiembre | Q1.20 | 0% | 1.00 | 15% |
| Octubre | Q1.20 | 0% | 1.00 | 15% |
| Noviembre | Q1.32 | 10% | 1.05 | 18% |
| Diciembre | Q1.68 | 40% | 1.10 | 28% |

El JSON describe producción estable, demanda normal o estacional y cambios asociados al periodo. No incluye una fuente estadística, enlaces, fecha de recopilación ni explicación de cómo se estimaron esos valores. Por eso deben entenderse como parámetros de un escenario demostrativo, no como datos observados ni un pronóstico comprobado. Aunque la columna de margen operativo aparece en el archivo, el código actual no la usa en sus cálculos.

## Cómo se calcula el precio de equilibrio del huevo

El servicio de mercado aplica estas fórmulas (`backend/services/market_service.py`):

```text
oferta_total = suma(gallinas × produccion_promedio de cada granja)
demanda_esperada = 1,000,000 × (1 + variacion_demanda / 100)
precio_base = precio_huevo_base_Pe × indice_costo_alimento
desbalance = (demanda_esperada - oferta_total) / oferta_total
precio_equilibrio = max(0.01, precio_base × (1 + 0.5 × desbalance))
```

El factor `0.5` es la elasticidad configurada en el código y `1,000,000` es la oferta de referencia. Si la oferta total es cero o negativa, el servicio devuelve el precio base. El precio calculado se redondea a cuatro decimales.

## Cómo se calcula el resultado mensual de una granja

Para cada granja (`backend/services/farm_service.py`):

```text
huevos = gallinas × produccion_promedio
ingresos = huevos × precio_equilibrio_del_huevo
costos = alimento_costo + mantenimiento_costo + otros_costos
resultado = ingresos - costos
retorno = resultado / valor_patrimonial
```

Si el valor patrimonial es cero, el retorno se considera cero. La simulación actual trata `produccion_promedio` como un multiplicador directo por gallina, pero el proyecto no documenta la unidad o periodo de ese dato. Los costos se suman tal como están guardados; tampoco tienen una unidad de periodo declarada.

Al avanzar el mes, el precio de cada token se actualiza así:

```text
nuevo_precio_token = max(precio_anterior × (1 + retorno), 0.01)
```

El precio se redondea a cuatro decimales y el `resultado` se suma al valor patrimonial de la granja. Esta relación directa entre producción, precio del huevo, costos y patrimonio puede generar cambios de precio muy grandes; no hay topes de variación ni una calibración financiera documentada.

### Orden de los meses

El estado inicia en septiembre de 2026. Al avanzar desde un mes, el cálculo usa los parámetros del índice del mes actual y después cambia la etiqueta al siguiente mes. Por tanto, el avance de septiembre a octubre usa los parámetros de septiembre. Como no se permite avanzar después de diciembre, el avance final usa noviembre; los parámetros de diciembre están en el archivo, pero no llegan a aplicarse con el flujo actual.

## Reglas de compra y venta

- El saldo virtual inicial del inversionista es Q5,000. El saldo inicial del granjero es Q10,000.
- Cada granja tiene un precio y una cantidad de tokens disponibles. En el estado inicial, la primera granja tiene 1,000 tokens a Q10 y la segunda 1,200 a Q15.
- Una compra requiere cantidad positiva, tokens disponibles y saldo suficiente. El costo es `cantidad × precio_token`; se descuenta del saldo y se reduce la disponibilidad de la granja.
- El costo promedio de una posición tras una compra se calcula ponderando el costo anterior y la compra nueva:

  ```text
  nuevo_costo_promedio = (tokens_anteriores × costo_promedio_anterior
                         + tokens_comprados × precio_compra)
                         / tokens_totales
  ```

- Una venta requiere que el inversionista posea esa cantidad. Recibe `cantidad × precio_token_actual`; los tokens se devuelven a la disponibilidad de la granja.
- La ganancia o pérdida realizada al vender se calcula con el costo promedio vigente:

  ```text
  resultado_realizado = cantidad_vendida × (precio_venta - costo_promedio)
  ```

- No se aplican comisiones, impuestos, deslizamiento de precio ni límites de liquidez adicionales. La operación se ejecuta al precio simulado actual.

## Valor del portafolio e historial gráfico

Para las posiciones que conserva el inversionista:

```text
valor_actual = suma(tokens_en_posición × precio_token_actual)
costo_base = suma(tokens_en_posición × costo_promedio)
ganancia_o_perdida_estimada = valor_actual - costo_base
```

La gráfica guarda puntos después de una compra, una venta y cada avance mensual. Compara el valor actual estimado de los tokens que aún se conservan con su costo base. Una venta reduce ambos valores porque los tokens vendidos ya no forman parte de la posición; su resultado realizado queda en el historial de operaciones. El saldo en efectivo no forma parte de la línea de valor del portafolio.

El estado, las operaciones y las valoraciones se guardan en `backend/data/app_state.json`. El simulador es de un solo inversionista local y no implementa cuentas separadas.

## Supuestos y límites

- Los meses y sus parámetros son un escenario fijo de septiembre a diciembre de 2026; no se descargan precios ni estadísticas externas.
- El cálculo no modela oferta y demanda de tokens en un libro de órdenes: usa la fórmula de mercado y el resultado de cada granja.
- La unidad de producción y el periodo de los costos no están definidos en los datos. Antes de usar el simulador para análisis económico, habría que especificarlos y calibrar sus valores.
- El porcentaje de margen operativo incluido en el estudio no interviene en el precio del token ni en el resultado mensual actual.
- Las cifras y rendimientos son ilustrativos y no deben interpretarse como rendimientos esperados de una inversión real.
