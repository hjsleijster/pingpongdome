<?php

use LiteriserDB as DB;

class Pingpongeriser
{
	use LiteriserModule;

	private $match_id;

	public function init() {
		$this->match_id = $_GET['match'] ?? null;

		$debug = 0;
		if ($debug) {
			header('Content-type: text/plain');
			self::recalculateMatch($match);
			$data = self::getMatchData($match);
			echo '<pre>' . print_r($data, true) . '</pre>';
			exit;
		}
	}

	public function web() {
		Literiser::setTitle(__CLASS__);
		Literiser::addHeadTag('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>');
		Literiser::addHeadTag('<link href="https://fonts.googleapis.com/css2?family=Ubuntu+Mono:ital,wght@0,400;0,700;1,400;1,700&family=Ubuntu:ital,wght@0,300;0,400;0,500;0,700;1,300;1,400;1,500;1,700&display=swap" rel="stylesheet">');
		Literiser::addHeadTag('<meta meta name="viewport" content="user-scalable=no">');
		$r = '';

		$r .= $this->renderMatch();

		return $r;
	}

	private function renderMatch() {
		$r = '';
		$r .= '<div class="match" data-match="' . $this->match_id . '">';
		$r .= $this->renderSide(1);
		$r .= $this->renderSide(2);
		$r .= '<span class="score-undo round-button">↶</span>';
		$r .= '<span class="switch-sides round-button">⇄</span>';
		$r .= '</div>';

		return $r;
	}

	private function renderSide($side) {
		$r = '';

		$r .= '<div class="side side' . $side . '" data-side="' . $side . '">';
		$r .= '<h1 class="player">&nbsp;</h1>';
		$r .= '<span class="score-plus round-button">+</span>';
		$r .= '<div class="points">&nbsp;</div>';
		$r .= '<div class="games">&nbsp;</div>';
		$r .= '</div>';

		return $r;
	}

	private function getMatchData($match_id) {
		$data = [
			'match' => DB::row("
				SELECT m.*, IFNULL(SUM(g.won_by_side = 1), 0) `side1_games`, IFNULL(SUM(g.won_by_side = 2), 0) `side2_games`
				FROM matches m
				LEFT JOIN games g ON m.id = g.match_id AND g.won_by_side IS NOT NULL
				WHERE m.id = " . $match_id . "
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

	private function xhr_updateMatch($request) {
		$data = self::getMatchData($request['match']);

		$r = [];
		$r['match'] = $data['match'];
		$r['games'] = $data['games'];

		$r['state'] = [];
		if ($data['games']) {
			$lastGame = end($data['games']);
			foreach ([1, 2] as $side) {
				$r['state']['side' . $side]['games'] = $data['match']['side' . $side . '_games'];
				$r['state']['side' . $side]['points'] = $lastGame['side' . $side . '_points'];
			}

			foreach ($data['players'] as $player) {
				$r['state']['side' . $player['side']]['player'] = $player['first_name'];
			}
		}

		return $r;
	}

	private function xhr_scorePlus($request) {
		$match_id = (int) $request['match'];
		$side = (int) $request['side'];

		$game = DB::val("SELECT game FROM games WHERE won_by_side IS NULL AND match_id = " . $match_id);
		DB::q("INSERT INTO points (match_id, game, side) VALUES (" . $match_id . ", " . $game . ", " . $side . ")");

		$this->recalculateMatch($match_id);
		return $this->xhr_updateMatch(['match' => $match_id]);
	}

	private function xhr_scoreUndo($request) {
		$match_id = (int) $request['match'];
		DB::q("DELETE FROM points WHERE match_id = " . $match_id . " ORDER BY id DESC LIMIT 1");
		$data = self::getMatchData($match_id);
		$lastGame = end($data['games']);
		if ($lastGame['side1_points'] == 0 && $lastGame['side2_points'] == 0 && count($data['games']) > 1) {
			DB::q("DELETE FROM games WHERE match_id = " . $match_id . " AND game = " . $lastGame['game']);
			DB::q("UPDATE games SET won_by_side = NULL WHERE match_id = " . $match_id . " AND game = " . ($lastGame['game'] - 1));
		}

		$this->recalculateMatch($match_id);
		return $this->xhr_updateMatch(['match' => 1]);
	}

	private function recalculateMatch($match_id) {
		$data = self::getMatchData($match_id);
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
}
