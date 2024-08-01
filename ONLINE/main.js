const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const crypto = require('crypto');
const twilio = require('twilio');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
dotenv.config();
const app = express();
const uri = process.env.MONGO_URI; // Set your MongoDB URI in .env
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const otpStorage = {};
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// Routes
app.get('/', (req, res) => {
    res.render('login');
});

app.get('/signup', (req, res) => {
    res.render('signup');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
    const { name, phoneNumber } = req.body;
    if (!name || !phoneNumber) {
        return res.status(400).json({ success: false, message: 'Name and phone number are required.' });
    }
    if (name === 'Owner' && phoneNumber === '0000123456'){
        return  res.json({
            success: true,
            redirectTo: '/owner'
        });
    }
    try {
        await client.connect();
        const database = client.db('E-service');
        const collection = database.collection('contacts');
        const owners =database.collection('owners');
        const formattedPhoneNumber = `+91${phoneNumber}`;

        const user = await collection.findOne({ name :name ,phoneNumber: formattedPhoneNumber });
        const owner = await owners.findOne({ name : name ,phoneNumber: formattedPhoneNumber})
        if (owner) {
             return res.json({ success: true,redirectTo: `/admin/${owner._id}`});
        }
        if (user){
            return res.json({success:true,userId : user._id})
        }
        else {
            return res.json({ success: false, message: 'Invalid credentials.' });
        }

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    } finally {
        await client.close();
    }
});


app.get('/admin/:admin_id', async(req, res) => {
    const admin_id =req.params.admin_id;
    res.render('admin',{admin_id : admin_id}); // Render the admin template
});



app.get('/home/:userId', async(req, res) => {
    const userId = req.params.userId;
    await client.connect();
    const database = client.db('E-service');
    const owners = database.collection('owners');
    const ownersList = await owners.find().toArray();
    res.render('home', { id: userId, shop : ownersList});
});

app.get('/home/shop/:shopId', async (req, res) => {
    const { shopId } = req.params; // Extract shopId from URL
    const { param1 } = req.query; // Extract param1 from query string

    try {
        // Validate shopId
        if (!ObjectId.isValid(shopId)) {
            res.status(400).send('Invalid shopId');
            return;
        }

        // Connect to MongoDB client
        await client.connect();
        const database = client.db('E-service');
        const menus = database.collection('owners');

        // Fetch the store information from the 'owner' collection
        const store = await menus.findOne({ _id: new ObjectId(shopId) });

        if (store) {
            const storeName = store.storeName.toLowerCase(); // Access 'storeName'

            if (storeName.includes('food')) {
                // Render food court template
                res.render('foodcourt', { shop_id: shopId, id: param1 });
            } else {
                // Render normal shop template
            await client.connect();
            const database = client.db('E-service');
            const menus =database.collection('menu');
            const filter = {
                admin_id: shopId,
            };
        
            const menuItems = await menus.find(filter).toArray();
            console.log(menuItems);
            return res.render('amunity',{admin_id : shopId,id : param1,menuItems : menuItems})
                    }
        } else {
            // Handle case where the store is not found
            res.status(404).send('Store not found');
        }
    } catch (error) {
        // Enhanced error handling for debugging
        console.error('Error:', error.message); // Log only the error message
        console.error(error); // Log the full error object
        res.status(500).send('Internal Server Error');
    } finally {
            await client.close();
    }
});


app.get('/food/:shopId', async(req, res) => {
    const { shopId } = req.params;
    const { param1, type } = req.query;
    console.log(shopId,param1,type);
    await client.connect();
    const database = client.db('E-service');
    const menus =database.collection('menu');
    const filter = {
        admin_id: shopId,
        type: type
      };
  
    const menuItems = await menus.find(filter).toArray();
    console.log(menuItems);
    return res.render('food',{admin_id : shopId,id : param1,menuItems : menuItems})
});


const ownerStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads');
    },
    filename: function (req, file, cb) {
        cb(null, `${req.body.storeName}-${Date.now()}${path.extname(file.originalname)}`);
    }
});
const uploadOwnerPhoto = multer({ storage: ownerStorage });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Route to request OTP
app.post('/request-otp', async (req, res) => {
    const { phoneNumber, name } = req.body;
    if (!phoneNumber || phoneNumber.length !== 10 || isNaN(phoneNumber)) {
        return res.status(400).send('Invalid phone number');
    }

    const formattedPhoneNumber = `+91${phoneNumber}`;
    console.log('Formatted Phone Number:', formattedPhoneNumber);

    try {
        await client.connect();
        const database = client.db('E-service');
        const contact = database.collection('contacts');
        const existingContact = await contact.findOne({ phoneNumber: formattedPhoneNumber });
        
        if (existingContact) {
            return res.status(400).send('User already exists');
        }

        const otp = crypto.randomInt(100000, 999999).toString();
        otpStorage[formattedPhoneNumber] = otp;

        twilioClient.messages.create({
            body: `Your OTP code is ${otp}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: formattedPhoneNumber
        });

        res.send('OTP sent successfully!');
    } catch (error) {
        console.error('Error handling request:', error);
        res.status(500).send('Failed to process request');
    }
});

// Route to verify OTP
app.post('/verify-otp', async (req, res) => {
    const { phoneNumber, name, otp } = req.body;
    const formattedPhoneNumber =  `+91${phoneNumber}`;
    const storedOtp = otpStorage[formattedPhoneNumber];
    const Name = name;

    if (storedOtp && storedOtp === otp) {
        try {
            await client.connect();
            const database = client.db('E-service');
            const contact = database.collection('contacts');
            await contact.insertOne({ name: Name, phoneNumber: formattedPhoneNumber });
            delete otpStorage[formattedPhoneNumber];
            res.send('OTP verified successfully');
        } catch (err) {
            console.error('Error saving contact:', err);
            res.status(500).send('Failed to store contact');
        }
    } else {
        res.status(400).send('Invalid OTP');
    }
});

app.get('/owner',async(req,res)=>{
    return res.render('owner');
})
app.post('/owner-request-otp', async (req, res) => {
    const { phoneNumber, name } = req.body;
    if (!phoneNumber || phoneNumber.length !== 10 || isNaN(phoneNumber)) {
        return res.status(400).send('Invalid phone number');
    }

    const formattedPhoneNumber =  `+91${phoneNumber}`;
    console.log('Formatted Phone Number:', formattedPhoneNumber);

    try {
        await client.connect();
        const database = client.db('E-service');
        const contact = database.collection('owners');
        const existingContact = await contact.findOne({ phoneNumber: formattedPhoneNumber ,name : name});
        
        if (existingContact) {
            return res.status(400).send('User already exists');
        }

        const otp = crypto.randomInt(100000, 999999).toString();
        otpStorage[formattedPhoneNumber] = otp;

        twilioClient.messages.create({
            body: `Your OTP code is ${otp}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: formattedPhoneNumber
        });

        res.send('OTP sent successfully!');
    } catch (error) {
        console.error('Error handling request:', error);
        res.status(500).send('Failed to process request');
    }
});
app.post('/owner-verify-otp', async (req, res) => {
    const { name, phoneNumber, otp } = req.body;
    const formattedPhoneNumber = `+91${phoneNumber}`;
    const storedOtp = otpStorage[formattedPhoneNumber];

    if (storedOtp && storedOtp === otp) {
        // OTP is valid, store basic information
        otpStorage[formattedPhoneNumber] = { name, phoneNumber }; // Store basic info for later

        // Clean up OTP
        delete otpStorage[formattedPhoneNumber];

        res.json({ success: true, message: 'OTP verified successfully. Please proceed with additional details.' });
    } else {
        res.status(400).json({ success: false, message: 'Invalid OTP' });
    }
});

