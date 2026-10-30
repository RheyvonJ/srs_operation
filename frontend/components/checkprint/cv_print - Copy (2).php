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

function get_chk_details($trans_no, $type)
{
	$sql = "SELECT ".TB_PREF."cheque_details.*, ".TB_PREF."bank_trans.*
			FROM ".TB_PREF."cheque_details
			JOIN 0_bank_trans ON 0_cheque_details.bank_trans_id = 0_bank_trans.id
			AND 0_cheque_details.bank_id = 0_bank_trans.bank_act
			WHERE ".TB_PREF."bank_trans.trans_no = $trans_no 
			AND ".TB_PREF."cheque_details.type = ".TB_PREF."bank_trans.type 
			AND ".TB_PREF."cheque_details.type = ".db_escape($type);
	
	$result = db_query($sql,"Failed to retrieve cheque details");
	return ($result);
}

function cv_print_header()
{
	global $cv_header, $cheque, $db_connections, $path_to_root, $id;
	
	$cheque->pageNumber++;
	
	if ($cheque->pageNumber > 1)
	{
		$cheque->newPage();
		
		if(get_voided_entry(ST_CV, $id))
			$cheque->AddImage($path_to_root . "/reporting/images/cv_blank_void.png", 0, $cheque->pageHeight, 612);
		else if($cv_header['online_payment'] == 2)
			$cheque->AddImage($path_to_root . "/reporting/images/cv_blank_ol.png", 0, $cheque->pageHeight, 612);
		else
			$cheque->AddImage($path_to_root . "/reporting/images/cv_blank.png", 0, $cheque->pageHeight, 612);
			
		// $cheque->AddImage($path_to_root . "/reporting/images/cv_blank.png", 0, $cheque->pageHeight, 612);	
		$cheque->TextWrap(85+360+60,325+50,70,'page '.$cheque->pageNumber, 'right');
		$cheque->fontSize --;
		$cheque->fontSize ++;
		
		$prepared_by_sql = "SELECT user, date(stamp) FROM ".TB_PREF."audit_trail 
										WHERE type = 99 
										AND trans_no = $id
										AND description = 'CV created'";
		$prepared_by_res = db_query($prepared_by_sql);
		if (db_num_rows($prepared_by_res) > 0)
		{
			$prepared_by_row = db_fetch($prepared_by_res);
			$date__ = explode_date_to_dmy(sql2date($prepared_by_row[1]));
			$cheque->TextWrap(58, 71-11-12-27, 111, get_username_by_id($prepared_by_row[0]), 'left');
			$cheque->TextWrap(58, 71-11-12-27+13, 100, $date__[1].'/'.$date__[0], 'right');
		}

		$noted_by_sql = "SELECT user,date(stamp) FROM ".TB_PREF."audit_trail 
									WHERE type = 99 
									AND trans_no = $id
									AND description = 'CV approved'";
		$noted_by_res = db_query($noted_by_sql);
		if (db_num_rows($noted_by_res) > 0)
		{
			$noted_by_row = db_fetch($noted_by_res);
			$date__ = explode_date_to_dmy(sql2date($noted_by_row[1]));
			$cheque->TextWrap(58+111+18+111+18, 71-11-12-27, 111, get_username_by_id($noted_by_row[0]),'left');
			$cheque->TextWrap(58+111+18+111+18, 71-11-12-27+13, 90, $date__[1].'/'.$date__[0], 'right');
		}

	}
	else
	{
		if(get_voided_entry(ST_CV, $id))
			$cheque->AddImage($path_to_root . "/reporting/images/cv_blank_void.png", 0, $cheque->pageHeight, 612);
		else if($cv_header['online_payment'] == 2)
			$cheque->AddImage($path_to_root . "/reporting/images/cv_blank_ol.png", 0, $cheque->pageHeight, 612);
		else
			$cheque->AddImage($path_to_root . "/reporting/images/cv_blank.png", 0, $cheque->pageHeight, 612);
			
		$prepared_by_sql = "SELECT user, date(stamp) FROM ".TB_PREF."audit_trail 
										WHERE type = 99 
										AND trans_no = $id
										AND description = 'CV created'";
		$prepared_by_res = db_query($prepared_by_sql);
		if (db_num_rows($prepared_by_res) > 0)
		{
			$prepared_by_row = db_fetch($prepared_by_res);
			$date__ = explode_date_to_dmy(sql2date($prepared_by_row[1]));
			$cheque->TextWrap(58, 71-11-12-27, 111, get_username_by_id($prepared_by_row[0]), 'left');
			$cheque->TextWrap(58, 71-11-12-27+13, 100, $date__[1].'/'.$date__[0], 'right');
		}

		$noted_by_sql = "SELECT user,date(stamp) FROM ".TB_PREF."audit_trail 
									WHERE type = 99 
									AND trans_no = $id
									AND description = 'CV approved'";
		$noted_by_res = db_query($noted_by_sql);
		if (db_num_rows($noted_by_res) > 0)
		{
			$noted_by_row = db_fetch($noted_by_res);
			$date__ = explode_date_to_dmy(sql2date($noted_by_row[1]));
			$cheque->TextWrap(58+111+18+111+18, 71-11-12-27, 111, get_username_by_id($noted_by_row[0]),'left');
			$cheque->TextWrap(58+111+18+111+18, 71-11-12-27+13, 90, $date__[1].'/'.$date__[0], 'right');
		}
	}
	
	$com = get_company_prefs();
	
	$cheque->TextWrap(85,325,320, payment_person_name($cv_header['person_type'],$cv_header['person_id'], false),  'left');
	$cheque->TextWrap(85+360,325,100,sql2date($cv_header['cv_date']), 'left');

	$cheque->fontSize += 3;
	$cheque->font('b');
	
	if (supplier_has_billing_institution_code($cv_header['person_id']))
		$cheque->TextWrap(50,($cheque->pageHeight-$cheque->topMargin)+147,$cheque->pageWidth,
			'FOR ONLINE PAYMENT', 'left');
		
	$cheque->TextWrap(0,($cheque->pageHeight-$cheque->topMargin),$cheque->pageWidth,$com['coy_name'], 'center');
	$cheque->TextWrap(85+360+60,325+18,100,$cv_header['cv_no'], 'left');
	$cheque->font('');
	$cheque->fontSize -= 5;
	$cheque->TextWrap(0,($cheque->pageHeight-$cheque->topMargin)-10,$cheque->pageWidth,$com['postal_address'], 'center');
	$cheque->fontSize += 2;
}

