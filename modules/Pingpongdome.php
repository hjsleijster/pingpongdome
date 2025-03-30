<?php

use LiteriserDB as DB;

class Pingpongdome
{
	use LiteriserModule;

	private $match_id;

	public function init() {
		$this->match_id = $_GET['match'] ?? null;

		if (isset($_GET['debug'])) {
			header('Content-type: text/plain');
			// self::recalculateMatch();
			$data = self::getMatchData();
			echo '<pre>' . print_r($data, true) . '</pre>';
			exit;
		}
	}

	public function web() {
		Literiser::setTitle(__CLASS__);
		Literiser::addHeadTag('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>');
		Literiser::addHeadTag('<link href="https://fonts.googleapis.com/css2?family=Ubuntu+Mono:ital,wght@0,400;0,700;1,400;1,700&family=Ubuntu:ital,wght@0,300;0,400;0,500;0,700;1,300;1,400;1,500;1,700&display=swap" rel="stylesheet">');
		Literiser::addHeadTag('<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">');
		Literiser::addHeadTag('<script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js"></script>');
		Literiser::addHeadTag('<script src="/assets/jquery.touch.min.js"></script>');
		$r = '';

		$r .= $this->renderMatch();
		$r .= $this->renderMenu();

		return $r;
	}

	private function renderMenu() {
		$selectName = function($side) {
			$players = DB::rows("SELECT id, first_name FROM players WHERE deleted_at IS NULL ORDER BY first_name ASC");
			$r = '<select name="player-side' . $side . '" required><option></option>';
			foreach ($players as $player) {
				$r .= '<option value="' . $player['id'] . '">' . $player['first_name'] . '</option>';
			}
			$r .= '</select>';
			return $r;
		};

		$r = '';
		$r .= '<div class="options-modal">';
		$r .= '<div class="options">';

		$r .= '<form>';
		$r .= '<input type="hidden" name="match" value="">';
		$r .= '<label>Best out of: ';
		$r .= '<label><input type="radio" name="best_out_of" value="1" required> 1</label>';
		$r .= '<label><input type="radio" name="best_out_of" value="3" required> 3</label>';
		$r .= '<label><input type="radio" name="best_out_of" value="5" required> 5</label>';
		$r .= '</label>';

		$r .= '<label class="new-match">Speler 1: ' . $selectName(1) . '</label>';
		$r .= '<label class="new-match">Speler 2: ' . $selectName(2) . '</label>';

		$r .= '<input type="submit" class="button new-match" value="Start!">';
		$r .= '<input type="submit" class="button edit-match" value="Wedstrijd aanpassen">';
		$r .= '</form>';
		$r .= '<a id="end-match" class="button">Wedstrijd beëindigen</a>';
		$r .= '</div>';

		$r .= '</div>';
		$r .= '</div>';

		return $r;
	}

	private function renderMatch() {
		$r = '';
		$r .= '<div class="match" data-match="' . $this->match_id . '">';
		$r .= $this->renderSide(1);
		$r .= $this->renderSide(2);
		$r .= '<span id="score-undo" class="round-button match-action">↶</span>';
		$r .= '<span id="switch-sides" class="round-button match-action">⇄</span>';
		$r .= '<span id="enable-fullscreen" class="round-button">⛶</span>';
		$r .= '<span id="toggle-options" class="round-button">≡</span>';
		$r .= '</div>';

		return $r;
	}

	private function renderSide($side) {
		$r = '';
		$r .= '<div class="side side' . $side . '" data-side="' . $side . '">';
		$r .= '<h1 class="player">&nbsp;</h1>';
		$r .= '<span class="score-plus round-button match-action">+</span>';
		$r .= '<div class="points">&nbsp;</div>';
		$r .= '<div class="games">&nbsp;</div>';
		$r .= '</div>';

		return $r;
	}

