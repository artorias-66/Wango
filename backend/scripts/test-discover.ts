import { discoverHangouts } from '../src/services/hangouts.service';

async function main() {
  const lat = 12.9716; // Approx Bangalore
  const lng = 77.5946;
  
  // Test with currentUserId = 6 (user who joined)
  console.log("--- With User ID 6 ---");
  const res = await discoverHangouts(lat, lng, 10000, undefined, 6);
  console.log(JSON.stringify(res, null, 2));
}

main().catch(console.error);
