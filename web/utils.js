function colorFromString(str) {
	return '#' + (hashCode(str) & 0xFFFFFF).toString(16);
}

function hashCode(str) { // ported from java.lang.String.hashCode()
	var hash = 0;
	for (var i = 0; i < str.length; i++) {
	   hash = str.charCodeAt(i) + ((hash << 7) - hash);
	}
	return hash;
}

function compareStringsIgnoreCase(a, b) {
	var x = a.toUpperCase(), y = b.toUpperCase();
	return (x == y) ? 0 : ((x < y) ? -1 : 1);
}

function iterateSlowly(list, sleepInterval, itemCallback, doneCallback) {
	if (list.length > 0) {
		var iteration = function(index) {
			if (index < list.length) {
				setTimeout(iteration, sleepInterval, index + 1);
				itemCallback(list[index], index);
			} else {
				doneCallback();
			}
		}
		iteration(0);
	} else {
		doneCallback();
	}
}

