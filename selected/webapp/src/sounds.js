class Sounds {
  constructor() {
    this.audioContext = null;
  }

  initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
  }

  HitEnemy() { // sound for hitting an enemy
    
    this.initAudioContext();
    const oscillator = this.audioContext.createOscillator();
    oscillator.frequency.value = 2000; //Hz
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

      // Envelope Options - Effects Playback
      gainNode.gain.linearRampToValueAtTime(sustainLevel, time + attackTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + attackTime + decayTime);
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
  
      const bufferSize = this.audioContext.sampleRate * 1; // 1 second of audio
      const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      
      for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
      }
  
      const noiseSource = this.audioContext.createBufferSource();
      noiseSource.buffer = noiseBuffer;
  
      // Add a low-pass filter for a more explosion-like sound
      const filter = this.audioContext.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 1500;
      filter.Q.value = 1;
  
      const gain = this.audioContext.createGain();
      gain.gain.value = 0;
  
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

  Victory() {
    this.initAudioContext();
    
    const oscillator1 = this.audioContext.createOscillator();
    const oscillator2 = this.audioContext.createOscillator();
    
    oscillator1.type = "triangle";
    oscillator2.type = "sine";
    
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = 0.3;
    
    // Connect both oscillators to gain node
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    const now = this.audioContext.currentTime;
    
    // Note Progression

    oscillator1.frequency.setValueAtTime(440, now);
    oscillator2.frequency.setValueAtTime(554, now); // Major third
    
    oscillator1.frequency.setValueAtTime(554, now + 0.2);
    oscillator2.frequency.setValueAtTime(659, now + 0.2);
    
    oscillator1.frequency.setValueAtTime(659, now + 0.4);
    oscillator2.frequency.setValueAtTime(880, now + 0.4);

    oscillator1.start(now);
    oscillator2.start(now);
    oscillator1.stop(now + 1.5);
    oscillator2.stop(now + 1.5);
    
    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.linearRampToValueAtTime(0.5, now + 0.5);
    gainNode.gain.linearRampToValueAtTime(0, now + 1.5);
  }

  Defeat() {
    this.initAudioContext();
    
    const oscillator = this.audioContext.createOscillator();
    oscillator.type = "sawtooth";
    
    const filter = this.audioContext.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 800;
    
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = 0.2;
    

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    // Descending Pitch
    const now = this.audioContext.currentTime;
    oscillator.frequency.setValueAtTime(330, now);
    oscillator.frequency.exponentialRampToValueAtTime(110, now + 1.5);
    
    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.1);
    gainNode.gain.linearRampToValueAtTime(0, now + 1.5);
    
    oscillator.start(now);
    oscillator.stop(now + 1.5);
  }
}

const sounds = new Sounds();
export {sounds}; 