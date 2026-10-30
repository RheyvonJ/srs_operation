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
include_once($path_to_root . "/reporting/includes/pdf_report.inc");
include_once($path_to_root . "/gl/includes/db/gl_db_cv.inc");

require('Numbers/Words.php');

// Get Cheque Number to display
// $bank_trans_id = $_GET['show_gl'];

$ids = explode(',',$_GET['cons_id']);


$xcx = 0;

foreach($ids as $id)
{
	$xcx++;
	$cheque->pageNumber = 0;
	
	if($xcx != 1)
		$cheque->newPage();
		
		print_consignment_transactions($id);
		
		
}


function get_vendor_cons_sale($cons_id)
{
$sql="select * from ".TB_PREF."cons_sales_details where cons_det_id='".$cons_id."'";
$res=db_query($sql);
return $res;
}

function get_vendor_cons_header($cons_id)
{
$sql="select * from ".TB_PREF."cons_sales_header where cons_sales_id='".$cons_id."'";
$res=db_query($sql);
return $res;
}

function get_vendor_details($vendorcode)
{
	$sql = "SELECT * FROM vendor
			WHERE vendorcode = '$vendorcode'";
	$res =  ms_db_query($sql);
	$row = mssql_fetch_array($res);
	return $row;
}
function get_vendor_commission($vendorcode)
{
	$sql = "SELECT reordermultiplier FROM vendor
			WHERE vendorcode = '$vendorcode'";
	$res =  ms_db_query($sql);
	$row = mssql_fetch_array($res);
	return $row;
}

function print_consignment_transactions($cons_id)
{
	global $path_to_root, $systypes_array, $systypes_array_short;

	$dim = get_company_pref('use_dimension');
	$dimension = $dimension2 = 0;

	$from = $_POST['PARAM_0'];
	$to = $_POST['PARAM_1'];
	$trade = $_POST['PARAM_2'];
	$vat = $_POST['PARAM_3'];
	$rba = $_POST['PARAM_4'];// 1 0 2
	$destination = $_POST['PARAM_5'];
	
	$rba_str = 'ALL';
	
	if ($destination)
		include_once($path_to_root . "/reporting/includes/excel_report.inc");
	else
		include_once($path_to_root . "/reporting/includes/pdf_report.inc");

	$rep = new FrontReport(_('Consignment Sales Report'), "ConsReport", user_pagesize(),9 ,'L');
	$dec = user_price_dec();

	$cols = array(0, 110, 360, 430, 500, 570,650,650);
	$aligns = array( 'left', 'left', 'left', 'left', 'left', 'left','left','left');
	$headers = array('Product Code', 'Description', 'UOM','Quantity', 'Sales','CostOfSales','Commission');
	//'Discount', 

	$res=get_vendor_cons_header($cons_id);
	$row=db_fetch($res);
	$from=$row['start_date'];
	$to=$row['end_date'];
	$id=$row['cons_sales_id'];
	$supp_name=$row['supp_name'];
	$purchaser_name=$row['purchaser_name'];
	//$ms_row=get_vendor_commission($row['supp_code']);
	$commission=$row['t_commission'];
	$params =   array( 	0 => $comments,
    				    1 => array('text' => _('Period'), 'from' => sql2date($from), 'to' => sql2date($to)),
    				    2 => array('text' => _('Commission'), 'from' => $commission.'%'),
    				    3 => array('text' => 'Consignor','from' => $supp_name),
    				    4 => array('text' => 'Reference','from' => 'CS'.$id),
						);
						
	$rep->Font();
	$rep->Info($params, $cols, $headers, $aligns);
	$rep->Header();
	

	$cons_details = get_vendor_cons_sale($cons_id);
	
	$details = array();
	while ($cons_row = db_fetch($cons_details))
	{
		$rep->TextCol(0, 1,$cons_row['prod_code']);
		$rep->TextCol(1, 2, $cons_row['description']);
		$rep->TextCol(2, 3, $cons_row['uom']);
		$rep->AmountCol(3, 4, $cons_row['qty'],2);
		$rep->AmountCol(4, 5, $cons_row['sales'],2);
		$rep->AmountCol(5, 6, $cons_row['cos'],2);
		$rep->AmountCol(7, 8, $subt_commision=$cons_row['sales']*($commission/100),2);
		$rep->NewLine();
		
		$t_commision+=$subt_commision;
		$t_qty+=$cons_row['qty'];
		$t_sales+=$cons_row['sales'];
		$t_cos+=$cons_row['cos'];
		
	}
	
	$rep->Font('bold');
	$rep->NewLine();
		$rep->TextCol(0, 1,'');
		$rep->TextCol(1, 2, '');
		$rep->TextCol(2, 3, 'TOTAL:');
		$rep->AmountCol(3, 4, $t_qty,2);
		$rep->AmountCol(4, 5, $t_sales,2);
		$rep->AmountCol(5, 6, $t_cos,2);
		$rep->AmountCol(7, 8, $t_commision,2);
	$rep->NewLine(2);
		$payable=round($t_sales,2)-round($t_commision,2);
		$rep->TextCol(0, 8,"*NOTE: (Please create invoice amounting to ".number_format($payable,2).").");
		
		$rep->NewLine(3);
		$rep->TextCol(1, 2,"Requested by:");
		$rep->TextCol(2, 4,"Noted by:");
		$rep->TextCol(5, 6,"Approved by:");

		$rep->NewLine(3);
		$rep->TextCol(1, 2,$purchaser_name);
		$rep->TextCol(2, 4,"ROWENA VILLAR");
		$rep->TextCol(5, 6,"DUSTIN UY");
	$rep->End();
}

//===============================================================================================================================================================

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