var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

var UserSchema = new Schema({
	uid: { type: String, index: { unique: true }},
	facebook: Schema.Types.Mixed,
	accessToken: String,
	deviceToken: String,
	createdAt: { type: Date, default: Date.now }
});

UserSchema.virtual('name').get(function(){
	return this.facebook.name;
});

mongoose.model('User', UserSchema);