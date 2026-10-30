<?php

$page_security='SA_CHECKPRINT';
$path_to_root="../..";
include($path_to_root . "/includes/session.inc");
add_access_extensions();

include($path_to_root . "/purchasing/includes/purchasing_ui.inc");
include($path_to_root . "/modules/checkprint/includes/check_accounts_db.inc");
//include_once($path_to_root . "/reporting/includes/reporting.inc");
include($path_to_root . "/modules/checkprint/includes/check_pdf.inc");
include_once($path_to_root . "/modules/checkprint/includes/cv_mailer.inc");

unset($_SESSION['cv_to_process']);

//------------------------------------------------------------------------------------------------
function create_check_info($receipt,$cv_header)
{
	$pay_to = $receipt['pay_to'];
	
	if ($pay_to == '')
	{
		$pay_to = preg_replace("/\([^)]+\)/","",$to);
	}
	
	$pay_to = html_entity_decode($pay_to);
	
	$sampleamount = number_format($receipt['chk_amount'], 2, '', '');
	
	$date__ = explode_date_to_dmy(sql2date($receipt['chk_date']));
	
	$Prefix = 'C';
	$Vendor_Code = str_pad($receipt["person_id"], 10);
	$Payee_Name = str_pad($pay_to, 50);
	$Check_Amount = str_pad($sampleamount, 15, "0", STR_PAD_LEFT);
	$Check_Date = $date__[1].$date__[0].$date__[2];
	$TIN = 'X1';
	$Purpose_of_Check = '';
	$Buffer = '';
	
	return $Prefix.$Vendor_Code.$Payee_Name.$Check_Amount.$Check_Date.$TIN.$Purpose_of_Check.$Buffer.PHP_EOL;
}

function create_check_voucher_info($receipt, $cv_header, &$amount)
{
	global $systypes_array_short;
	// get voucer details
	$res = get_cv_details($cv_header['id']," AND trans_type != 22 AND voided = 0 ORDER BY amount DESC");
	
	$return = '';
	while ($cv_d_row = db_fetch($res))
	{
		$tran_det = get_tran_details($cv_d_row['trans_type'], $cv_d_row['trans_no']);
		
		$ref = $systypes_array_short[$cv_d_row['trans_type']]. '#'.$tran_det['reference'];
		$inv_no = '';
		
		if ($tran_det['supp_reference'] != '' AND $cv_d_row['trans_type'] == 20)
			$inv_no = 'SI#'.$tran_det['supp_reference'];
			
		$tran_date = explode_date_to_dmy(
			sql2date(($cv_d_row['trans_type'] != 20 ? $tran_det['tran_date'] : $tran_det['del_date'])));
		
		$amt_paid = '0';
		if ($cv_d_row['amount'] > 0)
		{
			$amt_paid = number_format($amount, 2, '', '');
			$amount -= round2($cv_d_row['amount'],2);
		}
		
		$inv_amount = number_format($cv_d_row['amount'], 2, '', '');
		
		$reference = str_pad($ref, 16);
		$cv_no = str_pad($cv_header['cv_no'], 15);
		$inv_no = str_pad($inv_no, 15);
		$inv_date = $tran_date[1].$tran_date[0].$tran_date[2];
		$inv_amount = str_pad($inv_amount, 21, "0", STR_PAD_LEFT);
		$dmcm_amount = str_pad('0', 21, "0", STR_PAD_LEFT);
		$tax_amount = str_pad('0', 21, "0", STR_PAD_LEFT);
		$amount_paid = str_pad($amt_paid, 21, "0", STR_PAD_LEFT); // compute positive - negative
		$Buffer = '';
		
		$return .= 'V'.$reference.$cv_no.$inv_no.$inv_date.$inv_amount.$dmcm_amount.$tax_amount.$amount_paid.$Buffer.PHP_EOL;
	}
	
	return $return;
}

// if ($_POST['print_checks'] OR  $_POST['print_checks_metrobank'])
// {
	// $prefix = 'chk_prnt';
	// $ids = array();
	// foreach($_POST as $postkey=>$postval)
    // {
		// if (strpos($postkey, $prefix) === 0)
		// {
			// $id = substr($postkey, strlen($prefix));
			// $ids[] = $id;
		// }
	// }
	
	// if (count($ids) == 0)
	// {
		// display_error('No Selected Check/s!');
		// return false;
	// }
	
	// else
	// {	
		// sort($ids);
		// // meta_forward($path_to_root . "/modules/checkprint/real_check_print.php",'ids='.implode(',',$ids));
		
		// if ($_POST['print_checks'])
			// echo "<script type='text/javascript'>
				// window.open('".$path_to_root . "/modules/checkprint/aub_check_export.php?ids=".implode(',',$ids)."',
				// '_blank','width=400px,height=300px,scrollbars=0,resizable=no')
				// </script>";
		// else if ($_POST['print_checks_metrobank'])
		// {
			// $sql = "SELECT * FROM ".TB_PREF."mb_ccws WHERE batch_no = ".$_POST['mb_batch_no'];
			// $res = db_query($sql);
			
			// if (db_num_rows($res) > 0)
			// {
				// display_error('Batch Number is already used');
				// unset($_POST['print_checks_metrobank']);
			// }
			// if (isset($_POST['print_checks_metrobank']))
			// {
				// $sql = "INSERT INTO ".TB_PREF."mb_ccws(batch_no,transaction_date,user_id)
						// VALUES(".$_POST['mb_batch_no'].",'".date2sql($_POST['transaction_date'])."',
							// ".$_SESSION['wa_current_user']->user.")";
				// db_query($sql,'failed to insert CCWS batch');
				
				// $sql = "UPDATE ".TB_PREF."cv_header SET
							// check_printed = 1
						// WHERE bank_trans_id IN (".implode(',',$ids).")
						// AND bank_trans_id != 0";
				// db_query($sql,'failed to flag check as printed');
				
				// ob_end_clean();
				// ob_start();
				
				// $batch_no = substr('00'.$_POST['mb_batch_no'], -2);
				// $tran_date_ = explode_date_to_dmy($_POST['transaction_date']);
				// $tran_date = $tran_date_[1].$tran_date_[0].$tran_date_[2];
				
				// echo "MBTC-CCWS". "$tran_date-$batch_no" . PHP_EOL;
				// // display_error($ids[0]);
				
				// $res = get_c_details(implode(',',$ids));
				// // display_error(db_num_rows($res));
				// while($receipt = db_fetch($res))
				// {	
					// $c_amt_ = $receipt['chk_amount'];
					// $cv_header = get_cv_header_by_bank_trans_id($receipt['bank_trans_id']);
					// echo create_check_info($receipt,$cv_header);
					// echo create_check_voucher_info($receipt,$cv_header,$c_amt_);
				// }
				
				// $output = ob_get_clean();

				// header('Content-disposition: attachment; filename=CCWS_'.$batch_no.'.txt');
				// header('Content-type: text/plain');

				// echo $output;
				// exit();
			// }
		// }
	// }
	
