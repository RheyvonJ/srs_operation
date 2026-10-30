# GL and Purchasing transaction views

The converted views use branch scoped FrontAccounting tables through `FinancialViewsService`. The Next.js records use `/gl/view/converted/<view>` or `/purchasing/view/converted/<view>` and pass the page query string to `GET /transaction-views/<endpoint>`.

| Legacy page | API endpoint | Frontend view |
| --- | --- | --- |
| `gl_trans_view.php` | `gl` | `gl-trans` |
| `gl_payment_view.php`, `gl_deposit_view.php`, `bank_transfer_view.php` | `bank` | `gl-payment`, `gl-deposit`, `bank-transfer` |
| `view_check_batch.php` | `check-batch` | `check-batch` |
| `view_csv.php` | `csv` | `csv` |
| `view_po.php`, `discrepancy_po.php` | `purchase-order`, `discrepancy-po` | same names |
| `view_grn.php` | `grn` | `grn` |
| `view_supp_credit.php` | `supplier-credit` | `supplier-credit` |
| `view_rs.php`, `view_rs_slip.php`, `view_movement.php` | `rs`, `rs-slip`, `movement` | same names |

`purchasing/view/srs_view_po.php` remains in PHP because it reads `PurchaseOrder`, `PurchaseOrderLine`, `vendor`, and `Terms` from the separate SQL Server configured in the legacy PHP runtime. This app has no SQL Server driver or connection configuration. Its similarly named MySQL purchase-order sources are a different data source and cannot safely replace those queries. Port that page after the SQL Server connection is added.
