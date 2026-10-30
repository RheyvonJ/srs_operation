<?php

function get_all_assigned_checking_accounts() {

	$sql = "SELECT * FROM ".TB_PREF."check_account as a INNER 
			JOIN ".TB_PREF."bank_accounts as b 
			ON a.bank_ref=b.account_code";
			
	if ($_SESSION['wa_current_user']->access != 2)	
		$sql .= " WHERE user_id = ".$_SESSION['wa_current_user']->user;

	return db_query($sql, "could not get all chequing accounts");

}

function get_all_unassigned_checking_accounts() {
	$sql_ = " WHERE user_id = ". $_SESSION['wa_current_user']->user;
	
	$sql = "SELECT * FROM ".TB_PREF."bank_accounts WHERE account_code 
			NOT IN (SELECT bank_ref FROM ".TB_PREF."check_account $sql_) 
			AND account_type=1";

	return db_query($sql, "could not get all chequing accounts");

}


function get_checking_account($account_id)
{
	$sql = "SELECT * FROM ".TB_PREF."check_account WHERE account_id=$account_id";

	$result = db_query($sql, "could not get chequing account");

	return db_fetch($result);
}

function get_checking_account_bank($account_id)
{
	$sql = "SELECT b.* FROM ".TB_PREF."check_account a, ".TB_PREF."bank_accounts b
			WHERE a.bank_ref = b.account_code
			AND account_id = $account_id";
	$res = db_query($sql);
	$row = db_fetch($res);
	return $row;
}

function get_checking_account_bank_id($account_id)
{
	$sql = "SELECT b.id FROM ".TB_PREF."check_account a, ".TB_PREF."bank_accounts b
			WHERE a.bank_ref = b.account_code
			AND account_id = $account_id";
	$res = db_query($sql);
	$row = db_fetch($res);
	return $row[0];
}

function get_checking_account_bank_name($account_id)
{
	$sql = "SELECT b.bank_name FROM ".TB_PREF."check_account a, ".TB_PREF."bank_accounts b
			WHERE a.bank_ref = b.account_code
			AND account_id = $account_id";
	$res = db_query($sql);
	$row = db_fetch($res);
	return $row[0];
}

function update_check_banking_reference($account_id, $reference, $booklet_start='', $booklet_end='', $def_check_writer)
{

	$sql = "UPDATE ".TB_PREF."check_account SET 
				next_reference = ".db_escape(trim($reference)).",
				def_check_writer = ".$def_check_writer.",
				booklet_start = ".db_escape(trim($booklet_start)).",
				booklet_end = ".db_escape(trim($booklet_end))."
			WHERE account_id=$account_id";
	db_query($sql, "could not update bank chequing account reference");
}

