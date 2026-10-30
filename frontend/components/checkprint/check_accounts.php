<?php

$page_security = 'SA_CHECKPRINTSETUP';
$path_to_root="../..";

include($path_to_root . "/includes/session.inc");
add_access_extensions();

page(_("Chequing Accounts"));

include($path_to_root . "/modules/checkprint/includes/check_accounts_db.inc");
include($path_to_root . "/modules/checkprint/includes/check_ui.inc");

include($path_to_root . "/includes/ui.inc");

simple_page_mode();
//-----------------------------------------------------------------------------------

if ($Mode=='ADD_ITEM' || $Mode=='UPDATE_ITEM') 
{
	//initialise no input errors assumed initially before we test
	$input_error = 0;

	if (strlen($_POST['next_reference']) == 0) 
	{
		$input_error = 1;
		display_error( _("The Chequing Number should not be empty."));
		set_focus('next_reference');
	}
	
	if (strlen($_POST['booklet_start']) == 0) 
	{
		$input_error = 1;
		display_error( _("Booklet Start should not be empty."));
		set_focus('booklet_start');
	}
	
	if (strlen($_POST['booklet_end']) == 0) 
	{
		$input_error = 1;
		display_error( _("Booklet End should not be empty."));
		set_focus('booklet_end');
	}
	
	if (($_POST['def_check_writer']) == 0) 
	{
		$input_error = 1;
		display_error( _("Select a Check Writer."));
		set_focus('def_check_writer');
	}
	
	if ($input_error != 1) 
	{
		
    	if ($selected_id != -1) 
    	{
    		begin_transaction();
    		update_check_banking_reference($selected_id, $_POST['next_reference'], 
				$_POST['booklet_start'], $_POST['booklet_end'], $_POST['def_check_writer']);
    		commit_transaction();
    		
			display_notification(_('Selected bank chequing account settings has been updated'));
    	} 
    	else 
    	{
       		add_check_bank_ref($_POST['bank_ref'], $_POST['next_reference'], 
				$_POST['booklet_start'], $_POST['booklet_end'], $_POST['def_check_writer']);
			display_notification(_('New bank chequing account has been referenced'));
    	}
 		$Mode = 'RESET';
	}
} 

//-----------------------------------------------------------------------------------

function can_delete($selected_id)
{
	if ($selected_id == -1) return false;
	$sql= "SELECT COUNT(*) FROM ".TB_PREF."check_trans as a INNER JOIN ".TB_PREF."bank_trans as b ON a.bank_trans_id=b.id WHERE b.bank_act = ".get_account_code($selected_id);
	$result = db_query($sql, "could not query checking references");
	$myrow = db_fetch_row($result);
	if ($myrow[0] > 0) 
	{
		display_error(_("Cannot delete this bank chequing reference because there are live cheques issed for this account."));
		return false;
	}
	
	return true;
}


//-----------------------------------------------------------------------------------

if( $Mode == 'Delete')
{
	if (can_delete($selected_id))
	{
		delete_check_bank_ref($selected_id);
		display_notification(_('Selected bank account has been deleted'));
	}
	$Mode = 'RESET';
}

if ($Mode == 'RESET')
{
	$selected_id = -1;
	$_POST['next_reference']  = '';
	$_POST['booklet_start']  = '';
	$_POST['booklet_end']  = '';
}
//-----------------------------------------------------------------------------------

$result = get_all_assigned_checking_accounts();

start_form();
start_table($table_style);

$th = array(_("Account"), _("Bank Account Reference"),'Default Check Writer', _("Next Cheque No"),
			_("Booklet Start"),_("Booklet End"), "", "");
			
if ($_SESSION['wa_current_user']->access == 2) // admin only
	array_splice($th,3,0,'User');


$check_writers = array('0' => 'Select Check Writer', '1' => 'AUB', '2' => 'MetroBank');

table_header($th);
$k = 0;
while ($myrow = db_fetch($result)) 
{
	
	alt_table_row_color($k);	

	label_cell($myrow["bank_account_name"] . ' ('. $myrow["bank_account_number"] . ') - ' . $myrow["bank_curr_code"]);
	label_cell($myrow["bank_ref"]);
	label_cell($check_writers[$myrow['def_check_writer']]);
	
	
	if ($_SESSION['wa_current_user']->access == 2) // admin only
		label_cell(get_username_by_id($myrow['user_id']));
		
	label_cell($myrow["next_reference"]);
	label_cell($myrow["booklet_start"]);
	label_cell($myrow["booklet_end"]);

	edit_button_cell("Edit".$myrow["account_id"], _("Edit"));
	delete_button_cell("Delete".$myrow["account_id"], _("Delete"));
	end_row(); 
}
end_table();
end_form();
echo '<br>';
//-----------------------------------------------------------------------------------
start_form();

start_table($table_style2);

// $flag_count = false;
// if (get_unassigned_accounts_count() > 0) 
	$flag_count = true;
if ($selected_id != -1)
{
	//editing an existing status code
	if ($Mode == 'Edit') {
		$myrow = get_checking_account($selected_id);
		$_POST['next_reference']  = $myrow["next_reference"];
		$_POST['booklet_start']  = $myrow["booklet_start"];
		$_POST['booklet_end']  = $myrow["booklet_end"];
		$_POST['def_check_writer']  = $myrow["def_check_writer"];
		label_row(_("Bank Account:"), $myrow['bank_ref']);
	}
	hidden('selected_id', $selected_id);
}
if ($Mode== 'Edit') {
	set_focus('next_reference');
} else {
	if ($flag_count) unassigned_check_list_row(_("Unassigned Chequing Accounts:"), 'bank_ref', null, false);
	if ($flag_count) set_focus('bank_ref');
}

if ($flag_count || ($Mode=='Edit'))
{
	text_row_ex(_("Next Cheque No:"), 'next_reference', 40);
	text_row_ex(_("Booklet Start:"), 'booklet_start', 40);
	text_row_ex(_("Booklet End:"), 'booklet_end', 40);
	label_row('Default Check Writer:',array_selector('def_check_writer', null, $check_writers));
}
end_table(1);
// echo '<center>*** leave booklet start and end to bypass checking of check number if within the series</center>';
if ($flag_count || ($Mode=='Edit')) submit_add_or_update_center($selected_id == -1, '', true);

end_form();
//------------------------------------------------------------------------------------

end_page();

?>
