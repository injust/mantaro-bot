const channels = {
	"mantaro-1": "",
	"server-logs": ""
};

const question = () => {
	let _ = document.getElementsByClassName("embedDescription-1Cuq9a");
	return _[_.length - 1].firstChild.textContent.trim().hashCode();
};

const run = async () => {
	for (let i = 0; i < config.iterations || config.iterations < 0; i++) {
		await send("mantaro-1", "->opts lobby reset").then(() => send("mantaro-1", "->game multiple trivia 5 -diff hard"));

		for (let j = 0; j < 5; j++) {
			await send("mantaro-1", answer[question()]);
		}

		if (i % 5 > 3) {
			await send("mantaro-1", "?purge 1000 <@" + config.userID + ">").then(() => send("server-logs", "?prune match " + config.userID));
		} else if (i % 10 < 3) {
			await send("mantaro-1", i % 10 < 1 ? "->fish" : i % 10 < 2 ? "->loot" : "->mine D P");
		}
	}

	await send("mantaro-1", "->opts lobby reset").then(() => send("mantaro-1", "?purge 1000 <@" + config.userID + ">")).then(() => send("server-logs", "?prune match " + config.userID));
};

const send = (channel, message) => fetch("https://discordapp.com/api/v6/channels/" + channels[channel] + "/messages", {
	body: '{"content": "' + message + '"}',
	headers: {
		Authorization: config.token,
		"Content-Type": "application/json"
	},
	method: "POST"
}).then(sleep(config.interval));

const sleep = (ms) => (x) => new Promise(resolve => setTimeout(() => resolve(x), ms));

String.prototype.hashCode = function() {
	let hash = 0;
	for (let i = 0; i < this.length; i++) {
		hash = (hash << 5) - hash + this.charCodeAt(i);
	}
	return Math.abs(hash);
};
