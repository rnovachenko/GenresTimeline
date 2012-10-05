function GenresTimeline(username, containerId) {
	var artistTags = {},
		lastfm = new LastfmService(username),
		backend = new BackendService(),
		weeklyArtistsPlaycount = {},
		chartsProgressBar = new UglyProgressbarPanel('charts'),
		artistsProgressBar = new UglyProgressbarPanel('new-artists');

	this.build = function() {
		$.when (
			lastfm.getWeeklyChartTimestamps()
		). pipe (
			getAllWeeklyCharts
		). pipe (
			backend.getCachedTags
		). pipe (
			getNewArtistsTags
		). pipe (
			calculateMonthlyTopTags
		). pipe (
			drawTimeline
		);
	};

	/* last.fm may ban clients that make too many calls, so limiting requests to 10 per second.
	 In this function we are iterating over chart dates, requesting each chart and asynchronously processing it.
	 A MultipleMonitorsObserver is used to make sure that all requests are processed before proceeding to the next step.
	 So the algorithm of this function is:
		for each chart date {
			send request to lastfm;
			add the request id to the observer;
			if this was the last request sent, tell observer to wait for all requests to complete;
			process lastfm response;
			remove request id from observer;
			if no requests left in the observer, return the collected artists data
		}
	*/
	var getAllWeeklyCharts = function(json) {
		var charts = json.weeklychartlist.chart,
			deferred = $.Deferred(),
			observer = new MultipleMonitorsObserver();

		chartsProgressBar.show();

		var getWeeklyChart = function(chartTimestamp, index) {
			chartsProgressBar.progress(index * 100 / charts.length);
			observer.addMonitor(chartTimestamp.from);
			$.when(
				lastfm.getWeeklyChart(chartTimestamp.from)
			).then(
				function(json) {
					observer.releaseMonitor(chartTimestamp.from);
					extractArtistsPlaycount(json);
				}
			);
		};

		var onGetChartsComplete = function() {
			chartsProgressBar.done();
			observer.wait().done(function() {
				deferred.resolve(artistTags);
			});
		}

		iterateSlowly(charts, 100, getWeeklyChart, onGetChartsComplete);
		return deferred.promise();
	};

	var extractArtistsPlaycount = function(json) {
		if (json.weeklyartistchart && json.weeklyartistchart.artist && json.weeklyartistchart.artist.length > 0) {
			var weekTimestamp = json.weeklyartistchart['@attr'].from;
			for (var i in json.weeklyartistchart.artist) {
				var artist = json.weeklyartistchart.artist[i];
				artistTags[artist.name] = 0;

				if (!weeklyArtistsPlaycount[weekTimestamp]) {
					weeklyArtistsPlaycount[weekTimestamp] = {};
				}
				weeklyArtistsPlaycount[weekTimestamp][artist.name] = artist.playcount;
			}
		}
	}

	var getNewArtistsTags = function(json) {
		fillExistingArtistsTags(json);
		var newArtists = getNewArtists(json);

		artistsProgressBar.show();
		var deferred = $.Deferred();
		var observer = new MultipleMonitorsObserver();

		var getTop5Tags = function(tags) {
			return tags.slice ? tags.slice(0, 5).reduce(function(result, tag) { result[tag.name] = tag.count; return result }, {}) : {};
		}

		var getTags = function(artist, index) {
			artistsProgressBar.progress(index * 100 / newArtists.length);
			observer.addMonitor(artist);
			$.when(
				lastfm.getArtistTags(artist)
			).then(
				function(json) {
					observer.releaseMonitor(artist);
					if (json.toptags && json.toptags.tag) {
						var mainTags = getTop5Tags(json.toptags.tag);
						backend.saveTags(artist, mainTags);
						artistTags[artist] = json[artist];
					} else {
						backend.saveBrokenArtist(artist);
					}
				}
			);
		};

		var onGetTagsComplete = function() {
			artistsProgressBar.done();
			observer.wait().done(function() {
				deferred.resolve();
			});
		}

		iterateSlowly(newArtists, 100, getTags, onGetTagsComplete);
		return deferred.promise();
	}

	var fillExistingArtistsTags = function(artistTagsFromBackend) {
		Object.keys(artistTagsFromBackend).
			filter(function(artist) { return !artistTagsFromBackend[artist].broken }).
			forEach(function(artist) { artistTags[artist] = artistTagsFromBackend[artist]; });
	};

	var getNewArtists = function(artistsFromBackend) {
		return Object.keys(artistTags).filter(function(artist) { return !(artist in artistsFromBackend)});
	};

	//var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	var months = ['Jan', 'Jul'];

	var calculateMonthlyTopTags = function() {
		var tagsByMonth = aggregateTagWeightsByMonth();
		for (var month in tagsByMonth) {
			tagsByMonth[month] = getMonthTopTags(tagsByMonth[month]);
		}
		console.log('tags by month:', tagsByMonth);
		return tagsByMonth;
	}

	var getMonthTopTags = function(monthTags) {
		var nameWeightPairs = [];
		for (var tag in monthTags) {
			nameWeightPairs.push({name:tag, weight:monthTags[tag]});
		}
		var topTags = nameWeightPairs.sort(function(a,b) { return (a.weight < b.weight) ? 1 : -1 }).slice(0, 10);
		var totalWeight = topTags.reduce(function(sum, tag) { return sum + tag.weight; }, 0)
		return topTags.reduce(function(result, tag) { result[tag.name] = tag.weight * 100.0 / totalWeight; return result; }, {});
	}

	var aggregateTagWeightsByMonth = function() {
		var tagsByMonth = {};
		for (var timestamp in weeklyArtistsPlaycount) {
			for (var artist in weeklyArtistsPlaycount[timestamp]) {

				var monthCaption = timestampToMonth(timestamp),
					plays = weeklyArtistsPlaycount[timestamp][artist],
					tags = artistTags[artist];

				tagsByMonth[monthCaption] = tagsByMonth[monthCaption] || {};
				for (var tag in tags) {
					var tagWeight = tags[tag] * plays;
					if (tagsByMonth[monthCaption][tag]) {
						tagsByMonth[monthCaption][tag] += tagWeight;
					} else {
						tagsByMonth[monthCaption][tag] = tagWeight;
					}
				}

			}
		}
		return tagsByMonth;
	}

	var drawTimeline = function(tagsByMonth) {
		var allGenreNames = getSortedTagsList(tagsByMonth),
			currentYear = new Date().getYear() + 1900,
			started = false,
			data = [],
			now = new Date();

		for (var year = 2002; year <= currentYear; year++) {
			for (var monthIndex in months) {
				var caption = '' + months[monthIndex] + ' ' + year,
					monthTagsData = { tags: [], caption: caption };
				if (tagsByMonth[caption]) {
					started = true;

					monthTagsData = { tags: [], caption: caption };
					allGenreNames.forEach(function(tagName) {
						if (tagsByMonth[caption][tagName]) {
							monthTagsData.tags.push({name: tagName, value: tagsByMonth[caption][tagName] * 5 });
							//html += '<div style="float:left; border: 1px solid blue; width:' + Math.floor(10*tagsByMonth[caption][tagName]) + 'px">' + tagName + '</div>';
						} else {
							monthTagsData.tags.push({name: tagName, value: 1 });
						}
					});

					data.push(monthTagsData);
				} else {
					if (started && !(year >= now.getYear()+1900 && monthIndex > now.getMonth()/3)) {
						data.push(monthTagsData);
					}
				}
			}
		}
		var canvas = Raphael(containerId, (data.length) * 100, allGenreNames.length + 10*99);	//  + 150

		var dotsYCoords = [];
		for (var j = 0; j < data.length; j++) {
			dotsYCoords[j] = [];
			for (var i = 0, currentY = 0; i < allGenreNames.length; i++) {
				dotsYCoords[j].push(currentY);
				currentY += (data[j].tags.length > 0) ? data[j].tags[i].value : dotsYCoords[j][i-1];
			}
			dotsYCoords[j].push(allGenreNames.length + 5*99);
		}

		for (i = 0; i < allGenreNames.length; i++) {
			var pathString = "M0," + dotsYCoords[0][i];
			for (j = 1; j < data.length; j++) {
				pathString += "L" + (j*100-10) + "," + dotsYCoords[j-1][i];
				pathString += "L" + j*100 + "," + dotsYCoords[j][i];
			}
			pathString += "L" + data.length*100 + "," + dotsYCoords[data.length-1][i];
			pathString += "L" + data.length*100 + "," + dotsYCoords[data.length-1][i+1];
			for (j = data.length - 1; j > 0; j--) {
				pathString += "L" + j*100 + "," + dotsYCoords[j][i+1];
				pathString += "L" + (j*100-10) + "," + dotsYCoords[j-1][i+1];
			}
			pathString += "L0," + dotsYCoords[0][i+1] + "z";
			canvas.path(pathString).attr({fill: colorFromString(allGenreNames[i]), 'stroke-width': 0, title: allGenreNames[i]});
		}

	}

	var getSortedTagsList = function(tagsByMonth) {
		var allGenres = {};	// using this object as a set of genre names
		for (var month in tagsByMonth) {
			$.extend(allGenres, tagsByMonth[month]);
		}
		return Object.keys(allGenres).sort(compareStringsIgnoreCase);
	}

	var timestampToMonth = function(timestamp) {
		var date = new Date(timestamp * 1000);
		return "" + months[Math.floor(date.getMonth()/6)] + " " + (1900 + date.getYear());
	}

}