require('dotenv').config();
const mongoose = require('mongoose');
const app = require('../app');

// Lambdas are reused; connect once per container.
let conn;
module.exports = (req, res) => {
  conn ??= mongoose.connect(process.env.MONGO_URI);
  return conn.then(() => app(req, res))
    .catch(err => res.status(500).json({ error: 'db unavailable: ' + err.message }));
};
