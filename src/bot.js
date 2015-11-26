const rx = require('rx');
const _ = require('underscore-plus');

const Slack = require('slack-client');
const SlackApiRx = require('./slack-api-rx');
const TexasHoldem = require('./texas-holdem');
const MessageHelpers = require('./message-helpers');
const PlayerInteraction = require('./player-interaction');

const WeakBot = require('../ai/weak-bot');
const AggroBot = require('../ai/aggro-bot');

class Bot {
  // Public: Creates a new instance of the bot.
  //
  // token - An API token from the bot integration
  constructor(token) {
    this.slack = new Slack(token, true, true);

    this.gameConfig = {};
    this.gameConfigParams = ['timeout'];
  }

  // Public: Brings this bot online and starts handling messages sent to it.
  login() {
    rx.Observable.fromEvent(this.slack, 'open')
      .subscribe(() => this.onClientOpened());

    this.slack.login();
    this.respondToMessages();
  }

  // Private: Listens for messages directed at this bot that contain the word
  // 'deal,' and poll players in response.
  //
  // Returns a {Disposable} that will end this subscription
  respondToMessages() {
    let messages = rx.Observable.fromEvent(this.slack, 'message')
      .where(e => e.type === 'message');

    let atMentions = messages.where(e =>
      MessageHelpers.containsUserMention(e.text, this.slack.self.id));

    let disp = new rx.CompositeDisposable();

    disp.add(this.handleDealGameMessages(messages, atMentions));
    disp.add(this.handleConfigMessages(atMentions));

    return disp;
  }

  // Private: Looks for messages directed at the bot that contain the word
  // "deal." When found, start polling players for a game.
  //
  // messages - An {Observable} representing messages posted to a channel
  // atMentions - An {Observable} representing messages directed at the bot
  //
  // Returns a {Disposable} that will end this subscription
  handleDealGameMessages(messages, atMentions) {
    return atMentions
      .where(e => e.text && e.text.toLowerCase().match(/\bdeal\b/))
      .map(e => this.slack.getChannelGroupOrDMByID(e.channel))
      .where(channel => {
        if (this.isPolling) {
          return false;
        } else if (this.isGameRunning) {
          channel.send('실행중인 게임을 먼저 종료해주세요.');
          return false;
        }
        return true;
      })
      .flatMap(channel => this.pollPlayersForGame(messages, channel))
      .subscribe();
  }

  // Private: Looks for messages directed at the bot that contain the word
  // "config" and have valid parameters. When found, set the parameter.
  //
  // atMentions - An {Observable} representing messages directed at the bot
  //
  // Returns a {Disposable} that will end this subscription
  handleConfigMessages(atMentions) {
    return atMentions
      .where(e => e.text && e.text.toLowerCase().includes('config'))
      .subscribe(e => {
        let channel = this.slack.getChannelGroupOrDMByID(e.channel);

        e.text.replace(/(\w*)=(\d*)/g, (match, key, value) => {
          if (this.gameConfigParams.indexOf(key) > -1 && value) {
            this.gameConfig[key] = value;
            channel.send(`게임 ${key} 이(가) ${value} 로 설정되었습니다.`);
          }
        });
      });
  }

  // Private: Polls players to join the game, and if we have enough, starts an
  // instance.
  //
  // messages - An {Observable} representing messages posted to the channel
  // channel - The channel where the deal message was posted
  //
  // Returns an {Observable} that signals completion of the game
  pollPlayersForGame(messages, channel) {
    this.isPolling = true;

    return PlayerInteraction.pollPotentialPlayers(messages, channel)
      .reduce((players, id) => {
        let user = this.slack.getUserByID(id);
        channel.send(`${user.name} 님이 게임에 참여합니다.`);

        players.push({id: user.id, name: user.name});
        return players;
      }, [])
      .flatMap(players => {
        this.isPolling = false;
        this.addBotPlayers(players);

        let messagesInChannel = messages.where(e => e.channel === channel.id);
        return this.startGame(messagesInChannel, channel, players);
      });
  }

  // Private: Starts and manages a new Texas Hold'em game.
  //
  // messages - An {Observable} representing messages posted to the channel
  // channel - The channel where the game will be played
  // players - The players participating in the game
  //
  // Returns an {Observable} that signals completion of the game
  startGame(messages, channel, players) {
    if (players.length <= 1) {
      channel.send('플레이어 수가 충분하지 않습니다. 다시 시도해주세요.');
      return rx.Observable.return(null);
    }

    channel.send(`${players.length} 명의 플레이어가 모였습니다. 게임을 시작합니다.`);
    this.isGameRunning = true;

    let game = new TexasHoldem(this.slack, messages, channel, players);
    _.extend(game, this.gameConfig);

    // Listen for messages directed at the bot containing 'quit game.'
    let quitGameDisp = messages.where(e => MessageHelpers.containsUserMention(e.text, this.slack.self.id) &&
      e.text.toLowerCase().match(/quit game/))
      .take(1)
      .subscribe(e => {
        // TODO: Should poll players to make sure they all want to quit.
        let player = this.slack.getUserByID(e.user);
        channel.send(`${player.name} 님이 게임을 나가기로 하셨습니다. 이번 판 이후로 이 게임은 종료됩니다.`);
        game.quit();
      });

    return SlackApiRx.openDms(this.slack, players)
      .flatMap(playerDms => rx.Observable.timer(2000)
        .flatMap(() => game.start(playerDms)))
      .do(() => {
        quitGameDisp.dispose();
        this.isGameRunning = false;
      });
  }

  // Private: Adds AI-based players (primarily for testing purposes).
  //
  // players - The players participating in the game
  addBotPlayers(players) {
    //let bot1 = new WeakBot('Phil Hellmuth');
    //players.push(bot1);

    //let bot2 = new AggroBot('Phil Ivey');
    //players.push(bot2);
  }

  // Private: Save which channels and groups this bot is in and log them.
  onClientOpened() {
    this.channels = _.keys(this.slack.channels)
      .map(k => this.slack.channels[k])
      .filter(c => c.is_member);

    this.groups = _.keys(this.slack.groups)
      .map(k => this.slack.groups[k])
      .filter(g => g.is_open && !g.is_archived);

    this.dms = _.keys(this.slack.dms)
      .map(k => this.slack.dms[k])
      .filter(dm => dm.is_open);

    console.log(`슬랙에 오신 것을 환영합니다. 회원님은 ${this.slack.team.name} 팀의 ${this.slack.self.name} 님 입니다.`);

    if (this.channels.length > 0) {
      console.log(`참여하고 계신 채널: ${this.channels.map(c => c.name).join(', ')}`);
    } else {
      console.log('회원님은 현재 참여하고 계신 채널이 없습니다.');
    }

    if (this.groups.length > 0) {
      console.log(`참여하고 계신 그룹: ${this.groups.map(g => g.name).join(', ')}`);
    }

    if (this.dms.length > 0) {
      console.log(`직접 대화중인 멤버: ${this.dms.map(dm => dm.name).join(', ')}`);
    }
  }
}

module.exports = Bot;
