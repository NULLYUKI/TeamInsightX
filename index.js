import { Tooltip } from "./js/tooltip";
import { LoadDataInfo } from "./js/LoadDataInfo";
import { DataQuery } from "./js/DataQuery";
import { Translator } from "./js/Translator.js";
import "./css/resource.css";
const delay = (t) => new Promise((r) => setTimeout(r, t));
let playerManager = document.getElementById("lol-uikit-layer-manager-wrapper");

let tooltip_ = null;
const LoadDataInfo_ = new LoadDataInfo();
const DataQuery_ = new DataQuery();
let Translator_ = null;
let userLanguage = null;
const tooltips = [];

const version = "0.1.9";

/**
 * 
 * @param {string} server Language
 * @returns 
 */
async function updateInfo(server) {
  let info = null;


  const session = await fetch("/lol-champ-select/v1/session").then((response) => response.json());
  let team = session.myTeam;
  console.log(gameMode_);
  if (server!='zh-CN') {
    do {
      info = await DataQuery_.sendRequest("get","//riotclient/chat/v5/participants/champ-select");
      await delay(500);
    } while (info.participants.length===0||!info);
  team = [];
  for (const [index, participant] of info.participants.entries()) {
    let summonerId = await DataQuery_.queryPlayerSummonerId(participant.name);
    team.push({
      summonerId : summonerId,
      puuid : participant.puuid
    })
   }
  }
  const summonerIds = [];
  const puuids = [];
  const names = [];
  const levels = [];
  const status = [];
  const playerRanks = [];
  const leaguePoints = [];
  const playerRanks_Mode = [];
  const divisionS = [];
  for (const item of team) {
    if (item.summonerId == 0) {
      continue;
    }
    const [name, statusText, level, puuid] = await DataQuery_.queryPlayerInfo(item.summonerId);
    const [LP, Rank, Type, division] = await DataQuery_.queryRank(puuid);
    summonerIds.push(item.summonerId);
    puuids.push(puuid);
    names.push(name);
    levels.push(level);
    status.push(statusText);
    playerRanks.push(Rank);
    leaguePoints.push(LP);
    playerRanks_Mode.push(Type);
    divisionS.push(division);
  }
  return [summonerIds, puuids, names, levels, status, playerRanks, leaguePoints, playerRanks_Mode, divisionS];
}

function unmount() {
  console.log("卸载模块");
  tooltips.forEach((tool) => {
    tool.umount();
  });
  tooltips.length = 0;
}

function isPromise(obj) { 
return obj instanceof Promise || (obj && typeof obj.then === 'function');
}

/**
 *
 * @param {string} puuid
 * @param {number} begIndex
 * @param {number} endIndex
 * @param {object} tool
 * @returns
 */

async function add(puuid, begIndex, endIndex, tool) {
  const matchData = await DataQuery_.queryMatch(puuid, begIndex, endIndex);
  let k = 0,
    d = 0,
    a = 0;
  for (let i = 0; i <= endIndex; i++) {
    const heroIcon = LoadDataInfo_.getChampionPath(matchData.championId[i]);
    const spell1Id = LoadDataInfo_.getSpellPath(matchData.spell1Id[i]);
    const spell2Id = LoadDataInfo_.getSpellPath(matchData.spell2Id[i]);
    const wins = matchData.winList[i];
    const kills = matchData.killList[i];
    const deaths = matchData.deathsList[i];
    const assist = matchData.assistsList[i];
    let items_id = matchData.items[i];
    const items_path = [];
    const minions = matchData.Minions[i];
    const glod = matchData.gold[i];
    const mode = matchData.gameMode[i];
    const win_t = Translator_.getWinText(wins);
    if (!items_id||isPromise(items_id)) {
      return false;
    }
      items_id.forEach((data) => {
        items_path.push(LoadDataInfo_.getItemIconPath(data));
      });


    const str = await DataQuery_.queryGameMode(mode).catch(console.error);
    tool.appendMatchRecord(heroIcon, spell1Id, spell2Id, wins, str?str:"Other", kills, deaths, assist, items_path, minions, glod, win_t);
    (k = k + kills), (d = d + deaths), (a = a + assist);
  }
  return (k + a) / d;
}

//GameMode
let gameMode_ = "";

/**
 * copying balance-buff-viewer
 * @returns
 */
function isValidGameMode() {
  return gameMode_ === "aram" || gameMode_ === "urf";
}

