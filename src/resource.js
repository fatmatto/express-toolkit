const Controller = require('./controller')
const makeRouter = require('./router')
/**
 * Represents a REST resource.
 */
class Resource {
  /**
   *
   * @param {Object} config The configuration object
   * @param {String} config.name The resource name
   * @param {Object} config.model The mongoose model
   * @param {Object} [config.endpoints] Endpoints configuration for router
   * @param {String} [config.id] The attribute to use as primary key for findById, updateById and deleteById. Defaults to _id.
   * @param {Number} [config.defaultSkipValue] The default skip value to be used in find() queries
   * @param {Number} [config.defaultLimitValue] The default skip value to be used in find() queries
   */
  constructor (config) {
    this.controller = new Controller(config)
    this.model = config.model
    if (config.endpoints) {
      this.endpoints = config.endpoints
    }
    this._router = this.getRouter()
  }

  getRouter () {
    const routerConfig = {
      controller: this.controller
    }
    if (this.endpoints) {
      routerConfig.endpoints = this.endpoints
    }
    this._router = makeRouter(routerConfig)
    return this._router
  }

  /**
   *
   * @param {String} path The url path to pass to express/connect app.use()
   * @param {Object} app ExpressJS app
   */
  mount (path, app) {
    // Using getRouter() will ensure that express receives the latest router state
    // otherwise, express would receive a router which does not take hooks in account
    app.use(path, this.getRouter())
  }

  get router () {
    return this.getRouter()
  }
}

module.exports = Resource
