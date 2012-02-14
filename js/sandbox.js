
$(function() {
	var engine = Template.engine();

	$.ajaxSetup({ cache: false });

	render = function() {
		
		try {
			var 
				output = $("#Output"),
				template = $("#TemplateInput *[name=template]").data("editor").getValue(),
				bindings = eval("("+$("#TemplateInput *[name=bindings]").data("editor").getValue()+")"),
				data = eval("("+$("#TemplateInput *[name=data]").data("editor").getValue()+")");

			engine.template(template, bindings, data, function(out) {			
				output.html(out.documentElement);
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

	$("#DemoSelection").bind("submit", function() {
		var demo = $(this).find("[name=demo]").val(), base = "demos/"+demo;
		$.get(base + "/template.html", function(result) {
			$("#TemplateInput *[name=template]").data("editor").setValue(result)
		}, "text")
		$.get(base + "/data.json", function(result) {
			$("#TemplateInput *[name=data]").data("editor").setValue(result)
		}, "text")
		$.get(base + "/bindings.js", function(result) {
			$("#TemplateInput *[name=bindings]").data("editor").setValue(result)
		}, "text")
		return false;
	}).submit();

	

})
