-- Checkprint columns used by includes/check_accounts_db.inc and check_issue_multiple.php.
-- Apply once in each branch database; IF NOT EXISTS keeps this safe for partial upgrades.
ALTER TABLE `0_check_account`
  ADD COLUMN IF NOT EXISTS `booklet_start` varchar(100) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS `booklet_end` varchar(100) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS `user_id` int(11) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `def_check_writer` int(11) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS `0_check_issue_batch` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `check_bank_id` int(11) NOT NULL,
  `bank_id` int(11) NOT NULL,
  `batch_no` int(11) NOT NULL,
  `stamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `user_id` int(11) NOT NULL,
  `check_writer` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `bank_batch` (`bank_id`,`batch_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `0_check_issue_batch_cv` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `batch_id` int(11) NOT NULL,
  `cv_id` int(11) NOT NULL,
  `bank_trans_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `batch_id` (`batch_id`),
  KEY `cv_id` (`cv_id`),
  KEY `bank_trans_id` (`bank_trans_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
