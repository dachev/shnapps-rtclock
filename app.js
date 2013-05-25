var undefined = undefined;
var express   = require('express');
var about     = [
  {
    name  : 'require',
    items : [
      {name:'express', link:'https://github.com/visionmedia/express'},
      {name:'utml',    link:'https://github.com/mikefrey/utml'},
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
  init   : initApp
};


// init functions
function initApp(server, pubsub) {
  var config = {};
  var rest   = express();
  
  rest.config = {};
  rest.set('env', server.settings.env);
  
  initExpress(config, rest, function(err) {
    initPubsub(config, pubsub, function(err) {});
  });
  
  module.exports.rest = rest;
}
function initExpress(config, rest, cb) {
  var utml = require('utml');
  
  rest.use(express.static(__dirname + '/public'));
  
  // configure views
  rest.set('views', __dirname + '/views');
  rest.set('view engine', 'html');
  rest.engine('html', utml.__express);

  // configure page routes
  rest.get('/', checkConfigured, pageGetIndex);
  
  // configure API routes

  cb(null);
}
function initPubsub(config, pubsub, cb) {
  var client = pubsub.getClient();
  setInterval(function() {
    client.publish('/rtclock/time', {time:+new Date});
  }, 1000);
  
  var counter = new Counter(client);
  pubsub.addExtension(counter);

  cb(null);
}


// route middleware
function checkConfigured(req, res, next) {
  if (!req.body) { req.body = {}; }
  
  if (isReady() == false) {
    return renderError(req, res, 500, {
      message:'This application is misconfigured.'
    });
  }
  
  next();
}


// page endpoints
function pageGetIndex(req, res, next) {
  res.render('index', {
    locals : {
      rootPath : req.app.parent.settings.views,
      about    : about
    }
  });
}


// render helpers
function renderError(req, res, code, data) {
  if (req.url.indexOf('/api') == 0) {
    // JSON response
    renderJSONError(req, res, code, data);
  }
  else {
    // HTML response
    renderHTMLError(req, res, code, data);
  }
}
function renderJSONError(req, res, code, data) {
  res.status(code);
  res.json(_.extend({
    message : '',
    payload : ''
  }, data, {success:false}));
}
function renderHTMLError(req, res, code, data) {
  var viewPath = path.join(req.app.parent.settings.views, '500');
  
  res.status(code);
  res.render(viewPath, {
    locals : {
      status  : 500,
      request : req,
      msg     : data.message
    }
  });
}
function renderSuccess(req, res, data) {
  if (req.url.indexOf('/api') == 0) {
    // JSON response
    renderJSONSuccess(req, res, data);
  }
  else {
    // HTML response
    renderHTMLSuccess(req, res, data);
  }
}
function renderJSONSuccess(req, res, data) {
  res.status(200);
  res.json(_.extend({
    message : '',
    payload : ''
  }, data, {success:true}));
}
function renderHTMLSuccess(req, res, data) {
}


// miscellaneous
function isReady() {
  return true;
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












