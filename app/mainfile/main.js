const async = require("async");
const csvtojson = require("csvtojson");
const exceltojson = require('convert-excel-to-json');
const itemmaster = require('../../models/itemmasters');
const mongoose = require('mongoose');
const User = require('../../models/users');
const orderdetails = require('../../models/orderdetails');
const moment = require('moment');

exports.itemscreteorupdate = (async (req, res) => {
    if (!!req.body.authtoken && req.body.authtoken) {
        let usrdata = await User.findOne({ statusflag: "A", authtoken: req.body.authtoken });
        if (!!usrdata && usrdata) {
            if (!!req.body && !!req.body.filename && req.body.filename) {
                let extensiondata = req.body.filename.split('.');
                let jsondata = "";

                if (!!extensiondata[1] && extensiondata[1] && extensiondata[1] == "csv") {
                    jsondata = await csvtojson().fromFile(req.body.filename);

                    User.findOneAndUpdate({ statusflag: "A", _id: mongoose.Types.ObjectId(usrdata._id) }, { $set: { "authtoken": null } }, function (erdum, dum) {
                        inserupdate(req, jsondata, function (result) {
                            res.status(result.request).json({ "Result": result.message });
                        });
                    });
                }
                else if (!!extensiondata[1] && extensiondata[1] && extensiondata[1] == "xlsx") {
                    jsondata = await exceltojson({
                        sourceFile: req.body.filename,
                        header: { rows: 1 },
                        columnToKey: { '*': '{{columnHeader}}' },
                    });
                    let value = jsondata.Sheet1;

                    User.findOneAndUpdate({ statusflag: "A", _id: mongoose.Types.ObjectId(usrdata._id) }, { $set: { "authtoken": null } }, function (erdum, dum) {
                        inserupdate(req, value, function (result) {
                            res.status(result.request).json({ "Result": result.message });
                        });
                    });
                }
                else {
                    res.status(400).json({ "Result": "Invalid Extension Found" });
                    return;
                }
            }
            else {
                res.status(400).json({ "Result": "No File Name Found" });
                return;
            }
        }
        else {
            res.status(400).json({ "Result": "Auth Token Not Available" });
            return;
        }
    }
    else {
        res.status(400).json({ "Result": "Auth Token Not Available" });
        return;
    }
});

inserupdate = (async (req, result, subcallback) => {
    if (!!req.body.username && req.body.username) {
        let userdata = await User.findOne({ statusflag: "A", isadmin: true, authtoken: req.body.authtoken, username: { '$regex': new RegExp('^' + req.body.username + '$', 'i') } });

        if (!userdata) {
            setTimeout((function () { subcallback({ request: 400, message: "Invalid Username or Is Not Admin" }) }));
            return;
        }

        let isanyfailed = false;
        if (result.length > 0) {
            async.eachSeries(result, function (item, callback) {
                let itemschdata = {};

                if (!!item.itemcode && item.itemcode && !!item.itemname && item.itemname && !!item.unitprice && item.unitprice && !!item.quantity && item.quantity && !!item.batchid && item.batchid) {
                    itemmaster.findOne({ itemcode: item.itemcode, statusflag: "A" }).exec(function (err, itemvalue) {
                        if (!!itemvalue) {
                            itemschdata = itemvalue;
                            itemschdata.totalquantity = itemschdata.totalquantity + item.quantity || 0;
                        }
                        else {
                            itemschdata = new itemmaster();
                            itemschdata.createdby = userdata._id;
                            itemschdata.createdat = Date.now();
                            itemschdata.totalquantity = !!item.quantity && item.quantity || 0;
                        }

                        itemschdata.itemcode = !!item.itemcode && item.itemcode || "";
                        itemschdata.itemname = !!item.itemname && item.itemname || "";
                        itemschdata.itemdescription = !!item.itemdescription && item.itemdescription || 0;
                        itemschdata.unitprice = !!item.unitprice && item.unitprice || 0;
                        itemschdata.batchid = !!item.batchid && item.batchid || "";
                        itemschdata.statusflag = "A";
                        itemschdata.modifiedby = userdata._id;
                        itemschdata.modifiedat = Date.now();

                        itemschdata.save(function (err) {
                            if (!!err) {
                                isanyfailed = true;
                                item.result = err;
                            }
                            setTimeout((function () { callback() }));
                        });
                    });
                }
                else {
                    isanyfailed = true;
                    item.result = "Invalid Value";
                    setTimeout((function () { callback() }));
                }
            }, function () {
                if (!!isanyfailed) {
                    setTimeout((function () { subcallback({ request: 400, message: ["Some Data Filed To Inserted Or Updated", { result }] }) }));
                }
                else {
                    setTimeout((function () { subcallback({ request: 200, message: "Successfully Inserted Or Updated" }) }));
                }
            });
        }
        else {
            setTimeout((function () { subcallback({ request: 400, message: "No Data Found" }) }));
        }
    }
    else {
        setTimeout((function () { subcallback({ request: 400, message: "Username Not Found or Is Not Admin" }) }));
    }
});

