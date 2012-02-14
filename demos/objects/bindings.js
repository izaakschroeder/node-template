{
	".person": {
		data: "mannan",
		bindings: {
			".name": "name",
			".stats": {
				data: "stats",
				bindings: {
					".most-played": "mostPlayedHero",
					".kills": "kills",
					".deaths": "deaths",
					".assists": "assists",
					".kd": function(data) {
						return data.kills / data.assists;
					}
				}
			},
			".happiness": "happiness"
		}
	}
}