const mantaro = require("./mantaro.js");
const repl = require("repl");

const exit = () => {
	mantaro.client.destroy();
	process.exit();
};

mantaro.client.on("ready", async () => {
	console.log(`Logged in as ${mantaro.client.user.tag}!`);
	if (process.argv.length > 2) {
		await mantaro[process.argv[2]]().then(() => exit());
	}
	console.log("Commands: daily, quiz, rep, sweep, waifu")
	repl.start({
		eval: (cmd, context, filename, callback) => {
			cmd = cmd.trim();
			if (cmd.length < 1) {
				return callback();
			}
			mantaro[cmd]().then(() => callback());
		},
		useGlobal: true
	});
});

process.on("SIGINT", exit).on("SIGTERM", exit);