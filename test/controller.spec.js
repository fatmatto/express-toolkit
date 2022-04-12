const { CatModel, makeModel, makeModelWithCustomId } = require('./helpers/mockmodel.helper')
const Controller = require('../src/controller')
const test = require('ava')
const mongooseSetup = require('./helpers/mongoose.helper')
const Errors = require('throwable-http-errors')
const { v4 } = require('uuid')
const ctrl = new Controller({
  name: 'cats',
  defaultLimitValue: 20,
  defaultSkipValue: 0,
  model: CatModel
})
// ObjectIDs do not accept any value, to avoid CastErrors
// we use this string
const NON_EXISTING_ID = 'nothingtosee'

const cats = [{ name: 'Snowball I' }, { name: 'Snowball II' }, { name: 'Snowball III' }, { name: 'Snowball V' }]

test.before('setup', async () => {
  await mongooseSetup()
  for (const cat of cats) {
    await ctrl.create(cat)
  }
})

test('Should use the custom id key', async t => {
  const c = new Controller({
    name: 'cats',
    id: 'name',
    defaultLimitValue: 20,
    defaultSkipValue: 0,
    model: CatModel
  })
  const cat = await c.findById('Snowball I')
  t.is(cat.name, 'Snowball I')
})

test('Reject invalid resource', async t => {
  const err = await t.throwsAsync(async () => {
    await ctrl.create({})
  })
  t.is(err.name, 'BadRequest')
})

test('Reject updateById on non existing resource', async t => {
  const err = await t.throwsAsync(async () => {
    await ctrl.updateById(NON_EXISTING_ID)
  })
  t.is(err.name, 'NotFound')
})
test('Reject updateByQuery on invalid data', async t => {
  const err = await t.throwsAsync(async () => {
    await ctrl.updateByQuery({ name: 'Snowball I' }, { age: ['a', 'b', null] })
  })
  t.is(err.name, 'BadRequest')
})
test('Reject updateById on invalid data', async t => {
  const cat = await ctrl.findOne({ name: 'Snowball I' })
  const err = await t.throwsAsync(async () => {
    await ctrl.updateById(cat._id, { age: ['a', 'b', null] })
  })
  t.is(err.name, 'BadRequest')
})
test('Reject findOne non existing resource', async t => {
  const err = await t.throwsAsync(async () => {
    await ctrl.findOne({ name: NON_EXISTING_ID })
  })
  t.is(err.name, 'NotFound')
})
test('Reject findById non existing resource', async t => {
  const err = await t.throwsAsync(async () => {
    await ctrl.findById('non-existing')
  })
  t.is(err.name, 'NotFound')
})

test('list resources', async t => {
  const cats = await ctrl.find({})
  t.is(cats.length, cats.length)
})

test('list resources with limit', async t => {
  const cats = await ctrl.find({ limit: 1 })
  t.is(cats.length, 1)
})

test('Default limit should be set to 100', async t => {
  const c = new Controller({
    name: 'fishes',
    model: makeModel('fishes')
  })
  const fishes = []
  for (let i = 0; i < 105; i++) {
    fishes.push({ name: `Fish ${i}` })
  }

  await c.bulkCreate(fishes)

  const fishedFishes = await c.find({})

  t.is(fishedFishes.length, 100)
})

test('Create a resource', async t => {
  const cat = await ctrl.create({ name: 'Snowball IV' })
  t.is(cat.name, 'Snowball IV')
})

test('Creates multiple resources', async t => {
  const cats = await ctrl.create([{ name: 'Snowball IX' }, { name: 'Snowball X' }])
  t.is(true, Array.isArray(cats))
})

test('Bulk Create should validate resources', async t => {
  const err = await t.throwsAsync(async () => {
    await ctrl.create([{ name: 'Snowball IX' }, {}])
  })
  t.is(err.name, 'BadRequest')
})

test('Bulk update should update all documents', async t => {
  const c = new Controller({
    name: 'koalas',
    defaultLimitValue: 20,
    defaultSkipValue: 0,
    model: makeModel('koalas')
  })
  const documents = await Promise.all([
    c.create({ name: 'Roger' }),
    c.create({ name: 'Kettle' }),
    c.create({ name: 'Spike' })
  ])

  t.is(documents.length, 3)

  await c.bulkUpdate(documents.map(k => {
    k.name = k.name + ' Junior'
    return k
  }))

  const updatedDocuments = await c.find({})
  t.is(true, updatedDocuments.every(doc => {
    return doc.name.indexOf('Junior') > -1
  }))
})

