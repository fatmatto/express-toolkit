'use strict'

const Errors = require('throwable-http-errors')
/**
 *
 * @param {Function} fn The function to wrap
 */
const asyncMiddleware = fn =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next))
      .catch(next)
  }

/**
 *
 * @param {String} str The string to test
 * @return true if the string is valid json
 */
let isJSON = (str) => {
  try {
    return (JSON.parse(str) && !!str)
  } catch (e) {
    return false
  }
}

/**
 * Returns the sort object to pass to MongoDB
 * @param {Object} query The parsed query string object
 * @return {Object} The sorting config
 */
function getSorting (query) {
  let sortBy = query.sortby || '_id'
  let sortOrder = query.sortorder || 'DESC'

  if (sortOrder === 'DESC') {
    sortOrder = -1
  } else if (sortOrder === 'ASC') {
    sortOrder = 1
  } else {
    throw new Errors.BadRequest(`sortorder parameter can be "ASC" or "DESC". Got "${sortOrder}."`)
  }

  let sorting = {}

  sorting[sortBy] = sortOrder

  return sorting
}

module.exports = {
  getSorting,
  asyncMiddleware,
  isJSON
}
