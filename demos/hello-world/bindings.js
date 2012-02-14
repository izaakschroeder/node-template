{
	".name": "name",
	".age": function(data) {
		var then = Date.parse(data.birthday), 
			year = 1000*3600*24*365.25;
		return (Date.now() - then) / year;
	}
}