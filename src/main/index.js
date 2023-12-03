import { app, shell, BrowserWindow, ipcMain } from 'electron'
import sql from 'mssql'
import fs from 'fs'
import path from 'path'

import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 600,
    height: 540,
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

// Listen for messages from the renderer process to update settings
ipcMain.on('update-settings', async (event, newSettings) => {
  try {
    // Read the existing settings
    const settingsPath = path.join(app.getPath('userData'), 'settings.json')
    const existingSettingsData = await fs.readFile(settingsPath, 'utf-8')
    const existingSettings = JSON.parse(existingSettingsData)

    // Update the database configuration
    existingSettings.database = newSettings.database

    // Write the updated settings back to the file
    await fs.writeFile(settingsPath, JSON.stringify(existingSettings, null, 2))

    // Respond to the renderer process with a success message or updated settings
    event.reply('update-settings-response', { success: true, settings: existingSettings })
  } catch (error) {
    // Handle errors updating the settings
    console.error('Error updating settings:', error)

    // Respond to the renderer process with an error message
    event.reply('update-settings-response', { success: false, error: error.message })
  }
})

// Listen for messages from the renderer process to insert data
ipcMain.on('insert-data', async (event, dataToInsert) => {
  try {
    // Read the settings file
    const settingsPath = path.join(app.getPath('userData'), 'settings.json')
    const settingsData = await fs.readFile(settingsPath, 'utf-8')
    const settings = JSON.parse(settingsData)

    // Configure the default database connection
    await sql.connect(settings.database)
    // Configure your MSSQL connection
    const config = {
      user: 'your_username',
      password: 'your_password',
      server: 'your_server',
      database: 'your_database',
      options: {
        encrypt: true // Use this if you're on Windows Azure
      }
    }

    // Connect to the database
    await sql.connect(config)

    // Perform the database operation (insert data)
    const result = await sql.query`INSERT INTO your_table (column_name) VALUES (${dataToInsert})`

    // Handle success or send a response back to the renderer process
    event.reply('insert-data-response', { success: true, result })
  } catch (error) {
    // Handle errors
    console.error('Error inserting data:', error)

    // Send an error response back to the renderer process
    event.reply('insert-data-response', { success: false, error: error.message })
  } finally {
    // Close the database connection
    await sql.close()
  }
})
