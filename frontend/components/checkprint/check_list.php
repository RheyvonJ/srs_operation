<?php

$page_security='SA_CHECKPRINT';
$path_to_root="../..";
include($path_to_root . "/includes/session.inc");
add_access_extensions();

include($path_to_root . "/purchasing/includes/purchasing_ui.inc");
include($path_to_root . "/modules/checkprint/includes/check_accounts_db.inc");
//include_once($path_to_root . "/reporting/includes/reporting.inc");
include($path_to_root . "/modules/checkprint/includes/check_pdf.inc");

$js = "";
if ($use_popup_windows)
	$js .= get_js_open_window(900, 500);
if ($use_date_picker)
	$js .= get_js_date_picker();
page(_("Process Payment"), false, false, "", $js);


if (isset($_GET['FromDate'])){
	$_POST['TransAfterDate'] = $_GET['FromDate'];
}
if (isset($_GET['ToDate'])){
	$_POST['TransToDate'] = $_GET['ToDate'];
}

//------------------------------------------------------------------------------------------------

start_form(false, true);

start_table("class='tablestyle_noborder'");
start_row();

date_cells(_("From:"), 'TransAfterDate', '', null, -30);
date_cells(_("To:"), 'TransToDate');

submit_cells('Refresh Inquiry', _("Search"),'',_('Refresh Inquiry'), true);

end_row();
end_table();

end_form();


//------------------------------------------------------------------------------------------------

function get_transactions()
{
    $date_after = date2sql($_POST['TransAfterDate']);
    $date_to = date2sql($_POST['TransToDate']);

    // Sherifoz 22.06.03 Also get the description
    $sql = "SELECT ".TB_PREF."supp_trans.type, ".TB_PREF."supp_trans.trans_no,
    	".TB_PREF."supp_trans.tran_date, ".TB_PREF."supp_trans.reference, ".TB_PREF."supp_trans.supp_reference,
    	(".TB_PREF."supp_trans.ov_amount + ".TB_PREF."supp_trans.ov_gst  + ".TB_PREF."supp_trans.ov_discount) AS TotalAmount, ".TB_PREF."supp_trans.alloc AS Allocated,
		((".TB_PREF."supp_trans.type = 20 OR ".TB_PREF."supp_trans.type = 21) AND ".TB_PREF."supp_trans.due_date < '" . date2sql(Today()) . "') AS OverDue,
    	(ABS(".TB_PREF."supp_trans.ov_amount + ".TB_PREF."supp_trans.ov_gst  + ".TB_PREF."supp_trans.ov_discount - ".TB_PREF."supp_trans.alloc) <= 0.005) AS Settled,
		".TB_PREF."suppliers.curr_code, ".TB_PREF."suppliers.supp_name, ".TB_PREF."supp_trans.due_date
    	FROM ".TB_PREF."supp_trans, ".TB_PREF."suppliers
    	WHERE ".TB_PREF."suppliers.supplier_id = ".TB_PREF."supp_trans.supplier_id
     	AND ".TB_PREF."supp_trans.tran_date >= '$date_after'
    	AND ".TB_PREF."supp_trans.tran_date <= '$date_to'";
		// $sql .= " AND ".TB_PREF."supp_trans.type = 22";
    $sql .= " ORDER BY ".TB_PREF."supp_trans.tran_date";
display_error($sql);
    return db_query($sql,"No supplier transactions were returned");
}

//------------------------------------------------------------------------------------------------

//------------------------------------------------------------------------------------------------

$result = get_transactions();

if(get_post('Refresh Inquiry'))
{
	$Ajax->activate('trans_tbl');
	$Ajax->activate('totals_tbl');
}

//------------------------------------------------------------------------------------------------

/*show a table of the transactions returned by the sql */

div_start('trans_tbl');
print_hidden_cheque_script();
if (db_num_rows($result) == 0)
{
	display_note(_("There are no transactions to display for the given dates."), 1, 1);
} else
{


start_table("$table_style width=80%");
$th = array((""), _("Cheque # Issued"), _("Type"), _("#"), _("Reference"), _("Supplier"),
		_("Date Paid"), _("Currency"),
		_("Debit"), _("Credit"), "");

 table_header($th);

 $j = 1;
 $k = 0; //row colour counter

 while ($myrow = db_fetch($result))
 {

	$date = sql2date($myrow["tran_date"]);

	// Check if a check is issued for this trans no
	if (is_issued_check($myrow["type"],$myrow["trans_no"])) {
		list($check_reference, $check_act) = show_check_ref($myrow["type"],$myrow["trans_no"]);
		$check_print = "$path_to_root/modules/checkprint/check_print.php?" . SID . "type_id=" . $myrow["type"] . "&amp;trans_no=" . $myrow["trans_no"];
		label_cell(print_document_cheque_link($check_reference, _("Print"), true, $check_act));
		label_cell($check_reference);
 	} else {
		$check_issue = "$path_to_root/modules/checkprint/check_issue.php?" . SID . "type_id=" . $myrow["type"] . "&amp;trans_no=" . $myrow["trans_no"];
		label_cell("");
		label_cell("<a href=$check_issue>" . _("Issue Cheque No") . "</a>");
	}

	label_cell($systypes_array[$myrow["type"]]);
	label_cell(get_trans_view_str($myrow["type"],$myrow["trans_no"]));
	label_cell(get_trans_view_str($myrow["type"],$myrow["trans_no"], $myrow["reference"]));
	label_cell($myrow["supp_name"]);
	label_cell($date);
    label_cell($myrow["curr_code"]);
    if ($myrow["TotalAmount"] >= 0)
    	label_cell("");
	amount_cell(abs($myrow["TotalAmount"]));
	if ($myrow["TotalAmount"] < 0)
		label_cell("");

	label_cell(get_gl_view_str($myrow["type"], $myrow["trans_no"]));

	end_row();

	$j++;
	If ($j == 12)
	{
		$j=1;
		table_header($th);
	}
 //end of page full new headings if
 }
 //end of while loop

 end_table(1);

}
div_end();
end_page();
?>
