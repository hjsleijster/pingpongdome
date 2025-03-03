"use strict"
var moduleUrl = '/pingpongdome/';
var matchId;
var matchData;
var fireworksInterval;

$(function() {
	matchId = $('.match').data('match');

	$('.score-plus').on('click', function() {
		scorePlus($(this).parent().data('side'));
	});

	$('#score-undo').on('click', function() {
		scoreUndo();
	});

	$('#switch-sides').on('click', function() {
		$('.side1').toggleClass('switched');
	});

	$('#enable-fullscreen').on('click', function() {
		document.documentElement.webkitRequestFullscreen();
		$(this).hide();
	});

	$('#toggle-options, .options-modal').on('click', function(event) {
		if (event.target == this) {
			toggleOptions();
		}
	});

	$('form').on('submit', function(e) {
		e.preventDefault();
		submitForm(this);
	})

	$('#end-match').on('click', function() {
		if (confirm('Sure?')) {
			$.post(moduleUrl + 'endMatch', {match: matchId}, function(data) {
				window.location.href = '?';
			});
		}
	});

	if (matchId > 0) {
		getMatchData();
	} else {
		toggleOptions();
	}

	gestures();
});

function getMatchData() {
	$.get(moduleUrl + 'getMatch', {match: matchId}, function(data) {
		updateMatch(data);
	});
}

function scorePlus(side) {
	$.post(moduleUrl + 'scorePlus', {match: matchId, side: side}, function(data) {
		updateMatch(data);
	});
}

function scoreUndo() {
	if (!matchId) {
		return;
	}

	$.post(moduleUrl + 'scoreUndo', {match: matchId}, function(data) {
		updateMatch(data);
	});
}

function updateMatch(data) {
	clearInterval(fireworksInterval);
	matchData = data;
	matchId = data.match ? data.match.id : 0;
	$('.match').data('match', matchId);

	if (data === undefined || !Object.keys(data).length || !Object.keys(data.sides).length) {
		window.history.pushState('', '', '?');
		$('.match-action').toggle(false);
		toggleOptions();
		return;
	}

	if (data.match.won_by_side) {
		fireworks(data.match.won_by_side);
	}

	for (var i = 1; i <= 2; i++) {
		let side = data.sides[i];
		['player', 'points', 'games'].forEach(function(field) {
			let el = $('.' + field, '.side' + i);
			if (el.text() != side[field]) {
				el.fadeOut(100, function() {
					el.text(side[field]).fadeIn(300);
				});
			}
		});
	}

	$('.serving').removeClass('serving');
	$('.side' + data.match.serving).addClass('serving');

	// game is over
	$('.match-action').toggle(!data.match.finished_at);
	// set form data
	$('[name=best_out_of][value=' + data.match.best_out_of + ']').prop('checked', true);
}

function submitForm(form) {
	let formdata = $(form).serializeArray();
	let endpoint = formdata.match ? 'updateMatch' : 'newMatch';
	$.post(moduleUrl + endpoint, formdata, function(data) {
		if (data.error) {
			$('.error', form).remove();
			$(form).prepend('<div class="error">' + data.error + '</div>');
			return;
		}

		if (!formdata.match) {
			window.history.pushState('', '', '?match=' + data.match.id);
		}

		updateMatch(data);
		$('.options-modal').removeClass('open');
		$('.error', form).remove();
	}, 'json');
}

function toggleOptions() {
	$('.options-modal').toggleClass('open');

	if ($('.options-modal').hasClass('open')) {
		// ongoing match
		if (matchId && !matchData.match.won_by_side) {
			$('input[type=hidden][name=match]').val(matchId);
			$('select[name^="player-side"]').attr('required', false);
			$('.edit-match').show();
			$('.new-match').hide();
			$('#end-match').show();
		// new match
		} else {
			$('input[type=hidden][name=match]').val(0);
			$('select[name^="player-side"]').attr('required', true);
			$('.edit-match').hide();
			$('.new-match').show();
			$('#end-match').hide();
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

	fireworksInterval = setInterval(function() {
		var timeLeft = animationEnd - Date.now();

		if (timeLeft <= 0) {
			return clearInterval(fireworksInterval);
		}

		var particleCount = 150 * (timeLeft / duration);
		if (side == 1 || side == 2 && $('.side1').hasClass('switched')) {
			var posA = 0.1;
			var posB = 0.3;
		} else {
			var posA = 0.8;
			var posB = 0.7;
		}
		confetti({ ...defaults, particleCount, origin: { x: randomInRange(posA, posB), y: Math.random() - 0.1 } });
	}, 250);
}

// https://github.com/ajlkn/jquery.touch
function gestures() {
	var e = $('.match');
	e.touch();
	e
	// side 1 plus score
	.on('swipeLeft', function(event, info) {
		scorePlus($('.side1').hasClass('switched') ? 2 : 1);
	})
	// side 2 plus score
	.on('swipeRight', function(event) {
		scorePlus($('.side1').hasClass('switched') ? 1 : 2);
	})
	// plus score (or close options first)
	.on('tap', function(event, info) {
		let target = $(info.event.target);
		let side;
		if (target.hasClass('points') || target.hasClass('player')) {
			side = target.parent().data('side');
		} else {
			side = target.data('side');
		}

		if (!side) {
			return;
		}

		scorePlus(side);
	})
	// undo
	.on('tapAndHold', function(event) {
		scoreUndo();
	});
}
