const {Cc, Ci, Cu, Cr} = require("chrome");
Cu.import("resource://gre/modules/Services.jsm");

let data = require("sdk/self").data;
let widgets = require("sdk/widget");
let tabs = require("sdk/tabs");
let clipboard = require("sdk/clipboard");
let Request = require("sdk/request").Request;

let actions = {

  bugzillaToFirefoxNightly: {
    label: "bugzilla to @FirefoxNightly",
    image: "https://bugzilla.mozilla.org/favicon.ico",
    action: () => {
      let tabTitle = tabs.activeTab.title;
      let [,bug, title] = /(\d+) – (.*)/.exec(tabTitle)
      let str = "FIXED: http://bugzil.la/" + bug + " : " + title + " #FirefoxNightly";
      clipboard.set(str);
    }
  },

  bugzillaToTodoist: {
    label: "Add to todoist",
    image: "http://todoist.com/favicon.ico",
    action: () => {
      let tab = tabs.activeTab;
      let tabTitle = tab.title;
      let [,bug, title] = /(\d+) – (.*)/.exec(tabTitle);
      let link = "http://bugzil.la/" + bug;
      let content = "http://bugzil.la/" + bug + " (bug " + bug + "): " + title;
      getTodoistToken(function(token) {
        Request({
          url: "https://todoist.com/API/addItem?priority=1&project_id=110787543&content=" + content + "&token=" + token,
          onComplete: () => {
            tab.reload();
          },
        }).get();
      });
    },
  },
}

let panel = require("sdk/panel").Panel({
  width: 200,
  height: 200,
  contentURL: data.url("panel.html"),
});

require("sdk/widget").Widget({
  label: "paulsmenu",
  id: "paulsmenu",
  contentURL: data.url("icon.png"),
  panel: panel
});

panel.on("show", function() {
  let menu = [];
  for (let a in actions) {
    menu.push({
      id: a,
      image: actions[a].image,
      label: actions[a].label
    });
  }
  let json = JSON.stringify(menu);
  panel.port.emit("populate", json);
});

panel.port.on("click", (item) => {
  panel.hide();
  actions[item].action();
});


// Listen for tab content loads.

tabs.on('ready', function(tab) {
  if (!tab.url.match(/bugzilla.mozilla.org\/show_bug.cgi\?id=(\d)+/g)) {
    return;
  }
  console.log("Found a bugzilla tab");
  let tabTitle = tab.title;
  let [,bug] = /(\d+) – (.*)/.exec(tabTitle)
  getTodoistToken(function(token) {
    Request({
      url: "https://todoist.com/API/getUncompletedItems?project_id=110787543&token=" + token,
      onComplete: function (response) {
        let tracked = false;
        for (let i of response.json) {
          let [,contentBug] = /http:\/\/bugzil\.la\/(\d+)/.exec(i.content);
          if (bug == contentBug) {
            tracked = true;
            break;
          }
        }
        if (tracked) {
          tab.title = "!" + tab.title;
        }
        console.log("Tracked: " + tracked);
      },
    }).get();
  });
});

// Get todoist token

let _todoistToken = null;
function getTodoistToken(callback) {
  if (_todoistToken) {
    callback(_todoistToken);
    return;
  }
  let c = Services.logins.findLogins({}, "https://next.todoist.com", "", "")[0];
  Request({
    url: "https://todoist.com/API/login?email=" + c.username + "&password=" + c.password,
    onComplete: function (response) {
      _todoistToken = response.json.token;
      callback(_todoistToken);
    },
  }).get();
}
