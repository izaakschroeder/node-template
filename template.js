(function(exports) {

global.sizzleCapabilities = {
	contains: true,
	compareDocumentPosition: false,
	nodeListToArray: true,
	querySelectorAll: false,
	getElementsByClassName: false,
	getElementByIdWithName: false,
	getElementsByTagNameIncludesComments: false,
	normalizedHrefAttributes: false,
	matchesSelector: false
}

//Only defined when using node.js.
//TODO: Is there a better way of detecting this?
var EventEmitter = typeof process === "object" ? require('events').EventEmitter : undefined;

/**
 *
 *
 *
 */
function Engine(opts) {
	this.provider = opts.provider;
	this.querySelector = opts.querySelector;
	this.cache = { };
}

/**
 *
 *
 *
 */
Engine.prototype.execute = function(dom, bindings, data, done) {
	var querySelector = this.querySelector;	
	
	function update(element, replacement) {
		if (typeof replacement === "function")
			replacement = replacement.call(replacement, data, element);
			
		
		if (typeof replacement === "undefined") {
			element.remove();
			return null;
		}
		else if (replacement === null) {
			element.empty();
			return element;
		}
		else if (typeof replacement.length !== "undefined" && typeof replacement.splice === "function") {
			var newNode, replacements = [];
			for (var j = 0; j<replacement.length; ++j)
				if (newNode = update(element.cloneNode(true), replacement[j]))
					replacements.push(newNode);
			element.replace(replacements);
			return element;
		}
		else {
			element.content(replacement);
			return element;
		}
	}
	
	function transform(element, bindings, data) {
		
		for (var selector in bindings) {
						
			var 
				elements = querySelector(selector, element),
				key = bindings[selector];
				
			 if (typeof data.length !== "undefined" && typeof data.splice === "function") {
			 	var newNode, replacements = [];
				for (var j = 0; j<data.length; ++j)
					if (newNode = transform(element.cloneNode(true), bindings, data[j]))
						replacements.push(newNode);
				element.replace(replacements);
			 }
			 else {
			 	if (typeof key === "function") {
					var value = key.call(key, data);
					for (var i=0; i<elements.length; ++i) 
						update(elements[i], value);
				}
				else if (typeof key.bindings !== "undefined") {
					for (var i=0; i<elements.length; ++i) 
						transform(elements[i], key.bindings, data[key.data]);
				}
				else {
					for (var i=0; i<elements.length; ++i) 
						update(elements[i], data[key]);
				}
			 }
			
		}
		return element;

	}
	
	transform(dom, bindings, data);
	
	done(dom);
}

/**
 *
 *
 *
 */
Engine.Parser = function(callback) {
	this.buffer = "";
	this.callback = callback;
	if (typeof DOMParser !== "undefined") 
		this.parser = new DOMParser();
	else
		this.parser =  require('dom').parser(callback);
}

/**
 *
 *
 *
 */
Engine.Parser.prototype.data = function(data) {
	if (typeof this.parser.data === "function")
		this.parser.data(data);
	else if (typeof this.parser.parseFromString === "function")
		this.buffer += data;
}

/**
 *
 *
 *
 */
Engine.Parser.prototype.end = function() {
	if (typeof this.parser.end === "function")
		this.parser.end();
	else if (typeof this.parser.parseFromString === "function")
		this.callback(this.parser.parseFromString(this.buffer, "text/xml"));
		
}

/**
 *
 *
 *
 */
Engine.prototype.template = function(name, bindings, data, done) {
	var engine = this, cachedTemplate = this.cache[name];
		
	if ( cachedTemplate )
		engine.provider.lastModified(name, function(time) {
			cachedTemplate.outdated = !time || time > cachedTemplate.mtime;
		});
	
	if ( cachedTemplate && !cachedTemplate.outdated )
		return engine.execute(cachedTemplate.dom, bindings, data, done);
	
	
	var p = new Engine.Parser(function(dom) {
		engine.cache[name] = {
			dom: dom,
			mtime: Date.now(),
			outdated: false
		};
		dom.getDocumentElement().attributes["data-template"] = name;
		engine.execute(dom, bindings, data, done);
	});
	
	engine.provider.get(name, function(e) {
		if ((typeof EventEmitter !== "undefined") && (e instanceof EventEmitter)) {
			e.on( "data", function(chunk) {
				p.data(chunk.toString());
			}).on( "close",function() {
				p.end();
			});
		}
		else {
			p.data(e);
			p.end();
		}
	});
	
	return this;
}

/**
 *
 *
 *
 */
exports.engine = function(opts) {
	opts = opts || { };
	if (!opts.provider) {
		var FileSystemProvider = require('template/providers/filesystem');
		opts.provider = new FileSystemProvider();
	}
	
	if (!opts.querySelector) {
		opts.querySelector = require('sizzle').Sizzle
	}
	
	return new Engine(opts);
};

})(exports || {});