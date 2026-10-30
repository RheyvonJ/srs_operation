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

require('Numbers/Words.php');

// Get Cheque Number to display
$checkinput = $_POST['PARAM_0'];
$check_bank = $_POST['PARAM_1'];


function get_chk_details($trans_no, $type)
{
	$sql = "SELECT ".TB_PREF."cheque_details.*, ".TB_PREF."bank_trans.*
			FROM ".TB_PREF."cheque_details
			JOIN ".TB_PREF."bank_trans ON ".TB_PREF."cheque_details.bank_trans_id = ".TB_PREF."bank_trans.trans_no
			AND ".TB_PREF."cheque_details.bank_id = ".TB_PREF."bank_trans.id
			WHERE ".TB_PREF."bank_trans.trans_no = $trans_no 
			AND ".TB_PREF."cheque_details.type = ".TB_PREF."bank_trans.type 
			AND ".TB_PREF."cheque_details.type = ".db_escape($type);
	
	$result = db_query($sql,"Failed to retrieve cheque details");
	return db_fetch($result);
}

// Grab Cheque Information

$receipt = get_trans_from_check_2($checkinput, $check_bank);
$chk_row = get_chk_details($receipt['trans_no'], $receipt['type']);

$company_currency = get_company_currency();

$show_currencies = false;
$show_both_amounts = false;

if (($receipt['bank_curr_code'] != $company_currency) || ($receipt['SupplierCurrCode'] != $company_currency))
	$show_currencies = true;

if ($receipt['bank_curr_code'] != $receipt['SupplierCurrCode'])
{
	$show_currencies = true;
}

// now the print
$nw = new Numbers_Words();

$cheque = new FrontReport("CHEQUE NO.", "cheque.pdf", 'SRS_CV', 10);
$cheque->Font();
$cheque->lineHeight = 16;

$cheque->row = $cheque->pageHeight - $cheque->topMargin;

$cheque->row -= 47;
//------------------------ col - row - spec's ------------
$col0 				= 45;		// the first column
$col1 				= 248;
$col3 				= 480;
$col4 				= 380;
$col5 				= 455;
$col6 				= 145;
$col_right = $cheque->pageWidth - $cheque->rightMargin;
$width_col0 = $col_right - $col0;
$width_col1 = $col_right - $col1;
$width_col3 = $col_right - $col3;
$width_col4 = $col_right - $col4;
$width_col5 = $col_right - $col5;
$width_normal 		= 200;

$row_address		= $cheque->pageHeight - 177;
$row_first_stub 	= $row_address - 149; 	// first spec. for the payment
$row_second_stub 	= $row_address - 380; 	// second spec. for the payment

$gap 				= 15; 	// space between the spaced date and spec
//-------------------------------------------------------
// $cheque->AddImage($path_to_root . "/reporting/images/cv.png", 0, $cheque->pageHeight, 612);
//**********************************************************************
$cheque->TextWrap(85,323,320, payment_person_name($receipt['person_type_id'],$receipt['person_id'], false),  'left');
$cheque->TextWrap(85+360,323,100,sql2date($receipt['trans_date']), 'left');

$alloc_result = get_allocatable_to_supp_transactions($receipt['person_id'], $receipt['trans_no'], ST_SUPPAYMENT);

$total_allocated = 0;
$cheque->row = 323;
$cheque->Newline();

while ($alloc_row = db_fetch($alloc_result))
{
	$cheque->Newline();

	$alloc_row['amt'] = round2($alloc_row['amt'], user_price_dec());
	
	$add_text = '';
	
	if ($alloc_row['supp_reference'] != '')
		$add_text = "  -  SI # " . $alloc_row['supp_reference'];
	
	$cheque->TextWrap(41,$cheque->row,100,sql2date($alloc_row['tran_date']), 'left');
	$cheque->TextWrap(110,$cheque->row,250,$systypes_array[$alloc_row['type']]. ' # '.$alloc_row['reference'] . $add_text, 'left');
	$cheque->TextWrap(380,$cheque->row,150,number_format2($alloc_row['amt'],2), 'right');
	
	$total_allocated += $alloc_row['amt'];
	
}
$cheque->font('b');
$cheque->TextWrap(380,120,150,number_format2($total_allocated,2), 'right');
$cheque->font('');

$cheque->TextWrap(410,71,157,$receipt['bank_name'],'left');
$cheque->TextWrap(410,71-11,157,$chk_row['chk_number']);
$cheque->TextWrap(410,71-11-12,157,sql2date($chk_row['chk_date']));

$gl_res = get_gl_trans(ST_SUPPAYMENT, $receipt['trans_no'], true);

$cheque->row = 119;
$cheque->Newline();

while ($gl_row = db_fetch($gl_res))
{
	$cheque->row -= 14;
	
	$adder = 0;
	
	if ($gl_row['amount'] < 0)
		$adder = 100;
	
	$cheque->TextWrap(41,$cheque->row,109,$gl_row['account_name'], 'left');
	$cheque->TextWrap(154+$adder,$cheque->row,100,number_format2(abs($gl_row['amount']),2), 'right');
	// $cheque->TextWrap(41,$cheque->row,100,$gl_row['amount'], 'left');
	
}


//**********************************************************************
$cheque->End();

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
	{  /*chop off the time stuff */
		$day = substr($day, 0, 2);
	}
	if ($date_system == 1)
		list($year, $month, $day) = gregorian_to_jalali($year, $month, $day);
	elseif ($date_system == 2)
		list($year, $month, $day) = gregorian_to_islamic($year, $month, $day);

	return $day.$month.$year;
}

?>