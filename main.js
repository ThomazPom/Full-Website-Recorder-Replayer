import puppeteer from 'puppeteer-extra'

import StealthPlugin  from 'puppeteer-extra-plugin-stealth'
puppeteer.use(StealthPlugin())
import fs from 'fs'
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const settings = {
    
    blank_profile: process.argv.includes("--blank_profile"), // Starts from a blank and temporary profile 
    visible: process.argv.includes("--visible"),
    window_real_chromium:process.argv.includes("--window_real_chromium"), // Starts the system installed chromium on windows
}

let launchArgs = {
    headless: !settings.visible, defaultViewport: null,
    ignoreHTTPSErrors: settings.ignore_ssl_errors,
    args: [
        
        '--window-size=1920,1080',
    ],
}

if (!settings.blank_profile) {
        
    let userDataDir = path.join(__dirname, "profile")
    fs.mkdir(userDataDir, { recursive: true }, z => { })
    launchArgs.userDataDir = userDataDir
    
}
if(settings.window_real_chromium)
{
    console.log("Using the system chromium")
    launchArgs.executablePath="C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
}

async function setSettingPDF(){
    let page0 = (await browser.pages())[0]
    await page0.goto("chrome://settings/content/pdfDocuments");
    
    await page0.evaluate((selector) =>{
function discoverAllShadowRoots(){
      let  shadowroots = []
    function discover(elem){
        let elemshadowroots = [...elem.querySelectorAll("*")]
        elemshadowroots.push(elem)
        elemshadowroots=elemshadowroots.map(z=>z.shadowRoot).filter(z=>z)
        elemshadowroots.forEach(discover)
        shadowroots.push(...elemshadowroots)
    }
    discover(document.body)
    return shadowroots;
}
document.querySelectorAllShadowRoot = function(selector){
    let shadowRoots = discoverAllShadowRoots()
    for (let index = 0; index < shadowRoots.length; index++) {
        const sr = shadowRoots[index];
        srsl = sr.querySelector(selector)
        if(srsl)
        {
            return srsl 
        }
    }
}


document.querySelectorAllShadowRoot("settings-collapse-radio-button[label*=PDF]").shadowRoot.querySelector(".disc-border").click()

    })}



async function doAllStuff()
{
    await setSettingPDF()
    let selector = "a[href*='download?file_type=invoice_pdf&invoice_origin=restaurant-payments']";
    let page = (await browser.newPage())
    await page.goto("https://restaurant-hub.deliveroo.net/reports/invoices")
    await page.waitForSelector(selector,{timeout:500000})
    setInterval(z=>{
        page.click(selector);
        setTimeout(async z=>{
            try{
                    console.log(
                        await page.evaluate(selector=>{
                            document.querySelector(selector).remove();
                            return document.querySelectorAll(selector).length
                        },selector),"left")
            }
            catch(e){
                console.log(e)
                await browser.close();
            }
        },2000)
    },3000)

}
doAllStuff();