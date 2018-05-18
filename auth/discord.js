var express = require('express');
var passport = require('passport');

var router = express.Router();

router.get('/discord', passport.authenticate('discord'));
router.get('/discord/callback',
    passport.authenticate('discord', { failureRedirect: '/login' }),
    function (req, res) {
        res.redirect('/');
    }
);

module.exports = router;