// }
//------------------------------------------------------------------------------------------------

$js = "";
if ($use_popup_windows)
	$js .= get_js_open_window(900, 500);
if ($use_date_picker)
	$js .= get_js_date_picker();

$js .= "
	function openThickBox(id, typex,txt){
		// if(type == 25){
		// 	ttype = 5;
		// }else if(type == 20){
		// 	ttype = 6;
		// }
		url = '../../sales/customer_del_so.php?OrderNumber=' + id + '&view=1&type=' + typex + '&KeepThis=true&TB_iframe=true&height=280&width=300';
		tb_show('Void '+txt, url);
	}
";	
	
page(_("Process Payment"), false, false, "", $js);


if (isset($_GET['FromDate'])){
	$_POST['TransAfterDate'] = $_GET['FromDate'];
}
if (isset($_GET['ToDate'])){
	$_POST['TransToDate'] = $_GET['ToDate'];
}

if (isset($_GET['batchpaymentid']))
{
	$csv_id = $_GET['batchpaymentid'];
	$sql = "SELECT * FROM ".TB_PREF."csv WHERE id = $csv_id";
	$res = db_query($sql);
	$row = db_fetch($res);
	
	display_notification_centered("Batch Payment # $csv_id created");
	
	foreach($_SESSION['email_msgs'] as $msg)
		display_notification_centered($msg);
		

    // display_note(get_gl_view_str($trans_type, $trans_no, _("&View this Journal Entry")));
	// hyperlink_no_params($path_to_root.'/csv/'.$row['csv_file'], '<b>Download CSV File (<i>right click then select Save As...</i>)</b>');
	
	$target = $path_to_root.'/modules/checkprint/csv_download.php?id='.$csv_id;
	echo  "<center><a href='$target' id='$csv_id' onclick=\"javascript:openWindow(this.href,this.target); 
		return false;\"><b>Download CSV File</b></a></center>";
		
	reset_focus();
	hyperlink_no_params($path_to_root."/modules/checkprint/check_list_2.php", _("Return to Check Vouchers Page"));

	display_footer_exit();
}
else
	unset($_SESSION['email_msgs']);
//------------------------------------------------------------------------------------------------

function for_online_payment_update($id,$tag)
{
	$sql = "UPDATE ".TB_PREF."cv_header SET online_payment = $tag
				WHERE id = $id";
	db_query($sql,'failed to update CV for online payment');
}

function cv_due_date_update($id,$due_date)
{
	$sql = "UPDATE ".TB_PREF."cv_header SET due_date = '".date2sql($due_date)."'
				WHERE id = $id";
	db_query($sql,'failed to update CV due date');
}

function show_check_details($bank_trans_id)
{
	$sql = "SELECT * FROM ".TB_PREF."cheque_details
			WHERE bank_trans_id = $bank_trans_id";
	$res = db_query($sql);
	$row = db_fetch($res);
	
	return $row['bank']." - ".$row['chk_number'].'&nbsp;';
}

