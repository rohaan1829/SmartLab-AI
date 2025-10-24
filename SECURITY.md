# Security Implementation Guide

## 🔐 Authentication & Authorization

### JWT Token Authentication
- **Token Expiry**: 7 days (configurable)
- **Secret Key**: Environment variable `JWT_SECRET`
- **Cookie Security**: HttpOnly, Secure in production, SameSite=strict

### User Roles & Permissions
- **superadmin**: Full access to all resources and system management
- **receptionist**: Can manage patients, appointments, reports, payments, and approve operations
- **patient**: Can manage own profile, book appointments, view reports, make payments, submit complaints

### Protected Routes
All API routes require authentication except:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/health`

## 🛡️ Security Middleware

### 1. Helmet.js
- Sets security headers
- Prevents XSS attacks
- Content Security Policy (CSP)

### 2. Rate Limiting
- **Authentication routes**: 5 requests per 15 minutes per IP
- **General API routes**: 100 requests per 15 minutes per IP

### 3. Data Sanitization
- **NoSQL Injection Protection**: `express-mongo-sanitize`
- **XSS Protection**: `xss-clean`
- **Input Validation**: `express-validator`

### 4. CORS Configuration
- **Development**: `http://localhost:3000`
- **Production**: Configurable origins
- **Credentials**: Enabled for cookie-based auth

## 🔍 Input Validation

### Patient Validation
- **Required**: firstName, lastName, email, phone, dateOfBirth, gender
- **Email**: Valid email format with normalization
- **Phone**: Valid phone number format
- **Name**: 2-50 characters, letters and spaces only
- **Gender**: Enum validation (Male, Female, Other)

### Appointment Validation
- **Required**: patientId, doctorId, appointmentDate, appointmentTime, type, reason
- **Time Format**: HH:MM (24-hour format)
- **Duration**: 15-240 minutes
- **Type**: Enum validation (Consultation, Follow-up, etc.)

### Report Validation
- **Required**: patientId, appointmentId, doctorId, reportType, title, description
- **Title**: 5-200 characters
- **Description**: 10-2000 characters
- **Priority**: Enum validation (Low, Medium, High, Critical)

### Payment Validation
- **Required**: patientId, amount, paymentMethod, dueDate, description, totalAmount
- **Amount**: Positive number
- **Currency**: Enum validation (USD, EUR, GBP, CAD, AUD)
- **Payment Method**: Enum validation (Cash, Credit Card, etc.)

## 🔒 Password Security

### Password Requirements
- **Minimum Length**: 6 characters
- **Complexity**: At least one uppercase, one lowercase, one number
- **Hashing**: bcrypt with 12 rounds
- **Password History**: Track password changes

### Password Reset
- **Token Expiry**: 10 minutes
- **Secure Generation**: Crypto.randomBytes(32)
- **Hashed Storage**: SHA-256 hash stored in database

## 📊 Security Headers

### Helmet Configuration
```javascript
helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
})
```

## 🚨 Error Handling

### Security-Focused Error Messages
- **Authentication Errors**: Generic messages to prevent user enumeration
- **Validation Errors**: Detailed field-specific messages
- **Rate Limiting**: Clear timeout messages
- **Database Errors**: Sanitized error messages

## 🔧 Environment Variables

### Required Environment Variables
```bash
DATABASE_URL=mongodb+srv://...
JWT_SECRET=your_very_secure_secret_key
JWT_EXPIRES_IN=7d
NODE_ENV=production
PORT=5000
```

### Optional Environment Variables
```bash
JWT_COOKIE_EXPIRES_IN=7
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🧪 Security Testing

### Recommended Tests
1. **Authentication Tests**
   - Invalid credentials
   - Expired tokens
   - Role-based access control

2. **Input Validation Tests**
   - SQL injection attempts
   - XSS payloads
   - Invalid data types

3. **Rate Limiting Tests**
   - Excessive requests
   - Burst requests

4. **Authorization Tests**
   - Unauthorized access attempts
   - Privilege escalation

## 📝 Security Checklist

- [x] JWT authentication implemented
- [x] Role-based authorization
- [x] Input validation and sanitization
- [x] Rate limiting
- [x] Security headers (Helmet)
- [x] Password hashing (bcrypt)
- [x] CORS configuration
- [x] Error handling
- [x] Environment variable security
- [x] NoSQL injection protection
- [x] XSS protection

## 🚀 Production Security Recommendations

1. **Use HTTPS**: Always use SSL/TLS in production
2. **Environment Variables**: Never commit secrets to version control
3. **Database Security**: Use MongoDB Atlas with IP whitelisting
4. **Monitoring**: Implement security monitoring and logging
5. **Regular Updates**: Keep dependencies updated
6. **Backup Security**: Encrypt database backups
7. **Access Logs**: Monitor and log all access attempts
8. **Penetration Testing**: Regular security assessments
