ALTER TABLE `points`
DROP FOREIGN KEY `points_ibfk_3`,
ADD FOREIGN KEY (`game`, `match_id`) REFERENCES `games` (`game`, `match_id`) ON DELETE CASCADE ON UPDATE RESTRICT;

ALTER TABLE `match_players`
DROP FOREIGN KEY `match_players_ibfk_1`,
ADD FOREIGN KEY (`match_id`) REFERENCES `matches` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

ALTER TABLE `games`
DROP FOREIGN KEY `games_ibfk_1`,
ADD FOREIGN KEY (`match_id`) REFERENCES `matches` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
