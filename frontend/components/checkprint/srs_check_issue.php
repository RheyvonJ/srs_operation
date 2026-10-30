<?php

$path_to_root="../..";

$page_security='SA_CHECKPRINT';

include_once($path_to_root . "/includes/ui/srs_check_cart.inc");
include($path_to_root . "/includes/session.inc");
add_access_extensions();

include($path_to_root . "/purchasing/includes/purchasing_ui.inc");
include($path_to_root . "/modules/checkprint/includes/check_accounts_db.inc");
include($path_to_root . "/modules/checkprint/includes/check_ui.inc");
include_once($path_to_root . "/includes/data_checks.inc");
include_once($path_to_root . "/gl/includes/db/gl_db_cv.inc");


$js = "";
if ($use_popup_windows)
	$js .= get_js_open_window(900, 500);
if ($use_date_picker)
	$js .= get_js_date_picker();
page(_("Cheque Issuance"), false, false, "", $js);


//----------------------------------------------------------------------------------------

check_db_has_suppliers(_("There are no suppliers defined in the system."));

check_db_has_bank_accounts(_("There are no bank accounts defined in the system."));

//check_db_has_bank_trans_types(_("There are no bank payment types defined in the system."));
if ($_GET['cv_id'] != '')
	$_POST['cv_id'] = $_GET['cv_id'];

//---------------------------------------------------------------------------------------------------------------

