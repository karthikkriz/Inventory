//ItemMasters Schema
const mongoose = require('mongoose');
const resuable = require('./reusablefields');

const ItemMasterschema = new mongoose.Schema({
    itemcode: { type: String, required: true, index: true },
    itemname: { type: String, required: true },
    itemdescription: String,
    unitprice: { type: Number, required: true },
    totalquantity: { type: Number, required: true },
    batchid: { type: String, required: true },
});

ItemMasterschema.plugin(resuable);
module.exports = mongoose.model('ItemMaster', ItemMasterschema);