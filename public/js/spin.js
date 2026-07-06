// public/js/spin.js
document.addEventListener("DOMContentLoaded", () => {
  const wheel = document.getElementById("wheel");
  const spinBtn = document.getElementById("spinBtn");
  const modal = document.getElementById("resultModal");
  const rewardText = document.getElementById("rewardText");
  const modalTitle = document.getElementById("modalTitle");
  const waitNotice = document.getElementById("waitNotice");

  // Web Audio API for sounds
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  
  function playTick() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.05);
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
  }

  function playWin() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, audioCtx.currentTime);
    osc.frequency.setValueAtTime(600, audioCtx.currentTime + 0.1);
    osc.frequency.setValueAtTime(800, audioCtx.currentTime + 0.2);
    osc.frequency.setValueAtTime(1200, audioCtx.currentTime + 0.3);
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.6);
  }

  function playLose() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.5);
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
  }

  function createConfetti() {
    const container = document.getElementById('confetti-container');
    container.innerHTML = ''; // clear existing
    const colors = ['#f44336', '#9c27b0', '#3f51b5', '#009688', '#ff9800', '#ffeb3b'];
    
    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
        confetti.style.animationDelay = (Math.random() * 2) + 's';
        container.appendChild(confetti);
    }
  }

  // Fake social proof counter
  let fakeSpins = localStorage.getItem('fakeSpins') ? parseInt(localStorage.getItem('fakeSpins')) : 12847;
  if(document.getElementById('fakeCounter')) {
      document.getElementById('fakeCounter').innerText = fakeSpins.toLocaleString();
      setInterval(() => {
          if (Math.random() > 0.5) {
              fakeSpins += Math.floor(Math.random() * 3) + 1;
              document.getElementById('fakeCounter').innerText = fakeSpins.toLocaleString();
              localStorage.setItem('fakeSpins', fakeSpins);
          }
      }, 3000);
  }

  // Daily Spin Limit check
  const lastSpinTime = localStorage.getItem('lastSpinTime');
  const now = new Date().getTime();
  const ONE_DAY = 24 * 60 * 60 * 1000;

  function initDailyLimit() {
      if (lastSpinTime && now - parseInt(lastSpinTime) < ONE_DAY) {
        spinBtn.disabled = true;
        document.getElementById("dailyLimitMsg").style.display = "block";
        spinBtn.innerText = "Come Back Tomorrow";
        
        setInterval(() => {
            let diff = ONE_DAY - (new Date().getTime() - parseInt(lastSpinTime));
            if (diff <= 0) location.reload();
            let h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            let m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            let s = Math.floor((diff % (1000 * 60)) / 1000);
            document.getElementById("countdownTimer").innerText = 
                `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
        }, 1000);
        return true;
      }
      return false;
  }

  if (initDailyLimit()) return;

  // Sectors configuration with weights
  const sectors = [
    { label: "100% Cashback", color: "#f44336", weight: 1, isWin: true },
    { label: "50% Discount", color: "#9c27b0", weight: 5, isWin: true },
    { label: "30% Off Coupon", color: "#3f51b5", weight: 15, isWin: true },
    { label: "500 Bonus Pts", color: "#009688", weight: 20, isWin: true },
    { label: "100 Bonus Pts", color: "#ff9800", weight: 30, isWin: true },
    { label: "Better Luck Next Time", color: "#607d8b", weight: 40, isWin: false }
  ];

  const segmentAngle = 360 / sectors.length;
  
  sectors.forEach((sector, index) => {
    const textEl = document.createElement("div");
    textEl.className = "wheel-text";
    
    const rotation = -90 + (index * segmentAngle) + (segmentAngle / 2);
    textEl.style.transform = `rotate(${rotation}deg) translate(25px)`;
    textEl.innerText = sector.label;
    wheel.appendChild(textEl);
  });

  let currentRotation = 0;
  let isSpinning = false;
  let tickInterval;

  spinBtn.addEventListener("click", () => {
    if (isSpinning) return;
    isSpinning = true;
    spinBtn.disabled = true;

    // Must resume audio context on user interaction
    if (audioCtx.state === 'suspended') audioCtx.resume();

    // Determine winning sector based on weights
    let totalWeight = sectors.reduce((sum, sector) => sum + sector.weight, 0);
    let randomValue = Math.random() * totalWeight;
    let winningSectorIndex = 0;
    
    for (let i = 0; i < sectors.length; i++) {
      randomValue -= sectors[i].weight;
      if (randomValue <= 0) {
        winningSectorIndex = i;
        break;
      }
    }
    
    const extraSpins = 5; 
    const baseSpinsRotation = extraSpins * 360;
    
    const sectorCenterAngle = winningSectorIndex * segmentAngle + (segmentAngle / 2);
    
    const requiredRotation = 360 - sectorCenterAngle;
    const variance = Math.floor(Math.random() * (segmentAngle - 10)) - (segmentAngle / 2 - 5);

    const currentMod = currentRotation % 360;
    const targetMod = (requiredRotation + variance) % 360;
    
    let rotationDiff = targetMod - currentMod;
    if (rotationDiff < 0) rotationDiff += 360;

    const totalRotation = baseSpinsRotation + rotationDiff;
    currentRotation += totalRotation;

    wheel.style.transform = `rotate(${currentRotation}deg)`;

    // Play ticking sound while spinning
    let ticks = 0;
    tickInterval = setInterval(() => {
        playTick();
        ticks++;
        if (ticks > 25) clearInterval(tickInterval);
    }, 150);

    // Wait for transition to finish
    setTimeout(() => {
      clearInterval(tickInterval);
      isSpinning = false;
      
      // Save spin time
      localStorage.setItem('lastSpinTime', new Date().getTime());
      
      const wonSector = sectors[winningSectorIndex];
      rewardText.innerText = wonSector.label;
      
      if (wonSector.isWin) {
          modalTitle.innerText = "🎉 Congratulations!";
          waitNotice.style.display = "block";
          playWin();
          createConfetti();
      } else {
          modalTitle.innerText = "😔 Aww...";
          waitNotice.style.display = "none";
          rewardText.innerText = "Better Luck Next Time!";
          playLose();
      }
      
      modal.classList.add("active");
      
      // Update UI for daily limit immediately for when they close modal
      spinBtn.innerText = "Come Back Tomorrow";
      document.getElementById("dailyLimitMsg").style.display = "block";
      document.getElementById("countdownTimer").innerText = "23:59:59";
      
    }, 4000); 
  });
});
