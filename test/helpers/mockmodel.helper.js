const mongoose = require('mongoose')

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

const FeaturesSchema = new mongoose.Schema({
  color: {
    type: String
  },
  length: {
    type: String
  }
})

const makeModel = (name) => {
  const schema = new mongoose.Schema({
    name: {
      type: String,
      required: true
    },
    age: {
      type: Number,
      default: 1
    },
    features: {
      type: FeaturesSchema,
      required:true,
      default: () => {
        return {color:'purple',length:'1mt'}
      }
    }
  }, { strict: true })

  const model = mongoose.model(name, schema, name)

  return model
}

module.exports = { CatModel, CatSchema, makeModel }
