const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.json({
        success: true,
        botUsername: process.env.BOT_USERNAME || null
    });
});

module.exports = router;
