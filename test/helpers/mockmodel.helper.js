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

module.exports = { CatModel, CatSchema }
