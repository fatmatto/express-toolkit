const Controller = require('./controller')
const makeRouter = require('./router')
/**
 * Represents a REST resource, provides an expressjs router you can use in your expressjs app.
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
    this._router = this.rebuildRouter()
  }

  /**
   * Returns the router instance without rebuilding it
   * @return {Object} The router instance
   * @deprecated
   */
  getRouter () {
    return this._router
  }

  /**
   * Rebuilds the router, this should be used whenever the controller is modified, for example adding a hook.
   * This behaviour should change in upcoming releases
   * @returns {Object} The router instance
   */
  rebuildRouter () {
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
   * Mounts the resource's router to an express app
   * @param {String} path The url path to pass to express/connect app.use()
   * @param {Object} app ExpressJS app
   */
  mount (path, app) {
    // Using getRouter() will ensure that express receives the latest router state
    // otherwise, express would receive a router which does not take hooks in account
    app.use(path, this._router)
  }

  get router () {
    return this._router
  }

  /**
 * Registers a Hook function for the given event. Possible values for eventName are listed
 * here: https://github.com/fatmatto/express-toolkit
 * @param {String} eventName The event that will trigger the hook
 * @param {Function} handler The express middleware to use as hook
 */
  registerHook (eventName, handler) {
    this.controller.registerHook(eventName, handler)
    this.rebuildRouter()
  }
}

module.exports = Resource
