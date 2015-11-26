require('babel/register');
var http = require('http');

try {
  var fs = require('fs');
  var pathToken = process.env.SLACK_POKER_BOT_TOKEN;
  var token = pathToken || fs.readFileSync('token.txt', 'utf8').trim();
} catch (error) {
  console.log("API 토큰이 'token.txt' 파일에 있어야합니다. 파일이 존재하지 않습니다.");
  return;
}

var Bot = require('./bot');
var bot = new Bot(token);
bot.login();

// Heroku requires the process to bind to this port within 60 seconds or it is killed
http.createServer(function(req, res) {
  res.end('SLACK_POKER_BOT');
}).listen(process.env.PORT || 5000)
