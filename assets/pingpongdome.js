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
		$('.options').toggleClass('open');

		if ($('.options').hasClass('open')) {
			if (matchId) {
				$('.edit-match').show();
				$('.new-match').hide();
			} else {
				$('.edit-match').hide();
				$('.new-match').show();
			}
		}
	});

	$('form').on('submit', function(e) {
		e.preventDefault();
		let endpoint = matchId ? 'updateMatch' : 'newMatch';
		$.post(moduleUrl + endpoint, $(this).serializeArray(), function(data) {
			updateMatch(data);
			$('.options').removeClass('open');
			window.history.pushState('', '', '?match=' + data.match.id);
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

	$('.score-undo').toggle(state.side1.points + state.side1.games + state.side2.points + state.side2.games > 0);
	$('.match-action').toggle(!data.match.finished_at);

	$('[name=best_out_of][value=' + data.match.best_out_of + ']').prop('checked', true);
}
