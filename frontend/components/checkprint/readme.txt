/****************************************************************************
Author: Tu Nguyen, Ontario, Canada
Name: Cheque Printing Module
Free software under GNU GPL
*****************************************************************************/

Unpack the zip file. Create a folder, checkprint, in the modules folder on
FA and copy the files to this folder.

It should be installed to two different tabs

Use the Install/Activate Extensions in the setup tab to safely install the module.

Recommended settings during install 1 (Setup Module):
-----------------------------------------------------

Name: Chequing Accounts

Folder: checkprint   (should follow unix folder convention)

Menu Tab: Setup

Menu Link Text: Checque Accounts

Module file: Browse for the file: check_accounts.php on your local harddisk and select it.

Access Levels Extensions: acc_levels.php  (from unzipped extension file)

SQL file: Browse for the file: checktables.sql on your local harddisk and select it (tables needed for the cheque module)

Click "Add new" (or "Update" if upgrading from a previous version)

Recommended settings during install 2:
-------------------------------------

Name: Cheque Issue / Print

Folder: checkprint   (should follow unix folder convention)

Menu Tab: Purchase

Menu Text Link: Cheque Issue / Print

Module file: Browse for the file: check_list.php on your local harddisk and select it.

Access Levels Extensions: acc_levels.php  (from unzipped extension file)

No sql file

Click "Add new" (or "Update" if upgrading from a previous version)


--- Before you use the Cheque Printing Module ---

Now copy the rest of the files from your unzipped folder into the server folder /modules/checkprint

You should go into Setup tab, Access Setup and mark your two new pages. Select the correct access role(s)
Logout and Login again to make your access roles active.

Your new Cheque Accounts menu is in the Setup tab of FA, lower right.
Press this link. If the table is empty, then there are no cheque accounts setup in the Bank Accounts.
Go to the Banking and Journal Entries tab and select Bank Accounts. Select one of your bank accounts as a cheque account 
and save. Now go back to the Cheque Accounts and the cheque account should be there. You can have multiple chequing accounts.

Now enter you first sequential cheque number for your cheque accounts.

Now you are ready to use the Cheque Printing module.

Go to the Purchase tab and your new Cheque Issue/ Print menu is on the lower right.
Press this link and your payments are shown. If not, expand your selected period.

To list all supplier payments based transactions, only real payments made can be issued a cheque. 
In our case, supplier invoices are needed to create cheques cause we want to display the supplier invoice 
references and allocation amount to the cheque stubs. For instance a payment of $4000 to the supplier was made 
to pay on two invoices, so those invoices allocations would show on the stubs of the cheque.

After the cheques have been issued, they show up with a Print link instead. Pressing this link creates a PDF file
ready for printing. Remember to put pre-printed cheque pages into the printer before.

The Print link can be used more than once, should you want to re-print.

The Cheque Printing Module was created for as part of the CPA standard (Canada), but should be easily customized to 
your own standard in your country. The printing file, check_print.php contains the routines for printing the cheque page.

Please report bugs to either Mantis or the Forum at FA, http://frontaccounting.net
