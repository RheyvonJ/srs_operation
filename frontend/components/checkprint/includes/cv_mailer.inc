<?php

$page_security = 'SA_CHECKPRINT';
// ----------------------------------------------------------------
// $ Revision:	1.0 $
// Creator:	Tu Nguyen
// date_:	2008-08-04
// Title:	Print CPA Cheques (Canadian Pre-printed Standard)
// ----------------------------------------------------------------

global /** @var $path_to_root TYPE_NAME */
$path_to_root;

include_once($path_to_root . "/includes/session.inc");
add_access_extensions();
include_once($path_to_root . "/modules/checkprint/includes/check_accounts_db.inc");
include_once($path_to_root . "/purchasing/includes/db/suppalloc_db.inc");
// $path_to_root="../../";
define('K_PATH_FONTS', "../../reporting/fonts/");
include($path_to_root . "/reporting/includes/pdf_report.inc");
include_once($path_to_root . "/gl/includes/db/gl_db_cv.inc");
require_once($path_to_root . '/modules/PHPMailer/class.phpmailer.php');


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
// Grab Cheque Information

function cv_print_header(&$cheque)
{
	global $cv_header, $db_connections, $path_to_root, $id;
	
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


function send_that_cv($cv_id,$show_gl)
{
	global $cv_header, $systypes_array;
	
	$cheque = new FrontReport("CV", "CV.pdf", 'SRS_CV', 10);
	$cv_header = '';
	
	$id = $cv_id;
	$bank_trans_id = $show_gl;

	$cv_header = get_cv_header($id);

	$company_currency = get_company_currency();

	// now the print
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
	//**********************************************************************

	cv_print_header($cheque);
	$cv_details = get_cv_details($id, 'AND trans_type !=22 ORDER BY amount DESC');
	$total_allocated = 0;
	$cheque->row = 323;
	$cheque->Newline();

	$trans__ = array();
	$inv_ewt_tot = 0;
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
				cv_print_header($cheque);
				$cheque->row = 291;
			}
			
			$tran_det = get_tran_details($cv_d_row['trans_type'], $cv_d_row['trans_no']);
			$cv_d_row['amount'] = round2($cv_d_row['amount'], user_price_dec());
			
			$cheque->TextWrap(41,$cheque->row,100,sql2date(($cv_d_row['trans_type'] != 20 ? $tran_det['tran_date'] : $tran_det['del_date'])), 'left');
			
			if (strpos($tran_det['reference'],'NT') !== false AND $cv_d_row['trans_type'] == 20) // NON TRADE
			{
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
						cv_print_header($cheque);
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
						cv_print_header($cheque);
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
						cv_print_header($cheque);
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
	//**********************************************************************
	// email magic starts here
	
	if ($cv_header['person_type'] != PT_SUPPLIER)
		return false;

	$supp_row = get_supplier($cv_header['person_id']);
	$fileatt = $cheque->Output('CV.pdf','S');
	
	$mail                = new PHPMailer();
	
	// $body                = 'This message is intended for '.$supp_row['pay_to'].'. Payment has been made for transactions within the attached CV';

	if ($cv_header['online_payment'] == 2)
		$msg = "It will be paid by bank transfer directly into your bank account. 
			It can take up to 2 business days for the funds to appear in the available balance of your bank account. 
			Please allow until after that time before reporting your Electronic Funds Transfer(EFT) 
			payment as late or missing.</p><br>
			
			<table align=left border=0>
			<tr>
			<td><b>Payment made to: </b><td>".preg_replace("/\([^)]+\)/","",$supp_row['pay_to'])."<br>
			<tr>
			<td><b>Our Supplier No.: </b><td>".$supp_row['supp_ref']."<br>
			<tr>
			<td><b>CV Number: </b><td>".$cv_header['cv_no']." <br>
			<tr>
			<td><b>Payment Date: </b><td>".get_bank_trans_date($cv_header['bank_trans_id'])."<br>
			<tr>
			<td><b>Payment Amount:</b><td> Php ".number_format2($cv_header['amount'],2)."
			</tr>
			<tr>
			<td><br><br>*attached is a copy of our CV for additional details
			<hr></td>
			</tr>
			</table>";
	else
		$msg = "</p><br>
			
			<table align=left border=0>
			<tr>
			<td><b>Payment made to: </b><td>".preg_replace("/\([^)]+\)/","",$supp_row['pay_to'])."<br>
			<tr>
			<td><b>Our Supplier No.: </b><td>".$supp_row['supp_ref']."<br>
			<tr>
			<td><b>CV Number: </b><td>".$cv_header['cv_no']." <br>
			<tr>
			<td><b>Check Bank: </b><td>".$cbank."<br>
			<tr>
			<td><b>Check Number: </b><td>".$cnum."<br>
			<tr>
			<td><b>Check Date: </b><td>".$cdate."<br>
			<tr>
			<td><b>Check Amount:</b><td> Php ".number_format2($cv_header['amount'],2)."
			</tr>
			<tr>
			<td><br><br>*attached is a copy of our CV for additional details
			<hr></td>
			</tr>
			</table>";
			
	$body = "<hr><center><b>********** THIS IS A SYSTEM GENERATED E-MAIL. **********</b></center></br></br>
			<p>If you have a query regarding this payment please call 935-9461 loc. 101 or 355-3960 loc. 101 </p><br>

			<p>The following payment has been made by ".get_company_pref('coy_name')."
			".$msg."
			";
			// San Roque Supermarket.
	

	$mail->IsSMTP(); // telling the class to use SMTP
	// $mail->SMTPAuth   = true;
	// $mail->SMTPSecure = "tls";  
	$mail->Host       = "192.168.0.213";
	$mail->Port       = 25;
	// $mail->Username   = "e-santiago@srssulit.com";
	// $mail->Password   = "Sulit6651";
	
	if ($_SESSION['wa_current_user']->loginname == 'admin')
		$mail->SMTPDebug  = 2;
		
	$mail->SetFrom('no-reply@srssulit.com', 'SRS Payment Notification');

	// $mail->IsSMTP(); // telling the class to use SMTP
	// $mail->SMTPAuth   = true;                  // enable SMTP authentication
	// $mail->SMTPSecure = "ssl";                 // sets the prefix to the server
	// $mail->Host       = "smtp.gmail.com";      // sets GMAIL as the SMTP server
	// $mail->Port       = 465;
	// $mail->Username   = "automailer.srs@gmail.com";  // GMAIL username
	// $mail->Password   = "srsmailer"; 
	// $mail->SMTPDebug  = 2;
	// $mail->SetFrom('automailer.srs@gmail.com', 'SRS Payment Notification');

	$mail->Subject = "Invoice Payment";

	$mail->AltBody    = "To view the message, please use an HTML compatible email viewer!"; // optional, comment out and test

	$mail->MsgHTML($body);
	
	
	//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\ REMOVE ON LIVE  //\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\
	// $supp_row['email'] = 'enjo.santiago@yahoo.com';
	// $supp_row['email'] = 'e-santiago@srssulit.com';
	// $supp_row['email'] = 'j-tabuyan@srssulit.com';
	//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\
	// $cc  = 'e-santiago@srssulit.com';
	// $cc_name = 'Enjo Santiago';
	$cc  = 'j-tabuyan@srssulit.com';
	$cc_name = 'Jen Tabuyan';
	
	
	$mail->AddAddress(trim($supp_row['email']), $supp_row['pay_to']);
	$mail->AddReplyTo($cc, $cc_name);
	$mail->AddCC($cc, $cc_name);
	
	// $mail->AddAddress('enjo.santiago@yahoo.com', 'tada');
	$mail->AddStringAttachment($fileatt, "Check_Voucher.pdf");
	
	if(!$mail->Send()) 
	{
		display_error("Failed to send email to (" . str_replace("@", "&#64;", $supp_row['email']) . ') ' 
			. $mail->ErrorInfo . '<br />');
			
		$mail->ClearAddresses();
		$mail->ClearAttachments();
		return ("Failed to send email to (" . str_replace("@", "&#64;", $supp_row['email']) . ') ' 
			. $mail->ErrorInfo . '<br />');
	}
	else 
	{
		cv_mail_sent($id);
		$mail->ClearAddresses();
		$mail->ClearAttachments();
		display_notification("Message sent to :" . $supp_row["pay_to"] .
			' (' . str_replace("@", "&#64;", $supp_row["email"]) . ')<br />');
			
		return ("Message sent to :" . $supp_row["pay_to"] .
			' (' . str_replace("@", "&#64;", $supp_row["email"]) . ')<br />');
			
	}
  // Clear all addresses and attachments for next loop
  // return "Message sent to :" . $supp_row["pay_to"] .
			// ' (' . str_replace("@", "&#64;", $supp_row["email"]) . ')<br />';
}

function cv_mail_sent($id)
{
	$sql = "UPDATE ".TB_PREF."cv_header SET 
				email_sent = 1
			WHERE id=$id";
	db_query($sql,'failed to flag email_sent column');
}
?>