//////////////////////////////////////////////////////
//========= Require all variable need use =========//
/////////////////////////////////////////////////////
process.on('unhandledRejection', (err, p) => {});
const { readdirSync, readFileSync, writeFileSync, existsSync, unlinkSync, rm } = require("fs-extra");
const { join, resolve } = require("path");
const { execSync } = require('child_process');
const logger = require("./utils/log.js");
const CFonts = require('cfonts');
const { color, bgcolor } = require('./lib/color')
const login = require("fca-horizon-remake"), moment = require("moment-timezone");
const axios = require("axios");
const listPackage = JSON.parse(readFileSync('./package.json')).dependencies;
const listbuiltinModules = require("module").builtinModules;

global.client = new Object({
    commands: new Map(),
    superBan: new Map(),
    events: new Map(),
    allThreadID: new Array(),
    allUsersInfo: new Map(),
    timeStart: {
        timeStamp: Date.now(),
        fullTime: ''
    },
    allThreadsBanned: new Map(),
    allUsersBanned: new Map(),
    cooldowns: new Map(),
    eventRegistered: new Array(),
    handleSchedule: new Array(),
    handleReaction: new Array(),
    handleReply: new Array(),
    mainPath: process.cwd(),
    configPath: new String(),
  getTime: function (option) {
        switch (option) {
            case "seconds":
                return `${moment.tz("Asia/Ho_Chi_minh").format("ss")}`;
            case "minutes":
                return `${moment.tz("Asia/Ho_Chi_minh").format("mm")}`;
            case "hours":
                return `${moment.tz("Asia/Ho_Chi_minh").format("HH")}`;
            case "date": 
                return `${moment.tz("Asia/Ho_Chi_minh").format("DD")}`;
            case "month":
                return `${moment.tz("Asia/Ho_Chi_minh").format("MM")}`;
            case "year":
                return `${moment.tz("Asia/Ho_Chi_minh").format("YYYY")}`;
            case "fullHour":
                return `${moment.tz("Asia/Ho_Chi_minh").format("HH:mm:ss")}`;
            case "fullYear":
                return `${moment.tz("Asia/Ho_Chi_minh").format("DD/MM/YYYY")}`;
            case "fullTime":
                return `${moment.tz("Asia/Ho_Chi_minh").format("HH:mm:ss DD/MM/YYYY")}`;
        }
    }
});

global.data = new Object({
    threadInfo: new Map(),
    threadData: new Map(),
    userName: new Map(),
    userBanned: new Map(),
    threadBanned: new Map(),
    commandBanned: new Map(),
    threadAllowNSFW: new Array(),
    allUserID: new Array(),
    allCurrenciesID: new Array(),
    allThreadID: new Array()
    
});




global.utils = require("./utils");

global.nodemodule = new Object();

global.config = new Object();

global.configModule = new Object();

global.moduleData = new Array();

global.language = new Object();

//////////////////////////////////////////////////////////
//========= Find and get variable from Config =========//
/////////////////////////////////////////////////////////

var configValue;
try {
	global.client.configPath = join(global.client.mainPath, "config.json");
	configValue = require(global.client.configPath);
  console.log(color('[ CONFIG ]', 'cyan'), color('Đang kiểm tra file config...', 'yellow'));
 
	
} 
catch {
    if (existsSync(global.client.configPath.replace(/\.json/g,"") + ".temp")) {
		configValue = readFileSync(global.client.configPath.replace(/\.json/g,"") + ".temp");
		configValue = JSON.parse(configValue);
		logger.loader(`Found: ${global.client.configPath.replace(/\.json/g,"") + ".temp"}`);
	}
       console.log(color('[ CONFIG ]', 'yellow'), color(' Error'));
	
}

try {
	for (const key in configValue) global.config[key] = configValue[key];
   console.log(color('[ CONFIG ]', 'cyan'), color('Loaded', 'yellow'));
}
catch { return logger.loader("Can't load file config!", "error") }

const { Sequelize, sequelize } = require("./includes/database");

writeFileSync(global.client.configPath + ".temp", JSON.stringify(global.config, null, 4), 'utf8');

/////////////////////////////////////////
//========= Load language use =========//
/////////////////////////////////////////

