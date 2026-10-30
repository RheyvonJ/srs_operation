<?php


//-----------------------------------------------------------------------------------------------

function unassigned_check_list($name, $selected_id=null, $submit_on_change=false)
{
	$sql_ = '';
	// if ($_SESSION['wa_current_user']->access != 2)
		$sql_ = " WHERE user_id = ". $_SESSION['wa_current_user']->user;
		
		//account_code NOT IN (SELECT bank_ref FROM ".TB_PREF."check_account $sql_) AND 
	$sql = "SELECT account_code, bank_account_name, bank_account_number, bank_curr_code 
			FROM ".TB_PREF."bank_accounts 
			WHERE account_type=1";
	
	return combo_input($name, $selected_id, $sql, 'account_code', 'bank_account_name',
		array(
			'format' => '_format_check_account',
			'order' => 'account_code',
			'select_submit'=> $submit_on_change,
			'async' => false		
		) );
}

function unassigned_check_list_cells($label, $name, $selected_id=null, $submit_on_change=false)
{
	if ($label != null)
		echo "<td>$label</td>\n";
	echo "<td>";
	echo unassigned_check_list($name, $selected_id, $submit_on_change);
	echo "</td>\n";
	// return $str;
}

function unassigned_check_list_row($label, $name, $selected_id=null, $submit_on_change=false)
{
	echo "<tr>\n";
	unassigned_check_list_cells($label, $name, $selected_id, $submit_on_change);
	echo "</tr>\n";
}

function assigned_check_list($name, $selected_id=null, $submit_on_change=false)
{
	$sql = "SELECT account_id, bank_account_name, bank_ref, bank_name, user_id, booklet_start, booklet_end
					FROM ".TB_PREF."check_account a, ".TB_PREF."bank_accounts b
			WHERE a.bank_ref = b.account_code";
	
	if ($_SESSION['wa_current_user']->access != 2)
		$sql .= " AND user_id = ". $_SESSION['wa_current_user']->user;

	return combo_input($name, $selected_id, $sql, 'account_id', 'bank_account_name',
		array(
			'format' => '_format_check_account_for_cv',
			'order' => 'bank_account_name',
			'spec_option'=> 'Select Checking Account',
			'spec_id' => '0',
			'select_submit'=> $submit_on_change,
			'async' => false		
		) );
}

function assigned_check_list_cells($label, $name, $selected_id=null, $submit_on_change=false)
{
	if ($label != null)
		echo "<td>$label</td>\n";
	echo "<td>";
	echo assigned_check_list($name, $selected_id, $submit_on_change);
	echo "</td>\n";
	// return $str;
}

function assigned_check_list_row($label, $name, $selected_id=null, $submit_on_change=false)
{
	echo "<tr>\n";
	assigned_check_list_cells($label, $name, $selected_id, $submit_on_change);
	echo "</tr>\n";
}


function _format_check_account($row)
{
		return $row[0] .  "&nbsp;&nbsp;&nbsp;&nbsp;" . $row[1].  "&nbsp;&nbsp;(" . $row[2] .  ")&nbsp;&nbsp;-&nbsp;&nbsp;" . $row[3];
}

function _format_check_account_for_cv($row)
{
		return $row['bank_ref'] .  "&nbsp;&nbsp;&nbsp;&nbsp;" . 
		$row['bank_name'].  "&nbsp;&nbsp;-&nbsp;&nbsp;" . get_username_by_id($row['user_id']).
		"&nbsp;&nbsp;-&nbsp;&nbsp;" . $row['booklet_start'].' >> '.$row['booklet_end'];
}



//---------------------------------------------------------------------------------------------------
?>