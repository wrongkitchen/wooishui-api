var path = require('path'),
    rootPath = path.normalize(__dirname + '/..'),
    env = process.env.NODE_ENV || 'development';

var config = {
  development: {
    root: rootPath,
    app: {
      name: 'wooishui-api'
    },
    port: 3000,
    db: 'mongodb://localhost/wooishui-api-development'
  },

  test: {
    root: rootPath,
    app: {
      name: 'wooishui-api'
    },
    port: 3000,
    db: 'mongodb://localhost/wooishui-api-test'
  },

  production: {
    root: rootPath,
    app: {
      name: 'wooishui-api'
    },
    port: 3000,
    db: 'mongodb://localhost/wooishui-api-production'
  }
};

module.exports = config[env];
