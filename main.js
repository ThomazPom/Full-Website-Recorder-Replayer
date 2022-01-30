const puppeteer = require('puppeteer');
const path = require('path')
const fs = require('fs');
var sha1 = require('sha1');
const yaml = require('js-yaml');
const { env } = require('process');
const settings = {
    fullrecordfolder: path.join(__dirname, "records"),
    mode_record: process.argv.includes("--mode_record"),
    keep_local: process.argv.includes("--keep_local"),
    fetch_missing_from_web: process.argv.includes("--grab_from_web"),
    mode_replay: process.argv.includes("--mode_replay"),
    blank_profile: process.argv.includes("--blank_profile"),
    ignore_ssl_errors:process.argv.includes("--ignore_ssl_errors"),
    macos_real_chromium:process.argv.includes("--macos_real_chromium"),   
    disable_cookies:process.argv.includes("--disable_cookies"),
    window_real_chromium:process.argv.includes("--window_real_chromium"),   
}
function loadPersistentSettings()
{

const settingsFile = path.join(__dirname,"settings.yaml");
try {
    const doc = yaml.load(fs.readFileSync(settingsFile), 'utf8');
    
    settings.persistentSettings = doc
    
    console.log("Loaded settings")
  } catch (e) {
      settings.persistentSettings = {
          replay_blacklist_regex:{
            "any":[],
            "example.com":[
                "http://example.com/complexRequest###i",
                "https?://example.com/some(.*?)",
              ],
            "never_replay.org":"*"
          }

    }
    const doc= yaml.dump(settings.persistentSettings);
    if(!fs.existsSync(settingsFile))
    {
        fs.writeFile(settingsFile,doc,()=>{})
    }
    console.log("New settings");
  }
  return settings.persistentSettings
}
loadPersistentSettings();
async function registerpage(page) {
    if (!page) {
        return
    }
        
    const mainframe= await page.mainFrame()
    if(mainframe){
        console.log("Registering page", await page.url())
    }
    if (settings.mode_record) {

        console.log('Recording new page', settings.mode_record);
        page.on('response', interceptorResponse);
    }
    if (settings.mode_replay) {
        console.log('Replaying new page');
        await page.setRequestInterception(true);
        page.on('request', interceptorRequest);
    }
}
(async () => {
    

    launchArgs = {
        headless: false, defaultViewport: null,
        ignoreHTTPSErrors: settings.ignore_ssl_errors,
        args: [
            
        ],
    }
    if(settings.ignore_ssl_errors)
    {
        launchArgs.args.push('--ignore-certificate-errors');
    }
    if(settings.window_real_chromium)
    {
        launchArgs.executablePath="C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    }
    if(settings.macos_real_chromium)
    {
        launchArgs.executablePath='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    }
    if (!settings.blank_profile) {

        userDataDir = path.join(__dirname, "profile")
        fs.mkdir(userDataDir, { recursive: true }, z => { })
        launchArgs.userDataDir = userDataDir

    }
    const browser = await puppeteer.launch(launchArgs);


    console.log("BROWSER VERSION",await browser.version());
    console.log("PUPPETEER VERSION",process.versions);
    console.log("LAUNCH ARGS",launchArgs)
    console.log("Record mode", settings.mode_record)
    console.log("Keep previous records", settings.keep_local)
    
    console.log("Replay mode", settings.mode_replay)
    console.log("Grab from web missing files", settings.fetch_missing_from_web)
    let page0 = (await browser.pages())[0]
    await page0.goto("chrome://settings/cookies");

        await page0.evaluate((selector) =>
            document
                .querySelector('settings-ui')
                .shadowRoot.querySelector('settings-main')
                .shadowRoot.querySelector('settings-basic-page')
                .shadowRoot.querySelector('settings-section settings-privacy-page')
                .shadowRoot.querySelector('settings-cookies-page')
                .shadowRoot.querySelector(selector)
                .shadowRoot.querySelector('#label')
                .click()
        ,settings.disable_cookies?"#blockAll":"#blockThirdPartyIncognito");
    
    registerpage(page0)
    browser.on('targetcreated', async function (tab) {
        console.log('New Tab Created');
        let page = await tab.page().then()
        registerpage(page)
    })
})();
function isABlacklistReplay(parseurl){
    rbp=settings.persistentSettings.replay_blacklist_regex
    for(const site of [parseurl.hostname,"any"])
    {
        blacklist =rbp[site];
        if (blacklist=="*")
        {
            return true;
        }
        if(blacklist)
        {
                for (const rx_string of blacklist) {
                    //console.log(rx_string);
                    let regex=new RegExp(...rx_string.split("###"))
                   // console.log(regex)
                    if(regex.test(parseurl.href))
                    {
                        console.log(parseurl.href,"is blacklisted by ",regex,"on",parseurl.hostname)
                        return true
                    }
                }
    //      console.log(parseurl.hostname,"has a blacklist")
            
        }
    }
    return false
}
async function interceptorRequest(request) {

    var [parseurl, sitefolder, basename, filename, metadata_filename] = generateFilenames(request)
    if (fs.existsSync(metadata_filename) && !isABlacklistReplay(parseurl)) {
        metadata = JSON.parse(fs.readFileSync(metadata_filename))
        // var  metadata_json= JSON.stringify({
        //     status:response.status(),
        //     request_url:response.request().url(),
        //     request_method:response.request().method(),
        //     response_headers:responseHeaders,
        // })

        console.log("REPLAY ", request.method(), request.url(), metadata.status);
        response = {
            status: metadata.status,
            headers: metadata.response_headers
        }
        if (fs.existsSync(filename)) {
            response.body = fs.readFileSync(filename)
        }
        request.respond(response);
    }
    else if (settings.fetch_missing_from_web) {
        console.log("FETCH ", request.method(), request.url());

        request.continue();
    }
    else {
        console.log("SORRY ", request.method(), request.url(), metadata.status);

        request.respond({
            status: 404,
            headers: {
                "content-type": "text/html"
            },
            body: "<h1>Sorry, page not recorded</h1>"
        })
    }
}
function generateFilenames(request) {
    var parseurl = new URL(request.url());
    var sitefolder = path.join(settings.fullrecordfolder, parseurl.hostname);
    var basename = sha1(request.method() + request.url() + request.postData())
    var filename = path.join(sitefolder, basename + '_' + parseurl.protocol.replace(":", ""));
    var metadata_filename = filename + "-res-metadata.json";

    return [parseurl, sitefolder, basename, filename, metadata_filename]
}
async function interceptorResponse(response) {

    let request = response.request();
    let responseHeaders = response.headers();
    console.log(request.method(), response.status(), request.url());

    var [parseurl, sitefolder, basename, filename, metadata_filename] = generateFilenames(request)
    if (settings.keep_local && fs.existsSync(metadata_filename)) {
        console.log("Keeping local file", request.method(), response.status(), request.url())
        return;
    }
    var metadata_json = JSON.stringify({
        status: response.status(),
        request_url: response.request().url(),
        request_method: response.request().method(),
        response_headers: responseHeaders,
    })

    fs.mkdir(sitefolder, { recursive: true }, z => { })

    fs.writeFile(metadata_filename, metadata_json, (err) => {
       // console.log(err)
    })


    var link_descriptor_filename = path.join(sitefolder, "known_links.txt");

    if(responseHeaders["content-type"] && responseHeaders["content-type"].includes("application/pdf"))
    {
        console.log("PDF HERE !");
        console.log(response)
     //   console.log(new puppeteer.HTTPRequest)
    }
    response.buffer().then(buffer => {

        if (responseHeaders["content-type"] && responseHeaders["content-type"].includes("text/html")) {
            if (!fs.existsSync(filename)) {
                fs.appendFile(link_descriptor_filename, parseurl.href + "\n", (err) => {
                    // console.log(error,link_descriptor_filename,parseurl.href)
                });
            }
        }
        fs.writeFile(filename, buffer, () => {})
    }).catch(err => {

        console.log("This request did not have a body", err)
    });
}