exports.createloginorreg = (async (req, res) => {
    res.setTimeout(0)
    if (!!req.body.isnewregistration && req.body.isnewregistration) {
        if (req.body.password && req.body.username && req.body.name && req.body.mobile && req.body.mobile.length == 10) {
            User.findOne({ statusflag: "A", username: req.body.username }).exec(function (err, userdata) {

                if (!!userdata && userdata) {
                    res.status(400).json({ "Result": "Username is already Available" });
                    return;
                }
                else {
                    let buff = new Buffer(req.body.password);
                    let base64data = buff.toString('base64');

                    let newuser = new User();
                    newuser.name = req.body.name;
                    newuser.username = req.body.username;
                    newuser.password = base64data;
                    newuser.isadmin = req.body.isadmin || false;
                    newuser.islogined = false;
                    newuser.autotoken = null;
                    newuser.authtoken = null;
                    newuser.mobile = req.body.mobile;
                    newuser.age = req.body.age || "";
                    newuser.email = req.body.email || "";
                    newuser.address = req.body.address || "";
                    newuser.createdby = mongoose.Types.ObjectId();
                    newuser.createdat = Date.now();
                    newuser.statusflag = "A";
                    newuser.modifiedby = newuser.createdby
                    newuser.modifiedat = Date.now();

                    newuser.save(function (err) {
                        if (!!err) {
                            res.status(400).json({ "Result": err });
                            return;
                        }
                        else {
                            res.status(200).json({ "Result": "Login Created Successfully" });
                            return;
                        }
                    });
                }
            });
        }
        else {
            res.status(400).json({ "Result": "Some Required Fields are empty" });
            return;
        }
    }
    else {
        if (!!req.body.username && req.body.username && !!req.body.password && req.body.password) {
            let buff = new Buffer(req.body.password);
            let base64data = buff.toString('base64');
            await User.findOne({ statusflag: "A", username: { '$regex': new RegExp('^' + req.body.username + '$', 'i') }, password: base64data }).exec(function (err, usrdata) {
                if (!!usrdata && usrdata) {
                    let length = 36;
                    autogenerate_token(length, function (autotoken) {
                        usrdata.tokengenerateddate = Date.now();
                        usrdata.autotoken = autotoken;
                        usrdata.islogined = true;
                        usrdata.modifiedat = Date.now();
                        usrdata.save(function (err) {
                            res.status(200).json({ "Result": "Logined successfully", "Token": autotoken });
                            return;
                        });
                    });
                }
                else {
                    res.status(400).json({ "Result": "Username or password is Invalid" });
                    return;
                }
            });
        }
        else {
            res.status(400).json({ "Result": "Username or password in not available" });
            return;
        }
    }
});

autogenerate_token = (async (length, tokencallback) => {
    let value1 = "7654321890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890".split("");
    var value = [];
    for (let i = 0; i < length; i++) {
        let j = (Math.random() * (value1.length - 1)).toFixed(0);
        value[i] = value1[j];
    }
    setTimeout((function () { tokencallback(value.join("")) }));
});

