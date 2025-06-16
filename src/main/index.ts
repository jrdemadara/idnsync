import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import path from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import mysql from 'mysql2/promise'
import fs from 'fs'

app.setAppUserModelId('com.jrdemadara.idnsync')
if (require('electron-squirrel-startup')) app.quit()

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 680,
    height: 600,
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
    mainWindow.webContents.openDevTools()
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

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

ipcMain.handle('test-db-connection', async (_event, config) => {
  const { host, port, user, password, database } = config

  try {
    const connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database
    })

    await connection.ping()
    await connection.end()

    return { success: true }
  } catch (error: any) {
    console.error('MySQL Connection Error:', error.message)
    return { success: false, message: error.message }
  }
})

ipcMain.handle('create-directory', async (_, relativePath: string) => {
  try {
    const homeDir = app.getPath('home') // Cross-platform home path
    const fullPath = path.join(homeDir, relativePath)

    fs.mkdirSync(fullPath, { recursive: true })

    return { success: true, path: fullPath }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
})

ipcMain.handle('sync-batch', async (_event, { config, data }) => {
  const {
    host,
    port,
    user,
    password,
    database,
    photoDirectory,
    signatureDirectory,
    fileWriteTrottle
  } = config
  const homeDir = app.getPath('home') // Cross-platform home path
  try {
    const connection = await mysql.createConnection({ host, port, user, password, database })

    const insertQuery = `
      INSERT IGNORE INTO tblDelegates (
        id, Field1, Field2, Field3, Field4, Field5,
        Field6, Field7, Field8, Field9, Field10,
        Field11, Field12, Field13, Field14, Field15
      ) VALUES ?
    `

    const values: any[][] = []

    for (const record of data) {
      const {
        id,
        lastname,
        firstname,
        middlename,
        extension,
        home_address,
        gender,
        birthdate,
        region,
        province,
        city,
        barangay,
        year_elected,
        term,
        photo,
        signature
      } = record

      // Save photo
      const savePhoto = async (id: string, base64: string, outputDir: string) => {
        const buffer = Buffer.from(base64.split(',')[1], 'base64')
        const photoPath = path.join(homeDir, outputDir, `${id}.jpg`)
        fs.writeFileSync(photoPath, buffer)
      }
      const throttledSavePhoto = asyncThrottle(savePhoto, fileWriteTrottle)
      if (photo && photo.startsWith('data:')) {
        await throttledSavePhoto(id, photo, photoDirectory)
      }

      // Save signature (do not modify)
      const saveSignature = async (id: string, base64: string, outputDir: string) => {
        const buffer = Buffer.from(base64.split(',')[1], 'base64')
        const signaturePath = path.join(homeDir, outputDir, `${id}.bmp`)
        fs.writeFileSync(signaturePath, buffer)
      }

      const throttledSaveSignature = asyncThrottle(saveSignature, fileWriteTrottle)
      if (signature && signature.startsWith('data:')) {
        await throttledSaveSignature(id, signature, signatureDirectory)
      }

      // Add row for DB
      values.push([
        id,
        lastname,
        firstname,
        middlename,
        extension,
        home_address,
        gender,
        birthdate,
        region,
        province,
        city,
        barangay,
        year_elected,
        term,
        id,
        id
      ])
    }

    await connection.query(insertQuery, [values])
    await connection.end()

    return { success: true }
  } catch (error: any) {
    console.error('Insert/Sync Error:', error)
    return { success: false, message: error.message }
  }
})

ipcMain.handle('get-last-synced-id', async (_event, config) => {
  const { host, port, user, password, database } = config

  try {
    const connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database
    })

    const [rows]: any = await connection.query(`
        SELECT id FROM tblDelegates ORDER BY id DESC LIMIT 1
      `)

    await connection.end()

    const lastId = rows.length > 0 ? rows[0].id : 0

    return { success: true, lastId }
  } catch (error: any) {
    console.error('Get Last ID Error:', error.message)
    return { success: false, message: error.message }
  }
})

function asyncThrottle<T extends (...args: any[]) => Promise<any>>(
  func: T,
  delay: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let lastCall = Promise.resolve()

  return async (...args: Parameters<T>) => {
    await lastCall
    const result = await func(...args)
    lastCall = new Promise((resolve) => setTimeout(resolve, delay))
    return result
  }
}
