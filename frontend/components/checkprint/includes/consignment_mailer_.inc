<?php

$page_security = 'SA_CHECKPRINT';
// ----------------------------------------------------------------
// $ Revision:	1.0 $
// Creator:	Tu Nguyen
// date_:	2008-08-04
// Title:	Print CPA Cheques (Canadian Pre-printed Standard)
// ----------------------------------------------------------------

global /** @var $path_to_root TYPE_NAME */
$path_to_root, $systypes_array, $systypes_array_short;

include_once($path_to_root . "/includes/session.inc");
add_access_extensions();
// $path_to_root="../../";
define('K_PATH_FONTS', "../../reporting/fonts/");
include($path_to_root . "/reporting/includes/pdf_report.inc");
require_once($path_to_root . '/modules/PHPMailer/class.phpmailer.php');


function send_that_sales($cons_id,$show_gl)
{
	$dim = get_company_pref('use_dimension');
	$dimension = $dimension2 = 0;

	$from = $_POST['PARAM_0'];
	$to = $_POST['PARAM_1'];
	$trade = $_POST['PARAM_2'];
	$vat = $_POST['PARAM_3'];
	$rba = $_POST['PARAM_4'];// 1 0 2
	$destination = $_POST['PARAM_5'];
	
	$rba_str = 'ALL';

	$rep = new FrontReport(_('Consignment Sales Report'), "CV.pdf", user_pagesize(),9 ,'L');
	$dec = user_price_dec();

	$cols = array(0, 110, 360, 430, 500, 570,650,650);
	$aligns = array( 'left', 'left', 'left', 'left', 'left', 'left','left','left');
	$headers = array('Product Code', 'Description', 'UOM','Quantity', 'Sales','CostOfSales','Commission');
	//'Discount', 

	$res=get_vendor_cons_header($cons_id);
	$row=db_fetch($res);
	$from=$row['start_date'];
	$to=$row['end_date'];
	$supp_name=$row['supp_name'];
	$supp_code=$row['supp_code'];
	//$ms_row=get_vendor_details($row['supp_code']);
	$ms_row=get_vendor_commission($row['supp_code']);
	$commission=$ms_row['reordermultiplier'];
	$params =   array( 	0 => $comments,
    				    1 => array('text' => _('Period'), 'from' => sql2date($from), 'to' => sql2date($to)),
    				    2 => array('text' => _('Commission'), 'from' => $commission.'%'),
    				    3 => array('text' => 'Consignor','from' => $supp_name));
						
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
	
	
	//$rep->End();
//===============================================================================================================================================================
	//**********************************************************************
	// email magic starts here
	if($t_sales!=0){
	$sup_id=get_supplier_id_by_supp_ref($supp_code);
	$supp_row = get_supplier($sup_id);
	$fileatt = $rep->Output('Consignment_Sales_Summary.pdf','S');
	$mail  = new PHPMailer();
	
$x=explode("-",$from);
$month_num=$x[1];
$month_name = date( 'F', mktime( 0, 0, 0, $month_num+1, 0, 0, 0 ) );


	// $body = 'This message is intended for '.$supp_row['pay_to'].'. Payment has been made for transactions within the attached CV';

		/*
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
			<td><br><br>*Attached file is a copy of our Product Sales Report for additional details.
			<hr></td>
			</tr>
			</table>";
		*/
			
			$msg = "</p>
			
			<table align=left border=0>
			<tr>
			<td><br><br>*Attached file is a copy of Consignment Sales Report for additional details.
			<hr></td>
			</tr>
			</table>";
			
			
	$body = "<hr><center><b>********** THIS IS A SYSTEM GENERATED E-MAIL. **********</b></center></br></br>
			<br>
			<p>Dear Sir/Mam,</p>
			
			<blockquote>We are happy to send you the sales report for your company's products for the month of " .$month_name.". </blockquote>
			
			<p>Please prepare sales invoice based on the attached.</p> <br>
			<p>This e-mail notification has been made by ".get_company_pref('coy_name').".</p>
			<p>If you have a query regarding this e-mail please call 935-9461 loc. 101 or 355-3960 loc. 101 or reply to this e-mail.</p>
			<p>Thank you.</p>
			
			<p>".$msg."";
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
		
	$mail->SetFrom('no-reply@srssulit.com', 'SRS Consignor Sales Notification');

	// $mail->IsSMTP(); // telling the class to use SMTP
	// $mail->SMTPAuth   = true;                  // enable SMTP authentication
	// $mail->SMTPSecure = "ssl";                 // sets the prefix to the server
	// $mail->Host       = "smtp.gmail.com";      // sets GMAIL as the SMTP server
	// $mail->Port       = 465;
	// $mail->Username   = "automailer.srs@gmail.com";  // GMAIL username
	// $mail->Password   = "srsmailer"; 
	// $mail->SMTPDebug  = 2;
	// $mail->SetFrom('automailer.srs@gmail.com', 'SRS Payment Notification');

	$mail->Subject = "SRS Consignor Sales Notification";

	$mail->AltBody    = "To view the message, please use an HTML compatible email viewer!"; // optional, comment out and test

	$mail->MsgHTML($body);
	
	
	//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\ REMOVE ON LIVE  //\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\
	//$supp_row['consignment_email'] = 'technorichinfo@gmail.com';
	//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\
	//$cc  = 'technorichinfo@gmail.com';
	//$cc_name = 'Richard Bolalin';
	//$supp_row['pay_to']= 'Richard Bolalin';
	
	$mail->AddAddress(trim($supp_row['consignment_email']), $supp_row['pay_to']);
	$mail->AddReplyTo($cc, $cc_name);
	$mail->AddCC($cc, $cc_name);
	
	 //$mail->AddAddress('enjo.santiago@yahoo.com', 'tada');
	$mail->AddStringAttachment($fileatt, "Consignment_Sales.pdf");
	
	if(!$mail->Send()) 
	{
		display_error("Failed to send email to (" . str_replace("@", "&#64;", $supp_row['consignment_email']) . ') ' 
			. $mail->ErrorInfo . '<br />');
			
		$mail->ClearAddresses();
		$mail->ClearAttachments();
		return ("Failed to send email to (" . str_replace("@", "&#64;", $supp_row['consignment_email']) . ') ' 
			. $mail->ErrorInfo . '<br />');
	}
	else 
	{
		cons_mail_sent($cons_id);
		$mail->ClearAddresses();
		$mail->ClearAttachments();
		display_notification("Message sent to :" . $supp_row["pay_to"] .
			' (' . str_replace("@", "&#64;", $supp_row["consignment_email"]) . ')<br />');
			
		return ("Message sent to :" . $supp_row["pay_to"] .
			' (' . str_replace("@", "&#64;", $supp_row["consignment_email"]) . ')<br />');
			
	}
  // Clear all addresses and attachments for next loop
  // return "Message sent to :" . $supp_row["pay_to"] .
			// ' (' . str_replace("@", "&#64;", $supp_row["consignment_email"]) . ')<br />';
	}
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

function cons_mail_sent($cons_id)
{
	$sql = "UPDATE ".TB_PREF."cons_sales_header SET 
				email_sent = 1
			WHERE cons_sales_id=$cons_id";
	db_query($sql,'failed to flag email_sent column');
}
?>