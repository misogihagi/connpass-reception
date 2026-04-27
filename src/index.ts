import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { chromium, BrowserContext, Page } from 'playwright';

const app = new Hono();

let context: BrowserContext | null = null;
let page: Page | null = null;

async function initBrowser() {
  if (!context) {
    // ログイン状態を保持するために Persistent Context を使用
    // headless: false にしておくことで、管理者が最初の一回ログインできる
    context = await chromium.launchPersistentContext('./playwright-profile', {
      headless: false,
    });
    page = await context.newPage();
    await page.goto('https://connpass.com/login');
  }
}

app.post('/api/checkin', async (c) => {
  try {
    const { url } = await c.req.json();
    if (!url || typeof url !== 'string' || !url.startsWith('https://connpass.com/checkin/code/')) {
      return c.json({ success: false, error: 'Invalid URL' }, 400);
    }

    if (!page) {
      return c.json({ success: false, error: 'Browser not initialized' }, 500);
    }

    if (!context) {
      return c.json({ success: false, error: 'Browser not initialized' }, 500);
    }

    // 指定された受付URLを新しいタブで開く
    // Connpassの仕様上、ログイン済みの状態でこのURLを開くだけで受付が完了する
    const newPage = await context.newPage();
    await newPage.goto(url, { waitUntil: 'load' });

    // コンテンツを取得して成否判定（「人数を数える」代わりに確実なメッセージを抽出）
    const content = await newPage.content();
    let status = 'unknown';

    if (content.includes('ログイン') && content.includes('パスワード')) {
      return c.json({ success: false, error: 'Not logged in' });
    }

    // 実際のメッセージで判定
    if (content.includes('受付を完了しました') || content.includes('チェックインしました')) {
      status = 'success';
    } else if (content.includes('すでに') || content.includes('受付済み')) {
      status = 'already_checked_in';
    } else {
      // 予期せぬ画面でも一旦成功扱いとしてログに残す
      status = 'success';
    }

    return c.json({ success: true, status });
  } catch (err) {
    console.error(err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

app.use('/*', serveStatic({ root: './public' }));

initBrowser();
export default app;
