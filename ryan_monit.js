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

		this.urls = [
			'https://www.clien.net/service/board/jirum',
			'https://www.clien.net/service/board/news'
		];

		// this.crawlingData = [
		// 	{
		// 		"id": "jirum",
		// 		"baseTime": new Date('2019-11-21 05:36:45').getTime(),
		// 		"url": "https://www.clien.net/service/board/jirum",
		// 		"list": []
		// 	},
		// 	{
		// 		"id": "news",
		// 		"baseTime": new Date('2019-11-21 05:36:45').getTime(),
		// 		"url": "https://www.clien.net/service/board/news",
		// 		"list": []
		// 	},
		// ];

		this.crawlingData = {
			"jirum": {
				"id": "jirum",
				"baseTime": new Date('2019-11-22 10:48:11').getTime(),
				"url": "https://www.clien.net/service/board/jirum",
				"list": [],
				"chatId": '-1001193133654'
			},
			"news": {
				"id": "news",
				"baseTime": new Date('2019-11-22 11:14:48').getTime(),
				"url": "https://www.clien.net/service/board/news",
				"list": [],
				"chatId": '-1001307416001'
			}
		};

		this.token = token;
		this.chatId = chatId;

		this.baseTime = new Date('2019-11-21 00:36:45').getTime();
		this.intervalId = undefined;

		this.getHtmlWithItem = async (item) => {
			try {
				let ret = await axios.get(item.url);
				return {passedItem: item, result: ret};
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

					let command = msg['text'];

					if (command === '/getList') {
						this.list = [];
						this.getLists();
					}
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

		console.error(msgInfo.chatId);
		let chatId = (msgInfo.id !== undefined) ? msgInfo.id : this.chatId;
		console.error('chatId : ' + chatId);
		console.error('this.chatId : ' + this.chatId);
		if ( form['parse_mode'] === undefined && !(/[^_]+_[^_]+_([^_]+)_([^_]+)/g.test(msgInfo.text))) {
			form['parse_mode'] = 'Markdown'
		}
		this.bot.sendMessage(chatId, msgInfo.text, form).then(messages => {
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

		let jobs = [];
		for(let crawlingDataKey in this.crawlingData) {
			if (this.crawlingData.hasOwnProperty(crawlingDataKey)) {
				jobs.push(this.getHtmlWithItem(this.crawlingData[crawlingDataKey]));
			}
		}

		let that = this;

		const asyncCheckingTask = async() => {
			let results = await Promise.all(jobs);

			let parsingJobs = [];

			for(let parsingItem of results) {
				parsingJobs.push(that.parsingFunction(parsingItem.passedItem, parsingItem.result));
			}

			return await Promise.all(parsingJobs)
		};


		asyncCheckingTask().then((resp) => {
			for(let respItem of resp) {
				if (Array.isArray(respItem.latestList)) {
					this.pushList(respItem);
				} else {

				}
			}
		}).catch((error) => {
			console.error(error);
		})

	}

	parsingFunction(item, html) {

		return new Promise((resolve, reject) => {
			if (item.id === "jirum") {
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
				console.error(this.crawlingData[item.id].list);
				if (this.crawlingData[item.id].list.length === 0 && data !== undefined) {
					this.crawlingData[item.id].list = data;
				}
				let latestList = this.getFilterWithType(item.id);
				let latestList_ = latestList.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
				resolve({id: item.id, latestList: latestList_});
				// resolve('Not Yet');
			} else if (item.id === "news") {
				console.error(item.id);
				let ulList = [];
				const $ = cheerio.load(html.data);
				const $bodyList = $("div.list_content").children("div.list_item");
				const host = this.host;
				$bodyList.each(function(i, elem) {
					if ( i == 0) {
						console.error($(this));
					}

					let nicknameText = $(this).find('div.list_author .nickname span').first().text();
					if (nicknameText === "") {
						nicknameText = $(this).find('div.list_author .nickname img').attr('alt')
					}
					ulList[i] = {
						title: $(this).find('div.list_title .list_subject span').first().text(),
						url: host + $(this).find('div.list_title .list_subject').attr('href'),
						nickname: {
							text: nicknameText,
							img: $(this).find('div.list_author .nickname img').attr('src')
						},
						date: $(this).find('div.list_time .time .timestamp').text()
					};
					// log($(this).find('div.list_title .list_subject a').first().text());
				});

				const data = ulList.filter(n => n.title);

				if (this.crawlingData[item.id].list.length === 0 && data !== undefined) {
					this.crawlingData[item.id].list = data;
				}
				let latestList = this.getFilterWithType(item.id);
				let latestList_ = latestList.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

				resolve({id: item.id, latestList: latestList_});
			}
		})

	}

	// getFilter() {
	// 	return this.list.filter(item => (new Date(item.date).getTime() > this.baseTime));
	// }

	getFilterWithType(type) {
		return (this.crawlingData[type].list).filter(item => (new Date(item.date).getTime() > this.crawlingData[type].baseTime));
	}

	monitPolling() {
		if (this.intervalId !== undefined) {
			clearInterval(this.intervalId);
		}

		this.intervalId = setInterval(()=> {
			try{

				for(let crawlingDataKey in this.crawlingData) {
					if (this.crawlingData.hasOwnProperty(crawlingDataKey)) {
						this.crawlingData[crawlingDataKey]['list'] = [];
					}
				}
				// this.baseTime = new Date();
				this.getLists();
			} catch (e) {
				console.error(e);
			}
		}, 1000 * 30);
	};

	pushList(latestData) {
		let id = latestData.id;
		let latestList = latestData.latestList;


		let chatId = this.crawlingData[id].chatId;

		for (let i in latestList) {
			let msg = '';
			msg += latestList[i].title + '\n';
			msg += latestList[i].url + '\n';

			this.crawlingData[id].baseTime = new Date(latestList[i].date).getTime();
			console.error(latestList[i].title + ' // baseTime : ' + this.baseTime);

			this.sendMessage({
				id: chatId,
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