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


// Grab Cheque Information

$receipt = get_trans_from_check($checkinput, $check_bank);

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

$cheque = new FrontReport("CHEQUE NO.", "cheque.pdf", user_pagesize(), 10);
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
$cheque->TextWrap($col4, $cheque->row, $width_normal, $cheque->title);
$cheque->TextWrap($col4, $cheque->row, $width_col4, $checkinput, "right");

$cheque->NewLine();

$cheque->TextWrap($col4, $cheque->row, 50, "DATE");

$cdate = sql2checkdate($receipt['tran_date']);
$ddate = "DDMMYYYY";

for ($i = 0, $col = $col5; $i < 8; $col += $gap, $i++)
	$cheque->TextWrap($col, $cheque->row, $gap - 1, $cdate[$i]);

$cheque->lineHeight = 12;
$cheque->NewLine();
for ($i = 0, $col = $col5; $i < 8; $col += $gap, $i++)
	$cheque->TextWrap($col, $cheque->row, $gap - 1, $ddate[$i]);

$cheque->lineHeight = 22;
$cheque->NewLine();

$sampleamount = number_format(-$receipt['BankAmount'], 2, '.', '');

$amounttotal = reformat_num($nw->toWords(floor($sampleamount)));
$amountfrac = intval(($sampleamount - floor($sampleamount)) * 100);
setlocale(LC_MONETARY, $cheque->l['a_meta_language']);
$themoney = (($show_currencies) ? 'US' : '').'$**'.number_format($sampleamount, 2, '.', ',');

$amount = "**".ucwords($amounttotal)." and ".(($amountfrac < 10) ? '0' : '').$amountfrac."/100";
$cheque->TextWrap($col0, $cheque->row, $width_col0, $amount);

$cheque->TextWrap($col0, $cheque->row, $width_col0, $themoney, "right");
$cheque->lineHeight = 13;
$cheque->NewLine();
if ($show_currencies)
	$cheque->TextWrap($col0, $cheque->row, $width_col0, "Amount in United States Dollars");

$cheque->row = $row_address;
$cheque->lineHeight = 12;
$cheque->TextWrapLines($col0, $width_col0, $receipt['supplier_name'] . "\n" .$receipt['SupplierAddress']);

$dotadd = 40;

$cheque->lineHeight = 16;

for ($i = 0; $i < 2; $i++)
{
	// First Stub
	$cheque->row = ($i == 0 ? $row_first_stub : $row_second_stub);

	$cheque->TextWrap($col0, $cheque->row, $width_col0, $receipt['supplier_name']);
	$cheque->TextWrap($col1, $cheque->row, $width_col1, sql2date($receipt['tran_date']));
	$cheque->TextWrap($col3, $cheque->row, 93, $checkinput);

	$cheque->NewLine();

	// Get allocations (shows supplier references on invoices and its amount) (Two columns).
	if ($i == 0)
		$supplierrefs = get_allocatable_to_supp_transactions($receipt['supplier_id'], $receipt['trans_no'],22);

	$totalallocated = 0;
	$totallines = 0;
	if ($i == 1)
		db_seek($supplierrefs, 0);

	while ($alloc_row = db_fetch($supplierrefs))
	{
		$theamout = number_format($alloc_row['amt'], 2, '.', ',');
		/*$dotadd = ($col0 - (strlen($alloc_row['supp_reference']) + strlen($theamout)));
		$dotadd = ($dotadd < 0) ? 0 : $dotadd;*/
		$cheque->TextWrap($col0, $cheque->row, 100, $alloc_row['supp_reference'] . " " . str_repeat('.',$dotadd));
		$tcol = $col6;
		$cheque->TextWrap($tcol, $cheque->row, 50, number_format($alloc_row['amt'], 2), "right");
		if ($show_currencies)
			$cheque->TextWrap($tcol += 55, $cheque->row, 50, $receipt['SupplierCurrCode']);
		if ($alloc_row['Total'] != $alloc_row['amt'])
			$cheque->TextWrap($tcol += 55, $cheque->row, $width_normal, " (Left to allocate ".
				number_format($alloc_row['Total'] - $alloc_row['amt'], 2, '.', '.').")");
		$totalallocated += $alloc_row['amt'];
		$totallines++;
		$cheque->lineHeight = 12;
		$cheque->NewLine();
	}
	$cheque->lineHeight = 16;
	if ($i == 0)
	{
		if ($totallines > 16)
		{
				$errorpdf = new FrontReport("ERROR", "cheque.pdf", user_pagesize(), 10);
				$errorpdf->Font();
				$errorpdf->TextWrap($col0, $errorpdf->row, $width_col0, "Error: Currently cannot allocate more than 16 invoices per payment.");
				$errorpdf->End();
				return;
		}

		// Get allocations that are left
		$allocationleft = $sampleamount - $totalallocated;

		//if (!$supplierrefs || db_num_rows($supplierrefs) == 0 || $allocationleft > 0)
		if (!$supplierrefs || db_num_rows($supplierrefs) == 0)
		{
			$errorpdf = new FrontReport("ERROR", "cheque.pdf", user_pagesize(), 10);
			$errorpdf->Font();
			$errorpdf->TextWrapLines($col0, $width_col0, "Error: Payment allocations missing / incomplete for this payment.\n" .
				number_format($allocationleft, 2, '.', ',') . " left to allocate.");
			$errorpdf->End();
			return;
		}
	}
}
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