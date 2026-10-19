# Demand forecasting

Phase 6 adds admin-only unit-demand forecasts. It is **implemented and tested** behind gates that default to off. It does not replace recommendations, RAG, the Business Copilot, checkout, or the existing heuristic copilot cards.

Synthetic metrics are **not** live store performance.

## 1. What demand forecasting means

Demand forecasting estimates how many units a product, category, or the whole store may sell over the next 7, 14, or 30 days. The number is an estimate an administrator can review. It is not an order and it does not change stock or prices.

## 2. Sales versus true demand

A day with zero sales can mean nobody wanted the product, or the product was unavailable and demand was never observed. This store does not keep a history of stock levels, so real forecasts are **sales-based demand estimates**. Explicit stockout and missing days in the synthetic dataset are excluded from training targets. Ordinary days with no paid orders inside a product's observed span are stored as `zero_filled` with `inventory_state=unknown`.

## 3. Time-series data

Each series is one row per UTC calendar day. The date is the UTC day of `paidAt`, or `createdAt` when `paidAt` is absent. Rows contain units, not a mix of units and revenue. Revenue is kept on the training row when a line total exists, and forecasts are still in units.

## 4. Seasonality

Seasonality is a repeating calendar pattern. The seasonal-naive model copies the value from seven days earlier, so a product that sells more on weekends can repeat that weekly shape when at least three weeks of history exist.

## 5. Trends

A trend is a sustained rise or fall. The selector compares the latest 14 observed days with the 14 days before that. A change of about 25 percent or more is labeled trending. Week-over-week and the forecast direction use a separate 10 percent threshold so a small wobble stays flat.

## 6. Lag features

A lag is an earlier day's units. `lag_1` is yesterday, `lag_7` is the same weekday last week, and `lag_14` / `lag_28` reach further back. Each lag is a shift of past rows only. The model never sees that day's actual units as an input, and multi-step forecasts feed predicted units forward instead of future actuals.

## 7. Rolling averages

The 7, 14, and 28 day means and the 7 day standard deviation are computed from the days before the row being predicted. They describe recent level and volatility.

## 8. Naive forecasting

The naive model repeats the latest eligible observation for every future day. It is the fallback for a new product with fewer than 14 observed days.

## 9. Statistical forecasting

Seasonal naive uses the weekly pattern. The moving average uses a trailing window of 7 eligible days. Exponential smoothing keeps a level that weighs recent days more than old ones (`alpha = 0.3`). These methods do not require the saved regressor.

## 10. Machine learning regression

`HistGradientBoostingRegressor` predicts the next day's units from calendar, lag, rolling, growth, and age features. Training fits it once on dates before the selection cutoff. Later days are forecast recursively: each predicted day becomes the lag input for the next day. The regressor is used only when its backtest MAE is at least 5 percent lower than the best simple model, or when an admin explicitly selects `ml_regression` and the series has enough history.

## 11. Intermittent demand

Sparse series, where at least half of the eligible days are zero and there are at least two positive days, use Croston's method. Croston estimates the size of a sale and the gap between sales, then converts that to a daily rate. Days marked missing or stockout are skipped rather than inserted as zeros. Confidence stays low.

## 12. Time-series backtesting

Evaluation walks forward. It trains through day T, forecasts the next 7 days, then moves the origin by 7 days. The same origins are used for every model. When the calendar has at least 60 distinct days, the model is fit on the first 60 percent, compared on the next slice, and the final 20 percent is held out. Shorter histories are labeled statistically weak. Rows are never shuffled.

## 13. MAE, RMSE, WAPE, and MASE

MAE is the average absolute unit error. RMSE penalizes large misses more. WAPE divides total absolute error by total absolute actual units, and is omitted when the actual total is zero. MASE divides MAE by the seasonal-naive error scale, and is omitted when that scale is zero. MAPE is not used because many days have zero sales. Bias is the average of predicted minus actual. Coverage is the share of actuals inside the residual band.

## 14. Forecast uncertainty