exports.createupdatecancelorder = (async (req, res) => {
    res.setTimeout(0)
    if (!!req.body.Token && req.body.Token) {
        let usrdata = await User.findOne({ statusflag: "A", autotoken: req.body.Token });
        if (!!usrdata && usrdata) {
            if (!!req.body.isneworder && !req.body.isupdate && !req.body.iscancelorder) {

                let orderdata = new orderdetails()
                orderdata.ordercode = mongoose.Types.ObjectId();
                orderdata.statusflag = "A";
                orderdata.totalprice = 0;
                orderdata.iscancelled = false;
                orderdata.isapproved = false;
                orderdata.modifiedby = usrdata._id;
                orderdata.modifiedat = Date.now();
                orderdata.createdby = usrdata._id;
                orderdata.createdat = Date.now();

                async.eachSeries(req.body.itemdetails, function (item, callback) {
                    itemmaster.findOne({ statusflag: "A", itemcode: item.itemcode, totalquantity: { $gte: item.quantity } }).exec(function (err, itemschdata) {
                        if (!!itemschdata && itemschdata) {
                            let itemdetails = {};

                            itemdetails.itemmasteruid = !!itemschdata._id && itemschdata._id || "";
                            itemdetails.batchid = !!itemschdata.batchid && itemschdata.batchid || "";
                            itemdetails.unitprice = !!itemschdata.unitprice && itemschdata.unitprice || 0;
                            itemdetails.quantity = !!item.quantity && item.quantity || 0;
                            itemdetails.price = (itemdetails.quantity * itemdetails.unitprice);
                            orderdata.totalprice = orderdata.totalprice + itemdetails.price;
                            orderdata.itemdetails.push(itemdetails);
                            callback();
                        }
                        else {
                            res.status(400).json({ "Result": "Invalid Itemcode or Stock Is Not Available select Less Quantity" });
                            return;
                        }
                    });
                }, function () {
                    orderdata.save(function (err) {
                        if (!!err) {
                            res.status(400).json({ "Result": err });
                            return;
                        }
                        else {
                            res.status(200).json({ "Result": "Order Successfully Created", "ordernumber": orderdata.ordercode });
                            return;
                        }
                    });
                });
            }
            else if (!req.body.isneworder && !!req.body.isupdate && !req.body.iscancelorder && req.body.ordernumber) {
                orderdetails.findOne({ statusflag: "A", iscancelled: { $ne: true }, isapproved: { $ne: true }, ordercode: req.body.ordernumber }).exec(function (err, orderdata) {
                    if (!!orderdata && orderdata) {
                        orderdata.statusflag = "A";
                        orderdata.totalprice = 0;
                        orderdata.modifiedby = usrdata._id;
                        orderdata.modifiedat = Date.now();
                        orderdata.createdby = usrdata._id;
                        orderdata.createdat = Date.now();
                        orderdata.itemdetails = [];

                        async.eachSeries(req.body.itemdetails, function (item, callback) {
                            itemmaster.findOne({ statusflag: "A", itemcode: item.itemcode, totalquantity: { $gte: item.quantity } }).exec(function (err, itemschdata) {
                                let itemdetails = {};

                                itemdetails.itemmasteruid = !!itemschdata._id && itemschdata._id || "";
                                itemdetails.batchid = !!itemschdata.batchid && itemschdata.batchid || "";
                                itemdetails.unitprice = !!itemschdata.unitprice && itemschdata.unitprice || 0;
                                itemdetails.quantity = !!item.quantity && item.quantity || 0;
                                itemdetails.price = (itemdetails.quantity * itemdetails.unitprice);
                                orderdata.totalprice = orderdata.totalprice + itemdetails.price;
                                orderdata.itemdetails.push(itemdetails);

                                callback();
                            });
                        }, function () {
                            orderdata.save(function (err) {
                                if (!!err) {
                                    res.status(400).json({ "Result": err });
                                    return;
                                }
                                else {
                                    res.status(200).json({ "Result": "Order Successfully Updated", "Ordernumber": orderdata.ordercode });
                                    return;
                                }
                            });
                        });
                    }
                    else {
                        res.status(400).json({ "Result": "Invalid Order Number or Approved or Cancelled" });
                        return;
                    }
                });
            }
            else if (!req.body.isneworder && !req.body.isupdate && !!req.body.iscancelorder && req.body.ordernumber) {
                orderdetails.findOne({ statusflag: "A", isapproved: { $ne: true }, ordercode: req.body.ordernumber }).exec(function (err, orderdata) {
                    if (!!orderdata && orderdata) {
                        if (orderdata.iscancelled == true) {
                            res.status(400).json({ "Result": "Order Number Already Cancelled" });
                            return;
                        }
                        else {
                            orderdata.iscancelled = true;
                            orderdata.modifiedby = usrdata._id;
                            orderdata.modifiedat = Date.now();

                            orderdata.save(function (err) {
                                if (!!err) {
                                    res.status(400).json({ "Result": err });
                                    return;
                                }
                                else {
                                    res.status(400).json({ "Result": "Order Number Cancelled" });
                                    return;
                                }
                            });
                        }
                    }
                    else {
                        res.status(400).json({ "Result": "Invalid Order Number" });
                        return;
                    }
                });
            }
            else if (!!req.body.isapproved && req.body.ordernumber) {
                orderdetails.findOne({ statusflag: "A", iscancelled: { $ne: true }, ordercode: req.body.ordernumber }).exec(function (err, orderdata) {
                    if (!!orderdata && orderdata) {
                        if (orderdata.isapproved == true) {
                            res.status(400).json({ "Result": "Order Number Already Approved" });
                            return;
                        }
                        else {
                            orderdata.isapproved = true;
                            orderdata.modifiedby = usrdata._id;
                            orderdata.modifiedat = Date.now();

                            orderdata.save(function (err) {
                                if (!!err) {
                                    res.status(400).json({ "Result": err });
                                    return;
                                }
                                else {
                                    async.eachSeries(orderdata.itemdetails, function (item, callback) {
                                        itemmaster.findOne({ statusflag: "A", _id: item.itemmasteruid }).exec(function (err, itemschdata) {
                                            itemschdata.totalquantity = itemschdata.totalquantity - item.quantity;
                                            itemschdata.save(function () {
                                                callback()
                                            });
                                        });
                                    }, function () {
                                        res.status(200).json({ "Result": "Order Successfully Approved" });
                                        return;
                                    });
                                }
                            });
                        }
                    }
                    else {
                        res.status(400).json({ "Result": "Invalid Order Number" });
                        return;
                    }
                });
            }
            else {
                res.status(400).json({ "Result": "Invalid Type" });
                return;
            }
        }
        else {
            res.status(400).json({ "Result": "Invalid Token" });
            return;
        }
    }
    else {
        res.status(400).json({ "Result": "Token is not available" });
        return;
    }
});

