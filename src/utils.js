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

function formatProjection (tokens) {
  const fields = {}
  tokens.forEach(token => {
    if (token[0] === '-') {
      fields[token.slice(1)] = 0
    } else {
      fields[token] = 1
    }
  })
  return fields
}

function getProjection (query) {
  if (!query.fields) {
    return { default: {} }
  }

  if (typeof query.fields === 'string') {
    return { default: formatProjection(query.fields.split(',')) }
  } else if (Array.isArray(query.fields)) {
    const output = {}
    query.fields.forEach(item => {
      if (typeof item === 'string') {
        output.default = formatProjection(item.split(','))
      } else if (typeof item === 'object') {
        for (const key in item) {
          if (typeof item[key] !== 'string') {
            throw new Errors.BadRequest(`Fields definitions must be string. At fields[${key}].`)
          }
          output[key] = formatProjection(item[key].split(','))
        }
      }
    })
    return output
  } else if (typeof query.fields === 'object') {
    const output = {}
    for (const key in query.fields) {
      if (typeof query.fields[key] !== 'string') {
        throw new Errors.BadRequest(`Fields definitions must be string. At fields[${key}].`)
      }
      output[key] = formatProjection(query.fields[key].split(','))
    }
    return output
  } else {
    throw new Errors.BadRequest('Bad projection field.')
  }
}

function getOptionForSubresource (options, subresource, optionName) {
  return options?.[optionName]?.[subresource]
}

function parseMultiResourceQueryParam (value, formatter = v => v) {
  if (Array.isArray(value)) {
    const output = {}
    value.forEach(item => {
      if (typeof item === 'string') {
        output.default = formatter(item)
      } else if (typeof item === 'object') {
        for (const key in item) {
          output[key] = formatter(item[key])
        }
      }
    })
    return output
  } else if (typeof value === 'object') {
    const output = {}
    for (const key in value) {
      output[key] = formatter(value[key])
    }
    return output
  } else {
    return { default: formatter(value) }
  }
}

function getPagination (query) {
  return { skip: query.skip, limit: query.limit }
}

function mergeOptions (inputObject) {
  const transformedObject = {}

  // Iterate over the keys of the input object
  for (const key in inputObject) {
    if (Object.prototype.hasOwnProperty.call(inputObject, key)) {
      const value = inputObject[key]

      // Iterate over the keys of each internal object
      for (const internalKey in value) {
        if (Object.prototype.hasOwnProperty.call(value, internalKey)) {
          // Create the internal object if it doesn't exist
          if (!transformedObject[internalKey]) {
            transformedObject[internalKey] = {}
          }

          // Assign the value from the input object to the transformed object
          transformedObject[internalKey][key] = value[internalKey]
        }
      }
    }
  }

  return transformedObject
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

module.exports = {
  mergeOptions,
  getOptionForSubresource,
  parseMultiResourceQueryParam,
  getPagination,
  getProjection,
  asyncMiddleware,
  isJSON,
  getSorting
}
