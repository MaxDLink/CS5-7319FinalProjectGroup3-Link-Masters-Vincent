import { LitElement, html, css } from 'lit';
import { UserManager } from 'oidc-client-ts';

class ProfileElement extends LitElement {
  static styles = css`
    :host {
      display: block;
      position: fixed;
      top: 0;
      left: 0;
      height: 100vh;
      width: 100vw;
      z-index: 9999;
      background-color: var(--background-color, #121212);
      margin: 0;
      padding: 0;
      font-family: 'Poppins', sans-serif;
    }

    div {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100%;
      color: var(--text-color, #ffffff);
    }

    button {
      margin: 10px;
      padding: 8px 12px;
      font-size: 0.85em;
      cursor: pointer;
      border: none;
      border-radius: 20px;
      background-color: var(--bg-color, rgba(30, 30, 30, 0.8));
      color: var(--text-color, #ffffff);
      transition: all 0.2s ease;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }

    button:hover {
      background-color: var(--hover-color, rgba(255, 255, 255, 0.1));
      transform: scale(1.05);
    }

    .stats-card {
      background: var(--card-bg-color, #1e1e1e);
      border-radius: 10px;
      padding: 2rem;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
      margin: 2rem;
      min-width: 300px;
      border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
    }

    .profile-name {
      font-size: 2rem;
      font-weight: bold;
      margin-bottom: 1.5rem;
      color: var(--text-color, #ffffff);
    }

    .stats-container {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
      text-align: center;
      margin-bottom: 1.5rem;
    }

    .stat-item {
      padding: 1rem;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: bold;
      color: #007BFF;
    }

    .stat-label {
      color: #6c757d;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
  `;

  static get properties() {
    return {
      profileName: { type: String },
      wins: { type: Number },
      losses: { type: Number },
      loading: { type: Boolean }
    };
  }

  constructor() {
    super();
    this.profileName = 'Loading...';
    this.wins = 0;
    this.losses = 0;
    this.loading = true;
    
    // Configure the UserManager with your Cognito settings
    this.userManager = new UserManager({
      authority: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_m9CtZ8Zr3",
      client_id: "tj2n9mnpm20nn9d015ahkr7da",
      redirect_uri: `${window.location.origin}/`,
      response_type: "code",
      scope: "email openid profile"
    });
    
    // Bind the event handler
    this.handleStatsUpdated = this.handleStatsUpdated.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    console.log('Profile element connected to DOM');
    
    // Load user info and stats
    this.loadUserProfile();
    
    // Listen for stats updates
    window.addEventListener('stats-updated', this.handleStatsUpdated);
  }
  
  disconnectedCallback() {
    super.disconnectedCallback();
    
    // Remove event listener
    window.removeEventListener('stats-updated', this.handleStatsUpdated);
  }

  handleStatsUpdated(event) {
    console.log('Stats updated event received:', event.detail);
    this.wins = event.detail.wins;
    this.losses = event.detail.losses;
    this.requestUpdate();
  }

  async loadUserProfile() {
    console.log('Loading user profile...');
    try {
      // Get user from Cognito
      const user = await this.userManager.getUser();
      if (user) {
        this.profileName = user.profile.email || user.profile.name || 'Player';
      } else {
        this.profileName = 'Guest Player';
      }
      
      // Get wins and losses from localStorage
      this.wins = parseInt(localStorage.getItem('playerWins') || '0', 10);
      this.losses = parseInt(localStorage.getItem('playerLosses') || '0', 10);
      
      console.log('Loaded stats:', { wins: this.wins, losses: this.losses });
      
      this.loading = false;
      this.requestUpdate();
    } catch (error) {
      console.error('Error loading profile:', error);
      this.loading = false;
    }
  }

  render() {
    console.log('Rendering profile with wins:', this.wins, 'losses:', this.losses);
    return html`
      <div>
        ${this.loading ? 
          html`<p>Loading profile data...</p>` : 
          html`
            <div class="stats-card">
              <div class="profile-name">${this.profileName}</div>
              <div class="stats-container">
                <div class="stat-item">
                  <div class="stat-value">${this.wins}</div>
                  <div class="stat-label">Wins</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value">${this.losses}</div>
                  <div class="stat-label">Losses</div>
                </div>
              </div>
            </div>
          `
        }
        <button @click="${this.backButton}">Back to Game</button>
        <button @click="${this.logout}">Logout</button>
      </div>
    `;
  }

  backButton() {
    console.log('Back button clicked, returning to game');
    
    // Get existing wins and losses to preserve them
    const wins = parseInt(localStorage.getItem('playerWins') || '0');
    const losses = parseInt(localStorage.getItem('playerLosses') || '0');
    
    // Get current gameId to preserve ship placements
    const gameId = localStorage.getItem('gameId');
    
    // Dispatch an event to notify other components about returning to game
    window.dispatchEvent(new CustomEvent('return-to-game', {
      detail: { 
        preserveGameState: true,
        gameId: gameId,
        wins, 
        losses 
      }
    }));
    
    // Remove this component from the DOM to return to the game
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
    
    // Find the game-board element and refresh it without resetting
    const gameBoard = document.querySelector('game-board');
    if (gameBoard && gameId) {
      // Just refresh the game state from database instead of resetting
      gameBoard.getGame();
    } else if (!gameId) {
      // If no gameId exists, we need to create a new game
      if (gameBoard) {
        gameBoard.resetGame();
      } else {
        // If we can't find the game board, force a page reload
        window.location.reload();
      }
    }
  }

  async logout() {
    console.log('Logout initiated');
    
    // Store current gameId to preserve game state
    const gameId = localStorage.getItem('gameId');
    
    // Clear authentication and game stats data from localStorage
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userId');
    localStorage.removeItem('playerWins');
    localStorage.removeItem('playerLosses');
    
    // Reset wins and losses to zero
    this.wins = 0;
    this.losses = 0;
    
    // Dispatch an event to notify other components about logout
    window.dispatchEvent(new CustomEvent('user-logged-out', {
      detail: { 
        preserveGameState: true,
        gameId: gameId,
        wins: 0, 
        losses: 0 
      }
    }));
    
    // Remove this component from the DOM to return to the game
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
    
    try {
      // First try to sign out locally
      await this.userManager.removeUser();
      
      // Use the same direct URL approach that works in login.js
      const clientId = "tj2n9mnpm20nn9d015ahkr7da";
      const logoutUri = `${window.location.origin}/`;
      const cognitoDomain = "https://us-east-1m9ctz8zr3.auth.us-east-1.amazoncognito.com";
      
      // Redirect to Cognito logout page
      window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
    } catch (error) {
      console.error('Logout error:', error);
      
      // If there's an error, at least try to reload the page
      window.location.reload();
    }
  }
}

// Define the custom element
customElements.define('profile-element', ProfileElement);
