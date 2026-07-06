// public/js/spin.js
document.addEventListener("DOMContentLoaded", () => {
  const wheel = document.getElementById("wheel");
  const spinBtn = document.getElementById("spinBtn");
  const modal = document.getElementById("resultModal");
  const rewardText = document.getElementById("rewardText");

  // Sectors configuration (6 sectors, 60 degrees each)
  const sectors = [
    { label: "100 Points", color: "#f44336" },
    { label: "Better Luck Next Time", color: "#9c27b0" },
    { label: "500 Points", color: "#3f51b5" },
    { label: "1000 Points", color: "#009688" },
    { label: "0 / Zero", color: "#ff9800" },
    { label: "Bonus Multiplier", color: "#607d8b" }
  ];

  const segmentAngle = 360 / sectors.length;
  
  sectors.forEach((sector, index) => {
    const textEl = document.createElement("div");
    textEl.className = "wheel-text";
    
    // Conic gradient starts at top (12 o'clock).
    // Segment N center is at N * 60 + 30 degrees.
    // We adjust by -90 because 0deg in CSS transform rotate is at 3 o'clock (right).
    const rotation = -90 + (index * segmentAngle) + (segmentAngle / 2);
    
    textEl.style.transform = `rotate(${rotation}deg) translate(25px)`;
    textEl.innerText = sector.label;
    wheel.appendChild(textEl);
  });

  let currentRotation = 0;
  let isSpinning = false;

  spinBtn.addEventListener("click", () => {
    if (isSpinning) return;
    isSpinning = true;
    spinBtn.disabled = true;

    // Determine a random sector to win
    const winningSectorIndex = Math.floor(Math.random() * sectors.length);
    
    // We want the chosen sector to end up at the top.
    const extraSpins = 5; 
    const baseSpinsRotation = extraSpins * 360;
    
    const sectorCenterAngle = winningSectorIndex * segmentAngle + (segmentAngle / 2);
    
    // Rotate forwards to bring the sector to the top
    const requiredRotation = 360 - sectorCenterAngle;

    // Add random variance within the sector so it doesn't land exactly in the middle every time
    const variance = Math.floor(Math.random() * (segmentAngle - 10)) - (segmentAngle / 2 - 5);

    // Calculate how much we need to add to the *current* rotation to hit our target,
    // making sure we always spin forwards relative to where we stopped last time.
    // Resetting currentRotation mod 360 helps keep numbers reasonable.
    const currentMod = currentRotation % 360;
    const targetMod = (requiredRotation + variance) % 360;
    
    let rotationDiff = targetMod - currentMod;
    if (rotationDiff < 0) {
        rotationDiff += 360;
    }

    const totalRotation = baseSpinsRotation + rotationDiff;
    currentRotation += totalRotation;

    wheel.style.transform = `rotate(${currentRotation}deg)`;

    // Wait for transition to finish
    setTimeout(() => {
      isSpinning = false;
      spinBtn.disabled = false;
      
      const wonReward = sectors[winningSectorIndex].label;
      rewardText.innerText = wonReward;
      
      modal.classList.add("active");
    }, 4000); 
  });
});
