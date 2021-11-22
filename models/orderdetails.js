//ItemMasters Schema
const mongoose = require('mongoose');
const resuable = require('./reusablefields');
const { Schema } = mongoose;

const itemdetailsSchema = new mongoose.Schema({
    itemmasteruid: { type: Schema.ObjectId, ref: 'ItemMaster', required: true, index: true },
    batchid: { type: String, required: true },
    quantity: Number,
    unitprice: Number,
    price: Number,
});

const OrderDetailschema = new mongoose.Schema({
    ordercode: { type: String, required: true, index: true },
    itemdetails: [itemdetailsSchema],
    totalprice: Number,
    iscancelled: Boolean,
    isapproved: Boolean,
});

OrderDetailschema.plugin(resuable);
module.exports = mongoose.model('OrderDetail', OrderDetailschema);