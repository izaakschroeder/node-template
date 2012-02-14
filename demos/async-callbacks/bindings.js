{
	".timeout": function(data, context, engine, callback) {
		setTimeout(callback.bind(undefined, (data.duration/1000)+" seconds later"), data.duration)
	}
}