// Load and play the game's event sounds from one reusable client-side service.
class SoundEffects {
  constructor() {
    this.sources = {
      shoot: "/sounds/shootSound.ogg",
      collision: "/sounds/collisionSound.ogg",
      capture: "/sounds/captureSound.ogg",
    };
    this.unlocked = false;
    document.addEventListener("pointerdown", () => this.unlock(), { once: true });
    document.addEventListener("keydown", () => this.unlock(), { once: true });
  }

  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    for (const source of Object.values(this.sources)) {
      const audio = new Audio(source);
      audio.muted = true;
      audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;
      }).catch((error) => {
        this.unlocked = false;
        console.error("Unable to unlock game audio.", error);
      });
    }
  }

  play(effect) {
    const source = this.sources[effect];
    if (!source) return;
    const audio = new Audio(source);
    audio.volume = effect === "collision" ? 0.65 : 0.8;
    audio.play().catch((error) => {
      console.error(`Unable to play ${effect} sound.`, error);
    });
  }
}

export { SoundEffects };
