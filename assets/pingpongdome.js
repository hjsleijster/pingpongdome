"use strict"
var moduleUrl = '/pingpongdome/';
var matchId;

$(function() {
	matchId = $('.match').data('match');

	$('.score-plus').on('click', function() {
		let side = $(this).parent().data('side');
		$.post(moduleUrl + 'scorePlus', {match: matchId, side: side}, function(data) {
			updateMatch(data);
		});
	});

	$('#score-undo').on('click', function() {
		$.post(moduleUrl + 'scoreUndo', {match: matchId}, function(data) {
			updateMatch(data);
		});
	});

	$('#switch-sides').on('click', function() {
		$('.side1').toggleClass('switched');
	});

	$('#toggle-options').on('click', function() {
		toggleOptions();
	});

	$('form').on('submit', function(e) {
		e.preventDefault();
		let form = this;
		let endpoint = matchId ? 'updateMatch/' + matchId : 'newMatch';
		let data = $(this).serializeArray();
		$.post(moduleUrl + endpoint, data , function(data) {
			if (data.error) {
				$('.error', form).remove();
				$(form).prepend('<div class="error">' + data.error + '</div>');
				return;
			}

			if (!matchId) {
				window.history.pushState('', '', '?match=' + data.match.id);
			}

			updateMatch(data);
			$('.options').removeClass('open');
			$('.error', form).remove();
		});
	})


	$('#end-match').on('click', function() {
		if (confirm('Sure?')) {
			$.post(moduleUrl + 'endMatch', {match: matchId}, function(data) {
				window.location.href = '?';
			});
		}
	});

	if (matchId) {
		getMatchData();
	} else {
		$('#toggle-options').click();
	}
});

function getMatchData() {
	$.get(moduleUrl + 'getMatch', {match: matchId}, function(data) {
		updateMatch(data);
	});
}

function updateMatch(data) {
	if (!Object.keys(data.sides).length) {
		return;
	}
	let sides = data.sides;

	if (data.match.won_by_side) {
		fireworks(data.match.won_by_side);
	}

	$('.match').data('match', data.match.id);
	matchId = $('.match').data('match');

	for (var i = 1; i <= 2; i++) {
		let side = sides[i];
		['player', 'points', 'games'].forEach(function(field) {
			let el = $('.' + field, '.side' + i);
			if (el.text() != side[field]) {
				el.fadeOut(100, function() {
					el.text(side[field]).fadeIn(600);
				});
			}
		});
	}

	$('.match-action').toggle(!data.match.finished_at);
	$('#score-undo').toggle(0 != sides[1].points + sides[1].games + sides[2].points + sides[2].games);

	$('[name=best_out_of][value=' + data.match.best_out_of + ']').prop('checked', true);
}

function toggleOptions() {
	$('.options').toggleClass('open');

	if ($('.options').hasClass('open')) {
		if (matchId) {
			$('select[name^="player-side"]').attr('required', false);
			$('.edit-match').show();
			$('.new-match').hide();
		} else {
			$('select[name^="player-side"]').attr('required', true);
			$('.edit-match').hide();
			$('.new-match').show();
		}
	}
}

function fireworks(side) {
	var duration = 15 * 1000;
	var animationEnd = Date.now() + duration;
	var defaults = { startVelocity: 30, spread: 30, ticks: 100, zIndex: 0 };

	function randomInRange(min, max) {
		return Math.random() * (max - min) + min;
	}

	var interval = setInterval(function() {
		var timeLeft = animationEnd - Date.now();

		if (timeLeft <= 0) {
			return clearInterval(interval);
		}

		var particleCount = 50 * (timeLeft / duration);
		if (side == 1) {
			var posA = 0.1;
			var posB = 0.3;
		} else {
			var posA = 0.6;
			var posB = 0.8;
		}
		confetti({ ...defaults, particleCount, origin: { x: randomInRange(posA, posB), y: Math.random() - 0.1 } });
	}, 250);
}
