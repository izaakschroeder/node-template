(function(t) {

var fs = require('fs');
var DOM = require('dom');
var sizzle = require('sizzle');
var cache = {};
var util = require('util');

var querySelector = sizzle.query;
var searchPath = "./templates";

function execute(name, _dom, bindings, data, done) {
	var dom = _dom;
	//var dom = Object.clone(_dom);
	for(var selector in bindings) {
		var key = bindings[selector];
		var xxx = undefined;
	
		if (typeof key === "function")
			xxx = key.call(key, data);
		else
			xxx = data[key];
		
		var elements = querySelector(selector, dom);
		/*
		if (typeof xxx.length !== "undefined" && typeof xxx.splice === "function") {			
			for (var i in elements) {
				replacements = [];
				for (var j = 0; j<data[key].length; ++j) {
					var newNode = elements[i].clone();
					newNode.content(data[key][j]);
					replacements.push(newNode);
				}
				elements[i].replace(replacements);
			}
		} */
		//else {
			for (var i in elements)
				elements[i].content(xxx);
		//}
		
	}
	//dom.firstChild.attributes["data-template"] = name;
	done(dom);
}

var resolve = function(name, done) {
	done(searchPath+'/'+name+'.html');
}

var get = function(name, done) {
	resolve(name, function(path){
		fs.readFile(path, 'utf8', function(err, content) {
			if (err)
				throw err;
			done({
				data: content,
				name: name
			});
		});
	});
}



var template = function(name, bindings, data, done) {
	var file = searchPath+'/'+name+'.html';
	var cachedTemplate = cache[name];
	
	if (cachedTemplate)
		fs.stat(file, function(err, stats) {
			if (err || stats.mtime > cache[name].mtime)
				cache[name].outdated = true;
		});
	
	if (cachedTemplate && !cachedTemplate.outdated ) {
		execute(name, cachedTemplate.dom, bindings, data, done);
		return;
	}
	
	var p = DOM.parser(function(dom) {
		cache[name] = {
			dom: dom,
			mtime: Date.now(),
			outdated: false
		};
		execute(name, dom, bindings, data, done);
	});
	
	fs.createReadStream(file).addListener( "data", function(chunk) {
		p.data(chunk.toString());
	}).addListener( "close",function() {
		p.end();
	});
}

var templates = function(done) {
	out = { };
	fs.readdir(searchPath, function (err, files) { 
		if (err) 
			throw err;
		var n = files.length;
		files.forEach( function (file) {
			
			var path = searchPath + '/' + file;
			fs.stat(path, function (err, stat) {
				if (!err && stat.isFile()) {
					fs.readFile(path, 'utf8', function(err, content) {
						var name = file.substr(0, file.lastIndexOf('.')) || file;
						out[name] = {
							name: name,
							data: content,
							lastModified: stat.mtime
						}
						if (--n == 0) {
							done(out);
						}
					})
				}
			});
		});
	});
}

t.execute = template;
t.all = templates;
t.get = get;
t.resolve = resolve;

})(exports || {});