app.post('/submit-owner-details', uploadOwnerPhoto.single('photo'), async (req, res) => {
    const { storeName, phoneNumber, name } = req.body;
    const formattedPhoneNumber = `+91${phoneNumber}`;

    try {
        await client.connect();
        const database = client.db('E-service');
        const ownersCollection = database.collection('owners');

        // Prepare the owner document
        const ownerDocument = {
            name,
            phoneNumber: formattedPhoneNumber,
            storeName,
            photo: req.file ? `/uploads/${req.file.filename}` : null
        };

        // Insert the owner document into the collection
        await ownersCollection.insertOne(ownerDocument);

        res.json({ success: true, message: 'Owner created successfully' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Failed to create owner' });
    } finally {
        await client.close();
    }
});


app.get('/orders/:admin_id', (req, res) => {
    const admin_id =req.params.admin_id
    res.render('vieworders',{admin_id:admin_id}); // Render the admin template
});

app.get('/addmenu/:admin_id',(req,res)=>{
    const admin_id =req.params.admin_id
    res.render('addmenu',{admin_id :admin_id });
})
app.get('/changecost/:admin_id',(req,res)=>{
    const admin_id = req.params.admin_id;
    return res.render('changemenu',{admin_id : admin_id});
});




// Handle View Orders
app.get('/api/orders/:shopId', async (req, res) => {
    const shopId = req.params.shopId;
    console.log(shopId);
    try {
        await client.connect();
        const database = client.db('E-service');
        const ordersCollection = database.collection('orders');
        const orders = await ordersCollection.find({
            status: { $in: ['pending', 'progress'] },
        }).toArray();
        console.log(orders);
        res.json({ orders });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});


app.post('/api/change-cost/:admin_id', async (req, res) => {
    const { name, newCost } = req.body;
    const admin_id = req.params.admin_id;

    console.log('Received Data:', { name, newCost });

    try {
        await client.connect();
        const database = client.db('E-service');
        const menuCollection = database.collection('menu');
        // Update the cost of the menu item
        const result = await menuCollection.updateOne(
            { name: name, admin_id: admin_id },
            { $set: { price: parseFloat(newCost) } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'Menu item not found.' });
        }

        console.log(`Menu item updated with name: ${name}`);
        res.status(200).json({ message: 'Menu cost updated successfully!' });
    } catch (error) {
        console.error('Error updating menu cost:', error);
        res.status(500).json({ message: 'Internal server error.' });
    } finally {
        await client.close();
    }
});

const menustorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/'); // Directory inside 'public'
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadMenuPhoto = multer({ storage: menustorage });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/api/add-menu/:admin_id', uploadMenuPhoto.single('menu-photo'), async (req, res) => {
    const { name, price, type } = req.body;
    const photoPath = req.file ? req.file.path : null;
    const admin_id = req.params.admin_id;

    try {
        await client.connect();
        const database = client.db('E-service');
        const menuCollection = database.collection('menu');

        const menuItem = {
            name:name ? name.trim() :null,
            price:price? parseFloat(price) :null,
            type: type ? type.trim() :null,
            photo: photoPath.replace('public\\', ''),
            admin_id : admin_id
        };

        await menuCollection.insertOne(menuItem);
        res.json({ success: true, message: 'Menu item added successfully' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Failed to add menu item' });
    } finally {
        await client.close();
    }
});


// Create 'public/uploads' directory if it doesn't exist
const uploadsDir = 'public/uploads';
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}




// Send a notification
app.post('/api/notifications/send', async (req, res) => {
    const { type, message, name, phone } = req.body;

    try {
        await client.connect();
        const database = client.db('E-service');
        const notificationsCollection = database.collection('notifications');
        const usersCollection = database.collection('contacts');

        if (type === 'all') {
            // Send notification to all users
            const allUsers = await usersCollection.find({}).toArray();
            const notifications = allUsers.map(user => ({
                userId: user._id,
                message,
                timestamp: new Date(),
                viewed: false
            }));
            await notificationsCollection.insertMany(notifications);
        } else if (type === 'private') {
            // Send notification to a specific user
            const user = await usersCollection.findOne({ name: name, phone: phone });

            if (user) {
                await notificationsCollection.insertOne({
                    userId: user._id,
                    message,
                    timestamp: new Date(),
                    viewed: false
                });
            } else {
                return res.status(404).json({ message: 'User not found.' });
            }
        }

        res.status(201).json({ message: 'Notification sent successfully!' });
    } catch (error) {
        console.error('Error sending notification:', error);
        res.status(500).json({ message: 'Internal server error.' });
    } finally {
        await client.close();
    }
});

// Mark notifications as viewed

// Fetch notifications for a specific user
app.get('/api/notifications', async (req, res) => {
    const { userId } = req.query;

    try {
        await client.connect();
        const database = client.db('E-service');
        const notificationsCollection = database.collection('notifications');

        const notifications = await notificationsCollection.find({ userId }).toArray();
        res.json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Internal server error.' });
    } finally {
        await client.close();
    }
});



// Update order status and send notification
app.put('/api/orders/:orderId/status', async (req, res) => {
    const { orderId } = req.params;
    const { status } = req.body;

    try {
        await client.connect();
        const database = client.db('E-service');
        const ordersCollection = database.collection('orders');
        const notificationsCollection = database.collection('notifications');

        // Update order status
        const result = await ordersCollection.updateOne(
            { _id: new ObjectId(orderId) },
            { $set: { status: status } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'Order not found.' });
        }

        // Fetch order details
        const order = await ordersCollection.findOne({ _id: new ObjectId(orderId) });

        // Prepare notification
        const notification = {
            userId: order.userId,
            message: `Your order ${order._id} status has been updated to ${status}.`,
            timestamp: new Date(),
            viewed: false
        };

        // Send notification
        await notificationsCollection.insertOne(notification);

        res.status(200).json({ message: 'Order status updated and notification sent.' });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ message: 'Internal server error.' });
    } finally {
        await client.close();
    }
});

