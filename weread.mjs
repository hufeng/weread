#!/usr/bin/env node

import { join } from 'node:path'
import fs from 'node:fs/promises'
import puppeteer from 'puppeteer'
import { createObjectCsvWriter } from 'csv-writer'

const cwd = process.cwd()

;(async function bootstrap() {
  const browser = await puppeteer.launch({ headless: false })
  const page = await browser.newPage()
  await page.goto(`https://weread.qq.com/`)
  await page.waitForNetworkIdle()
  await page.click(`.navBar_link_Login`)

  /**
   * +------------------------------------------------------------------------+
   *  await manual scan qr login
   * +------------------------------------------------------------------------+
   */

  // waiting login success
  await page.waitForSelector('.wr_avatar')
  await page.waitForNetworkIdle()

  // get cookie user id
  const cookies = await page.cookies()
  const userId = cookies.find((c) => c.name === 'wr_localvid').value

  // send query bookshelf request
  const response = await page.goto(
    `https://i.weread.qq.com/shelf/sync?userVid=${userId}&synckey=0&lectureSynckey=0`
  )
  const data = await response.json()

  // save json
  await fs.writeFile(join(cwd, '微信读书.json'), JSON.stringify(data, null, 2))

  //save csv
  const csvWriter = createObjectCsvWriter({
    path: join(cwd, '微信读书.csv'),
    header: [
      { id: 'title', title: '书名' },
      { id: 'author', title: '作者' },
      { id: 'cover', title: '封面' },
      { id: 'publishTime', title: '出版日期' },
      { id: 'category', title: '分类' }
    ]
  })

  await csvWriter.writeRecords(
    data.books.map((book) => {
      // format time
      book.publishTime = book.publishTime.substring(0, 11)
      return book
    })
  )

  await browser.close()
})()
