var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

var UserSchema = new Schema({
	uid: String,
	facebook: Schema.Types.Mixed,
	accessToken: String,
	refreshToken: String,
	createdAt: { type: Date, default: Date.now }
});

UserSchema.virtual('name').get(function(){
	return JSON.parse(this.facebook).name;
});

mongoose.model('User', UserSchema);