//------------------------------------------------------------------------------------------------
function process_online_payment($id, $company_pref)
{
	
	$cv_header = get_cv_header($id);
	
	$supplier_id = $cv_header['person_id'];
	
	$supp_currency = get_supplier_currency($supplier_id);
	$bank_currency = get_bank_account_currency($company_pref['online_payment_bank_id']);
	$comp_currency = get_company_currency();
	
	if ($comp_currency != $bank_currency && $bank_currency != $supp_currency)
		$rate = 0;
	else
		$rate = input_num('_ex_rate');

	new_doc_date(Today());
	
	//============================================================================================
	global $Refs;
	
	$date_ = Today();
	$bank_account = $company_pref['online_payment_bank_id'];
	$amount = $cv_header['amount'];
	$discount = 0;
	$ref = $cv_header['cv_no'];
	$memo_ = '';
	$charge = 0;
	$ewt = $cv_header['ewt'];
	
   	$supplier_currency = get_supplier_currency($supplier_id);
    $bank_account_currency = get_bank_account_currency($bank_account);
	$bank_gl_account = get_bank_gl_account($bank_account);

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
	$payment_id = add_supp_trans($trans_type, $supplier_id, $date_, Today(),
		$ref, "", -$supp_amount, 0, -$supp_discount, "", $rate, -$ewt);
	
	$total = 0;
	$supplier_accounts = get_supplier_accounts($supplier_id);
	$total += add_gl_trans_supplier($trans_type, $payment_id, Today(), $company_pref["creditors_act"], 0, 0,
		$ewt + $supp_amount + $supp_discount, $supplier_id, "", $rate);

	if ($ewt != 0)
	{
		$ewt_act = get_company_pref('default_purchase_ewt_act');
		$total += add_gl_trans_supplier($trans_type, $payment_id, Today(), $ewt_act, 0, 0,
			-$ewt, $supplier_id, "", $rate);
	}
	
	if ($supp_charge != 0)
	{
		$total += add_gl_trans_supplier($trans_type, $payment_id, Today(), $bank_gl_account, 0, 0,
				-($supp_charge), $supplier_id, "", $rate);
				
		add_bank_trans($trans_type, $payment_id, $bank_account, $ref,
		Today(), -($supp_charge), PT_SUPPLIER,
		$supplier_id, $bank_account_currency,
		"Could not add the supplier payment bank transaction");
	}

	$total += add_gl_trans_supplier($trans_type, $payment_id, Today(), $bank_gl_account, 0, 0,
		-($amount), $supplier_id, "", $rate);
	
	/*now enter the bank_trans entry */
	$bank_trans_id = add_bank_trans_2($trans_type, $payment_id, $bank_account, $ref,
		Today(), -($amount), PT_SUPPLIER,
		$supplier_id, $bank_account_currency,"Could not add the supplier payment bank transaction");

	/*Post a balance post if $total != 0 */
	add_gl_balance($trans_type, $payment_id, $date_, -$total, PT_SUPPLIER, $supplier_id);	
	//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\\//\\\//\\\//\\\//\\\//\\\//\\\//\\\//\\\//\\\//\\

	add_comments($trans_type, $payment_id, $date_, $memo_);

	$Refs->save($trans_type, $payment_id, $ref);
	
	insert_cv_details($id, $trans_type, $payment_id, -$amount);
	
	//******************************************************************** allocation
	$negative_cv_res =  get_cv_details($id,' AND amount<0 ORDER BY amount');
	
	$negatives = array();
	while($row = db_fetch($negative_cv_res))
	{
		$negatives[] = array($row['trans_type'],$row['trans_no'],-$row['amount']);
	}
	
	$positive_cv_res =  get_cv_details($id,' AND amount>0 ORDER BY amount DESC');
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
	
	$sql = "UPDATE ".TB_PREF."cv_header SET 
					bank_trans_id='".$bank_trans_id."', 
					online_payment = 2 
				WHERE id = ". $id;
	db_query($sql,'failed to update cv header for bank id');
	
	return true;
}

//------------------------------------------------------------------------------------------------

if (isset($_POST['process_online']))
{
	$co = get_company_prefs();
	
	if ($co['online_payment_bank_id'] == '')
	{
		display_error('No bank defined for online payment. '. "<a href='$path_to_root/admin/gl_setup.php?p'><b>Set it here</b></a>");
		unset($_POST['process_online']);
	}
}


if (isset($_POST['process_online']))
{
	global $db_connections;
	
	$co = get_company_prefs();
	
	$prefix = 'for_op';
	
	begin_transaction();
	
	$count = 0;
	$csv_details = array();

	$billing_institution_code = '999999';
	$subscriber_name = '';
	$subscriber_number = '';
	
	
	$list = array ();
	$total=0;
	$_SESSION['email_msgs'] = array();
	$csv_id = 0;
	
	foreach($_POST as $postkey=>$postval)
    {
		if (strpos($postkey, $prefix) === 0)
		{
			$id = substr($postkey, strlen($prefix));
			
			$i = process_online_payment($id,$co);
			
			if ($i == true)
			{
				if ($csv_id == 0)
				{
					$sql = "INSERT INTO ".TB_PREF."csv (csv_file, bank_id) VALUES ('',".$co['online_payment_bank_id'].")";
					db_query($sql,'failed to insert csv header');
					
					$csv_id = db_insert_id();
				}
					
				$cv_header= get_cv_header($id);
				$total += round2($cv_header['amount'],2);
				
				// $to = payment_person_name($cv_header['person_type'],$cv_header['person_id'], false);
				$to = html_entity_decode(get_supplier_pay_to($cv_header['person_id']));
				$supplier_row = get_supplier($cv_header['person_id']);
				
				$subscriber_name = $to;
				$subscriber_number = $supplier_row['supp_ref'];
				$list[] = array('H', $supplier_row['billing_institution_code'], $to, //preg_replace("/\([^)]+\)/","",$to),
										number_format($cv_header['amount'],2,'.',''), $subscriber_name, $subscriber_number, 
										'CV'.get_cv_no($id),'','','','','','','','N','','','',$csv_id);
				
				$csv_details[] = $id;
				$count ++;
				
				// $_SESSION['email_msgs'][] = send_that_cv($cv_header['id'],$cv_header['bank_trans_id']);
			}
			
		}
    }
	
	if ($count == 0)
	{	
		cancel_transaction();
		display_notification("No CV processed");
	}
	else
	{	
		
		$connection = $db_connections[$_SESSION["wa_current_user"]->company];
		list($day, $month, $year) = explode_date_to_dmy(Today());
		
		$file_name = $connection['srs_branch'].'-BatchPayment_'.$csv_id.'_-_'.$month.$day.$year.".csv";
		
		$sql = "UPDATE ".TB_PREF."csv SET csv_file = ".db_escape($file_name)."WHERE id = $csv_id";
		db_query($sql,'failed to update csv header');
		
		$list[] = array('S',$count,number_format($total,2,'.',''),$csv_id,'','','','','','','','','','','','','','','');
	

		$fp = fopen($path_to_root.'/csv/'.$file_name, 'w');

		foreach ($list as $fields) {
			fputcsv($fp, $fields);
		}

		fclose($fp);
		
		foreach ($csv_details as $cv_id)
		{
			$sql = "INSERT INTO ".TB_PREF."csv_details (csv_id, cv_id)
						VALUES ($csv_id,$cv_id)";
			db_query($sql,'failed to insert csv detail');
		}
		
		
		commit_transaction();
		// cancel_transaction();
		display_notification("Processed $count CV(s)");
		meta_forward($_SERVER['PHP_SELF'], "batchpaymentid=$csv_id");
	}
	
}
$op_cvs = array();
if (isset($_POST['show_total']))
{
	global $Ajax;
	
	$prefix = 'for_op';
	
	foreach($_POST as $postkey=>$postval)
    {
		if (strpos($postkey, $prefix) === 0)
		{
			$id = substr($postkey, strlen($prefix));
			$op_cvs[$id][0] = get_cv_view_str($id, $_POST['t_cv_no'.$id]);
			$op_cvs[$id][1] = $_POST['t_cv_supp'.$id];
			$op_cvs[$id][2] = $_POST['t_cv_amt'.$id];
		}
	}
	
	set_focus('show_total');
	$Ajax->activate('total_table');
}

