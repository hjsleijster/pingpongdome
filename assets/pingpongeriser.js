var moduleUrl = '/pingpongeriser/';

$(function() {
	$('.score-plus').on('click', function() {
		$.post(moduleUrl + 'scorePlus', {side: $(this).data('side')}, function(data) {
			updateMatch(data);
		});
	});
});

function updateMatch(data) {
	$('.side1 h1').text(data.side1.points);
	$('.side1 h2').text(data.side1.games);
	$('.side2 h1').text(data.side2.points);
	$('.side2 h2').text(data.side2.games);
}
