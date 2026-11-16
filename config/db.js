//import mongoose
const mongoose=require('mongoose')
// db connection string from .env
const connection_string=process.env.DBConnectionString
console.log("running");

// handle connection
mongoose.connect(connection_string).then((res)=>{
    console.log("server connected to mongoDB");
    
}).catch(err=>{
    console.log("connection failed");
    console.log(err);
    
    
})
