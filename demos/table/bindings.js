{
	"tbody tr": {
		data: "records",
		bindings: {
			".Name": "name",
			".Age": "age",
			"[name=fruit]": {
				data: function(data, context) { 
					return context.data.fruits; 
				},
				bindings: {
					"option": {
						attributes: {
							value: "id",
							selected: function(user) {
								return user.fruit === this.value;
							}
						},
						content: "name"
					}
				}
			}
		}
	}
}