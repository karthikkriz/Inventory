module.exports = (app) => {
    var main = require("./mainfile/main")
    app.post('/itemmaster/creteorupdate', main.itemscreteorupdate);
    app.post('/user/createloginorreg', main.createloginorreg);
    app.post('/orderdetails/createupdatecancelorder', main.createupdatecancelorder);
    app.get('/orderdetails/orderpurchased', main.orderpurchased);
    app.get('/orderdetails/orderpurchasedbuitemwise', main.orderpurchasedbuitemwise);
    app.get('/master/getjwttoken', main.getjwttoken);
};