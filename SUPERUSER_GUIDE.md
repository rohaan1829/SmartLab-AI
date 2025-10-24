# Superuser Creation Guide

This guide explains how to create superuser credentials for the SmartLab AI system with full administrative permissions.

## Overview

The SmartLab AI system includes a comprehensive superuser creation script that allows you to bootstrap the system with an administrative account. The superuser has full permissions to:

- Manage all users (create, update, delete, activate/deactivate)
- Access all patient records and medical data
- Manage appointments, reports, payments, and complaints
- View system logs and audit trails
- Configure system settings
- Perform administrative operations

## Quick Start

### Method 1: Using Default Credentials (Recommended for Initial Setup)

```bash
# Create superuser with default credentials
npm run create-superuser

# Or directly with node
node create-superuser.js
```

**Default Credentials:**
- **Email:** `admin@smartlab.com`
- **Password:** `SuperAdmin123!`
- **Name:** Super Admin
- **Department:** Administration
- **Employee ID:** SUPER001

### Method 2: Interactive Mode

```bash
# Interactive mode - prompts for all details
npm run create-superuser:interactive

# Or directly with node
node create-superuser.js --interactive
```

This mode will guide you through entering:
- First and Last Name
- Email Address
- Password (with validation)
- Phone Number
- Department
- Employee ID

### Method 3: Command Line Arguments

```bash
# Create with custom credentials
node create-superuser.js \
  --email "admin@yourcompany.com" \
  --password "YourSecurePassword123!" \
  --first-name "John" \
  --last-name "Doe" \
  --phone "+1234567890" \
  --department "IT Administration" \
  --employee-id "ADMIN001"
```

## Command Line Options

| Option | Short | Description | Example |
|--------|-------|-------------|---------|
| `--interactive` | `-i` | Interactive mode | `node create-superuser.js -i` |
| `--email` | `-e` | Email address | `--email admin@company.com` |
| `--password` | `-p` | Password | `--password SecurePass123!` |
| `--first-name` | `-f` | First name | `--first-name John` |
| `--last-name` | `-l` | Last name | `--last-name Doe` |
| `--phone` | Phone number | `--phone +1234567890` |
| `--department` | `-d` | Department | `--department IT` |
| `--employee-id` | Employee ID | `--employee-id EMP001` |
| `--generate-password` | `-g` | Generate secure password | `--generate-password` |
| `--help` | `-h` | Show help | `--help` |

## Password Requirements

The system enforces strong password requirements:

- **Minimum Length:** 8 characters
- **Must Include:**
  - At least one uppercase letter (A-Z)
  - At least one lowercase letter (a-z)
  - At least one number (0-9)
  - At least one special character (!@#$%^&*(),.?":{}|<>)

**Example Valid Passwords:**
- `Admin123!`
- `SecurePass2024#`
- `MyPassword99$`

## Security Features

### Built-in Security Measures

1. **Duplicate Prevention:** The script checks for existing superusers and prevents accidental duplicates
2. **Input Validation:** All inputs are validated for format and security
3. **Secure Password Generation:** Option to generate cryptographically secure passwords
4. **Database Connection Security:** Uses environment variables for database credentials
5. **Audit Logging:** All superuser creation events are logged

### Security Best Practices

1. **Change Default Password:** Immediately change the password after first login
2. **Use Strong Passwords:** Follow the password requirements strictly
3. **Secure Storage:** Store credentials in a secure password manager
4. **Limit Access:** Only authorized personnel should have superuser access
5. **Regular Audits:** Regularly review superuser accounts and their activity

## Troubleshooting

### Common Issues

#### 1. Database Connection Error
```
❌ Error creating superuser: MongoDB connection failed
```

**Solution:** Ensure your `.env` file contains the correct `DATABASE_URL`:
```bash
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/
```

#### 2. Email Already Exists
```
⚠️ User with email admin@smartlab.com already exists
```

**Solutions:**
- Use a different email address
- Use interactive mode to update the existing user
- Delete the existing user first (if appropriate)

#### 3. Password Validation Failed
```
❌ Password validation failed: uppercase letter, special character
```

**Solution:** Ensure your password meets all requirements listed above.

#### 4. Permission Denied
```
❌ Error: Permission denied
```

**Solution:** Ensure you have write permissions to the database and the script has proper execution permissions.

### Getting Help

```bash
# Show help information
node create-superuser.js --help

# Or
npm run create-superuser -- --help
```

## Examples

### Example 1: Quick Setup for Development
```bash
# Use default credentials for quick development setup
npm run create-superuser
```

### Example 2: Production Environment Setup
```bash
# Generate secure password and use company email
node create-superuser.js \
  --email "admin@yourcompany.com" \
  --generate-password \
  --first-name "System" \
  --last-name "Administrator" \
  --department "IT" \
  --employee-id "SYSADMIN001"
```

### Example 3: Multiple Superusers
```bash
# Create additional superuser (system will ask for confirmation)
node create-superuser.js \
  --email "backup-admin@yourcompany.com" \
  --password "BackupAdmin123!" \
  --first-name "Backup" \
  --last-name "Admin" \
  --department "IT" \
  --employee-id "BACKUP001"
```

### Example 4: Update Existing User
```bash
# Use interactive mode to update existing user
node create-superuser.js --interactive
# When prompted about existing user, choose 'y' to update
```

## Post-Creation Steps

After creating the superuser:

1. **Test Login:** Verify you can log in with the created credentials
2. **Change Password:** Change the password immediately after first login
3. **Configure Profile:** Update the user profile with complete information
4. **Set Up Security:** Enable any additional security features available
5. **Create Additional Users:** Create other staff accounts as needed
6. **Document Credentials:** Securely document the credentials for authorized personnel

## Login Information

Once created, you can log in using:

- **Frontend:** http://localhost:3000
- **API:** http://localhost:5000/api/auth/login

**Login Endpoint:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@smartlab.com","password":"SuperAdmin123!"}'
```

## Support

If you encounter issues:

1. Check the console output for specific error messages
2. Verify your database connection and credentials
3. Ensure all required environment variables are set
4. Check the system logs in the `logs/` directory
5. Review the troubleshooting section above

For additional support, refer to the main README.md or contact your system administrator.
