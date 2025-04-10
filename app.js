if(process.env.NODE_ENV != "production"){
    require('dotenv').config()
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const RideListing = require("./models/ridePost");
const User = require('./models/user');
const path = require("path");
const ejs = require("ejs");
const ejsMate = require("ejs-mate");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const methodOverride = require("method-override");
const session = require("express-session");
const ExpressError = require('./utils/expressError');
const wrapAsync = require("./utils/wrapAsync");
const flash = require("connect-flash");
const {isLoggedIn} = require("./midddleware");
const {ridePostSchema } = require("./schema");
const schedule = require("node-schedule");
const sendWhatsAppMessage= require("./message");
const MongoStore = require('connect-mongo');


mongoose.connect(process.env.MONGO_URI).then(() => {
    console.log("✅ MongoDB connected successfully");
})
.catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
});

app.set("view engine", "ejs");
app.set("views",path.join(__dirname,"views"));
app.use(express.urlencoded({extended:true}));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname,"/public")));
app.engine('ejs', ejsMate);
app.use(express.json());

const store = MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    crypto:{
        secret: process.env.SECRET,
    },
    touchAfter: 24*60*60,
})
store.on("error",(err)=>{
    console.log("Error in mongo session store",err)
})

const sessionOptions = {
    store,
    secret: 'MYSECRET',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        expires: Date.now()+ 7*24*60*60*1000,
        maxAge: 7*24*60*60*1000,
    }
  }
app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next)=>{
    res.locals.success = req.flash("success");
    res.locals.error = req.flash('error');
    res.locals.currUser = req.user;
    next();
});

schedule.scheduleJob("0 0 * * *", async () => { 
    console.log("✅ Scheduled job started at:", new Date().toISOString());

    try {
        const now = new Date();
        const result = await RideListing.deleteMany({ date: { $lt: now } });

        console.log(`✅ Deleted ${result.deletedCount} expired rides.`);
    } catch (error) {
        console.error("❌ Error deleting expired rides:", error);
    }
});


const validateRidePost = (req,res,next)=>{
    const {error} = ridePostSchema.validate(req.body);
    if(error){
        let errMsg = error.details.map((el)=> el.message).join(",");
        return next(new ExpressError( 400, errMsg));
    }
    next();
}

app.get("/rideShare",wrapAsync(async(req,res)=>{
    let allRides =await RideListing.find({});
    res.render("main.ejs",{allRides});
}));

app.get("/login", (req, res) => {
    if (req.user) {
        req.flash("success", "You are already logged in!");
        return res.redirect("/rideShare"); // Or redirect to dashboard/home page
    }
    res.render("user/login.ejs");
});

app.post("/login",passport.authenticate("local", { failureRedirect :'/login',failureFlash:true}), async(req,res)=>{
    await req.flash("success","logged Successfully");
    res.redirect("/rideShare");
});

app.get("/signup", (req, res) => {
    if (req.user) {
        req.flash("success", "You are already logged in! no need to signUp");
        return res.redirect("/rideShare"); // Change to any default logged-in page
    }
    res.render("user/signup.ejs");
});


app.post("/signup",wrapAsync(async(req,res)=>{
    let {username , email , password,number} = req.body;
    let newUser = new User({username,email,number});
    let registerUser = await User.register(newUser,password);
    req.login(registerUser,(err)=>{
        if(err) return next(err);
        req.flash("success","signed in Successfully");
        res.redirect("/rideShare");
    })
}));

app.get("/logout",(req,res,next)=>{
    req.logout((err)=>{
        if(err) return next(err);
    });
    req.flash("success","logged out Successfully");
    res.redirect("/rideShare");
});

app.get("/ridePost",isLoggedIn,(req,res)=>{
    res.render("ridepost.ejs");
});

app.post("/ridepost",validateRidePost, wrapAsync(async(req,res)=>{
    let ride = new RideListing(req.body.ride);
    ride.pickUp = ride.pickUp.toLowerCase();
    ride.drop = ride.drop.toLowerCase();

    ride.owner = req.user._id;
    await ride.save();
    req.flash("success","Ride posted Successfully");
    res.redirect("/rideShare");
}));

