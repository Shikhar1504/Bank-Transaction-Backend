import eventBus from "./eventBus.js";

// ✅ success event
eventBus.on("transaction.completed", (data) => {
  console.log("📩 Transaction Success:", data.transactionId);
});

// ❌ failure event
eventBus.on("transaction.failed", (data) => {
  console.log("📩 Transaction Failed:", data.transactionId);
});
