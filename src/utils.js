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
const isJSON = (str) => {
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
  const sortBy = query.sortby || '_id'
  let sortOrder = query.sortorder || 'DESC'

  if (sortOrder === 'DESC') {
    sortOrder = -1
  } else if (sortOrder === 'ASC') {
    sortOrder = 1
  } else {
    throw new Errors.BadRequest(`sortorder parameter can be "ASC" or "DESC". Got "${sortOrder}."`)
  }

  const sorting = {}

  sorting[sortBy] = sortOrder

  return sorting
}

function getProjection (query) {
  if (!Object.prototype.hasOwnProperty.call(query, 'fields')) {
    return null
  }
  if (typeof query.fields !== 'string') {
    throw new Errors.BadRequest('fields parameter should be a string of comma separated field names. Got ' + typeof query.fields + '.')
  }
  const fields = {}
  const tokens = query.fields.split(',')
  tokens.forEach(token => {
    fields[token] = 1
  })
  return fields
}

module.exports = {
  getSorting,
  getProjection,
  asyncMiddleware,
  isJSON
}
