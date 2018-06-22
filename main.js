const {app, BrowserWindow, ipcMain, Tray} = require('electron');
const path = require('path');
var AutoLaunch = require('auto-launch');
const AppEnv = require('./app/assets/env.json');
const assetsDirectory = path.join(__dirname, 'app/assets');
const storage = require('electron-json-storage');
const fetch = require('electron-fetch');
const ElectronOnline = require('electron-online');

const connection = new ElectronOnline();

var AppType  = {
  TRAY: "tray",
  KIOSK: "kiosk",
  WEB: "web"
}

var EnvType = {
  PROD: "prod",
  DEBUG: "debug"
}

var osvar = process.platform;

let tray = undefined
let window = undefined

let winWidth = 300;
let winHeight = 230;

global.configJSON = undefined;

connection.on('online', () => {
  fetch(AppEnv.urlJSON)
    .catch(err => {
      console.error(err)
    })
    .then(res => res.json())
    .then(json => {
      storage.set('config', json, function (data, error) {
        if (error) throw error;
        configJSON = json;
        console.log("Config version " + json.version + " saved to storage");
      })
    });
})

connection.on('pending', () => {
  storage.has('config', function (error, hasKey) {
    if (error) throw error;
    if (hasKey) {
      console.log('There is data stored as `config`');
      storage.get('config', function (error, data) {
        if (error) throw error;
        console.log('Retrieved config version ' + data.version);
        configJSON = data;
      })
    }
  });
});

connection.on('offline', () => {
  storage.has('config', function (error, hasKey) {
    if (error) throw error;
    if (hasKey) {
      console.log('There is data stored as `config`');
      storage.get('config', function (error, data) {
        if (error) throw error;
        console.log('Retrieved config version ' + data.version);
        configJSON = data;
      })
    }
  });
});

if (AppEnv.env === EnvType.DEBUG) {
  storage.clear(function (error) {
    if (error) throw error;
  });
}

app.on('ready', () => {
  if (AppEnv.type === AppType.TRAY) {
    let autoLaunch = new AutoLaunch({
      name: 'Talk To Mary',
      path: app.getPath('exe'),
    });

    autoLaunch.isEnabled().then((isEnabled) => {
      if (!isEnabled) autoLaunch.enable();
    });

    createTray()
  }

  if (AppEnv.env !== EnvType.DEBUG) {
    if (osvar == 'darwin') {
      app.dock.hide();
    }
  }

  createWindow();
})

// Quit the app when the window is closed
app.on('window-all-closed', () => {
  app.quit()
})

const createTray = () => {
  tray = new Tray(path.join(assetsDirectory, 'iconTemplate.png'))
  tray.on('right-click', toggleWindow)
  tray.on('double-click', toggleWindow)
  tray.on('click', function (event) {
    toggleWindow()

    // Show devtools when command clicked
    if (AppEnv.env === EnvType.DEBUG) {
      if (event.shiftKey) {
        window.openDevTools({mode: 'detach'})
      }
    }
  })
}

const getWindowPosition = () => {
  const windowBounds = window.getBounds()
  const trayBounds = tray.getBounds()

  // Center window horizontally below the tray icon
  const x = Math.round(trayBounds.x + (trayBounds.width / 2) - (windowBounds.width / 2))

  // Position window 4 pixels vertically below the tray icon
  const y = Math.round(trayBounds.y + trayBounds.height + 4)

  return {x: x, y: y}
}

const createWindow = () => {
  if (AppEnv.type === AppType.TRAY) {
    window = new BrowserWindow({
      width: winWidth,
      height: winHeight,
      show: false,
      frame: false,
      fullscreenable: false,
      resizable: false,
      transparent: true,
      webPreferences: {
        backgroundThrottling: false
      }
    })
  } else {
    window = new BrowserWindow({
      width: 1024,
      height: 768,
      show: true,
      frame: true,
      fullscreenable: true,
      resizable: true,
      transparent: false,
      menu: null,
      webPreferences: {
        backgroundThrottling: false
      }
    })
    
    if (AppEnv.env === EnvType.DEBUG) {
      window.openDevTools({ mode: 'detach' })
    } else {
      window.setMenu(null);
      window.setKiosk(true);
    }

    window.show();
  }

  window.loadURL(`file://${path.join(__dirname, 'app/index.html')}`)

  // Hide the window when it loses focus
  // window.on('blur', () => {
  //   if (!window.webContents.isDevToolsOpened()) {
  //     window.hide()
  //   }
  // })
}

const toggleWindow = () => {
  if (window.isVisible()) {
    window.hide()
  } else {
    showWindow()
  }
}

const showWindow = () => {
  const position = getWindowPosition()
  window.setPosition(position.x, position.y, false)
  window.show()
  window.focus()
}

ipcMain.on('show-window', () => {
  if (AppEnv.type === AppType.TRAY) {
    showWindow()
  }
})

ipcMain.on('reset-window', (event) => {
  if (AppEnv.type === AppType.TRAY) {
    tray.setTitle('')
    window.setSize(winWidth, winHeight, true);
  }
})

ipcMain.on('resize-window', (event, height) => {
  if (AppEnv.type === AppType.TRAY) {
    window.setSize(winWidth, height, true);
  }
})

ipcMain.on('answer-received', (event, answer) => {
  if (AppEnv.type === AppType.TRAY) {
    tray.setTitle(answer.title)
  }

  // // Update icon for different weather types
  // switch (weather.currently.icon) {
  //   case 'cloudy':
  //   case 'fog':
  //   case 'partly-cloudy-day':
  //   case 'partly-cloudy-night':
  //     tray.setImage(path.join(assetsDirectory, 'cloudTemplate.png'))
  //     break
  //   case 'rain':
  //   case 'sleet':
  //   case 'snow':
  //     tray.setImage(path.join(assetsDirectory, 'umbrellaTemplate.png'))
  //     break
  //   case 'clear-night':
  //     tray.setImage(path.join(assetsDirectory, 'moonTemplate.png'))
  //     break
  //   case 'wind':
  //     tray.setImage(path.join(assetsDirectory, 'flagTemplate.png'))
  //     break
  //   case 'clear-day':
  //   default:
  //     tray.setImage(path.join(assetsDirectory, 'sunTemplate.png'))
  // }
})
