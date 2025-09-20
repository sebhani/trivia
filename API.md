# 🔌 Trivia Platform API Documentation

## Base URL
- **Development:** `http://localhost:3000`
- **Production:** `http://your-domain.com`

## Authentication
- **Player endpoints:** No authentication required
- **Moderator endpoints:** Require login via `/api/moderator/login`

---

## 👥 Player Endpoints

### GET `/api/game-state`
Get current game status and player information.

**Query Parameters:**
- `playerId` (optional): Player ID to get personalized data

**Response:**
```json
{
  "isActive": true,
  "currentQuestion": {
    "id": "1234567890",
    "text": "What is 2+2?",
    "options": {
      "A": "3",
      "B": "4", 
      "C": "5",
      "D": "6"
    }
  },
  "answerRevealed": false,
  "answerStats": null,
  "correctAnswer": null,
  "playerScore": 0,
  "totalQuestions": 5,
  "currentQuestionNumber": 1,
  "playerAnswered": false,
  "gameComplete": false,
  "gameEnded": false
}
```

### POST `/api/join`
Join the game and receive a player ID.

**Response:**
```json
{
  "playerId": "player_1234567890_abc123"
}
```

### POST `/api/answer`
Submit an answer to the current question.

**Request Body:**
```json
{
  "playerId": "player_1234567890_abc123",
  "answer": "B"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Answer submitted successfully",
  "questionId": "1234567890",
  "answer": "B",
  "questionNumber": 1,
  "totalQuestions": 5
}
```

**Error Responses:**
```json
// Invalid answer format
{
  "error": "Invalid answer. Must be A, B, C, or D"
}

// Already answered
{
  "error": "You have already answered this question",
  "hint": "Please wait for the answer to be revealed"
}

// Rate limited
{
  "error": "Too many answer attempts. Please wait a moment before trying again.",
  "retryAfter": 3
}
```

---

## 👨‍💼 Moderator Endpoints

### POST `/api/moderator/login`
Authenticate as moderator.

**Request Body:**
```json
{
  "username": "admin",
  "password": "trivia123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful"
}
```

### POST `/api/moderator/start-game`
Start a new trivia game.

**Response:**
```json
{
  "success": true,
  "message": "Game started",
  "totalQuestions": 5
}
```

### POST `/api/moderator/add-question`
Add a new question to the game.

**Request Body:**
```json
{
  "text": "What is the capital of France?",
  "optionA": "London",
  "optionB": "Berlin",
  "optionC": "Paris", 
  "optionD": "Madrid",
  "correctAnswer": "C"
}
```

**Response:**
```json
{
  "success": true,
  "questionId": "1234567890",
  "totalQuestions": 6,
  "message": "Question 6 added successfully"
}
```

**Validation Errors:**
```json
// Empty question text
{
  "error": "Question text is required and must be non-empty"
}

// Text too long (>500 chars)
{
  "error": "Question text must be 500 characters or less"
}

// Empty option
{
  "error": "Option A is required and must be non-empty"
}
```

### POST `/api/moderator/next-question`
Advance to the next question.

**Response:**
```json
{
  "success": true,
  "currentQuestionIndex": 0,
  "totalQuestions": 5,
  "message": "Advanced to question 1 of 5"
}
```

### POST `/api/moderator/reveal-answer`
Reveal the correct answer and show statistics.

**Response:**
```json
{
  "success": true,
  "correctAnswer": "C",
  "answerStats": {
    "A": 2,
    "B": 1,
    "C": 5,
    "D": 0
  },
  "playerCount": 8,
  "totalResponses": 8,
  "message": "Answer revealed: C. 8 players responded."
}
```

### POST `/api/moderator/end-game`
End the current game.

**Response:**
```json
{
  "success": true,
  "message": "Game ended successfully",
  "finalStats": [
    {
      "playerId": "player_123_abc",
      "score": 4,
      "totalQuestions": 5,
      "percentage": 80
    }
  ],
  "totalPlayers": 8
}
```

### GET `/api/moderator/status`
Get comprehensive game status for moderator dashboard.

**Response:**
```json
{
  "isActive": true,
  "playerCount": 8,
  "totalQuestions": 5,
  "currentQuestionIndex": 0,
  "currentQuestion": {
    "id": "1234567890",
    "text": "What is 2+2?",
    "options": {
      "A": "3",
      "B": "4",
      "C": "5", 
      "D": "6"
    },
    "correctAnswer": "B"
  },
  "answerRevealed": false,
  "answerStats": {
    "A": 0,
    "B": 0,
    "C": 0,
    "D": 0
  },
  "gameComplete": false,
  "playerStats": [
    {
      "playerId": "player_123_abc",
      "score": 0,
      "totalQuestions": 5,
      "percentage": 0
    }
  ]
}
```

---

## 🔄 Game Flow

### Typical Game Sequence
1. **Setup Phase**
   - `POST /api/moderator/login` - Moderator logs in
   - `POST /api/moderator/add-question` (repeat) - Add questions
   - `POST /api/moderator/start-game` - Start the game

2. **Question Phase** (repeat for each question)
   - `POST /api/moderator/next-question` - Show next question
   - Players: `POST /api/answer` - Submit answers
   - `POST /api/moderator/reveal-answer` - Show results

3. **End Phase**
   - `POST /api/moderator/end-game` - End the game

### Real-time Updates
- Players poll `GET /api/game-state` every 2 seconds
- Moderator polls `GET /api/moderator/status` every 2 seconds

---

## 🚨 Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Invalid moderator credentials |
| 404 | Not Found - Player not found |
| 409 | Conflict - Invalid game state for operation |
| 429 | Too Many Requests - Rate limited |
| 500 | Internal Server Error - Server error |

---

## 📊 Rate Limits

- **Answer submissions:** 3 attempts per 5 seconds per player
- **Other endpoints:** No rate limiting (single-server deployment)

---

## 🔒 Security Notes

- Moderator credentials are hardcoded in `server.js`
- No HTTPS in basic setup (add nginx + SSL for production)
- Input validation on all endpoints
- XSS protection headers in production mode
