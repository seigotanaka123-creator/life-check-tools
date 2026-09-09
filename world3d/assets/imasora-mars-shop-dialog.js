export const MARS_SHOP_DIALOG_GREETING = 'ワレワレハ、ウチュウジンダ！今日は何しに来たの？';
export const MARS_SHOP_DIALOG_CHOICES = Object.freeze([
  Object.freeze({ id: 'buy', text: '買い物させて' }),
  Object.freeze({ id: 'sell', text: '物を売らせて' }),
  Object.freeze({ id: 'features', text: '火星素材ショップの賞品の特徴は？' }),
  Object.freeze({ id: 'visit', text: '宇宙人に会いに来た！' }),
]);

// Conversation only: no inventory writes or shop transactions. The alien's
// answers will be added when supplied. For now the chosen REN line is shown.
export function createMarsShopDialogState() {
  return {
    open: false,
    phase: 'idle',
    touchLatched: false,
    selectedTopic: null,
    selectedText: '',
    updateContact({ eligible, touching, blocked = false }) {
      if (!eligible) {
        const changed = this.open;
        this.close({ resetTouchLatch: true });
        return changed;
      }
      if (!touching) { this.touchLatched = false; return false; }
      if (this.open || this.touchLatched || blocked) return false;
      this.open = true;
      this.phase = 'greeting';
      this.touchLatched = true;
      this.selectedTopic = null;
      this.selectedText = '';
      return true;
    },
    selectTopic(id) {
      if (!this.open || this.phase !== 'greeting') return false;
      const choice = MARS_SHOP_DIALOG_CHOICES.find(choice => choice.id === id);
      if (!choice) return false;
      this.selectedTopic = choice.id;
      this.selectedText = choice.text;
      this.phase = 'player-response';
      return true;
    },
    close({ resetTouchLatch = false } = {}) {
      this.open = false;
      this.phase = 'idle';
      this.selectedTopic = null;
      this.selectedText = '';
      if (resetTouchLatch) this.touchLatched = false;
    },
  };
}
