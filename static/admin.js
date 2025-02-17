// Import Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.x/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  set,
  push,
  remove,
} from "https://www.gstatic.com/firebasejs/9.x/firebase-database.js";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA9rKm87EiUu47Y16PhRGUse5UPZk-c9uM",
  authDomain: "sdfghj-74626.firebaseapp.com",
  projectId: "sdfghj-74626",
  storageBucket: "sdfghj-74626.firebasestorage.app",
  messagingSenderId: "941342001769",
  appId: "1:941342001769:web:c61ab8dbee9964dbc3f0f8",
  measurementId: "G-K41EVP0B1J",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Team Management
let teams = [];

// Load Teams
async function loadTeams() {
  try {
    const teamsRef = ref(db, "teams");
    onValue(teamsRef, (snapshot) => {
      teams = Object.values(snapshot.val() || []);
      updateTeamSelects();
      updateTeamsList();
    });
  } catch (error) {
    console.error("Error loading teams:", error);
  }
}

// Update Team Select Dropdowns
function updateTeamSelects() {
  // Update all team select dropdowns
  document.querySelectorAll(".team-select").forEach((select) => {
    const currentValue = select.value;
    select.innerHTML = '<option value="">Select Team</option>';
    teams.forEach((team) => {
      const option = document.createElement("option");
      option.value = team;
      option.textContent = team;
      if (team === currentValue) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  });

  // Update next match options
  const nextMatchSelect = document.getElementById("nextMatch");
  nextMatchSelect.innerHTML = '<option value="">Select Teams</option>';
  teams.forEach((team1) => {
    teams.forEach((team2) => {
      if (team1 !== team2) {
        const option = document.createElement("option");
        option.value = `${team1} vs ${team2}`;
        option.textContent = `${team1} vs ${team2}`;
        nextMatchSelect.appendChild(option);
      }
    });
  });
}

// Update Teams List
function updateTeamsList() {
  const teamsList = document.getElementById("teamsList");
  teamsList.innerHTML = "";
  teams.forEach((team) => {
    const teamDiv = document.createElement("div");
    teamDiv.className = "team-item";
    teamDiv.innerHTML = `
            ${team} <button onclick="deleteTeam('${team}')">×</button>
        `;
    teamsList.appendChild(teamDiv);
  });
}

// Add a New Team
async function addTeam() {
  const input = document.getElementById("newTeamInput");
  const teamName = input.value.trim();

  if (!teamName) return;

  try {
    const teamsRef = ref(db, "teams");
    const newTeamRef = push(teamsRef);
    await set(newTeamRef, teamName);
    input.value = "";
  } catch (error) {
    console.error("Error adding team:", error);
  }
}

// Delete a Team
async function deleteTeam(team) {
  if (!confirm(`Are you sure you want to delete team "${team}"?`)) return;

  try {
    const teamsRef = ref(db, "teams");
    const snapshot = await get(teamsRef);
    const teamKeys = Object.keys(snapshot.val());
    const teamKey = teamKeys.find((key) => snapshot.val()[key] === team);
    if (teamKey) {
      await remove(ref(db, `teams/${teamKey}`));
    }
  } catch (error) {
    console.error("Error deleting team:", error);
  }
}

// Save All Data
async function saveAllData() {
  try {
    const data = getCurrentFormData();
    await set(ref(db, "match-data"), data);
    showSaveFeedback(document.querySelector(".save-all"));
  } catch (error) {
    console.error("Error saving all data:", error);
    showErrorFeedback(document.querySelector(".save-all"));
  }
}

// Load Initial Data
async function loadInitialData() {
  try {
    const matchDataRef = ref(db, "match-data");
    onValue(matchDataRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        updateAdminForm(data);
        teams = data.teams || [];
        updateTeamSelects();
        updateTeamsList();
      }
    });
  } catch (error) {
    console.error("Error loading data:", error);
  }
}

// Get Current Form Data
function getCurrentFormData() {
  const data = {
    court1: {
      team1: document.getElementById("court1team1").value,
      team2: document.getElementById("court1team2").value,
      servingTeam: document.getElementById("court1servingTeam").value,
      status: document.getElementById("court1status").value,
    },
    court2: {
      team1: document.getElementById("court2team1").value,
      team2: document.getElementById("court2team2").value,
      servingTeam: document.getElementById("court2servingTeam").value,
      status: document.getElementById("court2status").value,
    },
    nextMatch: document.getElementById("nextMatch").value,
    upcoming: [],
  };

  document.querySelectorAll(".match-input-group").forEach((match) => {
    data.upcoming.push({
      team1: match.querySelector(".upcoming-team1").value,
      team2: match.querySelector(".upcoming-team2").value,
      time: match.querySelector(".upcoming-time").value,
      court: match.querySelector(".upcoming-court").value,
    });
  });

  return data;
}

// Show Save Feedback
function showSaveFeedback(button) {
  const originalText = button.textContent;
  button.classList.add("save-success");
  button.textContent = "✓ Saved!";

  setTimeout(() => {
    button.classList.remove("save-success");
    button.textContent = originalText;
  }, 2000);
}

// Show Error Feedback
function showErrorFeedback(button) {
  const originalText = button.textContent;
  button.style.backgroundColor = "var(--color1)";
  button.textContent = "× Error";

  setTimeout(() => {
    button.style.backgroundColor = "";
    button.textContent = originalText;
  }, 2000);
}

// Event Listeners
document.getElementById("matchForm").addEventListener("submit", (e) => {
  e.preventDefault();
  saveAllData(); // Use the new saveAllData function
});

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("remove-match")) {
    e.target.parentElement.remove();
    saveAllData(); // Use the new saveAllData function
  }
  if (e.target.classList.contains("court-save")) {
    const courtNumber = e.target.dataset.court;
    saveCourtData(courtNumber);
  }
  if (e.target.classList.contains("next-match-save")) {
    saveNextMatch();
  }
});

// Load initial data when page loads
window.addEventListener("load", loadInitialData);

// Load teams on load
window.addEventListener("load", loadTeams);

function getRandomTeamColor() {
  const colors = [
    "#FF6B6B30",
    "#4ECDC430",
    "#FFE66D30",
    "#FF9F1C30",
    "#9B59B630",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
