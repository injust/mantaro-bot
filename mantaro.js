/*******
 * API *
 *******/
const api = "https://discordapp.com/api/v6";

const get = (channel, user) => fetch(api + "/channels/" + config.channels[channel] + "/messages?limit=5", {
	headers: {
		Authorization: config.tokens[user]
	}
}).then((response) => response.json());

const send = (channel, user, msg) => fetch(api + "/channels/" + config.channels[channel] + "/messages", {
	body: '{"content": "' + msg + '"}',
	headers: {
		Authorization: config.tokens[user],
		"Content-Type": "application/json"
	},
	method: "POST"
}).then(sleep(config.interval));

/*****************
 * DAILY CREDITS *
 *****************/
const daily = () => Promise.all(config.jobs.map((job) => Promise.all(job.workers.map((worker) => send(worker.channel, worker.user, "->daily <@" + config.uid[config.jobs[worker.user === config.jobs[0].primary && config.jobs.length > 1 ? 1 : 0].primary] + ">")))));

/****************
 * ITEM SWEEPER *
 ****************/
const sweep = () => Promise.all(config.jobs.map((job) => Promise.all(job.workers.map((worker) => sweepUser(worker.channel, worker.user, config.jobs[0].primary)))));

const sweepUser = async (channel, user, primary) => {
	if (primary === user) {
		return;
	}
	await send(channel, user, "->inv");
	await get(channel, user).then(async (messages) => {
		if (msg = messages.find((msg) => msg.author.id === config.uid.mantaro && msg.content.includes("'s inventory:** "))) {
			const inventory = msg.content.split("\n")[0].split("** ")[1].split(", ");
			for (const item of inventory) {
				[name, quantity] = item.split(" x ");
				if (name !== "💾" && name !== "⛏" && name !== "🎣" && !name.includes("lootbox:")) {
					await send(channel, user, "->itemtransfer <@" + config.uid[primary] + "> " + name + " " + quantity).then(sleep(23000));
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
	if (msg = messages.find((msg) => msg.author.id === config.uid.mantaro && msg.embeds.length > 0 && msg.embeds[0].author.name === "Trivia Game")) {
		const answers = msg.embeds[0].fields[0].value.split("\n").map((cand) => Math.abs(cand.slice(8, -2).trim().hashCode()) & 0x7FF);
		const question = msg.embeds[0].description.slice(2, -2).trim().hashCode() >> 15 & 0xFFFF;
		return answers.indexOf(lookup[question]) + 1;
	}
};

const lookup = {};

const quiz = (games = -1) => Promise.all(config.jobs.map((job, i) => delay(Math.trunc(i * config.interval / config.jobs.length)).then(() => Promise.all(job.workers.map((worker, i) => delay(Math.trunc(i * config.interval / job.workers.length)).then(() => run(worker.channel, worker.user, games, job.primary)))))));

const run = async (channel, user, games, primary) => {
	await send(channel, user, "->opts lobby reset");
	for (let i = 0; i < games || games < 0; i++) {
		if (i % config.modulo < 3) {
			await send(channel, user, actions[i % config.modulo]);
		}
		await send(channel, user, "->game multiple trivia <@" + config.uid[primary] + "> 5 -diff hard");
		for (let j = 0; j < 5; j++) {
			await get(channel, user).then((messages) => answer(messages)).then((ans) => send(channel, primary, ans));
		}
	}
};

/*************
 * UTILITIES *
 *************/
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sleep = (ms) => (x) => new Promise((resolve) => setTimeout(() => resolve(x), ms));

String.prototype.hashCode = function() {
	let hash = 0;
	for (let i = 0; i < this.length; i++) {
		hash = (hash << 5) - hash + this.charCodeAt(i) | 0;
	}
	return hash;
};
