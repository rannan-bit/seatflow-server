const express = require('express')
const authController = require('../controllers/authController')
const authMiddleware = require('../middleware/authMiddleware')
const adminauthMiddleware = require('../middleware/adminAuthMiddleware')
const multerMiddleWare = require('../middleware/multerMiddleware')
const foodController = require('../controllers/foodController')
const tableController = require('../controllers/tableController')
const queueController = require('../controllers/queueController')
const orderController = require('../controllers/orderController')
const router = new express.Router()
const pushController = require('../controllers/pushController')

//add-staff
router.post('/add-staff', authMiddleware, adminauthMiddleware, authController.registerController)
//login
router.post('/login', authController.loginController)
//get all staff
router.get('/all-staff', authMiddleware, adminauthMiddleware, authController.getAllStaffController)
//update staff
router.put('/staff-update/:id', authMiddleware, adminauthMiddleware, authController.updateStaffController)
//delete staff
router.delete('/staff-delete/:id', authMiddleware, adminauthMiddleware, authController.deleteStaffController)
//food-add
router.post('/food-add', authMiddleware, adminauthMiddleware, multerMiddleWare.single('image'), foodController.addFoodController)
//get all foods
router.get('/all-foods', foodController.getAllFoodsController)
//get single food
router.get('/food/:id', foodController.getSingleFoodController)
//update food
router.put('/food-update/:id', authMiddleware, adminauthMiddleware, multerMiddleWare.single('image'), foodController.updateFoodController)
//delete food
router.delete('/food-delete/:id', authMiddleware, adminauthMiddleware, foodController.deleteFoodController)
//change availability
router.patch('/food-availability/:id', authMiddleware, adminauthMiddleware, foodController.changeAvailabilityController)

// --- TABLE ROUTES ---
//add table (Admin)
router.post('/table-add', authMiddleware, adminauthMiddleware, tableController.addTableController)
//get all tables (Admin, Staff)
router.get('/all-tables', authMiddleware, tableController.getAllTablesController)
//get single table (Admin, Staff)
router.get('/table/:id', authMiddleware, tableController.getSingleTableController)
//update table (Admin)
router.put('/table-update/:id', authMiddleware, adminauthMiddleware, tableController.updateTableController)
//delete table (Admin)
router.delete('/table-delete/:id', authMiddleware, adminauthMiddleware, tableController.deleteTableController)
//change table status (Admin, Staff)
router.patch('/table-status/:id', authMiddleware, tableController.changeTableStatusController)

// --- QUEUE ROUTES ---
//customer check-in
router.post('/customer/check-in', queueController.checkInController)
//get customer queue status by token (public)
router.get('/customer/queue-status/:token', queueController.getCustomerQueueStatusController)
//get all queue entries (Admin, Staff)
router.get('/all-queues', authMiddleware, queueController.getAllQueueController)
//assign table (Admin, Staff)
router.post('/assign-table', authMiddleware, queueController.assignTableController)
//update queue status (Admin, Staff)
router.patch('/queue-status/:id', authMiddleware, queueController.updateQueueStatusController)

// --- ORDER ROUTES ---
//place an order (customer, identified by queue token)
router.post('/order-add', orderController.createOrderController)
//get a customer's orders by queue token
router.get('/customer/orders/:token', orderController.getCustomerOrdersController)
//get all orders (Admin, Staff)
router.get('/all-orders', authMiddleware, orderController.getAllOrdersController)
//update order status (Admin, Staff)
router.patch('/order-status/:id', authMiddleware, orderController.updateOrderStatusController)

//--- WEB PUSH ---

router.post("/customer/push-subscription",pushController.savePushSubscriptionController)

module.exports = router