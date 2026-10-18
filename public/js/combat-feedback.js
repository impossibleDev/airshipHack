// Present brief, consistent feedback for combat events received from the server.
class CombatFeedback {
  constructor(messageElement, flashElement, soundEffects) {
    this.messageElement = messageElement;
    this.flashElement = flashElement;
    this.soundEffects = soundEffects;
    this.messageTimeout = null;
    this.flashTimeout = null;
  }

  show({ type, amount }) {
    const messages = {
      damage: `HULL HIT -${amount}`,
      hit: `HIT +${amount}`,
      impact: `COLLISION -${amount}`,
      capture: "CAPTURE SECURED",
      protected: "SPAWN SHIELD",
      blocked: "ENEMY SHIELDED",
    };
    const message = messages[type];
    if (!message) return;
    if (type === "hit" || type === "damage" || type === "impact") {
      this.soundEffects.play("collision");
    } else if (type === "capture") {
      this.soundEffects.play("capture");
    }

    clearTimeout(this.messageTimeout);
    this.messageElement.textContent = message;
    this.messageElement.className = `combat-feedback ${type}`;
    void this.messageElement.offsetWidth;
    this.messageElement.classList.add("visible");
    this.messageTimeout = setTimeout(() => {
      this.messageElement.classList.remove("visible");
    }, 1400);

    if (type === "damage" || type === "impact") {
      clearTimeout(this.flashTimeout);
      this.flashElement.classList.remove("active");
      void this.flashElement.offsetWidth;
      this.flashElement.classList.add("active");
      this.flashTimeout = setTimeout(() => {
        this.flashElement.classList.remove("active");
      }, 420);
    }
  }
}

export { CombatFeedback };
