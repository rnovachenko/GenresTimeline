function MultipleMonitorsObserver() {
	var monitors = {},
		doneCallback = function() {},
		waiting = false;

	var checkDone = function() {
		if (waiting && Object.keys(monitors).length == 0) {
			doneCallback();
		}
	};

	this.addMonitor = function(monitor) {
		monitors[monitor] = true;
	};

	this.releaseMonitor = function(monitor) {
		delete monitors[monitor];
		checkDone();
	};

	this.wait = function() {
		waiting = true;
		return this;
	};

	this.done = function(f) {
		doneCallback = f;
		checkDone();
	};

}