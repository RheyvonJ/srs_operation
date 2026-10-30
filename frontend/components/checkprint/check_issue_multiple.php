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
	
page(_("Issue Checks"), false, false, "", $js);

start_form();

$sql = "SELECT * FROM ".TB_PREF."check_account";
$res = db_query($sql);
if (db_num_rows($res) == 0)
{
	display_error('There are no bank accounts defined in the system.', true);
	end_page();
	exit;	
}
//==========================================================================================
function get_total_excluded()
{
	$prefix = 'exclude';
	$count = 0;
	foreach($_POST as $postkey=>$postval)
    {
		if (strpos($postkey, $prefix) === 0)
		{
			$count++;
		}
	}
	return $count;
}

function check_data()
{
	$ret = true;
	
	if ($_POST['check_bank_account_id'] == 0)
	{
		display_error('Please choose a checking account.');
		return false;
		$ret = false;
	}
	
	if ($_POST['batch_no'] == '' )
	{
		display_error('Batch # is required');
		$ret = false;
	}
	
	if (!is_numeric($_POST['batch_no']) )
	{
		display_error('Batch # must be a number');
		$ret = false;
	}
	
	if ($_POST['batch_no'] == 0 )
	{
		display_error('Batch # must be greater than 0');
		$ret = false;
	}
	
	
	if (!check_checking_account_batch_no($_POST['check_bank_account_id'],$_POST['batch_no']))
	{
		display_error('Duplicate Batch No. for '.get_checking_account_bank_name($_POST['check_bank_account_id']));
		$ret = false;
	}
	
	if ($_POST['check_writer'] == 0)
	{
		display_error('Please choose a check writer');
		$ret = false;
	}
	
	if (($_POST['check_writer'] == 2 AND isset($_POST['print_checks_aub']))
		OR ($_POST['check_writer'] == 1 AND isset($_POST['print_checks_metrobank'])))
	{
		display_error('Check Writer and process button did not match');
		$ret = false;
	}
	
	if ($_POST['c_avail'] < (count($_SESSION['cv_to_process'])-(get_total_excluded())))
	{
		display_error('Insufficient Checks available. Please exclude some CV ');
		$ret = false;
	}
	return $ret;
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

function save_last_cheque($check_account_id, $check_ref)
{
	global $Refs;
	$next = increment($check_ref);
	save_next_check_reference($check_account_id, $next);
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

//==========================================================================================

if (isset($_GET['processed']))
{
	
	echo "<center>";
	
    display_notification_centered(_("Checks Issued. See other window for the file"));

	hyperlink_no_params("$path_to_root/modules/checkprint/check_list_2.php", _("Issue Another Cheque"));
	display_footer_exit();
}
//==========================================================================================
// ===========================================PROCESSING
if (isset($_POST['print_checks_aub']) OR isset($_POST['print_checks_metrobank']))
{
	if (check_data())
	{	
		global $Refs;
		
		$check_account_id = $_POST['check_bank_account_id'];
		$bank_row = get_checking_account_bank($check_account_id);
		$bank_currency = $bank_row['bank_curr_code'];
		$comp_currency = get_company_currency();
		
		//============================================================================================
		set_time_limit(0);
		begin_transaction();
		
		$company_pref = get_company_prefs();
		
		$sql = "INSERT INTO ".TB_PREF."check_issue_batch(check_bank_id,bank_id,batch_no,user_id,check_writer)
				VALUES($check_account_id,".$bank_row['id'].",".$_POST['batch_no'].",".$_SESSION['wa_current_user']->user.",
					".$_POST['check_writer'].")";
		db_query($sql,'failed to insert batch');
		$batch_id = db_insert_id();
		
		// $ids = array();
		foreach($_SESSION['cv_to_process'] as $cv)
		{
			if (isset($_POST['exclude'.$cv]))
				continue;
				
			$cv_head = get_cv_header($cv);
			$supp_currency = get_supplier_currency($cv_head['person_id']);
			if ($comp_currency != $bank_currency && $bank_currency != $supp_currency)
				$rate = 0;
			else
				$rate = input_num('_ex_rate');

			
			$supplier_id = $cv_head['person_id'];
			$pay_to = $_POST['pay_to'.$cv_head['id']];
			$chk_date = $_POST['chk_date'.$cv_head['id']];
			$date_ = Today();
			$bank_account = $bank_row['id'];
			$amount = $cv_head['amount'];
			$ref = '';
			$ewt = $cv_head['ewt'];
			// $memo_ = $_POST['memo_'];
			$charge = 0;
			$discount = 0;
			
			$amount -= $ewt;
			$amount -= $discount;


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
			
			$supp_amount = round($supp_amount, user_price_dec());
			$supp_discount = round($supp_discount, user_price_dec());
			$supp_charge = round($supp_charge, user_price_dec());
			
			// it's a supplier payment
			$trans_type = ST_SUPPAYMENT;

			/* Create a supp_trans entry for the supplier payment */
			$payment_id = add_supp_trans($trans_type, $supplier_id, Today(), $date_,
				 $Refs->get_next(ST_SUPPAYMENT), "", -$supp_amount, 0, -$supp_discount, "", $rate, -$ewt);
			
			$total = 0;
			
			//get accounts payable trade and non trade 
			
			$t_nt_total = get_gl_trade_and_non_trade_total($cv_head['id']);
			
			if ($t_nt_total[0] != 0) // trade
				$total += add_gl_trans_supplier($trans_type, $payment_id, $date_, $company_pref["creditors_act"], 0, 0,
						$t_nt_total[0], $supplier_id, "", $rate);
					
			if ($t_nt_total[1] != 0) // non trade
				$total += add_gl_trans_supplier($trans_type, $payment_id, $date_, $company_pref["creditors_act_nt"], 0, 0,
						$t_nt_total[1], $supplier_id, "", $rate);
			//============================

			if ($ewt != 0)
			{
				$ewt_act = get_company_pref('default_purchase_ewt_act');
				$total += add_gl_trans_supplier($trans_type, $payment_id, $date_, $ewt_act, 0, 0,
					-$ewt, $supplier_id, "", $rate);
			}
			
			//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\
			$bank_trans_id_ = array();
			
			$check_number = get_next_check_reference2($check_account_id);
			// foreach($_SESSION['s_checks']->checks as $key=>$check_item)	// Now debit creditors account with payment + discount
			// {
				// // Now credit discount received account with discounts
				
				// if ($supp_amount != 0)
				// {
			$total += add_gl_trans_supplier($trans_type, $payment_id, $date_, $bank_gl_account, 0, 0,
				-($amount+$ewt), $supplier_id, "", $rate);
				// }
				
				/*now enter the bank_trans entry */
			$bank_trans_id = add_bank_trans_2($trans_type, $payment_id, $bank_account, $ref,
				$date_, -($amount+$ewt), PT_SUPPLIER,
				$supplier_id, $bank_account_currency,
				"Could not add the supplier payment bank transaction");
				
			// $ids[] = $bank_trans_id; 
					
				// if($bank_row['account_type'] == 1)
				// {
					add_check2($bank_trans_id, ST_SUPPAYMENT, $bank_row['bank_name'], '', $check_number, $chk_date,
						-($amount+$ewt), $bank_row['id'], $pay_to);
						
					$sql = "UPDATE ".TB_PREF."suppliers SET
								pay_to = ".db_escape($pay_to)."
							WHERE supplier_id = $supplier_id";
					db_query($sql,'failed to update supplier pay_to');
				
					// issue_check_number2($payment_id, $check_number, ST_SUPPAYMENT, $bank_trans_id);
					issue_check_number3($check_account_id,$bank_trans_id,$check_number);
				// }
				
				// $bank_trans_id_[] = $bank_trans_id;
			// }
			/*Post a balance post if $total != 0 */
			add_gl_balance($trans_type, $payment_id, $date_, -$total, PT_SUPPLIER, $supplier_id);	
			//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\\//\\\//\\\//\\\//\\\//\\\//\\\//\\\//\\\//\\\//\\

			// add_comments($trans_type, $payment_id, $date_, $memo_);

			$Refs->save($trans_type, $payment_id, $ref);
			
			insert_cv_details($cv_head['id'], $trans_type, $payment_id, -$amount);
			
			//================== start of auto allocation
			
			$negative_cv_res =  get_cv_details($cv_head['id'],' AND amount<0 ORDER BY amount');
			
			$negatives = array();
			while($row = db_fetch($negative_cv_res))
			{
				$negatives[] = array($row['trans_type'],$row['trans_no'],-$row['amount']);
			}
			
			$positive_cv_res =  get_cv_details($cv_head['id'],' AND amount>0 ORDER BY amount DESC');
			$positives = array();
			
			while($row = db_fetch($positive_cv_res))
			{
				$positives[] = array($row['trans_type'],$row['trans_no'],$row['amount']);
			}
			
			$index = 0;
			$allocatable = 0;
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
			//========================= end of auto allocation
			
			update_supplier_pay_to($supplier_id, $pay_to);
			
			$sql = "UPDATE ".TB_PREF."cv_header SET bank_trans_id='$bank_trans_id' WHERE id = ". $cv_head['id'];
			db_query($sql,'failed to update cv header for bank id');
			
			$sql = "INSERT INTO ".TB_PREF."check_issue_batch_cv(batch_id, cv_id, bank_trans_id)
					VALUES($batch_id,".$cv_head['id'].",$bank_trans_id)";
			db_query($sql,'failed to insert check_issue_batch_cv');
		
		}
		//********************************************************************
		
		commit_transaction();
		
		//================================================
		
		if ($_POST['print_checks_aub'])
			$export_page = "aub_check_export.php?batch_id=$batch_id";
		else if ($_POST['print_checks_metrobank'])
			$export_page = "mb_check_export.php?batch_id=$batch_id";
		
		echo "<script type='text/javascript'>
				window.open('".$path_to_root . "/modules/checkprint/$export_page',
				'_blank','width=400px,height=300px,scrollbars=0,resizable=no')
				</script>";
				
		unset($_SESSION['cv_to_process']);
		meta_forward($_SERVER['PHP_SELF'], "processed=aub");
		// else if ($_POST['print_checks_metrobank'])
		//================================================
		// cancel_transaction();
		//============================================================================================
		
	}
}
//==========================================================================================
//==========================================================================================

if (list_updated('check_bank_account_id') AND $_POST['check_bank_account_id'] != 0)
{
	global $Ajax;
	// display_error($_POST['check_bank_account_id']);
	
	// $sql = "SELECT * FROM ".TB_PREF."check_account
			// WHERE account_id = ".$_POST['check_bank_account_id'];
	// $res = db_query($sql);
	$cb_row = get_checking_account($_POST['check_bank_account_id']);
	
	// $sql = "SELECT MAX(batch_no) FROM ".TB_PREF."check_issue_batch
			// WHERE check_bank_id = ".$_POST['check_bank_account_id'];
	// $res = db_query($sql);
	// $row = db_fetch($res);
	
	$_POST['batch_no'] = get_checking_account_batch_no($_POST['check_bank_account_id']);
	$_POST['c_avail'] = ($cb_row['booklet_end'] - $cb_row['next_reference']) + 1;
	$_POST['b_start'] = $cb_row['booklet_start'];
	$_POST['next_check'] = $cb_row['next_reference'];
	$_POST['b_end'] = $cb_row['booklet_end'];
	$_POST['check_writer'] = $cb_row['def_check_writer'];
	
}
else if (isset($_GET['New']) OR $_POST['check_bank_account_id'] == 0)
{
	$_POST['batch_no'] = $_POST['c_avail'] = $_POST['b_start'] = $_POST['next_check'] = $_POST['b_end'] = '';
}

if (count($_SESSION['cv_to_process']) == 0)
{
	display_error('No CV to process');
	display_footer_exit();
}

$ex_id = find_submit('_exclude');
if ($ex_id != -1)
{
	global $Ajax;
	set_focus('pay_to'.$ex_id);
	$Ajax->activate('cv_tots');
}
	
div_start('header_');
start_outer_table("$table_style2 width=80%");
table_section(1,"50%");
assigned_check_list_row(_("Bank Account:<font color=red>*</font>"),'check_bank_account_id', null, true, '');

amount_row('Batch #', 'batch_no',null,null,null,0);//, 3, 3, null, null, null, 0);


echo "<tr>";
$check_writers = array('0' => 'Select Check Writer', '1' => 'AUB', '2' => 'MetroBank');
label_cells('Check Writer: (<i>must match below</i>)',array_selector('check_writer', null, $check_writers));
echo "</tr>\n";

table_section(2, "50%");
label_row('Booklet Start:', '<b>'.$_POST['b_start'],'','align=right');
hidden('b_start',$_POST['b_start']);
label_row('Current Check #:', '<font color=red><b>'.$_POST['next_check'].'</font>','','align=right');
hidden('next_check',$_POST['next_check']);
label_row('Booklet End:', '<b>'.$_POST['b_end'],'','align=right');
hidden('b_end',$_POST['b_end']);
label_row('Checks Available:', '<b>'.$_POST['c_avail'].'</b>','','align=right');
hidden('c_avail',$_POST['c_avail']);
end_outer_table(1);
div_end();

div_start('cv_tots');
display_heading('Check Vouchers : '. (count($_SESSION['cv_to_process'])-(get_total_excluded())) );
div_end();
div_start('cv_list');
$cvs = &$_SESSION['cv_to_process'];
$th = array('CV #', 'CV Date', 'Name to appear in check', 'Check Date','Amount', 'Due Date', 'Exclude');
start_table("$table_style2 width=80%");
table_header($th);
$total = $k = 0;

// ====================== CV CART
foreach($cvs as $cv)
{
	alt_table_row_color($k);
	
	$cv_head = get_cv_header($cv);
	
	if (!isset($_POST['pay_to'.$cv_head['id']]))
	{
		$_POST['pay_to'.$cv_head['id']] = get_supplier_pay_to($cv_head["person_id"]);
	}
	
	label_cell(get_cv_view_str($cv_head["id"], $cv_head["cv_no"]));
	label_cell(sql2date($cv_head["cv_date"]));
	text_cells('','pay_to'.$cv_head['id'],null,60);
	date_cells('','chk_date'.$cv_head['id']);
	amount_cell($cv_head['amount'], true);
	label_cell(sql2date($cv_head["due_date"]),'align=center');
	check_cells('','exclude'.$cv_head['id'],null,true, '', "align='center'");
	
	if (check_value('exclude'.$cv_head['id']) == 0)
		$total += $cv_head['amount'];
	end_row();
}

alt_table_row_color($k);
	label_cell('<b>TOTAL :</b>', 'align=right colspan=4');
	amount_cell($total,true);
	label_cell('','colspan=2');
end_row();
end_table(2);

submit_center_first('print_checks_aub', "Process for AUB Check Writer", 'Download Excel File', false, 'aub.png');
submit_center_last('print_checks_metrobank', "Process for Metrobank Check Writer", 'Download Text File', false, 'mb.png');
		
div_end();
end_form();
end_page();

?>
