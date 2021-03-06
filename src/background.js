// This is main process of Electron, started as first thing when your
// app starts. It runs through entire life of your application.
// It doesn't have any windows which you can see on screen, but we can open
// window from here.


var Readable = require('stream').Readable


import path from "path";
import url from "url";
import {
    app,
    Menu,
    protocol,
    ipcMain
} from "electron";
import {
    devMenuTemplate
} from "./menu/dev_menu_template";
import {
    editMenuTemplate
} from "./menu/edit_menu_template";
import createWindow from "./helpers/window";
const fs = require("fs");
const os = require('os');
// Special module holding environment variables which you declared
// in config/env_xxx.json file.
import env from "env";
env.missingRessourceMode="keep-local";
            
env.fullrecordfolder = path.join(__dirname, env.recordfolder)
env.tmpfolder = path.join(os.tmpdir(), env.recordfolder)

env.currentmode =  process.argv.includes("--mode-replay")?"mode-replay":"mode-record";
ipcMain.on('synchronous-message', (event, arg) => {
    console.log(arg);
    switch (arg.type) {
        case "mode-record-change":
            env.currentmode=arg.data;
            change_mode_session();
           // app.relaunch({ args: [".",'--'+arg.data] })
            //app.exit(0)
            break;

        case "missing-ressource-mode-change":
            env.missingRessourceMode=arg.data;
            break;
    }

    event.returnValue = 'ack'
})

if (!fs.existsSync(env.fullrecordfolder)) {
    fs.mkdirSync(env.fullrecordfolder);
}

if (!fs.existsSync(env.tmpfolder)) {
    fs.mkdirSync(env.tmpfolder);
}

const setApplicationMenu = () => {
    const menus = [editMenuTemplate];
    if (env.name !== "production") {
        menus.push(devMenuTemplate);
    }
    Menu.setApplicationMenu(Menu.buildFromTemplate(menus));
};

// Save userData in separate folders for each environment.
// Thanks to this you can use production and development versions of the app
// on same machine like those are two separate apps.
if (env.name !== "production") {

    const userDataPath = app.getPath("userData");

    app.setPath("userData", `${userDataPath} (${env.name})`);
}



const fileType = require('file-type');
const request = require('request');
const sanitize = require("sanitize-filename");
const sha1 = require('sha1');
var mainWindow;
function proxyrequest(httprequest, renderresult) {


    var parseurl = url.parse(httprequest.url);
    var sitefolder = path.join(env.fullrecordfolder,"("+parseurl.protocol.replace(":","")+") "+ parseurl.hostname);

    if (!fs.existsSync(sitefolder)) {
        fs.mkdirSync(sitefolder);
    }
    if (httprequest.uploadData && httprequest.uploadData[0] && httprequest.uploadData[0].bytes) {
            httprequest.body = httprequest.uploadData[0].bytes;
    } 
    var basename = sha1(httprequest.url+ (httprequest.body?httprequest.body.toString():""))


    var filename = path.join(sitefolder, basename);
    var headers_filename = filename+"-res-headers.json";

    var isGrabOnMissingMode = env.currentmode == "mode-replay" && !fs.existsSync(headers_filename) && env.missingRessourceMode=="grab-from-web";
    if(isGrabOnMissingMode)
    {
        var filename = path.join(env.tmpfolder, basename);
        var headers_filename = filename+"-res-headers.json";
       // console.log(headers_filename);
    }

    var headers_filename = filename+"-res-headers.json";

    if (env.currentmode == "mode-record" || isGrabOnMissingMode
        //&& !fs.existsSync(headers_filename)
        ) {
        // Will record and display any request
        if (httprequest.uploadData && httprequest.uploadData[0] && httprequest.uploadData[0].bytes) {
            httprequest.body = httprequest.uploadData[0].bytes;
        }
        var writestream = request(httprequest, function(error, response, body) {
           
            if (error) {


                var s = new Readable
                s.push(JSON.stringify(error));   
                s.push(null) ;
                renderresult({headers: {},data: s})
                writestream.end()
                return console.error('request failed:', error);

            }
              var  headers_json= JSON.stringify(response.headers)
             //removing anti framing headers
            var xfo = headers_json.match(/x-frame-options/i);
            var csp = headers_json.match(/content-security-policy/i);
            var acao = headers_json.match(/access-control-allow-origin/i); // Maybe
                delete response.headers[(xfo||{})[0]];
                delete response.headers[(csp||{})[0]];
            //    delete response.headers[(acao||{})[0]]; // maybe
            if(acao){
                response.headers["access-control-allow-origin"] = response.headers["access-control-allow-origin"].replace(/frame-ancestors[^;]*;?/, "frame-ancestors http://* https://*;"); //maybe
            }
            // TODO: Extend cookies life to 100 years :)
            fs.writeFile(headers_filename, headers_json, (err) => {
                //if (err) throw err;
                //console.log('header file has been saved!');
            });
            //Using interceptStreamProtocol
            renderresult({headers: response.headers,data: fs.createReadStream(filename)});
            //if i ever want to use interceptFileProtocol instead of interceptStreamProtocol :
            //renderresult({headers: response.headers,path: filename})
            
        }).pipe(fs.createWriteStream(filename));
    }
    else
    {
              //Will replay saved requests
              fs.readFile(headers_filename, (err, data) => {
                    if (err) {

                        console.log("headers file not recorded"+httprequest.url)
                      mainWindow.webContents.send('stickymessage', 
                        {position:"right",message:httprequest.url,message2:' is not recorded'})

                        var s = new Readable

                        // TODO  : NICE HTML +  html headers
                        s.push('{Recorder:"Sorry, This page ('+httprequest.url+') has never been recorded"}')    // the string you want
                        s.push(null) 
                        renderresult({headers: {},data: s})
                        return;

                  }
                    var response_headers = JSON.parse(data);
                    renderresult({headers: response_headers,data: fs.createReadStream(filename)});
                    
                   //if i ever want to use interceptFileProtocol instead of interceptStreamProtocol :
                    //renderresult({headers: response_headers,path: filename})
                    return;
              });
      

    }

    return;


}
function change_mode_session(callback=function(){})
{
    var webSession = mainWindow.webContents.session;
    webSession.clearStorageData(function()
        {
                webSession.clearCache(function(){
                        mainWindow.loadURL(
                        url.format({
                            pathname: path.join(__dirname,env.currentmode=="mode-record"?"app-record.html":"app-replay.html"),
                            protocol: "file:",
                            slashes: true
                        })
                    );
                    callback();     
                }); 
        });

}
app.on("ready", () => {
  //  setApplicationMenu();
    
    protocol.interceptStreamProtocol("https", proxyrequest);
    protocol.interceptStreamProtocol("http", proxyrequest);
    mainWindow = createWindow("main", {
        width: 1000,
        height: 600
    });
    
    change_mode_session();


    if (env.name === "development") {
        mainWindow.openDevTools();
    }


});

app.on("window-all-closed", () => {
    app.quit();
});