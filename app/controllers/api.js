var express = require('express'),
	router = express.Router(),
	mongoose = require('mongoose'),
	uuid = require('node-uuid'),
	_ = require('underscore');
var Debt = mongoose.model('Debt');
var User = mongoose.model('User');
var apn = require('apn');
var FB = require('fb');

var apnConnection = null;
var submitAPNS = function(deviceToken, message, pParam){

	var device = new apn.Device(deviceToken);
	
	var note = new apn.Notification();

	note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
	note.badge = 3;
	note.alert = message;
	note.payload = pParam;

	apnConnection.pushNotification(note, device);
};

router.use(function (req, res, next) {
	var at = req.query.accessToken;
	var uid = req.query.uid;
	FB.setAccessToken(at);
	FB.api('/me', function(pObj){
		if(pObj.error){
			res.json({ status: false, err: pObj.error });
		} else if(pObj.id != uid){
			res.json({ status: false, err: "Permission Denied" });
		} else {
			next();
		}
	});
});

module.exports = function (app, config) {
	apnConnection = new apn.Connection({
		cert 			: config.root + '/cert/cert.pem',
		key 			: config.root + '/cert/key.pem',
		production 		: false,
		passphrase 		: 'KJ1kj1kj1'
	});
	apnConnection.on("connected", function() {
	    console.log("Connected");
	});
	apnConnection.on("transmitted", function(notification, device) {
	    console.log("Notification transmitted to:" + device.token.toString("hex"));
	});
	apnConnection.on("transmissionError", function(errCode, notification, device) {
	    console.error("Notification caused error: " + errCode + " for device ", device, notification);
	    if (errCode === 8) {
	        console.log("A error code of 8 indicates that the device token is invalid. This could be for a number of reasons - are you using the correct environment? i.e. Production vs. Sandbox");
	    }
	});
	apnConnection.on("timeout", function () {
	    console.log("Connection Timeout");
	});

	apnConnection.on("disconnected", function() {
	    console.log("Disconnected from APNS");
	});

	apnConnection.on("socketError", console.error);

	app.use('/api', router);
};

router.get('/login', function (req, res, next) {
	var _q = req.query;
	User.where({ uid:_q.uid }).findOne().exec(function(pErr, pUser){
		if(pErr){
			res.jsonp({ status:false, error: pErr });
		} else {
			if(pUser){
				var isChanged = false;
				if(pUser.accessToken != _q.accessToken){
					pUser.accessToken = _q.accessToken;
					isChanged = true;
				}
				if(pUser.deviceToken != _q.deviceToken){
					pUser.deviceToken = _q.deviceToken;
					isChanged = true;
				} 
				if(_.isEqual(pUser.facebook, _q.facebook) === false){
					pUser.facebook = _q.facebook;
					isChanged = true;
				}
				if(isChanged){
					pUser.save(function(pSaveErr){
						if(!pSaveErr){
							res.jsonp({ status: true });
						} else {
							res.jsonp({ status:false, error: pSaveErr });
						}
					});
				} else {
					res.jsonp({ status: true });
				}
			} else {
				var newUser = new User(_q);
				newUser.save(function(err){
					if(err){
						res.jsonp({ status:false, error: err });
					} else {
						res.jsonp({ status: true });
					}
				});
			}
		}
	});
});

router.get('/debtsSubmit', function (req, res, next) {
	var _q = req.query;
	var isCreatorDebt  = (_q.isCreatorDebt == 'true'),
		price = parseFloat(_q.price) || 0,
		desc = _q.desc,
		otherUserID = _q.otherUserID,
		otherUserName = _q.otherUserName,
		itemid = _q.itemid;
		curUser = _q.uid;
	var insertData = function(pUser, pParam, pCallback){
		if(price > 0){
			var _debt = {
				creatorUID: pUser.uid,
				creditorUID: (isCreatorDebt) ? otherUserID : pUser.uid,
				creditorName: (isCreatorDebt) ? otherUserName : pUser.name,
				debtorsUID: (isCreatorDebt) ? pUser.uid : otherUserID,
				debtorsName: (isCreatorDebt) ? pUser.name : otherUserName,
				price: price,
				desc: desc
			};
			_debt = (pParam) ? _.extend(pParam, _debt) : _debt;

			var newDebt = new Debt(_debt);
			newDebt.save(function(err) {
				if(err){
					res.jsonp({ status:false, error: err });
				} else {
					if(pCallback) pCallback();
					res.jsonp({ status: true, message: "success" });
				}
			});

		} else {
			res.jsonp({ status:true });
		}
	};

	var rebornDebt = function(pUser, pItemID){
		Debt.where('_id', pItemID)
			.or([{ creditorUID : pUser.uid }, { debtorsUID : pUser.uid }])
			.findOne()
		.exec(function(err, debt){
			if(err){
				res.status(500).jsonp({ error: err });
			} else {
				if(debt){
					debt.creditorUID = (isCreatorDebt) ? otherUserID : pUser.uid;
					debt.creditorName = (isCreatorDebt) ? otherUserName : pUser.name;
					debt.debtorsUID = (isCreatorDebt) ? pUser.uid : otherUserID;
					debt.debtorsName = (isCreatorDebt) ? pUser.name : otherUserName;
					debt.price = price;
					debt.desc = desc;
					debt.reject = "";

					debt.save(function(err){
						if(err){
							res.status(500).jsonp({ status: false, error:err });
						} else {
							res.jsonp({ status: true });
						}
					});
				} else {
					res.jsonp({ status: false, error: 'no such data' });
				}
			}
		});
	};

	var addDebtByUID = function(pUser, pOtherUser){
		if(pOtherUser){
			// Facebook User
			otherUserName = pOtherUser.name;
			insertData(pUser, {}, function(){
				submitAPNS(pOtherUser.deviceToken, pUser.name + ' just added a debt for you', {
					messageFrom: pOtherUser.uid
				});
			});
		} else {
			// Non-Facebook User
			Debt.find().or([{ creditorUID : otherUserID }, { debtorsUID : otherUserID }])
				.findOne()
				.exec(function(err, debt){
					if(err){
						res.status(500).jsonp({ status: false, error:err });
					} else {
						if(debt){
							otherUserName = (debt.debtorsUID === otherUserID) ? debt.debtorsName : debt.creditorName;
							insertData(pUser, { withoutSocial : true });
						} else {
							res.jsonp({ status: false, error: 'no this uid' });
						}
					}
				});
		}
	};

	User.find({ $or:[{ uid : curUser }, { uid : otherUserID }] }).exec(function(err, user){
		if(err){
			res.status(500).jsonp({ error: 'Please login to our system' });
		} else {
			if(user){
				var curUserData = (user[0].uid === curUser) ? user[0] : user[1];
				var otherUserData = (user[0].uid === curUser) ? user[1] : user[0];

				if(itemid){
					rebornDebt(curUserData, itemid);
				} else if(otherUserID){
					addDebtByUID(curUserData, otherUserData);
				} else {
					otherUserID = uuid.v1();
					insertData(curUserData, { withoutSocial : true });
				}
			}
		}
	});

});



