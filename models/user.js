
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');

const User = new Schema({
    email:{
        type:String,
        required:true,
    },
    number:{
        type:Number,
        required:true
    },
    date:{
        type:Date,
        default:Date.now
    }
});

User.plugin(passportLocalMongoose ,{ usernameUnique: false });

module.exports = mongoose.model('User', User);