if (isset($_GET['IssuedID']))
{
	$check_no = $_GET['IssuedID'];

    echo "<center>";
    display_notification_centered(_("Cheque Number has been assigned."));

	//display_note(print_document_link($invoice_no, _("Print This Cheque"), true, 10));

	hyperlink_no_params("$path_to_root/modules/checkprint/check_list_2.php", _("Issue Another Cheque"));


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

function increment($reference) 
{
	// New method done by Pete. So f.i. WA036 will increment to WA037 and so on.
	// If $reference contains at least one group of digits,
	// extract first didgits group and add 1, then put all together.
	// NB. preg_match returns 1 if the regex matches completely 
	// also $result[0] holds entire string, 1 the first captured, 2 the 2nd etc.
	//
	
	if (preg_match('/^(\D*?)(\d+)(.*)/', $reference, $result) == 1) 
	{
		list($all, $prefix, $number, $postfix) = $result;
		$dig_count = strlen($number); // How many digits? eg. 0003 = 4
		$fmt = '%0' . $dig_count . 'd'; // Make a format string - leading zeroes
		$nextval =  $number + 1; // Add one on, and put prefix back on
		return $prefix.$nextval.$postfix;
	}
	else 
		return $reference;
}

function save_last_cheque($check_account_id, $check_ref)
{
	global $Refs;
	$next = increment($check_ref);
	save_next_check_reference($check_account_id, $next);
}

function check_data()
{
	if ($_POST['bank_account'] == 0)
    {
	   	display_error(_("Please choose a bank account."));
		set_focus('bank_account');
	   	return false;	   
    }
	
	// if (!is_date($_POST['check_date']))
	// {
		// display_error(_("Invalid Check Date."));
		// set_focus('check_date');
	   	// return false;	   
	// }
	
	if (!is_date($_POST['DatePaid']))
	{
		display_error(_("Invalid Date Created."));
		set_focus('DatePaid');
	   	return false;	   
	}
	
	// if ($_POST['check_no'] == '')
    // {
	   	// display_error(_("Check Number should not be empty."));
		// set_focus('check_no');
	   	// return false;	   
    // }
	
	if (count($_SESSION['s_checks']->checks) == 0)
	{
		display_error('Confirm the Check first');
		return false;	   
	}
	
	if (round2($_SESSION['s_checks']->total_check_amount(),2) != round2($_SESSION['s_checks']->cv_amount,2))
	{
		display_error('Check Total does not match CV Total.');
		return false;	   
	}
	
	return true;
}

function get_gl_trade_and_non_trade_total($cv_id)
{
	$company_pref = get_company_prefs();
	$company_pref["creditors_act"];
	$company_pref["creditors_act_nt"];
	
	$trans_in_cv_res = get_cv_details($cv_id);
	$apv_trade = $apv_non_trade = 0;
	
	while ($cv_trans_row = db_fetch($trans_in_cv_res))
	{
		$apv_trade += get_gl_trans_amount($cv_trans_row['trans_type'], $cv_trans_row['trans_no'], $company_pref["creditors_act"]);
		$apv_non_trade += get_gl_trans_amount($cv_trans_row['trans_type'], $cv_trans_row['trans_no'], $company_pref["creditors_act_nt"]);
	}
	
	// display_error($apv_trade);
	return array(-$apv_trade,-$apv_non_trade);
}

if (isset($_POST['POST_CHECK'])) 
{
	if (!check_data())
		return;

	global $Refs;
	
	$check_account_id = $_POST['bank_account'];
	$bank_row = get_checking_account_bank($check_account_id);
	$supp_currency = get_supplier_currency($_POST['supplier_id']);
	$bank_currency = $bank_row['bank_curr_code'];
	$comp_currency = get_company_currency();
	if ($comp_currency != $bank_currency && $bank_currency != $supp_currency)
		$rate = 0;
	else
		$rate = input_num('_ex_rate');

	new_doc_date($_POST['DatePaid']);
	
	//============================================================================================
	
	$company_pref = get_company_prefs();
	
	$supplier_id = $_POST['supplier_id'];
	$date_ = $_POST['DatePaid'];
	$bank_account = $bank_row['id'];
	$amount = input_num('amount');
	$discount = input_num('discount');
	$ref = $_POST['ref'];
	$memo_ = $_POST['memo_'];
	$charge = input_num('charge');
	$ewt = input_num('ewt');
	
	$amount -= $ewt;
	$amount -= $discount;

	begin_transaction();

   	$supplier_currency = $supp_currency;
    $bank_account_currency = $bank_currency;
	$bank_gl_account = $bank_row['account_code'];

	if ($rate == 0)
	{
		$supp_amount = exchange_from_to($amount, $bank_account_currency, $supplier_currency, $date_);
		$supp_discount = exchange_from_to($discount, $bank_account_currency, $supplier_currency, $date_);
		$supp_charge = exchange_from_to($charge, $bank_account_currency, $supplier_currency, $date_);
	}
	else
	{
		$supp_amount = round($amount / $rate, user_price_dec());
		$supp_discount = round($discount / $rate, user_price_dec());
		$supp_charge = round($charge / $rate, user_price_dec());
	}
	
	// it's a supplier payment
	$trans_type = ST_SUPPAYMENT;

	/* Create a supp_trans entry for the supplier payment */
	$payment_id = add_supp_trans($trans_type, $supplier_id, $date_, $date_,
		 $Refs->get_next(ST_SUPPAYMENT), "", -$supp_amount, 0, -$supp_discount, "", $rate, -$ewt);
	
	$total = 0;
	$supplier_accounts = get_supplier_accounts($supplier_id);
	
	//get accounts payable trade and non trade 
	
	$t_nt_total = get_gl_trade_and_non_trade_total($_POST['cv_id']);
	
	if ($t_nt_total[0] != 0) // trade
		$total += add_gl_trans_supplier($trans_type, $payment_id, $date_, $company_pref["creditors_act"], 0, 0,
				$t_nt_total[0], $supplier_id, "", $rate);
			
	if ($t_nt_total[1] != 0) // non trade
		$total += add_gl_trans_supplier($trans_type, $payment_id, $date_, $company_pref["creditors_act_nt"], 0, 0,
				$t_nt_total[1], $supplier_id, "", $rate);
	//============================

	// if ($supp_charge != 0)
	// {
		// $charge_act = get_company_pref('bank_charge_act');
		// $total += add_gl_trans_supplier($trans_type, $payment_id, $date_, $charge_act, 0, 0,
			// $supp_charge, $supplier_id, "", $rate);
	// }

	// if ($supp_discount != 0)
	// {
		// $total += add_gl_trans_supplier($trans_type, $payment_id, $date_, $company_pref["ayt_discount_act"], 0, 0,
			// -$supp_discount, $supplier_id, "", $rate);
	// }

	if ($ewt != 0)
	{
		$ewt_act = get_company_pref('default_purchase_ewt_act');
		$total += add_gl_trans_supplier($trans_type, $payment_id, $date_, $ewt_act, 0, 0,
			-$ewt, $supplier_id, "", $rate);
	}
	
	if ($supp_charge != 0)
	{
		$total += add_gl_trans_supplier($trans_type, $payment_id, $date_, $bank_gl_account, 0, 0,
				-($supp_charge), $supplier_id, "", $rate);
				
		add_bank_trans($trans_type, $payment_id, $bank_account, $ref,
		$date_, -($supp_charge), PT_SUPPLIER,
		$supplier_id, $bank_account_currency,
		"Could not add the supplier payment bank transaction");
	}
	//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\
	$bank_trans_id_ = array();
	foreach($_SESSION['s_checks']->checks as $key=>$check_item)	// Now debit creditors account with payment + discount
	{
		// Now credit discount received account with discounts
		
		if ($supp_amount != 0)
		{
			$total += add_gl_trans_supplier($trans_type, $payment_id, $check_item->check_date, $bank_gl_account, 0, 0,
				-($check_item->check_amount), $supplier_id, "", $rate);
		}
		
		/*now enter the bank_trans entry */
		$bank_trans_id = add_bank_trans_2($trans_type, $payment_id, $bank_account, $ref,
			$check_item->check_date, -($check_item->check_amount), PT_SUPPLIER,
			$supplier_id, $bank_account_currency,
			"Could not add the supplier payment bank transaction");
			
		if($bank_row['account_type'] == 1)
		{
			add_check2($bank_trans_id, ST_SUPPAYMENT, $bank_row['bank_name'], '', $check_item->check_number, $check_item->check_date,
				-($check_item->check_amount), $bank_row['id'], $_POST['pay_to']);
				
			$sql = "UPDATE ".TB_PREF."suppliers SET
						pay_to = ".db_escape($_POST['pay_to'])."
					WHERE supplier_id = $supplier_id";
			db_query($sql,'failed to update supplier pay_to');
		
			// issue_check_number2($payment_id, $check_item->check_number, ST_SUPPAYMENT, $bank_trans_id);
			issue_check_number3($check_account_id,$bank_trans_id,$check_item->check_number);
		}
		
		$bank_trans_id_[] = $bank_trans_id;
	}
	/*Post a balance post if $total != 0 */
	add_gl_balance($trans_type, $payment_id, $date_, -$total, PT_SUPPLIER, $supplier_id);	
	//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\\//\\\//\\\//\\\//\\\//\\\//\\\//\\\//\\\//\\\//\\

	add_comments($trans_type, $payment_id, $date_, $memo_);

	$Refs->save($trans_type, $payment_id, $ref);
	
	insert_cv_details($_POST['cv_id'], $trans_type, $payment_id, -$amount);
	
	//******************************************************************** allocation
	$negative_cv_res =  get_cv_details($_POST['cv_id'],' AND amount<0 ORDER BY amount');
	
	$negatives = array();
	while($row = db_fetch($negative_cv_res))
	{
		$negatives[] = array($row['trans_type'],$row['trans_no'],-$row['amount']);
	}
	
	$positive_cv_res =  get_cv_details($_POST['cv_id'],' AND amount>0 ORDER BY amount DESC');
	$positives = array();
	
	while($row = db_fetch($positive_cv_res))
	{
		$positives[] = array($row['trans_type'],$row['trans_no'],$row['amount']);
	}
	
	$index = 0;
	
	foreach($negatives as $ind => $to_allocate)
	{
		$to_allocate_amount = round2($to_allocate[2],2); //total amount of the negative transaction
		$current_allocated = 0;
		
		while(round2($to_allocate_amount,2) != round2(0,2))
		{
			// display_error($index);
			// display_error($to_allocate_amount);
			$index_add = false;
			if ($allocatable == 0)
				$allocatable = round2($positives[$index][2],2); //total amount of the positive transaction
			
			if ($to_allocate_amount == 0)
				break;
			
			if ($to_allocate_amount < $allocatable)
			{
				$current_allocated = $to_allocate_amount ;
			}
			else
			{
				$current_allocated = $allocatable;
				$index_add = true;
			}
			
			add_supp_allocation($current_allocated,$to_allocate[0], $to_allocate[1],
			    	 	$positives[$index][0], $positives[$index][1], $date_);
						
			update_supp_trans_allocation($positives[$index][0], $positives[$index][1], $current_allocated);		
			
			$to_allocate_amount -= round2($current_allocated,2);
			$allocatable -= $current_allocated;
		
			if ($index_add)
			{
				$index ++;
				// $allocatable = $positives[$index][2]; //total amount of the positive transaction
			}
		}
		
		update_supp_trans_allocation($to_allocate[0], $to_allocate[1], $to_allocate[2]);	
	}
	
	$sql = "UPDATE ".TB_PREF."cv_header SET bank_trans_id='".implode(',',$bank_trans_id_)."' WHERE id = ". $_POST['cv_id'];
	db_query($sql,'failed to update cv header for bank id');
	
	//********************************************************************
	

	commit_transaction();
	// cancel_transaction();
	//============================================================================================
	// Also has DB constraints to not allow duplicates Cheque Refs
	// $issue_id = issue_check_number($_POST['trans_no'], $_POST['next_reference']);
	meta_forward($_SERVER['PHP_SELF'], "IssuedID=$payment_id");
}
//--------------------------------------------------------------------------------------------------
if (list_updated('bank_account'))
{
	global $Ajax;
	
	// $bank_row = get_bank_account($_POST['bank_account']);
	$_SESSION['s_checks'] = new check_cart(ST_SUPPAYMENT,0);
	
	$_POST['c_no'] = get_next_check_reference2($_POST['bank_account']);
	$Ajax->activate('show_check_cart');
}
//--------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------- CHECK TABLE FUNCTIONS
function check_line_start_focus() {
  global 	$Ajax;

  set_focus('c_date');
  // unset($_POST['c_date']);
	$_POST['c_amt'] = round2($_SESSION['s_checks']->cv_amount - $_SESSION['s_checks']->total_check_amount(),2);
  $Ajax->activate('show_check_cart');
}

function handle_new_check()
{
	global $Ajax;

	if (trim($_POST['c_no']) == '')
	{
		display_error(_("Check Number is required."));
		set_focus('c_no');
		$error = true;
	}
	
	if (!is_date($_POST['c_date']))
	{
		display_error(_("Invalid Check Date."));
		set_focus('c_date');
		$error = true;
	}
	
	if (input_num('c_amt') <= 0)
	{
		display_error(_("Check Amount is required."));
		set_focus('c_amt');
		$error = true;
	}
	
	if (is_array($chk_range = is_check_within_booklet($_POST['bank_account'], trim($_POST['c_no']))))
	{
		display_error(_("Check Number is not in the booklet. Current Series: ".$chk_range[0].' -> '. $chk_range[1]));
		set_focus('c_no');
		$error = true;
	}
	
	if (round($_SESSION['s_checks']->cv_amount - ($_SESSION['s_checks']->total_check_amount() + input_num('c_amt')),2) > 0)
	{
		display_error(_("Check Amount is not equal to amount of payment."));
		set_focus('c_amt');
		$error = true;
	}
	
	if (round($_SESSION['s_checks']->cv_amount - ($_SESSION['s_checks']->total_check_amount() + input_num('c_amt')),2) < 0)
	{
		display_error(_("Total Check Amount will exceed amount of payment."));
		set_focus('c_amt');
		$error = true;
	}
	// if (!is_new_cheque_srs($_POST['bank_account'],$_POST['c_no']))
	// {
		// display_error(_("Check Number already used."));
		// set_focus('c_no');
	   	// return false;	   
	// }
	if (!check_check_global($_POST['bank_account'],$_POST['c_no']))
	{
		display_error("Check Number is already used.");
		set_focus('c_no');
		$error = true;
		return false;	   
	}
	
	if (!$error)
	{
		$chkchk = $_SESSION['s_checks']->check_check('', '', $_POST['c_no']);
		
		if (!check_check_global($_POST['bank_account'],$_POST['c_no']))
		{
			display_error("Check Number is already used.");
			set_focus('c_no');
		}
		
		if ($chkchk === null)
		{
			$_SESSION['s_checks']->add_item('', '', $_POST['c_no'], $_POST['c_date'], input_num('c_amt'));
			// $_POST['c_no'] = increment($_POST['c_no']);
			
			check_line_start_focus();
		}
		else
		{
			display_error(_("Duplicate Check number for line item #".($chkchk+1)));
			set_focus('c_bank');
		}
	}
}

function check_check_global($check_bank_id,$check_no)
{
	$bank_row = get_checking_account_bank($check_bank_id);
	$sql = "SELECT * FROM ".TB_PREF."cheque_details 
				WHERE chk_number = ".db_escape($check_no)."
				AND bank_id = ".$bank_row['id'];
	$res = db_query($sql);
	
	return (db_num_rows($res) == 0);
}

function handle_update_item()
{
	global $Ajax;
	$error = false;
	
	if (trim($_POST['c_no']) == '')
	{
		display_error(_("Check Number is required."));
		set_focus('c_no');
		$error = true;
	}
	
	if (is_array($chk_range = is_check_within_booklet($_POST['bank_account'], trim($_POST['c_no']))))
	{
		display_error(_("Check Number is not in the booklet. Current Series: ".$chk_range[0].' -> '. $chk_range[1]));
		set_focus('c_no');
		$error = true;
	}
	
	
	if (!is_date($_POST['c_date']))
	{
		display_error(_("Invalid Check Date."));
		set_focus('c_date');
		$error = true;
	}if (input_num('c_amt') <= 0)
	{
		display_error(_("Check Amount is required."));
		set_focus('c_amount');
		$error = true;
	}
	if (round($_SESSION['s_checks']->cv_amount - ($_SESSION['s_checks']->total_check_amount()+input_num('c_amt')-input_num('last_c_amt')),2) < 0)
	{
		display_error(_("Total Check Amount will exceed amount of payment."));
		set_focus('c_amt');
		$error = true;
	}
	
	if (!$error)
	{
		$chkchk = $_SESSION['s_checks']->check_check('', '', $_POST['c_no'], $_POST['LineNo']);
		
		if ($chkchk === null)
		{
			$_SESSION['s_checks']->edit_item($_POST['LineNo'], '', '', $_POST['c_no'], $_POST['c_date'], input_num('c_amt'));
			$_POST['amount'] = number_format2($_SESSION['s_checks']->amount,2);
				
			// $_POST['c_no'] = increment($_SESSION['s_checks']->get_last_check());
			check_line_start_focus();
		}
		else
		{
			display_error(_("Duplicate Check!"));
			set_focus('c_bank');
		}
	}
}

function handle_delete_item($id)
{
	global $Ajax;
	
	$_SESSION['s_checks']->delete_check_item($id);
    check_line_start_focus();
}

$del_id = find_submit('Delete_2_');
if ($del_id!=-1)
	handle_delete_item($del_id);
	
if (isset($_POST['UpdateItem']))
	handle_update_item();


if (isset($_POST['add_c']))
{
	handle_new_check();
}

if (isset($_POST['CancelItemChanges']))
	check_line_start_focus();


//--------------------------------------------------------------------------------------------------
start_form();

// ref_row("Check No.:<font color=red>*</font>",'check_no');
// date_row(_("Check Date") . ":<font color=red>*</font>", 'check_date', '', true, 0, 0, 0, null, true);

if (isset($_POST['cv_id']))
{
	// Check if already issued

	//----------------------------
	$cv_header = get_cv_header($_POST['cv_id']);
	
	if ($cv_header['bank_trans_id'] != 0) 
	{
		display_error(_("This CV has a check already"), true);
   	 	end_page();
    	exit;
	}

	hidden('cv_id',$_POST['cv_id']);
	start_outer_table("$table_style2 width=60%", 5);

	table_section(1);
	
	$person = payment_person_name($cv_header["person_type"],$cv_header["person_id"], false);
	
	if (!isset($_POST['pay_to']) AND $cv_header["person_type"] == PT_SUPPLIER)
		$_POST['pay_to'] = get_supplier_pay_to($cv_header["person_id"]);
		
	
	label_row('Payment To :', '<b>'.$person.'</b>');
	text_row('Name to appear in check:','pay_to', null, 50);
	hidden('supplier_id',$cv_header["person_id"]);
	
	// check_accounts_list_row(_("Bank Account:<font color=red>*</font>"), 'bank_account', null, true, '');
	assigned_check_list_cells(_("Bank Account:<font color=red>*</font>"),'bank_account', null, true, '');

	start_row();
	$_SESSION['s_checks']->cv_amount = $cv_header['amount'];
	end_row();
	
	if ($cv_header['ewt'] != 0)
	{
		start_row();
		label_cell('<b>EWT:</b>');
		amount_cell($cv_header['ewt'], true);
		hidden('ewt', $cv_header['ewt']);
		$_SESSION['s_checks']->ewt= $cv_header['amount'];
		end_row();
	}
	
	table_section(2);

    label_row(_("CV No.:<font color=red>*</font>"), '<b>'.$cv_header['cv_no'].'</b>');
	// hidden('ref',$cv_header['cv_no']);

    date_row(_("Date Created") . ":<font color=red>*</font>", 'DatePaid', '', true, 0, 0, 0, null, true);

	label_cell('<b>CV Amount :</b>');
	amount_cell($cv_header['amount']+$cv_header['ewt'], true);
	hidden('amount', $cv_header['amount']);
	
	end_outer_table(1); // outer table
	
	if ($_POST['bank_account'] != 0)
	{
		div_start('show_check_cart');
			show_check_cart($_SESSION['s_checks']);
		div_end();
	}
	
	display_heading2(_("<b>CV Transactions</b>"));

	$res = get_cv_details($_POST['cv_id']);

	start_table("colspan=9 $table_style width=60%");

	$th = array('Transaciton Type', 'Trxn #' , 'Date', 'Amount');

	table_header($th);

	$tots = $k = 0;
	while($item_row = db_fetch($res))
	{
		alt_table_row_color($k);
		$tran_det = get_tran_details($item_row['trans_type'], $item_row['trans_no']);
		label_cell($systypes_array[$item_row['trans_type']]);
		
		if($tran_det["type"] == ST_SUPPDEBITMEMO || $tran_det["type"] == ST_SUPPCREDITMEMO)
			label_cell(get_gl_view_str($tran_det["type"], $tran_det["trans_no"], $tran_det["reference"]));
		else
			label_cell(get_trans_view_str($tran_det["type"], $tran_det["trans_no"], $tran_det["reference"]));

		label_cell(sql2date($tran_det['tran_date']));
		
		amount_cell($item_row['amount']);
		$tots += $item_row['amount'];
		end_row();
	}
	
	
	if ($cv_header['ewt'] != 0)
	{
		label_row(_("<b>less EWT:</b>"), number_format2($cv_header['ewt'],2), "colspan=3 align=right", "nowrap align=right");
		label_row(_("<b>CV TOTAL :</b>"), number_format2($tots-$cv_header['ewt'],2), "colspan=3 align=right", "nowrap align=right");
	}
	else
		label_row(_("<b>CV TOTAL :</b>"), number_format2($tots,2), "colspan=3 align=right", "nowrap align=right");
	
	end_table(2);
	submit_center('POST_CHECK', _("Issue Cheque"), true, '', true);

} else {

	display_error(_("No Payment has been Selected"), true);
}
end_form();
end_page();

?>
