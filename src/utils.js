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

const getFieldsFromString = (str) => {
  const fields = {}
  const tokens = str.split(',')
  tokens.forEach(token => {
    fields[token] = 1
  })
  return fields
}

function getProjection (query) {
  const attributes = Object.keys(query).filter(paramName => {
    return paramName === 'fields' || paramName.split(':')[0] === 'fields'
  })

  const output = {}
  attributes.forEach(attributeName => {
    if (typeof query[attributeName] !== 'string') {
      throw new Errors.BadRequest(`Projection parameter ${attributeName} must be string`)
    }
    if (attributeName === 'fields') {
      output.baseResource = getFieldsFromString(query[attributeName])
    } else {
      output[attributeName.split(':')[1]] = getFieldsFromString(query[attributeName])
    }
  })
  return output
}

module.exports = {
  getSorting,
  getProjection,
  asyncMiddleware,
  isJSON
}
