var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

var DebtSchema = new Schema({
	creatorUID: { type: String, required:true },
	creditorUID: { type: String, required: true },
	creditorName: { type: String },
	debtorsUID: { type: String, required: true },
	debtorsName: { type: String },
	price: { type: Number, required: true },
	desc: String,
	reject: String,
	withoutSocial: { type: Boolean, default:false },
	hidden: { type: Boolean, default:false },
	createdAt: { type: Date, default: Date.now }
});

mongoose.model('Debt', DebtSchema);
