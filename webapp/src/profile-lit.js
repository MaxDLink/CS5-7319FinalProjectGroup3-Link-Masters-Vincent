import { LitElement, html, css } from 'lit';
import { CognitoIdentityClient } from "@aws-sdk/client-cognito-identity";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";
import { DynamoDBClient, GetItemCommand, UpdateItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { UserManager } from 'oidc-client-ts';

class ProfileElement extends LitElement {
  static styles = css`
    :host {
      display: block;
      position: fixed; /* Ensures the element is fixed to the viewport */
      top: 0;
      left: 0;
      height: 100vh; /* Fill the full height of the viewport */
      width: 100vw;  /* Fill the full width of the viewport */
      z-index: 9999; /* Ensure it's above all other elements */
      background-color: white; /* Add a background color to cover everything */
      margin: 0;
      padding: 0;
      font-family: Arial, sans-serif; /* Set a clean font style */
    }

    h1 {
      margin-top: 0;
      text-align: center;
    }

    div {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100%;
    }

    button {
      margin: 10px;
      padding: 10px 20px;
      font-size: 16px;
      cursor: pointer;
      border: 1px solid #ccc;
      border-radius: 5px;
      background-color: #007BFF;
      color: white;
      transition: background-color 0.3s ease;
    }

    button:hover {
      background-color: #0056b3;
    }

    .stats-card {
      background: #f8f9fa;
      border-radius: 10px;
      padding: 2rem;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      margin: 2rem;
      min-width: 300px;
    }

    .profile-name {
      font-size: 2rem;
      font-weight: bold;
      margin-bottom: 1.5rem;
      color: #2c3e50;
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
    
    // Bind event handlers to maintain 'this' context
    this.handleGameWon = this.handleGameWon.bind(this);
    this.handleGameLost = this.handleGameLost.bind(this);
  }

  async connectedCallback() {
    super.connectedCallback();
    console.log('Profile element connected to DOM');
    
    // Initialize UserManager if not already done
    if (!this.userManager) {
      this.initializeUserManager();
    }
    
    // Check if user is logged in
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (isLoggedIn) {
      this.loading = true;
      // Force a fresh load of the profile data
      await this.loadUserProfile();
    }
    
    // Add event listener for profile button clicks
    this.addEventListener('profile-button-clicked', this.handleProfileButtonClick);
  }

  async getAWSCredentials(idToken) {
    const client = new CognitoIdentityClient({ region: "us-east-1" });
    try {
      const credentials = await fromCognitoIdentityPool({
        client,
        identityPoolId: "us-east-1:c3790fe5-2ba0-4b01-b4ec-59182be5e818",
        logins: {
          [`cognito-idp.us-east-1.amazonaws.com/us-east-1_m9CtZ8Zr3`]: idToken,
        },
      })();
      return credentials;
    } catch (err) {
      console.error("Error obtaining AWS credentials:", err);
      throw err;
    }
  }

  async fetchUserProfile(credentials, userId) {
    const dynamoClient = new DynamoDBClient({
      region: "us-east-1",
      credentials,
    });
    
    const command = new GetItemCommand({
      TableName: "App-MyTable794EDED1-1DVU471JFF49V",
      Key: {
        pk: { S: `USER#${userId}` },
        sk: { S: "PROFILE" },
      },
    });

    try {
      const response = await dynamoClient.send(command);
      const item = response.Item;
      
      if (item) {
        // Update the component properties with the retrieved data
        this.profileName = item.name?.S || this.profileName;
        this.wins = item.wins ? parseInt(item.wins.N, 10) : 0;
        this.losses = item.losses ? parseInt(item.losses.N, 10) : 0;
      } else {
        // Create a new profile if one doesn't exist
        await this.createUserProfile(userId, credentials);
      }
    } catch (error) {
      console.error("Error retrieving user profile:", error);
    }
  }

  async createNewUserProfile(userId, credentials) {
    const dynamoClient = new DynamoDBClient({
      region: "us-east-1",
      credentials,
    });
    
    const params = {
      TableName: "App-MyTable794EDED1-1DVU471JFF49V",
      Item: {
        pk: { S: `USER#${userId}` },
        sk: { S: "PROFILE" },
        name: { S: this.profileName },
        wins: { N: "0" },
        losses: { N: "0" },
        createdAt: { S: new Date().toISOString() }
      }
    };

    try {
      const putCommand = new PutItemCommand(params);
      await dynamoClient.send(putCommand);
      console.log("Created new profile for user", userId);
    } catch (error) {
      console.error("Error creating new user profile:", error);
    }
  }

  // Method to update stats in DynamoDB
  async updateStatsInDB(userId, statType, credentials) {
    console.log(`Updating ${statType} for user ${userId}`);
    const dynamoClient = new DynamoDBClient({
      region: "us-east-1",
      credentials
    });
    
    // First check if the user profile exists
    const userProfile = await this.getUserStats(userId, credentials);
    
    if (!userProfile) {
      console.log('User profile not found, creating new profile');
      await this.createUserProfile(userId, credentials);
    }
    
    // Now update the specific stat
    const params = {
      TableName: "App-MyTable794EDED1-1DVU471JFF49V", // Your DynamoDB table name
      Key: {
        pk: { S: `USER#${userId}` },
        sk: { S: "PROFILE" }
      },
      UpdateExpression: `SET ${statType} = :newValue`,
      ExpressionAttributeValues: {
        ":newValue": { N: (statType === 'wins' ? this.wins + 1 : this.losses + 1).toString() }
      },
      ReturnValues: "UPDATED_NEW"
    };
    
    try {
      console.log('Sending update command to DynamoDB with params:', JSON.stringify(params, null, 2));
      const command = new UpdateItemCommand(params);
      const response = await dynamoClient.send(command);
      console.log(`Successfully updated ${statType} for user ${userId}`, response);
      
      // Verify the update by fetching the profile again
      const updatedProfile = await this.getUserStats(userId, credentials);
      console.log('Updated profile:', updatedProfile);
      
      return response;
    } catch (error) {
      console.error(`Error updating ${statType}:`, error);
      console.error('Error details:', error.stack);
      throw error;
    }
  }

  // Method to update wins
  async updateWins() {
    console.log('updateWins called');
    const userId = localStorage.getItem('userId');
    if (!userId) {
      console.error('No userId found in localStorage');
      return;
    }
    
    try {
      const user = await this.userManager.getUser();
      if (!user) {
        console.error('No user found from userManager');
        return;
      }
      
      console.log('Getting AWS credentials');
      const credentials = await this.getAWSCredentials(user.id_token);
      console.log('Updating wins in DB');
      await this.updateStatsInDB(userId, 'wins', credentials);
      this.wins++; // Update the UI immediately
      console.log('Wins incremented to', this.wins);
      this.requestUpdate();
    } catch (error) {
      console.error("Error updating wins:", error);
    }
  }

  // Method to update losses
  async updateLosses() {
    console.log('updateLosses called');
    const userId = localStorage.getItem('userId');
    if (!userId) {
      console.error('No userId found in localStorage');
      return;
    }
    
    try {
      const user = await this.userManager.getUser();
      if (!user) {
        console.error('No user found from userManager');
        return;
      }
      
      console.log('Getting AWS credentials');
      const credentials = await this.getAWSCredentials(user.id_token);
      console.log('Updating losses in DB');
      await this.updateStatsInDB(userId, 'losses', credentials);
      this.losses++; // Update the UI immediately
      console.log('Losses incremented to', this.losses);
      this.requestUpdate();
    } catch (error) {
      console.error("Error updating losses:", error);
    }
  }

  render() {
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
    // Remove this component from the DOM to return to the game
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  }

  logout() {
    // Clear local storage
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userId');
    
    // Use the UserManager to sign out
    this.userManager.signoutRedirect().then(() => {
      console.log('Logout initiated');
    }).catch(error => {
      console.error('Logout error:', error);
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    
    // Remove event listeners when component is removed
    window.removeEventListener('game-won', this.handleGameWon);
    window.removeEventListener('game-lost', this.handleGameLost);
  }

  // Event handlers
  async handleGameWon(event) {
    console.log('Game won event received in profile component', event);
    try {
      await this.updateWins();
      console.log('Wins updated successfully, new count:', this.wins);
      this.requestUpdate(); // Force UI update
    } catch (error) {
      console.error('Error updating wins:', error);
    }
  }
  
  async handleGameLost(event) {
    console.log('Game lost event received in profile component', event);
    try {
      await this.updateLosses();
      console.log('Losses updated successfully, new count:', this.losses);
      this.requestUpdate(); // Force UI update
    } catch (error) {
      console.error('Error updating losses:', error);
    }
  }

  // Handle profile button clicks
  async handleProfileButtonClick(event) {
    console.log('Profile button clicked event received');
    this.loading = true;
    // Force a fresh load of the profile data
    await this.loadUserProfile();
  }

  // Modify the loadUserProfile method to ensure it always gets fresh data
  async loadUserProfile() {
    console.log('Loading user profile...');
    try {
      const user = await this.userManager.getUser();
      if (!user) {
        console.error('No user found from userManager');
        this.loading = false;
        return;
      }
      
      // Get user ID from token or localStorage
      const userId = user.profile.sub || localStorage.getItem('userId');
      if (!userId) {
        console.error('No userId found');
        this.loading = false;
        return;
      }
      
      // Store userId in localStorage for future use
      localStorage.setItem('userId', userId);
      
      // Set profile name from user info
      this.profileName = user.profile.email || user.profile.name || 'Player';
      
      // Get AWS credentials
      const credentials = await this.getAWSCredentials(user.id_token);
      
      // Make sure we clear any cached values
      this.wins = 0;
      this.losses = 0;
      
      // Force a fresh fetch from DynamoDB
      const userStats = await this.getUserStats(userId, credentials);
      
      if (userStats) {
        this.wins = userStats.wins?.N ? parseInt(userStats.wins.N, 10) : 0;
        this.losses = userStats.losses?.N ? parseInt(userStats.losses.N, 10) : 0;
        console.log('Loaded stats from DB:', { wins: this.wins, losses: this.losses });
      } else {
        console.log('No user stats found, creating profile');
        await this.createUserProfile(userId, credentials);
      }
      
      this.loading = false;
      this.requestUpdate();
      console.log('Profile loaded successfully:', { name: this.profileName, wins: this.wins, losses: this.losses });
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
      this.loading = false;
    }
  }

  // Get user stats from DynamoDB
  async getUserStats(userId, credentials) {
    console.log('Getting user stats from DynamoDB for userId:', userId);
    
    const dynamoClient = new DynamoDBClient({
      region: "us-east-1",
      credentials
    });
    
    const params = {
      TableName: "App-MyTable794EDED1-1DVU471JFF49V", // Your DynamoDB table name
      Key: {
        pk: { S: `USER#${userId}` },
        sk: { S: "PROFILE" }
      }
    };
    
    try {
      console.log('GetItem params:', JSON.stringify(params, null, 2));
      const command = new GetItemCommand(params);
      const response = await dynamoClient.send(command);
      console.log('DynamoDB response (raw):', JSON.stringify(response, null, 2));
      
      // Log the actual values we're extracting
      if (response.Item) {
        console.log('Extracted values:', {
          wins: response.Item.wins?.N ? parseInt(response.Item.wins.N, 10) : 0,
          losses: response.Item.losses?.N ? parseInt(response.Item.losses.N, 10) : 0
        });
      }
      
      return response.Item;
    } catch (error) {
      console.error('Error getting user stats:', error);
      return null;
    }
  }

  // Create a new user profile in DynamoDB
  async createUserProfile(userId, credentials) {
    console.log('Creating new user profile...');
    const dynamoClient = new DynamoDBClient({
      region: "us-east-1",
      credentials
    });
    
    const params = {
      TableName: "App-MyTable794EDED1-1DVU471JFF49V", // Your DynamoDB table name
      Item: {
        pk: { S: `USER#${userId}` },
        sk: { S: "PROFILE" },
        wins: { N: "0" },
        losses: { N: "0" },
        createdAt: { S: new Date().toISOString() }
      }
    };
    
    try {
      const command = new PutItemCommand(params);
      await dynamoClient.send(command);
      console.log('New profile created successfully');
    } catch (error) {
      console.error('Error creating user profile:', error);
    }
  }

  updated(changedProperties) {
    if (changedProperties.has('wins') || changedProperties.has('losses')) {
      console.log('Stats updated in component:', { wins: this.wins, losses: this.losses });
    }
  }
}

// Define the custom element
customElements.define('profile-element', ProfileElement);
