
function benchmark(t, callback) {

	var engine = Template.engine();

	function run(callback) {
		
		var runs = 500, now = Date.now(), left = runs, template = engine.template(t.template, t.bindings);

		for (var i = 0; i < runs; ++i)
			template.render(t.data, function(dom) {
				if (--left === 0)
					done();		
			})


		function done() {
			var total = Date.now() - now, perRender = total/runs;
			callback({
				total: total,
				perRender: perRender,
				runs: runs
			})
		}
	}

	var runs = 10, left = runs, results = [];

	for(var i = 0; i < runs; ++i) {
		run(function(result) {
			results.push(result);
			if (--left === 0)
				done();
		})
	}

	function done() {
		var max = -Infinity, min = Infinity, sum = 0;
		results.forEach(function(result) {
			console.log("Took ~"+result.perRender+"ms/render.");
			max = Math.max(max, result.perRender);
			min = Math.min(min, result.perRender);
			sum += result.perRender;
		})

		callback({
			max: max,
			min: min,
			avg: (sum/runs),
			runs: results
		})
	}
}


