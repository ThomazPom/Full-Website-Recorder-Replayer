import "./stylesheets/main.css";

// Small helpers you might want to keep
import "./helpers/context_menu.js";
import "./helpers/external_links.js";

import {
    remote,
    ipcRenderer
} from "electron";
import jetpack from "fs-jetpack";
import rimraf from "rimraf";
import env from "env";
import path from "path";
const app = remote.app;
const appDir = jetpack.cwd(app.getAppPath());

// Holy crap! This is browser window with HTML and stuff, but I can read
// files from disk like it's node.js! Welcome to Electron world :)
const manifest = appDir.read("package.json", "json");

const osMap = {
    win32: "Windows",
    darwin: "macOS",
    linux: "Linux"
};

 ipcRenderer.on('stickymessage', (event, message) => {
    stickymessage(message.position,message.message)
 })
     
 ipcRenderer.on('log', (event, any) => {
    console.log(any);
 })
     

document.querySelector("#app").style.display = "block";




$("input#record-input").keyup(function() {
    document.querySelector("#record-web").loadURL(this.value);
});
$("select#record-input").change(function() {
    document.querySelector("#record-web").loadURL(this.value);
});


var owebview = document.querySelector("#record-web");

owebview.addEventListener('new-window', (e) => {
    owebview.loadURL(e.url);
})



$("#changemode").click(function() {
    ipcRenderer.sendSync('synchronous-message', {
        type: "mode-change",
        data: $(this).attr("data-mode")
    })
});

function stickymessage(position,message)
{
	var stickydom = $("<div>",{class:"stickymessage "+position,text:message})
	$("#messagescontainer").prepend(stickydom);

	stickydom.delay( 3000 ).animate({height:0,padding:0,opacity:0},1000,function() {
    stickydom.remove();
  });
}
var siteslist = jetpack.list(path.join(__dirname,env.recordfolder));
$(siteslist).each(function(){
    var sitefolder =path.join(__dirname,env.recordfolder,this);
    var sitecontentlist = jetpack.list(sitefolder);
    console.log(sitefolder);
    if(sitecontentlist.length<=1){
        rimraf(sitefolder,function(){});
        return;
    }
    $("select#record-input").append(new Option(this,this));

});