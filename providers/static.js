
function StaticProvider(opts) {
	this.templates = opts.templates || { };
	this.lastModified = { };
	for (var name in this.templates)
		this.lastModified[name] = Date.now();
	this.name = "static";
}

StaticProvider.prototype.set = function(name, value) {
	this.templates[name] = value;
	this.lastModified[name] = Date.now();
}

StaticProvider.prototype.get = function(name, done) {
	done(this.templates[name] || false);
}

StaticProvider.prototype.lastModified = function(name, done) {
	done(this.lastModified[name] || false);
}

module.exports = StaticProvider;