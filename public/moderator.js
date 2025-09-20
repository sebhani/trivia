// Moderator Dashboard JavaScript
let isLoggedIn = false;
let gameState = null;

// DOM Elements
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');

// Status elements
const playerCountEl = document.getElementById('player-count');
const questionCountEl = document.getElementById('question-count');
const currentQuestionEl = document.getElementById('current-question');
const gameStatusEl = document.getElementById('game-status');

// Form elements
const questionForm = document.getElementById('question-form');
const questionMessage = document.getElementById('question-message');

// Control elements
const startGameBtn = document.getElementById('start-game-btn');
const nextQuestionBtn = document.getElementById('next-question-btn');
const revealAnswerBtn = document.getElementById('reveal-answer-btn');
const endGameBtn = document.getElementById('end-game-btn');
const controlMessage = document.getElementById('control-message');

// Statistics elements
const currentQuestionDisplay = document.getElementById('current-question-display');
const answerStatistics = document.getElementById('answer-statistics');

// Check for existing login on page load
function checkExistingLogin() {
    const savedLogin = localStorage.getItem('moderatorLoggedIn');
    if (savedLogin === 'true') {
        isLoggedIn = true;
        loginSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');
        startPolling();
        showMessage(controlMessage, 'Welcome back!', 'success');
    }
}

// Login handling
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch('/api/moderator/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            isLoggedIn = true;
            localStorage.setItem('moderatorLoggedIn', 'true'); // Save login state
            loginSection.classList.add('hidden');
            dashboardSection.classList.remove('hidden');
            startPolling();
            showMessage(controlMessage, 'Login successful!', 'success');
        } else {
            showMessage(loginError, data.error, 'error');
        }
    } catch (error) {
        showMessage(loginError, 'Connection error', 'error');
    }
});

// Question form handling
questionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const questionData = {
        text: document.getElementById('question-text').value,
        optionA: document.getElementById('option-a').value,
        optionB: document.getElementById('option-b').value,
        optionC: document.getElementById('option-c').value,
        optionD: document.getElementById('option-d').value,
        correctAnswer: document.getElementById('correct-answer').value
    };
    
    try {
        const response = await fetch('/api/moderator/add-question', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(questionData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage(questionMessage, `Question added! Total: ${data.totalQuestions}`, 'success');
            questionForm.reset();
            updateQuestionsList(); // Refresh questions list
        } else {
            showMessage(questionMessage, data.error, 'error');
        }
    } catch (error) {
        showMessage(questionMessage, 'Failed to add question', 'error');
    }
});

// Delete question function
async function deleteQuestion(questionId) {
    if (!confirm('Are you sure you want to delete this question?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/moderator/delete-question/${questionId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage(questionMessage, data.message, 'success');
            updateQuestionsList(); // Refresh questions list
        } else {
            showMessage(questionMessage, data.error, 'error');
        }
    } catch (error) {
        showMessage(questionMessage, 'Failed to delete question', 'error');
    }
}

// Update questions list display
function updateQuestionsList() {
    if (!gameState || !gameState.questions) return;
    
    const questionsListEl = document.getElementById('questions-list');
    
    if (gameState.questions.length === 0) {
        questionsListEl.innerHTML = '<p>No questions added yet.</p>';
        return;
    }
    
    questionsListEl.innerHTML = gameState.questions.map((question, index) => `
        <div class="question-item">
            <div class="question-header">
                <div class="question-text">${index + 1}. ${question.text}</div>
                <button class="delete-btn" onclick="deleteQuestion('${question.id}')" 
                        ${gameState.isActive ? 'disabled title="Cannot delete during active game"' : ''}>
                    Delete
                </button>
            </div>
            <div class="question-options">
                A: ${question.options.A} | B: ${question.options.B} | 
                C: ${question.options.C} | D: ${question.options.D}
                <br><span class="correct-answer">Correct: ${question.correctAnswer}</span>
            </div>
        </div>
    `).join('');
}

// Game control handlers
startGameBtn.addEventListener('click', async () => {
    try {
        const response = await fetch('/api/moderator/start-game', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage(controlMessage, 'Game started!', 'success');
        } else {
            showMessage(controlMessage, data.error, 'error');
        }
    } catch (error) {
        showMessage(controlMessage, 'Failed to start game', 'error');
    }
});

nextQuestionBtn.addEventListener('click', async () => {
    try {
        const response = await fetch('/api/moderator/next-question', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage(controlMessage, `Advanced to question ${data.currentQuestionIndex + 1}`, 'success');
        } else {
            showMessage(controlMessage, data.error, 'error');
        }
    } catch (error) {
        showMessage(controlMessage, 'Failed to advance question', 'error');
    }
});

revealAnswerBtn.addEventListener('click', async () => {
    try {
        const response = await fetch('/api/moderator/reveal-answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage(controlMessage, `Answer revealed: ${data.correctAnswer}`, 'success');
        } else {
            showMessage(controlMessage, data.error, 'error');
        }
    } catch (error) {
        showMessage(controlMessage, 'Failed to reveal answer', 'error');
    }
});

endGameBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to end the game?')) {
        try {
            const response = await fetch('/api/moderator/end-game', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showMessage(controlMessage, 'Game ended!', 'success');
            } else {
                showMessage(controlMessage, data.error, 'error');
            }
        } catch (error) {
            showMessage(controlMessage, 'Failed to end game', 'error');
        }
    }
});

// Polling and UI updates
function startPolling() {
    updateStatus();
    setInterval(updateStatus, 2000);
}

async function updateStatus() {
    try {
        const response = await fetch('/api/moderator/status');
        const data = await response.json();
        gameState = data;
        updateUI(data);
        
        // Update connection status
        updateConnectionStatus(true);
    } catch (error) {
        console.error('Failed to fetch status:', error);
        updateConnectionStatus(false);
    }
}

function updateConnectionStatus(connected) {
    // Add connection indicator to game status
    const statusIndicator = connected ? '🟢' : '🔴';
    const statusText = connected ? 'Connected' : 'Connection Lost';
    
    // Update the game status display to include connection status
    if (gameState) {
        gameStatusEl.textContent = `${gameState.isActive ? 'Active' : 'Inactive'} ${statusIndicator}`;
    } else {
        gameStatusEl.textContent = `${statusText} ${statusIndicator}`;
    }
}

function updateUI(state) {
    // Update status cards
    playerCountEl.textContent = state.playerCount;
    questionCountEl.textContent = state.totalQuestions;
    currentQuestionEl.textContent = state.currentQuestionIndex >= 0 ? 
        `${state.currentQuestionIndex + 1}/${state.totalQuestions}` : '-';
    gameStatusEl.textContent = state.isActive ? 'Active' : 'Inactive';
    
    // Update button states based on game flow
    startGameBtn.disabled = state.isActive;
    
    // Next question: enabled when game is active and either no current question or answer revealed
    nextQuestionBtn.disabled = !state.isActive || 
        (state.currentQuestionIndex >= 0 && !state.answerRevealed);
    
    // Reveal answer: enabled when there's an active question and answer not yet revealed
    revealAnswerBtn.disabled = !state.isActive || 
        state.currentQuestionIndex < 0 || 
        state.answerRevealed;
    
    // End game: enabled when game is active
    endGameBtn.disabled = !state.isActive;
    
    // Update current question display
    if (state.currentQuestion) {
        currentQuestionDisplay.innerHTML = `
            <h3>Current Question ${state.currentQuestionIndex + 1}:</h3>
            <p><strong>${state.currentQuestion.text}</strong></p>
            <ul>
                <li>A: ${state.currentQuestion.options.A}</li>
                <li>B: ${state.currentQuestion.options.B}</li>
                <li>C: ${state.currentQuestion.options.C}</li>
                <li>D: ${state.currentQuestion.options.D}</li>
            </ul>
            <p><strong>Correct Answer: ${state.currentQuestion.correctAnswer}</strong></p>
            <p><em>Status: ${state.answerRevealed ? 'Answer Revealed' : 'Waiting for answers'}</em></p>
        `;
    } else if (state.isActive) {
        currentQuestionDisplay.innerHTML = '<p><em>Game active - use "Next Question" to start first question</em></p>';
    } else {
        currentQuestionDisplay.innerHTML = '<p>No active question</p>';
    }
    
    // Update answer statistics
    if (state.answerRevealed && state.currentQuestion) {
        const total = Object.values(state.answerStats).reduce((sum, count) => sum + count, 0);
        answerStatistics.innerHTML = `
            <h3>Answer Statistics (${total} total responses):</h3>
            <div class="stat-bar">A: ${state.answerStats.A} players (${total > 0 ? Math.round(state.answerStats.A/total*100) : 0}%)</div>
            <div class="stat-bar">B: ${state.answerStats.B} players (${total > 0 ? Math.round(state.answerStats.B/total*100) : 0}%)</div>
            <div class="stat-bar">C: ${state.answerStats.C} players (${total > 0 ? Math.round(state.answerStats.C/total*100) : 0}%)</div>
            <div class="stat-bar">D: ${state.answerStats.D} players (${total > 0 ? Math.round(state.answerStats.D/total*100) : 0}%)</div>
        `;
    } else if (state.isActive && state.currentQuestionIndex >= 0) {
        answerStatistics.innerHTML = '<p><em>Collecting answers... Use "Reveal Answer" to show statistics</em></p>';
    } else {
        answerStatistics.innerHTML = '<p>Answer statistics will appear after revealing</p>';
    }
    
    // Update questions list
    updateQuestionsList();
}

// Utility function
function showMessage(element, message, type) {
    element.textContent = message;
    element.className = type;
    setTimeout(() => {
        element.textContent = '';
        element.className = '';
    }, 3000);
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    checkExistingLogin(); // Check for saved login first
});
