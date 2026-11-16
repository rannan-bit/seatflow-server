const multer = require('multer')

//define storage space for uploaded file
const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, './uploads')
    },
    filename: (req, file, callback) => {
        // Keep the original extension at the end so express.static serves the right content type.
        // e.g. Image-1794715779882-chicken-burgers.avif
        const safeName = file.originalname.replace(/\s+/g, "-");
        callback(null, `Image-${Date.now()}-${safeName}`)
    }
})

const fileFilter = (req, file, callback) => {
    if (file.mimetype.startsWith('image/')) {
        callback(null, true)
    }
    else {
        callback(null,false)
    }
}

const multerMiddleWare=multer({
    storage,fileFilter
})

module.exports=multerMiddleWare