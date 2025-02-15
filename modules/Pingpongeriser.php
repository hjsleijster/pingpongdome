<?php

class Pingpongeriser
{
	use LiteriserModule;

	public function init() {
		$_SESSION['match'] = 1;
	}

	public function web() {
		Literiser::setTitle(__CLASS__);
		$r = '';

		$r .= $this->renderMatch();

		return $r;
	}

	private function renderMatch() {
		$r = '';
		$r .= '<div class="match">';
		$r .= $this->renderMatchSide(1);
		$r .= $this->renderMatchSide(2);
		$r .= '</div>';

		return $r;
	}

	private function renderMatchSide($side) {
		$r = '';

		$r .= '<div class="matchside side' . $side . '">';
		$r .= '<h1>' . $side . '</h1>';
		$r .= '<h2>0</h2>';
		$r .= '<button data-side="' . $side . '" class="score-plus">+</button>';
		$r .= '</div>';

		return $r;
	}


	private function xhr_scorePlus($args) {
		// $r = [];

		return $this->returnNumbers();
	}

	private function returnNumbers() {
		$r = [];
		$r['side1']['points'] = 10;
		$r['side1']['games'] = 2;
		$r['side2']['points'] = 8;
		$r['side2']['games'] = 0;

		return $r;
	}
}
