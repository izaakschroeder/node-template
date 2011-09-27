
/**
 *
 *
 *
 */
function BrowserProvider(opts) {
	
}

/**
 *
 *
 *
 */
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

/**
 *
 *
 *
 */
BrowserProvider.prototype.get = function(name, done) {
	var request = new XMLHttpRequest();
	request.open('GET', url);
	
	request.onload = function(e) {
		if (this.status == 200) {
			//Do something with this!
			this.getResponseHeader('Last-Modified');
			done(this.responseText);
		}
		else {
			done(false);
		}
	};
	
	request.send();
}

/**
 *
 *
 *
 */
BrowserProvider.prototype.lastModified = function(name, done) {
	var request = new XMLHttpRequest();
	request.open('HEAD', url);
	
	request.onload = function(e) {
		if (this.status == 200) {
			//Do something with this!
			this.getResponseHeader('Last-Modified');
		}
		else {
			done(false);
		}
	};
	
	request.send();
}