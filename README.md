# Analyzer App - Full-Stack CSV Analysis Platform

A complete, production-ready web application for uploading, analyzing, and comparing CSV submissions against a canonical answer set. Built with Node.js, Express, MongoDB, React, and Vite.

> 🚀 **Quick Start?** Check [QUICKSTART.md](QUICKSTART.md) to get running in 10 minutes!
> 
> 📚 **Want Details?** Keep reading this comprehensive guide.
> 
> 🎯 **Ready to Deploy?** See [DEPLOYMENT.md](DEPLOYMENT.md) for production checklist.

## 📋 Features

### For Users
- **Session-based authentication** (no JWT, no external auth providers)
- **Upload CSV submissions** with automatic validation
- **Real-time metrics** calculation (Accuracy, Precision, Recall, F1 Score)
- **Detailed results** with row-by-row comparison
- **Submission history** tracking with attempt numbers
- **Leaderboard** showing top performers with rankings
- **Upload limits** enforced per user

### For Admins
- **User management** (create, update, delete users)
- **Upload canonical answer CSV** for comparison
- **Configure global settings** (default upload limits)
- **Set per-user limits** to override defaults
- **View all submissions** and user statistics

## 🛠 Tech Stack

**Backend:**
- Node.js (>=16)
- Express.js
- MongoDB with Mongoose
- express-session + connect-mongo (session storage)
- bcrypt (password hashing)
- Multer (file uploads)
- PapaParse (CSV parsing)

**Frontend:**
- React 18
- Vite (build tool)
- React Router v6
- Axios (HTTP client)
- PapaParse (client-side CSV validation)
- Custom CSS (no external UI libraries)

## 📁 Project Structure

```
analyzer-app/
├── backend/
│   ├── config/
│   │   └── db.js                 # MongoDB connection
│   ├── middleware/
│   │   └── auth.js               # Authentication & authorization middleware
│   ├── models/
│   │   ├── User.js               # User model
│   │   ├── Config.js             # Configuration model
│   │   ├── AnswerCSV.js          # Canonical answer CSV model
│   │   └── Submission.js         # User submission model
│   ├── routes/
│   │   ├── auth.js               # Authentication routes
│   │   ├── admin.js              # Admin management routes
│   │   ├── submissions.js        # Submission upload & retrieval
│   │   └── leaderboard.js        # Leaderboard routes
│   ├── utils/
│   │   └── metrics.js            # Metrics computation functions
│   ├── .env.example              # Environment variables template
│   ├── .gitignore
│   ├── package.json
│   ├── seed.js                   # Database seeding script
│   └── server.js                 # Main server file
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Navbar.jsx        # Navigation component
│   │   ├── pages/
│   │   │   ├── Login.jsx         # Login page
│   │   │   ├── Upload.jsx        # CSV upload page
│   │   │   ├── Result.jsx        # Results display page
│   │   │   ├── Submissions.jsx   # User submissions history
│   │   │   ├── Leaderboard.jsx   # Leaderboard page
│   │   │   └── AdminDashboard.jsx # Admin dashboard
│   │   ├── api.js                # API client configuration
│   │   ├── App.jsx               # Main app component
│   │   ├── AuthContext.jsx       # Authentication context
│   │   ├── ProtectedRoute.jsx    # Route protection component
│   │   ├── index.css             # Global styles
│   │   └── main.jsx              # App entry point
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── test-data/                     # Sample CSV files for testing
│   ├── answer.csv
│   ├── user_submission_100.csv
│   ├── user_submission_80.csv
│   └── user_submission_60.csv
│
└── README.md
```

## 🚀 Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local installation or MongoDB Atlas account)
- npm or yarn

### 1. Clone the Repository

```bash
cd analyzer-app
```

### 2. Backend Setup

```bash
cd backend
npm install
```

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# MongoDB Connection URI
# For local MongoDB:
MONGO_URI=mongodb://localhost:27017/analyzer

# For MongoDB Atlas (recommended for production):
# MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/analyzer?retryWrites=true&w=majority

