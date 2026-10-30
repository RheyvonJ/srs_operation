<?php

function print_hidden_cheque_script()
{
	global $path_to_root;
	$action = "$path_to_root/modules/checkprint/check_print.php";
	$ar = array(
		'PARAM_0' => 0,
		'PARAM_1' => 0); 	// Cheque
		
	$st = "<form method='post' name='pdf_form' action='$action'>";
	foreach ($ar as $key => $value)
	{
		$st .= "<input type='hidden' name='$key' value='$value' />";
	}
	$st .= "</form>\n";
	$st .= "<script type='text/javascript'>
<!--
function printDocument(docno,bankno) {
  document.pdf_form.PARAM_0.value = docno;
  document.pdf_form.PARAM_1.value = bankno;
  window.open('','REP_WINDOW','toolbar=no,scrollbar=no,resizable=yes,menubar=no');
  document.pdf_form.target='REP_WINDOW';
  document.pdf_form.submit();
}
-->
</script>\n";

	$action = "$path_to_root/modules/checkprint/real_check_print.php";
	$st .= "<form method='post' name='pdf_form2' action='$action'>";
	foreach ($ar as $key => $value)
	{
		$st .= "<input type='hidden' name='$key' value='$value' />";
	}
	$st .= "</form>\n";
	$st .= "<script type='text/javascript'>
<!--
function printDocument2(docno,bankno) {
  document.pdf_form2.PARAM_0.value = docno;
  document.pdf_form2.PARAM_1.value = bankno;
  window.open('','REP_WINDOW','toolbar=no,scrollbar=no,resizable=yes,menubar=no');
  document.pdf_form2.target='REP_WINDOW';
  document.pdf_form2.submit();
}
-->
</script>\n";

	echo $st;
}

function print_document_cheque_link($doc_no, $link_text, $link=true, $bank_id)
{
	if ($link)
		return "<a href=\"javascript:printDocument('$doc_no', '$bank_id');\">$link_text</a>";
	else
		return "javascript:printDocument('$doc_no', '$bank_id');";
}

function print_document_cheque_link2($doc_no, $link_text, $link=true, $bank_id)
{
	if ($link)
		return "<a href=\"javascript:printDocument2('$doc_no', '$bank_id');\">$link_text</a>";
	else
		return "javascript:printDocument2('$doc_no', '$bank_id');";
}

?>