exports.orderpurchased = (async (req, res) => {
    res.setTimeout(0)
    if (!!req.query.Token && req.query.Token && !!req.query.authtoken && req.query.authtoken) {
        let usrdata = await User.findOne({ statusflag: "A", autotoken: req.query.Token, authtoken: req.query.authtoken });
        if (!!usrdata && usrdata) {
            let searchcriteria = {
                statusflag: "A",
                createdby: mongoose.Types.ObjectId(usrdata._id),
            }

            if (req.query.fromdate && req.query.todate) {
                searchcriteria = {
                    createdby: mongoose.Types.ObjectId(usrdata._id),
                    statusflag: "A",
                    $and: [
                        {
                            "createdat": { $gte: new Date((moment(req.query.fromdate)).toISOString()) }
                        }, {
                            "createdat": { $lte: new Date((moment(req.query.todate)).toISOString()) }
                        }
                    ]
                }
            }

            if (req.query.ordernumber && req.query.ordernumber) {
                searchcriteria.ordercode = req.query.ordernumber;
            }

            let selectvalue = "ordercode totalprice iscancelled isapproved createdat modifiedat itemdetails.batchid itemdetails.quantity itemdetails.unitprice  itemdetails.price";

            await orderdetails.find(searchcriteria, selectvalue)
                .populate({
                    path: 'createdby',
                    model: 'User',
                    select: '_id name',
                })
                .populate({
                    path: 'modifiedby',
                    model: 'User',
                    select: '_id name',
                })
                .populate({
                    path: 'itemdetails.itemmasteruid',
                    model: 'ItemMaster',
                    select: '_id itemcode itemname',
                })
                .lean().exec(function (err, docs) {
                    User.findOneAndUpdate({ statusflag: "A", _id: mongoose.Types.ObjectId(usrdata._id) }, { $set: { "authtoken": null } }, function (err, value) {
                        if (!!docs && docs.length > 0) {
                            res.status(200).json(docs);
                            return;
                        }
                        else {
                            res.status(400).json({ "Result": "No Data Found" });
                            return;
                        }
                    });
                });
        }
        else {
            res.status(400).json({ "Result": "Invalid Token" });
            return;
        }
    }
    else {
        res.status(400).json({ "Result": "Token or Auth Token is not available" });
        return;
    }
});

