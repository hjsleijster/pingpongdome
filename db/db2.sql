ALTER TABLE `points`
DROP FOREIGN KEY `points_ibfk_2`,
ADD FOREIGN KEY (`game`, `match_id`) REFERENCES `games` (`game`, `match_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `points`
DROP FOREIGN KEY `points_ibfk_1`
