'use strict';
const TIERS = Object.freeze([
  { minimum:50, maximum:500, bps:500 },
  { minimum:500, maximum:1000, bps:550 },
  { minimum:1000, maximum:1700, bps:600 },
  { minimum:1700, maximum:2500, bps:650 },
  { minimum:2500, maximum:4000, bps:700 },
  { minimum:4000, maximum:5000, bps:750 },
  { minimum:5000, maximum:8000, bps:800 },
  { minimum:8000, maximum:12000, bps:900 },
  { minimum:12000, maximum:null, bps:1000 }
].map(Object.freeze));
const NOTICE_VERSION = 'portgainy-2026-11-v7';
function rateBps(balanceUnits) {
  const balance = BigInt(balanceUnits);
  return [...TIERS].reverse().find(t => balance >= BigInt(t.minimum)*1_000_000n)?.bps ?? TIERS[0].bps;
}
module.exports = {TIERS, NOTICE_VERSION, rateBps};
