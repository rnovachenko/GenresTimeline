BackendService = function() {

	this.getCachedTags = function(artists) {
		return $.ajax({
			type: 'POST',
			url: '/gettags',
			data: artists,
			dataType: 'json'
		});
	}

	this.saveTags = function(artist, tags) {
		var data = {
			name: artist,
			tags: JSON.stringify(tags)
		};
		$.post('/saveartist', data);
	};

	this.saveBrokenArtist = function(artist) {
		var data = {
			name: artist,
			broken: true
		};
		$.post('/saveartist', data);
	}
}