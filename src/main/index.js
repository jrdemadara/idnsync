import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import sql from 'mssql'
import path from 'path'
import os from 'os'
const fs = require('fs')
const sharp = require('sharp')

// run this as early in the main process as possible
if (require('electron-squirrel-startup')) app.quit()

let dbConnection
let dirname
let photoDirectory
let signatureDirectory

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 720,
    height: 590,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
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

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
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

async function convertBase64ToJpg(photo, rollNumber, directory) {
  try {
    // Convert Base64 string to buffer
    const buffer = Buffer.from(photo, 'base64')

    // Prepare the directory path
    const photoDir = path.join(os.homedir(), directory)

    // Create the directory if it doesn't exist
    if (!fs.existsSync(photoDir)) {
      fs.mkdirSync(photoDir, { recursive: true })
    }

    // Prepare the file path
    const photoFilePath = path.join(photoDir, `${rollNumber}.jpg`)

    // Create a new white canvas with the same dimensions as the input photo
    const { width, height } = await sharp(buffer).metadata()
    const whiteCanvasBuffer = await sharp({
      create: {
        width: width,
        height: height,
        channels: 3, // 3 channels for RGB
        background: { r: 255, g: 255, b: 255 } // White background
      }
    })
      .jpeg()
      .toBuffer()

    // Overlay the original photo on top of the white canvas
    const outputImageBuffer = await sharp(whiteCanvasBuffer)
      .composite([{ input: buffer }])
      .jpeg()
      .toBuffer()

    // Save the modified image to a file
    fs.writeFileSync(photoFilePath, outputImageBuffer)
    // console.log(`Image saved as ${photoFilePath}`)
  } catch (error) {
    console.error('An error occurred:', error)
  }
}

function throttle(func, delay) {
  let lastCall = 0
  return function (...args) {
    const now = Date.now()
    if (now - lastCall >= delay) {
      func.apply(this, args)
      lastCall = now
    }
  }
}
// Handle the insert operation
ipcMain.on('insert-data', async (event, data) => {
  try {
    const parsedData = JSON.parse(data)
    const request = new sql.Request(dbConnection)
    for (const item of parsedData) {
      const roll_number = item.roll_number
      const lastname = item.last_name
      const firstname = item.first_name
      const middlename = item.middle_name
      const birthdate = item.birth_date
      const chapter = item.chapter
      const qrcode = item.qr_code_url

      const throttled1 = throttle(convertBase64ToJpg, 200)
      const throttled2 = throttle(convertBase64ToJpg, 200)
      if (item.photo) {
        throttled1(item.photo, roll_number, photoDirectory)
      }

      if (item.signature) {
        throttled2(item.signature, roll_number, signatureDirectory)
      }

      //TODO: Check database for duplicate entry before insert
      const insertQuery = `
    IF EXISTS (SELECT * FROM tblDelegates WHERE Field2 = '${roll_number}')
    BEGIN
        UPDATE tblDelegates
        SET Field3 = '${lastname}', Field4 = '${firstname}', Field5 = '${middlename}', Field6 = '${birthdate}', Field7 = '${chapter}', Field8 = '${qrcode}', Field9 = '${roll_number}', Field10 = '${roll_number}'
        WHERE Field2 = '${roll_number}';
    END
    ELSE
    BEGIN
        INSERT INTO tblDelegates (Field2, Field3, Field4, Field5, Field6, Field7, Field8, Field9, Field10)
        VALUES ('${roll_number}','${lastname}', '${firstname}', '${middlename}', '${birthdate}', '${chapter}', '${qrcode}', '${roll_number}', '${roll_number}');
    END
`
      const result = await request.query(insertQuery)
      event.sender.send('insert-data-response', { success: true, result })
    }
  } catch (error) {
    console.error('Error inserting data:', error)
    event.sender.send('insert-data-response', { success: false, error: error.message })
  }
})
