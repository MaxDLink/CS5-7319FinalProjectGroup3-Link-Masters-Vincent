/* global Event */
import {html, css, LitElement} from 'lit'
import { UserManager } from 'oidc-client-ts'
import { Log } from 'oidc-client-ts';
Log.setLogger(console);

/**
 * @module Login
 * @description UI web component.
 */

/**
 * @class Login
 * @extends {LitElement}
 * @description Web component handle login and logout
 */
export class Login extends LitElement {
  static get styles() {
    return css`
      .login-container {
        text-align: center;
        padding: 10px 0;
        background-color: var(--secondary-color);
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
      authority: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_m9CtZ8Zr3", // https://cognito-idp.us-east-1.amazonaws.com/us-east-1_0OuOMPrYV/.well-known/openid-configuration //Mine: https://cognito-idp.us-east-1.amazonaws.com/us-east-1_0OuOMPrYV //OG: https://cognito-idp.us-east-1.amazonaws.com/us-east-1_jtLSTs85q
      client_id: "tj2n9mnpm20nn9d015ahkr7da", //Mine: 2c3i2f2t829bjrbpgj6fem79n4 //OG: 1ttf4hijhkkf4nc3h3ame5e16a
      redirect_uri: `${window.location.origin}/`,
      post_logout_redirect_uri: `${window.location.origin}/`,
      response_type: "code",
      scope: "email openid profile",
      // cognito specific settings
      // no revoke of "access token" (https://github.com/authts/oidc-client-ts/issues/262)
      revokeTokenTypes: ["refresh_token"],
      // no silent renew via "prompt=none" (https://github.com/authts/oidc-client-ts/issues/366)
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
      } else {
        console.log('User Not Logged In');
      }
      // console.log(this.user)
    })

    if (window.location.search.includes("code")) {
      try {
        this.userManager.signinCallback().then(data => {
          console.log(this.auth)
          this.userManager.getUser().then(user => {
            this.user = user
            console.log(this.user)
            window.location.href = '/'
          })
        })
      } catch (error) {
        console.error('code error', error)
      }
    }

  }

  render() {
    return html`
    ${this.user ? html`
      <div class="login-container">
          <button @click=${this._onClickLogout} id="signOut" class="lite">${this.user?.profile?.email}</button>
      </div>
    ` : html`
      <div class="login-container">
          <button @click=${this._onClickLogin} id="signIn" class="lite">Sign In</button>
      </div>
    `}
    ` 
  }

  update(changedProperties) {
    super.update(changedProperties)
  }

  _onClickLogin() {
    // this.dispatchEvent(new CustomEvent('login', {detail: {}}))
    this.userManager.signinRedirect().then(data => {
      console.log(data)
    })
  }

  _onClickLogout() {
    this.userManager.removeUser()
    const clientId = "tj2n9mnpm20nn9d015ahkr7da"; //mine:2c3i2f2t829bjrbpgj6fem79n4 //OG: 1ttf4hijhkkf4nc3h3ame5e16a
    const logoutUri = `${window.location.origin}/`;
    // https://us-east-10ouompryv.auth.us-east-1.amazoncognito.com/oauth2/token
    const cognitoDomain = "https://us-east-1m9ctz8zr3.auth.us-east-1.amazoncognito.com"; //Mine: https://us-east-10ouompryv.auth.us-east-1.amazoncognito.com //OG: https://backend-auth.auth.us-east-1.amazoncognito.com
    window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
  }
}

/**
 * @customElement login-element
 */
window.customElements.define('login-element', Login)