function get_c_details($bank_trans_id)
{
	$sql = "SELECT a.person_type_id, a.person_id, b.*
			FROM 0_bank_trans a, 0_cheque_details b 
			WHERE a.id IN ($bank_trans_id)
			AND a.id = b.bank_trans_id
			ORDER BY chk_number";
	$res = db_query($sql);
	
	return $res;
}

if (isset($_POST['print_cvs']))
{
	$prefix = 'batch_cv_print';
	$ids = array();
	foreach($_POST as $postkey=>$postval)
    {
		if (strpos($postkey, $prefix) === 0)
		{
			$id = substr($postkey, strlen($prefix));
			$ids[] = $id;
		}
	}
	
	if (count($ids) == 0)
	{
		display_error('No Selected CV!');
		return false;
	}
	
	else
	{	
		sort($ids);
		// meta_forward($path_to_root . "/modules/checkprint/real_check_print.php",'ids='.implode(',',$ids));
		// meta_forward($path_to_root . "/modules/checkprint/cv_print.php",'cv_id='.implode(',',$ids));
		echo "<script type='text/javascript'>
				window.open('".$path_to_root . "/modules/checkprint/cv_print.php?",'cv_id='.implode(',',$ids)."',
				'_blank','width=900px,height=600px,scrollbars=0,resizable=no')
				</script>";
	}
	
}

if (isset($_POST['issue_checks']))
{
	$prefix = 'batch_check_issue';
	$ids = array();
	foreach($_POST as $postkey=>$postval)
    {
		if (strpos($postkey, $prefix) === 0)
		{
			$id = substr($postkey, strlen($prefix));
			$ids[] = $id;
		}
	}
	
	if (count($ids) == 0)
	{
		display_error('No Selected CV to issue check!');
		unset($_POST['issue_checks']);
	}
	else // CV's checked
	{
		sort($ids);
		$_SESSION['cv_to_process'] = $ids;
		meta_forward($path_to_root . "/modules/checkprint/check_issue_multiple.php",'New=Yes');
		
		// // meta_forward($path_to_root . "/modules/checkprint/cv_print.php",'cv_id='.implode(',',$ids));
		// echo "<script type='text/javascript'>
				// window.open('".$path_to_root . "/modules/checkprint/cv_print.php?",'cv_id='.implode(',',$ids)."',
				// '_blank','width=400px,height=300px,scrollbars=0,resizable=no')
			// </script>";	
	}
}

//------------------------------------------------------------------------------------------------

$approve_id = find_submit('approve_cv');
if ($approve_id != -1)
{
	//approve CV
	global $Ajax;
	$sql = "UPDATE ".TB_PREF."cv_header SET approved = 1
			WHERE id = $approve_id";
	db_query($sql,'failed to approve CV');
	
	add_audit_trail(99, $approve_id, Today(), 'CV approved');
	$Ajax->activate('trans_tbl');
}

$for_op_id = find_submit('_for_op');
if ($for_op_id != -1)
{
	//tagging 
	for_online_payment_update($for_op_id,check_value('for_op'.$for_op_id));
	set_focus('for_op'.$for_op_id);
}

$check_all_op_id = find_submit('_check_all_op');
if ($check_all_op_id != -1)
{
	global $Ajax;
	//tagging 
	
	$prefix = 'for_check_all_op';
	foreach($_POST as $postkey=>$postval)
    {
		if (strpos($postkey, $prefix) === 0)
		{
			$id = substr($postkey, strlen($prefix));
			for_online_payment_update($id,check_value('check_all_op100'));
		}
	}
	$Ajax->activate('trans_tbl');
}

if (list_updated('check_all_issue'))
{
	// display_error(check_value('check_all_issue'));
	global $Ajax;
	$Ajax->activate('trans_tbl');
}

$due_date_id = find_submit('_due_date_');
if ($due_date_id != -1)
{
	cv_due_date_update($due_date_id,$_POST['due_date_'.$due_date_id]);
}

