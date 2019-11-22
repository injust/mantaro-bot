/****************
 * API & CONFIG *
 ****************/
const api = "https://discordapp.com/api/v6";

const get = (channel, user) => fetch(api + "/channels/" + config.channels[channel] + "/messages?limit=5", {
	headers: {
		Authorization: config.tokens[user]
	}
}).then((response) => response.json());

const send = (channel, msg, user) => fetch(api + "/channels/" + config.channels[channel] + "/messages", {
	body: '{"content": "' + msg + '"}',
	headers: {
		Authorization: config.tokens[user],
		"Content-Type": "application/json"
	},
	method: "POST"
}).then(sleep(config.interval));

/**************************
 * ITEM SWEEPING: sweep() *
 **************************/
const sweep = () => config.jobs.forEach(job => job.workers.forEach(worker => {
	if (worker.user !== "injust") {
		sweepUser(worker.channel, worker.user);
	}
}));

const sweepUser = async (channel, user) => {
	await send(channel, "->inv", user);

	await get(channel, user).then(async (messages) => {
		if (msg = messages.find((msg) => msg.author.id === "213466096718708737" && msg.content.includes("'s inventory:** "))) {
			const inventory = msg.content.split("\n")[0].split("** ")[1].split(", ");
			for (const item of inventory) {
				[name, quantity] = item.split(" x ");
				if (name !== "💾" && name !== "⛏" && name !== "🎣" && !name.includes("lootbox:")) {
					await send(channel, "->itemtransfer <@" + config.uid.injust + "> " + name + " " + quantity, user).then(sleep(22000));
				}
			}
		}
	});
};

/************************
 * QUIZ BOTTING: quiz() *
 ************************/
const actions = ["->fish", "->loot", "->mine"];

const answer = (messages) => {
	if (msg = messages.find((msg) => msg.author.id === "213466096718708737" && msg.embeds.length > 0 && msg.embeds[0].author.name === "Trivia Game")) {
		const answers = msg.embeds[0].fields[0].value.split("\n").map((cand) => Math.abs(cand.slice(8, -2).trim().hashCode()) & 0x7FF);
		const question = msg.embeds[0].description.slice(2, -2).trim().hashCode() >> 15 & 0xFFFF;
		return answers.indexOf(lookup[question]) + 1;
	}
};

const dispatch = (job) => job.workers.forEach((worker, i) => setTimeout(() => start(worker.channel, job.primary, worker.user), Math.trunc(i * config.interval / job.workers.length)));

const quiz = () => config.jobs.forEach((job, i) => setTimeout(() => dispatch(job), Math.trunc(i * config.interval / config.jobs.length)));

const start = async (channel, primary, user) => {
	await send(channel, "->opts lobby reset", user);
	await send(channel, "->daily <@" + config.uid[user === "injust" ? "three" : "injust"] + ">", user);

	for (let i = 0;; i++) {
		if (i % config.modulo < 3) {
			await send(channel, actions[i % config.modulo], user);
		}

		await send(channel, "->game multiple trivia <@" + config.uid[primary] + "> 5 -diff hard", user);

		for (let j = 0; j < 5; j++) {
			await get(channel, user).then((messages) => answer(messages)).then((ans) => send(channel, ans, primary));
		}
	}
};

/*************
 * UTILITIES *
 *************/
const sleep = (ms) => (x) => new Promise((resolve) => setTimeout(() => resolve(x), ms));

String.prototype.hashCode = function() {
	let hash = 0;
	for (let i = 0; i < this.length; i++) {
		hash = (hash << 5) - hash + this.charCodeAt(i) | 0;
	}
	return hash;
};
