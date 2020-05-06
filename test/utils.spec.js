// TODO https://github.com/nodkz/mongodb-memory-server
const test = require('ava')
const utils = require('../src/utils')

test('Should accept valid json', async t => {
  const j = '{"a":true}'
  t.is(true, utils.isJSON(j))
})

test('Should reject invalid json', async t => {
  const j = '{a:true}'
  t.is(false, utils.isJSON(j))
})

test('Should correctly produce a projection object', t => {
  const query = {
    fields: 'age,name'
  }
  const projection = utils.getProjection(query)
  t.deepEqual(projection, { age: 1, name: 1 })
})

test('Should throw error when fields parameter is not a string', t => {
  const query = {
    fields: { hello: 1 }
  }
  const err = t.throws(() => {
    utils.getProjection(query)
  })
  t.is(err.name, 'BadRequest')
})
