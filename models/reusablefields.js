// Resuable Fields
const mongoose = require('mongoose');
const { Schema } = mongoose;

module.exports = exports = function auditresuableinfo(schema, options) {
    schema.add({
        createdby: { type: Schema.ObjectId, ref: 'User', required: true, index: true, },
        createdat: { type: Date, required: true, index: true },
        modifiedby: { type: Schema.ObjectId, ref: 'User', required: true, index: true, },
        modifiedat: { type: Date, required: true, index: true },
        statusflag: { type: String, required: true, index: true }
    });
};
