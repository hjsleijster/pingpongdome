var moduleUrl = '/pingpongdome/';
var matchId;

$(function() {
	matchId = $('.match').data('match');

	$('.score-plus').on('click', function() {
		var side = $(this).parent().data('side');
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
		let endpoint = matchId ? 'updateMatch/' + matchId : 'newMatch';
		let data = $(this).serializeArray();
		$.post(moduleUrl + endpoint, data , function(data) {
			if (!matchId) {
				window.history.pushState('', '', '?match=' + data.match.id);
			}
			updateMatch(data);
			$('.options').removeClass('open');
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
	if (!Object.keys(data.state).length) {
		return;
	}

	$('.match').data('match', data.match.id);
	matchId = $('.match').data('match');

	let state = data.state;
	$('.side1 .player').text(state.side1.player);
	$('.side1 .points').text(state.side1.points);
	$('.side1 .games').text(state.side1.games);

	$('.side2 .player').text(state.side2.player);
	$('.side2 .points').text(state.side2.points);
	$('.side2 .games').text(state.side2.games);

	$('.match-action').toggle(!data.match.finished_at);
	$('#score-undo').toggle(0 != state.side1.points + state.side1.games + state.side2.points + state.side2.games);

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
