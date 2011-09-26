
var fs = require('fs'), path = require('path');

function FileSystemProvider(opts) {
	this.searchPaths = opts.searchPaths;
	this.resolutionCache = { };
	this.dataCache = { };
	this.name = "fs";
}

FileSystemProvider.prototype.resolve = function(name, done) {
	var triggered = false, provider = this;
	
	if (this.searchPaths.length === 0) {
		done(false);
		return;
	}
	
	if (this.resolutionCache[name])  {
		done(this.resolutionCache[name]);
		triggered = true;
	}
	
	var remaining = this.searchPaths.length, more = true;
	for(var i = 0; i < this.searchPaths.length && more; ++i) {
		var searchPath = this.searchPaths[i] + "/" + name + ".html";
		path.exists(searchPath, function(path) { return function(exists) {			
			if (exists && more) {
				provider.resolutionCache[name] = path;
				if (!triggered) {
					done(path);
					more = false;
				}
			} 
			else if ( --remaining === 0 ) {
				done(false);
			}
		}}(searchPath))
	}
}

FileSystemProvider.prototype.get = function(name, done) {
	var triggered = false, provider = this;
	
	
	if (provider.dataCache[name]) {
		done(this.dataCache[name].data);
		triggered = true;
	}
	
	
	provider.resolve(name, function(path){
				
		if (!path) {
			if (provider.dataCache[name])
				delete provider.dataCache[name];
			if (!triggered)
				done(false);
			return;
		}
			
		fs.stat(path, function(err, stats) {
			if (err && !triggered) {
				done(false);
			}
			else if (!provider.dataCache[name] || stats.mtime > provider.dataCache[name].mtime) {
				
				var e = fs.createReadStream(path);
								
				e.pause();
				
				if (!triggered) {
					done(e);
				}
				
				var data = "";
				e.on("data", function(chunk) {
					data += chunk
				}).on("end", function(){
					provider.dataCache[name] = {
						data: data,
						mtime: stats.mtime
					};
				});
				
				e.resume();
			}
				
		});	
		
		
	});
}

FileSystemProvider.prototype.lastModified = function(name, done) {
	this.resolve(name, function(path) {
		if (!path)
			done(false)
		else
			fs.stat(path, function(err, stats) {
				if (err)
					done(false);
				else
					done(stats.mtime);
			});
	});
}

module.exports = FileSystemProvider;
