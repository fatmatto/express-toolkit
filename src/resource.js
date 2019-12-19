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

    const routerConfig = {
      controller: this.controller
    }
    if (config.endpoints) {
      routerConfig.endpoints = config.endpoints
    }
    this.router = makeRouter(routerConfig)
  }

  mount (path, app) {
    app.use(path, this.router)
  }
}

module.exports = Resource
