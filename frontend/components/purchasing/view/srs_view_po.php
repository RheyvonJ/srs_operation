<?php
/**********************************************************************
    Copyright (C) FrontAccounting, LLC.
	Released under the terms of the GNU General Public License, GPL, 
	as published by the Free Software Foundation, either version 3 
	of the License, or (at your option) any later version.
    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  
    See the License here <http://www.gnu.org/licenses/gpl-3.0.html>.
***********************************************************************/
$page_security = 'SA_SUPPTRANSVIEW';
$path_to_root = "../..";
include($path_to_root . "/purchasing/includes/po_class.inc");

include($path_to_root . "/includes/session.inc");
include($path_to_root . "/purchasing/includes/purchasing_ui.inc");
include_once($path_to_root . "/reporting/includes/reporting.inc");

$js = "";
if ($use_popup_windows)
	$js .= get_js_open_window(900, 500);
	
page(_($help_context = "View SRS Purchase Order"), true, false, "", $js);


if($_GET['branch']!=''){
$connect_to = $_GET['branch'];
set_global_connection_branch($connect_to);
}


if (!isset($_GET['trans_no']))
{
	die ("<br>" . _("This page must be called with a purchase order number to review."));
}
$trans_no = $_GET['trans_no'];

$sql = "SELECT reference FROM ".TB_PREF."purch_orders
		WHERE order_no = $trans_no";
$res = db_query($sql);
$row = db_fetch($res);

$ref = $row[0];

$sql = "SELECT  PurchaseOrder.*, Terms.Description AS TermDesc
				FROM PurchaseOrder INNER JOIN
				vendor ON PurchaseOrder.VendorCode = vendor.vendorcode INNER JOIN
				Terms ON vendor.termid = Terms.TermID
			 WHERE PurchaseOrderNo=$ref";
$res = ms_db_query($sql);
$row = mssql_fetch_array($res);

$trans_no = $row['PurchaseOrderID'];

display_heading(_("Purchase Order # ".$row['PurchaseOrderNo']));
br();

global $table_style;

start_table("$table_style width=90%");

    start_row();
    label_cells(_("PO No."), $row['PurchaseOrderNo'], "class='tableheader2'");
    label_cells(_("Supplier"), $row['Description'], "class='tableheader2'");
	label_cells(_("Payment Terms"), $row['TermDesc'], "class='tableheader2'");
	end_row();

	start_row();
    label_cells(_("Date Created"), mssql2date($row['DateCreated']), "class='tableheader2'");
   	label_cells(_("Deliver Into Location"), $row['DeliveryDescription'],"class='tableheader2'");
    label_cells(_("Status"),'<b>'. $row['StatusDescription']. '</b>', "class='tableheader2'");
    end_row();

	label_row(_("Delivery Address"), $row['DeliveryAddress'], "class='tableheader2'", "colspan=9");

    // if ($po->Comments != "")
    	// label_row(_("Order Comments"), $po->Comments, "class='tableheader2'",
    		// "colspan=9");
end_table(1);

start_table("$table_style width=90%", 6);
echo "<tr><td valign=top>"; // outer table

//--------------------------------------------------------------------------------------------------------------------
display_heading2(_("<b>Details</b>"));

$sql = "SELECT * FROM PurchaseOrderLine
			WHERE PurchaseOrderID=$trans_no";
$res = ms_db_query($sql);

start_table("colspan=9 $table_style width=100%");

$th = array(_("Product ID"), _("Item Description"), _("Unit"), _("Unit Price"), _("Quantity"), 'Discounts', _("Net Price"));

table_header($th);

$items_total = $k = 0;
while($item_row = mssql_fetch_array($res))
{
	alt_table_row_color($k);
	
	$items_total += $item_row['extended'];
	$disc = array();
	
	if (trim($item_row['DiscountCode1']) != '')
		$disc[] = $item_row['DiscountCode1'];
	if (trim($item_row['DiscountCode2']) != '')
		$disc[] = $item_row['DiscountCode2'];
	if (trim($item_row['DiscountCode3']) != '')
		$disc[] = $item_row['DiscountCode3'];
	
	$disc = implode(' ,', $disc);
	
	label_cell($item_row['ProductID']);
	label_cell($item_row['Description']);
	label_cell($item_row['UOM']);
	amount_cell($item_row['unitcost']);
	label_cell($item_row['qty']);
	label_cell($disc);
	amount_cell($item_row['extended']);
	// amount_cell($item_row['extended']);
	end_row();
}
label_row(_("<b>TOTAL :</b>"), '<b>' . number_format2($items_total,2). '</b>', "colspan=6 align=right", "nowrap align=right");

end_table();

end_table();
//--------------------------------------------------------------------------------------------------------------------

echo "<br><center><a href='#' onclick='javascript:window.close()'>Close</a></center>";

?>
