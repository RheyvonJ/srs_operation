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
include_once($path_to_root . "/purchasing/includes/db/suppalloc_db.inc");
$path_to_root="../../";
define('K_PATH_FONTS', "../../reporting/fonts/");
include_once($path_to_root . "reporting/includes/excel_report.inc");
// include_once($path_to_root . "reporting/includes/pdf_report.inc");
// include_once ($path_to_root . "includes/db/comments_db.inc");

require('Numbers/Words.php');

function reformat_num($totalword) {
	$search = array('-one','-two','-three','-four','-five','-six','-seven','-eight','-nine');
	$replace = array(' One',' Two',' Three',' Four',' Five',' Six', ' Seven', ' Eight',' Nine');
	return str_replace($search,$replace,$totalword);
}

function sql2checkdate($date_)
{
	global $date_system;

	//for MySQL dates are in the format YYYY-mm-dd
	if ($date_ == null || strlen($date_) == 0)
		return "";

	if (strpos($date_, "/"))
	{ // In MySQL it could be either / or -
		list($year, $month, $day) = explode("/", $date_);
	}
	elseif (strpos ($date_, "-"))
	{
		list($year, $month, $day) = explode("-", $date_);
	}

	if (strlen($day) > 4)
	{ 
		$day = substr($day, 0, 2);
	}
	if ($date_system == 1)
		list($year, $month, $day) = gregorian_to_jalali($year, $month, $day);
	elseif ($date_system == 2)
		list($year, $month, $day) = gregorian_to_islamic($year, $month, $day);

	return $day.$month.$year;
}

function get_check_trans_details($checkinput, $check_bank)
{
	$sql = "SELECT * FROM ".TB_PREF."check_trans
			WHERE cheque_bank_id = $check_bank
			AND check_ref = ". db_escape($checkinput);
	$res = db_query($sql,'failed to get check trans type');

	$row = db_fetch($res);
	
	return $row;
	
}

