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

// header('Content-Type: text/csv; charset=utf-8');

$id = $_GET['id'];

$sql = "SELECT * FROM ".TB_PREF."csv
		WHERE id = $id";
$res = db_query($sql);
$row = db_fetch($res);

global $db_connections;
// display_error($db_connections[0][1]);

header('Content-Disposition: attachment; filename='.strtoupper($db_connections[$_SESSION['wa_current_user']->company]
		['srs_branch']).'_BPS_batch_'.$id.'.csv');

$target = $path_to_root.'/csv/'.$row['csv_file'];

readfile($target);

?>