	private function getMatchData($match_id = null) {
		$match_id = $match_id ?? $this->match_id;

		$exists = DB::val("SELECT id, deleted_at FROM matches WHERE deleted_at IS NULL AND id = " . $match_id);
		if (!$exists) {
			return [];
		}

		$data = [
			'match' => DB::row("
				SELECT m.*, g.side1_games, g.side2_games
				FROM matches m
				LEFT JOIN (
					SELECT
					match_id
					, SUM(won_by_side = 1) AS side1_games
					, SUM(won_by_side = 2) AS side2_games
					FROM games
					WHERE won_by_side IS NOT NULL
					GROUP BY match_id
					) AS g ON m.id = g.match_id
				WHERE deleted_at IS NULL AND m.id = " . $match_id . "
				GROUP BY m.id"
			),
			'games' => DB::rows(
				"SELECT g.game, g.won_by_side, IFNULL(SUM(p.side = 1), 0) `side1_points`, IFNULL(SUM(p.side = 2), 0) `side2_points`
				FROM games g
				LEFT JOIN points p ON g.game = p.game AND p.match_id = g.match_id
				WHERE g.match_id = " . $match_id . "
				GROUP BY g.game
				ORDER BY g.game"
			),
			'players' => DB::rows(
				"SELECT mp.side, p.first_name, p.full_name
				FROM match_players mp
				INNER JOIN players p ON mp.player_id = p.id
				WHERE mp.match_id = " . $match_id
			),
		];

		return $data;
	}

	private function recalculateMatch($match_id = null) {
		$match_id = $match_id ?? $this->match_id;

		$data = self::getMatchData($match_id);
		if (!$data) {
			return;
		}

		$lastGame = end($data['games']);
		$side1points = $lastGame['side1_points'];
		$side2points = $lastGame['side2_points'];
		$mostPoints = max($side1points, $side2points);
		$pointsDiff = abs($side1points - $side2points);

		// game won
		if ($mostPoints >= 11 && $pointsDiff >= 2) {
			$wonBySide = $side1points > $side2points ? 1 : 2;
			DB::q("UPDATE games SET won_by_side = " . $wonBySide . " WHERE match_id = " . $match_id . " AND game = " . $lastGame['game']);

			// match won
			if ($data['match']['side' . $wonBySide . '_games'] + 1 > $data['match']['best_out_of'] / 2) {
				DB::q("UPDATE matches SET won_by_side = " . $wonBySide . ", finished_at = NOW() WHERE id = " . $match_id);
			// new game
			} else {
				DB::q("INSERT INTO games (match_id, game) VALUES (" . $match_id . ", " . (count($data['games']) + 1) . ")");
			}
		}
	}

	private function xhr_getMatch() {
		$data = self::getMatchData();
		if (!$data) {
			return [];
		}

		$r = [];
		$r['match'] = $data['match'];
		$r['games'] = $data['games'];

		$r['sides'] = [];
		if ($data['games']) {
			$lastGame = end($data['games']);
			foreach ([1, 2] as $side) {
				$r['sides'][$side]['games'] = $data['match']['side' . $side . '_games'];
				$r['sides'][$side]['points'] = $lastGame['side' . $side . '_points'];
			}

			foreach ($data['players'] as $player) {
				$r['sides'][$player['side']]['player'] = $player['first_name'];
			}
		}

		$startedMatch = $data['match']['side_started'];
		$otherSide = $startedMatch == 1 ? 2 : 1;
		$startedGame = count($data['games']) % 2 == 1 ? $data['match']['side_started'] : $otherSide;
		$otherSide = $startedGame == 1 ? 2 : 1;
		$totalPointsGame = $lastGame['side1_points'] + $lastGame['side2_points'];
		if ($totalPointsGame > 20) {
			$serving = $totalPointsGame % 2 == 0 ? $startedGame : $otherSide;
		} else {
			$serving = $totalPointsGame % 4 < 2 ? $startedGame : $otherSide;
		}
		$r['match']['serving'] = $serving;

		return $r;
	}

