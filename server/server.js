const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');

const { MONGO_URI, PORT = 5000 } = process.env;

mongoose.connect(MONGO_URI)
  .then(() => app.listen(PORT, () => console.log(`api on :${PORT}`)))
  .catch(err => { console.error('mongo connection failed:', err.message); process.exit(1); });
