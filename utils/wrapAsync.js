module.exports = (fn)=>{
    return (req,res,next)=>{
        let error = fn(req,res,next).catch(next);
    };
};