//load environmental variables
require('dotenv').config()
//import express
const express = require('express')
//import CORS
const cors = require('cors')
//import db connection
require('./config/db')
//import router
const router = require('./routes/router')
const chatRoutes = require("./routes/chatRoutes");

//create server
const server = express()
//middlewares-allow requests from frontend
server.use(cors())
//middlewares-convert JSON request from frontend to js objects
server.use(express.json())
//use routes in server
server.use(router)
server.use("/api", chatRoutes)

server.use('/uploads', express.static('./uploads'))


//setup port number to run server
const PORT = process.env.PORT

//start server to listen client request to that port
server.listen(PORT, () => {
    console.log("server running and waiting for client request");

})
//handle global errors in server using application middleware
server.use((err, req, res, next) => {
    res.status(500).json(err.message)
})
//resolve api(get request to http://localhost:3000/) usingexpress
server.get('/', (req, res) => {
    res.status(200).send(`<h1>server running</h1>`)
})

server.post('/', (req, res) => {
    res.status(200).send("POST REQUEST")
})