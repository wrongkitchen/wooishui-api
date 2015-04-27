var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

var DebtSchema = new Schema({
	creatorUID: { type: String, required:true },
	creditorUID: { type: String, required: true },
	creditorName: { type: String, required: true },
	debtorsUID: { type: String, required: true },
	debtorsName: { type: String, required: true },
	price: { type: Number, required: true },
	desc: String,
	reject: String,
	hidden: { type: Boolean, default:false },
	createdAt: { type: Date, default: Date.now }
});

mongoose.model('Debt', DebtSchema);


// var keystone = require('keystone'),
// 	Types = keystone.Field.Types;

// var Debts = new keystone.List('Debts');

// Debts.add({
// });

// Debts.defaultSort = '-createdAt';
// Debts.defaultColumns = 'creditorName, debtorsName, price, createdAt';
// Debts.register();
