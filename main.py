from flask import Flask, render_template, request, session, redirect, url_for, jsonify, Response
import os
from datetime import datetime
import json
import queue
import threading

app = Flask(__name__)
# Use environment variable for secret key
app.secret_key = os.environ.get("SESSION_SECRET", "default_secret_key")

# In-memory storage
_teams = []
_match_data = {
    'court1': {'team1': '', 'team2': '', 'servingTeam': 'team1', 'status': 'paused'},
    'court2': {'team1': '', 'team2': '', 'servingTeam': 'team1', 'status': 'paused'},
    'nextMatch': '',
    'upcoming': []
}

# SSE client management
clients = []

def event_stream():
    """Generate SSE data"""
    q = queue.Queue()
    clients.append(q)
    try:
        while True:
            data = q.get()
            yield f"data: {json.dumps(data)}\n\n"
    except GeneratorExit:
        clients.remove(q)

def publish_update():
    """Helper function to publish updates via SSE"""
    data = {"match_data": _match_data, "teams": _teams}
    for client in list(clients):
        try:
            client.put(data)
        except:
            clients.remove(client)

@app.route('/stream')
def stream():
    return Response(event_stream(), mimetype="text/event-stream")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/admin')
def admin():
    if not session.get('admin_authenticated'):
        return redirect(url_for('login'))
    return render_template('admin.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        password = request.form.get('password')
        if password == "Ansh":
            session['admin_authenticated'] = True
            return redirect(url_for('admin'))
        return render_template('login.html', error="Invalid password")
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('admin_authenticated', None)
    return redirect(url_for('index'))

@app.route('/api/teams', methods=['GET'])
def get_teams():
    return jsonify(_teams)

@app.route('/api/teams', methods=['POST'])
def add_team():
    if not session.get('admin_authenticated'):
        return jsonify({'status': 'error', 'message': 'Unauthorized'}), 401
    team_name = request.json.get('team')
    if not team_name:
        return jsonify({'status': 'error', 'message': 'Team name is required'}), 400
    if team_name in _teams:
        return jsonify({'status': 'error', 'message': 'Team already exists'}), 400
    _teams.append(team_name)
    publish_update()
    return jsonify({'status': 'success', 'teams': _teams})

@app.route('/api/teams/<team>', methods=['DELETE'])
def delete_team(team):
    if not session.get('admin_authenticated'):
        return jsonify({'status': 'error', 'message': 'Unauthorized'}), 401
    if team not in _teams:
        return jsonify({'status': 'error', 'message': 'Team not found'}), 404
    _teams.remove(team)
    # Remove team from current matches
    for court in ['court1', 'court2']:
        if _match_data[court]['team1'] == team:
            _match_data[court]['team1'] = ''
        if _match_data[court]['team2'] == team:
            _match_data[court]['team2'] = ''
    # Remove team from upcoming matches
    _match_data['upcoming'] = [
        match for match in _match_data['upcoming']
        if match['team1'] != team and match['team2'] != team
    ]
    # Update nextMatch if needed
    if team in _match_data['nextMatch']:
        _match_data['nextMatch'] = ''
    publish_update()
    return jsonify({'status': 'success', 'teams': _teams})

@app.route('/api/match-data')
def get_match_data():
    return jsonify({'match_data': _match_data, 'teams': _teams})

@app.route('/api/update-match', methods=['POST'])
def update_match():
    if not session.get('admin_authenticated'):
        return jsonify({'status': 'error', 'message': 'Unauthorized'}), 401
    new_data = request.json
    _match_data.update(new_data)
    publish_update()
    return jsonify({'status': 'success'})

# Entry point for Vercel deployment
if __name__ == "__main__":
    app.run(host='0.0.0.0', port=int(os.environ.get("PORT", 5000)), debug=False)
