'use strict'

const { EOF } = require('dns')
const fs = require('fs')
const { app, dialog } = require('electron').remote
const EOL = '\n'

function Page (text = '', path = null) {
  this.text = text.replace(/\r?\n/g, '\n')
  this.path = path
  this.size = 0
  this.watchdog = true
  this.line = 0

  this.name = function () {
    if (!this.path) { return 'Untitled' }

    const parts = this.path.replace(/\\/g, '/').split('/')
    return parts[parts.length - 1]
  }

  this.has_changes = function () {
    if (!this.path) {
      if (this.text && this.text.length > 0) { return true }
      return false
    }

    const last_size = this.size
    const ret = (this.load() !== this.text)
    
    // was this change done outside Left?
    if (ret && ( last_size !== this.size && this.watchdog )){
      const response = dialog.showMessageBoxSync(app.win, {
        type: "question",
        title: "Confirm",
        message: "File was modified outside Left. Do you want to reload it?",
        buttons: ['Yes', 'No', 'Ignore future occurrencies'],
        detail: `New size of file is: ${this.size} bytes.`,
        icon: `${app.getAppPath()}/icon.png`
      })

      if (response === 0) {
        this.commit( this.load() )
        left.reload()
        return !ret // return false as it was reloaded
      } else if (response === 2)
        this.watchdog = !this.watchdog
    }
    return ret
  }

  this.commit = function (text = left.textarea_el.value) {
    this.text = text
  }

  this.reload = function (force = false) {
    if (!this.path) { return }

    if (!this.has_changes() || force) {
      this.commit(this.load())
    }
  }

  this.load = function () {
    if (!this.path) { return }
    let data
    try {
      data = fs.readFileSync(this.path, 'utf-8')
    } catch (err) {
      this.path = null
      return
    }

    // update file size
    this.size = fs.statSync(this.path).size

    return data
  }

  this.markers = function () {
    const a = []
    const lines = this.text.split(EOL)
    for (const id in lines) {
      const line = lines[id].trim()
      if (line.substring(0, 2) === '##') { 
        a.push({ id: a.length, text: line.replace('##', '').trim(), line: parseInt(id), type: 'subheader' }) 
      } else if (line.substring(0, 1) === '#') { 
        a.push({ id: a.length, text: line.replace('#', '').trim(), line: parseInt(id), type: 'header' }) 
      } else if (line.substr(0, 2) === '--') { 
        a.push({ id: a.length, text: line.replace('--', '').trim(), line: parseInt(id), type: 'comment' }) 
      } else if (line.substr(0, 2) === '//') { 
        a.push({ id: a.length, text: line.replace('//', '').trim(), line: parseInt(id), type: 'comment' }) 
      } else if (line.substr(0, 5) === 'todo ') { 
        a.push({ id: a.length, text: line.replace('todo ', '○ ').trim(), line: parseInt(id), type: 'todo' }) 
      } else if (line.substr(0, 5) === 'done ') { 
        a.push({ id: a.length, text: line.replace('done ', '√ ').trim(), line: parseInt(id), type: 'done' }) 
      } else if (line.substr(0, 5) === 'mark ') { 
        a.push({ id: a.length, text: line.replace('mark ', '').trim(), line: parseInt(id), type: 'mark' }) 
      }
    }
    return a
  }

  this.on_drop = function (e) {
    const text = e.dataTransfer.getData('text')
    this.text += EOL
    this.text += text
    if (this === left.project.page()) {
      left.go.to_page(left.project.index)
      left.go.to_line(left.project.page().line)
    }
  }
}

module.exports = Page
