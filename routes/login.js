const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const User = require('../models/User');

function validateEmail(email) {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}
function validatePass(pass) {
    return pass.length >= 8;
}
function validateUsername(username) {
    return username.length >= 1;
}

router.post('/', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({username});
        if (!user) {
            return res.json({
                status: 'error',
                message: 'No user with that username!',
            });
        }
        const checkPass = await bcrypt.compare(password, user.password);
        if (!checkPass) {
            return res.json({
                status: 'error',
                message: 'Incorrect password!',
            });
        }
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
        res.cookie('auth-token', token, { httpOnly: true, expires: new Date(Date.now() + 20 * 365 * 24 * 60 * 60 * 1000)});

        return res.json({
            status: 'success',
            message: 'User logged in successfully!',
        });
    } catch(err) {
        console.error(err);
    }
});

router.post('/createaccount', async (req, res) => {
    try {
        const {  username, email, password} = req.body;
        const checkUser = await User.findOne({ username });
        if (checkUser) {
            return res.json({status: 'error', message: 'Username already taken'});
        }
        if (!validateUsername(username)) return res.json({status: 'error', message: 'Username must include at least 1 character'});
        if (!validateEmail(email)) return res.json({status: 'error', message: 'Please enter a valid email'});
        if (!validatePass(password)) return res.json({status: 'error', message: 'Password must be at least 8 characters long'});

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            username,
            email,
            password: hashedPassword,
        });
        await user.save();

        const jwt_token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
        res.cookie('auth-token', jwt_token, { httpOnly: true, expires: new Date(Date.now() + 20 * 365 * 24 * 60 * 60 * 1000) }).json({ status: 'success' });

    } catch(err) {
        console.error(err);
    }
});

router.post('/changeusername', authToken, async (req, res) => {
    try {
        const { username } = req.body;
        if (!validateUsername(username)) return res.json({status: 'error', message: 'Username must include at least 1 character'});
        const checkUser = await User.findOne({ username });
        if (checkUser) {
            return res.json({status: 'error', message: 'Username already taken'});
        }
        
        const user = await User.findById(req.userId);
        if (user.username === username) {
            return res.json({
                status: 'success',
                message: 'Username was the same!',
            });
        }
        user.username = username;
        await user.save();

        return res.json({
            status: 'success',
            message: 'Username was changed successfully!',
        });
    } catch(err) {
        console.error(err);
    }
});

router.post('/changeemail', authToken, async (req, res) => {
    try {
        const { email } = req.body;
        if (!validateEmail(email)) return res.json({status: 'error', message: 'Please enter a valid email'});
        const user = await User.findById(req.userId);
        if (user.email === email) {
            return res.json({
                status: 'success',
                message: 'Email is the same!',
            });
        }
        user.email = email;
        await user.save();

        return res.json({
            status: 'success',
            message: 'Email was changed successfully!',
        });
    } catch(err) {
        console.error(err);
    }
});

router.post('/logout', authToken, async (req, res) => {
    try {
        res.cookie('auth-token', '', { expires: new Date(0) }).json({ status: 'success' });
    } catch(err) {
        console.error(err);
    }
});


function authToken(req, res, next) {
    const token = req.cookies['auth-token'];
    if (!token) return res.sendStatus(401);
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.userId = user.userId;
        next();
    });
}


module.exports = router;