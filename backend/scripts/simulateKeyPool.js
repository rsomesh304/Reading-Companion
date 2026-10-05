import { KeyPool } from "../geminiKeyPool.js";

const keyCount = Math.max(1, Number(process.argv[2]) || 7);
const requestCount = Math.max(1, Number(process.argv[3]) || 20);
const pool = new KeyPool(keyCount);

try {
  const leases = await Promise.all(Array.from({ length: requestCount }, () => pool.acquireLease({ timeoutMs: 0 })));
  const unavailable = leases.filter((lease) => lease.unavailable).length;
  console.log(JSON.stringify({ keyCount, requestCount, unavailable, keys: pool.status() }, null, 2));
  leases.forEach((lease) => { if (lease.leaseId) pool.releaseLease(lease.leaseId); });
} finally {
  pool.close();
}
