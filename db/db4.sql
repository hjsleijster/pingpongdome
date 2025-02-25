ALTER TABLE `points` CHANGE `side` `side` tinyint unsigned NOT NULL AFTER `game`;
ALTER TABLE `matches` ADD `side_started` tinyint unsigned NOT NULL AFTER `best_out_of`;
