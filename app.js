const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const global = require('./global.js');
const {Filter, Ryan_TelegramBot, Utils } = require('./controller/utils');

const log = console.log;
const {ryanMonit} = require('./ryan_monit');

global.util = new Utils();

// Create a new Express application.
const app = express();
app.use(express.static('public'));
global.ryanMonit = new ryanMonit(global['token'], global['chatId']);

app.listen(5544);

