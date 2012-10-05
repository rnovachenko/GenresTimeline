function UglyProgressbarPanel(name) {
	this.show = function() {
		$('#'+name+'-progress').show();
		$('#'+name+'-progressbar').progressbar({ value: 0 });
	};

	this.progress = function(value) {
		$('#'+name+'-progressbar').progressbar({ value: value });
	};

	this.done = function() {
		$('#'+name+'-progressbar').progressbar({ value: 100 });
		$('#'+name+'-done').show();
	};
}