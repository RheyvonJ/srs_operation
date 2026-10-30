# Checkprint conversion map

The PHP module is consolidated into the Nest `CheckprintModule` and Next.js print view. `checkprint-format.ts` holds shared record builders used by the AUB and Metrobank variants rather than duplicating the saved PHP copies.

| PHP source family | Nest/Next implementation |
| --- | --- |
| `cv_print*.php` | `GET /checkprint/voucher?branch=&cv_no=` and `/purchasing/view/check-voucher`; resolves `cv_no` in branch `0_cv_header`, reads CV details, APV/SI references, comments, EWT, GL postings, audit entries, checks and void status. |
| `check_list*.php` | `GET /checkprint/list` preserves date/due-date, CV search, supplier and status 0–5 predicates from `check_list_2.php`. |
| `check_accounts.php`, `includes/check_accounts_db.inc`, `includes/check_ui.inc` | `GET /checkprint/accounts`, `GET /checkprint/accounts/unassigned`, `POST /checkprint/accounts`, `POST /checkprint/accounts/delete`, `POST /checkprint/check-reference`; the service enforces PHP booklet/writer validation and prevents deleting accounts with issued checks. |
| `check_issue*.php`, `srs_check_issue.php` | `POST /checkprint/issue` persists the PHP `check_trans` relationship with a duplicate-reference check. Full payment-batch posting remains in FrontAccounting, see below. |
| `aub_check_export.php`, `mb_check_export.php`, CSV `create_check_info` / `create_check_voucher_info` | `GET /checkprint/export` and `checkprint-format.ts` preserve the fixed-width record structures. `format=aub` or `format=metrobank`; request IDs are bank transaction IDs. |
| `check_print*.php`, `real_check_print*.php`, `includes/check_pdf.inc` | Browser print layout at `/purchasing/view/check-voucher` represents the voucher/check details in a letter-sized printable page. `POST /checkprint/voucher/printed` sets `cv_printed`; bank export sets `check_printed`. |
| `checktables.sql` | `migrations/20261030_checkprint.sql` adds the missing account columns and the two issue-batch tables used by active PHP workflows. |

## Remaining runtime integrations

* `check_issue_multiple.php` creates supplier payments, GL and bank transactions, allocations, cheque details, and batch rows using FrontAccounting posting functions. It must be ported as one transactional accounting workflow, with currency exchange, supplier allocation, and account preferences moved into Nest before it can safely replace PHP. The `POST /checkprint/issue` route covers the narrower `issue_check_number` helper and does not claim to perform those ledger postings.
* `consignment_print*.php` and debit memo sections in `cv_print.php` query SQL Server (`Movements`, `MovementLine`, `vendor`) through PHP `ms_db_query`. This system currently has only a MySQL Knex connection and no SQL Server configuration/driver; those reports need the original SQL Server connection details and an enabled Nest SQL Server adapter.
* `FrontReport` PDF templates depend on FrontAccounting report fonts and `reporting/images/cv_blank*.png`, which are not present in this repo. The Next print page provides the document fields and browser printing; exact preprinted artwork positioning and server-generated PDF bytes require those assets and a PDF engine.
* The vendor `Numbers_Words` includes many locales, but current check printing explicitly instantiates it with default `en_US`; the converted helper covers that active English amount-in-words behavior. The saved locale implementations are not individually ported.
* Mailer include variants use FrontAccounting email, company preferences, and PHP session helpers. The current app has no equivalent email transport configured, so no email side effect is performed by these read/print routes.