$email_id = find_submit('email');
if ($email_id != -1)
{
	$r_ = get_cv_header($email_id);
	if (!$r_['email_sent'])
		send_that_cv($email_id,$r_['bank_trans_id']);
	
	unset($_POST['email'.$email_id]);
}
$reemailemail_id = find_submit('reemail');
if ($reemailemail_id != -1)
{
	global $Ajax;
	// $sql = "UPDATE ".TB_PREF."cv_header SET 
				// email_sent = 0
			// WHERE id=$reemailemail_id";
	// db_query($sql,'failed to flag email_sent column to 0');
	$r_ = get_cv_header($reemailemail_id);
	// send_that_cv($reemailemail_id,$r_['bank_trans_id']);
	$Ajax->activate('trans_tbl');
}

//------------------------------------------------------------------------------------------------

start_form();

start_table("class='tablestyle_noborder'");
start_row();

$trans = array(
		'-1' => 'Choose Trans Type',
		'22' => 'Supplier Payment',
		'20' => 'Supplier Invoice',
		'52' => 'Supp Credit Memo',
		'53' => 'Supp Debit Memo',
	);
// label_cells('Trans Type:',array_selector('trans_type', null, $trans));
hidden('trans_type',-1);
// ref_cells('Reference :', 'reference');
ref_cells('CV # :', 'cv_no', null, null, null, true);
supplier_list_cells('Supplier:', 'supplier_id', null, 'All Suppliers');
check_cells('Use Due Date','use_duedate');
date_cells(_("From:"), 'TransAfterDate', '', null, -5);
date_cells(_("To:"), 'TransToDate', '',null);
// check_cells('CV for online processing only','op_cv_only');	
$items = array();
$items['0'] = 'All';
$items['1'] = 'Not yet Approved';
$items['2'] = 'Approved but Pending';
$items['3'] = 'For online payment only';
$items['4'] = 'With Issued Checks only';
$items['5'] = 'Paid Online only';

label_cells('Status:',array_selector('status', null, $items, array() ));

$print = array();
$print['3'] = 'All';
$print['1'] = 'Printed';
$print['2'] = 'Not yet Printed';


// label_cells('Print Status:',array_selector('print_status', null, $print, array() ));

yesno_list_cells('Hide DR: ', 'hide_dr');
submit_cells('Refresh Inquiry', _("Search"),'',_('Refresh Inquiry'), false);

end_row();
end_table();


//------------------------------------------------------------------------------------------------

function get_transactions()
{
    $date_after = date2sql($_POST['TransAfterDate']);
    $date_to = date2sql($_POST['TransToDate']);
	
	// $type = ($_POST['trans_type']);
	$type = -1;
	// $reference = ($_POST['reference']);
	$cv_no = ($_POST['cv_no']);
	// $print_status = $_POST['print_status'];
	
	$u_date = 'x.cv_date';
	
	if (check_value('use_duedate'))
		$u_date = 'x.due_date';
	
	if ($type == -1)
	{
		$add_me = '';
		if ($cv_no != '')
		{
			$sql = "SELECT * FROM ".TB_PREF."cv_header x ";
			$res = db_query($sql);
			
			$where = " WHERE x.cv_no = ".db_escape($cv_no);
			
			if (db_num_rows($res) == 0)
			{
				$add_me = " AND x.cv_no LIKE (".db_escape('%'.$cv_no.'%').")";
				$cv_no = '';
			}
		}
			
		if ($cv_no == '')
		{
			$sql = "SELECT * FROM ".TB_PREF."cv_header x";
			$where = " WHERE $u_date >= '$date_after'
				AND $u_date <= '$date_to' 
				$add_me";
		
			switch($_POST['status'])
			{
				case 0: // all
				break;
				case 1: // not yet approved
					$where .= " AND x.bank_trans_id = 0 AND x.approved = 0 AND x.amount > 0";
				break;	
				case 2: // approved but no check OR not yet tagged for BPS
					$where .= " AND x.bank_trans_id = 0 AND x.approved = 1 AND x.online_payment = 0 AND x.amount > 0
						 AND x.person_id NOT IN (SELECT supplier_id 
								FROM ".TB_PREF."suppliers WHERE billing_institution_code != '')	";
					// CHECK FOR PRINTED CV
					// if ($print_status == 1) // printed CV only
					// {
						// $sql .= " AND cv_printed = 1 AND amount > 0";
					// }
					// else if ($print_status == 2) // printed CV only
					// {
						// $sql .= " AND cv_printed = 0";
					// }
				break;
				case 3: //for online only
					$where .= " AND x.amount > 0
							  AND x.bank_trans_id = 0 AND x.approved = 1
							  AND x.person_id IN (SELECT supplier_id 
								FROM ".TB_PREF."suppliers WHERE billing_institution_code != '')	";
					// CHECK FOR PRINTED CV
					// if ($print_status == 1) // printed CV only
					// {
						// $sql .= " AND cv_printed = 1 AND amount > 0";
					// }
					// else if ($print_status == 2) // printed CV only
					// {
						// $sql .= " AND cv_printed = 0 AND amount > 0";
					// }
				break;
				case 4: // with checks only
					$where .= " AND x.bank_trans_id != 0 AND x.approved = 1 AND x.online_payment = 0";
					// CHECK FOR PRINTED CHECKS
					// if ($print_status == 1) // printed CHECKS only
					// {
						// $sql .= " AND check_printed = 1";
					// }
					// else if ($print_status == 2) // printed CHECKS only
					// {
						// $sql .= " AND check_printed = 0";
					// }
				break;
				case 5: // paid online only
					$where .= " AND x.bank_trans_id != 0 AND x.approved = 1 AND x.online_payment = 2";
					// CHECK FOR PRINTED CHECKS
					// if ($print_status == 1) // printed CHECKS only
					// {
						// $sql .= " AND check_printed = 1";
					// }
					// else if ($print_status == 2) // printed CHECKS only
					// {
						// $sql .= " AND check_printed = 0";
					// }
				break;
			}
		}
		
		if ($_POST['supplier_id'] != '')
			$where .= ' AND x.person_id = '.$_POST['supplier_id'];
		
		// display_error($sql);
		// return db_query($sql.$where,"No supplier transactions were returned");
		return array($sql,$where);
	}
	// else
	// {
		// $sql = "SELECT DISTINCT a.* FROM ".TB_PREF."cv_header a, ".TB_PREF."cv_details b
				// WHERE a.id = b.cv_id
				// AND b.trans_type = $type";
		
		// // if ($reference != '')
			// // $sql .= " AND trans_no IN (".get_ids($type, $reference).")";
		
		// if (check_value('op_cv_only'))
			// $sql .= " AND online_payment = 1";
			
		// // display_error($sql);
		// $res = db_query($sql);
		
		// if (db_num_rows($res) == 0)
		// {	display_error('No CV found for that transaction');
			// return false;
		// }
		
		// return $res;
	// }
}


