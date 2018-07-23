const electron = require('electron');
// Module to control application life.
const app = electron.app;
const {protocol} = require('electron');
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;
const {autoUpdater} = require('electron-updater');
const path = require('path');
const url = require('url');

const dialog = electron.dialog;
// dialog.showErrorBox = function(title, content) {
//   console.log(`${title}\n${content}`);
// };
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
require('electron-context-menu')({
	prepend: (params, BrowserWindow) => [{
		label: 'Copy',
		visible: params.mediaType === 'text'
  }],
  showInspectElement:false
});
let mainWindow;

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({width: 400, height: 600, frame: false, backgroundColor: '#2d2d32', 'minWidth': 330, 'minHeight': 300}) //400 x 600

  // and load the index.html of the app.
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }))
  
  // Open the DevTools.
  // mainWindow.webContents.openDevTools();

  if (process.platform == 'win32') {
    // Keep only command line / deep linked arguments
    deeplinkingUrl = process.argv.slice(1)
  }
  logEverywhere("createWindow# " + deeplinkingUrl); //app just opened
  // console.log(deeplinkingUrl);
  var dlink_url = deeplinkingUrl[0];
  if(dlink_url.substring(9,15) == 'friend'){
    let token_to_add = dlink_url.substring(16, dlink_url.length-1);
    mainWindow.webContents.once('dom-ready', () => {
      mainWindow.webContents.executeJavaScript('AddFriend(' + token_to_add + ')');
    });
  }
  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

let deeplinkingUrl;

// Force Single Instance Application
const shouldQuit = app.makeSingleInstance((argv, workingDirectory) => {
  // Someone tried to run a second instance, we should focus our window.

  // Protocol handler for win32
  // argv: An array of the second instance’s (command line / deep linked) arguments
  if (process.platform == 'win32') {
    // Keep only command line / deep linked arguments
    deeplinkingUrl = argv.slice(1)
  }
  logEverywhere("app.makeSingleInstance# " + deeplinkingUrl); //app already open
  // console.log(deeplinkingUrl);
  var dlink_url = deeplinkingUrl[0];
  if(dlink_url.substring(9,15) == 'friend'){
    let token = dlink_url.substring(16, dlink_url.length-1);
    mainWindow.webContents.executeJavaScript('AddFriend(' + token + ')');
  }

  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
  }
})
if (shouldQuit) {
    app.quit()
    return
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', ()=>{
  createWindow();
  if (process.platform == 'win32') {
    // Keep only command line / deep linked arguments
    deeplinkingUrl = process.argv.slice(1)
  }
  try{
    autoUpdater.checkForUpdates();
  }
  catch(err){
    // console.error(err);
  }
  // protocol.registerFileProtocol('pinify', (request, callback) => {
  //   const url = request.url.substr(9)
  //   // callback({path: path.normalize(`${__dirname}/${url}`)})
  //   console.log(url);
  // }, (error) => {
  //   if (error) console.error('Failed to register protocol')
  // })
  app.setAsDefaultProtocolClient('pinify');
});

autoUpdater.on('update-downloaded',(info)=>{
  mainWindow.webContents.send('updateReady',info);
});
// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
app.on('open-url', function (event, url) {
  event.preventDefault();
  console.log("open-url event: " + url)

  // dialog.showErrorBox('open-url', `You arrived from: ${url}`)
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
    let open = require("open");
    mainWindow.webContents.on('new-window', function(event, url){
      event.preventDefault();
      open(url);
    });
    // mainWindow.loadURL("data:text/html,<p>Hello, World!</p>");
  }
})
app.on('browser-window-created',function(e,window) {
  window.setMenu(null);
});
function logEverywhere(s) {
  console.log(s)
  if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.executeJavaScript(`console.log("${s}")`)
  }
}
// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

let ac_token;
const ipcMain = electron.ipcMain;

