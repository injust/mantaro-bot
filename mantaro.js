const config = require("./config.json");
const fetch = require("node-fetch");
const hash = require("hash-code");
const lookup = require("./lookup.js");

/*******
 * API *
 *******/
const allSend = (msg) => {
	return Promise.all(Object.keys(config.users).map((user) => send(config.users[user].channel, user, msg)));
};

const api = "https://discordapp.com/api/v6";

const get = (channel, user) => fetch(api + "/channels/" + config.channels[channel] + "/messages?limit=5", {
	headers: {
		Authorization: config.users[user].token
	}
}).then((response) => response.json());

const mantaroUID = "213466096718708737";

const send = (channel, user, msg) => fetch(api + "/channels/" + config.channels[channel] + "/messages", {
	body: '{"content": "' + msg + '"}',
	headers: {
		Authorization: config.users[user].token,
		"Content-Type": "application/json"
	},
	method: "POST"
}).then(sleep(config.intervals.send));

/*****************
 * DAILY CREDITS *
 *****************/
const daily = () => {
	const userKeys = Object.keys(config.users);
	return Promise.all(userKeys.map((user) => send(config.users[user].channel, user, "->daily <@" + config.users[userKeys[user === userKeys[0] && userKeys.length > 1 ? 1 : 0]].uid + ">")));
};

/****************
 * ITEM SWEEPER *
 ****************/
const sweep = () => {
	const userKeys = Object.keys(config.users);
	return Promise.all(userKeys.map((user, i) => delay(i * config.intervals.sweep / userKeys.length).then(() => sweepUser(config.users[user].channel, user, userKeys[0]))));
};

const sweepUser = async (channel, user, primary) => {
	if (primary === user) {
		return;
	}
	await send(channel, user, "->inv");
	await get(channel, user).then(async (messages) => {
		if (msg = messages.find((msg) => msg.author.id === mantaroUID && msg.content.includes("'s inventory:** "))) {
			const inventory = msg.content.split("\n")[0].split("** ")[1].split(", ");
			for (const item of inventory) {
				[name, quantity] = item.split(" x ");
				if (name !== "💾" && name !== "⛏" && name !== "🎣" && !name.includes("lootbox:")) {
					await send(channel, user, "->itemtransfer <@" + config.users[primary].uid + "> " + name + " " + quantity).then(sleep(config.intervals.sweep - config.intervals.send));
				}
			}
		}
	});
};

/************
 * QUIZ BOT *
 ************/
const actions = ["->fish", "->loot", "->mine"];

const answer = (messages) => {
	if (msg = messages.find((msg) => msg.author.id === mantaroUID && msg.embeds.length > 0 && msg.embeds[0].author.name === "Trivia Game")) {
		const answers = msg.embeds[0].fields[0].value.split("\n").map((cand) => Math.abs(hash.hashCode(cand.slice(8, -2).trim())) & 0x7FF);
		const question = hash.hashCode(msg.embeds[0].description.slice(2, -2).trim()) >> 15 & 0xFFFF;
		return answers.indexOf(lookup[question]) + 1;
	}
};

const quiz = (games = -1) => {
	const userKeys = Object.keys(config.users);
	const jobs = [];
	const numJobs = Math.trunc(userKeys.length / config.workersPerJob);
	for (let j = 0; j < numJobs; j++) {
		for (let w = 0; w < config.workersPerJob; w++) {
			jobs.push(delay(config.intervals.send * (j / numJobs + w / config.workersPerJob)).then(() => run(config.users[userKeys[j * config.workersPerJob + w]].channel, userKeys[j * config.workersPerJob + w], games, userKeys[j * config.workersPerJob])));
		}
	}
	return Promise.all(jobs);
};

const run = async (channel, user, games, primary) => {
	await send(channel, user, "->opts lobby reset");
	for (let i = 0; i < games || games < 0; i++) {
		if (i % config.modulo < 3) {
			await send(channel, user, actions[i % config.modulo]);
		}
		await send(channel, user, "->game multiple trivia <@" + config.users[primary].uid + "> 5 -diff hard");
		for (let j = 0; j < 5; j++) {
			await get(channel, user).then((messages) => answer(messages)).then((ans) => send(channel, primary, ans));
		}
	}
};

/**************
 * REPUTATION *
 **************/
const rep = () => allSend("->rep <@" + config.users[Object.keys(config.users)[0]].uid + ">");

/*************
 * UTILITIES *
 *************/
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sleep = (ms) => (x) => new Promise((resolve) => setTimeout(() => resolve(x), ms));

/***************
 * WAIFU CLAIM *
 ***************/
const waifu = () => allSend("->waifu claim <@" + config.users[Object.keys(config.users)[0]].uid + ">");

quiz();
