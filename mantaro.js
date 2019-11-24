const config = require("./config.json");
const fetch = require("node-fetch");
const { hashCode } = require("hash-code");
const { lookup } = require("./lookup.js");

/***********
 * EXPORTS *
 ***********/
exports.daily = () => {
	const workers = Object.keys(config.workers);
	return Promise.all(workers.map((worker) => send(config.workers[worker].channel, worker, `->daily <@${config.workers[workers[worker === workers[0] && workers.length > 1 ? 1 : 0]].id}>`)));
};

exports.quiz = () => {
	const workers = Object.keys(config.workers);
	const jobs = [];
	const numJobs = Math.trunc(workers.length / config.workersPerJob);
	for (let j = 0; j < numJobs; j++) {
		for (let w = 0; w < config.workersPerJob; w++) {
			jobs.push(sleep(config.intervals.send * (j / numJobs + w / config.workersPerJob)).then(() => run(config.workers[workers[j * config.workersPerJob + w]].channel, workers[j * config.workersPerJob + w], workers[j * config.workersPerJob])));
		}
	}
	return Promise.all(jobs);
};

exports.rep = () => allSend(`->rep <@${config.workers[Object.keys(config.workers)[0]].id}>`);

exports.sweep = () => {
	const workers = Object.keys(config.workers);
	return Promise.all(workers.map((worker, i) => sleep(i * config.intervals.sweep / workers.length).then(() => sweepUser(config.workers[worker].channel, worker, workers[0]))));
};

exports.waifu = () => allSend(`->waifu claim <@${config.workers[Object.keys(config.workers)[0]].id}>`);

/*******
 * API *
 *******/
const allSend = (msg) => {
	return Promise.all(Object.keys(config.workers).map((worker) => send(config.workers[worker].channel, worker, msg)));
};

const api = "https://discordapp.com/api/v6";

const get = (channel, worker, filter) => fetch(`${api}/channels/${config.channels[channel].id}/messages?limit=5`, {
	headers: {
		Authorization: config.workers[worker].token
	}
}).then((response) => response.json()).then((messages) => messages.find(filter));

const mantaroID = "213466096718708737";

const send = (channel, worker, msg) => {
	console.log(`@${worker} in #${channel}: ${msg}`);
	return fetch(`${api}/channels/${config.channels[channel].id}/messages`, {
		body: `{"content": "${msg}"}`,
		headers: {
			Authorization: config.workers[worker].token,
			"Content-Type": "application/json"
		},
		method: "POST"
	});
};

/****************
 * ITEM SWEEPER *
 ****************/
const sweepUser = async (channel, worker, primary) => {
	if (primary === worker) {
		return;
	}
	await send(channel, worker, "->inv");
	await sleep(config.intervals.send);
	await get(channel, worker, (msg) => msg.author.id === mantaroID && msg.content.includes("'s inventory:** ")).then(async (msg) => {
		const inventory = msg.content.split("\n")[0].split("** ")[1].split(", ");
		for (const item of inventory) {
			[name, quantity] = item.split(" x ");
			if (name !== "💾" && name !== "⛏" && name !== "🎣" && !name.includes("lootbox:")) {
				await send(channel, worker, `->itemtransfer <@${config.workers[primary].id}> ${name} ${quantity}`);
				await sleep(config.intervals.sweep);
			}
		}
	});
};

/************
 * QUIZ BOT *
 ************/
const actions = ["->fish", "->loot", "->mine"];

const answer = (msg) => {
	const answers = msg.embeds[0].fields[0].value.split("\n").map((cand) => Math.abs(hashCode(cand.slice(8, -2).trim())) & 0x7FF);
	const question = hashCode(msg.embeds[0].description.slice(2, -2).trim()) >> 15 & 0xFFFF;
	return answers.indexOf(lookup[question]) + 1;
};

const run = async (channel, worker, primary) => {
	await send(channel, worker, "->opts lobby reset");
	await sleep(config.intervals.send);
	for (let i = 0;; i++) {
		if (i % config.modulo < 3) {
			await send(channel, worker, actions[i % config.modulo]);
			await sleep(config.intervals.send);
		}
		await send(channel, worker, `->game multiple trivia <@${config.workers[primary].id}> 5 -diff hard`);
		await sleep(config.intervals.send);
		for (let j = 0; j < 5; j++) {
			await get(channel, worker, (msg) => msg.author.id === mantaroID && msg.embeds.length > 0 && msg.embeds[0].author.name === "Trivia Game").then((msg) => send(channel, primary, answer(msg)));
			await sleep(config.intervals.send);
		}
	}
};

/*************
 * UTILITIES *
 *************/
const delay = (ms) => (x) => new Promise((resolve) => setTimeout(() => resolve(x), ms));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