test('Find one resource', async t => {
  const cat = await ctrl.findOne({ name: 'Snowball I' })
  t.is(cat.name, 'Snowball I')
})

test('Update one resource with updateByQuery', async t => {
  let cat = await ctrl.findOne({ name: 'Snowball III' })
  const catId = cat._id
  await ctrl.updateByQuery({ name: 'Snowball III' }, { name: 'Snowball III+' })
  cat = await ctrl.findOne({ _id: catId })
  t.is(cat.name, 'Snowball III+')
})

test('Update by id', async t => {
  const cat = await ctrl.findOne({ name: 'Snowball V' })
  const updatedCat = await ctrl.updateById(cat._id, { name: 'Snowball V+' })
  t.is(updatedCat.name, 'Snowball V+')
})
test('Update by id with useUpdateOne flag set to true', async t => {
  const ctrl = new Controller({
    name: 'cats',
    defaultLimitValue: 20,
    defaultSkipValue: 0,
    model: CatModel,
    useUpdateOne: true
  })
  const catData = { name: v4() }
  const updatedName = v4()
  const cat = await ctrl.create(catData)
  const updatedCat = await ctrl.updateById(cat._id, { name: updatedName })
  t.is(updatedCat.name, updatedName)
})
test('Delete a resource by id', async t => {
  const cat = await ctrl.create({ name: 'Snowball Joe' })
  await ctrl.deleteById(cat._id)
  const err = await t.throwsAsync(async () => {
    await ctrl.findById(cat._id)
  })
  t.is(err.name, 'NotFound')
})

test('Delete a resource by query', async t => {
  await ctrl.deleteByQuery({ name: 'Snowball II' })
  const err = await t.throwsAsync(async () => {
    await ctrl.findOne({ name: 'Snowball II' })
  })
  t.is(err.name, 'NotFound')
})

test('Should handle the skip parameter', async t => {
  const c = new Controller({
    name: 'kangaroos',
    defaultLimitValue: 20,
    defaultSkipValue: 0,
    model: makeModel('kangaroos')
  })
  await Promise.all([
    c.create({ name: 'Roger' }),
    c.create({ name: 'Kettle' }),
    c.create({ name: 'Spike' })
  ])

  const allKangaroos = await c.find({ sortby: 'name' })
  const someKangaroos = await c.find({ skip: 1, sortby: 'name' })

  t.not(someKangaroos[0].name, allKangaroos[0].name)
})

test('Should handle the sortorder parameter', async t => {
  const c = new Controller({
    name: 'butterflies',
    defaultLimitValue: 20,
    defaultSkipValue: 0,
    model: makeModel('butterflies')
  })
  await Promise.all([
    c.create({ name: 'Fiona' }),
    c.create({ name: 'Andrew' }),
    c.create({ name: 'Zoe' })
  ])

  const ZAbutterflies = await c.find({ sortby: 'name', sortorder: 'DESC' })
  const AZbutterflies = await c.find({ sortby: 'name', sortorder: 'ASC' })

  t.is(ZAbutterflies[0].name, 'Zoe')
  t.is(AZbutterflies[0].name, 'Andrew')
})

test('Should handle the fields parameter', async t => {
  const c = new Controller({
    name: 'bees',
    defaultLimitValue: 20,
    defaultSkipValue: 0,
    model: makeModel('bees')
  })
  await c.create({ name: 'Fiona', age: 7 })

  const result = await c.findOne({ name: 'Fiona', fields: 'age' })

  t.is(!Object.prototype.hasOwnProperty.call(result, 'name'), true)
  t.is(result.age, 7)
})

test('Bulk update should reject updates without id', async t => {
  const c = new Controller({
    name: 'cats',
    defaultLimitValue: 20,
    defaultSkipValue: 0,
    model: CatModel
  })
  await t.throwsAsync(async () => {
    await c.bulkUpdate([{ Hello: 'World' }])
  })
})

test('Should reject a wrong sortorder parameter', async t => {
  const c = new Controller({
    name: 'donkeys',
    defaultLimitValue: 20,
    defaultSkipValue: 0,
    model: makeModel('donkeys')
  })
  const err = await t.throwsAsync(async () => {
    await c.find({ sortorder: 'FOOBAR' })
  })
  t.true(err instanceof Errors.BadRequest)
})

