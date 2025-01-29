import { LitElement, html, css } from 'lit';

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
  `;

  render() {
    return html`
      <div>
        <h1>Welcome to the User Profile Page</h1>
        <p>Here you can view and edit your profile information.</p>
        <button @click="${this.editProfile}">Edit Profile</button>
        <button @click="${this.logout}">Logout</button>
      </div>
    `;
  }

  editProfile() {
    alert('Edit Profile clicked!');
    // Add your edit profile logic here
  }

  logout() {
    alert('Logout clicked!');
    // Add your logout logic here
  }
}

// Define the custom element
customElements.define('profile-element', ProfileElement);