// Checked

router.get('/connectUser', function (req, res, next) {
	var _q = req.query;
	var curUserUID = _q.uid;
	if(curUserUID){
		if(_q.from && _q.to){
			User.find({ $or:[{ uid : _q.to }, { uid : curUserUID }] }).exec(function(err, user){

				if(err){
					res.jsonp({ status: false, error: err });
				} else if(user){

					console.log(user);

					var curUserData = (user[0].uid === curUserUID) ? user[0] : user[1];
					var userData = (user[0].uid === curUserUID) ? user[1] : user[0];

					Debt.update({ creditorUID: _q.from, debtorsUID : curUserUID }, 
								{ creditorUID: _q.to, creditorName: userData.name, withoutSocial: false }, 
								{ multi: true }, 
					function(err, data){
						if(err){
							res.status(500).jsonp({ error: err });
						} else {
							Debt.update({ debtorsUID: _q.from, creditorUID : curUserUID }, 
								{ debtorsUID: _q.to, debtorsName: userData.name, withoutSocial: false }, 
								{ multi: true },
							function(err, data){
								if(err){
									res.status(500).jsonp({ error: err });
								} else {
									submitAPNS(userData.deviceToken, curUserData.name + ' just added a debt for you', {
										messageFrom: curUserData.uid
									});
									res.jsonp({ status: true, message: "success" });
								}
							});
						}
					});
				} else if(!data) {
					res.jsonp({ status: false, error: "No such user" });
				}
			});
		}
	} else {
		res.status(500).jsonp({ error: 'Please provide uid' });
	}
});


router.get('/debtsAccept', function (req, res, next) {
	var _q = req.query;
	var itemID = _q.itemid;
	var uid = _q.uid;
	if(uid){
		if(itemID){
			Debt.where('_id', itemID)
			.or([{ creditorUID : uid }, { debtorsUID : uid }])
			.findOne(function(err, data){
				if(err){
					res.status(500).jsonp({ error: err });
				} else if(data){
					data.reject = "";
					data.save(function(err, data){
						if(err)
							res.status(500).jsonp({ error: err });
						else
							res.jsonp({ status: true, message: "success" });
					});
				} else {
					res.status(500).jsonp({ error: 'no such data' });
				}
			})
		}
	} else {
		res.status(500).jsonp({ error: 'Please login to our system' });
	}
});

router.get('/debtsReject', function (req, res, next) {
	var _q = req.query;
	var itemID = _q.itemid;
	var reason = _q.reason;
	var uid = _q.uid;
	if(uid){
		if(itemID){
			Debt.where('_id', itemID)
			.or([{ creditorUID : uid }, { debtorsUID : uid }])
			.findOne(function(err, data){
				if(err){
					res.status(500).jsonp({ error: err });
				} else if(data){
					data.reject = reason;
					data.save(function(err, data){
						if(err)
							res.status(500).jsonp({ error: err });
						else
							res.jsonp({ status: true, message: "success" });
					});
				} else {
					res.status(500).jsonp({ error: 'no such data' });
				}
			})
		}
	} else {
		res.status(500).jsonp({ error: 'Please login to our system' });
	}
});


router.get('/debtsRemove', function (req, res, next) {
	var _q = req.query;
	var itemID = _q.itemid;
	var uid = _q.uid;
	if(uid){
		if(itemID){
			Debt.where('_id', itemID)
			.where('hidden', false)
			.where('creatorUID', uid)
			.findOne()
			.exec(function(err, data){
				if(err){
					res.status(500).jsonp({ error: err });
				} else {
					if(data){
						data.hidden = true;
						data.save();
						res.jsonp({ status: true });
					} else {
						res.jsonp({ status: false, error: 'no such data' });
					}
				}
			});
		} else {
			res.status(500).jsonp({ error: 'api error' });
		}
	} else {
		res.status(500).jsonp({ error: 'Please login to our system' });
	}
});

router.get('/debtsCredits', function (req, res, next) {
	var _q = req.query;
	if(_q.uid){
		var uid = _q.uid;
		Debt.find().where({ hidden : false })
		.or([{ creditorUID : uid }, { debtorsUID : uid }])
		.exec(function(err, data){
			if(err)
				res.status(500).json({ error: err });
			else
				res.jsonp(data);
		});
	} else {
		res.status(500).json({ error: 'Please login to our system' });
	}
});