function get_check_trans_no($id)
{
	$sql = "SELECT trans_no FROM ".TB_PREF."bank_trans
			WHERE id = $id";
	$res = db_query($sql,'failed to get bank trans trans_no');
	$row = db_fetch($res);
	
	return $row[0];
	
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

// function get_payee_code($payee)
// {
	// $sql = "SELECT aub_supplier_code 
			// FROM ".TB_PREF."supplier_aub_check
			// WHERE supplier_name = ".db_escape($payee);
	// $res = db_query($sql);
	
	// if (db_num_rows($res) == 0)
		// return '';
	
	// $row = db_fetch($res);
	// return $row[0];
// }
/*
==============================================
=== CHECK
==============================================
*/
if (isset($_GET['ids'])) 
	$_POST['PARAM_0'] = $_GET['ids'];
else if(isset($_GET['batch_id']))
{
	$sql = "SELECT * FROM ".TB_PREF."check_issue_batch_cv
			WHERE batch_id = ".$_GET['batch_id'];
	$res = db_query($sql);
	
	$param_0 = array();
	while($row = db_fetch($res))
	{
		$param_0[] = $row['bank_trans_id'];
	}
	$_POST['PARAM_0'] = implode(',',$param_0);
}
else
	return false;
// $check_bank = $_POST['PARAM_1'];

$nw = new Numbers_Words();

$input = explode(',',$_POST['PARAM_0']);

// flag checks as printed
$sql = "UPDATE ".TB_PREF."cv_header SET
			check_printed = 1
		WHERE bank_trans_id IN (".$_POST['PARAM_0'].")
		AND bank_trans_id != 0";
// echo $sql;die;
db_query($sql,'failed to flag check as printed');
//==================================

$sql_ = "SELECT batch_no FROM ".TB_PREF."check_issue_batch
		WHERE id = ".$_GET['batch_id'];
$res_ = db_query($sql_);
$row_ = db_fetch($res_);

$cheque = new FrontReport("CHECK_IMPORT", "check_import", 'LETTER',9,'P',NULL, 6.5, 'AUB_Batch_'.$row_[0]);
$trigger=false;

$com = get_company_prefs();

$cheque->sheet->writeString($cheque->y, 0, 'Check Uploads');
$cheque->y +=2;

$headers = array('Reference No.', 'Reference Type', 'Check Type', 'Check Date', 'Check No.', 'Payee Code',
			'Payee Name', 'Amount', 'Note', '1st Signatories Code',	'1st Signatories Name',	'2nd Signatories Code',
			'2nd Signatories Name',	'Prepared by', 'Approved by', 'Particulars Desc.', 'Particulars Amt.',
			'Doc. Date', 'Doc. No.', 'Gross Amount',	'EWT', 'VAT', 'Net Amount',	'Account No.', 'Acct. Title',
			'Debit', 'Credit', 'Doc. No', 'Voucher No');

			
$cheque->sheet->setColumn(0,2,9);
$cheque->sheet->setColumn(3,5,11);
$cheque->sheet->setColumn(6,6,27);
$cheque->sheet->setColumn(7,7,11);

foreach ($headers as $ind => $title)
		$cheque->sheet->writeString($cheque->y, $ind, $title, $cheque->formatLeft);
		
// foreach($input as $checkinput) //bank trans id
// {
$res = get_c_details($_POST['PARAM_0']);

while($receipt = db_fetch($res))
{
	$cheque->y ++;
	
	$payee = '';
	
	$to = payment_person_name($receipt["person_type_id"],$receipt["person_id"],false);
	
	
	
	$sampleamount = number_format($receipt['chk_amount'], 2, '.', '');
	$amountfrac = intval(($sampleamount - floor($sampleamount)) * 1000);
	$amountfrac = number_format2($amountfrac/10);

	$themoney = number_format2($sampleamount, 2);
	$date__ = sql2date($receipt['chk_date']);
	
	$pay_to = $receipt['pay_to'];
	
	if ($pay_to == '')
	{
		$pay_to = preg_replace("/\([^)]+\)/","",$to);
	}
	
	$pay_to = html_entity_decode(html_entity_decode($pay_to));
	
	$a = '';
	$b = '';
	$c = 'CC';
	$d = $date__; //check_date
	$e = $receipt['chk_number']; //check number
	// $f = get_payee_code($to);
	$f = $receipt["person_id"];
	$g = $pay_to;
	$h = $sampleamount;
	$ijklm = '';
	$no = "ADMIN";
	$p = '';
	$q = '0.00';
	$r = '  /  /    ';
	$s = '';
	$tuvw = '0.00';
	$xy = '';
	$zAA = '0.00';
	$ABAC = '';
	
	$cheque->sheet->writeString($cheque->y, 0, $a, $cheque->formatLeft);
	$cheque->sheet->writeString($cheque->y, 1, $b, $cheque->formatLeft);
	$cheque->sheet->writeString($cheque->y, 2, $c, $cheque->formatLeft);
	$cheque->sheet->writeString($cheque->y, 3, $d, $cheque->formatLeft);
	$cheque->sheet->writeString($cheque->y, 4, $e, $cheque->formatLeft);
	$cheque->sheet->writeString($cheque->y, 5, $f, $cheque->formatLeft);
	$cheque->sheet->writeString($cheque->y, 6, $g, $cheque->formatLeft);
	$cheque->sheet->writeString($cheque->y, 7, $h, $cheque->formatLeft);
	$cheque->sheet->writeString($cheque->y, 8, $ijklm, $cheque->formatLeft);
	$cheque->sheet->writeString($cheque->y, 9, $ijklm, $cheque->formatLeft);
	$cheque->sheet->writeString($cheque->y, 10, $ijklm, $cheque->formatLeft);
	$cheque->sheet->writeString($cheque->y, 11, $ijklm, $cheque->formatLeft);
	$cheque->sheet->writeString($cheque->y, 12, $ijklm, $cheque->formatLeft);
	$cheque->sheet->writeString($cheque->y, 13, $no, $cheque->formatLeft);
	$cheque->sheet->writeString($cheque->y, 14, $no, $cheque->formatLeft);
	$cheque->sheet->writeString($cheque->y, 15, $p, $cheque->formatLeft);
	$cheque->sheet->writeString($cheque->y, 16, $q, $cheque->formatLeft);
	$cheque->sheet->writeString($cheque->y, 17, $r, $cheque->formatLeft);
	$cheque->sheet->writeString($cheque->y, 18, $s, $cheque->formatLeft);
	$cheque->sheet->writeString($cheque->y, 19, $tuvw, $cheque->formatLeft);
	$cheque->sheet->writeString($cheque->y, 20, $tuvw, $cheque->formatLeft);
	$cheque->sheet->writeString($cheque->y, 21, $tuvw, $cheque->formatLeft);
	$cheque->sheet->writeString($cheque->y, 22, $tuvw, $cheque->formatLeft);
	$cheque->sheet->writeString($cheque->y, 23, $xy, $cheque->formatLeft);
	$cheque->sheet->writeString($cheque->y, 24, $xy, $cheque->formatLeft);
	$cheque->sheet->writeString($cheque->y, 25, $zAA, $cheque->formatLeft);
	$cheque->sheet->writeString($cheque->y, 26, $zAA, $cheque->formatLeft);
	$cheque->sheet->writeString($cheque->y, 27, $ABAC, $cheque->formatLeft);
	$cheque->sheet->writeString($cheque->y, 28, $ABAC, $cheque->formatLeft);	
}

$cheque->close();
// first have a look through the directory, 
// and remove old temporary pdfs
if ($d = @opendir($cheque->path)) {
	while (($file = readdir($d)) !== false) {
		if (!is_file($cheque->path.'/'.$file) || $file == 'index.php') continue;
		// then check to see if this one is too old
		$ftime = filemtime($cheque->path.'/'.$file);
		// seems 3 min is enough for any report download, isn't it?
		if (time()-$ftime > 180){
			unlink($cheque->path.'/'.$file);
		}
	}
	closedir($d);
}
// meta_forward($_SERVER['PHP_SELF'], "xls=1&filename=$this->filename&unique=$this->unique_name");
meta_forward($path_to_root.'/company/'.$_SESSION["wa_current_user"]->company.'/pdf_files/'.$cheque->unique_name);
	
	// $_SESSION["wa_current_user"]->company
exit();

?>