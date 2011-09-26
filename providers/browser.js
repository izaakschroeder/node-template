
function BrowserProvider(opts) {
	
}

BrowserProvider.prototype.cache = function(name, value) {
	var hasLocalStorage = typeof(localStorage) !== 'undefined';
	if (typeof value === "undefined") {
		if (!hasLocalStorage)
			return false;
		var data = localStorage.getItem(name);
		if (!data)
			return false;
		var i = data.indexOf("|");
		var date = data.substring(0, i);
		
		//if (Date.now() - date)
		
		return data.substring(i);
	}
	else {
		
		localStorage.setItem(name, Date.now()+"|"+value);
	}
}

BrowserProvider.prototype.get = function(name, done) {
	
}

BrowserProvider.prototype.lastModified = function(name, done) {
	
}