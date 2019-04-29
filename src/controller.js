
const DEFAULT_LIMIT_VALUE = 100
const DEFAULT_SKIP_VALUE = 0
const { getSorting } = require('./utils')
const Errors = require('throwable-http-errors')

class Controller {
  /**
   *
   * @param {Object} config The configuration object
   * @param {String} config.name The resource name
   * @param {Number} config.defaultSkipValue The default skip value to be used in find() queries
   * @param {Number} config.defaultLimitValue The default skip value to be used in find() queries
   * @param {Object} config.model A mongoose model
   *
   */
  constructor (config) {
    this.Model = config.model
    this.name = config.name
    this.defaultSkipValue = config.defaultSkipValue || DEFAULT_SKIP_VALUE
    this.defaultLimitValue = config.defaultLimitValue || DEFAULT_LIMIT_VALUE
  }
  find (query) {
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

  async findOne (query) {
    const instance = await this.Model.findOne(query)
    if (instance === null) {
      throw new Errors.NotFound()
    } else {
      return instance
    }
  }
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
    return this.Model.remove(query)
  }

  /**
 * Removes a resource by id
 * @param {String} id The resource's id.
 */
  deleteById (id) {
    return this.Model.remove({ _id: id })
  }
}

module.exports = Controller
