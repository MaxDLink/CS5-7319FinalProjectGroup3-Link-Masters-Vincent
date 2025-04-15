import {html, css, LitElement} from 'lit'
import { UserManager } from 'oidc-client-ts'
import { Log } from 'oidc-client-ts';
Log.setLogger(console);

export class Login extends LitElement {
  static get styles() {
    return css`
      .login-container {
        position: fixed; /* Keep it fixed in the window */
        top: 10px; /* Position it below the top */
        left: 20px; /* Position it from the left */
        text-align: center;
        padding: 10px;
        background-color: var(--secondary-color);
        border-radius: 5px; /* Rounded corners */
        opacity: 1; /* Fully visible */
        pointer-events: auto; /* Ensure it can receive clicks */
        z-index: 1000; /* High z-index to ensure it appears above other elements */
        
      }
    `
  }

  static get properties() {
    return {
      user: {type: Object, state: true},
      cognitoAuthConfig: {type: Object},
      auth: {type: Object},
      profile: {type: Object},
      accessToken: {type: String},
      email: {type: String}
    }
  }

  constructor() {
    super()
    this.user = null
    this.auth = null 
    this.profile = null 
    this.accessToken = null 
    this.email = null 

    this.cognitoAuthConfig = {
      authority: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_VtsIc3ZeH", // https://cognito-idp.us-east-1.amazonaws.com/us-east-1_0OuOMPrYV/.well-known/openid-configuration //Mine: https://cognito-idp.us-east-1.amazonaws.com/us-east-1_0OuOMPrYV //OG: https://cognito-idp.us-east-1.amazonaws.com/us-east-1_jtLSTs85q
      client_id: "9ihaiqmpt1f94sci2553h6cfn", //Mine: 2c3i2f2t829bjrbpgj6fem79n4 //OG: 1ttf4hijhkkf4nc3h3ame5e16a
      redirect_uri: `${window.location.origin}/`,
      post_logout_redirect_uri: `${window.location.origin}/`,
      response_type: "code",
      scope: "email openid phone",
      revokeTokenTypes: ["refresh_token"],
      automaticSilentRenew: false,
    }

    this.userManager = new UserManager({
        ...this.cognitoAuthConfig,
    })
    window.userManager = this.userManager


    this.userManager.getUser().then(user => {
      this.user = user;
      if (this.user) {
        console.log('User Logged In');
        localStorage.setItem('isLoggedIn', 'true');

        this.dispatchEvent(new CustomEvent('login-success', {
          bubbles: true,
          composed: true,
          detail: { user: this.user }
        }));
      }
      else {
        console.log('User Not Logged In');
        localStorage.setItem('isLoggedIn', 'false');
      }
      this.dispatchEvent(new CustomEvent('login', {detail: {isLoggedIn: this.user ? true : false}}))
    })

    if (window.location.search.includes("code")) {
      try {
        this.userManager.signinCallback().then(data => {
          console.log(this.auth)
          this.userManager.getUser().then(user => {
            this.user = user
            console.log(this.user)
            localStorage.setItem('isLoggedIn', 'true');

            this.dispatchEvent(new CustomEvent('login-success', {
              bubbles: true,
              composed: true,
              detail: { user: this.user }
            }));
            window.location.href = '/'
            this.dispatchEvent(new CustomEvent('login', {detail: {isLoggedIn: this.user ? true : false}}))
          })
        })
      } catch (error) {
        console.error('code error', error)
      }
    }

  }

  render() {
    return html`
      <div class="login-container">
        ${this.user ? html`
          <button @click=${this._onClickLogout} id="signOut" class="lite">${this.user?.profile?.email}</button>
        ` : html`
          <button @click=${this._onClickLogin} id="signIn" class="lite">Sign In</button>
        `}
      </div>
    ` 
  }

  update(changedProperties) {
    super.update(changedProperties)
  }

  _onClickLogin() {
    this.userManager.signinRedirect().then(data => {
      console.log(data)
    })
  }

  _onClickLogout() {
    localStorage.setItem('isLoggedIn', 'false');
    this.userManager.removeUser()
    const clientId = "9ihaiqmpt1f94sci2553h6cfn"; //mine:2c3i2f2t829bjrbpgj6fem79n4 //OG: 1ttf4hijhkkf4nc3h3ame5e16a
    const logoutUri = `${window.location.origin}/`;
    const cognitoDomain = "https://us-east-1vtsic3zeh.auth.us-east-1.amazoncognito.com"; //Mine: https://us-east-10ouompryv.auth.us-east-1.amazoncognito.com //OG: https://backend-auth.auth.us-east-1.amazoncognito.com
    window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
  }

  

}

/**
 * @customElement login-element
 */
window.customElements.define('login-element', Login)