exports.orderpurchasedbuitemwise = (async (req, res) => {
    res.setTimeout(0)
    if (!!req.query.Token && req.query.Token && !!req.query.authtoken && req.query.authtoken) {
        let usrdata = await User.findOne({ statusflag: "A", autotoken: req.query.Token, authtoken: req.query.authtoken });
        if (!!usrdata && usrdata) {
            let matchcond = {};
            let searchcriteria = {
                statusflag: "A",
                createdby: mongoose.Types.ObjectId(usrdata._id),
            }

            if (req.query.fromdate && req.query.todate) {
                searchcriteria = {
                    statusflag: "A",
                    createdby: mongoose.Types.ObjectId(usrdata._id),
                    $and: [
                        {
                            "createdat": { $gte: new Date((moment(req.query.fromdate)).toISOString()) }
                        }, {
                            "createdat": { $lte: new Date((moment(req.query.todate)).toISOString()) }
                        }
                    ]
                }
            }

            if (req.query.itemcode && req.query.itemcode) {
                let itemdata = await itemmaster.findOne({ statusflag: "A", itemcode: req.query.itemcode });
                if (!!itemdata && itemdata) {
                    matchcond = {
                        "itemdetails.itemmasteruid": mongoose.Types.ObjectId(itemdata._id)
                    }
                }
                else {
                    res.status(400).json({ "Result": "Invalid Item Code" });
                    return;
                }
            }
            else {
                res.status(400).json({ "Result": "Item Code not Available" });
                return;
            }

            let orderdata = [
                {
                    $match: searchcriteria
                },
                {
                    $unwind: {
                        path: "$itemdetails", preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $match: matchcond
                },
                {
                    $lookup: {
                        from: "itemmasters",
                        localField: "itemdetails.itemmasteruid",
                        foreignField: "_id",
                        as: "itemmasteruid"
                    }
                },
                {
                    $unwind: {
                        path: "$itemmasteruid", preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "createdby",
                        foreignField: "_id",
                        as: "createdby"
                    }
                },
                {
                    $unwind: {
                        path: "$createdby", preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $project: {
                        createdbyname: "$createdby.name",
                        ordercode: "$ordercode",
                        cancelled: { $cond: { if: { $eq: ["$iscancelled", true] }, then: "Yes", else: "No" } },
                        approved: { $cond: { if: { $eq: ["$isapproved", true] }, then: "Yes", else: "No" } },
                        itemcode: "$itemmasteruid.itemcode",
                        itemname: "$itemmasteruid.itemname",
                        batchid: "$itemdetails.batchid",
                        quantity: "$itemdetails.quantity",
                        unitprice: "$itemdetails.unitprice",
                        price: "$itemdetails.price",
                    }
                },
                {
                    $group: {
                        _id: {
                            itemcode: "$itemcode",
                            ordercode: "$ordercode"
                        },
                        itemname: { $first: { $ifNull: ["$itemname", ""] } },
                        createdbyname: { $first: { $ifNull: ["$createdbyname", ""] } },
                        batchid: { $first: { $ifNull: ["$batchid", ""] } },
                        quantity: { $sum: { $ifNull: ["$quantity", 0] } },
                        price: { $sum: { $ifNull: ["$price", 0] } },
                        unitprice: { $first: { $ifNull: ["$unitprice", ""] } },
                        cancelled: { $first: { $ifNull: ["$cancelled", ""] } },
                        approved: { $first: { $ifNull: ["$approved", ""] } }
                    }
                },
                {
                    $group: {
                        _id: {
                            itemcode: "$_id.itemcode"
                        },
                        itemname: { $first: { $ifNull: ["$itemname", ""] } },
                        createdbyname: { $first: { $ifNull: ["$createdbyname", ""] } },
                        batchid: { $first: { $ifNull: ["$batchid", ""] } },
                        quantity: { $sum: { $ifNull: ["$quantity", 0] } },
                        price: { $sum: { $ifNull: ["$price", 0] } },
                        unitprice: { $first: { $ifNull: ["$unitprice", ""] } },

                        Detail: {
                            $push: {
                                ordernumber: { $cond: { if: "$_id.ordercode", then: "$_id.ordercode", else: "" } },
                                createdbyname: { $cond: { if: "$createdbyname", then: "$createdbyname", else: "" } },
                                cancelled: { $cond: { if: "$cancelled", then: "$cancelled", else: "" } },
                                approved: { $cond: { if: "$approved", then: "$approved", else: "" } },
                                quantity: { $cond: { if: "$quantity", then: "$quantity", else: "" } },
                                price: { $cond: { if: "$price", then: "$price", else: "" } },
                            }
                        }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        itemcode: { $cond: { if: "$_id.itemcode", then: "$_id.itemcode", else: "" } },
                        itemname: { $cond: { if: "$itemname", then: "$itemname", else: "" } },
                        batchid: { $cond: { if: "$batchid", then: "$batchid", else: "" } },
                        quantity: { $cond: { if: "$quantity", then: "$quantity", else: "" } },
                        unitprice: { $cond: { if: "$unitprice", then: "$unitprice", else: "" } },
                        price: { $cond: { if: "$price", then: "$price", else: "" } },
                        Details: "$Detail"
                    }
                }
            ]
            orderdetails.aggregate(orderdata).allowDiskUse(true).exec(function (err, data) {
                User.findOneAndUpdate({ statusflag: "A", _id: mongoose.Types.ObjectId(usrdata._id) }, { $set: { "authtoken": null } }, function (err, value) {
                    if (!!data && data.length > 0) {
                        res.status(200).json(data);
                        return;
                    }
                    else {
                        res.status(400).json({ "Result": "No Data Found" });
                        return;
                    }
                });
            });
        }
        else {
            res.status(400).json({ "Result": "Invalid Token" });
            return;
        }
    }
    else {
        res.status(400).json({ "Result": "Token or Auth Token is not available" });
        return;
    }
});

exports.checkgeneratetoken = (async (callback) => {
    User.find({ statusflag: "A", autotoken: { $ne: null } }).exec(function (err, userdata) {
        if (!!userdata && userdata && userdata.length > 0) {
            async.eachSeries(userdata, function (item, itemcallback) {
                let seconds = Math.abs(item.tokengenerateddate - Date.now()) / 1000;
                if (seconds > 480) {
                    User.findOneAndUpdate({ statusflag: "A", _id: mongoose.Types.ObjectId(item._id) }, { $set: { "autotoken": null, "tokengenerateddate": null } }, function (err, value) {
                        itemcallback()
                    });
                }
                else {
                    itemcallback()
                }
            }, function () {
                callback()
            });
        }
        else {
            callback()
        }
    });
});

exports.getjwttoken = (async (req, res) => {
    res.setTimeout(0)
    if (!!req.query.Token && req.query.Token) {
        let usrdata = await User.findOne({ statusflag: "A", autotoken: req.query.Token });
        if (!!usrdata && usrdata) {
            autogenerate_token(68, function (autotoken) {
                let buff = new Buffer(autotoken);
                let base64data = buff.toString('base64');
                User.findOneAndUpdate({ statusflag: "A", _id: mongoose.Types.ObjectId(usrdata._id) }, { $set: { "authtoken": base64data } }, function (err, value) {
                    res.status(200).json({ "Auth Token": base64data });
                    return;
                });
            });
        }
        else {
            res.status(400).json({ "Result": "Invalid Token" });
            return;
        }
    }
    else {
        res.status(400).json({ "Result": "Token is not available" });
        return;
    }
});