function get_inv_amount_ewt($type,$trans_no)
{
	$sql = "SELECT ewt FROM ".TB_PREF."supp_trans 
			WHERE type=$type
			AND trans_no = $trans_no";
	// display_error($sql);die;
	$res = db_query($sql);
	$row = db_fetch($res);
	
	return $row[0];
}

$company_currency = get_company_currency();
$nw = new Numbers_Words();

$cheque = new FrontReport("CHEQUE NO.", "cheque.pdf", 'SRS_CV', 10);
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
//**********************************************************************


// $alloc_result = get_allocatable_to_supp_transactions($receipt['person_id'], $receipt['trans_no'], ST_SUPPAYMENT);
$ids = explode(',',$_GET['cv_id']);

// flag cv as printed
$sql = "UPDATE ".TB_PREF."cv_header SET
			cv_printed = 1
		WHERE id IN (".$_GET['cv_id'].")";
db_query($sql,'failed to flag cv as printed');
//==================================

$xcx = 0;
foreach($ids as $id)
{
	$xcx++;
	$cheque->pageNumber = 0;
	
	if($xcx != 1)
		$cheque->newPage();
	
	$cv_header = get_cv_header($id);
	$bank_trans_id = $cv_header['bank_trans_id'];

	$cheque->Font();
	$cheque->lineHeight = 16;

	$cheque->row = $cheque->pageHeight - $cheque->topMargin;

	$cheque->row -= 47;
	cv_print_header();
	$cv_details = get_cv_details($id, 'AND trans_type !=22 ORDER BY amount DESC');
	$total_allocated = 0;
	$cheque->row = 323;
	$cheque->Newline();

	$trans__ = array();
	$inv_ewt_tot = 0;
	$company_pref = get_company_prefs();
	while ($cv_d_row = db_fetch($cv_details))
	{
		$inv_ewt = 0;

		for ($ii = 0; $ii <= 0 ; $ii ++)
		{
			$cheque->Newline();
			
			if ($cheque->row < 147)
			{
				$cheque->TextWrap(41,$cheque->row,300,'see page '. ($cheque->pageNumber+1) .' for continuation.', 'left');
				if ($cheque->pageNumber == 1)
				{
					$cheque->fontSize --;
					$cheque->TextWrap(85+360+60,325+50,70,'page '.$cheque->pageNumber, 'right');
					$cheque->fontSize ++;
				}
				cv_print_header();
				$cheque->row = 291;
			}
			
			$tran_det = get_tran_details($cv_d_row['trans_type'], $cv_d_row['trans_no']);
			$cv_d_row['amount'] = round2($cv_d_row['amount'], user_price_dec());
			
			$cheque->TextWrap(41,$cheque->row,100,sql2date(($cv_d_row['trans_type'] != 20 ? $tran_det['tran_date'] : $tran_det['del_date'])), 'left');
			
			if (strpos($tran_det['reference'],'NT') !== false AND $cv_d_row['trans_type'] == 20) // NON TRADE
			{
				$add_text = '';
				$comment = get_comments_string($cv_d_row['trans_type'], $cv_d_row['trans_no']);
				if (trim($comment) != '')
					$add_text .= "  -- ".$comment;
				$final_text = $systypes_array_short[$cv_d_row['trans_type']]. ' # '.$tran_det['reference'] . $add_text;
				
				$sobra = $cheque->TextWrap(110, $cheque->row, 250, $final_text , 'left',
					0, 0, NULL, 0, true);
					
				while ($sobra != '')
				{
					$cheque->Newline();
					if ($cheque->row < 147)
					{
						$cheque->TextWrap(41,$cheque->row,300,'see page '. ($cheque->pageNumber+1) .' for continuation.', 'left');
						if ($cheque->pageNumber == 1)
						{
							$cheque->fontSize --;
							$cheque->TextWrap(85+360+60,325+50,70,'page '.$cheque->pageNumber, 'right');
							$cheque->fontSize ++;
						}
						cv_print_header();
						$cheque->row = 291;
					}
					 $sobra = $cheque->TextWrap(110, $cheque->row, 250, $sobra , 'left', 0, 0, NULL, 0, false);
				}
				
				$nt_res = get_gl_trans($cv_d_row['trans_type'], $cv_d_row['trans_no'],true);
				
				while($nt_row = db_fetch($nt_res))
				{
					if(get_company_pref('creditors_act') == $nt_row['account'] 
						OR get_company_pref('creditors_act_nt') == $nt_row['account'])
						continue;
					$cheque->Newline();
					if ($cheque->row < 147)
					{
						$cheque->TextWrap(41,$cheque->row,300,'see page '. ($cheque->pageNumber+1) .' for continuation.', 'left');
						if ($cheque->pageNumber == 1)
						{
							$cheque->fontSize --;
							$cheque->TextWrap(85+360+60,325+50,70,'page '.$cheque->pageNumber, 'right');
							$cheque->fontSize ++;
						}
						cv_print_header();
						$cheque->row = 291;
					}
					$cheque->TextWrap(110, $cheque->row, 250, get_gl_account_name($nt_row['account']) , 'left', 0, 0, NULL, 0, false);
					$cheque->TextWrap(380,$cheque->row,150,number_format2($nt_row['amount'],2), 'right');
				}
			}
			else
			{
				$add_text='';
				if ($tran_det['supp_reference'] != '')
					$add_text = ($cv_d_row['trans_type'] == 20 ? "  --  SI # " : ' -- ') . $tran_det['supp_reference'];
				
				$comment = get_comments_string($cv_d_row['trans_type'], $cv_d_row['trans_no']);
				if (trim($comment) != '')
					$add_text .= "  -- ".$comment;
				
				$final_text = $systypes_array[$cv_d_row['trans_type']]. ' # '.$tran_det['reference'] . $add_text;
				
				if ($cv_d_row['trans_type'] != 20)
					$cheque->TextWrap(380,$cheque->row,150,number_format2($cv_d_row['amount'],2), 'right');
				else
				{
					$inv_ewt = get_inv_amount_ewt($cv_d_row['trans_type'],$cv_d_row['trans_no']);
					$cheque->TextWrap(380,$cheque->row,150,number_format2($cv_d_row['amount'] + $inv_ewt,2), 'right');
					
					$inv_ewt_tot += $inv_ewt;
				}
				
				$sobra = $cheque->TextWrap(110, $cheque->row, 250, $final_text , 'left',
					0, 0, NULL, 0, true);
					
				while ($sobra != '')
				{
					$cheque->Newline();
					if ($cheque->row < 147)
					{
						$cheque->TextWrap(41,$cheque->row,300,'see page '. ($cheque->pageNumber+1) .' for continuation.', 'left');
						if ($cheque->pageNumber == 1)
						{
							$cheque->fontSize --;
							$cheque->TextWrap(85+360+60,325+50,70,'page '.$cheque->pageNumber, 'right');
							$cheque->fontSize ++;
						}
						cv_print_header();
						$cheque->row = 291;
					}
					 $sobra = $cheque->TextWrap(110, $cheque->row, 250, $sobra , 'left', 0, 0, NULL, 0, false);
				}
			}
			
			
		}
	}

	if ($cv_header['ewt'] != 0 AND $inv_ewt_tot == 0)
	{
		$cheque->TextWrap(380,120+16,150,number_format2(-($cv_header['ewt']),2), 'right');
		$cheque->TextWrap(380+150,120+16,150,' (EWT)', 'left');
	}
	else if($inv_ewt_tot != 0)
	{
		$cheque->TextWrap(380,120+16,150,number_format2(-($inv_ewt_tot),2), 'right');
		$cheque->TextWrap(380+150,120+16,150,' (EWT)', 'left');
	}
	
	// if ($cv_header['ewt'] + $inv_ewt_tot != 0)
	// {
		// $cheque->TextWrap(380,120+16,150,number_format2(-($cv_header['ewt'] + $inv_ewt_tot),2), 'right');
		// $cheque->TextWrap(380+150,120+16,150,' (EWT)', 'left');
	// }
	
	$cheque->font('b');
	if(!get_voided_entry(ST_CV, $id))
		$cheque->TextWrap(380,120,150,number_format2($cv_header['amount'],2), 'right');
	else
		$cheque->TextWrap(380,120,150,number_format2(get_cv_details_total($cv_header["id"]),2), 'right');
	$cheque->font('');

	if ($bank_trans_id != 0)
	{
		if ($cv_header['online_payment'] != 2)
		{
			// $bank_row = get_bank_trans_of_cv($cv_header['bank_trans_id']);
			$receipt = get_trans_from_check_2($cv_header['bank_trans_id']);
			
			$trans__[] = array($receipt['type'], $receipt['trans_no']);
			
			$chk_row_res = get_chk_details($receipt['trans_no'], $receipt['type']);
			$chk_numbers = array();
			$chk_dates = array();
			
			while($chk_row = db_fetch($chk_row_res))
			{
					if (!in_array($chk_row['chk_number'],$chk_numbers))
						$chk_numbers[] = $chk_row['chk_number'];
					if (!in_array(sql2date($chk_row['chk_date']),$chk_dates))
						$chk_dates[] = sql2date($chk_row['chk_date']);
			}
			
			$cheque->TextWrap(410,71,157,$receipt['bank_name'],'left');
			
			$cheque->TextWrap(410,71-11,157,implode(' / ',$chk_numbers));
			$cheque->TextWrap(410,71-11-12,157,implode(' / ',$chk_dates));


			$cheque->row = 119;
			$cheque->Newline();
		
			$where = '';
		
			foreach($trans__ as $tran_)
			{

				if ($where == '')
					$where .= " AND ((type=".$tran_[0] .' AND type_no='.$tran_[1].")" ;
				else
					$where .= " OR (type=".$tran_[0] .' AND type_no='.$tran_[1].")";
			}

			$where .= " )";
			
			$sql = "SELECT ".TB_PREF."gl_trans.*, "
				.TB_PREF."chart_master.account_name FROM "
					.TB_PREF."gl_trans, ".TB_PREF."chart_master
				WHERE ".TB_PREF."chart_master.account_code=".TB_PREF."gl_trans.account
				$where ORDER BY amount ".  'DESC' ;			
			
			$res = db_query($sql);
			$count = db_num_rows($res);
		}
		else
		{
			$cheque->row = 119;
			
			$sql = "SELECT bank_name FROM ".TB_PREF."bank_trans a, ".TB_PREF."bank_accounts b
						WHERE a.id = ".$cv_header['bank_trans_id'] ."
						AND a.bank_act = b.id";
			// echo $sql;die;
			$res = db_query($sql);
			$row = db_fetch($res);
			
			$cheque->Newline();
			$cheque->TextWrap(410,71,157,$row['bank_name'],'left');
			$cheque->TextWrap(410,71-11-12,157,get_bank_trans_date($cv_header['bank_trans_id']));
			
			$det_ = get_cv_details($id, 'AND trans_type =22 ORDER BY amount DESC');
			$row_ = db_fetch($det_);
			$res = get_gl_trans($row_['trans_type'], $row_['trans_no'],true);
			$count = db_num_rows($res);
		}

		if ($count <= 4)
		{

			while ($gl_row = db_fetch($res))
			{
					$cheque->row -= 14;
					$adder = 0;
					
					if ($gl_row['amount'] < 0)
						$adder = 100;
						
					$cheque->TextWrap(41,$cheque->row,109+$adder,$gl_row['account_name'], 'left');
					$cheque->TextWrap(154+$adder,$cheque->row,100,number_format2(abs($gl_row['amount']),2), 'right');
					// $cheque->TextWrap(41,$cheque->row,100,$gl_row['amount'], 'left');
			}
		}
		else
		{
			$cheque->font('b');
			$cheque->row -= 14;
			$cheque->TextWrap(41,$cheque->row,109,'GL accounts at next page', 'center');
			$cheque->pageNumber++;
			$cheque->newPage();
			$cheque->row = $cheque->pageHeight - $cheque->topMargin;
			
			
			$cheque->row -= 28;
			$cheque->TextWrap(41,$cheque->row,500,"GL accounts for CV # ".$cv_header['cv_no'], 'center');
			
			$cheque->row -= 28;
			$cheque->TextWrap(41,$cheque->row,109,'ACCOUNT', 'left');
			$cheque->TextWrap(154,$cheque->row,100,'DEBIT', 'right');
			$cheque->TextWrap(154+100,$cheque->row,100,'CREDIT', 'right');
			$cheque->font('');
				
			while ($gl_row = db_fetch($res))
			{
					$cheque->row -= 14;
					$adder = 0;
					
					if ($gl_row['amount'] < 0)
						$adder = 100;
						
					$cheque->TextWrap(41,$cheque->row,109+$adder,$gl_row['account_name'], 'left');
					$cheque->TextWrap(154+$adder,$cheque->row,100,number_format2(abs($gl_row['amount']),2), 'right');
					// $cheque->TextWrap(41,$cheque->row,100,$gl_row['amount'], 'left');
			}
		}
	}
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