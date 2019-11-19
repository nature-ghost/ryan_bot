const global = require('../global.js');
const Promise = require("bluebird");
const debug = require("debug")('ryan-monit');
const TelegramBot = require('node-telegram-bot-api');

const MAX_MSG_TXT_LEN = 4096;
class Filter {
	constructor() {
	}
}

class Ryan_TelegramBot extends TelegramBot {
	constructor(token, options) {
		super(token, options);
		this.sendMessage = this._pageText(this.sendMessage);
	}

	/**
	 * Return a function that wraps around 'sendMessage', to
	 * add paging fanciness.
	 *
	 * @private
	 * @param  {Function} sendMessage
	 * @return {Function} sendMessage(chatId, message, form)
	 */
	_pageText(sendMessage) {
		const self = this;

		return function(chatId, message, form={}) {
			if (message.length < MAX_MSG_TXT_LEN) {
				return sendMessage.call(self, chatId, message, form);
			}

			let index = 0;
			let parts = [];
			// we are reserving 8 characters for adding the page number in
			// the following format: [01/10]
			let reserveSpace = 8;
			let shortTextLength = MAX_MSG_TXT_LEN - reserveSpace;
			let shortText;

			while ((shortText = message.substr(index, shortTextLength))) {
				parts.push(shortText);
				index += shortTextLength;
			}

			// The reserve space limits us to accommodate for not more
			// than 99 pages. We signal an error to the user.
			if (parts.length > 99) {
				debug("#sendMessage: Paging resulted into more than 99 pages");
				return new Promise(function(resolve, reject) {
					const error = new Error("Paging resulted into more than the maximum number of parts allowed");
					error.parts = parts;
					return reject(error);
				});
			}

			parts = parts.map(function(part, i) {
				return `[${i+1}/${parts.length}] ${part}`;
			});

			debug("sending message in %d pages", parts.length);
			return Promise.mapSeries(parts, function(part) {
				return sendMessage.call(self, chatId, part, form);
			});
		};
	}
}

class Utils {
	constructor() {}
}

module.exports = {Utils, Filter, Ryan_TelegramBot};


