/**
 * @module Sounds
 * @description This module provides functionality for generating audio sounds using the Web Audio API.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/AudioContext
 */


/**
 * Represents a class for generating audio sounds.
 */
class Sounds {
  constructor() {
    this.audioContext = null;
    
  }

  /**
   * Initializes the audio context if it hasn't been initialized yet.
   */
  initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
  }

  /**
   * Generates a coin sound
   */
  HitEnemy() { // sound for hitting an enemy
    
    this.initAudioContext();
    const oscillator = this.audioContext.createOscillator();
    oscillator.frequency.value = 2000; // in Hz
    oscillator.type = "sine";
    const gain = this.audioContext.createGain();
    gain.gain.value = 0;
    oscillator.connect(gain);

    gain.connect(this.audioContext.destination);
    function envelope(gainNode, time) {
      var attackTime = 0.01;
      var decayTime = 0.9;
      var sustainLevel = 0.2;
      var releaseTime = 0.7;
      gainNode.gain.setValueAtTime(1, time);

      // Linearly decrease the gain value to the sustain level at the end of the attack phase
      gainNode.gain.linearRampToValueAtTime(sustainLevel, time + attackTime);

      // Exponentially decrease the gain value to 0 at the end of the decay phase
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + attackTime + decayTime);

      // Set the gain value to 0 at the end of the release phase
      gainNode.gain.setValueAtTime(0, time + attackTime + decayTime + releaseTime);
    }

    oscillator.onended = () => {
      this.isPlaying = false;
    };

    oscillator.start();
    envelope(gain, this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 1);
  }

  HitPlayer() {

    this.initAudioContext();
  
      // Create a buffer for noise
      const bufferSize = this.audioContext.sampleRate * 1; // 1 second of audio
      const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      
      // Fill the buffer with white noise
      for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1; // Generate random values between -1 and 1
      }
  
      const noiseSource = this.audioContext.createBufferSource();
      noiseSource.buffer = noiseBuffer;
  
      // Add a low-pass filter for a more explosion-like sound
      const filter = this.audioContext.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 1500; // Adjust frequency to change explosion timbre
      filter.Q.value = 1;
  
      // Create a gain node for volume control
      const gain = this.audioContext.createGain();
      gain.gain.value = 0; // Start with gain at 0
  
      noiseSource.connect(filter);
      filter.connect(gain);
      gain.connect(this.audioContext.destination);
  
      function envelope(gainNode, time) {
          const attackTime = 0.05;
          const decayTime = 0.3;
          const sustainLevel = 0.1;
          const releaseTime = 0.4;
  
          gainNode.gain.setValueAtTime(1, time);
          gainNode.gain.linearRampToValueAtTime(sustainLevel, time + attackTime);
          gainNode.gain.exponentialRampToValueAtTime(0.001, time + attackTime + decayTime);
          gainNode.gain.setValueAtTime(0, time + attackTime + decayTime + releaseTime);
      }
  
      noiseSource.onended = () => {
          this.isPlaying = false;
      };
  
      noiseSource.start();
      envelope(gain, this.audioContext.currentTime);
      noiseSource.stop(this.audioContext.currentTime + 1);
  }

}



const sounds = new Sounds()
export {sounds}; 