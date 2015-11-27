## Slack Poker Bot (Korean Version) [![Build Status](https://travis-ci.org/CharlieHess/slack-poker-bot.png)](https://travis-ci.org/CharlieHess/slack-poker-bot)

이 봇은 슬랙에 텍사스 홀덤 클라이언트를 제공합니다. 2~10명의 플레이어와 함께 어떠한 channel이나 private group에서도 게임을 즐겨보세요. 포커봇은 패를 다루기도 하며, 플레이어에게 direct message로 패를 제공합니다. 또한, 판의 승패를 결정하기도 합니다.

![](https://s3.amazonaws.com/f.cl.ly/items/3w3k222T0A1o2e0d033Q/Image%202015-09-01%20at%2011.41.33%20PM.png)
![](https://s3.amazonaws.com/f.cl.ly/items/2a073W0Q1Y2N0O2U1i3p/Image%202015-09-01%20at%2011.39.28%20PM.png)

[동영상](https://www.youtube.com/watch?v=Joku-PKUObE)을 통해 확인해보세요.

## 시작하기
1. 새로운 [bot integration](https://my.slack.com/services/new/bot)을 생성합니다.
1. Heroku의 deploy 기능을 사용하거나 로컬에서 실행시킵니다.
1. 봇이 실행중일때, 다음과 같은 명령어로 게임을 시작하세요: `@<your-bot-name>: deal`

#### 원클릭으로 Heroku에서 실행하기
다음 버튼을 클릭합니다:

[![Deploy](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy)

#### Heroku 메뉴얼
1. [Heroku toolbelt](https://devcenter.heroku.com/articles/getting-started-with-nodejs#set-up)을 설치합니다.
1. 새로운 bot integration을 생성합니다 (이전 단락과 같습니다.)
1. `heroku create`
1. `heroku config:set SLACK_POKER_BOT_TOKEN=[Your API token]`
1. `git push heroku master`

#### 로컬에서 실행하기
1. `token.txt` 파일을 생성하여, API token을 붙여넣습니다.
1. `npm install`
1. `node src/main.js`

## 명령어 가이드
* 게임을 시작하시려면 다음 명령어를 입력합니다, `@<your-bot-name>: deal`.
* 게임을 종료하시려면 다음 명령어를 입력합니다, `@<your-bot-name>: quit game`. 진행중인 게임을 마지막 판으로 설정하게 됩니다.
어떠한 플레이어라도 이 명령어를 실행시킬 수 있음을 유의하세요. 현명하게 사용하시기 바랍니다.
* 봇에 옵션을 설정하시려면 다음 명령어를 입력합니다, `@<your-bot-name>: config <name-of-option>=<value>`. 지원되는 옵션은 다음과 같습니다:
```
timeout: 유저 입장 대기 시간을 초단위로 설정합니다.
timeout 없이 사용하시려면 값을 0으로 설정해주세요.
```
타임아웃 없이 게임을 시작하시는 방법은 다음과 같습니다:
```
@<your-bot-name>: config timeout=0
@<your-bot-name>: deal
```

개선 예정 사항들은 [오픈 이슈](https://github.com/CharlieHess/slack-poker-bot/issues)들을 확인해주세요.

### 인공지능 플레이어
봇은 슬랙 채널내의 유저들을 관리하기 위해 존재하지만, 인공지능 플레이어 지원 기능을 포함합니다. 봇 플레이어를 추가하는 방법은 다음과 같습니다:

1. `ai/` 폴더에 봇 클래스를 추가합니다.
1. `getAction`을 구현합니다, 이 함수는 봇의 차례일 때 호출됩니다.
1. 모든 게임마다 봇을 추가하기 위해서는 `src/bot.js` 내의 `addBotPlayers` 함수를 변형합니다.

### 테스트 방법
테스트는 간단하며, 방법은 다음과 같습니다:

1. `gulp`

The tests produce legible output that matches what users in Slack would see. This is the same test suite that is run on each pull request. This is very helpful when diagnosing a logic bug:
![](https://s3.amazonaws.com/f.cl.ly/items/2L0Y2Y3d3g0i1x171n2V/Image%202015-09-08%20at%207.00.40%20PM.png)

### 의존성
* [NodeJS Slack Client](https://github.com/slackhq/node-slack-client)
`node-slack-client` abstracts the basics of a Slack bot, including authentication, getting messages from players, and posting messages or attachments to the channel.

* [RxJS](https://github.com/Reactive-Extensions/RxJS)
The majority of this client is written using `RxJS`. It simplifies many of the complex player polling interactions, that would otherwise be Death By Timers, into very legible code.

* [Imgur](https://github.com/kaimallea/node-imgur) / [Lightweight Image Processor](https://github.com/EyalAr/lwip)
Each card is a separate image, and board images are created on the fly by pasting several cards onto a single canvas (with the help of  `lwip`). The resulting image is than uploaded to `imgur`, which gives us a single URL that can be passed as an attachment to the Slack API. This route was chosen to avoid uploading 318,505,200 images to the cloud, and allows us to modify the card assets easily.

* [Poker Evaluator](https://github.com/chenosaurus/poker-evaluator)
`poker-evaluator` is used for evaluating the winning hand when it comes time to show down. Here it has been extended to calculate the best 5-card hand from any 7-card hand.

* [MochaJS](http://mochajs.org/)
Most of the tricky client logic is backed up by tests, which were written using `MochaJS`.

* [Vector Playing Cards](https://code.google.com/p/vector-playing-cards/)
