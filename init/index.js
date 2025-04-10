const mongoose = require("mongoose");
const RideListing = require("../models/ridePost");
const sampleRides = require("./data");


mongoose.connect("mongodb://localhost:27017/rideShare").then(()=>{
    console.log("Connected to MongoDB");
});


const initDB = async () => {
    try {
        await RideListing.deleteMany({}); // Clear existing rides
        // await RideListing.find().populate("owner");
        // Create a new array with `owner` field added
        const ridesWithOwner = sampleRides.map((obj) => ({
            ...obj,
            owner:'67daff1bd03fd89610d01132',}));

        await RideListing.insertMany(ridesWithOwner); // Insert new ride data
        console.log("🚗 Ride data initialized successfully!");
    } catch (error) {
        console.error("❌ Error initializing DB:", error);
    }
}
initDB();