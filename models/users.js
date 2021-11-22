//ItemMasters Schema
const mongoose = require('mongoose');
const resuable = require('./reusablefields');

const Userschema = new mongoose.Schema({
    name: { type: String, required: true, index: true },
    username: { type: String, index: true },
    password: String,
    isadmin: Boolean,
    islogined: Boolean,
    autotoken: String,
    authtoken: String,
    tokengenerateddate: { type: Date },
    age: String,
    email: String,
    mobile: String,
    address: String
});

Userschema.plugin(resuable);
module.exports = mongoose.model('User', Userschema);