app.get('/changecost/:admin_id',(req,res)=>{
    const admin_id = req.params.admin_id;
    return res.render('changemenu',{admin_id : admin_id});
});

app.get('/sendnotification',(req,res)=>{
    return res.render('sendnotification')});

app.post('/api/orders', async (req, res) => {
        const { shopId, userId, orders, totalCost  } = req.body;
    
        console.log('Received Orders:', orders); // Debugging
        console.log('Received User ID:', userId); 
    
        try {
            // Connect to MongoDB
            await client.connect();
    
            const database = client.db('E-service');
            const usersCollection = database.collection('contacts');
            const ordersCollection = database.collection('orders');
    
            // Retrieve user information
            const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
            if (!user) {
                return res.status(404).json({ message: 'User not found.' });
            }
    
            // Prepare the order document
            const orderDocument = {
                orders: orders,
                userId: userId,
                admin_id: shopId,
                totalcost:totalCost ,
                name: user.name, // Add user name
                phoneNumber: user.phoneNumber, // Add user phone number
                status: 'pending' // Set default status to 'pending'
            };
    
            // Insert the order into the orders collection
            const result = await ordersCollection.insertOne(orderDocument);
            console.log(`Order placed with _id: ${result.insertedId}`);
            res.status(201).json({ message: 'Order placed successfully!' });
        } catch (error) {
            console.error('Error placing order:', error); // Debugging
            res.status(500).json({ message: 'Internal server error.' });
        } finally {
            await client.close();
        }
    });

// Add this to your existing routes in Node.js

// Route to get unread notifications count
app.get('/api/notifications/count/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        await client.connect();
        const database = client.db('E-service');
        const notificationsCollection = database.collection('notifications');

        // Count unread notifications for the user
        const unreadCount = await notificationsCollection.countDocuments({
            userId: new ObjectId(userId),
            viewed: false
        });

        res.json({ unreadCount });
    } catch (error) {
        console.error('Error fetching notifications count:', error);
        res.status(500).json({ message: 'Internal server error.' });
    } finally {
        await client.close();
    }
});

app.get('/notification/:userId', (req, res) => {
    const user_id =req.params.userId
    res.render('notification',{id:user_id}); // Render the admin template
});
app.post('/api/notifications/viewed', async (req, res) => {
    const { notificationIds } = req.body;
    console.log(notificationIds);

    try {
        await client.connect();
        const database = client.db('E-service');
        const notificationsCollection = database.collection('notifications');

         await notificationsCollection.updateMany(
            { _id: { $in: notificationIds.map(id => new ObjectId(id)) } },
            { $set: { viewed: true } }
        );

        res.json({ message: 'Notifications marked as viewed successfully!' });
    } catch (error) {
        console.error('Error marking notifications as viewed:', error);
        res.status(500).json({ message: 'Internal server error.' });
    } finally {
        await client.close();
    }
});

app.get('/sendnotification/:id',(req,res)=>{
    return res.render('sendnotification')});

const port = process.env.PORT || 3000;
app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    });