test('Should return the resource count', async t => {
  const c = new Controller({
    name: 'dogs',
    defaultLimitValue: 20,
    defaultSkipValue: 0,
    model: makeModel('dog')
  })
  await Promise.all([
    c.create({ name: 'Roger' }),
    c.create({ name: 'Kettle' }),
    c.create({ name: 'Spike' })
  ])

  const count = await c.count({})

  t.is(count, 3)
})

test('Should throw a type error when passing a non-function argument to registerHook', async t => {
  const err = await t.throws(() => {
    ctrl.registerHook('post:create', null)
  })
  t.true(err instanceof TypeError)
})

const HorseModel = makeModel('horse')
test('Should correctly apply the JSON Patch', async t => {
  const c = new Controller({
    name: 'horses',
    defaultLimitValue: 20,
    defaultSkipValue: 0,
    model: HorseModel
  })

  const instance = await c.create({ name: 'horse-1', owner: 'Matt' })
  const patch = [{ op: 'remove', path: '/owner' }, { op: 'replace', path: '/name', value: 'horse-2' }]
  const updatedInstance = await c.patchById(instance._id, patch)

  t.is(updatedInstance.name, 'horse-2')
  t.is(updatedInstance.owner, undefined)
  t.is(String(updatedInstance._id), String(instance._id))
})

test('Should correctly reject the invalid JSON Patch', async t => {
  const c = new Controller({
    name: 'horses',
    defaultLimitValue: 20,
    defaultSkipValue: 0,
    model: HorseModel
  })

  const instance = await c.create({ name: 'horse-1' })
  const patch = [{ op: 'replace', path: '/name', value: null }]
  const err = await t.throwsAsync(async () => {
    await c.patchById(instance._id, patch)
  })
  t.true(err instanceof Errors.BadRequest)
})

test('Should correctly reject patch operations on non existing resources', async t => {
  const c = new Controller({
    name: 'horses',
    defaultLimitValue: 20,
    defaultSkipValue: 0,
    model: HorseModel
  })

  const patch = [{ op: 'replace', path: '/name', value: null }]
  const err = await t.throwsAsync(async () => {
    await c.patchById(NON_EXISTING_ID, patch)
  })
  t.true(err instanceof Errors.NotFound)
})

test('Should correctly reject the invalid JSON Patch format', async t => {
  const c = new Controller({
    name: 'horses',
    defaultLimitValue: 20,
    defaultSkipValue: 0,
    model: HorseModel
  })

  const instance = await c.create({ name: 'horse-1' })
  const patch = [{ op: 'non-existing-op' }]
  const err = await t.throwsAsync(async () => {
    await c.patchById(instance._id, patch)
  })
  t.true(err instanceof Errors.BadRequest)
})

test('Should correctly replace instances of a resource', async t => {
  // We use custom ids here in order to test interactions between replacement and
  // custom uuids. A bug caused custom ids to not being handled correctly
  const ZebraModel = makeModelWithCustomId('Zebra')
  const c = new Controller({
    id: 'uuid',
    name: 'zebras',
    defaultLimitValue: 20,
    defaultSkipValue: 0,
    model: ZebraModel
  })

  const instance = await c.create({ name: 'Zeebry', age: 2, owner: 'Harry Potter', uuid: '1234' })
  const replacement = {
    name: 'Zobry',
    age: 4
  }

  const replaced = await c.replaceById(instance.uuid, replacement)

  t.is(String(replaced._id), String(instance._id))
  t.is(replaced.name, replacement.name)
  t.is(replaced.uuid, replacement.uuid)
  t.is(replaced.owner, undefined)
})

test('Should refuse to replace a non existing resource', async t => {
  const ZebraModel = makeModel('WeirdZebra')
  const c = new Controller({
    name: 'zebras',
    defaultLimitValue: 20,
    defaultSkipValue: 0,
    model: ZebraModel
  })
  const replacement = {
    name: 'Zobry',
    age: 4
  }

  const err = await t.throwsAsync(c.replaceById(NON_EXISTING_ID, replacement))
  t.is(err.name, 'NotFound')
})

test('Should refuse to replace a resource with invalid data', async t => {
  const ZebraModel = makeModel('RegularZebra')
  const c = new Controller({
    name: 'zebras',
    defaultLimitValue: 20,
    defaultSkipValue: 0,
    model: ZebraModel
  })

  const instance = await c.create({ name: 'Zeebry', age: 2, owner: 'Harry Potter' })
  const badReplacement = {
    age: 4
  }

  const err = await t.throwsAsync(c.replaceById(instance._id, badReplacement))

  t.is(err.name, 'BadRequest')
})
