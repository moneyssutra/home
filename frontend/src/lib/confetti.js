import confetti from "canvas-confetti";

/**
 * Fire a celebratory confetti burst.
 * Call after successful form save, before navigation.
 */
export function fireConfetti() {
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

  confetti({ ...defaults, particleCount: 50, origin: { x: 0.3, y: 0.6 } });
  confetti({ ...defaults, particleCount: 50, origin: { x: 0.7, y: 0.6 } });

  setTimeout(() => {
    confetti({ ...defaults, particleCount: 30, origin: { x: 0.5, y: 0.4 }, scalar: 1.2 });
  }, 150);
}
