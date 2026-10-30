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
include_once($path_to_root . "reporting/includes/pdf_report.inc");
include_once ($path_to_root . "includes/db/comments_db.inc");

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

function get_check_pay_to($bank_trans_id)
{
	$sql = "SELECT pay_to FROM ".TB_PREF."cheque_details
			WHERE bank_trans_id = $bank_trans_id";
	$res = db_query($sql);
	$row = db_fetch($res);
	return $row[0];
}
/*
==============================================
=== CHECK
==============================================
*/
if ($_GET['ids'] != '') 
	$_POST['PARAM_0'] = $_GET['ids'];
$check_bank = $_POST['PARAM_1'];
$nw = new Numbers_Words();

$input = explode(',',$_POST['PARAM_0']);
//$cheque->TextWrap(60,60, 70, $input);
$cheque = new FrontReport("CHEQUE NO.", "cheque.pdf", 'AUB_CHECK', 10);
$trigger=false;

foreach($input as $checkinput)
{
	// $trans_type = get_check_trans_details($checkinput, $check_bank);
	$receipt = get_bank_trans_of_cv($checkinput);
	
	if($trigger==false){
		$trigger=true;
	}else{
		$cheque->addPage();
	}
		
	// Grab Cheque Information
	$payee = '';
	$cheque->Font();
	$cheque->lineHeight = 16;

	$to = payment_person_name($receipt["person_type_id"],$receipt["person_id"],false);
	
	$pay_to = get_check_pay_to($checkinput);
	
	if ($pay_to == '')
		$pay_to = preg_replace("/\([^)]+\)/","",$to);
	
	// if ($trans_type['pay_to'] != '')
		// $to = $trans_type['pay_to'];
	
	// $cheque->AddImage($path_to_root.'reporting/images/sample_check.png', 0, 0, $cheque->pageWidth, $cheque->pageHeight);
	
	//------------------------------------------------------------------------------------------------------------------------------------
	$sampleamount = number_format(-($receipt['amount']), 2, '.', '');
	// $sampleamount = 7777777.77;
	
	$amounttotal = reformat_num($nw->toWords(floor($sampleamount)));
	$amountfrac = intval(($sampleamount - floor($sampleamount)) * 1000);
	$amountfrac = number_format2($amountfrac/10);

	setlocale(LC_MONETARY, $cheque->l['a_meta_language']);
	$themoney = number_format2($sampleamount, 2);

	$amount = "***".ucwords($amounttotal) . ' pesos';
	if ($amountfrac != 0)
	{
		// $amount .= ' and ' . reformat_num($nw->toWords(floor($amountfrac))).' centavos';
		$amount .= ' and ' . $amountfrac .'/100';
	}
	$amount .= '***';
	//------------------------------------------------------------------------------------------------------------------------------------
	// $cheque->Rotate(90);
	$date__ = sql2date($receipt['trans_date']);
	
	$thedate = date('d-M-Y', strtotime($date__));
	
	$cheque->TextWrap(460 , 169, 70, '**'.$thedate.'**', 'left');
	// $cheque->Rotate(0);
	// $cheque->StopTransform();
	
	// $cheque->StartTransform();
	// $cheque->Rotate(90,67,$cheque->pageHeight-80);
	$cheque->TextWrap(75, 148, 366,  '**'.$pay_to.'**');
	// $cheque->StopTransform();

	// $cheque->StartTransform();
	// $cheque->Rotate(90,67,$cheque->pageHeight-465);
	$cheque->TextWrap(460, 148, 94, '**'.$themoney.'**','left');
	// $cheque->TextWrap(66, 465, 150, $themoney);
	// $cheque->StopTransform();
	
	// $cheque->StartTransform();
	// $cheque->Rotate(90,93,$cheque->pageHeight-60);
	$cheque->TextWrap(57, 122	, 500, strtoupper($amount));
	// $cheque->TextWrap(92, 60, 410,  strtoupper($amount), 'left');
	// $cheque->StopTransform();
	// $cheque->Rotate(0);
	
	
}

$cheque->End();
?>