app.get("/rides",isLoggedIn,wrapAsync(async(req,res)=>{

        const { pickUp, drop, date } = req.query;

        // Validate query parameters
        if (!pickUp || !drop || !date) {
            return res.status(400).json({ error: "Pick-up, drop, and date are required" });
        }

        // Convert input date to a valid Date object
        const rideDate = new Date(date);
        if (isNaN(rideDate.getTime())) {
            return res.status(400).json({ error: "Invalid date format" });
        }

        // Normalize time range for the whole day
        const startOfDay = new Date(rideDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(rideDate.setHours(23, 59, 59, 999));

        // Find matching rides
        let rides = await RideListing.find({
            pickUp: pickUp,
            drop: drop,
            date: { $gte: startOfDay, $lte: endOfDay }
        }).populate("owner");
        res.render("ride", { rides });
}));

app.get("/rides/:id",wrapAsync(async(req,res)=>{
    const ride = await RideListing.findById(req.params.id)
    .populate("owner")
    .populate("bookedUsers");


    if(!req.user){
        req.flash("error","You must be logged in to show details");
        return res.redirect("/login");
    }

    if(!ride) {
        req.flash("error","Ride not found");
        return res.redirect("/rideShare");
    }
    
    res.render("show.ejs", { ride, currUser: req.user._id });

}));

app.get("/book-ride/:id", async (req, res,next) => { 
    const ride = await RideListing.findById(req.params.id).populate("owner");

    if(!req.user){
        req.flash("error","You must be logged in to book a ride");
        return res.redirect("/login");
    }

    // Check if user has already booked
    if (req.user._id === ride.owner._id) {
        req.flash("error", "You cannot book your own ride!");
        return res.redirect(`/rides/${ride._id}`);
    }

    // ✅ Check if user already booked
    const alreadyBooked = ride.bookedUsers.some(userId =>
        userId.equals(req.user._id)
    );

    // ✅ Book only if not already booked
    if (!alreadyBooked) {
        ride.bookedUsers.push(req.user._id);
        ride.seats -= 1;
        await ride.save();
    }

    if (!ride.owner.number || !ride.drop) {
      return req.flash("error", "ride is not available");
    }

    try {
      await sendWhatsAppMessage(ride.owner.number, `🚗 Your ride to ${ride.drop} has been successfully booked!
        👤 Passenger Name: ${req.user.username}
        📞 Contact: ${req.user.number}
        🛣️ Pick-up Location: ${ride.pickUp}
        🎯 Drop-off Location: ${ride.drop}
        🕒 Date & Time: ${ride.date}
        Safe travels! Enjoy your journey! 😊`);

      req.flash("success", "Booked successfully");
      res.redirect("/rideShare"); // Redirect to rides page after booking
    } catch (error) {
      console.error("❌ Error:", error.message);
      res.status(500).send("Error sending WhatsApp message");
    }

});

app.delete("/rideDelete/:id",isLoggedIn, async(req,res)=>{
    const id = req.params.id;
    await RideListing.findByIdAndDelete(id);
    req.flash("success", "Ride Deleted Successfully");
    res.redirect("/allRides");
});

app.get("/myRides", isLoggedIn, async (req, res) => {
    const userId = req.user._id;

    // 1. Rides created by the user
    const createdRides = await RideListing.find({ owner: userId });

    // 2. Rides booked by the user (but not created by them)
    const bookedRides = await RideListing.find({
        bookedUsers: userId,
        owner: { $ne: userId }
    });

    res.render("myRides.ejs", { createdRides, bookedRides });
});

  
app.get("/allRides",isLoggedIn, async (req, res) => {
    const rides = await RideListing.find().populate("owner"); // Fetch rides with owner details
    res.render("allRides.ejs", { rides, currentUser: req.user._id});
});

app.get("/profile",(req,res)=>{
    if(req.user){
        console.log(req.user);
        res.render("profile.ejs",{user:req.user});
    }
    else{
        res.redirect("/login");
    }
});

app.all("*",(req,res,next)=>{
    next(new ExpressError(404,"page not found"));
});

app.use((err,req,res,next)=>{
    let {status=500, message="something went wrong"} = err; 
    res.status(status).render("error.ejs",{err});
});


app.listen(8080, ()=>{
    console.log("Server is running on port 8080");
});