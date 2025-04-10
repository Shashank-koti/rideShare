
module.exports.isLoggedIn = async(req,res,next)=>{
    if (!req.isAuthenticated()) {
        await req.flash("error", "You must be logged in to access this.");
        return res.render("user/login");
    }
    next();
}
