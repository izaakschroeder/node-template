{
	"tbody tr": {
		data: "records",
		bindings: {
			".Name": "name",
			".Age": "age",
			"[name=fruit] option": {
				data: function(data, context, sys) {
					return sys.stack[0].data.fruits;
				},
				attributes: {
					value: "id",
					selected: function(data, context, sys) {
						var fruit = sys.stack[sys.stack.length - 3].data.fruit;
						return data.id === fruit ? "selected" : undefined;
					}
				},
				content: "name"
				
			}
		}
	}
}