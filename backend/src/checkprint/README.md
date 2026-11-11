# Checkprint conversion map

The PHP module is consolidated into the Nest `CheckprintModule` and Next.js print view. `checkprint-format.ts` holds shared record builders used by the AUB and Metrobank variants rather than duplicating the saved PHP copies.

| PHP source family | Nest/Next implementation |
| --- | --- |
| `cv_print*.php` | `GET /checkprint/voucher.pdf?branch=&cv_id=` opens an inline PDF in the browser; `GET /checkprint/voucher` returns CV data, and `/purchasing/view/check-voucher` redirects to the PDF. Resolves by CV number or the legacy single-record `cv_id`. |
| `check_list*.php` | `GET /checkprint/list` preserves date/due-date, CV search, supplier and status 0–5 predicates from `check_list_2.php`. |
| `check_accounts.php`, `includes/check_accounts_db.inc`, `includes/check_ui.inc` | `GET /checkprint/accounts`, `GET /checkprint/accounts/unassigned`, `POST /checkprint/accounts`, `POST /checkprint/accounts/delete`, `POST /checkprint/check-reference`; the service enforces PHP booklet/writer validation and prevents deleting accounts with issued checks. |
| `check_issue*.php`, `srs_check_issue.php` | `POST /checkprint/issue` persists the PHP `check_trans` relationship with a duplicate-reference check. Full payment-batch posting remains in FrontAccounting, see below. |
| `aub_check_export.php`, `mb_check_export.php`, CSV `create_check_info` / `create_check_voucher_info` | `GET /checkprint/export` and `checkprint-format.ts` preserve the fixed-width record structures. `format=aub` or `format=metrobank`; request IDs are bank transaction IDs. |
| `check_print*.php`, `real_check_print*.php`, `includes/check_pdf.inc` | `GET /checkprint/voucher.pdf` generates the legacy 612 × 411 point voucher PDF with its local background and paginated detail rows; opening it sets `cv_printed`. Bank export sets `check_printed`. |
| `checktables.sql` | `migrations/20261030_checkprint.sql` adds the missing account columns and the two issue-batch tables used by active PHP workflows. |

## Remaining runtime integrations

* Full supplier payment posting (supplier payments, GL and bank transactions, allocations, cheque details, batch rows, currency exchange, and account preferences) is not implemented in NestJS. The `POST /checkprint/issue` route only assigns a check number.
* CV PDFs append supplier debit memo detail pages using the returned merchandise replica (`returned_merchandise.0_rms_header` and `0_rms_items`) joined by the RS number in the supplier reference. The four voucher backgrounds and purchase-order signatures are served locally from `frontend/public/`.
* The vendor `Numbers_Words` includes many locales, but current check printing explicitly instantiates it with default `en_US`; the converted helper covers that active English amount-in-words behavior. The saved locale implementations are not individually ported.
* Mailer include variants use FrontAccounting email, company preferences, and PHP session helpers. The current app has no equivalent email transport configured, so no email side effect is performed by these read/print routes.