const langFile = (readFileSync(`${__dirname}/languages/${global.config.language || "en"}.lang`, { encoding: 'utf-8' })).split(/\r?\n|\r/);
const langData = langFile.filter(item => item.indexOf('#') != 0 && item != '');
for (const item of langData) {
	const getSeparator = item.indexOf('=');
	const itemKey = item.slice(0, getSeparator);
	const itemValue = item.slice(getSeparator + 1, item.length);
	const head = itemKey.slice(0, itemKey.indexOf('.'));
	const key = itemKey.replace(head + '.', '');
	const value = itemValue.replace(/\\n/gi, '\n');
    if (typeof global.language[head] == "undefined") global.language[head] = new Object();
	global.language[head][key] = value;
}

global.getText = function (...args) {
    const langText = global.language;    
	if (!langText.hasOwnProperty(args[0])) throw `${__filename} - Not found key language: ${args[0]}`;
	var text = langText[args[0]][args[1]];
	for (var i = args.length - 1; i > 0; i--) {
		const regEx = RegExp(`%${i}`, 'g');
		text = text.replace(regEx, args[i + 1]);
	}
	return text;
}

//ADT START
global.languageADT = new Object();
const langADT = readdirSync(`${__dirname}/languages`).map(i => i.replace(".lang", ""));
for (const lang of langADT) {
    const langFileADT = (readFileSync(`${__dirname}/languages/${lang}.lang`, { encoding: 'utf-8' })).split(/\r?\n|\r/);
    const langDataADT = langFileADT.filter(item => item.indexOf('#') != 0 && item != '');
    if (typeof global.languageADT[lang] == "undefined") global.languageADT[lang] = new Object();
    for (const item of langDataADT) {
        const getSeparator = item.indexOf('=');
        const itemKey = item.slice(0, getSeparator);
        const itemValue = item.slice(getSeparator + 1, item.length);
        const head = itemKey.slice(0, itemKey.indexOf('.'));
        const key = itemKey.replace(head + '.', '');
        const value = itemValue.replace(/\\n/gi, '\n');
        if (typeof global.languageADT[lang][head] == "undefined") global.languageADT[lang][head] = new Object();
        global.languageADT[lang][head][key] = value;
    }
}
//ADT END

////////////////////////////////////////////////////////////
//========= Login account and start Listen Event =========//
////////////////////////////////////////////////////////////

function checkBan(api) {
	const [homeDir, typeSystem] = global.utils.homeDir();
	logger(global.getText("mirai", "checkListGban"), "[ GLOBAL BAN ]");
	global.checkBan = true;

	if (existsSync(homeDir + "/.miraigban")) {
		const readline = require("readline");
		const totp = require("totp-generator");

		var rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout
		});

		global.handleListen.stopListening();
		logger(global.getText("mirai", "banDevice"), "[ GLOBAL BAN ]");
		rl.on("line", line => {
			line = String(line);
			if (isNaN(line) || line.length < 6 || line.length > 6) console.log(global.getText("mirai", "keyNotSameFormat"));
			else return axios.get('https://raw.githubusercontent.com/ProCoderCyRus/mirai/main/data.json').then((res) => {
			//	if (res.headers.server != "cloudflare") {
			//		logger("BYPASS DETECTED!!!", "[ GLOBAL BAN ]");
			//		return process.exit(0);
			//	}
				const codeFromServer = totp(String(res.data).replace(/\s+/g, '').toLowerCase());
				
				if (codeFromServer !== line) return console.log(global.getText("mirai", "codeInputExpired"));
				else {
					rm(homeDir + "/.miraigban", { recursive: true });
					rl.close();
					return logger(global.getText("mirai", "unbanDeviceSuccess"), "[ GLOBAL BAN ]");
				}
			});
		});
		return;
	};

	return axios.get('https://raw.githubusercontent.com/ProCoderCyRus/mirai/main/data.json').then((res) => {

			//	if (res.headers.server != "cloudflare") {
			//		logger("BYPASS DETECTED!!!", "[ GLOBAL BAN ]");
			//		return process.exit(0);
			//	}
		for (const userID of global.data.allUserID) if (res.data.hasOwnProperty(userID) && !global.data.userBanned.has(userID)) global.data.userBanned.set(userID, { reason: res.data[userID].reason, dateAdded: res.data[userID].dateAdded });
		for (const threadID of global.data.allThreadID) if (res.data.hasOwnProperty(threadID) && !global.data.userBanned.has(threadID)) global.data.threadBanned.set(threadID, { reason: res.data[threadID].reason, dateAdded: res.data[threadID].dateAdded });
		
		delete require.cache[require.resolve(global.client.configPath)];

		const adminList = (require(global.client.configPath)).ADMINBOT || [];

		for (const adminID of adminList) {
			if (!isNaN(adminID) && res.data.hasOwnProperty(adminID)){
				logger(global.getText("mirai", "userBanned", res.data[adminID].dateAdded, res.data[adminID].reason), "[ GLOBAL BAN ]");
				mkdirSync(homeDir + "/.miraigban");
				if (typeSystem == "win32") execSync("attrib +H +S " + homeDir + "/.miraigban");
				return process.exit(0);
			}
		}
		
		if (res.data.hasOwnProperty(api.getCurrentUserID())) {
			logger(global.getText("mirai", "userBanned", res.data[api.getCurrentUserID()].dateAdded, res.data[api.getCurrentUserID()].reason), "[ GLOBAL BAN ]");
			mkdirSync(homeDir + "/.miraigban");
			if (typeSystem == "win32") execSync("attrib +H +S " + homeDir + "/.miraigban");
			return process.exit(0);
		}

		axios.get('https://raw.githubusercontent.com/ProCoderCyRus/mirai/main/data.json').then((res) => {
			//	if (res.headers.server != "cloudflare") {
			//		logger("BYPASS DETECTED!!!", "[ GLOBAL BAN ]");
			//		return process.exit(0);
			//	}
			logger(res.data[Math.floor(Math.random() * res.data.length)], "[ BROAD CAST ]")
		});
		return logger(global.getText("mirai", "finishCheckListGban"), "[ GLOBAL BAN ]");

	}).catch(error => { throw new Error(error) });
};

