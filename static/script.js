// Initialize SSE connection with error handling and reconnection
function initializeSSE() {
    const eventSource = new EventSource('https://pb-beta-ten.vercel.app/stream');

    eventSource.onopen = () => {
        console.log('SSE connection established');
    };

    eventSource.addEventListener('match_update', (event) => {
        try {
            const data = JSON.parse(event.data);
            updateDisplay(data.match_data);
        } catch (error) {
            console.error('Error parsing SSE data:', error);
        }
    });

    eventSource.onerror = (error) => {
        console.error('SSE Connection Error:', error);
        eventSource.close();
        // Attempt to reconnect after 5 seconds
        setTimeout(initializeSSE, 5000);
    };

    return eventSource;
}

// Update display with match data
function updateDisplay(data) {
    // Update Court 1
    document.getElementById('court1displayTeam1').textContent = data.court1?.team1 || 'Team A';
    document.getElementById('court1displayTeam2').textContent = data.court1?.team2 || 'Team B';
    document.getElementById('court1serveStatus').textContent =
        data.court1?.servingTeam === 'team1' ? 'Current Serve' : 'Receiving';
    document.getElementById('court1StatusBadge').textContent = (data.court1?.status || 'PAUSED').toUpperCase();
    document.getElementById('court1StatusBadge').className = `match-status-badge ${data.court1?.status || 'paused'}`;

    // Update Court 2
    document.getElementById('court2displayTeam1').textContent = data.court2?.team1 || 'Team C';
    document.getElementById('court2displayTeam2').textContent = data.court2?.team2 || 'Team D';
    document.getElementById('court2serveStatus').textContent =
        data.court2?.servingTeam === 'team1' ? 'Current Serve' : 'Receiving';
    document.getElementById('court2StatusBadge').textContent = (data.court2?.status || 'PAUSED').toUpperCase();
    document.getElementById('court2StatusBadge').className = `match-status-badge ${data.court2?.status || 'paused'}`;

    // Update Next Match
    document.getElementById('nextMatchDisplay').textContent = data.nextMatch || 'Upcoming Match';

    // Update Schedule
    updateUpcomingList(data.upcoming || []);
}

function updateUpcomingList(upcoming) {
    const upcomingList = document.getElementById('upcomingList');
    upcomingList.innerHTML = '';
    const matchesByCourt = { 1: [], 2: [] };

    upcoming.forEach(match => {
        const court = match.court || '1';
        matchesByCourt[court].push(match);
    });

    for (const [courtNumber, matches] of Object.entries(matchesByCourt)) {
        if (matches.length > 0) {
            const section = document.createElement('div');
            section.className = 'court-section';
            section.innerHTML = `
                <div class="court-number">Court ${courtNumber}</div>
                <ul class="match-list"></ul>
            `;
            const list = section.querySelector('.match-list');
            matches.forEach(match => {
                const li = document.createElement('li');
                li.className = 'match-item';
                li.innerHTML = `
                    <span>${match.team1 || 'Team A'} vs ${match.team2 || 'Team B'}</span>
                    <span>${match.time || 'TBD'}</span>
                `;
                list.appendChild(li);
            });
            upcomingList.appendChild(section);
        }
    }
}

// Load initial data and start SSE connection
async function initialize() {
    try {
        const response = await fetch('https://pb-beta-ten.vercel.app/api/match-data');
        if (!response.ok) {
            throw new Error('Failed to load initial data');
        }
        const data = await response.json();
        updateDisplay(data.match_data);
    } catch (error) {
        console.error('Error loading initial data:', error);
    }

    // Initialize SSE connection
    initializeSSE();
}

// Start the application
window.addEventListener('load', initialize);
