LastfmService = function(username) {
	var url = 'http://ws.audioscrobbler.com/2.0/',
		apiKey = '07c690b607e1aea47e58167077bd0d87';

	var callMethod = function(method, customParams) {
		var defaultParams = {
			method: method,
			format: 'json',
			api_key: apiKey
		};
		return $.getJSON(url, $.extend(defaultParams, customParams));
	}

	this.getWeeklyChartTimestamps = function() {
		return callMethod('user.getweeklychartlist', { user: username });
	};

	this.getWeeklyChart = function(chartTimestamp) {
		return callMethod('user.getweeklyartistchart', { user: username, from: chartTimestamp });
	};

	this.getArtistTags = function(artist, callback) {
		return callMethod('artist.gettoptags', { artist: artist }, callback);
	};

}