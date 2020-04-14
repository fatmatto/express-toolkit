
/**
 * @module express-toolkit/Controller
 */
const DEFAULT_LIMIT_VALUE = 100
const DEFAULT_SKIP_VALUE = 0
const { getSorting, getProjection } = require('./utils')
const Errors = require('throwable-http-errors')
const JSONPatch = require('json8-patch')
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
   * @param {String} [config.id] The attribute to use as primary key for findById, updateById and deleteById. Defaults to _id.
   * @param {Number} [config.defaultSkipValue] The default skip value to be used in find() queries
   * @param {Number} [config.defaultLimitValue] The default skip value to be used in find() queries
   */
  constructor (config) {
    this.Model = config.model
    this.id = config.id || '_id'
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

    const projection = getProjection(query)

    const sort = getSorting(query)

    // Deleting modifiers from the query
    delete query.skip
    delete query.limit
    delete query.sortby
    delete query.sortorder
    delete query.fields

    return this.Model
      .find(query, projection)
      .sort(sort)
      .skip(skip)
      .limit(limit)
  }

  /**
   * Looks for a single record matching the query
   * @param {Object} query The object used to query the database
   */
  async findOne (query) {
    const projection = getProjection(query)
    delete query.fields
    const instance = await this.Model.findOne(query, projection)
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
    const query = {}
    query[this.id] = id
    const projection = getProjection(query)
    delete query.fields
    const instance = await this.Model.findOne(query, projection)

    if (instance === null) {
      throw new Errors.NotFound()
    } else {
      return instance
    }
  }

  /**
   * Validates and creates a single resource instance. Used by create.
   * @param {Object} data Resource data
   */
  async createSingleInstance (data) {
    const instance = new this.Model(data)

    // In testing we don't have the

    const validationError = instance.validateSync()
    if (validationError) {
      throw new Errors.BadRequest(validationError.message)
    }

    const savedInstance = await instance.save()

    return savedInstance.toJSON()
  }

  /**
   *  Validates and creates one or more resources
   * @param {Array | Object} data Resource(s) data
   */
  create (data) {
    if (Array.isArray(data)) {
      return this.bulkCreate(data)
    } else {
      return this.createSingleInstance(data)
    }
  }

  /**
   * Validates and creates multiple resource instances. Used by create.
   * @param {Array} data An array of documents to insert
   */
  async bulkCreate (data) {
    const instances = []
    const savedInstances = []
    for (const document of data) {
      const instance = new this.Model(document)
      const validationError = instance.validateSync()
      if (validationError) {
        throw new Errors.BadRequest(validationError.message)
      }
      instances.push(instance)
    }

    for (const instance of instances) {
      const savedInstance = await instance.save()
      savedInstances.push(savedInstance.toJSON())
    }

    return savedInstances
  }

  /**
  * updates multiple documents at once
  * @param {Array} data An array of documents to update
  */
  async bulkUpdate (documents) {
    if (documents.some(document => {
      return !Object.hasOwnProperty.apply(document, [this.id])
    })) {
      throw new Errors.BadRequest(`All documents must provide the ${this.id} key in order to perform a bulk update.`)
    }
    const promises = documents.map(document => {
      const query = {}
      query[this.id] = document[this.id]
      return this.Model.updateOne(query, document)
    })

    const result = await Promise.all(promises)
    return result
  }

  /**
  * Updates records matched query with the update object
  * @param {Object} query The query to match records to update
  * @param {Object} update The update to apply
  * @return {Promise}
  */
  async updateByQuery (query, update) {
    const instance = await this.Model.findOne(query)

    if (instance === null) {
      throw new Errors.NotFound()
    }

    for (var k in update) {
      instance.set(k, update[k])
    }

    const validationError = instance.validateSync()
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
    const query = {}
    query[this.id] = id
    const instance = await this.Model.findOne(query)

    if (instance === null) {
      throw new Errors.NotFound()
    }

    for (var k in update) {
      instance.set(k, update[k])
    }

    const validationError = instance.validateSync()
    if (validationError) {
      throw new Errors.BadRequest(validationError.message)
    }

    return instance.save()
  }

  /**
 *
 * @param {String | Number} id The id of the resource to update
 * @param {Object} replacement The replacement object
 */
  async replaceById (id, replacement) {
    const query = {}
    query[this.id] = id
    const instance = await this.Model.findOne(query)

    if (instance === null) {
      throw new Errors.NotFound()
    }
    // Primary identifiers cannot be replaced
    delete replacement['_id']
    delete replacement[this.id]
    instance.overwrite(replacement)

    const validationError = instance.validateSync()
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
    const query = {}
    query[this.id] = id
    return this.Model.deleteOne(query)
  }

  /**
   * Returns the number of records matching the query
   * @param {Object} query An object to use as filter
   */
  count (query) {
    return this.Model.countDocuments(query)
  }

  /**
 *
 * @param {String | Number} id The id of the resource to update
 * @param {Array} operations Array of JSON patch operations to apply to the document
 */
  async patchById (id, operations) {
    const query = {}
    query[this.id] = id

    const instance = await this.Model.findOne(query)

    if (instance === null) {
      throw new Errors.NotFound()
    }
    let document = instance.toObject()

    if (!JSONPatch.valid(operations)) {
      throw new Errors.BadRequest('Invalid JSON Patch format')
    }
    document = JSONPatch.apply(document, operations).doc

    const updatedInstance = new this.Model(document)
    const validationError = updatedInstance.validateSync()
    if (validationError) {
      throw new Errors.BadRequest(validationError.message)
    }

    await this.Model.updateOne(query, updatedInstance.toObject())

    return updatedInstance
  }

  /**
   * Registers a Hook function for the given event. Possible values for eventName are
   * - pre:finalize
   * - pre:count
   * - post:count
   * - pre:find
   * - post:find
   * - pre:findById
   * - post:findById
   * - pre:create
   * - post:create
   * - pre:updateById
   * - post:updateById
   * - pre:updateByQuery
   * - post:updateByQuery
   * - pre:deleteById
   * - post:deleteById
   * - pre:deleteByQuery
   * - post:deleteByQuery
   * @param {String} eventName The event that will trigger the hook
   * @param {Function} handler The express middleware to use as hook
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

  /**
   * Returns a list of middleware hooks registered under the given event
   * @param {String} eventName The hook event name, like pre:find or post:create
   */
  getHooks (eventName) {
    return this.__hooks[eventName]
  }
}

module.exports = Controller
