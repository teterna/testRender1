const { Schema, model } = require('mongoose');

const numberSchema = new Schema(
  {
    value: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = model('Number', numberSchema);
