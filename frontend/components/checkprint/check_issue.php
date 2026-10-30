<?php

$path_to_root="../..";

$page_security='SA_CHECKPRINT';

include($path_to_root . "/includes/session.inc");
add_access_extensions();

include($path_to_root . "/purchasing/includes/purchasing_ui.inc");
include($path_to_root . "/modules/checkprint/includes/check_accounts_db.inc");
include_once($path_to_root . "/includes/data_checks.inc");


$js = "";
if ($use_popup_windows)
	$js .= get_js_open_window(900, 500);
if ($use_date_picker)
	$js .= get_js_date_picker();
page(_("Cheque Number Issue"), false, false, "", $js);


//----------------------------------------------------------------------------------------

check_db_has_suppliers(_("There are no suppliers defined in the system."));

check_db_has_bank_accounts(_("There are no bank accounts defined in the system."));

//check_db_has_bank_trans_types(_("There are no bank payment types defined in the system."));

//---------------------------------------------------------------------------------------------------------------

if (isset($_GET['IssuedID']))
{
	$check_no = $_GET['IssuedID'];

    echo "<center>";
    display_notification_centered(_("Cheque Number has been assigned."));

	//display_note(print_document_link($invoice_no, _("Print This Cheque"), true, 10));

    hyperlink_params("$path_to_root/modules/checkprint/check_list.php", _("Issue Another Cheque"), "");


	display_footer_exit();
}


// ----------------------------------------------------------------------------------------------------------------------------------------------------------

function check_reference_ok($trans_no, $reference) {

	global $Refs;
	// Check Posts of Cheque No is not already taken.
	if (!$Refs->is_valid($reference))
    {
		display_error(_("You must enter a cheque number."));
		set_focus('next_reference');
		return false;
	}

	if (!is_new_cheque($trans_no, $reference))
	{
		display_error(_("The entered cheque number is already in use."));
		set_focus('next_reference');
		return false;
	}

	return true;

}

function save_last_cheque($bank_ref, $check_ref)
{
	global $Refs;
	$next = $Refs->increment($check_ref);
	save_next_check_reference($bank_ref, $next);
}

if (isset($_POST['POST_CHECK'])) {

	if (!check_reference_ok($_POST['trans_no'],$_POST['next_reference']))
		return;

	// Also has DB constraints to not allow duplicates Cheque Refs
	$issue_id = issue_check_number($_POST['trans_no'], $_POST['next_reference']);
	meta_forward($_SERVER['PHP_SELF'], "IssuedID=$issue_id");
}



//--------------------------------------------------------------------------------------------------



if (isset($_GET['type_id']) && isset($_GET['trans_no']))
{


	// Check if already issued

	//----------------------------

	if (is_issued_check($_GET['type_id'], $_GET['trans_no'])) {

		display_error(_("This payment has already been issued a cheque number"), true);
   	 	end_page();
    	exit;

	}

	$paymentline = get_paymentline($_GET['trans_no']);

	start_table($table_style);

	$th = array(("Type"), _("#"), _("Reference"), _("Supplier"),
		_("Supplier's Reference"), _("Date"), _("Currency"),
		_("Debit"), _("Credit"), "");

	table_header($th);

	$k = 0;
	alt_table_row_color($k);

	$date = sql2date($paymentline["tran_date"]);

	label_cell($systypes_array[$paymentline["type"]]);
	label_cell(get_trans_view_str($paymentline["type"],$paymentline["trans_no"]));
	label_cell(get_trans_view_str($paymentline["type"],$paymentline["trans_no"], $paymentline["reference"]));
	label_cell($paymentline["supp_name"]);
	label_cell($paymentline["supp_reference"]);
	label_cell($date);
    label_cell($paymentline["curr_code"]);
    if ($paymentline["TotalAmount"] >= 0)
    	label_cell("");
	amount_cell(abs($paymentline["TotalAmount"]));
	if ($paymentline["TotalAmount"] < 0)
		label_cell("");

	label_cell(get_gl_view_str($paymentline["type"], $paymentline["trans_no"]));
	end_row();

	end_table();

	echo '<br/>';

	start_form();

	start_table($table_style2);

	// Get the Next Cheque Reference.
	$check_ref = get_next_check_reference($paymentline["trans_no"]);

	$_POST['next_reference']  = $check_ref;
	set_focus('next_reference');
	hidden('trans_no', $paymentline["trans_no"]);
	hidden('type', $paymentline["type"]);
	text_row_ex(_("Cheque # for this Payment:"), 'next_reference', 40, null, null, $check_ref);

	end_table(1);
	submit_center('POST_CHECK', _("Issue Cheque"), true, '', true);

	end_form();
	end_page();

} else {

	display_error(_("No Payment has been Selected"), true);
    end_page();
    exit;
}



?>
