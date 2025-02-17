// Team Management
let teams = [];

// Load Teams
async function loadTeams() {
    try {
        const response = await fetch('/api/teams');
        const data = await response.json();
        teams = data;
        updateTeamSelects();
        updateTeamsList();
    } catch (error) {
        console.error('Error loading teams:', error);
    }
}

// Update Team Select Dropdowns
function updateTeamSelects() {
    // Update all team select dropdowns
    document.querySelectorAll('.team-select').forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">Select Team</option>';
        teams.forEach(team => {
            const option = document.createElement('option');
            option.value = team;
            option.textContent = team;
            if (team === currentValue) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    });

    // Update next match options
    const nextMatchSelect = document.getElementById('nextMatch');
    nextMatchSelect.innerHTML = '<option value="">Select Teams</option>';
    teams.forEach(team1 => {
        teams.forEach(team2 => {
            if (team1 !== team2) {
                const option = document.createElement('option');
                option.value = `${team1} vs ${team2}`;
                option.textContent = `${team1} vs ${team2}`;
                nextMatchSelect.appendChild(option);
            }
        });
    });
}

// Update Teams List
function updateTeamsList() {
    const teamsList = document.getElementById('teamsList');
    teamsList.innerHTML = '';
    teams.forEach(team => {
        const teamDiv = document.createElement('div');
        teamDiv.className = 'team-item';
        teamDiv.innerHTML = `
            ${team} <button onclick="deleteTeam('${team}')">×</button>
        `;
        teamsList.appendChild(teamDiv);
    });
}

// Add a New Team
async function addTeam() {
    const input = document.getElementById('newTeamInput');
    const teamName = input.value.trim();

    if (!teamName) return;

    try {
        const response = await fetch('/api/teams', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ team: teamName }),
        });

        if (response.ok) {
            const data = await response.json();
            teams = data.teams;
            updateTeamSelects();
            updateTeamsList();
            input.value = '';
        } else {
            const error = await response.json();
            alert(error.message);
        }
    } catch (error) {
        console.error('Error adding team:', error);
    }
}

// Delete a Team
async function deleteTeam(team) {
    if (!confirm(`Are you sure you want to delete team "${team}"?`)) return;

    try {
        const response = await fetch(`/api/teams/${encodeURIComponent(team)}`, {
            method: 'DELETE',
        });

        if (response.ok) {
            const data = await response.json();
            teams = data.teams;
            updateTeamSelects();
            updateTeamsList();
            loadInitialData(); // Refresh match data
        } else {
            const error = await response.json();
            alert(error.message);
        }
    } catch (error) {
        console.error('Error deleting team:', error);
    }
}

// Add Match Field
function addMatchField() {
    const div = document.createElement('div');
    div.className = 'match-input-group';
    div.innerHTML = `
        <select class="upcoming-team1">
            ${teams.map(team => `<option value="${team}">${team}</option>`).join('')}
        </select>
        vs
        <select class="upcoming-team2">
            ${teams.map(team => `<option value="${team}">${team}</option>`).join('')}
        </select>
        <input type="time" class="upcoming-time" />
        <select class="upcoming-court">
            <option value="1">Court 1</option>
            <option value="2">Court 2</option>
        </select>
        <button class="remove-match">×</button>
    `;
    document.getElementById('upcomingMatches').appendChild(div);
}

// Get Current Form Data
function getCurrentFormData() {
    const data = {
        court1: {
            team1: document.getElementById('court1team1').value,
            team2: document.getElementById('court1team2').value,
            servingTeam: document.getElementById('court1servingTeam').value,
            status: document.getElementById('court1status').value,
        },
        court2: {
            team1: document.getElementById('court2team1').value,
            team2: document.getElementById('court2team2').value,
            servingTeam: document.getElementById('court2servingTeam').value,
            status: document.getElementById('court2status').value,
        },
        nextMatch: document.getElementById('nextMatch').value,
        upcoming: [],
    };

    document.querySelectorAll('.match-input-group').forEach(match => {
        data.upcoming.push({
            team1: match.querySelector('.upcoming-team1').value,
            team2: match.querySelector('.upcoming-team2').value,
            time: match.querySelector('.upcoming-time').value,
            court: match.querySelector('.upcoming-court').value,
        });
    });

    return data;
}

// Save Court-Specific Data
async function saveCourtData(courtNumber) {
    const btn = document.querySelector(`[data-court="${courtNumber}"] .court-save`);
    const data = getCurrentFormData();
    const courtData = {
        [`court${courtNumber}`]: data[`court${courtNumber}`],
    };

    try {
        const response = await fetch('/api/update-match', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(courtData),
        });

        if (response.status === 401) {
            window.location.href = '/login';
            return;
        }

        if (!response.ok) throw new Error('Network response was not ok');

        showSaveFeedback(btn);
    } catch (error) {
        console.error('Error saving court data:', error);
        showErrorFeedback(btn);
    }
}

