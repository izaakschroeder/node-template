(function(exports) {

//Only defined when using node.js.
//TODO: Is there a better way of detecting this?
var 
	EventEmitter = typeof process === "object" ? require('events').EventEmitter : undefined, 
	DOM = typeof window !== "undefined" ? window : require('dom'),
	implementation = typeof document !== "undefined" ? document.implementation : DOM.implementation,
	Node = DOM.Node,
	Element = DOM.Element,
	Document = DOM.Document;


function Stack() {
	Array.apply(this, arguments);
}
Stack.prototype = [ ];

Stack.prototype.concat = function(obj) {
	var top = this.top;

	if (top) 
		[ "data", "key", "bindings" ].forEach(function(item) {
			if (!obj.hasOwnProperty(item))
				obj[item] = top[item];
		})

	var out =  this.slice();
	out.__proto__ = this; //LOL should we even be doing this?
	out.push(obj)

	return out;
}

Stack.prototype.__defineGetter__("top", function() {
	return this[this.length - 1];
})

function Template(engine, doc, dom, bindings, context) {
	this.engine = engine;
	this.bindings = bindings;
	this.todo = [ ];
	this.dom = undefined;
	this.document = doc;

	var self = this;
	//DOM is a document tree
	if (dom instanceof Document) {
		this.dom = dom.documentElement;
	}
	else if (dom instanceof Element) {
		this.dom = dom;
	}
	//DOM is actually raw XML so just parse it out
	else if (typeof dom === "string") {
		if (dom[0] === "<") {
			//engine.log.debug("Rendering raw template data...");
			Engine.parse(dom, function(dom) {
				self.dom = dom.documentElement;
				self.processTodo();
			});
		}
		//DOM is the name of a template
		else {
			engine.data(dom, function(dom) {
				self.dom = dom.documentElement;
				self.processTodo();
			})		
		}
	}
	else {
		throw new TypeError();
	}

}

Template.prototype.process = function(data, userContext, done) {
	var root = this.document.importNode(this.dom, true);
	this.engine.execute(root, this.bindings, data, userContext, done);
}

Template.prototype.processTodo = function() {
	for (var i = 0; i < this.todo.length; ++i)
		this.process(this.todo[i][0], this.todo[i][1], this.todo[i][2]);
}

Template.prototype.render = function(data, userContext, done) {
	if (typeof done === "undefined") {
		done = userContext;
		userContext = undefined;
	}
	if (!this.dom)
		return this.todo.push([ data, userContext, done ]);
	this.process(data, userContext, done);
}


function Context(engine, doc) {
	doc = doc || (typeof document !== "undefined" ? document : false) || implementation.createDocument("http://www.w3.org/1999/xhtml", "html", "html");
	if (doc instanceof Document === false)
		throw new TypeError("Document must be a valid DOM document!");
	this.document = doc;
	this.engine = engine;
}

Context.prototype.template = function(name, bindings, data, context, done) {
	switch(arguments.length) {
	case 1:
		name = name;
		break;
	case 2: //name, done OR name, bindings
		if (typeof arguments[1] === "function") {
			done = bindings;
			bindings = { };
		}	
		break;
	case 3: //name, bindings, done OR name, bindings, context
		data = undefined;
		if (typeof arguments[2] === "function") {
			done = arguments[2];
		}
		else {
			context = arguments[2];
		}
		break;
	case 4: //name, bindings, data, done
		done = context;
		context = undefined;
		break;
	case 5:
		break;
	default:
		throw "Invalid number of arguments!";
	}

	if (typeof name !== "string" && name instanceof Document === false && name instanceof Element === false)
		throw new TypeError("Template must be either a template string, a template name or a DOM tree.");
	
	if (typeof name === "string" && name.length === 0)
		throw new Error("Template or its name must be greater than 0 characters in length.");

	if (typeof name === "string")
		name = name.trim();

	var template = new Template(this.engine, this.document, name, bindings, context);

	if (done)
		template.render(data, context, done);

	return template;
}

/**
 *
 *
 *
 */
function Engine(opts) {
	opts = opts || { };
	this.provider = opts.provider;
	this.cache = { };
	this.log = opts.log || console;
	[ "debug", "info", "warn", "error" ].forEach(function(level) {
		if (typeof this.log[level] === "undefined")
			this.log[level] = this.log.log;
	}, this)
	
}

Engine.prototype.data = function(name, callback) {
	var engine = this;

	if (!this.provider)
		throw new Error("No provider to fetch templates from!");
	
	this.log.debug("Fetching template "+name+"...");
	var cachedTemplate = this.cache[name];
		
	if ( cachedTemplate )
		this.provider.lastModified(name, function(time) {
			cachedTemplate.outdated = !time || time > cachedTemplate.mtime;
		});
	
	if ( cachedTemplate && !cachedTemplate.outdated ) {
		this.log.debug("Using cached template.");
		return callback(cachedTemplate.dom);
	}

	var p = new Engine.Parser(function(dom) {
		engine.log.debug("Saving "+name+" to cache...");
		engine.cache[name] = {
			dom: dom,
			mtime: Date.now(),
			outdated: false
		};
		dom.documentElement.attributes["data-template"] = name;
		callback(dom);
	});
	
	engine.provider.get(name, function(e) {
		engine.log.debug("Template "+name+" fetched.");
		Engine.parse(e, callback)
	});
}


/**
 *
 *
 *
 */
Engine.prototype.execute = function(dom, bindings, data, userContext, done) {

	if (typeof done !== "function")
		throw new TypeError("Callback is not a function");

	var engine = this;

	function handleData(stack, data, callback) {
		var top = stack.top, oldData = top.data;

		switch(typeof data) {
		case "function":
			return handleFunction(undefined, data, stack, callback);
		case "string":
			if (!oldData)
				throw new Error("No data to get a key out of!");
			return callback(oldData[data]);
		case "object":
			return callback(data);
		case "null":
		case "undefined":
			return callback(oldData);
		default:
			throw new TypeError("Data is neither a string, function, nor object!");
		}
	}

	function handleFunction(that, f, stack, callback) {
		var top = stack.top, data = top.data, runContext = { engine: engine, stack: stack };
		if (f.length === 4)
			f.call(that, data, userContext, runContext, callback);
		else
			callback(f.call(that, data, userContext, runContext));
	}

	function remove(element) {
		element.parent.removeChild(element);
		return null;
	}

	function empty(element) {
		while (element.firstChild)
			element.removeChild(element.firstChild);
		return element;
	}

	function replace(element, replacement) {
		var 
			r = typeof replacement.length !== "undefined" && typeof replacement.splice === "function" ? replacement : [replacement],
			parent = element.parentNode;
		parent.replaceChild(r[0], element);
		for (var i = 1; i < r.length; ++i)
			parent.insertBefore(r[i], r[i-1].nextSibling)
		return element;
	}

	function content(element, content) {
		empty(element);
		if (!(content instanceof Node))
			content = dom.ownerDocument.createTextNode('' + content);
		element.appendChild(content);
		return element;
		
	}

	/*

	
	*/

	function update(element, options, callback) {

		var 
			replacement = options.content,
			attributes = options.attributes || { },
			mode = options.mode || "content",
			result = element;

		if (replacement instanceof Document)
			replacement = replacement.documentElement;
		
		if (options.hasOwnProperty('content')) {
			
			if (typeof replacement === "undefined") {
				return callback(remove(element));
			}
			else if (replacement === null) {
				switch(mode) {
				case "replace":
					return callback(remove(element));
				case "content":
					result = empty(element);
					break;
				default:
					throw "WTF?";
				}
			}
			else if (typeof replacement.length !== "undefined" && typeof replacement.splice === "function") {
				var replacements = [];
			 	//Loop through all elements in the data array
		 		return parallel(replacement, function(item, i, next) {
		 			update(element.cloneNode(true), {
						content: item,
						attributes: attributes,
						mode: mode
					}, function(node) {
						replacements.push(node);
						next();
					})
		 		}, function() {
		 			//Replace the content with all the new nodes
					result = replace(element, replacements);
					callback(result)
		 		});
			}
			else {
				switch(mode) {
				case "replace":
					result = replace(element, replacement);
					break;
				case "content":
					result = content(element, replacement);
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

		return callback(result);
	}

	function parallel(items, each, done) {
		var left = items.length;
		if (left === 0)
			return done();
		
		for (var i=0; i<items.length; ++i) 
			each(items[i], i, function(result) {
				if (--left === 0)
					done();
			});
	}

	function serial(items, initial, each, done) {

		function iterate(i, prev) {
			if (i === items.length)
				return done(prev);

			each(items[i], prev, function(result) {
				iterate(i+1, result);	
			});
		}

		iterate(0, initial);
	}
	
	function transform(element, stack, done) {

		if (typeof element === "undefined")
			throw new Error("Undefined element!");

		if (typeof done !== "function")
			throw new Error("Callback given is not a function!");

		
		var top = stack.top, data = top.data, bindings = top.bindings;

		if (!Array.isArray(bindings)) 
			bindings = [ bindings ];
		
		//Bindings must be done in serial because one binding could run a replace and the next
		//set of bindings would be using that replaced node
		serial(bindings, element, function(bindings, element, nextBinding) {
			
			var selectors = Object.getOwnPropertyNames(bindings || { });

			if (bindings && typeof bindings !== "object")
				throw new TypeError("Bindings must be an object!");
			
			//Loop through all the bindings; doing it in serial in case one selector somehow
			//affects another
			serial(selectors, element, (function (stack, selector, element, proceed) {

				function handleKey(elements, stack, done) {

					var top = stack.top, data = top.data, key = top.key, bindings = top.bindings;
					
					//Control of the elements are delegated to a function
					if (typeof key === "function") {

						//Go through all the elements
						return parallel(elements, function(element, i, next) {

							//Call that function on a per-element basis
							handleFunction(element, key, stack, function(replacementData, isRaw) {
								//If we get another key back
					 			if (isRaw) {
					 				//Recurse using the new key
					 				handleKey(elements, stack.concat({key: replacementData}), next);
					 			}
					 			else {
					 				//Otherwise, if we get a plain ol object
					 				if (typeof replacementData === "object" && replacementData.constructor === Object) {
					 					//Assume the update command is from that object
						 				update(element, replacementData, next)
						 			}
						 			//Otherwise
						 			else {
						 				//Assume response is just content, and replace content
						 				update(element, { content: replacementData }, next);
						 			}
					 			}
					 			
					 			
					 		});
						}, done)
					}

					
					//If the data is an array
					if (typeof data !== "undefined" && typeof data.length !== "undefined" && typeof data.splice === "function") {
					 	//Loop through all elements in the data array
				 			
			 			parallel(elements, function(element, i, nextElement) {
			 				var newElements = [ ];
			 				serial(data, undefined, function(item, prev, nextData) {
			 					var newElement = element.cloneNode(true);
			 					newElements.push(newElement);
			 					handleKey([newElement], stack.concat({ data: item }), nextData);
			 				}, function() {
			 					replace(element, newElements);
			 					nextElement();
			 				});
			 			}, done);

					}
					//Sub-key in use
					else if (typeof key.bindings !== "undefined" || typeof key.template !== "undefined") {
						
						if (key.template) {
							
							engine.template(key.template, key.bindings, data, userContext, function(content) {
								handleKey(elements, stack.concat({ key: { mode: key.mode, attributes: key.attributes, content: content } }), done)
							})
						}
						else {
							parallel(elements, function(element, i, next) {
								transform(element, stack.concat({bindings: key.bindings}), next);
							}, done)
						}
												
					}
					//Set of keys instead of just one
					else if (Array.isArray(key)) {
						//Apply the transform serially
						serial(key, undefined, function(item, prev, next) {
							handleKey(elements, stack.concat({key: item}), next);
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
									handleFunction(element, key.content, stack, function(x) {
										replacementData = x;
										callback();
									});
									break;
								case "object":
									if (key.content instanceof Node)
										replacementData = key.content;
									else
										replacementData = key.content.toString();
									callback();
									break;
								default:
									replacementData = typeof data !== "undefined" && data.hasOwnProperty(key) ? 
										data[key] : "";
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
												handleFunction(element, attrKey, stack, function(attrData) {
													replacementAttributes[name] = attrData;
													next();
												});
											} 
											else {
												replacementAttributes[name] = data[attrKey]
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
								}, nextElement);
							})
						}, done)
					}
				}

				var 
					//Get the element matching the selector
					elements = element.querySelectorAll(selector),
					//Get the thing we're replacing the selector with
					key = bindings[selector];

				handleData(stack, key.data, function(data) {
					handleKey(elements, stack.concat({ data: data, key: key }), proceed.bind(undefined, element));
				})
			}).bind(undefined, stack), nextBinding)


		}, done);		

	}
	
	if (dom instanceof Element === false && dom instanceof Document === false)
		throw new TypeError("Must give an element or document!");

	var stack = new Stack();
	stack.push({ engine: engine, data: data, bindings: bindings })
	transform(dom, stack, done);
	

		
}

/**
 *
 *
 * @note See https://sites.google.com/a/van-steenbeek.net/archive/explorer_domparser_parsefromstring
 */
Engine.Parser = function(callback) {
	this.buffer = "";
	this.callback = callback;
	if (typeof DOMParser !== "undefined") { 
		this.parser = new DOMParser();
	}
	else if (typeof ActiveXObject !== "undefined") {
		this.parser = {
			parseFromString: function(data) {
				var xmldata = new ActiveXObject('MSXML.DomDocument');
				xmldata.async = false;
				xmldata.loadXML(data);
				return xmldata;
			}
		}
		
	}
	else if (typeof(XMLHttpRequest) != 'undefined') {
		this.parser = {
			parseFromString: function(data) {
				var xmldata = new XMLHttpRequest(), contentType = 'application/xml';
				xmldata.open('GET', 'data:' + contentType + ';charset=utf-8,' + encodeURIComponent(data), false);
				if(xmldata.overrideMimeType) 
					xmldata.overrideMimeType(contentType);
				xmldata.send(null);
				return xmldata.responseXML;
			}
		}
	}
	
	else
		this.parser =  DOM.parser(callback);
}

Engine.parse = function(data, callback) {
	var p = new Engine.Parser(callback);
	if ((typeof EventEmitter !== "undefined") && (data instanceof EventEmitter)) {
		data.pipe(p);
	}
	else if (data) {
		p.data(data);
		p.end();
	}
	else {
		callback(undefined);
	}
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

Engine.prototype.context = function(doc) {
	return new Context(this, doc);
}

/**
 *
 *
 *
 */
Engine.prototype.template = function(name, bindings, data, context, done) {
	var tmpContext = this.context();
	return tmpContext.template.apply(tmpContext, arguments);
}

/**
 *
 *
 *
 */
exports.engine = function(opts) {
	return new Engine(opts);
};

})(typeof exports !== "undefined" ? exports : window.Template = { });
