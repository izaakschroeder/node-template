
//Load required files.
var fs = require('fs'), path = require('path'), directory = require('directory');

/**
 * FileSystemProvider
 * Create a new file-system based template provider with the given options.
 * @param opts Options for the provider.
 */
function FileSystemProvider(opts) {
	this.directory = directory.resolver(opts || "./views");	
}

/**
 *
 *
 *
 */
FileSystemProvider.prototype.addSearchPath = function(path) {
	this.directory.addSearchPath(path);
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
	this.directory.resolve(name + ".html", noCache, done);
}

/**
 * get
 * Fetch the data for a given template from disk.
 * @param name The name of the template to fetch.
 * @param done Callback when the data is fetched. First argument is template data
 * or false if no such template could be found.
 */
FileSystemProvider.prototype.get = function(name, done) {
	this.directory.get(name + ".html", done)
}

/**
 * lastModified
 * Get the time a template was last modified.
 * @param name Name of the template.
 * @param done Callback function whose first argument is the modified time of the template,
 * false if no such template could be found.
 */
FileSystemProvider.prototype.lastModified = function(name, done) {
	this.directory.lastModified(name + ".html", done)
}

module.exports = FileSystemProvider;
