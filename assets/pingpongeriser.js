var moduleUrl = '/pingpongeriser/';

$(function() {
	if ($('.match').data('match')) {
		getMatchData($('.match').data('match'));
	}

	$('.score-plus').on('click', function() {
		var match = $('.match').data('match')
		var side = $(this).parent().data('side');
		$.post(moduleUrl + 'scorePlus', {match: match, side: side}, function(data) {
			updateMatch(data);
		});
	});
	$('.score-undo').on('click', function() {
		var match = $('.match').data('match')
		$.post(moduleUrl + 'scoreUndo', {match: match}, function(data) {
			updateMatch(data);
		});
	});
	$('.switch-sides').on('click', function() {
		$('.side1').toggleClass('switched');
	});
});

function getMatchData(match) {
	$.get(moduleUrl + 'updateMatch', {match: match}, function(data) {
		updateMatch(data);
	});
}

function updateMatch(data) {
	$('.match').data('match', data.match.id);
	if (Object.keys(data.state).length) {
		let state = data.state;

		$('.side1 .player').text(state.side1.player);
		$('.side1 .points').text(state.side1.points);
		$('.side1 .games').text(state.side1.games);

		$('.side2 .player').text(state.side2.player);
		$('.side2 .points').text(state.side2.points);
		$('.side2 .games').text(state.side2.games);
	}

	// $('.score-undo').toggle(state.side1.points + state.side1.games + state.side2.points + state.side2.games > 0);
	$('.score-plus, .score-undo, .switch-sides').toggle(!data.match.finished_at);
}