	private function xhr_newMatch() {
		$player1 = (int) $this->request['player-side1'];
		$player2 = (int) $this->request['player-side2'];
		$bestOutOf = (int) $this->request['best_out_of'];
		if ($player1 == $player2) {
			return ['error' => 'Kies 2 verschillende spelers'];
		}

		$type = 'single';

		$sideStarted = 1;
		if ($type == 'single') {
			$sideStartedLastMatch = DB::val("SELECT side_started FROM matches
				WHERE id IN (SELECT match_id FROM match_players WHERE player_id IN (" . $player1 . ',' . $player2 . ") GROUP BY match_id HAVING COUNT(*) > 1)
				AND type = 'single' AND finished_at IS NOT NULL AND deleted_at IS NULL
				ORDER BY id DESC LIMIT 1");
			if ($sideStartedLastMatch) {
				$sideStarted = $sideStartedLastMatch == 1 ? 2 :1;
			} else {
				$sideStarted = rand(1, 2);
			}
		}

		$this->match_id = DB::q("INSERT INTO matches (type, best_out_of, side_started) VALUES ('" . $type . "', " . $bestOutOf . ", " . $sideStarted . ")");
		DB::q("INSERT INTO match_players (match_id, player_id, side) VALUES (" . $this->match_id . ", " . $player1 . ", 1)");
		DB::q("INSERT INTO match_players (match_id, player_id, side) VALUES (" . $this->match_id . ", " . $player2 . ", 2)");
		DB::q("INSERT INTO games (match_id, game) VALUES (" . $this->match_id . ", 1)");

		return $this->xhr_getMatch();
	}

	private function xhr_updateMatch() {
		$this->match_id = (int) $this->request['match'];
		$bestOutOf = (int) $this->request['best_out_of'];

		DB::q("UPDATE matches SET best_out_of = " . $bestOutOf . " WHERE id = " . $this->match_id);

		return $this->xhr_getMatch();
	}

	private function xhr_endMatch() {
		DB::q("UPDATE matches SET deleted_at = NOW() WHERE id = " . (int) $this->request['match']);
	}

	private function xhr_scorePlus() {
		$this->match_id = (int) $this->request['match'];
		$side = (int) $this->request['side'];

		$game = DB::val("SELECT game FROM games WHERE won_by_side IS NULL AND match_id = " . $this->match_id);
		DB::q("INSERT INTO points (match_id, game, side) VALUES (" . $this->match_id . ", " . $game . ", " . $side . ")");

		$this->recalculateMatch();
		return $this->xhr_getMatch();
	}

	private function xhr_scoreUndo() {
		$this->match_id = (int) $this->request['match'];
		$lastPoint = DB::val("SELECT id FROM points WHERE match_id = " . $this->match_id . " ORDER BY id DESC LIMIT 1");
		if ($lastPoint) {
			DB::q("DELETE FROM points WHERE id = " . $lastPoint);
		}

		$data = self::getMatchData();
		$lastGame = end($data['games']);

		// undo win
		if ($data['match']['won_by_side']) {
			DB::q("UPDATE matches SET won_by_side = NULL, finished_at = NULL WHERE id = " . $this->match_id);
			DB::q("UPDATE games SET won_by_side = NULL WHERE match_id = " . $this->match_id . " AND game = " . $lastGame['game']);
		}

		// zero points
		if ($lastGame['side1_points'] == 0 && $lastGame['side2_points'] == 0) {
			// undo previous game win
			if (count($data['games']) > 1) {
				DB::q("DELETE FROM games WHERE match_id = " . $this->match_id . " AND game = " . $lastGame['game']);
				DB::q("UPDATE games SET won_by_side = NULL WHERE match_id = " . $this->match_id . " AND game = " . ($lastGame['game'] - 1));
			// delete match
			} elseif (!$lastPoint) {
				DB::q("DELETE FROM games WHERE match_id = " . $this->match_id . " AND game = " . $lastGame['game']);
				DB::q("UPDATE matches SET deleted_at = NOW() WHERE id = " . $this->match_id);
			}
		}

		$this->recalculateMatch();
		return $this->xhr_getMatch();
	}
}
