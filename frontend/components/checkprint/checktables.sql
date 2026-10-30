### Structure of table `0_check_account` ###

DROP TABLE IF EXISTS `0_check_account`;

CREATE TABLE `0_check_account` (
  `account_id` int(11) NOT NULL auto_increment,
  `bank_ref` varchar(11) collate utf8_unicode_ci NOT NULL,
  `next_reference` varchar(100) collate utf8_unicode_ci NOT NULL,
  PRIMARY KEY  USING BTREE (`account_id`),
  UNIQUE KEY `bank_ref` (`bank_ref`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci ROW_FORMAT=DYNAMIC AUTO_INCREMENT=1 ;


### Data of table `0_check_account` ###

### Structure of table `0_check_trans` ###

DROP TABLE IF EXISTS `0_check_trans`;

CREATE TABLE `0_check_trans` (
  `id` int(11) NOT NULL auto_increment,
  `check_ref` varchar(100) collate utf8_unicode_ci NOT NULL,
  `bank_trans_id` int(11) NOT NULL,
  `cheque_bank_id` int(11) NOT NULL,
  PRIMARY KEY  (`id`),
  UNIQUE KEY `cheque_ref` USING BTREE (`check_ref`,`cheque_bank_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci ROW_FORMAT=DYNAMIC AUTO_INCREMENT=1 ;


### Data of table `0_check_trans` ###