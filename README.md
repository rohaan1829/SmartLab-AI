# SmartLab AI - MERN Stack Application

## Environment Variables
Create a `.env` file in the root directory with the following variables:

```bash
# Database Configuration
DATABASE_URL=mongodb+srv://roaandev_db_user:Rmug1829@corexcluster.k3jw29a.mongodb.net/

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your_very_secure_jwt_secret_key_here
JWT_EXPIRES_IN=7d
JWT_COOKIE_EXPIRES_IN=7

# Frontend URL
CLIENT_URL=http://localhost:3000
```

## Installation

### Backend Setup
```bash
npm install
```

### Frontend Setup
```bash
cd client
npm install
```

## Running the Application

### Development Mode (Both Frontend and Backend)
```bash
npm run dev:full
```

### Backend Only
```bash
npm run dev
```

### Frontend Only
```bash
npm run client
```

## 🔐 Creating Superuser Account

Before using the application, you need to create a superuser account with full administrative permissions:

### Quick Setup (Default Credentials)
```bash
npm run create-superuser
```

**Default Credentials:**
- Email: `admin@smartlab.com`
- Password: `SuperAdmin123!`

### Interactive Setup
```bash
npm run create-superuser:interactive
```

### Custom Setup
```bash
node create-superuser.js --email "your-email@company.com" --password "YourSecurePassword123!"
```

For detailed instructions, see [SUPERUSER_GUIDE.md](./SUPERUSER_GUIDE.md).

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-Based Authorization**: SuperAdmin, Receptionist, Patient roles with AI-ready architecture
- **Input Validation**: Comprehensive validation using express-validator
- **Data Sanitization**: Protection against NoSQL injection and XSS attacks
- **Rate Limiting**: Prevents brute force attacks
- **Security Headers**: Helmet.js for security headers
- **Password Security**: bcrypt hashing with salt rounds

## API Endpoints

### Authentication
- POST /api/auth/register - Register new user
- POST /api/auth/login - Login user
- POST /api/auth/logout - Logout user
- GET /api/auth/me - Get current user
- PATCH /api/auth/update-profile - Update user profile
- PATCH /api/auth/change-password - Change password
- GET /api/auth/users - Get all users (admin only)
- PATCH /api/auth/users/:id/status - Update user status (admin only)
- DELETE /api/auth/users/:id - Delete user (admin only)

### Patients (Protected Routes)
- GET /api/patients - Get all patients
- GET /api/patients/:id - Get patient by ID
- POST /api/patients - Create new patient (superadmin, receptionist)
- PUT /api/patients/:id - Update patient (superadmin, receptionist)
- DELETE /api/patients/:id - Delete patient (superadmin)
- GET /api/patients/:id/appointments - Get patient's appointments

### Appointments (Protected Routes)
- GET /api/appointments - Get all appointments
- GET /api/appointments/:id - Get appointment by ID
- POST /api/appointments - Create new appointment
- PUT /api/appointments/:id - Update appointment
- DELETE /api/appointments/:id - Delete appointment
- PATCH /api/appointments/:id/status - Update appointment status
- GET /api/appointments/upcoming/:receptionistId - Get upcoming appointments

### Reports (Protected Routes)
- GET /api/reports - Get all reports
- GET /api/reports/:id - Get report by ID
- POST /api/reports - Create new report
- PUT /api/reports/:id - Update report
- DELETE /api/reports/:id - Delete report
- PATCH /api/reports/:id/status - Update report status
- GET /api/reports/patient/:patientId - Get patient reports
- POST /api/reports/:id/attachments - Add attachment to report

### Payments (Protected Routes)
- GET /api/payments - Get all payments
- GET /api/payments/:id - Get payment by ID
- POST /api/payments - Create new payment
- PUT /api/payments/:id - Update payment
- DELETE /api/payments/:id - Delete payment
- PATCH /api/payments/:id/status - Update payment status
- GET /api/payments/patient/:patientId - Get patient payments
- GET /api/payments/overdue - Get overdue payments
- POST /api/payments/:id/refund - Process refund
- GET /api/payments/stats/summary - Get payment statistics
