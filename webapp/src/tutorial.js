/* global Event */
import {html, css, LitElement} from 'lit'
import './game-board.js'
import {
  GameBoardOverview,
  ShipPlacementBoard,
  EnemyAttackBoard,
  PlayerAttackBoard,
  VictoryScreenBoard
} from './game-board-mixins.js'


/**
 * @class Tutorial
 * @extends {LitElement}
 * @description Web component handle tutorial onboarding 
 */
export class Tutorial extends LitElement {
  static get styles() {
    return css`
      :host {
        --primary-color: #3498db;
        --secondary-color: #2ecc71;
        --background-color: #121212;
        --card-bg-color: #1e1e1e;
        --text-color: #ffffff;
        --border-color: rgba(255, 255, 255, 0.1);
        display: block;
        width: 100%;
        background-color: var(--background-color);
        color: var(--text-color);
        font-family: 'Poppins', sans-serif;
      }

      section {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        padding: 20px;
        opacity: 0;
        transform: translateY(20px);
        transition: opacity 0.6s ease-out, transform 0.6s ease-out;
      }

      section.visible {
        opacity: 1;
        transform: translateY(0);
      }

      h1, h2 {
        color: var(--primary-color);
        text-align: center;
        margin-bottom: 20px;
        font-size: 2.5em;
      }

      p {
        color: var(--text-color);
        text-align: center;
        max-width: 600px;
        margin: 0 auto 30px;
        font-size: 1.2em;
        line-height: 1.6;
      }

      .game-board-container {
        margin: 20px 0;
        opacity: 0;
        transform: scale(0.9);
        transition: opacity 0.6s ease-out, transform 0.6s ease-out;
      }

      .game-board-container.visible {
        opacity: 1;
        transform: scale(1);
      }

      .button-container {
        margin-top: 40px;
      }

      .button-container button {
        padding: 12px 24px;
        font-size: 1.1em;
        background-color: var(--primary-color);
        color: var(--text-color);
        border: none;
        border-radius: 25px;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .button-container button:hover {
        background-color: var(--secondary-color);
        transform: translateY(-2px);
      }

      @media (max-width: 768px) {
        h1, h2 {
          font-size: 2em;
        }
        
        p {
          font-size: 1em;
          padding: 0 20px;
        }
      }
    `
  }

  static get properties() {
    return {
      
    }
  }

  constructor() {
    super(); 
    this.observer = null;
  }

  firstUpdated() {
    // Set up intersection observer for scroll animations
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, {
      threshold: 0.1
    });

    // Observe all sections and game board containers
    this.shadowRoot.querySelectorAll('section, .game-board-container').forEach(el => {
      this.observer.observe(el);
    });
  }

  disconnectedCallback() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  render() {
    return html`
      <section>
        <h1>Welcome to Battle Ship Down!</h1>
        <p>Scroll down to learn how to play</p>
      </section>

      <section>
        <h2>Game Boards</h2>
        <p>There are two game boards: your board and the enemy's board. Each board is a 4x4 grid where ships can be placed.</p>
        <div class="game-board-container">
          <game-board-overview></game-board-overview>
        </div>
      </section>

      <section>
        <h2>Placing Ships</h2>
        <p>First, you'll place your ships on your board. Click on your board four times to place your ships.</p>
        <div class="game-board-container">
          <ship-placement-board></ship-placement-board>
        </div>
      </section>

      <section>
        <h2>Enemy Attacks</h2>
        <p>The enemy will attack your board. Watch out for their attacks!</p>
        <div class="game-board-container">
          <enemy-attack-board></enemy-attack-board>
        </div>
      </section>

      <section>
        <h2>Your Turn to Attack</h2>
        <p>Now it's your turn to attack the enemy's board. Try to find and sink their ships!</p>
        <div class="game-board-container">
          <player-attack-board></player-attack-board>
        </div>
      </section>

      <section>
        <h2>Victory!</h2>
        <p>Keep attacking until you sink all enemy ships to win the game!</p>
        <div class="game-board-container">
          <victory-screen-board></victory-screen-board>
        </div>
      </section>

      <section>
        <h2>Ready to Play?</h2>
        <p>Now that you know how to play, click the button below to start a new game!</p>
        <div class="button-container">
          <button @click=${this.playButton}>Start Game</button>
        </div>
      </section>
    ` 
  }

  playButton() {
    console.log('Play button clicked!');
    window.location.reload();
  }
}

/**
 * @customElement login-element
 */
window.customElements.define('tutorial-element', Tutorial)
