import mongoose from 'mongoose'

const CatSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  age: {
    type: Number,
    default: 1
  }
}, { strict: true })

const CatModel = mongoose.model('cat', CatSchema, 'cats')

const makeModel = (name) => {
  const schema = new mongoose.Schema({
    name: {
      type: String,
      required: true
    },
    age: {
      type: Number,
      default: 1
    }
  }, { strict: true })

  const model = mongoose.model(name, schema, name)

  return model
}

module.exports = { CatModel, CatSchema, makeModel }
