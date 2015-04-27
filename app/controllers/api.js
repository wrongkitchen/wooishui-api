var express = require('express'),
	router = express.Router(),
	mongoose = require('mongoose'),
	uuid = require('node-uuid');
var Debt = mongoose.model('Debt');
var User = mongoose.model('User');

module.exports = function (app) {
	app.use('/api', router);
};

router.get('/debtsSubmit', function (req, res, next) {
	var _q = req.query;
	var isCreatorDebt  = (_q.isCreatorDebt == 'true'),
		price = parseFloat(_q.price) || 0,
		desc = _q.desc,
		otherUserID = _q.otherUserID,
		otherUserName = _q.otherUserName
		itemid = _q.itemid;

	var insertData = function(pUser){
		if(price > 0){
			var newDebt = new Debt({
				creatorUID: pUser.uid,
				creditorUID: (isCreatorDebt) ? otherUserID : pUser.uid,
				creditorName: (isCreatorDebt) ? otherUserName : pUser.name,
				debtorsUID: (isCreatorDebt) ? pUser.uid : otherUserID,
				debtorsName: (isCreatorDebt) ? pUser.name : otherUserName,
				price: price,
				desc: desc
			});
			newDebt.save(function(err) {
				if(err){
					res.jsonp({ status:false, error: err });
				} else {
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
						if(err)
							res.status(500).jsonp({ status: false, error:err });
						else
							res.jsonp({ status: true });
					});
				} else {
					res.jsonp({ status: false, error: 'no such data' });
				}
			}
		});
	};

	var addDebtByUID = function(pUser){
		User.where({ 'uid' : otherUserID }).findOne()
			.exec(function(err, user){
			if(err){
				res.status(500).jsonp({ status: false, error: err });
			} else {
				if(user){
					// Facebook User
					otherUserName = user.name;
					insertData(pUser);
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
									insertData(pUser);
								} else {
									res.jsonp({ status: false, error: 'no this uid' });
								}
							}
						});
				}
			}
		});
	};

	User.findOne({ uid:_q.curUser }).exec(function(err, user){
		if(err){
			res.status(500).jsonp({ error: 'Please login to our system' });
		} else {
			if(user){
				if(itemid){
					rebornDebt(user, itemid);
				} else if(otherUserID){
					addDebtByUID(user);
				} else {
					otherUserID = uuid.v1();
					insertData(user);
				}
			}
		}
	});

});



// Checked

router.get('/connectUser', function (req, res, next) {
	var _q = req.query;
	var uid = _q.uid;
	if(uid){
		if(_q.from && _q.to){
			User.findOne({ uid:_q.to }).exec(function(err, data){
				if(err){
					res.jsonp({ status: false, error: err });
				} else if(data){
					var userData = data;
					Debt.update({ creditorUID: _q.from, debtorsUID : uid }, 
								{ creditorUID: _q.to, creditorName: userData.name }, 
								{ multi: true }, 
					function(err, data){
						if(err){
							res.status(500).jsonp({ error: err });
						} else {
							Debt.update({ debtorsUID: _q.from, creditorUID : uid }, 
								{ debtorsUID: _q.to, debtorsName: userData.name }, 
								{ multi: true },
							function(err, data){
								if(err)
									res.status(500).jsonp({ error: err });
								else
									res.jsonp({ status: true, message: "success" });
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