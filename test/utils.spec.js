// TODO https://github.com/nodkz/mongodb-memory-server
import test from 'ava'
import * as utils from '../src/utils'

test('Should accept valid json', async t => {
  let j = '{"a":true}'
  t.is(true, utils.isJSON(j))
})

test('Should reject invalid json', async t => {
  let j = '{a:true}'
  t.is(false, utils.isJSON(j))
})