// Save Next Match
async function saveNextMatch() {
    const btn = document.querySelector('.next-match-save');
    const nextMatch = document.getElementById('nextMatch').value;

    try {
        const response = await fetch('/api/update-match', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ nextMatch }),
        });

        if (response.status === 401) {
            window.location.href = '/login';
            return;
        }

        if (!response.ok) throw new Error('Network response was not ok');

        showSaveFeedback(btn);
    } catch (error) {
        console.error('Error saving next match:', error);
        showErrorFeedback(btn);
    }
}

// Save All Data
async function saveAllData() {
    const btn = document.querySelector('.save-all');
    try {
        const response = await fetch('/api/update-match', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(getCurrentFormData()),
        });

        if (response.status === 401) {
            window.location.href = '/login';
            return;
        }

        if (!response.ok) throw new Error('Network response was not ok');

        showSaveFeedback(btn);
    } catch (error) {
        console.error('Error saving all data:', error);
        showErrorFeedback(btn);
    }
}

// Show Save Feedback
function showSaveFeedback(button) {
    const originalText = button.textContent;
    button.classList.add('save-success');
    button.textContent = '✓ Saved!';

    setTimeout(() => {
        button.classList.remove('save-success');
        button.textContent = originalText;
    }, 2000);
}

// Show Error Feedback
function showErrorFeedback(button) {
    const originalText = button.textContent;
    button.style.backgroundColor = 'var(--color1)';
    button.textContent = '× Error';

    setTimeout(() => {
        button.style.backgroundColor = '';
        button.textContent = originalText;
    }, 2000);
}

// Load Initial Data
async function loadInitialData() {
    try {
        const response = await fetch('/api/match-data');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        updateAdminForm(data.match_data);
        teams = data.teams;
        updateTeamSelects();
        updateTeamsList();
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Update Admin Form
function updateAdminForm(data) {
    // Court 1
    document.getElementById('court1team1').value = data.court1?.team1 || '';
    document.getElementById('court1team2').value = data.court1?.team2 || '';
    document.getElementById('court1servingTeam').value = data.court1?.servingTeam || 'team1';
    document.getElementById('court1status').value = data.court1?.status || 'paused';

    // Court 2
    document.getElementById('court2team1').value = data.court2?.team1 || '';
    document.getElementById('court2team2').value = data.court2?.team2 || '';
    document.getElementById('court2servingTeam').value = data.court2?.servingTeam || 'team1';
    document.getElementById('court2status').value = data.court2?.status || 'paused';

    document.getElementById('nextMatch').value = data.nextMatch || '';

    const upcomingContainer = document.getElementById('upcomingMatches');
    upcomingContainer.innerHTML = '';
    (data.upcoming || []).forEach(match => {
        const div = document.createElement('div');
        div.className = 'match-input-group';
        div.innerHTML = `
            <select class="upcoming-team1">
                ${teams.map(team => `<option value="${team}">${team}</option>`).join('')}
            </select>
            vs
            <select class="upcoming-team2">
                ${teams.map(team => `<option value="${team}">${team}</option>`).join('')}
            </select>
            <input type="time" class="upcoming-time" value="${match.time || ''}" />
            <select class="upcoming-court">
                <option value="1" ${match.court === '1' ? 'selected' : ''}>Court 1</option>
                <option value="2" ${match.court === '2' ? 'selected' : ''}>Court 2</option>
            </select>
            <button class="remove-match">×</button>
        `;
        upcomingContainer.appendChild(div);
    });
}

// Event Listeners
document.getElementById('matchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    saveAllData(); // Use the new saveAllData function
});

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-match')) {
        e.target.parentElement.remove();
        saveAllData(); // Use the new saveAllData function
    }
    if (e.target.classList.contains('court-save')) {
        const courtNumber = e.target.dataset.court;
        saveCourtData(courtNumber);
    }
    if (e.target.classList.contains('next-match-save')) {
        saveNextMatch();
    }
});

// Load initial data when page loads
window.addEventListener('load', loadInitialData);

// Load teams on load
window.addEventListener('load', loadTeams);

function getRandomTeamColor() {
    const colors = ['#FF6B6B30', '#4ECDC430', '#FFE66D30', '#FF9F1C30', '#9B59B630'];
    return colors[Math.floor(Math.random() * colors.length)];
}
