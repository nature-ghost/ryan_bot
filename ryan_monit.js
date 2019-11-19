const axios = require("axios");
const cheerio = require("cheerio");
const log = console.log;
const {Filter, Ryan_TelegramBot, Utils } = require('./controller/utils');
const global = require('./global.js');

class ryan_monit {
	constructor(token, chatId, host_="https://www.clien.net", target_url_ = "https://www.clien.net/service/board/jirum") {
		this.list = [];

		this.host = host_;
		this.url = target_url_;
		this.token = token;
		this.chatId = chatId;

		this.baseTime = new Date('2019-11-19 20:00:00');

		this.intervalId = undefined;

		this.getHtml = async () => {
			try {
				return await axios.get(this.url);
			} catch (error) {
				console.error(error);
			}
		};

		this.createBot();

		this.getLists();

		setTimeout( ()=> this.monitPolling(), 1000);
	}

	createBot() {
		this.bot = new Ryan_TelegramBot(this.token, { polling: true });

		this.addListener();
		this.bot.sendMessage(this.chatId, '[Telegram Chat Bot started......]');
	}

	addListener() {
		this.bot.on('channel_post', (msg) => {
			try {
				if (typeof msg !== undefined) {
					this.message_id = msg['message_id'];
					console.error(msg);
				}
			} catch(e) {
				console.error('ERROR[channel_post]');
				console.error(e);
			}
		});

		this.bot.on('polling_error', (msg) => {console.log(msg)});

		this.bot.on('error', (error) => {console.error(error)});

		this.bot.on('callback_query', (msg) => {
			console.error(msg);
		});

	}

	sendMessage(msgInfo) {
		// global.bot.sendMessage(global.chatId, "test");



		let form = msgInfo.form || {};
		if (form['reply_markup'] === undefined) {
			form['reply_markup'] = {};
		}

		if ( form['parse_mode'] === undefined && !(/[^_]+_[^_]+_([^_]+)_([^_]+)/g.test(msgInfo.text))) {
			form['parse_mode'] = 'Markdown'
		}
		this.bot.sendMessage(this.chatId, msgInfo.text, form).then(messages => {
			// Do Nothing
		}).catch(error => {
			// console.error(JSON.stringify(error.message));
			this.bot.sendMessage(this.chatId, error.message);
		});



		/**
		 * answerCallbackQuery
		 * {object} showAnswer

		 {
		 	{number|string} id query id
		 	{string} text
		 	{boolean} showAlert
		 }
		 **/
		if (typeof msgInfo['showAnswer'] !== undefined && typeof msgInfo['showAnswer'] === "object") {
			this.answerCallbackQuery(msgInfo.showAnswer).then(resp => {
				console.error(resp);
			})
		}
	}



	/**
	 * answerCallbackQuery
	 * @param {object} answerMsgInfo
	 * @returns {*|Promise}
	 */
	answerCallbackQuery(answerMsgInfo) {
		return this.bot.answerCallbackQuery(answerMsgInfo.id,
			{
				text: answerMsgInfo.text,
				show_alert: (typeof answerMsgInfo['showAlert'] !== undefined) ? answerMsgInfo['showAlert'] : false,
				parse_mode: 'Markdown'
			}
		)
	}

	getLists() {
		this.getHtml().then(html => {
			let ulList = [];
			const $ = cheerio.load(html.data);
			const $bodyList = $("div.contents_jirum").children("div.list_item");
			const host = this.host;
			$bodyList.each(function(i, elem) {
				// log(test[0]['children']);
				ulList[i] = {
					title: $(this).find('div.list_title .list_subject a').first().text(),
					url: host + $(this).find('div.list_title .list_subject a').attr('href'),
					image_url: $(this).find('div.list_img .list_image img').attr('src'),
					date: $(this).find('div.list_time .time .timestamp').text()
				};
				// }

			});

			const data = ulList.filter(n => n.title);
			return data;
		}).then(res => {
			// console.error(res);
			if (this.list.length === 0 && res !== undefined) {
				this.list = res;
			}
			let latestList = this.getFilter();

			this.pushList(latestList);
		});
	}

	getFilter() {
		return this.list.filter(item => (new Date(item.date) >= this.baseTime));
	}

	monitPolling() {
		if (this.intervalId !== undefined) {
			clearInterval(this.intervalId);
		}

		// Interval 10 minutes
		// this.intervalId = setInterval(function() {
		// 	try {
		// 		controller.checkApiController.checkInhouseAPI(false);
		// 	} catch (e) {
		// 		console.error('[monitPolling] Error checkInhouseAPI');
		// 		console.error(e);
		// 	}
		// }, (1000 * 60) * 10);

		this.intervalId = setInterval(()=> {
			try{
				// this.baseTime = new Date();
				this.getLists();
			} catch (e) {
				console.error(e);
			}
		}, 1000 * 30);
	};

	pushList(latestList) {
		console.error('latestList');
		console.error(latestList);


		for (let i in latestList) {
			let msg = '';
			msg += latestList[i].title + '\n';
			msg += latestList[i].url + '\n';
			this.baseTime = new Date(latestList[i].date);
			this.sendMessage({
				id: this.chatId,
				text: msg,
				form: {
					// parse_mode: 'Markdown',
					disable_web_page_preview: false
				},
				showAnswer: false
			});
		}


	}
};

module.exports = {ryanMonit: ryan_monit};