if(process.env.NODE_ENV != "production"){
    require('dotenv').config()
}

const mongoose = require("mongoose");
const RideListing = require("../models/ridePost");
const sampleRides = require("./data");

mongoose.connect("mongodb+srv://shashankkoti05:FBHVcW4DNm0hhKsx@shareride.hkyk9ed.mongodb.net/?retryWrites=true&w=majority&appName=shareRide").then(() => {
    console.log("✅ MongoDB connected successfully");
})
.catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
});


const initDB = async () => {
    try {
        await RideListing.deleteMany({}); // Clear existing rides
        // await RideListing.find().populate("owner");
        // Create a new array with `owner` field added
        const ridesWithOwner = sampleRides.map((obj) => ({
            ...obj,
            owner:'67f802fb848dc24d436709c7',}));

        await RideListing.insertMany(ridesWithOwner); // Insert new ride data
        console.log("🚗 Ride data initialized successfully!");
    } catch (error) {
        console.error("❌ Error initializing DB:", error);
    }
}
initDB();