<?php

$page_security = 'SA_CHECKPRINT';
// ----------------------------------------------------------------
// $ Revision:	1.0 $
// Creator:	Tu Nguyen
// date_:	2008-08-04
// Title:	Print CPA Cheques (Canadian Pre-printed Standard)
// ----------------------------------------------------------------

$path_to_root="../..";

include($path_to_root . "/includes/session.inc");
add_access_extensions();
include($path_to_root . "/modules/checkprint/includes/check_accounts_db.inc");
$path_to_root="../../";

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
	
	$Prefix = 'C'; 														//1
	$Vendor_Code = str_pad($receipt["person_id"], 10);					//10
	$Payee_Name = str_pad('', 50);										//50
	$Check_Amount = str_pad($sampleamount, 15, "0", STR_PAD_LEFT);		//15
	$Check_Date = $date__[1].$date__[0].$date__[2];						//8
	$TIN = str_pad('X1', 8);											//8
	$Purpose_of_Check = str_pad('', 50);								//50
	$Buffer = str_pad($pay_to, 250);									//250 new pay to
	
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
		$inv_no = str_pad(substr($inv_no,0,15), 15);
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

ob_end_clean();
ob_start();

$batch_id = $_GET['batch_id'];

$sql = "SELECT DATE(stamp), batch_no FROM ".TB_PREF."check_issue_batch WHERE id = $batch_id";
$res = db_query($sql);
$header = db_fetch($res);

$sql = "SELECT bank_trans_id FROM ".TB_PREF."check_issue_batch_cv 
		WHERE batch_id = $batch_id";
// echo $sql;die;
$res = db_query($sql);
$ids = array();
while($row = db_fetch($res))
{
	$ids[] = $row[0];
}

$batch_no = $header['batch_no'];
$tran_date_ = explode_date_to_dmy(sql2date($header[0]));
$tran_date = $tran_date_[1].$tran_date_[0].$tran_date_[2];

echo "MBTC-CCWS". "$tran_date-$batch_no" . PHP_EOL;
// display_error($ids[0]);

$res = get_c_details(implode(',',$ids));
// display_error(db_num_rows($res));
while($receipt = db_fetch($res))
{	
	$c_amt_ = $receipt['chk_amount'];
	$cv_header = get_cv_header_by_bank_trans_id($receipt['bank_trans_id']);
	echo create_check_info($receipt,$cv_header);
	echo create_check_voucher_info($receipt,$cv_header,$c_amt_);
	
	if ($cv_header['ewt'] != 0)
	{
		$tran_date = explode_date_to_dmy(
			sql2date($cv_header['cv_date']));
			
		$inv_amount = number_format(-$cv_header['ewt'], 2, '', '');
			
		$reference = str_pad('EWT', 16);
		$cv_no = str_pad($cv_header['cv_no'], 15);
		$inv_no = str_pad(substr('',0,15), 15);
		$inv_date = $tran_date[1].$tran_date[0].$tran_date[2];
		$inv_amount = str_pad($inv_amount, 21, "0", STR_PAD_LEFT);
		$dmcm_amount = str_pad('0', 21, "0", STR_PAD_LEFT);
		$tax_amount = str_pad('0', 21, "0", STR_PAD_LEFT);
		$amount_paid = str_pad('', 21, "0", STR_PAD_LEFT); // compute positive - negative
		$Buffer = '';
		
		echo 'V'.$reference.$cv_no.$inv_no.$inv_date.$inv_amount.$dmcm_amount.$tax_amount.$amount_paid.$Buffer.PHP_EOL;
	}
}

$output = ob_get_clean();
global $db_connections;
header('Content-disposition: attachment; filename='.strtoupper($db_connections[$_SESSION['wa_current_user']->company]
		['srs_branch']).'_CCWS_'.$batch_no.'.txt');
header('Content-type: text/plain');

echo $output;
exit();