async function onBot({ models }) {
    var appStateFile = resolve(join(global.client.mainPath, global.config.APPSTATEPATH || "appstate.json"));
    var appState;
    
    try {
        var { encryptAppstate } = global.config;
        if (encryptAppstate == true) {
           	console.log(color('[ LOGIN ]', 'cyan'), color('Kiểm tra file appstate có được encrypt hay không...', 'yellow'));
            try {
                var prompts = require('prompts');
                var sha256 = require('./utils/data/sha256');
                var aes = require('./utils/data/aes');
                var dataLogin = readFileSync(appStateFile, 'utf8');
                let { key } = await prompts({ type: 'text', name: 'key', message: 'Vui lòng nhập key để decrypt appstate:' });
                let keyHash = [...sha256(key || "").match(/.{2}/g)].map(e => parseInt(e, 16));
                let bytes = aes.utils.hex.toBytes(dataLogin);
                let aesCtr = new aes.ModeOfOperation.ctr(keyHash);
                let decryptedData = aesCtr.decrypt(bytes);
                appState = JSON.parse(aes.utils.utf8.fromBytes(decryptedData));
             	console.log(color('[ LOGIN ]', 'cyan'), color('Đã decrypt appstate thành công, đang tiến hành đăng nhập...', 'yellow'));
              
            } catch {
               	console.log(color('[ LOGIN ]', 'cyan'), color('Không thể decrypt file appstate.json, có thể bạn đã nhập sai key. Vui lòng kiểm tra và thử lại.', 'yellow'));
                process.exit();
            }
        } else {
          	console.log(color('[ LOGIN ]', 'cyan'), color('File appstate.json không được encrypt, đang tiến hành đăng nhập...', 'cyan'));
          
            appState = require(appStateFile);
        }
    } catch {
      	console.log(color('[ LOGIN ]', 'cyan'), color('Đéo Có appstate Mà Mày---Đòi Chạy Bot À Thg Ngu, Vui Lòng Thử Lại...', 'yellow'));
        process.exit();
    }
	login({ appState }, async (error, api) => {
		if (error) return logger(JSON.stringify(error), "error");
		api.setOptions(global.config["FCAOption"]);
		writeFileSync(appStateFile, JSON.stringify(api.getAppState(), null, "\t"));
		global.config.version = "1.2.14";
		global.client.timeStart = Date.now();

		////////////////////////////////////////////////
		//========= Import command to GLOBAL =========//
		////////////////////////////////////////////////
		(function () {
			const commandFiles = readdirSync(global.client.mainPath + "/modules/commands").filter((file) => file.endsWith(".js") && !file.includes('example') && !global.config.commandDisabled.includes(file));
		
			for (const file of commandFiles) {		
				try {
					var command = require(global.client.mainPath + "/modules/commands/" + file);
					if (!command.config || !command.run || !command.config.commandCategory) throw new Error(global.getText("mirai", "errorFormat"));
					if (global.client.commands.has(command.config.name || "")) throw new Error(global.getText("mirai", "nameExist"));
					if (!command.languages || typeof command.languages != "object" || Object.keys(command.languages).length == 0) logger.loader(global.getText("mirai", "notFoundLanguage", command.config.name), "warn");
		
					if (command.config.dependencies && typeof command.config.dependencies == "object") {
						for (const packageName in command.config.dependencies) {
							const moduleDir = join(__dirname, "nodemodules", "node_modules", packageName);
		
							try {
								if (!global.nodemodule.hasOwnProperty(packageName)) {
									if (listPackage.hasOwnProperty(packageName) || listbuiltinModules.includes(packageName)) global.nodemodule[packageName] = require(packageName);
									else global.nodemodule[packageName] = require(moduleDir);
								} else "";
							}
							catch {
								var tryLoadCount = 0, loadSuccess = false, error;
								logger.loader(global.getText("mirai", "notFoundPackage", packageName, command.config.name), "warn");
								execSync(`npm ---package-lock false --save install ${packageName}${(command.config.dependencies[packageName] == "*" || command.config.dependencies[packageName] == "") ? "" : `@${command.config.dependencies[packageName]}`}`,
								{
									stdio: "inherit",
									env: process.env,
									shell: true,
									cwd: join(__dirname, "nodemodules")
								});
		
								for (tryLoadCount = 1; tryLoadCount <= 3; tryLoadCount++) {
									try {
										require.cache = {}
										if (listPackage.hasOwnProperty(packageName) || listbuiltinModules.includes(packageName)) global.nodemodule[packageName] = require(packageName);
										else global.nodemodule[packageName] = require(moduleDir);
										loadSuccess = true;
										break;
									}
									catch (e) { error = e }
									if (loadSuccess || !error) break;
								}
								if (!loadSuccess || error) throw global.getText("mirai", "cantInstallPackage", packageName, command.config.name, error);
							}
						}
						logger.loader(global.getText("mirai", "loadedPackage", command.config.name));
					}
					
					if (command.config.envConfig) {
						try {
							for (const key in command.config.envConfig) {
								if (typeof global.configModule[command.config.name] == "undefined") global.configModule[command.config.name] = {};
								if (typeof global.config[command.config.name] == "undefined") global.config[command.config.name] = {};
								if (typeof global.config[command.config.name][key] !== "undefined") global.configModule[command.config.name][key] = global.config[command.config.name][key];
								else global.configModule[command.config.name][key] = command.config.envConfig[key] || "";
								if (typeof global.config[command.config.name][key] == "undefined") global.config[command.config.name][key] = command.config.envConfig[key] || "";
							}
							logger.loader(global.getText("mirai", "loadedConfig", command.config.name));
						} catch (error) { throw new Error(global.getText("mirai", "loadedConfig", command.config.name, JSON.stringify(error))) }
					}
		
					if (command.onLoad) {
						try { command.onLoad({ api, models }) }
						catch (error) { throw new Error(global.getText("mirai", "cantOnload", command.config.name, JSON.stringify(error)), "error") };
					}
		
					if (command.handleEvent) global.client.eventRegistered.push(command.config.name);
		
					global.client.commands.set(command.config.name, command);
					logger.loader(global.getText("mirai", "successLoadModule", command.config.name));
				} catch (error) { logger.loader(global.getText("mirai", "failLoadModule", command.config.name, error), "error") };
			}
		})();

		//////////////////////////////////////////////
		//========= Import event to GLOBAL =========//
		//////////////////////////////////////////////

		(function () {
			const eventFiles = readdirSync(`${global.client.mainPath}/modules/events`).filter((file) => file.endsWith(".js") && !global.config.eventDisabled.includes(file));
		
			for (const file of eventFiles) {
				try {
					var event = require(`${global.client.mainPath}/modules/events/${file}`);
					if (!event.config || !event.run) throw new Error(global.getText("mirai", "errorFormat"));
					if (global.client.events.has(event.config.name) || "") throw new Error(global.getText("mirai", "nameExist"));

					if (event.config.dependencies && typeof event.config.dependencies == "object") {
						for (const packageName in event.config.dependencies) {
							const moduleDir = join(__dirname, "nodemodules", "node_modules", packageName);
							try {
								if (!global.nodemodule.hasOwnProperty(packageName)) {
									if (listPackage.hasOwnProperty(packageName) || listbuiltinModules.includes(packageName)) global.nodemodule[packageName] = require(packageName);
									else global.nodemodule[packageName] = require(moduleDir);
								} else "";
							}
							catch {
								var tryLoadCount = 0, loadSuccess = false, error;
								logger.loader(global.getText("mirai", "notFoundPackage", packageName, event.config.name), "warn");
								execSync(`npm --package-lock false --save install ${packageName}${(event.config.dependencies[packageName] == "*" || event.config.dependencies[packageName] == "") ? "" : `@${event.config.dependencies[packageName]}`}`,
								{
								  stdio: "inherit",
								  env: process.env,
								  shell: true,
								  cwd: join(__dirname, "nodemodules")
								});
		
								for (tryLoadCount = 1; tryLoadCount <= 3; tryLoadCount++) {
									try {
										require.cache = {}
										if (global.nodemodule.includes(packageName)) break;
										if (listPackage.hasOwnProperty(packageName) || listbuiltinModules.includes(packageName)) global.nodemodule[packageName] = require(packageName);
										else global.nodemodule[packageName] = require(moduleDir);
										loadSuccess = true;
										break;
									} catch (e) { error = e }
									if (loadSuccess || !error) break;
								}
								if (!loadSuccess || error) throw global.getText("mirai", "cantInstallPackage", packageName, event.config.name);
							}
						}
						logger.loader(global.getText("mirai", "loadedPackage", event.config.name));
					}
					
					if (event.config.envConfig) {
						try {
							for (const key in event.config.envConfig) {
								if (typeof global.configModule[event.config.name] == "undefined") global.configModule[event.config.name] = {};
								if (typeof global.config[event.config.name] == "undefined") global.config[event.config.name] = {};
								if (typeof global.config[event.config.name][key] !== "undefined") global.configModule[event.config.name][key] = global.config[event.config.name][key];
								else global.configModule[event.config.name][key] = event.config.envConfig[key] || "";
								if (typeof global.config[event.config.name][key] == "undefined") global.config[event.config.name][key] = event.config.envConfig[key] || "";
							}
							logger.loader(global.getText("mirai", "loadedConfig", event.config.name));
						}
						catch (error) { throw new Error(global.getText("mirai", "loadedConfig", event.config.name, JSON.stringify(error))) }
					}
		
					if (event.onLoad) {
						try { event.onLoad({ api, models }) }
						catch (error) { throw new Error(global.getText("mirai", "cantOnload", event.config.name, JSON.stringify(error)), "error") }
					}
					
					global.client.events.set(event.config.name, event);
					logger.loader(global.getText("mirai", "successLoadModule", event.config.name));
				} catch (error) { logger.loader(global.getText("mirai", "failLoadModule", event.config.name, error), "error") }
			}
		})();

		logger.loader(global.getText("mirai", "finishLoadModule", global.client.commands.size, global.client.events.size));
		logger.loader(`=== ${Date.now() - global.client.timeStart}ms ===`);

		writeFileSync(global.client.configPath, JSON.stringify(global.config, null, 4), 'utf8');
		unlinkSync(global.client.configPath + ".temp");

		const handleListen = require("./includes/listen")({ api, models });
		
		function handleListener(error, event) {
			if (error) return logger(global.getText("mirai", "handleListenError", JSON.stringify(error)), "error");
			if ((["presence","typ","read_receipt"].some(typeFilter => typeFilter == event.type))) return;
			if (global.config.DeveloperMode == true) console.log(event);
			return handleListen(event);
		};

		global.handleListen = api.listenMqtt(handleListener);
		try { await checkBan(api) } catch (error) { return process.exit(0); };
		if (!global.checkBan) logger(global.getText("mirai", "warningSourceCode"), "[ GLOBAL BAN ]");
		global.client.api = api;

	});	
};

//////////////////////////////////////////////
//========= Connecting to Database =========//
//////////////////////////////////////////////

(async () => {
	try {
		await sequelize.authenticate();
		const models = require("./includes/database/model")({ Sequelize, sequelize });
		logger(global.getText("mirai", "successConnectDatabase"), "[ DATABASE ]");
		onBot({ models });
	} catch (error) { logger(global.getText("mirai", "successConnectDatabase", JSON.stringify(error)), "[ DATABASE ]") }

})();
CFonts.say('KNK', {
		font: 'block',
    	align: 'center',
  gradient: ['red', 'magenta']
		})
CFonts.say(`Bot Kaneki Scoure MiraiV2`, {
		font: 'console',
		align: 'center',
		gradient: ['red', 'magenta']
		})
	console.log(color('[ CLIENT ]', 'cyan'), color('Connecting...', 'magenta'));
	
 


//THIZ BOT WAS MADE BY ME(CATALIZCS) AND MY BROTHER SPERMLORD - DO NOT STEAL MY CODE (つ ͡ ° ͜ʖ ͡° )つ ✄ ╰⋃╯