# Session Secret - IMPORTANT: Generate a strong random string
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=your-secret-key-change-this-in-production

# Server Port
PORT=4000

# Session Cookie Settings
SESSION_COOKIE_MAXAGE=86400000
NODE_ENV=development
```

**⚠️ SECURITY WARNING:** 
- Never commit your `.env` file to version control
- Always use a strong random `SESSION_SECRET` in production
- Keep your MongoDB credentials secure

### 4. Seed the Database

Create the initial admin user and default configuration:

```bash
npm run seed
```

This will create:
- Admin user: `admin@analyzer.com` / `admin123`
- Test user: `user@test.com` / `test123`
- Default upload limit: 15 submissions

**⚠️ Change the admin password immediately after first login!**

### 5. Start the Backend Server

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

The backend will run on `http://localhost:4000`

### 6. Frontend Setup

Open a new terminal:

```bash
cd frontend
npm install
```

### 7. Start the Frontend

```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

### 8. Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

Login with:
- **Admin:** `admin@analyzer.com` / `admin123`
- **Test User:** `user@test.com` / `test123`

## 📊 How It Works

### Metrics Computation

The system computes the following metrics by comparing user submissions with the canonical answer CSV:

#### 1. Accuracy
```
Accuracy = (Number of Correct Matches) / (Total Rows Compared)
```

#### 2. Precision (Macro-averaged)
For each class/label:
```
Precision_class = TP / (TP + FP)
```
Where:
- TP (True Positives) = Predicted as class AND actually class
- FP (False Positives) = Predicted as class BUT actually different

Then average across all classes:
```
Precision = Average of all class precisions
```

#### 3. Recall (Macro-averaged)
For each class/label:
```
Recall_class = TP / (TP + FN)
```
Where:
- TP (True Positives) = Predicted as class AND actually class
- FN (False Negatives) = Predicted as different BUT actually class

Then average across all classes:
```
Recall = Average of all class recalls
```

#### 4. F1 Score
```
F1 = 2 * (Precision * Recall) / (Precision + Recall)
```

### Edge Cases Handled

1. **Missing rows in user submission:** Counted and reported separately
2. **Extra rows in user submission:** Identified and reported (not counted in metrics)
3. **Multi-class classification:** Macro-averaged precision/recall/F1 computed
4. **Binary classification:** Same formulas apply, just with 2 classes
5. **Empty submissions:** Rejected with validation error
6. **Mismatched row_ids:** Only matching row_ids are compared

### Upload Limit System

- **Default limit:** Set globally by admin (default: 15)
- **Per-user override:** Admin can set custom limits for individual users
- **Attempt numbering:** Each submission gets a sequential attempt number
- **Limit enforcement:** Users cannot upload beyond their limit

### CSV Format Requirements

Both canonical answer CSV and user submissions must contain:
- `row_id` column (unique identifier for each row)
- `label` column (the class/category label)

Additional columns are allowed but ignored during comparison.

Example CSV:
```csv
row_id,label
1,class_a
2,class_b
3,class_a
```

## 🧪 Testing

### Sample CSV Files

Sample test data is provided in the `test-data/` directory:

- `answer.csv` - Canonical answer set (100 rows)
- `user_submission_100.csv` - Perfect submission (100% accuracy)
- `user_submission_80.csv` - 80% accurate submission
- `user_submission_60.csv` - 60% accurate submission

### Testing the Application

1. **Login as admin** and upload `answer.csv` as the canonical answer
2. **Create a test user** from the admin dashboard
3. **Login as the test user**
4. **Upload test submissions** and verify metrics
5. **Check the leaderboard** to see rankings

### Unit Tests for Metrics

To run unit tests for the metrics functions:

```bash
cd backend
npm test
```

Tests verify:
- Accuracy calculation
- Precision/Recall for binary and multi-class
- F1 score computation
- Edge cases (empty data, single class, etc.)

## 🔐 Authentication Flow

1. User enters email and password
2. Server verifies credentials using bcrypt
3. Session is created and stored in MongoDB (via connect-mongo)
4. Session cookie is sent to client (httpOnly, secure in production)
5. Subsequent requests include session cookie
6. Server validates session on protected routes
7. Logout destroys session and clears cookie

**No JWT tokens are used - pure session-based authentication.**

## 🎯 API Endpoints

### Authentication
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Admin
- `GET /api/admin/users` - List all users
- `POST /api/admin/users` - Create user
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user
- `POST /api/admin/answer-csv` - Upload canonical answer CSV
- `GET /api/admin/answer-csv` - Get answer CSV info
- `PUT /api/admin/config` - Update global config
- `GET /api/admin/config/:key` - Get config value
- `GET /api/admin/submissions` - View all submissions

### Submissions
- `POST /api/submissions/upload` - Upload CSV submission
- `GET /api/submissions` - Get user's submissions
- `GET /api/submissions/:id` - Get submission details
- `GET /api/submissions/user/best` - Get user's best submission

### Leaderboard
- `GET /api/leaderboard` - Get leaderboard with rankings

## 🚀 Deployment Checklist

Before deploying to production:

### Security
- [ ] Generate a strong `SESSION_SECRET` using cryptographically secure random bytes
- [ ] Use HTTPS/TLS for all connections
- [ ] Set `NODE_ENV=production`
- [ ] Configure CORS to only allow your frontend domain
- [ ] Never commit `.env` files or credentials to Git
- [ ] Use environment variables for all secrets
- [ ] Enable MongoDB authentication and use strong passwords

### Session Configuration
- [ ] Set `secure: true` for session cookies (requires HTTPS)
- [ ] Set `sameSite: 'strict'` or `'none'` appropriately
- [ ] Configure session expiration appropriately
- [ ] Use `connect-mongo` for session persistence

### File Uploads
- [ ] Implement rate limiting on upload endpoints
- [ ] Set reasonable file size limits (already configured: 10MB)
- [ ] Sanitize file names and validate content
- [ ] Consider virus scanning for uploaded files
- [ ] Implement cleanup for temporary files

### Database
- [ ] Use MongoDB Atlas or properly secured MongoDB instance
- [ ] Enable connection pooling
- [ ] Set up backups
- [ ] Create appropriate indexes (already configured in models)
- [ ] Monitor database performance

### Application
- [ ] Enable production logging
- [ ] Set up error monitoring (e.g., Sentry)
- [ ] Configure CDN for static assets
- [ ] Enable gzip compression
- [ ] Set up health check endpoints
- [ ] Configure appropriate memory limits

### Frontend
- [ ] Build for production: `npm run build`
- [ ] Update API URL to production backend
- [ ] Serve from CDN or static hosting
- [ ] Enable caching headers
- [ ] Minify and optimize assets

## 🤝 User Roles

### Admin
- Create, update, delete users
- Upload canonical answer CSV
- Configure global settings
- View all submissions and statistics
- Set per-user upload limits

### User
- Upload CSV submissions
- View own submissions and history
- View detailed results with metrics
- Check leaderboard and personal rank
- Limited number of submissions (configurable)

## 📝 License

This project is provided as-is for educational and internal use.

## 🆘 Troubleshooting

### Backend won't start
- Check if MongoDB is running
- Verify `.env` file exists and has correct values
- Check if port 4000 is available

### Frontend can't connect to backend
- Ensure backend is running on port 4000
- Check browser console for CORS errors
- Verify proxy configuration in `vite.config.js`

### Session not persisting
- Check `SESSION_SECRET` is set
- Verify MongoDB connection for session store
- Check browser cookie settings

### CSV upload fails
- Verify CSV has `row_id` and `label` columns
- Check file size (max 10MB)
- Ensure file is valid CSV format
- Verify canonical answer CSV is uploaded (admin must do this first)

### Metrics seem incorrect
- Verify CSV row_ids match between submission and answer
- Check for extra/missing rows in comparison summary
- Review sample results in the preview table

## 📧 Support

For issues or questions, please check the documentation or contact your system administrator.

---

**Built with ❤️ for accurate CSV analysis**
