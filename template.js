(function(exports) {

//Only defined when using node.js.
//TODO: Is there a better way of detecting this?
var EventEmitter = typeof process === "object" ? require('events').EventEmitter : undefined, DOM = require('dom');

/**
 *
 *
 *
 */
function Engine(opts) {
	this.provider = opts.provider;
	this.cache = { };
	this.log = opts.log || console;
}

/**
 *
 *
 *
 */
Engine.prototype.execute = function(dom, bindings, data, context, done) {

	if (typeof done !== "function")
		throw "Callback is not a function";

	function handleFunction(that, f, data, callback) {
		if (f.length === 3)
			f.call(that, data, context, callback);
		else
			callback(f.call(that, data, context));
	}

	function update(element, options) {
		
		var 
			replacement = options.content,
			attributes = options.attributes || { },
			mode = options.mode || "content",
			result = element;
		
		if (options.hasOwnProperty('content')) {
			if (typeof replacement === "undefined") {
				element.remove();
				return null;
			}
			else if (replacement === null) {
				switch(mode) {
				case "replace":
					element.remove();
					return null;
				case "content":
					element.empty();
					result = element;
					break;
				default:
					throw "WTF?";
				}
				
				
			}
			else if (typeof replacement.length !== "undefined" && typeof replacement.splice === "function") {
				throw "WTF?";
			}
			else {
				switch(mode) {
				case "replace":
					element.replace(replacement);
					result = replacement;
					break;
				case "content":
					element.content(replacement);
					result = element;
					break;
				default:
					throw "WTF?";
				}
				
			}
		}

		for (var name in attributes) {
			var value = attributes[name];
			if (value === undefined)
				result.removeAttribute(name)
			else
				result.setAttribute(name, value);
		}

		return result;
	}

	function parallel(items, each, done) {
		var left = items.length;
		if (left === 0)
			done();
		else
			for (var i=0; i<items.length; ++i) 
				each(items[i], i, function() {
					if (--left === 0)
						done();
				});
	}

	function serial(items, each, done) {
		function iterate(i) {
			if (i === items.length) {
				done();
				return;
			}

			each(items[i], i, function() {
				iterate(i+1);	
			});
		}

		iterate(0);
	}
	
	function transform(element, bindings, data, done) {

		if (typeof element === "undefined")
			throw new Error("Undefined element!");

		if (typeof done !== "function")
			throw new Error("Callback given is not a function!");
		
		//Loop through all the bindings
		function process(selectors, bindings, si) {

			if (si === selectors.length) {
				done(element);
				return;
			}
			
			function proceed() {
				process(selectors, bindings, si+1);
			}

			var 
				selector = selectors[si],
				//Get the element matching the selector
				elements = element.querySelectorAll(selector),
				//Get the thing we're replacing the selector with
				key = bindings[selector];
			
			//If the data is an array
			if (typeof data !== "undefined" && typeof data.length !== "undefined" && typeof data.splice === "function") {
				//Create a set of replacements
			 	var replacements = [];
			 	//Loop through all elements in the data array
		 		parallel(data, function(item, i, next) {
		 			transform(element.cloneNode(true), bindings, item, function(newNode) {
						if (newNode)
							//Add it to the replacement set
							replacements[i](newNode);
						next();
					})
		 		}, function() {
		 			//Replace the content with all the new nodes
					element.replace(replacements);
					//Proceed
					proceed();
		 		})	
						
				
			}
			//Otherwise the data is not an array
			else {

				function handleKey(key, done) {

					//Control of the elements are delegated to a function
					if (typeof key === "function") {

						//Go through all the elements
						parallel(elements, function(element, i, next) {

							//Call that function on a per-element basis
							handleFunction(element, key, data, function(replacementData, isRaw) {
								//If we get another key back
					 			if (isRaw) {
					 				//Recurse using the new key
					 				handleKey(replacementData, next);
					 			}
					 			else {
					 				//Otherwise, if we get a plain ol object
					 				if (typeof replacementData === "object" && replacementData.constructor === Object) {
					 					//Assume the update command is from that object
						 				update(element, replacementData);
						 				//Proceed
										next()
						 			}
						 			//Otherwise
						 			else {
						 				//Assume response is just content, and replace content
						 				update(element, {
											content: replacementData
										});
										//Proceed
										next();
						 			}
					 			}
					 			
					 			
					 		});
						}, done)

				 		
				 		
					}
					//Sub-key in use
					else if (typeof key.bindings !== "undefined") {
						parallel(elements, function(element, i, next) {
							transform(element, key.bindings, data[key.data], next);
						}, done)								
					}
					//Set of keys instead of just one
					else if (Array.isArray(key)) {
						//Apply the transform serially
						serial(key, function(item, i, next) {
							handleKey(item, next);
						}, done)						
					}
					//Standard mapping
					else {

						parallel(elements, function(element, i, nextElement) {
							var replacementData, replacementAttributes = { }, replacementMode = "content";

							function getContent(callback) {
								//Content
								switch(typeof key.content) {
								case "number":
								case "string":
									replacementData = data[key.content];
									callback();
									break;
								case "function":
									handleFunction(element, key.content, data, function(x) {
										replacementData = x;
										callback();
									});
									break;
								default:
									replacementData = "";
									callback();
								}
							}

							function getMode(callback) {
								replacementMode = key.mode || "content";
								callback();
							}

							function getAttributes(callback) {
								//Attributes
								if (key.attributes) {
									var 
										attributes = key.attributes, 
										names = Object.getOwnPropertyNames(attributes);

									
									parallel(names, function(name, i, next) {
										var name = names[i], attrKey = attributes[name];
											if (typeof attrKey === "function") {
												handleFunction(element, attrKey, data, function(attrData) {
													replacementAttributes[name] = attrData;
													next();
												});
											} 
											else {
												attrData = data[attrKey]
												next();
											}
									}, callback)
								}
								else {
									callback();
								}
							}

							parallel([ getContent, getMode, getAttributes], function(f, i, next) {
								f(next);
							}, function() {
								update(element, {
									content: replacementData,
									attributes: replacementAttributes,
									mode: replacementMode
								});
								nextElement();
							})
						}, done)
					}
				}

				
				handleKey(key, function() {
					proceed();
				})
				
			}
			 	
			
		}

		if (Array.isArray(bindings)) {
			bindings.forEach(function(bindings){
				process(Object.getOwnPropertyNames(bindings || { }), bindings, 0)
			})
		}
		else if (typeof bindings === "object" || typeof bindings === "undefined") {
			process(Object.getOwnPropertyNames(bindings || { }), bindings, 0)
		}
		else {
			throw new Error("Bindings not an object or array!")
		}
		

	}
	
	transform(dom, bindings, data, done);	
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
		this.parser =  DOM.parser(callback);
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
Engine.prototype.template = function(name, bindings, data, context, done) {
	var engine = this;

	switch(arguments.length) {
	case 2: //name, done
		done = bindings;
		bindings = { };
		data = undefined;
		break;
	case 3: //name, bindings, done
		done = data;
		data = undefined;
		break;
	case 4:
		done = context;
		context = undefined;
		break;
	case 5:
		break;
	default:
		throw "Invalid number of arguments!";
	}
	
	if (name[0] !== "<") {
		engine.log.debug("Fetching template "+name+"...");
		var cachedTemplate = this.cache[name];
			
		if ( cachedTemplate )
			engine.provider.lastModified(name, function(time) {
				cachedTemplate.outdated = !time || time > cachedTemplate.mtime;
			});
		
		if ( cachedTemplate && !cachedTemplate.outdated ) {
			engine.log.debug("Using cached template.");
			return engine.execute(cachedTemplate.dom.cloneNode(true), bindings, data, context, done);
		}

		var p = new Engine.Parser(function(dom) {
			engine.log.debug("Saving "+name+" to cache...");
			engine.cache[name] = {
				dom: dom,
				mtime: Date.now(),
				outdated: false
			};
			dom.getDocumentElement().attributes["data-template"] = name;
			engine.log.debug("Rendering "+name+"...");
			engine.execute(dom.cloneNode(true), bindings, data, context, done);
		});
		
		engine.provider.get(name, function(e) {
			engine.log.debug("Template "+name+" fetched.");
			if ((typeof EventEmitter !== "undefined") && (e instanceof EventEmitter)) {
				e.on( "data", function(chunk) {
					p.data(chunk.toString());
				}).on( "close",function() {
					p.end();
				});
			}
			else if (e) {
				p.data(e);
				p.end();
			}
			else {
				throw "Could not find template "+name;
			}
		});
	}
	else {
		engine.log.debug("Rendering raw template data...");
		var p = new Engine.Parser(function(dom) {
			engine.execute(dom, bindings, data, context, done);
		});
		p.data(name);
		p.end();
	}
	
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
	
	return new Engine(opts);
};

})(exports || {});