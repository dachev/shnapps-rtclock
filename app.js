var about = [
  {
    name  : 'require',
    items : [
      {name:'express', link:'https://github.com/visionmedia/express'},
      {name:'ejs',     link:'https://github.com/visionmedia/ejs'},
      {name:'faye',    link:'https://github.com/jcoglan/faye'}
    ]
  },
  {
    name  : 'credits',
    items : [
      {name:'fonts',   link:'http://www.font-zone.com/download.php?fid=1520'},
      {name:'clock',   link:'http://blog.briancavalier.com/css3-digital-clock'},
      {name:'icons',   link:'http://www.deleket.com/softscraps.html'},
      {name:'bubbles', link:'http://boedesign.com/blog/2009/07/11/growl-for-jquery-gritter/'},
      {name:'xul.css', link:'http://infrequently.org/2009/08/css-3-progress/'}
    ]
  }
];

module.exports = {
  name   : 'rtclock',
  rest   : null,
  about  : about,
  init   : init
};

function init(server, pubsub) {
  var express = require('express');
  var ejs     = require('ejs');
  var rest    = express.createServer();
  
  rest.use(express.static(__dirname + '/public'));
  
  // configure views
  rest.set('views', __dirname + '/views');
  rest.register('.html', ejs);
  rest.set('view engine', 'html');
  rest.helpers({
    rootPath: server.settings.views
  });
  
  rest.get('/', function(req, res, next) {
      res.render('index', {about:about});
  });
  
  var client = pubsub.getClient();
  setInterval(function() {
    client.publish('/rtclock/time', {time:+new Date});
  }, 1000);
  
  var counter = new Counter(client);
  pubsub.addExtension(counter);
  
  module.exports.rest = rest;
}

function Counter(client) {
  var lastUserList = '';
  var lastCount    = 0;
  var clients      = {};
  
  this.incoming = function(message, callback) {
    if (message.channel == '/rtclock/users/ping') {
      clients[message.clientId] = +new Date;
    }
    
    return callback(message);
  };
  
  function collect() {
    var clientIds = Object.keys(clients);
    var now       = +new Date;
    
    for (var i = 0; i < clientIds.length; i++) {
      var clientId  = clientIds[i];
      var timestamp = clients[clientId];
  
      if (timestamp < now-2000) {
        delete clients[clientId];
      }
    }
    
    clientIds = Object.keys(clients);
    
    var thisUserList = clientIds.join(' ');
    var thisCount    = clientIds.length;
    
    if (thisUserList != lastUserList) {
      var actionName = (thisCount >= lastCount) ? 'join' : 'drop';
      client.publish('/rtclock/users', makeMessage(thisCount, actionName));
    }
    
    lastCount    = thisCount;
    lastUserList = thisUserList;
  }
  
  setInterval(collect, 1000);
}
    
function makeMessage(count, action) {
  var file  = 'button_add_01.png';
  var title = 'User joined';
  var text  = 'You are the only user on this page';
  
  if (action != 'join') {
    file  = 'button_delete_01.png';
    title = 'User left';
  }
  
  if (count > 1) {
    text = 'There are ' + count + ' users on this page';
  }
  
  return {
    users: {
      title  : title,
      text   : text,
      image  : '/images/' + file,
      sticky : false,
      time   : '3000'
    }
  }
}












