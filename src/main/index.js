import { app, shell, BrowserWindow, ipcMain } from 'electron'
import sql from 'mssql'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import path from 'path'
import os from 'os'
const fs = require('fs')

let dbConnection
let dirname
let photoDirectory
let signatureDirectory

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 550,
    height: 525,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Disconnect from the database when the app is about to quit
app.on('before-quit', () => {
  if (dbConnection) {
    dbConnection.close()
    console.log('Disconnected from MSSQL database')
  }
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.

dirname = __dirname // Set __dirname in the main process

ipcMain.on('get-dirname', (event) => {
  event.returnValue = dirname // Send __dirname to the renderer process
})

// Handle the configuration from the renderer process

ipcMain.on('set-directory-config', async (event, config) => {
  const parsedConfig = JSON.parse(config)
  photoDirectory = parsedConfig._rawValue.photo_directory
  signatureDirectory = parsedConfig._rawValue.signature_directory
})

ipcMain.on('set-database-config', async (event, config) => {
  try {
    if (dbConnection) {
      dbConnection.close()
    }

    // Set up the new database connection
    const isConnected = await connectToDatabase(config)

    // Send a response to the renderer process
    event.sender.send('connect-local-response', { success: isConnected })
  } catch (error) {
    console.error('Error handling database configuration', error)
    // Send an error response to the renderer process
    event.sender.send('connect-local-response', { success: false, error: error.message })
  }
})

ipcMain.on('check-database-connection', async (event, config) => {
  try {
    if (dbConnection) {
      dbConnection.close()
    }

    // Set up the new database connection
    const isConnected = await connectToDatabase(config)

    // Send a response to the renderer process
    event.sender.send('check_database-response', { success: isConnected })
  } catch (error) {
    console.error('Error handling database configuration', error)
    // Send an error response to the renderer process
    event.sender.send('check_database-response', { success: false, error: error.message })
  }
})

// Function to create the database connection
async function connectToDatabase(config) {
  try {
    const parsedConfig = JSON.parse(config)
    dbConnection = await sql.connect(parsedConfig)

    return true
  } catch (err) {
    console.log(err)
    return false
  }
}

// Handle the insert operation
ipcMain.on('insert-data', async (event, data) => {
  try {
    const parsedData = JSON.parse(data)
    const request = new sql.Request(dbConnection)
    for (const item of parsedData) {
      const roll_number = item.roll_number
      const fullname = `${item.last_name}, ${item.first_name} ${item.middle_name || ''}`.trim()
      const birthdate = item.birth_date
      const chapter = item.chapter
      const qrcode = item.qr_code_url
      // Convert blob to PNG & save to external directory
      const photoBuffer = Buffer.from(item.photo, 'base64')
      const picturesDir = path.join(os.homedir(), photoDirectory)
      const pngFilePath = path.join(picturesDir, `${roll_number}.png`)

      // Save the buffer to a PNG file
      fs.writeFileSync(pngFilePath, photoBuffer)

      //TODO: Check database for duplicate entry before insert
      const insertQuery = `
    IF EXISTS (SELECT 1 FROM tblDelegates WHERE Field1 = '${roll_number}')
    BEGIN
        UPDATE tblDelegates
        SET Field2 = '${fullname}', Field3 = '${birthdate}', Field4 = '${roll_number}', Field5 = '${chapter}', Field6 = '${qrcode}', Field7 = '${roll_number}'
        WHERE Field1 = '${roll_number}';
    END
    ELSE
    BEGIN
        INSERT INTO tblDelegates (Field1, Field2, Field3, Field4, Field5, Field6, Field7)
        VALUES ('${roll_number}', '${fullname}', '${birthdate}', '${roll_number}', '${chapter}', '${qrcode}', '${roll_number}');
    END
`
      // Insert data to local database
      //const insertQuery = `INSERT INTO tblDelegates (Field1, Field2, Field3, Field4, Field5, Field6, Field7 ) VALUES ('${roll_number}', '${fullname}','${birthdate}', '${roll_number}', '${chapter}', '${qrcode}', '${roll_number}')`
      const result = await request.query(insertQuery)
      event.sender.send('insert-data-response', { success: true, result })
    }
  } catch (error) {
    console.error('Error inserting data:', error)
    event.sender.send('insert-data-response', { success: false, error: error.message })
  }
})