/**
 *
 * @param {string} summonerId
 * @param {string} puuid
 * @param {string} name
 * @param {number} level
 * @param {string} status
 * @param {string} Rank
 * @param {number} LP
 * @param {string} Mode
 * @param {string} divisionS
 * @param {Element} el
 * @returns obj
 */
async function mountDisplay(summonerId, puuid, name, level, status, Rank, LP, Mode, divisionS, el) {
  console.log(name, puuid);
  const [level_t, privacy_t, privacy_status] = Translator_.getTitleText(status);
  const [rank1_t, type1_t] = Translator_.getText(Rank[0], Mode[0]);
  const [rank2_t, type2_t] = Translator_.getText(Rank[1], Mode[1]);
  const match_t = Translator_.getMatchTitleText();
  const tooltip = new Tooltip(playerManager);
  tooltips.push(tooltip); //addtooltips
  tooltip.mount(
    el,
    "right",
    name,
    level_t +
    ":" +
    level +
    "\t" +
    privacy_t +
    ":" +
    privacy_status +
    "\n" +
    type1_t +
    ":" +
    rank1_t +
    "|" +
    divisionS[0] +
    "\t" +
    "LP:" +
    LP[0] +
    "\n" +
    type2_t +
    ":" +
    rank2_t +
    "|" +
    divisionS[1] +
    "\t" +
    "LP:" +
    LP[1] +
    "\nversion:" +
    version,
    match_t
  );
  while(!add(puuid, 0, 4, tooltip)){
    await delay(100);
  }
  tooltip.repositionElement(el, "right");
  tooltip.hide();
  return tooltip;
}

async function mount() {
  const [summonerId, puuid, name, level, status, Rank, LP, Mode, divisionS] = await updateInfo(userLanguage);
  const session = await fetch("/lol-gameflow/v1/session").then((r) => r.json());
  gameMode_ = session.map.gameMode.toLowerCase(); //setGameMode
  console.log(await DataQuery_.queryPlayerSummonerId("Volibear 0"));
  let summoners;
  do {
    await delay(100);
    summoners = document.querySelector(".summoner-array.your-party").querySelectorAll(".summoner-wrapper.visible.left");
  } while (!summoners);
  for (const [index, el] of summoners.entries()) {
   // player-name-wrapper ember-view
   // const LocalName = el.querySelector(".player-name__summoner").textContent;
    let lname = name[index];
   /* if (name[index] !== LocalName) {
      lname = name[index] + "(" + LocalName + ")";
    }*/
    let tooltip = await mountDisplay(
      summonerId[index],
      puuid[index],
      lname,
      level[index],
      status[index],
      Rank[index],
      LP[index],
      Mode[index],
      divisionS[index],
      el
    );
    el.addEventListener("mouseout", () => tooltip.hide());
    el.addEventListener(isValidGameMode() ? "contextmenu" : "mouseover", async() =>  {
      
      tooltip.show();
      tooltip.repositionElement(el, "right");
    });

  }
}

function setPlay(el) {
  const span = el.querySelector("span");
  el.addEventListener("mouseout", () => {
    span.textContent = "PLAY";
  });
  el.addEventListener("mouseover", () => {
    span.textContent = "Insight";
  });
}

async function load() {
  do {
    await delay(100);
    playerManager = document.getElementById("lol-uikit-layer-manager-wrapper");
  } while (!playerManager);
  userLanguage = document.body.dataset["locale"];
  Translator_ = new Translator(userLanguage);
  let paly = document.querySelector(".play-button-content");
  setPlay(paly);
  LoadDataInfo_.initUi();
  console.log(userLanguage);
  console.log("TeamInsightX\t\t" + version);
  console.log("更新数据\t->\t" + (await LoadDataInfo_.update()));
  const link = document.querySelector('link[rel="riot:plugins:websocket"]');
  const ws = new WebSocket(link.href, "wamp");

  const EP_GAMEFLOW = "OnJsonApiEvent/lol-gameflow/v1/gameflow-phase".replace(/\//g, "_");

  ws.onopen = () => {
    ws.send(JSON.stringify([5, EP_GAMEFLOW]));
  };

  ws.onmessage = (e) => {
    const [, endpoint, { data }] = JSON.parse(e.data);
    if (data === "ChampSelect") {
      mount();
    } else if (data === "None" || data === "Matchmaking" || data === "GameStart" || data == "EndOfGame") {
      unmount();
    }
    console.log(endpoint, data);
  };
}

window.addEventListener("load", load);
957123