function add_check_bank_ref($bank_ref, $reference, $booklet_start='', $booklet_end='', $def_check_writer)
{

	$sql = "INSERT INTO ".TB_PREF."check_account (bank_ref, next_reference, booklet_start, booklet_end, def_check_writer, user_id)
			VALUES ($bank_ref, " . db_escape(trim($reference)) . "," . 
				db_escape(trim($booklet_start)) . "," . db_escape(trim($booklet_end)) . ",$def_check_writer,".
				$_SESSION["wa_current_user"]->user.")";

	db_query($sql, "could not add bank chequing reference entry");
}

function delete_check_bank_ref($account_id) {

	$sql = "DELETE FROM ".TB_PREF."check_account WHERE account_id=$account_id";

	db_query($sql,"could not delete bank chequing account");
}

function get_account_code($account_id) {

	$sql = "SELECT bank_ref FROM ".TB_PREF."check_account WHERE account_id=$account_id";

	$result = db_query($sql, "could not account code");
	$row = db_fetch_row($result);
	return $row[0];
}

function get_unassigned_accounts_count() {

	return db_num_rows(get_all_unassigned_checking_accounts());
}

function is_issued_check($type, $trans_no) {

	$sql = "SELECT COUNT(*) FROM ".TB_PREF."check_trans as a INNER JOIN ".TB_PREF."bank_trans as b ON a.bank_trans_id = b.id WHERE b.type=$type AND b.trans_no=$trans_no";

	$result = db_query($sql, "could not get issued check boolean");
	$row = db_fetch_row($result);
	return ($row[0] > 0);

}

function show_check_ref($type, $trans_no, $id) {

	$sql = "SELECT check_ref,cheque_bank_id FROM ".TB_PREF."check_trans as a INNER JOIN ".TB_PREF."bank_trans as b ON a.bank_trans_id = b.id WHERE b.type=$type AND b.trans_no=$trans_no AND b.id=$id";

	$result = db_query($sql, "could not get cheque reference ");
	$row = db_fetch_row($result);
	return array($row[0], $row[1]);
}

function get_trans_id_and_bank_account($trans_no) {

	$sql = "SELECT ".TB_PREF."bank_trans.id, account_id, account_code FROM ".TB_PREF."bank_trans, ".TB_PREF."bank_accounts INNER JOIN ".TB_PREF."check_account ON bank_ref=account_code WHERE trans_no=$trans_no";

	$result = db_query($sql, "could not get bank trans id ");
	$row = db_fetch_row($result);
	return array($row[0], $row[1], $row[2]);
}

function get_trans_id_and_bank_account2($trans_no, $type) {

	$sql = "SELECT ".TB_PREF."bank_trans.id, account_id, account_code 
		FROM ".TB_PREF."bank_trans, ".TB_PREF."bank_accounts INNER 
		JOIN ".TB_PREF."check_account ON bank_ref=account_code 
		WHERE trans_no=$trans_no AND type=$type";

	$result = db_query($sql, "could not get bank trans id ");
	$row = db_fetch_row($result);
	return array($row[0], $row[1], $row[2]);
}

function get_paymentline($trans_no)
{

    // Sherifoz 22.06.03 Also get the description
    $sql = "SELECT ".TB_PREF."supp_trans.type, ".TB_PREF."supp_trans.trans_no,
    	".TB_PREF."supp_trans.tran_date, ".TB_PREF."supp_trans.reference, ".TB_PREF."supp_trans.supp_reference,
    	(".TB_PREF."supp_trans.ov_amount + ".TB_PREF."supp_trans.ov_gst  + ".TB_PREF."supp_trans.ov_discount) AS TotalAmount, ".TB_PREF."supp_trans.alloc AS Allocated,
		((".TB_PREF."supp_trans.type = 20 OR ".TB_PREF."supp_trans.type = 21) AND ".TB_PREF."supp_trans.due_date < '" . date2sql(Today()) . "') AS OverDue,
    	(ABS(".TB_PREF."supp_trans.ov_amount + ".TB_PREF."supp_trans.ov_gst  + ".TB_PREF."supp_trans.ov_discount - ".TB_PREF."supp_trans.alloc) <= 0.005) AS Settled,
		".TB_PREF."suppliers.curr_code, ".TB_PREF."suppliers.supp_name, ".TB_PREF."supp_trans.due_date
    	FROM ".TB_PREF."supp_trans, ".TB_PREF."suppliers
    	WHERE ".TB_PREF."suppliers.supplier_id = ".TB_PREF."supp_trans.supplier_id
    	AND ".TB_PREF."supp_trans.trans_no = $trans_no";
		$sql .= " AND ".TB_PREF."supp_trans.type = 22";

	$result = db_query($sql,"No supplier transactions were returned");
	return db_fetch($result);
}

function is_new_cheque($trans_no, $check_ref) {

	list (, $account_id,) = get_trans_id_and_bank_account($trans_no);

	$sql = "SELECT check_ref FROM ".TB_PREF."check_trans WHERE cheque_bank_id = $account_id AND check_ref =" . db_escape(trim($check_ref));

	$result = db_query($sql, "could not test for unique reference");

	return (db_num_rows($result) == 0);

}

function is_new_cheque_srs($bank_id, $check_ref) 
{

	$bank_gl_account = get_bank_gl_account($bank_id);
	$sql = "SELECT account_id FROM ".TB_PREF."check_account WHERE bank_ref=".db_escape($bank_gl_account);
	$res = db_query($sql);
	$row = db_fetch($res);
	
	$sql = "SELECT check_ref FROM ".TB_PREF."check_trans 
	WHERE cheque_bank_id = ".$row[0]." AND check_ref =" . db_escape(trim($check_ref));

	$result = db_query($sql, "could not test for unique reference");

	return (db_num_rows($result) == 0);

}

function get_next_check_reference($trans_no)
{

	list (, ,$bank_ref) = get_trans_id_and_bank_account($trans_no);

    $sql = "SELECT next_reference FROM ".TB_PREF."check_account WHERE bank_ref = $bank_ref";

    $result = db_query($sql,"The last transaction cheque ref could not be retrieved");

    $row = db_fetch_row($result);
    return $row[0];
}

function save_next_check_reference($account_id, $check_ref)
{
    $sql = "UPDATE ".TB_PREF."check_account SET 
				next_reference=" . db_escape(trim($check_ref)) . " 
			WHERE account_id=$account_id";

	db_query($sql, "The next transaction cheque ref could not be updated");
}


function add_check($check_account, $bank_trans_id, $reference)
{

	$sql = "INSERT INTO ".TB_PREF."check_trans (check_ref, bank_trans_id, cheque_bank_id)
			VALUES (".db_escape($reference).", $bank_trans_id, $check_account)";
	db_query($sql, "Cannot Add new Cheque");
	return db_insert_id();

}


function issue_check_number($trans_no, $reference) {

	begin_transaction();

	list($bank_trans_id, $account_id,) = get_trans_id_and_bank_account($trans_no);

	add_check($account_id, $bank_trans_id, $reference);

	save_last_cheque($account_id, $reference);

	commit_transaction();
}

function issue_check_number2($trans_no, $reference, $type, $id) {

	list($bank_trans_id, $account_id,) = get_trans_id_and_bank_account2($trans_no, $type);

	add_check($account_id, $id, $reference);

	save_last_cheque($account_id, $reference);

}

function issue_check_number3($check_account_id,$bank_trans_id,$reference)
{	
	add_check($check_account_id, $bank_trans_id, $reference);
	save_last_cheque($check_account_id, $reference);
}

function get_trans_from_check($check_num, $bank_act) {

	$trans_type = 22;

	$sql = "SELECT ".TB_PREF."supp_trans.*, (".TB_PREF."supp_trans.ov_amount+".TB_PREF."supp_trans.ov_gst+".TB_PREF."supp_trans.ov_discount) AS Total,
		".TB_PREF."suppliers.supp_name AS supplier_name, ".TB_PREF."suppliers.curr_code AS SupplierCurrCode, ".TB_PREF."suppliers.address AS SupplierAddress";

	// it's a payment so also get the bank account
	$sql .= ", ".TB_PREF."bank_accounts.bank_name, ".TB_PREF."bank_accounts.bank_account_name, ".TB_PREF."bank_accounts.bank_curr_code,
			".TB_PREF."bank_trans.amount AS BankAmount,
			".TB_PREF."bank_trans.ref ";

	$sql .= " FROM ".TB_PREF."supp_trans, ".TB_PREF."suppliers ";


	// it's a payment so also get the bank account
	$sql .= ", ".TB_PREF."bank_trans, ".TB_PREF."bank_accounts, ".TB_PREF."check_trans, ".TB_PREF."check_account" ;

	$sql .= " WHERE ".TB_PREF."supp_trans.supplier_id=".TB_PREF."suppliers.supplier_id";
		$sql .= " AND ".TB_PREF."supp_trans.type=$trans_type ";
		$sql .= " AND ".TB_PREF."check_trans.bank_trans_id=".TB_PREF."bank_trans.id";
		$sql .= " AND ".TB_PREF."check_trans.check_ref=".db_escape(trim($check_num));
		$sql .= " AND ".TB_PREF."check_trans.cheque_bank_id=$bank_act ";
		$sql .= " AND ".TB_PREF."check_trans.cheque_bank_id=".TB_PREF."check_account.account_id ";


	// it's a payment so also get the bank account
	$sql .= " AND ".TB_PREF."bank_trans.trans_no = ".TB_PREF."supp_trans.trans_no
			AND ".TB_PREF."bank_trans.type=$trans_type
			AND ".TB_PREF."bank_accounts.id=".TB_PREF."bank_trans.bank_act ";

	$result = db_query($sql, "Cannot retrieve a supplier transaction");

    if (db_num_rows($result) == 0)
    {
       // can't return nothing
       display_db_error("no supplier trans found for given params a", $sql, true);
       exit;
    }

    if (db_num_rows($result) > 1)
    {
       // can't return multiple
       display_db_error("duplicate supplier transactions found for given params", $sql, true);
       exit;
    }

    return db_fetch($result);

}

function get_trans_from_check_2($bank_trans_id) {

	$trans_type = 22;

	$sql = "SELECT  DISTINCT ";

	// it's a payment so also get the bank account
	$sql .= " ".TB_PREF."bank_accounts.bank_name, ".TB_PREF."bank_accounts.bank_account_name, ".TB_PREF."bank_accounts.bank_curr_code,
			".TB_PREF."bank_trans.amount AS BankAmount,
			".TB_PREF."bank_trans.* ";

	$sql .= " FROM ";


	// it's a payment so also get the bank account
	$sql .= " ".TB_PREF."bank_trans, ".TB_PREF."bank_accounts, ".TB_PREF."check_trans, ".TB_PREF."check_account" ;

	$sql .= " WHERE ".TB_PREF."bank_trans.id IN ($bank_trans_id)";
		// $sql .= " AND ".TB_PREF."check_trans.check_ref=".db_escape(trim($check_num));
		// $sql .= " AND ".TB_PREF."check_trans.cheque_bank_id=$bank_act ";
		$sql .= " AND ".TB_PREF."check_trans.bank_trans_id='$bank_trans_id'";
		$sql .= " AND ".TB_PREF."check_trans.cheque_bank_id=".TB_PREF."check_account.account_id ";


	// it's a payment so also get the bank account
	$sql .= " AND ".TB_PREF."bank_accounts.id=".TB_PREF."bank_trans.bank_act ";

	$result = db_query($sql, "Cannot retrieve a supplier transaction");

    if (db_num_rows($result) == 0)
	{
		$sql = "SELECT  DISTINCT ";

		// it's a payment so also get the bank account
		$sql .= " ".TB_PREF."bank_accounts.bank_name, ".TB_PREF."bank_accounts.bank_account_name, ".TB_PREF."bank_accounts.bank_curr_code,
				".TB_PREF."bank_trans.amount AS BankAmount,
				".TB_PREF."bank_trans.* ";

		$sql .= " FROM ";


		// it's a payment so also get the bank account
		$sql .= " ".TB_PREF."bank_trans, ".TB_PREF."bank_accounts, ".TB_PREF."check_trans, ".TB_PREF."check_account" ;

		$sql .= " WHERE ".TB_PREF."bank_trans.id IN ($bank_trans_id)";
			// $sql .= " AND ".TB_PREF."check_trans.check_ref=".db_escape(trim($check_num));
			// $sql .= " AND ".TB_PREF."check_trans.cheque_bank_id=$bank_act ";
			$sql .= " AND ".TB_PREF."check_trans.bank_trans_id='$bank_trans_id'";


		// it's a payment so also get the bank account
		$sql .= " AND ".TB_PREF."bank_accounts.id=".TB_PREF."bank_trans.bank_act ";

		$result = db_query($sql, "Cannot retrieve a supplier transaction");
	}
    if (db_num_rows($result) == 0)
    {
       // can't return nothing
       display_db_error("no supplier trans found for given params b", $sql, true);
       exit;
    }

    // if (db_num_rows($result) > 1)
    // {
       // // can't return multiple
       // display_db_error("duplicate supplier transactions found for given params", $sql, true);
       // exit;
    // }

    return db_fetch($result);

}

function get_next_check_reference2($account_id) //bank_ref is the account_code GL code
{
	$sql = "SELECT next_reference FROM ".TB_PREF."check_account 
			WHERE account_id = $account_id";
    $result = db_query($sql);

    $row = db_fetch_row($result);
    return $row[0];
}

function get_bank_trans_of_cv($bank_trans_id)
 {
	$sql = "SELECT * FROM ".TB_PREF."bank_trans WHERE id IN (".$bank_trans_id.")";
	$res = db_query($sql,'no bank trans found for this bank ref');
	return db_fetch($res);
 }
 
function is_check_within_booklet($bank_id, $check_ref)
{
	$sql = "SELECT * FROM ".TB_PREF."check_account 
			WHERE account_id = $bank_id";
	$res = db_query($sql);
	$row = db_fetch($res);
	
	if (($row['booklet_start'] - $check_ref > 0) AND ($row['booklet_start'] != ''))
		return array($row['booklet_start'],$row['booklet_end']);
	
	if (($row['booklet_end'] - $check_ref < 0)  AND ($row['booklet_end'] != ''))
		return array($row['booklet_start'],$row['booklet_end']);
		
	return true;
}

function get_checking_account_batch_no($account_id)
{
	$bank_id = get_checking_account_bank_id($account_id);
	
	$sql = "SELECT MAX(batch_no) FROM ".TB_PREF."check_issue_batch
			WHERE bank_id = ".$bank_id;
	$res = db_query($sql);
	$row = db_fetch($res);
	
	return $row[0] + 1;
}

function check_checking_account_batch_no($account_id,$batch_no)
{
	$bank_id = get_checking_account_bank_id($account_id);
	
	$sql = "SELECT * FROM ".TB_PREF."check_issue_batch 
			WHERE bank_id = ".$bank_id."
			AND batch_no = ".$batch_no;
	$res = db_query($sql);
	
	return (db_num_rows($res) == 0);
}

?>