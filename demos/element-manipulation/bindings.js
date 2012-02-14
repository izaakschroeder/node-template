{
	".alert": function(data) {
		switch(data.status) {
		case "error":
			this.classList.add("alert-error")
			break;
		case "success":
			this.classList.add("alert-success")
			break;
		case "info":
		default:
			this.classList.add("alert-info")
			break;
		}
		return data.message;

	}
}