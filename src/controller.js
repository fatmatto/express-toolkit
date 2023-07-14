
/**
 * @module express-toolkit/Controller
 */
const DEFAULT_LIMIT_VALUE = 100
const DEFAULT_SKIP_VALUE = 0
const Errors = require('throwable-http-errors')
const JSONPatch = require('json8-patch')
const mongoose = require('mongoose')
const { getProjection, parseMultiResourceQueryParam, getOptionForSubresource, mergeOptions, getSorting } = require('./utils')

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
   * @param {Object} config.relationships A mongoose model
   * @param {String} [config.id] The attribute to use as primary key for findById, updateById and deleteById. Defaults to _id.
   * @param {Number} [config.defaultSkipValue] The default skip value to be used in find() queries
   * @param {Number} [config.defaultLimitValue] The default skip value to be used in find() queries
   * @param {Number} [config.useUpdateOne] If set to true, updateById method will use mongoose's Model.updateOne() instead of Document.save()
   */
  constructor (config) {
    this.Model = config.model
    this.id = config.id || '_id'
    this.name = config.name
    this.useUpdateOne = Boolean(config.useUpdateOne) || false
    this.defaultSkipValue = config.defaultSkipValue || DEFAULT_SKIP_VALUE
    this.defaultLimitValue = config.defaultLimitValue || DEFAULT_LIMIT_VALUE
    this.relationships = config.relationships || []
    this.__hooks = {}
  }

  /**
   *
   * @param {Array<Object>} resources The fetched resources
   * @param {Object} options
   * @returns
   */
  async fetchSubresourcesForList (resources, options = { }) {
    for (const subresource of options.includes) {
      const relationship = this.relationships.find(r => r.resource === subresource)
      const { localField, foreignField } = relationship
      const subresourceIds = resources.map(resource => resource[localField])
      const model = mongoose.models[subresource]

      const projection = getOptionForSubresource(options, subresource, 'projection') || {}
      // If there's projection, we have to add the foreignField
      if (Object.keys(projection).length > 0) { projection[foreignField] = 1 }
      const sort = getOptionForSubresource(options, subresource, 'sort') || {}
      const skip = getOptionForSubresource(options, subresource, 'skip') || this.defaultSkipValue
      const limit = getOptionForSubresource(options, subresource, 'limit') || this.defaultLimitValue
      const query = { [foreignField]: { $in: subresourceIds } }
      const items = await model.find(query, projection)
        .skip(skip)
        .limit(limit)
        .sort(sort)
        .lean()
      resources.forEach(resource => {
        resource.included = resource.included || {}
        resource.included[subresource] = items.filter(item => item[foreignField] === resource[localField])
      })
    }

    return resources
  }

  /**
   *
   * @param {Array<Object>} resource The fetched resource
   * @param {Object} options
   * @returns
   */
  async fetchSubresourcesForSingleResource (resource, options = {}) {
    for (const subresource of options.includes) {
      const relationship = this.relationships.find(r => r.resource === subresource)
      const { localField, foreignField } = relationship
      const subresourceId = resource[localField]
      const model = mongoose.models[subresource]
      const projection = getOptionForSubresource(options, subresource, 'projection') || {}
      if (Object.keys(projection).length > 0) { projection[foreignField] = 1 }
      const sort = getOptionForSubresource(options, subresource, 'sort') || {}
      const skip = getOptionForSubresource(options, subresource, 'skip') || this.defaultSkipValue
      const limit = getOptionForSubresource(options, subresource, 'limit') || this.defaultLimitValue
      // Run the query
      const items = await model.find({ [foreignField]: subresourceId }, projection)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()
      // const items = await model.find({ [foreignField]: subresourceId }, fields)
      resource.included = resource.included || {}
      resource.included[subresource] = items
    }

    return resource
  }

  parseOptions (query) {
    const parsedOptions = {
      limit: { default: this.defaultLimitValue },
      skip: { default: this.defaultSkipValue },
      projection: { default: {} },
      sort: { default: { _id: -1 } }
    }
    if (query.includes) {
      parsedOptions.includes = query.includes.split(',')
      const unknownIncludes = parsedOptions.includes.filter(wantedSubResource => !this.relationships.find(r => r.resource === wantedSubResource))
      if (unknownIncludes.length > 0) {
        throw new Errors.BadRequest(`Unkown included resource: ${unknownIncludes.join(',')}`)
      }
      delete query.includes
    }
    if (query.fields) {
      parsedOptions.projection = getProjection(query)
      delete query.fields
    }
    let sortby; let sortorder = null
    if (query.sortby) {
      sortby = parseMultiResourceQueryParam(query.sortby)
      delete query.sortby
    }

    if (query.sortorder) {
      sortorder = parseMultiResourceQueryParam(query.sortorder)
      delete query.sortorder
    }

    parsedOptions.sort = mergeOptions({ sortby, sortorder })
    for (const k in parsedOptions.sort) {
      parsedOptions.sort[k] = getSorting(parsedOptions.sort[k])
    }

    if (query.skip) {
      parsedOptions.skip = parseMultiResourceQueryParam(query.skip, Number)
      delete query.skip
    }

    if (query.limit) {
      parsedOptions.limit = parseMultiResourceQueryParam(query.limit, Number)
      delete query.limit
    }

    return { query, options: parsedOptions }
  }

  /**
   * Looks for records
   * @param {Object} query The query object
   * @param {Object} options The query options
   * @param {Object} options.limit How many records should be returned
   * @param {Object} options.skip How many records should be skipped
   * @param {Object} options.fields A comma separated list of fields to include in the resource
   * @param {Object} options.sortby The field to use for sorting
   * @param {Object} options.sortorder The sort order, ASC or DESC
   * @param {Object} options.include Which subresources to include
   */
  async find (_query) {
    const { query, options } = this.parseOptions(_query)
    let docs = await this.Model
      .find(query, options?.projection?.default || {})
      .sort(options.sort.default || { _id: -1 })
      .skip(options.skip.default || this.defaultSkipValue)
      .limit(options.limit.default || this.defaultLimitValue)
      // We cannot call lean here, otherwise virtuals are not honored
      // we should investigate the dedicated mongoose plugin (it's official)
    docs = docs.map(doc => doc.toJSON())
    if (options.includes) {
      docs = await this.fetchSubresourcesForList(docs, options)
    }

    return docs
  }

  /**
   * Looks for a single record matching the query
   * @param {Object} query The object used to query the database
   */
  async findOne (_query) {
    const { query, options } = this.parseOptions(_query)
    let instance = await this.Model.findOne(query, options?.projection?.default || {})
    if (instance === null) {
      throw new Errors.NotFound()
    } else {
      instance = instance.toJSON()
      if (options.includes) {
        instance = await this.fetchSubresourcesForSingleResource(instance, options)
      }
      return instance
    }
  }

  /**
* Looks for a single record with the given id
* @param {String | Number} id The object used to query the database
* @param {Object} query An object of additioanl query values, to further limit the query. Useful when, for example, you want to restrict the query to a group of resources.
*/
  async findById (id, _query = {}) {
    const { options } = this.parseOptions(_query)
    let instance = await this.Model.findOne({ [this.id]: id }, options?.projection?.default || {})
    if (instance === null) {
      throw new Errors.NotFound()
    } else {
      instance = instance.toJSON()
      if (options.includes) {
        instance = await this.fetchSubresourcesForSingleResource(instance, options)
      }
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
    const instances = await this.Model.find(query)

    for (const instance of instances) {
      for (const k in update) {
        instance.set(k, update[k])
      }

      const validationError = instance.validateSync()
      if (validationError) {
        throw new Errors.BadRequest(validationError.message)
      }
    }

    return this.Model.updateMany(query, { $set: update })
  }

  /**
   *
   * @param {String | Number} id The id of the resource to update
   * @param {Object} update The update to apply
   * @param {Object} query An object of additioanl query values, to further limit the query. Useful when, for example, you want to restrict the query to a group of resources.
   */
  async updateById (id, update, query = {}) {
    query[this.id] = id
    const instance = await this.Model.findOne(query)

    if (instance === null) {
      throw new Errors.NotFound()
    }

    for (const k in update) {
      instance.set(k, update[k])
    }

    const validationError = instance.validateSync()
    if (validationError) {
      throw new Errors.BadRequest(validationError.message)
    }

    if (this.useUpdateOne) {
      await this.Model.updateOne({ [this.id]: id }, update)

      return instance.toJSON()
    } else {
      const doc = await instance.save()
      return doc.toJSON()
    }
  }

  /**
 *
 * @param {String | Number} id The id of the resource to update
 * @param {Object} replacement The replacement object
 * @param {Object} query An object of additioanl query values, to further limit the query. Useful when, for example, you want to restrict the query to a group of resources.
 */
  async replaceById (id, replacement, query = {}) {
    query[this.id] = id
    const instance = await this.Model.findOne(query)

    if (instance === null) {
      throw new Errors.NotFound()
    }
    // Primary identifiers cannot be replaced
    replacement._id = instance._id
    replacement[this.id] = instance[this.id]
    instance.overwrite(replacement)

    const validationError = instance.validateSync()
    if (validationError) {
      throw new Errors.BadRequest(validationError.message)
    }

    const doc = await instance.save()
    return doc.toJSON()
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
 * @param {Object} query An object of additioanl query values, to further limit the query. Useful when, for example, you want to restrict the query to a group of resources.
 */
  deleteById (id, query = {}) {
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
 * @param {Object} query An object of additioanl query values, to further limit the query. Useful when, for example, you want to restrict the query to a group of resources.
 */
  async patchById (id, operations, query = {}) {
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

    return updatedInstance.toJSON()
  }

  /**
   * Registers a Hook function for the given event. Possible values for eventName are listed
   * here: https://github.com/fatmatto/express-toolkit
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
