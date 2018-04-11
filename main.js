const {app, BrowserWindow, ipcMain, Tray} = require('electron')
const path = require('path')
var AutoLaunch = require('auto-launch');

require('electron-reload')(__dirname);

const assetsDirectory = path.join(__dirname, 'app/assets')

let tray = undefined
let window = undefined

let winWidth = 300;
let winHeight = 230;

let isKiosk = false;

// Don't show the app in the doc
app.dock.hide()

app.on('ready', () => {
  let autoLaunch = new AutoLaunch({
    name: 'Talk To Mary',
    path: app.getPath('exe'),
  });
  autoLaunch.isEnabled().then((isEnabled) => {
    if (!isEnabled) autoLaunch.enable();
  });
  if (!isKiosk) {
    createTray()
  }
  createWindow()
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
    if (event.shiftKey) {
      window.openDevTools({mode: 'detach'})
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
  console.log("creating windows");
  if (!isKiosk) {
    window = new BrowserWindow({
      width: winWidth,
      height: winHeight,
      show: false,
      frame: false,
      fullscreenable: false,
      resizable: false,
      transparent: true,
      webPreferences: {
        // Prevents renderer process code from not running when window is
        // hidden
        backgroundThrottling: false
      }
    })
  } else {
    window = new BrowserWindow({
      width: 800,
      height: 600,
      show: true,
      frame: true,
      fullscreenable: true,
      resizable: false,
      transparent: false,
      webPreferences: {
        // Prevents renderer process code from not running when window is
        // hidden
        backgroundThrottling: false
      }
    })
  }

  window.loadURL(`file://${path.join(__dirname, 'app/index.html')}`)

  // Hide the window when it loses focus
  window.on('blur', () => {
    if (!window.webContents.isDevToolsOpened()) {
      window.hide()
    }
  })
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
  showWindow()
})

ipcMain.on('reset-window', (event) => {
  if (!isKiosk) {
    tray.setTitle('')
    window.setSize(winWidth, winHeight, true);
  }
})

ipcMain.on('resize-window', (event, height) => {
  if (!isKiosk) {
    window.setSize(winWidth, height, true);
  }
})

ipcMain.on('answer-received', (event, answer) => {
  if (!isKiosk) {
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
