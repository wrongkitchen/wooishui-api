var path = require('path'),
    rootPath = path.normalize(__dirname + '/..'),
    env = process.env.NODE_ENV || 'development';

var config = {
  development: {
    root: rootPath,
    app: {
      name: 'wooishui-express'
    },
    port: 3000,
    db: 'mongodb://localhost/wooishui-express-development',
  },

  test: {
    root: rootPath,
    app: {
      name: 'wooishui-express'
    },
    port: 3000,
    db: 'mongodb://localhost/wooishui-express-test',
  },

  production: {
    root: rootPath,
    app: {
      name: 'wooishui'
    },
    port: process.env.PORT,
    db: process.env.MONGOLAB_URI,
  }
};

module.exports = config[env];
