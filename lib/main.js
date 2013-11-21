let data = require("sdk/self").data;
let widgets = require("sdk/widget");
let tabs = require("sdk/tabs");
let clipboard = require("sdk/clipboard");

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
