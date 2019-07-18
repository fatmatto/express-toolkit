
/**
 * @module express-toolkit/Controller
 */
const DEFAULT_LIMIT_VALUE = 100
const DEFAULT_SKIP_VALUE = 0
const { getSorting } = require('./utils')
const Errors = require('throwable-http-errors')

/**
 * Implements a REST resource controller
 * @class Controller
 */
class Controller {
  /**
   *
   * @param {Object} config The configuration object
   * @param {String} config.name The resource name
   * @param {Object} config.model A mongoose model
   * @param {Number} [config.defaultSkipValue] The default skip value to be used in find() queries
   * @param {Number} [config.defaultLimitValue] The default skip value to be used in find() queries
   *
   */
  constructor (config) {
    this.Model = config.model
    this.name = config.name
    this.defaultSkipValue = config.defaultSkipValue || DEFAULT_SKIP_VALUE
    this.defaultLimitValue = config.defaultLimitValue || DEFAULT_LIMIT_VALUE
    this.__hooks = {}
  }
  /**
   * Looks for records
   * @param {Object} query The query object
   */
  async find (query) {
    let skip = this.defaultSkipValue
    let limit = this.defaultLimitValue
    if (query.hasOwnProperty('limit')) {
      limit = Number(query.limit)
    }
    if (query.hasOwnProperty('skip')) {
      skip = Number(query.skip)
    }

    let sort = getSorting(query)

    // Deleting modifiers from the query
    delete query.skip
    delete query.limit
    delete query.sortby
    delete query.sortorder

    return this.Model
      .find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
  }

  /**
   * Looks for a single record matching the query
   * @param {Object} query The object used to query the database
   */
  async findOne (query) {
    const instance = await this.Model.findOne(query)
    if (instance === null) {
      throw new Errors.NotFound()
    } else {
      return instance
    }
  }

  /**
* Looks for a single record with the given id
* @param {String | Number} id The object used to query the database
*/
  async findById (id) {
    const instance = await this.Model.findOne({
      _id: id
    })

    if (instance === null) {
      throw new Errors.NotFound()
    } else {
      return instance
    }
  }

  /**
   *
   * @param {Object} data
   */
  async create (data) {
    const instance = new this.Model(data)

    // In testing we don't have the

    let validationError = instance.validateSync()
    if (validationError) {
      throw new Errors.BadRequest(validationError.message)
    }

    let savedInstance = await instance.save()

    return savedInstance.toJSON()
  }

  createViaUpsert (search, data) {
    return this.Model.findOneAndUpdate(search, data, { useFindAndModify: false, new: true, upsert: true, setDefaultsOnInsert: true })
  }

  /**
  * Update records by query
  * @param {Object} query The query to match records to update
  * @param {Object} update The update to apply
  * @return {Promise}
  */
  async updateByQuery (query, update) {
    let instance = await this.Model.findOne(query)

    if (instance === null) {
      throw new Errors.NotFound()
    }

    for (var k in update) {
      instance.set(k, update[k])
    }

    let validationError = instance.validateSync()
    if (validationError) {
      throw new Errors.BadRequest(validationError.message)
    }

    return instance.save()
  }

  /**
   *
   * @param {String | Number} id The id of the resource to update
   * @param {Object} update The update to apply
   */
  async updateById (id, update) {
    let instance = await this.Model.findOne({
      _id: id
    })

    if (instance === null) {
      throw new Errors.NotFound()
    }

    for (var k in update) {
      instance.set(k, update[k])
    }

    let validationError = instance.validateSync()
    if (validationError) {
      throw new Errors.BadRequest(validationError.message)
    }

    return instance.save()
  }

  /**
 * Removes resources by query
 * @param {Object} query Match resources to remove.
 */
  deleteByQuery (query) {
    return this.Model.deleteMany(query)
  }

  /**
 * Removes a resource by id
 * @param {String} id The resource's id.
 */
  deleteById (id) {
    return this.Model.deleteOne({ _id: id })
  }

  /**
   * Returns the number of records matching the query
   * @param {Object} query
   */
  count (query) {
    return this.Model.count(query)
  }

  /**
   * Registers a Hook function for the given event. Possible values for eventName are
   * - pre:create
   * - post:create
   * - pre:update
   * - post:update
   * - pre:delete
   * - post:delete
   * - pre:findOne
   * - post:findOne
   * @param {String} eventName
   * @param {Function} handler
   */
  registerHook (eventName, handler) {
    if (typeof handler !== 'function') {
      throw new TypeError('registerHook(eventName: String, handler: function)  handler must be a function.')
    }
    if (!this.__hooks[eventName]) {
      this.__hooks[eventName] = []
    }
    this.__hooks[eventName].push(handler)
  }

  getHooks (eventName) {
    return this.__hooks[eventName]
  }
}

module.exports = Controller
