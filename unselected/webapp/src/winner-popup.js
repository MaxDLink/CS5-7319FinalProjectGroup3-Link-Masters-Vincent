import { LitElement, html, css } from 'lit';
import { sounds } from './sounds.js';

export class WinnerPopup extends LitElement {
  static get properties() {
    return {
      winner: { type: String },
      visible: { type: Boolean }
    };
  }

  constructor() {
    super();
    this.winner = null;
    this.visible = false;
  }

  render() {
    if (!this.visible) return html``;
    
    return html`
      <div class="${this.winner === 'Player' ? 'win-banner' : 'lose-banner'}">
        ${this.winner === 'Player' 
          ? html`<div><span class="rainbow-text">YOU WIN!</span> <span class="emoji-text">🎉🥳🎉</span></div>` 
          : html`<div class="lose-text">YOU LOSE! 😔</div>`}
      </div>
    `;
  }

  show(winner) {
    console.log(`WinnerPopup: Showing ${winner} win banner`);
    this.winner = winner;
    this.visible = true;
    
    // Make sure we call requestUpdate() before playing sounds
    this.requestUpdate();
    
    // Play victory or defeat sound - add a small delay to ensure component is ready
    setTimeout(() => {
      sounds.initAudioContext();
      console.log(`Playing ${winner === 'Player' ? 'victory' : 'defeat'} sound`);
      if (winner === 'Player') {
        sounds.Victory();
      } else {
        sounds.Defeat();
      }
    }, 100);
    
    // Auto-hide the banner after 3 seconds
    setTimeout(() => {
      const bannerElement = this.shadowRoot.querySelector(`.${this.winner === 'Player' ? 'win-banner' : 'lose-banner'}`);
      if (bannerElement) {
        bannerElement.classList.add('fade-out');
      }
      
      // Reset the visible property after the animation completes
      setTimeout(() => {
        this.visible = false;
        this.requestUpdate();
      }, 1000);
    }, 3000);
  }

  static get styles() {
    return css`
      /* Win/Lose Popup Styles */
      .win-banner, .lose-banner {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 80%;
        max-width: 600px;
        padding: 30px;
        text-align: center;
        border-radius: 15px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        animation: banner-appear 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        z-index: 1100;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        pointer-events: auto;
      }
      
      .win-banner {
        background-color: rgba(46, 204, 113, 0.3);
        border: 3px solid gold;
      }
      
      .lose-banner {
        background-color: rgba(231, 76, 60, 0.3);
        border: 3px solid #e74c3c;
      }
      
      .rainbow-text {
        font-size: 4em;
        font-weight: bold;
        background-image: linear-gradient(to right, 
          #ff0000, #ff8000, #ffff00, #80ff00, #00ff00, #00ff80, #00ffff, 
          #0080ff, #0000ff, #8000ff, #ff00ff, #ff0080, #ff0000);
        background-size: 200% auto;
        color: transparent;
        background-clip: text;
        -webkit-background-clip: text;
        animation: rainbow 2s linear infinite;
        text-shadow: 0 0 15px rgba(255, 255, 255, 0.5);
        margin: 0;
        padding: 0;
        line-height: 1.2;
      }
      
      .lose-text {
        font-size: 4em;
        font-weight: bold;
        color: #e74c3c;
        text-shadow: 0 0 15px rgba(231, 76, 60, 0.7);
        margin: 0;
        padding: 0;
        line-height: 1.2;
      }
      
      .fade-out {
        animation: fade-out 1s forwards;
      }
      
      .emoji-text {
        font-size: 4em;
        font-weight: bold;
        margin: 0;
        padding: 0;
        line-height: 1.2;
      }
      
      @keyframes rainbow {
        0% { background-position: 0% 50%; }
        100% { background-position: 200% 50%; }
      }
      
      @keyframes banner-appear {
        0% { 
          transform: translate(-50%, -50%) scale(0.7);
          opacity: 0;
        }
        100% { 
          transform: translate(-50%, -50%) scale(1);
          opacity: 1;
        }
      }
      
      @keyframes fade-out {
        from { opacity: 1; }
        to { 
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.8);
        }
      }
    `;
  }
}

customElements.define('winner-popup', WinnerPopup);