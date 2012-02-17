{
	"tbody tr": {
		data: "records",
		bindings: {
			".Name": "name",
			".Age": "age",
			"[name=fruit] option": {
				data: function(data, context) {
					return context.data.fruits; 
				},
				attributes: {
					value: "id",
					selected: function(user) {
						return user.fruit === this.value ? "selected" : undefined;
					}
				},
				content: "name"
				
			}
		}
	}
}