function get_cwo_po_and_pr($cv_id)
{
$sql = "SELECT * FROM ".TB_PREF."cwo_header WHERE c_cv_id='$cv_id'";
//display_error($sql);	
$res=db_query($sql);
$row=db_fetch($res);

$po_num=$row['c_po_no'];
$pr_num=$row['c_pr_no'];

return array ($po_num,$pr_num);
}
//------------------------------------------------------------------------------------------------

//------------------------------------------------------------------------------------------------

if(get_post('Refresh Inquiry') OR $_POST['cv_no'] != '')
{
	$Ajax->activate('trans_tbl');
	$Ajax->activate('totals_tbl');
}
else if (!get_post('Refresh Inquiry') AND !list_updated('cv_no'))
	display_footer_exit();

if (list_updated('print_all_cv') OR list_updated('print_all_checks'))
{
	global $Ajax;
	$Ajax->activate('trans_tbl');
}

//------------------------------------------------------------------------------------------------
global $systypes_array;
/*show a table of the transactions returned by the sql */

div_start('trans_tbl');

list($sql,$where) = get_transactions();
$result = db_query($sql.$where,"No supplier transactions were returned");

print_hidden_cheque_script();
if (db_num_rows($result) == 0)
{
	display_note(_("There are no transactions to display for the given dates."), 1, 1);
} else
{

	start_table("$table_style2 width=80% align=center");	
		
	$th = array('Receiving#','Status');
	
	if ($_POST['status'] == 3)
		array_push($th, 'For online payment <br>'.checkbox('', 'check_all_op100', null, true, false));
	
	if ($_POST['status'] == 2)
		array_push($th, submit('issue_checks', 'Issue Checks', false, 'Issue Check to tagged CV\s').'<br>'
			.checkbox('', 'check_all_issue', null, true, false));
	
	array_push($th,
			submit('print_cvs', 'Print CVs', false, 'Print checked CV\'s').'<br>'.checkbox('', 'print_all_cv', null, true, false),
			//_("Type"), 
			_("Reference"), _("Payee"),
			_("CV Date"), /*_("Currency"),*/
			_("Amount"));
			
	array_push($th,"GL",'Void', 'Due Date');//,'Send Payment Notification');

	 table_header($th);

	if ($_POST['hide_dr'] == 0)
		$cv_rr = get_all_cv_all_rr($where);
	 
	 $j = 1;
	 $k = 0; //row colour counter
	 
	 while ($myrow = db_fetch($result))
	 {
		$cv_voided = get_voided_entry(ST_CV, $myrow["id"]);
		$date = sql2date($myrow["cv_date"]);
		
		$_POST['due_date_'.$myrow['id']] = sql2date($myrow["due_date"]);
		
		$overdue = date1_greater_date2(Today(), sql2date($myrow["due_date"]));
		if (!$overdue)
			alt_table_row_color($k);
		else{
			start_row("class='overduebg'");
			$due = true;
		}
		

		
		
		//Receiving#----
		// if ($_POST['hide_dr'] == 0)
		// label_cell('<b>'.implode(',',$cv_rr[$myrow["id"]]).'</b>','align=center');
		// else
		// label_cell('<i>hidden</i>','align=center');
		
		
		if ($_POST['hide_dr'] == 0) {
			$rec_no=implode(',',$cv_rr[$myrow["id"]]);
			
			if ($rec_no!=''){
				label_cell('<b>'.$rec_no.'</b>','align=center');
			}
			else {
				$cwo_cv_id=$myrow["id"];
				$cwo_head=get_cwo_po_and_pr($cwo_cv_id);
				
				$cwo_po_no=$cwo_head[0];
				$cwo_pr_no=$cwo_head[1];
			
				if ($cwo_po_no==''){
					label_cell('<b>'.$cwo_pr_no.'</b>','align=center');
				}
				else {
					label_cell('<b>'.'PO'.$cwo_po_no.'</b>','align=center');
				}
			}
		}

		else{
			label_cell('<i>hidden</i>','align=center');
		}
		
		
		if (!$cv_voided)
		{
			if ($myrow['approved'] == 0) // not yet approved
			{
				label_cell('<b>CV For Approval</b>'.(($_SESSION['wa_current_user']->can_approve_cv) ?
				' | '.
				// button('approve_cv'.$myrow['id'], 'approve','Approve this CV', ICON_APPROVE)
				submit('approve_cv'.$myrow['id'], 'Approve', false, 'Approve this CV', true, ICON_APPROVE)
				: '')	, 'nowrap');
				// edit_button_cell("approve_cv".$myrow['id'], _("Approve CV"), false, true)
				// if ($_SESSION['wa_current_user']->can_approve_cv)
					// edit_button_cell("approve_cv".$myrow['id'], _("Approve CV"), false, true);
				// else
					// label_cell('for approval');
					
			}
			else  // approved
			{
				if ($myrow['bank_trans_id'] != 0) // check issued
				{
					$bank_row = get_bank_trans_of_cv($myrow['bank_trans_id']);

					if ($myrow['online_payment'] == 0)
					{
						label_cell('<b>Paid '.
							print_document_cheque_link2($myrow['bank_trans_id'], show_check_details($myrow['bank_trans_id']), true, '')
							.'</b>', 'nowrap');
						// if ($_POST['status'] == 4)
						// {
							// // check_cells('','chk_prnt'.$myrow['bank_trans_id'],
								// // check_value('print_all_checks'),false, '', "align='center'");
							// echo "<td align='left' nowrap>";
							// echo check(null, 'chk_prnt'.$myrow['bank_trans_id'],
								// (isset($_POST['chk_prnt'.$myrow['bank_trans_id']]) ? 1 : check_value('print_all_checks'))
								// ,false, ''). show_check_details($myrow['bank_trans_id']);
							// echo "</td>";
						// }
						// else
							// label_cell();
						// label_cell(print_document_cheque_link2($myrow['bank_trans_id'], _("View Check"), true, ''));
						
					}
					else if ($myrow['online_payment'] == 2)
					{
						if ($myrow["email_sent"] == 0)
							// submit_cells('email'.$myrow["id"], '`e-mail', "nowrap align=right", false, false);
							$email_str = submit('email'.$myrow["id"], 'Send e-mail', false, false, false,ICON_EMAIL);
						else
							// $email_str = submit('reemail'.$myrow["id"], 'Resend e-mail', false, false, false,ICON_EMAIL);
							$email_str = '';
						
						label_cell('<b>Paid Online</b> &nbsp;&nbsp;&nbsp;'.$email_str);
					}
				}
				else // no payment yet
				{
					if ($myrow['online_payment'] == 1)
					{
						$_POST['for_op'.$myrow['id']] = 1;
						label_cell('<b>for Online Payment</b>', 'nowrap');
					}
					else
					{
						unset($_POST['for_op'.$myrow['id']]);
						label_cell('<b>CV Approved</b>', 'nowrap');
					}
					// $check_issue = "$path_to_root/modules/checkprint/check_issue_2.php?" . SID .	 "type_id=" . $myrow["type"] . "&amp;trans_no=" . $myrow["trans_no"];
					if ($_POST['status'] == 3)
					{
						if (supplier_has_billing_institution_code($myrow['person_id']))
						{
							check_cells('','for_op'.$myrow['id'],null,true, '', "align='center'");
							hidden('for_check_all_op'.$myrow['id'],$myrow['id']);
						}
						else
							label_cell('','align=center');
					}// hyperlink_params_td("$path_to_root/modules/checkprint/srs_check_issue.php",'Issue Check','cv_id='.$myrow["id"]);
				}
			}
				
			// check_cells('','batch_cv_print'.$myrow['id'],check_value('print_all_cv'),false, '', "align='center'");
			
			if ($_POST['status'] == 2)
			{
				echo '<td nowrap align=center>';
				check('','batch_check_issue'.$myrow['id'], check_value('check_all_issue'), false, 'tag for multiple check issuance');
				// echo "<a target=blank href='$path_to_root/modules/checkprint/cv_print.php?
					// cv_id=".$myrow["id"]."'onclick=\"javascript:openWindow(this.href,this.target); return false;\">" .
					// _("Print CV") . "&nbsp;</a> ";
				echo '</td>';
			}
			echo '<td nowrap>';
			check('','batch_cv_print'.$myrow['id'], 
				( isset($_POST['batch_cv_print'.$myrow['id']]) ? '1' : check_value('print_all_cv')),false, 'tag for multiple printing');
			
			echo "<a target=blank href='$path_to_root/modules/checkprint/cv_print.php?
				cv_id=".$myrow["id"]."'onclick=\"javascript:openWindow(this.href,this.target); return false;\">" .
				_("Print CV") . "&nbsp;</a> ";
			
			if ($_SESSION["wa_current_user"]->company == 4) // nova only
				echo "| <a target=blank href='$path_to_root/modules/checkprint/cv_print.php?
					cv_id=".$myrow["id"]."&is_belen_tan=0'onclick=\"javascript:openWindow(this.href,this.target); return false;\">" .
					_("Print CV (Belen Tan)") . "&nbsp;</a> ";
			
			echo '</td>';
		}
		else
		{
			label_cell('<font color=red><b>CV VOIDED</b></font>', 'align=left');
			echo '<td nowrap>';
			check('','batch_cv_print'.$myrow['id'], 
				( isset($_POST['batch_cv_print'.$myrow['id']]) ? '1' : check_value('print_all_cv')),false, 'tag for multiple printing');
			echo "<a target=blank href='$path_to_root/modules/checkprint/cv_print.php?
				cv_id=".$myrow["id"]."'onclick=\"javascript:openWindow(this.href,this.target); return false;\">" .
				_("Print CV") . "&nbsp;</a> ";
			echo '</td>';
		}
		
		
		// label_cell('Check Voucher');//$systypes_array[$myrow["type"]]);
		// label_cell(get_trans_view_str($myrow["type"],$myrow["trans_no"]));
		label_cell(get_cv_view_str($myrow["id"], $myrow["cv_no"]));
		hidden('t_cv_no'.$myrow['id'],$myrow["cv_no"]);
		$supp_n = payment_person_name($myrow["person_type"],$myrow["person_id"], false);
		label_cell($supp_n);
		hidden('t_cv_supp'.$myrow['id'],$supp_n);
		label_cell($date);
		//label_cell($myrow["curr_code"]);
		// if (abs($myrow["amount"]) >= 0)
			// label_cell("");
		if (!$cv_voided)
		{
			amount_cell(abs($myrow["amount"]));
			hidden('t_cv_amt'.$myrow['id'],abs($myrow["amount"]));
		}
		else
			amount_cell(get_cv_details_total($myrow["id"]));
		// if (abs($myrow["amount"]) < 0)	
			// label_cell("");

		if ($myrow['bank_trans_id'] != 0)
			label_cell(get_gl_view_str($bank_row["type"], $bank_row["trans_no"]),'align=center');
		else
			label_cell('');
		
		if($_SESSION['wa_current_user']->access == 16 OR $_SESSION['wa_current_user']->access == 6)
			label_cell('');
		else
			{
			if ($myrow['bank_trans_id'] != 0)
			{
				if(($myrow['bank_trans_id'] != 0 AND $myrow['online_payment'] != 2) 
					OR ($_SESSION['wa_current_user']->username == 'admin'))
				{
					$bank_trans_details = get_bank_trans_details($myrow["bank_trans_id"]);
					label_cell("Payment <img style='cursor:pointer' title='Void' src='../../themes/modern/images/remove.png' 
							onclick='openThickBox(".$bank_trans_details['trans_no'].", 
							".$bank_trans_details['type'].",\"".$systypes_array[$bank_trans_details['type']]."\")'>",'nowrap');
				}
				else
					label_cell('disabled');
			}
			else if (get_voided_entry(ST_CV, $myrow["id"]) === false) // add can void CV
				label_cell("CV <img style='cursor:pointer' title='Void' src='../../themes/modern/images/remove.png' 
						onclick='openThickBox(".$myrow["id"].", ".ST_CV.",\"".$systypes_array[ST_CV]."\")'>",'nowrap');
			else
			{
				label_cell('');
			}
		}
		if ($_SESSION['wa_current_user']->can_approve_cv AND ($myrow['bank_trans_id'] == 0) AND !$cv_voided)
		{
			date_cells('', 'due_date_'.$myrow["id"], null, null, 0, 0, 0, 'nowrap', true);
		}
		else
			label_cell(sql2date($myrow["due_date"]),'');
		
		//================================= SENDING of notification thru email
		// if ($myrow['bank_trans_id'] != 0 AND ($myrow['online_payment'] == 1 OR $myrow['online_payment'] == 2))// and supplier_got_email($myrow["person_id"]))
		// {
			// if ($myrow["email_sent"] == 0)
				// submit_cells('email'.$myrow["id"], 'Send e-mail', "nowrap align=right", false, false);
			// else
				// submit_cells('reemail'.$myrow["id"], 'Resend e-mail', "nowrap align=right", false, false);
		// }
		end_row();

		$j++;
		// If ($j == 12)
		// {
			// $j=1;
			// table_header($th);
		// }
	 //end of page full new headings if
	 }
	 
	 $th[1]='';
	 // $th[2]=submit('print_cvs', 'Print CVs', false, 'Print checked CV\'s');
	 
	 // table_header($th);
	 //end of while loop

	 end_table(1);
	 
	 if ($due)
		display_note(_("Highlighted items are due."), 1, 0, "class='overduefg'");

	if ($_POST['status'] == 3)
	{
		submit_center('show_total', "Show/Refresh Total of checked CVs", true, false, false);
		
		div_start('total_table');
		if (isset($_POST['show_total']))
		{
			start_table($table_style2);
				$th_ = array('CV #', 'Supplier', 'Amount');
				table_header($th_);
				
				$k = $op_cv_total = 0;
				foreach($op_cvs as $op_cv)
				{
					$op_cv_total += $op_cv[2];
					alt_table_row_color($k);
					label_cell($op_cv[0]);
					label_cell($op_cv[1]);
					amount_cell($op_cv[2]);
					end_row();
				}
				label_cell('<b>TOTAL:</b>','align=right colspan=2');
				amount_cell($op_cv_total,true);
				
			end_table();
		}
		
		div_end();
		
			
		br();
		submit_center('process_online', "Generate CSV and Notify Supplier", true, false, false);
			echo "<center>* this may take awhile.</center>";
	}
	// else if ($_POST['status'] == 4)
	// {
		// $sql = "SELECT MAX(batch_no) FROM ".TB_PREF."mb_ccws";
		// $res = db_query($sql);
		// $row = db_fetch($res);
		
		// if (!isset($_POST['mb_batch_no']))
			// $_POST['mb_batch_no'] = $row[0]+1;
			
		
		// submit_center_first('print_checks', "Download file for AUB Check Writer", 'Download Excel File', false, 'aub.png');
		// amount_cells_ex('|| Batch No.', 'mb_batch_no', 2, 2, null, null, null, 0);
		// date_cells('Trans Date:', 'transaction_date');
		// submit_center_last('print_checks_metrobank', "Download file for Metrobank Check Writer", 'Download Text File', false, 'mb.png');
	// }

}

// echo '<br>';
// submit_center('print_cvs', "Print checked CV's", true, false, true);

div_end();
end_form();

end_page();
?>
