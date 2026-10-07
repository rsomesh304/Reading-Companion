const DB_NAME = "rc-reading-page";
const STORE = "page";

function openPageDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function transact(mode, action) {
  const db = await openPageDb();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const request = action(transaction.objectStore(STORE));
      transaction.oncomplete = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error("Page storage was cancelled"));
    });
  } finally {
    db.close();
  }
}

export async function savePage(bookId, page) {
  return transact("readwrite", (store) => store.put({ bookId, ...page }, "current"));
}

export async function loadPage(bookId) {
  const page = await transact("readonly", (store) => store.get("current"));
  return page?.bookId === bookId ? page : null;
}

export function createPageContextProvider(strategy = "inline-image") {
  if (strategy === "context-cache") throw new Error("Live API does not support cachedContent in session setup");
  if (strategy !== "inline-image") throw new Error(`Unknown page context strategy: ${strategy}`);
  let sentConnection = null;
  let sentVersion = null;
  return {
    async send(client, page, connectionId) {
      if (!page?.base64 || !client?.ready) return false;
      if (sentConnection === connectionId && sentVersion === page.updatedAt) return false;
      await client.sendVideoFrame(page.base64);
      sentConnection = connectionId;
      sentVersion = page.updatedAt;
      return true;
    },
  };
}