Residuals from the selection windows form an empirical band at the 20th and 80th percentiles. The dashboard can show that band. It is not a calibrated 95 percent interval and it is not a guaranteed sales range. Fewer than 8 residuals leaves the band unavailable. Bounds are clipped at zero.

## 15. Model selection

`auto` keeps the simpler model unless machine learning improves MAE by at least 5 percent. Short histories use naive or moving average and record the fallback reason. Forced strategies still fall back when the history cannot support them. The chosen model name is stored on each published row.

## 16. Python and Convex

Convex owns orders, settings, and the published snapshot. An admin publish action checks both gates, pages paid orders, and sends product/day unit totals to Python. Python does not receive email, phone, address, or payment identifiers. Python returns forecasts. Convex writes one publication id and replaces the previous published snapshot. HTTP runs in the action, not in queries or mutations. Checkout does not call this path.

## 17. Inventory insights

Days remaining are current stock divided by average forecasted daily units. Stockout risk is high when forecasted units over the horizon exceed stock, medium above 70 percent of stock, and unknown when stock is missing. Slow-moving means recent daily sales under 0.2 and the trend is not up. A reorder quantity is calculated only when the admin types a lead time. Otherwise the note says the quantity is unavailable. Nothing is ordered automatically.

## 18. Admin dashboard

`/admin/forecasting` shows forecasted units, high stockout count, model version, cutoff, a chart of future units, and a product table. Filters cover risk and trend. Historical stock is not plotted as if it were known. A synthetic training label is called out on the page so it is not read as live accuracy.

## 19. Train and evaluate locally

From `services/ai-service`:

```bash
uv run python -m training.generate_forecasting_data
uv run python -m training.validate_forecasting_dataset
uv run python -m training.train_demand_forecast
uv run python -m evaluation.evaluate_demand_forecast
uv run python -m app.ml.inference.forecasting_cli p-stable 14
```

The generated JSON and `artifacts/forecasting/demand-forecast-v1/` stay gitignored. Training does not run at API startup.

## 20. Enable the feature

1. Train `demand-forecast-v1` on the Python host.
2. Set Convex `DEMAND_FORECASTING_ENABLED=true`.
3. Set Convex `DEMAND_FORECAST_EXPORT_ENABLED=true` only when an admin may read aggregate paid sales.
4. In Admin Settings, set `enable_demand_forecasting` to true.
5. Choose horizon `7`, `14`, or `30`, strategy `auto` by default, and whether to show the residual band.
6. Open `/admin/forecasting` and publish.

Shoppers and the mobile app do not see these numbers.

## 21. Limitations

- There is no historical inventory ledger, so censored demand cannot be recovered.
- Refunds remove the whole order. Partial line refunds are not represented.
- Publish reads a bounded number of recent orders (8 pages of 25), not the full history.
- A separate quality walk (`forecastQuality`) can page through older paid orders when `DEMAND_FORECAST_EXPORT_ENABLED` is true. Until that walk completes, its summary is partial and is not a published forecast. It does not fill missing days with zero sales and does not change orders.
- Optional daily stock snapshots start only when `INVENTORY_SNAPSHOTS_ENABLED=true`. They record today's stock. They do not reconstruct past stockouts and they do not change inventory.
- A model trained on the synthetic file can score live series, and its accuracy label remains synthetic until someone trains on an authorized aggregate file.
- The Business Copilot may quote `publishedDemandForecast` only. The older heuristic forecast cards are unchanged.
- Vapi and mobile are unchanged.
- 60-day forecasts are not offered.

## Sales eligibility

| Order | Counted |
| --- | --- |
| Stripe or COD, payment `paid`, status `processing`, `confirmed`, `shipped`, or `delivered` | Yes |
| COD still `pending` | No |
| `failed`, `expired`, `cancelled` | No |
| `refunded` | No |
| Promotion gift line | No, it is not purchased demand |

Eligible lines are deduplicated by line id before they are summed by product and UTC day.
