"use strict"
var moduleUrl = '/pingpongdome/';
var matchId;
var matchData;
var fullscreen = false;
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

	$('#toggle-fullscreen').on('click', function() {
		if (!fullscreen) {
			document.documentElement.webkitRequestFullscreen();
			fullscreen = true;
		} else if (document.webkitExitFullscreen) {
			document.webkitExitFullscreen();
			fullscreen = false;
	    }
	});

	$('#toggle-options, .modal-options').on('click', function(event) {
		if (event.target == this) {
			toggleOptions();
		}
	});

	$('#manage-users, .modal-users').on('click', function(event) {
		if (event.target == this) {
			toggleUsers();
		}
	});

	$('form').on('submit', function(e) {
		e.preventDefault();
		if ($(this).parents('.modal').hasClass('modal-options')) {
			submitOptionsForm(this);
		} else if ($(this).parents('.modal').hasClass('modal-users')) {
			submitUsersForm(this);
		}
	})

	$('#end-match').on('click', function() {
		if (confirm('Sure?')) {
			$.post(moduleUrl + 'endMatch', {match: matchId}, function(data) {
				window.location.href = '?';
			});
		}
	});

	$('li', '.modal-users').on('click', function() {
		$('.modal-users input[name=first_name]').val($('span:first-child', this).text());
		$('.modal-users input[name=last_name]').val($('span:last-child', this).text());
		$('.modal-users input[name=userid]').val($(this).data('userid'));
	});

	$('.delete-user', '.modal-users').on('click', function() {
		deleteUser(this);
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
		$('.non-match-action').toggle(true);
		$('#score-undo').removeClass('show')
		toggleOptions();
		return;
	}

	$('#score-undo').addClass('show');


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
	$('.non-match-action').toggle(!!data.match.finished_at);
	// set form data
	$('[name=best_out_of][value=' + data.match.best_out_of + ']').prop('checked', true);
}

function submitOptionsForm(form) {
	let form_match = $('[name=match]', form).val();
	let endpoint = form_match > 0 ? 'updateMatch' : 'newMatch';

	$.post(moduleUrl + endpoint, $(form).serializeArray(), function(data) {
		$('.error', form).remove();
		if (data.error) {
			$(form).prepend('<div class="error">' + data.error + '</div>');
			return;
		}

		if (form_match != data.match.id) {
			window.history.pushState('', '', '?match=' + data.match.id);
		}

		updateMatch(data);
		$('#score-undo').addClass('show');
		$('.modal-options').removeClass('open');
	}, 'json');
}

function toggleOptions() {
	$('.modal-options').toggleClass('open');

	if ($('.modal-options').hasClass('open')) {
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

function toggleUsers() {
	$('.modal-users').toggleClass('open');
}

function submitUsersForm(form) {
	let formdata = new FormData(form);
	let userid = $('[name=userid]', form).val();
	let endpoint = userid > 0 ? 'updateUser' : 'newUser';

	$.post(moduleUrl + endpoint, $(form).serializeArray(), function(data) {
		$('.error', form).remove();
		if (data.error) {
			$(form).prepend('<div class="error">' + data.error + '</div>');
			return;
		}

		if (userid) {
			$('[data-userid=' + userid + '] span:first-child').text(formdata.get('first_name'));
			$('[data-userid=' + userid + '] span:last-child').text(formdata.get('last_name'));
		} else {
			let li = '<li data-userid="' + data.id + '">';
			li += '<span>' + formdata.get('first_name') + '</span> ';
			li += '<span>' + formdata.get('last_name') + '</span> ';
			li += '</li>';
			$('ul', form).prepend(li);
		}

		$(form)[0].reset();

	}, 'json');
}
function deleteUser(trash) {
	let userid = $(trash).prev().val();
	let endpoint = 'deleteUser/' + userid;

	$.post(moduleUrl + endpoint, function(data) {
		$('[data-userid=' + userid + ']').slideUp();
		$('.modal-users form')[0].reset();
	}, 'json');
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
		let switched = $('.side1').hasClass('switched');
		if ((side == 1 && !switched) || (side == 2 && switched)) {
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
	});
}
