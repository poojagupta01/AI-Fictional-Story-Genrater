// DOM Elements
const characterNameInput = document.getElementById("character-name");
const themeSelect = document.getElementById("theme");
const genreSelect = document.getElementById("genre");
const locationInput = document.getElementById("location");
const lengthSelect = document.getElementById("length");
const generateBtn = document.getElementById("generate-btn");
const resetBtn = document.getElementById("reset-btn");
const storyContent = document.getElementById("story-content");
const storyMeta = document.getElementById("story-meta");
const actionButtons = document.getElementById("action-buttons");
const charDisplay = document.getElementById("char-display");
const themeDisplay = document.getElementById("theme-display");
const genreDisplay = document.getElementById("genre-display");
const locationDisplay = document.getElementById("location-display");
const copyBtn = document.getElementById("copy-btn");
const downloadBtn = document.getElementById("download-btn");
const loadingOverlay = document.getElementById("loading-overlay");
const logoutBtn = document.getElementById("logout-btn");
const usernameDisplay = document.getElementById("username-display");

let currentStory = "";

// Check session on page load
async function checkSession() {
    try {
        const response = await fetch('/api/check-session');
        const result = await response.json();

        if (!result.logged_in) {
            window.location.href = '/login.html';
        } else {
            usernameDisplay.textContent = result.username || 'User';
        }
    } catch (error) {
        console.error('Session check error:', error);
        window.location.href = '/login.html';
    }
}

// Call checkSession on page load
checkSession();

// Handle Logout
logoutBtn.addEventListener('click', async () => {
    try {
        const response = await fetch('/api/logout', {
            method: 'POST',
        });

        const result = await response.json();

        if (result.success) {
            window.location.href = '/login.html';
        }
    } catch (error) {
        console.error('Logout error:', error);
        window.location.href = '/login.html';
    }
});

// Update theme background on genre change
genreSelect.addEventListener("change", function () {
  const genre = this.value.toLowerCase();
  document.body.className = `theme-${genre}`;
});

// Event Listeners
generateBtn.addEventListener("click", generateStory);
resetBtn.addEventListener("click", resetForm);
copyBtn.addEventListener("click", copyStory);
downloadBtn.addEventListener("click", downloadStory);

// Generate Story
async function generateStory() {
  const characterName = characterNameInput.value.trim();
  const theme = themeSelect.value;
  const genre = genreSelect.value;
  const location = locationInput.value.trim();
  const length = lengthSelect.value;

  // Validation
  if (!characterName) {
    showError("Please enter a character name!");
    return;
  }

  if (!location) {
    showError("Please enter a location/setting for your story!");
    return;
  }

  // Show loading
  loadingOverlay.style.display = "flex";

  try {
    // Generate the story
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        characterName: characterName,
        theme: theme,
        genre: genre,
        location: location,
        length: length,
      }),
    });

    const result = await response.json();

    if (result.success) {
      displayStory(result);
    } else {
      if (response.status === 401) {
        // Session expired, redirect to login
        window.location.href = '/login.html';
      } else {
        showError(result.error || "Failed to generate story. Please try again.");
      }
    }
  } catch (error) {
    showError("Network error. Please check your connection and try again.");
    console.error("Error:", error);
  } finally {
    loadingOverlay.style.display = "none";
  }
}

// Display the generated story
function displayStory(data) {
  currentStory = data.story;

  // Format the story with paragraphs
  const formattedStory = data.story
    .split("\n\n")
    .map((para) => `<p>${para.trim()}</p>`)
    .join("");

  storyContent.innerHTML = formattedStory;

  // Display metadata
  charDisplay.textContent = data.character;
  themeDisplay.textContent = data.theme;
  genreDisplay.textContent = data.genre;
  locationDisplay.textContent = data.location;

  storyMeta.style.display = "grid";
  actionButtons.style.display = "flex";

  // Smooth scroll to story
  storyContent.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Show error message
function showError(message) {
  storyContent.innerHTML = `
        <div class="error-message">
            <strong>❌ Error:</strong> ${message}
        </div>
    `;
  storyMeta.style.display = "none";
  actionButtons.style.display = "none";
}

// Reset form
function resetForm() {
  characterNameInput.value = "";
  themeSelect.value = "Adventure";
  genreSelect.value = "Fantasy";
  locationInput.value = "";
  lengthSelect.value = "medium";

  document.body.className = "theme-fantasy";

  storyContent.innerHTML = `
        <div class="placeholder">
            <div class="placeholder-icon">✨</div>
            <p class="placeholder-text">Your AI-generated story will appear here</p>
            <p class="placeholder-subtext">Fill in the details and click "Generate AI Story"</p>
        </div>
    `;

  storyMeta.style.display = "none";
  actionButtons.style.display = "none";
  currentStory = "";
}

// Copy story to clipboard
function copyStory() {
  const textToCopy = `Character: ${charDisplay.textContent}\nTheme: ${themeDisplay.textContent}\nGenre: ${genreDisplay.textContent}\nLocation: ${locationDisplay.textContent}\n\n${currentStory}`;

  navigator.clipboard
    .writeText(textToCopy)
    .then(() => {
      const originalText = copyBtn.textContent;
      copyBtn.textContent = "✅ Copied!";
      copyBtn.style.background = "linear-gradient(135deg, #20c997, #28a745)";

      setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.style.background = "linear-gradient(135deg, #28a745, #20c997)";
      }, 2000);
    })
    .catch((err) => {
      showError("Failed to copy story. Please select and copy manually.");
      console.error("Copy error:", err);
    });
}

// Download story as TXT file
function downloadStory() {
  const textToDownload = `PlotPilot AI - Generated Story\n\nCharacter: ${charDisplay.textContent}\nTheme: ${themeDisplay.textContent}\nGenre: ${genreDisplay.textContent}\nLocation: ${locationDisplay.textContent}\n\n${currentStory}`;

  const blob = new Blob([textToDownload], { type: "text/plain" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `story-${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);

  const originalText = downloadBtn.textContent;
  downloadBtn.textContent = "✅ Downloaded!";
  downloadBtn.style.background = "linear-gradient(135deg, #0056b3, #007bff)";

  setTimeout(() => {
    downloadBtn.textContent = originalText;
    downloadBtn.style.background = "linear-gradient(135deg, #007bff, #0056b3)";
  }, 2000);
}