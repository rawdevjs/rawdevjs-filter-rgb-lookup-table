'use strict'

const assign = require('lodash/assign')
const clamp = require('lodash/clamp')

class RgbLookupTable {
  constructor (options) {
    this.label = 'lookup table'
    this.inPlace = true
    this.dirty = true

    assign(this, options)
  }

  buildTable () {
    let callback = this.valuesCallback
    let size = this.lutSize
    let size2 = size * size
    let scale = 1.0 / (size - 1.0)

    this.lut = new Float32Array(size * size2 * 3)

    for (let z = 0; z < size; z++) {
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          let values = callback(x * scale, y * scale, z * scale)
          let offset = (x + y * size + z * size2) * 3

          this.lut[offset] = clamp(values.x, 0.0, 1.0)
          this.lut[offset + 1] = clamp(values.y, 0.0, 1.0)
          this.lut[offset + 2] = clamp(values.z, 0.0, 1.0)
        }
      }
    }

    this.dirty = true
  }

  process (image) {
    if (this.valuesCallback) {
      this.buildTable()
    }

    if (this.lut) {
      this.processTile(image.buffer, image.components.length, image.componentMaxValue, this.lut, this.lutSize)
    }

    return Promise.resolve(image)
  }

  processTile (buffer, components, componentMaxValue, lut, lutSize) {
    let lutSize2 = lutSize * lutSize
    let componentMaxValueInv = (1.0 / componentMaxValue) * (lutSize - 1)

    for (let i = 0; i < buffer.length; i += components) {
      let lutParameter0 = RgbLookupTable.calculateLutParameter(buffer[i] * componentMaxValueInv)
      let lutParameter1 = RgbLookupTable.calculateLutParameter(buffer[i + 1] * componentMaxValueInv)
      let lutParameter2 = RgbLookupTable.calculateLutParameter(buffer[i + 2] * componentMaxValueInv)

      let lutOffset000 = (lutParameter0.offset0 + lutParameter1.offset0 * lutSize + lutParameter2.offset0 * lutSize2) * 3
      let lutOffset100 = (lutParameter0.offset1 + lutParameter1.offset0 * lutSize + lutParameter2.offset0 * lutSize2) * 3
      let lutOffset010 = (lutParameter0.offset0 + lutParameter1.offset1 * lutSize + lutParameter2.offset0 * lutSize2) * 3
      let lutOffset110 = (lutParameter0.offset1 + lutParameter1.offset1 * lutSize + lutParameter2.offset0 * lutSize2) * 3
      let lutOffset001 = (lutParameter0.offset0 + lutParameter1.offset0 * lutSize + lutParameter2.offset1 * lutSize2) * 3
      let lutOffset101 = (lutParameter0.offset1 + lutParameter1.offset0 * lutSize + lutParameter2.offset1 * lutSize2) * 3
      let lutOffset011 = (lutParameter0.offset0 + lutParameter1.offset1 * lutSize + lutParameter2.offset1 * lutSize2) * 3
      let lutOffset111 = (lutParameter0.offset1 + lutParameter1.offset1 * lutSize + lutParameter2.offset1 * lutSize2) * 3

      let lutWeight000 = lutParameter0.weight0 * lutParameter1.weight0 * lutParameter2.weight0
      let lutWeight100 = lutParameter0.weight1 * lutParameter1.weight0 * lutParameter2.weight0
      let lutWeight010 = lutParameter0.weight0 * lutParameter1.weight1 * lutParameter2.weight0
      let lutWeight110 = lutParameter0.weight1 * lutParameter1.weight1 * lutParameter2.weight0
      let lutWeight001 = lutParameter0.weight0 * lutParameter1.weight0 * lutParameter2.weight1
      let lutWeight101 = lutParameter0.weight1 * lutParameter1.weight0 * lutParameter2.weight1
      let lutWeight011 = lutParameter0.weight0 * lutParameter1.weight1 * lutParameter2.weight1
      let lutWeight111 = lutParameter0.weight1 * lutParameter1.weight1 * lutParameter2.weight1

      buffer[i] = (
        lut[lutOffset000] * lutWeight000 +
        lut[lutOffset100] * lutWeight100 +
        lut[lutOffset010] * lutWeight010 +
        lut[lutOffset110] * lutWeight110 +
        lut[lutOffset001] * lutWeight001 +
        lut[lutOffset101] * lutWeight101 +
        lut[lutOffset011] * lutWeight011 +
        lut[lutOffset111] * lutWeight111) * componentMaxValue

      buffer[i + 1] = (
        lut[lutOffset000 + 1] * lutWeight000 +
        lut[lutOffset100 + 1] * lutWeight100 +
        lut[lutOffset010 + 1] * lutWeight010 +
        lut[lutOffset110 + 1] * lutWeight110 +
        lut[lutOffset001 + 1] * lutWeight001 +
        lut[lutOffset101 + 1] * lutWeight101 +
        lut[lutOffset011 + 1] * lutWeight011 +
        lut[lutOffset111 + 1] * lutWeight111) * componentMaxValue

      buffer[i + 2] = (
        lut[lutOffset000 + 2] * lutWeight000 +
        lut[lutOffset100 + 2] * lutWeight100 +
        lut[lutOffset010 + 2] * lutWeight010 +
        lut[lutOffset110 + 2] * lutWeight110 +
        lut[lutOffset001 + 2] * lutWeight001 +
        lut[lutOffset101 + 2] * lutWeight101 +
        lut[lutOffset011 + 2] * lutWeight011 +
        lut[lutOffset111 + 2] * lutWeight111) * componentMaxValue
    }
  }

  static calculateLutParameter (offset) {
    let parameter = {}

    parameter.offset0 = Math.floor(offset)
    parameter.offset1 = Math.ceil(offset)
    parameter.weight0 = parameter.offset1 - offset
    parameter.weight1 = 1.0 - parameter.weight0

    return parameter
  }
}

module.exports = RgbLookupTable
