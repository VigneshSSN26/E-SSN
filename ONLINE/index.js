const express = require('express');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');
const twilio = require('twilio');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
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
    if (name === 'Virat' && phoneNumber ==='9245313433') {
        return res.json({ success: true,  });
    }redirectTo: '/admin'

    try {
        await client.connect();
        const database = client.db('E-service');
        const collection = database.collection('contacts');
        const formattedPhoneNumber = `+91${phoneNumber}`;

        const user = await collection.findOne({ phoneNumber: formattedPhoneNumber });
        if (user) {
            res.json({ success: true, userId: user._id });
        } else {
            res.json({ success: false, message: 'Invalid credentials.' });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    } finally {
        await client.close();
    }
});


app.get('/admin', (req, res) => {
    res.render('admin'); // Render the admin template
});



app.get('/home/:userId', (req, res) => {
    const userId = req.params.userId;
    res.render('home', { id: userId });
});

app.get('/home/foodcourt/:userId', (req, res) => {
    const userId = req.params.userId;
    res.render('foodcourt', { id: userId });
});

app.get('/home/foodcourt/dinner/:userId', (req, res) => {
    const userId = req.params.userId;
    res.render('dinner', { id: userId });
});
app.get('/breakfast/:userId', (req, res) => {
    const userId = req.params.userId;
    console.log(userId);
    res.render('breakfast', { id: userId });
});

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
    const formattedPhoneNumber = `+91${phoneNumber}`;
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
app.post('/api/orders', async (req, res) => {
    const { orders, userId, type } = req.body;

    console.log('Received Orders:', orders); // Debugging
    console.log('Received User ID:', userId); // Debugging

    try {
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
            type: type,
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


app.get('/orders', (req, res) => {
    res.render('vieworders'); // Render the admin template
});

app.get('/addmenu',(req,res)=>{
    res.render('addmenu');
})




// Handle View Orders
app.get('/api/orders', async (req, res) => {
    try {
        await client.connect();
        const database = client.db('E-service');
        const ordersCollection = database.collection('orders');

        const orders = await ordersCollection.find({ status: { $in: ['pending', 'progress'] } }).toArray();
        res.json({ orders });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ message: 'Internal server error.' });
    } finally {
        await client.close();
    }
});


app.post('/api/change-cost', async (req, res) => {
    const { name, newCost } = req.body;

    console.log('Received Data:', { name, newCost });

    try {
        await client.connect();
        const database = client.db('E-service');
        const menuCollection = database.collection('menu');

        // Update the cost of the menu item
        const result = await menuCollection.updateOne(
            { name: name },
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

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/'); // Directory inside 'public'
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/api/add-menu', upload.single('menu-photo'), async (req, res) => {
    const { name, price } = req.body;
    const photoPath = req.file ? req.file.path : null;

    console.log('Received data:', { name, price, photoPath });

    try {
        await client.connect();
        const database = client.db('E-service');
        const menuCollection = database.collection('menu');

        const menuItem = {
            name: name ? name.trim() : null,
            price: price ? parseFloat(price) : null,
            photo: photoPath.replace('public\\', '') // Store path relative to public folder
        };

        console.log('Menu item to insert:', menuItem);

        const result = await menuCollection.insertOne(menuItem);
        res.status(201).json({ message: 'Menu item added successfully!' });
    } catch (error) {
        console.error('Error adding menu item:', error);
        res.status(500).json({ message: 'Internal server error.' });
    } finally {
        await client.close();
    }
});

// Create 'public/uploads' directory if it doesn't exist
const uploadsDir = 'public/uploads';
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}


/// Fetch notifications for a user
app.get('/api/notifications', async (req, res) => {
    const userId = req.query.userId; // Get user ID from query parameter

    try {
        await client.connect();
        const database = client.db('E-service');
        const notificationsCollection = database.collection('notifications');

        // Fetch notifications that are not viewed
        const notifications = await notificationsCollection.find({ userId: new ObjectId(userId), viewed: false }).toArray();
        res.json({ notifications });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Internal server error.' });
    } finally {
        await client.close();
    }
});

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
app.post('/api/notifications/viewed', async (req, res) => {
    const { notificationIds } = req.body;

    try {
        await client.connect();
        const database = client.db('E-service');
        const notificationsCollection = database.collection('notifications');

        const result = await notificationsCollection.updateMany(
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

app.get('/changecost',(req,res)=>{
    return res.render('changemenu');
});

app.get('/sendnotification',(req,res)=>{
    return res.render('sendnotification')});



app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});


