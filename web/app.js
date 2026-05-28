const root = document.documentElement;
const heroWpm = document.getElementById("hero-wpm");

const wordInput = document.getElementById("word-input");
const customWord = document.getElementById("custom-word");
const wpmInput = document.getElementById("wpm-input");
const wpmValue = document.getElementById("wpm-value");
const fontInput = document.getElementById("font-input");
const sizeInput = document.getElementById("size-input");
const sizeValue = document.getElementById("size-value");
const spacingInput = document.getElementById("spacing-input");
const spacingValue = document.getElementById("spacing-value");
const accentInput = document.getElementById("accent-input");
const bgInput = document.getElementById("bg-input");
const guideInput = document.getElementById("guide-input");
const guideValue = document.getElementById("guide-value");

const setCssVar = (name, value) => {
  root.style.setProperty(name, value);
};

const updatePreviewWord = () => {
  const rawWord = wordInput.value.trim() || "clarity";
  const mid = Math.max(1, Math.floor(rawWord.length / 3));
  const before = rawWord.slice(0, mid);
  const orp = rawWord.slice(mid, mid + 1);
  const after = rawWord.slice(mid + 1);
  customWord.innerHTML = `<span class="before">${before}</span><span class="orp">${orp}</span><span class="after">${after}</span>`;
};

wordInput.addEventListener("input", updatePreviewWord);

wpmInput.addEventListener("input", () => {
  wpmValue.textContent = wpmInput.value;
  heroWpm.textContent = wpmInput.value;
});

fontInput.addEventListener("change", () => {
  setCssVar("--display", fontInput.value);
});

sizeInput.addEventListener("input", () => {
  sizeValue.textContent = sizeInput.value;
  setCssVar("--word-size", `${sizeInput.value}px`);
});

spacingInput.addEventListener("input", () => {
  spacingValue.textContent = spacingInput.value;
  setCssVar("--tracking", `${spacingInput.value}px`);
});

accentInput.addEventListener("input", () => {
  setCssVar("--accent", accentInput.value);
});

bgInput.addEventListener("input", () => {
  setCssVar("--bg", bgInput.value);
});

guideInput.addEventListener("input", () => {
  guideValue.textContent = guideInput.value;
  const opacity = Math.min(20, Math.max(0, Number(guideInput.value))) / 100;
  setCssVar("--guide", `rgba(255, 255, 255, ${opacity})`);
});

updatePreviewWord();
