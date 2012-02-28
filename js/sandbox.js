
$(function() {
	var engine = Template.engine();

	$.ajaxSetup({ cache: false });

	loadDemo = function(demo, callback) {
		var base = "demos/"+demo, template, data, bindings;
		
		$.get(base + "/template.html", function(result) {
			template = result;
			next();
		}, "text")
		$.get(base + "/data.json", function(result) {
			data = result;
			next();
		}, "text")
		$.get(base + "/bindings.js", function(result) {
			bindings = result;
			next();
		}, "text")

		function next() {
			if (template && data && bindings)
				callback({
					template: template,
					data: data,
					bindings: bindings
				})
		}
	}

	render = function() {
		
		try {
			var 
				output = $("#Output"),
				t = localData();

			engine.template(t.template, t.bindings, t.data, function(out) {			
				output.html(out);
			})
		} catch(e) {
			output.html("Error rendering.");
		}
	}

	$("textarea").each(function() {
		$(this).data("editor", CodeMirror.fromTextArea(this, { 
			mode: $(this).data("language"),
			indentWithTabs: true,
			indentUnit: 4,
			lineNumbers: true,
			onChange: render
		}));
	})

	$("#DemoSelection *[name=demo]").bind("change", function() {
		$(this.form).submit();
	})

	var 
		templateField = $("#TemplateInput *[name=template]").data("editor"),
		dataField = $("#TemplateInput *[name=data]").data("editor"),
		bindingsField = $("#TemplateInput *[name=bindings]").data("editor");

	function localData() {
		var 
			template = templateField.getValue(),
			bindings = eval("("+bindingsField.getValue()+")"),
			data = eval("("+dataField.getValue()+")");
		return {
			template: template,
			bindings: bindings,
			data: data
		};
	}

	

	

	$("#DemoSelection").bind("submit", function() {
		loadDemo($(this).find("[name=demo]").val(), function(demo) {
			templateField.setValue(demo.template)
			dataField.setValue(demo.data)
			bindingsField.setValue(demo.bindings)
		});
		return false;
	}).submit();

	$("#BenchmarkButton").bind("click", function() {
		benchmark(localData(), function(results) {
			console.log(results);
		})
		return false;
	});

	

})
