const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // Import CORS middleware

const app = express();
const PORT = process.env.PORT || 5000;


app.use(cors({
    origin: 'https://pckle4.github.io', // Allow only your frontend origin
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type']
}));

// SSE route
app.get('/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', 'https://pckle4.github.io'); // Allow your frontend origin

    // Add client to the list
    clients.push(res);

    // Remove client on close
    req.on('close', () => {
        const index = clients.indexOf(res);
        if (index !== -1) clients.splice(index, 1);
    });
});
app.use(bodyParser.json());
// In-memory storage
let teams = [];
let matchData = {
    court1: { team1: '', team2: '', servingTeam: 'team1', status: 'paused' },
    court2: { team1: '', team2: '', servingTeam: 'team1', status: 'paused' },
    nextMatch: '',
    upcoming: []
};

// SSE client management
const clients = [];

// Helper function to publish updates via SSE
function publishUpdate() {
    const data = { match_data: matchData, teams };
    clients.forEach(client => {
        client.write(`data: ${JSON.stringify(data)}\n\n`);
    });
}

// Root route
app.get('/', (req, res) => {
    res.send('Welcome to the Pickleball Match Tracker API');
});

// SSE route
app.get('/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Add client to the list
    clients.push(res);

    // Remove client on close
    req.on('close', () => {
        const index = clients.indexOf(res);
        if (index !== -1) clients.splice(index, 1);
    });
});

// Routes
// Get all teams
app.get('/api/teams', (req, res) => {
    res.json(teams);
});

// Add a new team
app.post('/api/teams', (req, res) => {
    const { team } = req.body;
    if (!team) return res.status(400).json({ status: 'error', message: 'Team name is required' });
    if (teams.includes(team)) return res.status(400).json({ status: 'error', message: 'Team already exists' });

    teams.push(team);
    publishUpdate();
    res.json({ status: 'success', teams });
});

// Delete a team
app.delete('/api/teams/:team', (req, res) => {
    const team = req.params.team;
    if (!teams.includes(team)) return res.status(404).json({ status: 'error', message: 'Team not found' });

    teams = teams.filter(t => t !== team);

    // Remove team from current matches
    ['court1', 'court2'].forEach(court => {
        if (matchData[court].team1 === team) matchData[court].team1 = '';
        if (matchData[court].team2 === team) matchData[court].team2 = '';
    });

    // Remove team from upcoming matches
    matchData.upcoming = matchData.upcoming.filter(match => match.team1 !== team && match.team2 !== team);

    // Update nextMatch if needed
    if (matchData.nextMatch.includes(team)) matchData.nextMatch = '';

    publishUpdate();
    res.json({ status: 'success', teams });
});

// Get match data
app.get('/api/match-data', (req, res) => {
    res.json({ match_data: matchData, teams });
});

// Update match data
app.post('/api/update-match', (req, res) => {
    const newData = req.body;
    Object.assign(matchData, newData);
    publishUpdate();
    res.json({ status: 'success' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
