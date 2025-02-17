const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: 'https://pckle4.github.io', // Allow only your frontend origin
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type']
}));
app.options('*', cors()); // Handle preflight requests
app.use(bodyParser.json());

// Paths to data files
const TEAMS_FILE = path.join(__dirname, 'data', 'teams.json');
const MATCH_DATA_FILE = path.join(__dirname, 'data', 'matchData.json');

// Helper functions for file operations
function readData(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        return null;
    }
}

function writeData(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error(`Error writing file ${filePath}:`, error);
    }
}

// SSE client management
const clients = [];

// Helper function to publish updates via SSE
function publishUpdate() {
    const matchData = readData(MATCH_DATA_FILE) || {};
    const teams = readData(TEAMS_FILE) || [];
    const data = { match_data: matchData, teams };

    clients.forEach((client, index) => {
        try {
            client.write(`data: ${JSON.stringify(data)}\n\n`);
        } catch (error) {
            console.error('Error sending SSE data to client:', error);
            clients.splice(index, 1); // Remove faulty client
        }
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
    res.setHeader('Access-Control-Allow-Origin', 'https://pckle4.github.io'); // Allow your frontend origin

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
    const teams = readData(TEAMS_FILE) || [];
    res.json(teams);
});

// Add a new team
app.post('/api/teams', (req, res) => {
    const { team } = req.body;
    if (!team) return res.status(400).json({ status: 'error', message: 'Team name is required' });

    let teams = readData(TEAMS_FILE) || [];
    if (teams.includes(team)) return res.status(400).json({ status: 'error', message: 'Team already exists' });

    teams.push(team);
    writeData(TEAMS_FILE, teams);
    publishUpdate();
    res.json({ status: 'success', teams });
});

// Delete a team
app.delete('/api/teams/:team', (req, res) => {
    const team = req.params.team;

    let teams = readData(TEAMS_FILE) || [];
    if (!teams.includes(team)) return res.status(404).json({ status: 'error', message: 'Team not found' });

    teams = teams.filter(t => t !== team);
    writeData(TEAMS_FILE, teams);

    // Remove team from match data
    let matchData = readData(MATCH_DATA_FILE) || {};
    ['court1', 'court2'].forEach(court => {
        if (matchData[court].team1 === team) matchData[court].team1 = '';
        if (matchData[court].team2 === team) matchData[court].team2 = '';
    });
    matchData.upcoming = matchData.upcoming.filter(match => match.team1 !== team && match.team2 !== team);
    if (matchData.nextMatch.includes(team)) matchData.nextMatch = '';
    writeData(MATCH_DATA_FILE, matchData);

    publishUpdate();
    res.json({ status: 'success', teams });
});

// Get match data
app.get('/api/match-data', (req, res) => {
    const matchData = readData(MATCH_DATA_FILE) || {};
    const teams = readData(TEAMS_FILE) || [];
    res.json({ match_data: matchData, teams });
});

// Update match data
app.post('/api/update-match', (req, res) => {
    const newData = req.body;

    let matchData = readData(MATCH_DATA_FILE) || {};
    Object.assign(matchData, newData);
    writeData(MATCH_DATA_FILE, matchData);

    publishUpdate();
    res.json({ status: 'success' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