ipcMain.on("quitAndInstall", (event, arg)=>{
  autoUpdater.quitAndInstall();
});
ipcMain.on("returnUserDataPath",(event, arg)=>{
  console.log(app.getPath('userData'));
  mainWindow.webContents.send('userDataPath',app.getPath('userData'));
});
//disable alerts  https://discuss.atom.io/t/how-to-disable-alert-dialogs-when-errors-occur/20037/7
ipcMain.removeAllListeners("ELECTRON_BROWSER_WINDOW_ALERT")
ipcMain.on("ELECTRON_BROWSER_WINDOW_ALERT", (event, message, title)=>{
  console.warn(`[Alert] ** ${title} ** ${message}`)
  event.returnValue = 0 // **IMPORTANT!**
})
var FB = require('fb');
ipcMain.on("fb-authenticate",function (event, arg) {
    let interval = setInterval(()=>{},500000);
    var authWindow = new BrowserWindow({ width: 300, height: 400, show: false, backgroundColor: '#2d2d32',
      parent: mainWindow, modal: true, webPreferences: {nodeIntegration: false, webSecurity: false, plugins: true} });
    //var facebookAuthURL = "https://www.qbytegames.com/Pinify/login.html";
    var facebookAuthURL = "http://89.40.17.194/Pinify/login.html";
    authWindow.loadURL(facebookAuthURL);
    // authWindow.webContents.openDevTools();
    authWindow.show();
    authWindow.webContents.on('did-get-redirect-request', function (event, oldUrl, newUrl) {
      var raw_code = /access_token=([^&]*)/.exec(newUrl) || null;
      var access_token = (raw_code && raw_code.length > 1) ? raw_code[1] : null;
      var error = /\?error=(.+)$/.exec(newUrl);
      if(access_token) {
        ac_token = access_token;
        FB.setAccessToken(access_token);
        FB.api('/me', { fields: ['id', 'friends', 'name', 'picture.width(800).height(800)'] }, function (res) {
          mainWindow.webContents.executeJavaScript("stash.set('fb_logged_in',true);");
          mainWindow.webContents.executeJavaScript("FBLogIn("+JSON.stringify(res)+");");
          mainWindow.webContents.executeJavaScript("document.getElementById(\"own-name\").innerHTML = \"" + res.name + "\"");
          mainWindow.webContents.executeJavaScript("document.getElementById(\"own-pp\").src = \"" + res.picture.data.url + "\"");
          clearInterval(interval);
          try{
            authWindow.close();
          }
          catch(err){
            console.log(err);
          }
          
        });
      }
    });
    authWindow.webContents.on('will-navigate', function (event, oldUrl, newUrl) {
      interval = setInterval(()=>{
        let loaded = false;
        let newUrl = authWindow.webContents.getURL();
        var raw_code = /access_token=([^&]*)/.exec(newUrl) || null;
        var access_token = (raw_code && raw_code.length > 1) ? raw_code[1] : null;
        var error = /\?error=(.+)$/.exec(newUrl);
        if(access_token) {
          clearInterval(interval);
          ac_token = access_token;
          FB.setAccessToken(access_token);
          FB.api('/me', { fields: ['id', 'friends', 'name', 'picture.width(800).height(800)'] }, function (res) {
            mainWindow.webContents.executeJavaScript("stash.set('logged_in',true);");
            mainWindow.webContents.executeJavaScript("LogIn("+JSON.stringify(res)+");");
            mainWindow.webContents.executeJavaScript("document.getElementById(\"own-name\").innerHTML = \"" + res.name + "\"");
            mainWindow.webContents.executeJavaScript("document.getElementById(\"own-pp\").src = \"" + res.picture.data.url + "\"");
            loaded = true;
          });
        }
        if(loaded) authWindow.close();
      },500);
    });
    authWindow.webContents.on('new-window', function(e, url){
      e.preventDefault();
      //const redirect = "https://www.qbytegames.com/Pinify/login_successful.html" //89.40.17.194
      const redirect = "https://89.40.17.194/Pinify/login_successful.html";
      authWindow.loadURL(`https://www.facebook.com/v3.0/dialog/oauth?client_id=211901916254251&redirect_uri=${redirect}&response_type=token&display=popup&scope=public_profile%2Cuser_friends`);
    });
  });
  
  ipcMain.on("fb-logout",function(event,arg){
    
    // FB.logout();
    // var logoutWindow = new BrowserWindow({ width: 300, height: 400, show: false, backgroundColor: '#2d2d32',
    // parent: mainWindow, modal: true, webPreferences: {nodeIntegration:false} });
    // let logout_url = "https://www.qbytegames.com/Pinify/logout.html";
    // logoutWindow.loadURL(logout_url);
    // logoutWindow.show();
    // logoutWindow.webContents.openDevTools();
    // logoutWindow.webContents.on('will-navigate', function(event, newUrl){
    //   logoutWindow.close();
    //   mainWindow.webContents.executeJavaScript("stash.set('logged_in',false);");
    //   mainWindow.webContents.executeJavaScript("location.reload()");
    //   const {session} = require('electron');
    //   session.defaultSession.clearStorageData([],(data)=>{});
    // });
    mainWindow.webContents.executeJavaScript("stash.set('logged_in',false);");
    mainWindow.webContents.executeJavaScript("location.reload()");
    const {session} = require('electron');
    session.defaultSession.clearStorageData([],(data)=>{});
    
  });
  ipcMain.on("bringToFront",function(event,arg){
    mainWindow.focus();
  });