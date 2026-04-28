const { Schema, model } = require('mongoose');

/**
 * Represents a single chat message persisted in MongoDB.
 *
 * Fields:
 *   sender   — display name of the user who sent the message
 *   content  — the text body of the message
 *   createdAt — auto-generated timestamp (via { timestamps: true })
 *
 * The `timestamps` option automatically adds `createdAt` and `updatedAt`
 * fields managed by Mongoose on every save.
 */
const messageSchema = new Schema(
  {
    sender: {
      type: String,
      required: true,
      trim: true,      // strip leading/trailing whitespace before saving
      maxlength: 50,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
  },
  { timestamps: true }
);

module.exports = model('Message', messageSchema);
