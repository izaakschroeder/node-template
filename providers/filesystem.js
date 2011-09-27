
//Load required files.
var fs = require('fs'), path = require('path');

/**
 * FileSystemProvider
 * Create a new file-system based template provider with the given options.
 * @param opts Options for the provider.
 */
function FileSystemProvider(opts) {
	var provider = this;
	
	if (typeof opts === "string")
		opts = { searchPaths: [ opts ] };
	else if (Array.isArray(opts))
		opts = { searchPaths: opts };
	else if (typeof opts !== "object")
		opts = { };
	this.searchPaths = opts.searchPaths || [ "./templates" ];
	this.resolutionCache = { };
	this.dataCache = { };
	this.name = "fs";
	this.useMonitor = true;
	this.monitors = { };
	
	if (this.useMonitor)
		this.searchPaths.forEach(function(searchPath) {
			fs.watchFile(searchPath, function(previous, current) {
				//If something was added or removed from the directory
				//or the directory itself was created/removed
				if (previous.size != current.size || previous.nlink != current.nlink) {
					//Loop through the resolution cache
					for (var name in provider.resolutionCache) {
						//Resolve the template
						provider.resolve(name, true, function(path, name) {
							//If the paths don't match it means something happened
							//to the directory that created a resolution change
							//e.g. template was added/removed
							if (provider.resolutionCache[name] != path) {
								//Stop watching the old template
								fs.unwatchFile(provider.resolutionCache[name]);
								//Update the resolution cache to reflect the new value
								provider.resolutionCache[name] = path;
								//If data was cached for this file
								if (provider.dataCache[name])
									//Remove it
									delete provider.dataCache[name];
								//If we were monitoring for this template before
								if (provider.monitors[name])
									//Stop monitoring now
									delete provider.monitors[name];
							}
						})
					}
				}
			});
		})
	
}

/**
 * resolve
 * Find the file path associated with the given template name by looking
 * through all the search paths.
 * @param name Name of the template to look for.
 * @param done Called when the correct path is found with the path as its argument,
 * or false if no path could be found.
 */
FileSystemProvider.prototype.resolve = function(name, noCache, done) {
	var triggered = false, provider = this;
	
	if (typeof noCache === "function") {
		done = noCache;
		noCache = false;
	}
	
	//If there are no search paths
	if (this.searchPaths.length === 0) {
		done(false, name); //We're done
		return; //No more work
	}
	
	//If we've cached the result of this lookup
	if (!noCache && this.resolutionCache[name])  {
		done(this.resolutionCache[name], name); //Use the result from the cache
		triggered = true; //Note that we've performed the call
	}
	
	//Even if data from cache is being used, the cache could be outdated.
	//Search through all the paths
	var remaining = this.searchPaths.length, more = true;
	for(var i = 0; i < this.searchPaths.length && more; ++i) {
		//Make a path for checking
		var searchPath = this.searchPaths[i] + "/" + name + ".html";
		//See if it exists
		path.exists(searchPath, function(path) { return function(exists) {
			//It does and we're still looking for a path
			if (exists && more) {
				//Save the result in cache
				provider.resolutionCache[name] = path;
				//If we haven't told the use about it
				if (!triggered)
					//Tell them 
					done(path, name);
				//We've found the template, we don't care about any more results
				more = false;
			} 
			//We've exhausted all the possible search paths
			else if ( --remaining === 0 ) {
				//Tell user we can't find the template
				done(false, name);
			}
		}}(searchPath))
	}
}

/**
 * get
 * Fetch the data for a given template from disk.
 * @param name The name of the template to fetch.
 * @param done Callback when the data is fetched. First argument is template data
 * or false if no such template could be found.
 */
FileSystemProvider.prototype.get = function(name, done) {
	var triggered = false, provider = this;
	
	//If we have template data in the cache
	if (provider.dataCache[name]) {
		//Give that data to the user
		done(this.dataCache[name].data);
		//Note that we've sent the data upstream
		triggered = true;
	}
	
	//If we're monitoring the template for changes we've already made 
	//use of the cache we don't need to do anything else, because the 
	//monitor will pick up any changes for us
	if (triggered && provider.useMonitor && provdier.monitors[name])
		//Done!
		return;
	
	//Resolve the template path
	provider.resolve(name, function(path) {
		
		//If no such template could be found
		if (!path) {
			
			//If we have some cache already stored (i.e. template existed then was deleted)
			if (provider.dataCache[name])
				//Delete the corresponding cache data as well
				delete provider.dataCache[name];
			//If the user doesn't already know
			if (!triggered)
				//Inform them
				done(false);
			//No more work needed
			return;
		}
		
		//If we're using monitoring
		if (provider.useMonitor) {
			//Setup a monitor for the template and its associated path
			provider.monitors[name] = true;
			fs.watchFile(path, function(previous, current) {
				//If the file has been deleted
				if (current.nlink == 0) {
					//Note that we are no longer monitoring the file
					delete provider.monitors[name];
					//Destroy the cached information
					delete provider.dataCache[name];
					//Stop watching it
					fs.unwatchFile(path);
				}
				//If the file has been modified
				else if (current.mtime > previous.mtime) {
					//Read its new contents
					fs.readFile(path, "utf8", function(err, data) {
						//If there wasn't any trouble
						if (!err) {
							//Update the cache
							provider.dataCache[name].data = data;
							provider.dataCache[name].mtime = current.mtime;
						}
						else {
							//TODO: Error?
						}
					})
					
				}
				
			})
		}
		
		//Get information about the file
		fs.stat(path, function(err, stats) {
			
			//If we weren't able to
			if (err) {
				//And we haven't told the user about it
				if (!triggered)
					//Tell them
					done(false);
			}
			//If our cached data is outdated
			else if (!provider.dataCache[name] || stats.mtime > provider.dataCache[name].mtime) {
				
				//Create a read stream for the file
				var e = fs.createReadStream(path); 
				
				//Don't send any events just yet
				e.pause(); 
				
				//If we haven't passed anything to the user
				if (!triggered)
					//Pass the read stream up
					done(e);
				
				//When reading the data from the file
				var data = "";
				e.on("data", function(chunk) {
					data += chunk
				}).on("end", function() {
					//Updated our cache
					provider.dataCache[name] = {
						data: data,
						mtime: stats.mtime
					};
				});
				
				//Start reading and firing events
				e.resume();
			}
				
		});	
		
		
	});
}

/**
 * lastModified
 * Get the time a template was last modified.
 * @param name Name of the template.
 * @param done Callback function whose first argument is the modified time of the template,
 * false if no such template could be found.
 */
FileSystemProvider.prototype.lastModified = function(name, done) {
	//If we're monitoring the cache is always up-to-date
	if (this.useMonitor && this.dataCache[name])
		//So  just return the data in the cache
		return this.dataCache[name].mtime;
	
	//Get the path for the template
	this.resolve(name, function(path) {
		//If we can't find it
		if (!path)
			//We're done
			done(false)
		//Otherwise
		else
			//Get information about the file
			fs.stat(path, function(err, stats) {
				//If we can't do that
				if (err)
					//We're done
					done(false);
				//Otherwise
				else
					//Return the correct modified time
					done(stats.mtime);
			});
	});
}

module.exports = FileSystemProvider;
