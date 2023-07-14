const test = require('ava')
const utils = require('../src/utils')
const querystring = require('node:querystring')

test('Should accept valid json', async t => {
  const j = '{"a":true}'
  t.is(true, utils.isJSON(j))
})

test('Should reject invalid json', async t => {
  const j = '{a:true}'
  t.is(false, utils.isJSON(j))
})

test('Should correctly produce a projection object', t => {
  const query = querystring.parse('fields=age,-name')
  const projection = utils.getProjection(query)
  t.deepEqual(projection, { default: { age: 1, name: 0 } })
})

test('Should correctly produce a projection object for multiple resources and the base one', t => {
  const query = { fields: ['age,-name', { subresource: 'uuid' }] }
  const projection = utils.getProjection(query)
  t.deepEqual(projection, { default: { age: 1, name: 0 }, subresource: { uuid: 1 } })

  const err = t.throws(() => {
    utils.getProjection({ fields: ['age,-name', { subresource: 100 }] })
  })
  t.is(err.name, 'BadRequest')
})

test('Should correctly produce a projection object for multiple resources without the base one', t => {
  const query = { fields: { subresource: 'uuid' } }
  const projection = utils.getProjection(query)
  t.deepEqual(projection, { subresource: { uuid: 1 } })

  const err = t.throws(() => {
    utils.getProjection({ fields: { subresource: 100 } })
  })
  t.is(err.name, 'BadRequest')
})

test('Should correctly produce a default proejction', t => {
  const query = { }
  const projection = utils.getProjection(query)
  t.deepEqual(projection, { default: {} })
})

test('Should throw error when fields parameter is not a string', t => {
  const query = {
    fields: 2
  }
  const err = t.throws(() => {
    utils.getProjection(query)
  })
  t.is(err.name, 'BadRequest')
})
